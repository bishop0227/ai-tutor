"""
Flask 애플리케이션 메인 파일
데이터베이스 초기화 및 서버 실행을 담당합니다.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from models import db, User, Subject, QuizResult, Week, Material, LearningPDF, ChatHistory, ConceptContent, Quiz, Question, UserResponse, QuizReport
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from PyPDF2 import PdfReader
import os
import json
import time
from datetime import datetime
from dotenv import load_dotenv
import google.generativeai as genai
import random
from rag_utils import extract_text_from_pdf

# 현대적이고 차분한 색상 팔레트 (HEX 코드)
PASTEL_COLORS = [
    '#A8D5E2',  # 소프트 스카이블루
    '#B8D4C1',  # 소프트 민트
    '#D4B8E8',  # 소프트 라벤더
    '#F5C2C7',  # 소프트 로즈
    '#FFD4A3',  # 소프트 피치
    '#C4E0F6',  # 소프트 아쿠아
    '#E8D0B3',  # 소프트 베이지
    '#B5C9E8',  # 소프트 퍼플블루
    '#D9E5C9',  # 소프트 그린
    '#F0D5C4',  # 소프트 코랄
    '#C8D8E8',  # 소프트 그레이블루
    '#E5D4E8',  # 소프트 라일락
]

def create_app():
    # 환경 변수 로드 (함수 내에서 호출하여 올바른 경로에서 로드)
    basedir = os.path.abspath(os.path.dirname(__file__))
    env_path = os.path.join(basedir, '.env')
    load_dotenv(env_path)
    
    """Flask 애플리케이션 팩토리 함수"""
    # 환경 변수 로드 확인 (디버깅)
    api_key = os.getenv('GEMINI_API_KEY')
    if api_key:
        masked_key = api_key[:7] + "..." + api_key[-4:] if len(api_key) > 11 else "***"
        print(f"✅ GEMINI_API_KEY 로드 완료: {masked_key}")
    else:
        print("⚠️  GEMINI_API_KEY가 로드되지 않았습니다. .env 파일을 확인해주세요.")
    
    app = Flask(__name__)
    
    # CORS 설정 (프론트엔드와의 통신을 위해 - 모든 도메인 허용)
    CORS(app, resources={
        r"/*": {
            "origins": "*",
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
        }
    })
    
    # 데이터베이스 설정
    # SQLite 데이터베이스 파일 경로
    basedir = os.path.abspath(os.path.dirname(__file__))
    db_path = os.path.join(basedir, 'instance', 'app.db')
    
    # instance 폴더가 없으면 생성
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # 파일 업로드 설정
    app.config['UPLOAD_FOLDER'] = os.path.join(basedir, 'uploads', 'syllabus')
    app.config['LEARNING_PDF_FOLDER'] = os.path.join(basedir, 'uploads', 'learning_pdfs')
    app.config['MATERIAL_FOLDER'] = os.path.join(basedir, 'uploads', 'materials')
    app.config['VECTOR_DB_FOLDER'] = os.path.join(basedir, 'vector_db')
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB 최대 파일 크기
    app.config['ALLOWED_EXTENSIONS'] = {'pdf', 'ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx'}
    
    # 업로드 폴더 생성
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['LEARNING_PDF_FOLDER'], exist_ok=True)
    os.makedirs(app.config['MATERIAL_FOLDER'], exist_ok=True)
    os.makedirs(app.config['VECTOR_DB_FOLDER'], exist_ok=True)
    
    # SQLAlchemy 초기화
    db.init_app(app)
    
    # 데이터베이스 테이블 생성 (스키마 업데이트)
    with app.app_context():
        # 개발 환경: 기존 데이터베이스 스키마 문제 해결을 위해 재생성 옵션
        # 환경 변수 RESET_DB=1로 설정하면 데이터베이스를 재생성합니다
        if os.getenv('RESET_DB') == '1':
            print("⚠️  데이터베이스를 재생성합니다...")
            db.drop_all()
            db.create_all()
            print("✅ 데이터베이스가 재생성되었습니다.")
        else:
            # 기존 테이블에 새 컬럼 추가 (마이그레이션)
            from sqlalchemy import inspect, text
            
            inspector = inspect(db.engine)
            existing_tables = inspector.get_table_names()
            
            if 'users' in existing_tables:
                # users 테이블에 새 컬럼 추가
                existing_columns = [col['name'] for col in inspector.get_columns('users')]
                
                # 새 컬럼들 추가
                new_columns = {
                    'login_id': ('VARCHAR(80)', None),
                    'password': ('VARCHAR(255)', None),
                    'school': ('VARCHAR(100)', '""'),
                    'major': ('VARCHAR(100)', '""'),
                    'grade': ('INTEGER', '1'),
                    'social_type': ('VARCHAR(20)', None),
                    'social_id': ('VARCHAR(100)', None),
                    'onboarding_completed': ('BOOLEAN', '0'),
                    'theme': ('VARCHAR(20)', "'light'"),
                    'email_notifications': ('BOOLEAN', '1'),
                    'push_notifications': ('BOOLEAN', '1'),
                }
                
                # email 컬럼이 NOT NULL로 되어 있다면 nullable로 변경
                if 'email' in existing_columns:
                    try:
                        # SQLite는 ALTER TABLE로 NOT NULL 제약을 직접 변경할 수 없으므로
                        # 새 테이블을 만들고 데이터를 복사하는 방식이 필요하지만,
                        # 여기서는 간단히 기본값을 설정하는 방식으로 처리
                        db.session.execute(text("UPDATE users SET email = NULL WHERE email = ''"))
                        db.session.commit()
                        print("email 컬럼을 nullable로 처리했습니다.")
                    except Exception as e:
                        db.session.rollback()
                        print(f"email 컬럼 처리 중 오류: {e}")
                
                for col_name, (col_type, default_val) in new_columns.items():
                    if col_name not in existing_columns:
                        try:
                            if default_val is not None:
                                db.session.execute(text(f'ALTER TABLE users ADD COLUMN {col_name} {col_type} DEFAULT {default_val}'))
                            else:
                                db.session.execute(text(f'ALTER TABLE users ADD COLUMN {col_name} {col_type}'))
                            db.session.commit()
                            print(f"users 테이블에 {col_name} 컬럼을 추가했습니다.")
                        except Exception as e:
                            db.session.rollback()
                            print(f"{col_name} 컬럼 추가 중 오류: {e}")
                
                # 기존 필수 필드들을 nullable로 변경 (기존 데이터 호환성)
                if 'exam_style' in existing_columns:
                    try:
                        # 기존 필수 필드들을 nullable로 변경
                        db.session.execute(text("UPDATE users SET exam_style = NULL WHERE exam_style = ''"))
                        db.session.execute(text("UPDATE users SET learning_depth = NULL WHERE learning_depth = ''"))
                        db.session.execute(text("UPDATE users SET material_preference = NULL WHERE material_preference = ''"))
                        db.session.execute(text("UPDATE users SET practice_style = NULL WHERE practice_style = ''"))
                        db.session.execute(text("UPDATE users SET ai_persona = NULL WHERE ai_persona = ''"))
                        db.session.commit()
                    except Exception as e:
                        db.session.rollback()
                        print(f"기존 필드 업데이트 중 오류: {e}")
            
            if 'subjects' in existing_tables:
                # subjects 테이블에 새 컬럼 추가
                existing_columns = [col['name'] for col in inspector.get_columns('subjects')]
                
                # subject_type 컬럼 추가
                if 'subject_type' not in existing_columns:
                    try:
                        db.session.execute(text('ALTER TABLE subjects ADD COLUMN subject_type VARCHAR(50) DEFAULT "교양"'))
                        db.session.execute(text("UPDATE subjects SET subject_type = '교양' WHERE subject_type IS NULL OR subject_type = ''"))
                        db.session.commit()
                        print("subjects 테이블에 subject_type 컬럼을 추가했습니다.")
                    except Exception as e:
                        db.session.rollback()
                        print(f"subject_type 컬럼 추가 중 오류: {e}")
                
                # syllabus_analysis 컬럼 추가 (JSON 타입)
                if 'syllabus_analysis' not in existing_columns:
                    try:
                        db.session.execute(text('ALTER TABLE subjects ADD COLUMN syllabus_analysis TEXT'))
                        db.session.commit()
                        print("subjects 테이블에 syllabus_analysis 컬럼을 추가했습니다.")
                    except Exception as e:
                        db.session.rollback()
                        print(f"syllabus_analysis 컬럼 추가 중 오류: {e}")
                
                # color 컬럼 추가
                if 'color' not in existing_columns:
                    try:
                        db.session.execute(text('ALTER TABLE subjects ADD COLUMN color VARCHAR(7)'))
                        db.session.commit()
                        print("subjects 테이블에 color 컬럼을 추가했습니다.")
                    except Exception as e:
                        db.session.rollback()
                        print(f"color 컬럼 추가 중 오류: {e}")
                
                # order 컬럼 추가 (SQLite 예약어이므로 따옴표로 감싸야 함)
                if 'order' not in existing_columns:
                    try:
                        # SQLite에서 order는 예약어이므로 따옴표로 감싸야 함
                        db.session.execute(text('ALTER TABLE subjects ADD COLUMN "order" INTEGER'))
                        db.session.commit()
                        # 기존 과목들의 order를 id 기반으로 설정
                        db.session.execute(text('UPDATE subjects SET "order" = id WHERE "order" IS NULL'))
                        db.session.commit()
                        print("subjects 테이블에 order 컬럼을 추가했습니다.")
                    except Exception as e:
                        db.session.rollback()
                        print(f"order 컬럼 추가 중 오류: {e}")
                        import traceback
                        traceback.print_exc()
                
                # D-Day 관련 컬럼 추가
                # exam_date 컬럼 추가
                if 'exam_date' not in existing_columns:
                    try:
                        db.session.execute(text('ALTER TABLE subjects ADD COLUMN exam_date DATETIME'))
                        db.session.commit()
                        print("subjects 테이블에 exam_date 컬럼을 추가했습니다.")
                    except Exception as e:
                        db.session.rollback()
                        print(f"exam_date 컬럼 추가 중 오류: {e}")
                
                # is_notification_on 컬럼 추가
                if 'is_notification_on' not in existing_columns:
                    try:
                        db.session.execute(text('ALTER TABLE subjects ADD COLUMN is_notification_on BOOLEAN DEFAULT 1'))
                        db.session.commit()
                        # 기존 과목들의 알림을 기본값(True)으로 설정
                        db.session.execute(text('UPDATE subjects SET is_notification_on = 1 WHERE is_notification_on IS NULL'))
                        db.session.commit()
                        print("subjects 테이블에 is_notification_on 컬럼을 추가했습니다.")
                    except Exception as e:
                        db.session.rollback()
                        print(f"is_notification_on 컬럼 추가 중 오류: {e}")
                
                # study_plan 컬럼 추가
                if 'study_plan' not in existing_columns:
                    try:
                        db.session.execute(text('ALTER TABLE subjects ADD COLUMN study_plan TEXT'))
                        db.session.commit()
                        print("subjects 테이블에 study_plan 컬럼을 추가했습니다.")
                    except Exception as e:
                        db.session.rollback()
                        print(f"study_plan 컬럼 추가 중 오류: {e}")
                
                # exam_type 컬럼 추가
                if 'exam_type' not in existing_columns:
                    try:
                        db.session.execute(text('ALTER TABLE subjects ADD COLUMN exam_type VARCHAR(20)'))
                        db.session.commit()
                        print("subjects 테이블에 exam_type 컬럼을 추가했습니다.")
                    except Exception as e:
                        db.session.rollback()
                        print(f"exam_type 컬럼 추가 중 오류: {e}")
                
                # exam_week_start 컬럼 추가
                if 'exam_week_start' not in existing_columns:
                    try:
                        db.session.execute(text('ALTER TABLE subjects ADD COLUMN exam_week_start INTEGER'))
                        db.session.commit()
                        print("subjects 테이블에 exam_week_start 컬럼을 추가했습니다.")
                    except Exception as e:
                        db.session.rollback()
                        print(f"exam_week_start 컬럼 추가 중 오류: {e}")
                
                # exam_week_end 컬럼 추가
                if 'exam_week_end' not in existing_columns:
                    try:
                        db.session.execute(text('ALTER TABLE subjects ADD COLUMN exam_week_end INTEGER'))
                        db.session.commit()
                        print("subjects 테이블에 exam_week_end 컬럼을 추가했습니다.")
                    except Exception as e:
                        db.session.rollback()
                        print(f"exam_week_end 컬럼 추가 중 오류: {e}")
            
            # 모든 테이블 생성/업데이트
            db.create_all()  # 새 테이블이 있으면 생성
            
            # 개발 환경에서 email NOT NULL 문제 해결을 위한 임시 조치
            # 프로덕션에서는 마이그레이션 스크립트를 사용해야 함
            try:
                # email 컬럼이 존재하는지 확인하고, NOT NULL 제약이 있으면 경고
                if 'users' in existing_tables:
                    email_col = next((col for col in inspector.get_columns('users') if col['name'] == 'email'), None)
                    if email_col and not email_col.get('nullable', True):
                        print("\n" + "="*60)
                        print("⚠️  경고: email 컬럼이 NOT NULL로 설정되어 있습니다.")
                        print("해결 방법:")
                        print("1. 백엔드 서버를 중지하고 backend/instance/app.db 파일을 삭제한 후 서버를 재시작하세요.")
                        print("2. 또는 reset_db.py 스크립트를 실행하세요: python backend/reset_db.py")
                        print("3. 또는 환경 변수 RESET_DB=1을 설정하고 서버를 재시작하세요.")
                        print("   (Windows PowerShell: $env:RESET_DB='1'; python app.py)")
                        print("="*60 + "\n")
            except Exception as e:
                print(f"스키마 확인 중 오류: {e}")
            
            print("데이터베이스 테이블이 준비되었습니다.")
    
    # 기본 라우트 (헬스 체크)
    @app.route('/')
    def health_check():
        return {
            'status': 'ok',
            'message': 'Adaptive AI Tutor Backend API'
        }
    
    # 회원가입 API
    @app.route('/register', methods=['POST'])
    def register():
        """회원가입 (일반 회원가입)"""
        try:
            data = request.get_json()
            
            # 필수 필드 검증
            required_fields = ['login_id', 'password', 'username', 'school', 'major', 'grade']
            for field in required_fields:
                if field not in data or not data[field]:
                    return jsonify({
                        'error': f'{field} 필드는 필수입니다.'
                    }), 400
            
            # 학년 검증
            try:
                grade = int(data['grade'])
                if grade < 1 or grade > 4:
                    return jsonify({
                        'error': '학년은 1~4 사이의 숫자여야 합니다.'
                    }), 400
            except (ValueError, TypeError):
                return jsonify({
                    'error': '학년은 1~4 사이의 숫자여야 합니다.'
                }), 400
            
            # 중복 체크
            if User.query.filter_by(login_id=data['login_id']).first():
                return jsonify({
                    'error': '이미 사용 중인 아이디입니다.'
                }), 400
            
            # 비밀번호 유효성 검사
            password = data['password']
            if len(password) < 8:
                return jsonify({
                    'error': '비밀번호는 최소 8자 이상이어야 합니다.'
                }), 400
            
            import re
            has_upper = bool(re.search(r'[A-Z]', password))
            has_lower = bool(re.search(r'[a-z]', password))
            has_digit = bool(re.search(r'\d', password))
            has_special = bool(re.search(r'[!@#$%^&*(),.?":{}|<>]', password))
            
            if not (has_upper and has_lower and has_digit and has_special):
                return jsonify({
                    'error': '비밀번호는 영문 대문자, 소문자, 숫자, 특수문자를 모두 포함해야 합니다.'
                }), 400
            
            # 비밀번호 해싱
            password_hash = generate_password_hash(password)
            
            # 새 사용자 생성 (email은 선택사항)
            new_user = User(
                login_id=data['login_id'],
                password=password_hash,
                username=data['username'],
                email=None,  # 일반 회원가입에서는 email 없음
                school=data['school'],
                major=data['major'],
                grade=grade,
                onboarding_completed=False
            )
            
            db.session.add(new_user)
            db.session.commit()
            
            return jsonify({
                'message': '회원가입이 완료되었습니다.',
                'user': new_user.to_dict()
            }), 201
            
        except Exception as e:
            db.session.rollback()
            return jsonify({
                'error': str(e)
            }), 500
    
    # 로그인 API
    @app.route('/login', methods=['POST'])
    def login():
        """일반 로그인 (아이디/비밀번호)"""
        try:
            data = request.get_json()
            
            if 'login_id' not in data or 'password' not in data:
                return jsonify({
                    'error': '아이디와 비밀번호를 입력해주세요.'
                }), 400
            
            user = User.query.filter_by(login_id=data['login_id']).first()
            
            if not user:
                return jsonify({
                    'error': '아이디가 존재하지 않습니다.'
                }), 404
            
            if not user.password or not check_password_hash(user.password, data['password']):
                return jsonify({
                    'error': '비밀번호가 틀렸습니다.'
                }), 401
            
            return jsonify({
                'message': '로그인 성공',
                'user': user.to_dict()
            }), 200
            
        except Exception as e:
            return jsonify({
                'error': str(e)
            }), 500
    
    # 소셜 로그인 API (FEATURE_DOCUMENTATION.md에 명시되지 않음 - 주석 처리)
    # @app.route('/social-login', methods=['POST'])
    # def social_login():
        """소셜 로그인 (카카오, 구글)"""
        try:
            data = request.get_json()
            
            if 'social_type' not in data or 'social_id' not in data:
                return jsonify({
                    'error': '소셜 로그인 정보가 필요합니다.'
                }), 400
            
            social_type = data['social_type']
            social_id = data['social_id']
            
            if social_type not in ['kakao', 'google']:
                return jsonify({
                    'error': '지원하지 않는 소셜 로그인 타입입니다.'
                }), 400
            
            # 기존 사용자 확인
            user = User.query.filter_by(
                social_type=social_type,
                social_id=social_id
            ).first()
            
            if user:
                # 기존 사용자 로그인
                return jsonify({
                    'message': '로그인 성공',
                    'user': user.to_dict()
                }), 200
            else:
                # 신규 사용자 - 회원가입 필요
                if 'username' not in data or 'email' not in data:
                    return jsonify({
                        'error': '회원가입을 위해 추가 정보가 필요합니다.',
                        'requires_signup': True
                    }), 400
                
                # 소셜 회원가입
                new_user = User(
                    username=data['username'],
                    email=data['email'],
                    social_type=social_type,
                    social_id=social_id,
                    school=data.get('school', ''),
                    major=data.get('major', ''),
                    grade=data.get('grade', 1),
                    onboarding_completed=False
                )
                
                db.session.add(new_user)
                db.session.commit()
                
                return jsonify({
                    'message': '회원가입 및 로그인 성공',
                    'user': new_user.to_dict()
                }), 201
            
        except Exception as e:
            db.session.rollback()
            return jsonify({
                'error': str(e)
            }), 500
    
    # 사용자 프로필 저장 API (온보딩)
    @app.route('/save-profile', methods=['POST'])
    def save_user_profile():
        """사용자의 5가지 성향 분석 결과를 저장 (온보딩 완료)"""
        try:
            data = request.get_json()
            
            # 필수 필드 검증
            required_fields = ['user_id', 'exam_style', 'learning_depth', 'material_preference', 'practice_style', 'ai_persona']
            for field in required_fields:
                if field not in data:
                    return jsonify({
                        'error': f'{field} 필드는 필수입니다.'
                    }), 400
            
            # 각 필드 값 검증
            valid_exam_style = ['미리미리', '벼락치기']
            valid_learning_depth = ['원리파악', '직관이해']
            valid_material_preference = ['텍스트', '영상']
            valid_practice_style = ['이론중심', '문제중심']
            valid_ai_persona = ['격려형', '엄격형']
            
            if data['exam_style'] not in valid_exam_style:
                return jsonify({
                    'error': f'exam_style must be one of: {valid_exam_style}'
                }), 400
            
            if data['learning_depth'] not in valid_learning_depth:
                return jsonify({
                    'error': f'learning_depth must be one of: {valid_learning_depth}'
                }), 400
            
            if data['material_preference'] not in valid_material_preference:
                return jsonify({
                    'error': f'material_preference must be one of: {valid_material_preference}'
                }), 400
            
            if data['practice_style'] not in valid_practice_style:
                return jsonify({
                    'error': f'practice_style must be one of: {valid_practice_style}'
                }), 400
            
            if data['ai_persona'] not in valid_ai_persona:
                return jsonify({
                    'error': f'ai_persona must be one of: {valid_ai_persona}'
                }), 400
            
            # 사용자 확인
            user = User.query.get(data['user_id'])
            if not user:
                return jsonify({
                    'error': '사용자를 찾을 수 없습니다.'
                }), 404
            
            # 온보딩 정보 업데이트
            user.exam_style = data['exam_style']
            user.learning_depth = data['learning_depth']
            user.material_preference = data['material_preference']
            user.practice_style = data['practice_style']
            user.ai_persona = data['ai_persona']
            user.onboarding_completed = True
            
            db.session.commit()
            
            return jsonify({
                'message': '온보딩이 완료되었습니다.',
                'user': user.to_dict()
            }), 200
                
        except Exception as e:
            db.session.rollback()
            return jsonify({
                'error': str(e)
            }), 500
    
    # 사용자 정보 조회 API
    @app.route('/api/user', methods=['GET'])
    def get_user():
        """현재 사용자 정보 조회 (user_id로 조회)"""
        try:
            user_id = request.args.get('user_id', type=int)
            if not user_id:
                return jsonify({'error': 'user_id parameter is required'}), 400
            
            user = User.query.get(user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            return jsonify({
                'user': user.to_dict()
            }), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    # 프로필 수정 API
    @app.route('/api/user/profile', methods=['PUT'])
    def update_profile():
        """사용자 프로필 정보 수정 (닉네임, 이메일)"""
        try:
            data = request.get_json()
            user_id = data.get('user_id')
            
            if not user_id:
                return jsonify({'error': 'user_id is required'}), 400
            
            user = User.query.get(user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            # 닉네임 업데이트
            if 'username' in data:
                username = data['username'].strip()
                if not username:
                    return jsonify({'error': '닉네임은 비어있을 수 없습니다.'}), 400
                user.username = username
            
            # 이메일 업데이트
            if 'email' in data:
                email = data['email'].strip() if data['email'] else None
                if email:
                    # 이메일 중복 체크 (다른 사용자가 사용 중인지)
                    existing_user = User.query.filter_by(email=email).first()
                    if existing_user and existing_user.id != user_id:
                        return jsonify({'error': '이미 사용 중인 이메일입니다.'}), 400
                # 이메일이 비어있으면 None으로 설정
                if email == '':
                    email = None
                user.email = email
            
            # 학교 업데이트
            if 'school' in data:
                school = data['school'].strip()
                if not school:
                    return jsonify({'error': '학교명은 비어있을 수 없습니다.'}), 400
                user.school = school
            
            # 학과 업데이트
            if 'major' in data:
                major = data['major'].strip()
                if not major:
                    return jsonify({'error': '학과는 비어있을 수 없습니다.'}), 400
                user.major = major
            
            # 학년 업데이트
            if 'grade' in data:
                grade = data['grade']
                if not isinstance(grade, int) or grade < 1 or grade > 4:
                    return jsonify({'error': '학년은 1-4 사이의 숫자여야 합니다.'}), 400
                user.grade = grade
            
            user.updated_at = datetime.utcnow()
            db.session.commit()
            
            return jsonify({
                'message': '프로필이 업데이트되었습니다.',
                'user': user.to_dict()
            }), 200
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500
    
    # 비밀번호 변경 API
    @app.route('/api/user/password', methods=['PUT'])
    def change_password():
        """비밀번호 변경 (현재 비밀번호 검증 후 새 비밀번호로 변경)"""
        try:
            data = request.get_json()
            user_id = data.get('user_id')
            current_password = data.get('current_password')
            new_password = data.get('new_password')
            
            if not user_id:
                return jsonify({'error': 'user_id is required'}), 400
            if not current_password:
                return jsonify({'error': '현재 비밀번호를 입력해주세요.'}), 400
            if not new_password:
                return jsonify({'error': '새 비밀번호를 입력해주세요.'}), 400
            if len(new_password) < 6:
                return jsonify({'error': '새 비밀번호는 최소 6자 이상이어야 합니다.'}), 400
            
            user = User.query.get(user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            # 현재 비밀번호 검증
            if not user.password or not check_password_hash(user.password, current_password):
                return jsonify({'error': '현재 비밀번호가 일치하지 않습니다.'}), 401
            
            # 새 비밀번호로 변경
            user.password = generate_password_hash(new_password)
            user.updated_at = datetime.utcnow()
            db.session.commit()
            
            return jsonify({
                'message': '비밀번호가 변경되었습니다.'
            }), 200
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500
    
    # 회원 탈퇴 API
    @app.route('/api/user/account', methods=['DELETE'])
    def delete_account():
        """회원 탈퇴 (사용자 및 연관된 모든 데이터 삭제)"""
        try:
            data = request.get_json()
            user_id = data.get('user_id')
            
            if not user_id:
                return jsonify({'error': 'user_id is required'}), 400
            
            user = User.query.get(user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            print(f"⚠️  사용자 ID {user_id} 계정 삭제 시작...")
            print(f"   - 삭제될 과목 수: {len(user.subjects)}")
            # quiz_results는 raw SQL로 개수 확인 (모델과 DB 스키마 불일치 방지)
            try:
                result = db.session.execute(db.text("SELECT COUNT(*) FROM quiz_results WHERE user_id = :user_id"), {"user_id": user_id})
                quiz_results_count = result.scalar() or 0
                print(f"   - 삭제될 퀴즈 결과 수: {quiz_results_count}")
            except Exception as e:
                print(f"   - 퀴즈 결과 개수 확인 실패 (무시하고 계속): {str(e)}")
                quiz_results_count = 0
            
            # Subject 관련 데이터를 먼저 삭제
            # user.subjects를 리스트로 복사 (삭제 중 변경 방지)
            subjects_to_delete = list(user.subjects)
            for subject in subjects_to_delete:
                subject_id = subject.id
                subject_name = subject.name
                
                # 1. Quiz 관련 데이터 삭제 (subject_id로 연결)
                subject_quizzes = Quiz.query.filter_by(subject_id=subject_id).all()
                for quiz in subject_quizzes:
                    # QuizReport 삭제
                    quiz_reports = QuizReport.query.filter_by(quiz_id=quiz.id).all()
                    for report in quiz_reports:
                        db.session.delete(report)
                    
                    # UserResponse 삭제
                    user_responses = UserResponse.query.filter_by(quiz_id=quiz.id).all()
                    for response in user_responses:
                        db.session.delete(response)
                    
                    # Question 삭제
                    questions = Question.query.filter_by(quiz_id=quiz.id).all()
                    for question in questions:
                        db.session.delete(question)
                    
                    # Quiz 삭제
                    db.session.delete(quiz)
                db.session.flush()  # 중간 커밋
                
                # 2. ChatHistory 삭제 (subject_id로 연결) - LearningPDF보다 먼저 삭제 (외래 키 제약)
                chat_histories = ChatHistory.query.filter_by(subject_id=subject_id).all()
                for chat in chat_histories:
                    db.session.delete(chat)
                db.session.flush()  # 중간 커밋
                
                # 3. LearningPDF 삭제 (subject_id로 연결)
                learning_pdfs = LearningPDF.query.filter_by(subject_id=subject_id).all()
                for pdf in learning_pdfs:
                    db.session.delete(pdf)
                db.session.flush()  # 중간 커밋
                
                # 4. Week 관련 데이터 삭제 (subject_id로 연결)
                weeks = Week.query.filter_by(subject_id=subject_id).all()
                for week in weeks:
                    # Material 삭제 (week_id로 연결)
                    materials = Material.query.filter_by(week_id=week.id).all()
                    for material in materials:
                        db.session.delete(material)
                    
                    # ConceptContent 삭제 (week_id로 연결)
                    concept_contents = ConceptContent.query.filter_by(week_id=week.id).all()
                    for content in concept_contents:
                        db.session.delete(content)
                    
                    # Week 삭제
                    db.session.delete(week)
                db.session.flush()  # 중간 커밋
                
                # 5. QuizResult 삭제 (subject_id로 연결) - raw SQL 사용 (모델과 DB 스키마 불일치 방지)
                try:
                    db.session.execute(db.text("DELETE FROM quiz_results WHERE subject_id = :subject_id"), {"subject_id": subject_id})
                    db.session.flush()
                except Exception as e:
                    print(f"      - QuizResult 삭제 중 오류 (무시하고 계속): {str(e)}")
                
                # 6. Subject 삭제 - raw SQL 사용 (cascade로 인한 QuizResult 모델 참조 방지)
                try:
                    db.session.execute(db.text("DELETE FROM subjects WHERE id = :subject_id"), {"subject_id": subject_id})
                    db.session.flush()
                except Exception as e:
                    print(f"      - Subject 삭제 중 오류: {str(e)}")
                    raise
            
            # Quiz 관련 데이터 삭제 (user_id로 직접 연결된 것들 - 혹시 모를 경우 대비)
            user_quizzes = Quiz.query.filter_by(user_id=user_id).all()
            for quiz in user_quizzes:
                quiz_reports = QuizReport.query.filter_by(quiz_id=quiz.id).all()
                for report in quiz_reports:
                    db.session.delete(report)
                
                user_responses = UserResponse.query.filter_by(quiz_id=quiz.id).all()
                for response in user_responses:
                    db.session.delete(response)
                
                questions = Question.query.filter_by(quiz_id=quiz.id).all()
                for question in questions:
                    db.session.delete(question)
                
                db.session.delete(quiz)
            
            # QuizResult 삭제 (user_id로 연결) - raw SQL 사용 (모델과 DB 스키마 불일치 방지)
            try:
                db.session.execute(db.text("DELETE FROM quiz_results WHERE user_id = :user_id"), {"user_id": user_id})
                db.session.flush()
                print(f"   - QuizResult 삭제 완료")
            except Exception as e:
                print(f"   - QuizResult 삭제 중 오류 (무시하고 계속): {str(e)}")
            
            # 사용자 삭제 - raw SQL 사용 (cascade로 인한 QuizResult 모델 참조 방지)
            try:
                db.session.execute(db.text("DELETE FROM users WHERE id = :user_id"), {"user_id": user_id})
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                print(f"   - User 삭제 중 오류: {str(e)}")
                raise
            
            print(f"✅ 사용자 ID {user_id} 계정이 완전히 삭제되었습니다.")
            
            return jsonify({
                'message': '계정이 성공적으로 삭제되었습니다.'
            }), 200
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ 계정 삭제 중 오류: {str(e)}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': str(e)}), 500
    
    # 사용자 설정 저장 API (알림, 테마)
    @app.route('/api/user/preferences', methods=['PUT'])
    def update_preferences():
        """사용자 설정 저장 (테마, 알림 설정)"""
        try:
            data = request.get_json()
            user_id = data.get('user_id')
            
            if not user_id:
                return jsonify({'error': 'user_id is required'}), 400
            
            user = User.query.get(user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            # 테마 업데이트
            if 'theme' in data:
                theme = data['theme']
                if theme not in ['light', 'dark', 'system']:
                    return jsonify({'error': '테마는 light, dark, system 중 하나여야 합니다.'}), 400
                user.theme = theme
            
            # 알림 설정 업데이트
            if 'email_notifications' in data:
                user.email_notifications = bool(data['email_notifications'])
            
            if 'push_notifications' in data:
                user.push_notifications = bool(data['push_notifications'])
            
            user.updated_at = datetime.utcnow()
            db.session.commit()
            
            return jsonify({
                'message': '설정이 저장되었습니다.',
                'user': user.to_dict()
            }), 200
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500
    
    # 과목 목록 조회 API
    @app.route('/subjects', methods=['GET'])
    def get_subjects():
        """현재 사용자가 등록한 과목 리스트 반환 (order 순서대로 정렬)"""
        try:
            user_id = request.args.get('user_id', type=int)
            if not user_id:
                return jsonify({'error': 'user_id parameter is required'}), 400
            
            # order가 NULL인 경우를 처리하기 위해 CASE WHEN 사용
            from sqlalchemy import case
            subjects = Subject.query.filter_by(user_id=user_id).order_by(
                case(
                    (Subject.order.is_(None), Subject.id),
                    else_=Subject.order
                )
            ).all()
            
            return jsonify({
                'subjects': [subject.to_dict() for subject in subjects]
            }), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    # 과목 상세 조회 API
    @app.route('/subjects/<int:subject_id>', methods=['GET'])
    def get_subject(subject_id):
        """과목 상세 정보 조회 (AI 분석 결과 포함, lazy loading)"""
        try:
            subject = Subject.query.get(subject_id)
            if not subject:
                return jsonify({'error': 'Subject not found'}), 404
            
            # syllabus_analysis가 없고 syllabus_text가 있으면 AI 분석 실행
            # 단, 이미 분석 실패한 경우(에러 정보가 저장된 경우) 재시도하지 않음
            if not subject.syllabus_analysis and subject.syllabus_text:
                print(f"\n{'='*60}")
                print(f"📊 과목 ID {subject_id}: AI 분석 시작 (lazy loading)")
                print(f"📄 강의계획서 텍스트 길이: {len(subject.syllabus_text)} 문자")
                print(f"{'='*60}\n")
                try:
                    analysis_result = analyze_syllabus_with_llm(subject.syllabus_text)
                    if analysis_result:
                        # JSON 문자열로 저장
                        subject.syllabus_analysis = json.dumps(analysis_result, ensure_ascii=False)
                        db.session.commit()
                        print(f"\n{'='*60}")
                        print(f"✅ 과목 ID {subject_id}: AI 분석 완료 및 저장")
                        print(f"📊 분석 결과: {len(analysis_result.get('weekly_schedule', []))}개 주차 추출")
                        print(f"{'='*60}\n")
                    else:
                        print(f"⚠️  과목 ID {subject_id}: AI 분석 결과가 None입니다.")
                        # 분석 실패 시 에러 정보 저장하여 재시도 방지
                        error_info = {
                            "error": "analysis_failed",
                            "message": "Gemini API 분석이 실패했습니다. API 키를 확인하거나 잠시 후 다시 시도해주세요."
                        }
                        subject.syllabus_analysis = json.dumps(error_info, ensure_ascii=False)
                        db.session.commit()
                except Exception as e:
                    error_msg = str(e)
                    print(f"\n{'='*60}")
                    print(f"❌ 과목 ID {subject_id}: AI 분석 실패")
                    print(f"오류 내용: {error_msg}")
                    print(f"{'='*60}\n")
                    
                    # 할당량 초과나 인증 오류는 에러 정보를 저장하여 재시도 방지
                    if '429' in error_msg or 'quota' in error_msg.lower() or 'rate limit' in error_msg.lower():
                        print(f"⚠️  할당량 초과로 인해 분석 실패 정보 저장 (재시도 방지)")
                        error_info = {
                            "error": "quota_exceeded",
                            "message": "Gemini API 할당량이 초과되었습니다. 무료 티어는 모델별로 할당량이 다를 수 있습니다."
                        }
                        subject.syllabus_analysis = json.dumps(error_info, ensure_ascii=False)
                        db.session.commit()
                    elif 'authentication' in error_msg.lower() or '401' in error_msg or '403' in error_msg or 'invalid' in error_msg.lower():
                        print(f"⚠️  인증 오류로 인해 분석 실패 정보 저장 (재시도 방지)")
                        error_info = {
                            "error": "auth_error",
                            "message": "Gemini API 인증 오류가 발생했습니다. API 키를 확인해주세요."
                        }
                        subject.syllabus_analysis = json.dumps(error_info, ensure_ascii=False)
                        db.session.commit()
            elif subject.syllabus_analysis:
                # 이미 분석 결과가 있는 경우, 에러 정보인지 확인
                try:
                    existing_analysis = json.loads(subject.syllabus_analysis)
                    if isinstance(existing_analysis, dict) and existing_analysis.get('error'):
                        print(f"⏭️  과목 ID {subject_id}: 이전에 분석 실패 ({existing_analysis.get('error')}) - 재시도하지 않음")
                except:
                    pass
            
            # weekly_schedule에 있는 모든 주차에 대해 Week 모델이 없으면 생성
            if subject.syllabus_analysis:
                try:
                    analysis = json.loads(subject.syllabus_analysis)
                    if isinstance(analysis, dict) and 'weekly_schedule' in analysis:
                        for week_data in analysis.get('weekly_schedule', []):
                            week_no = week_data.get('week_no')
                            if week_no:
                                # 해당 주차의 Week 모델이 있는지 확인
                                existing_week = Week.query.filter_by(
                                    subject_id=subject_id,
                                    week_number=week_no
                                ).first()
                                
                                if not existing_week:
                                    # Week 모델 생성
                                    new_week = Week(
                                        subject_id=subject_id,
                                        week_number=week_no,
                                        title=week_data.get('topic', f'Week {week_no}'),
                                        description=week_data.get('description', '')
                                    )
                                    db.session.add(new_week)
                                    print(f"✅ Week 모델 생성: 과목 ID {subject_id}, 주차 {week_no}")
                        
                        db.session.commit()
                except Exception as e:
                    print(f"⚠️  Week 모델 생성 중 오류 (무시): {e}")
                    db.session.rollback()
            
            subject_dict = subject.to_dict(include_weeks=True)
            print(f"📤 과목 ID {subject_id} 반환 데이터 - exam_date: {subject_dict.get('exam_date')}, exam_type: {subject_dict.get('exam_type')}, exam_week_start: {subject_dict.get('exam_week_start')}, exam_week_end: {subject_dict.get('exam_week_end')}")
            return jsonify({
                'subject': subject_dict
            }), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    # 과목 삭제 API
    @app.route('/subjects/<int:subject_id>', methods=['DELETE'])
    def delete_subject(subject_id):
        """과목 삭제 (관련 주차, 자료, 퀴즈 결과도 함께 삭제)"""
        try:
            subject = Subject.query.get(subject_id)
            if not subject:
                return jsonify({'error': 'Subject not found'}), 404
            
            # 관련 파일 삭제 (선택사항)
            # 주차와 자료는 cascade로 자동 삭제됨
            
            db.session.delete(subject)
            db.session.commit()
            
            return jsonify({
                'message': 'Subject deleted successfully'
            }), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500
    
    @app.route('/subjects/<int:subject_id>/update-week-topic', methods=['PUT'])
    def update_week_topic(subject_id):
        """과목의 syllabus_analysis에서 특정 주차 주제 업데이트"""
        try:
            data = request.get_json()
            week_no = data.get('week_no')
            new_topic = data.get('topic')
            
            if not week_no or not new_topic:
                return jsonify({'error': 'week_no와 topic은 필수입니다.'}), 400
            
            subject = Subject.query.get(subject_id)
            if not subject:
                return jsonify({'error': '과목을 찾을 수 없습니다.'}), 404
            
            if not subject.syllabus_analysis:
                return jsonify({'error': 'AI 분석 결과가 없습니다.'}), 404
            
            # syllabus_analysis JSON 파싱
            analysis = json.loads(subject.syllabus_analysis)
            
            # 해당 주차 찾아서 topic 업데이트
            updated = False
            for week in analysis.get('weekly_schedule', []):
                if week['week_no'] == week_no:
                    week['topic'] = new_topic
                    updated = True
                    break
            
            if not updated:
                return jsonify({'error': f'{week_no}주차를 찾을 수 없습니다.'}), 404
            
            # 업데이트된 JSON 저장
            subject.syllabus_analysis = json.dumps(analysis, ensure_ascii=False)
            db.session.commit()
            
            return jsonify({
                'message': '주차 주제가 업데이트되었습니다.',
                'subject': subject.to_dict(include_weeks=True)
            }), 200
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500
    
    def allowed_file(filename):
        """허용된 파일 확장자 확인"""
        return '.' in filename and \
               filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']
    
    # 과목 추가 API
    @app.route('/subjects', methods=['POST'])
    def create_subject():
        """과목 추가 (multipart/form-data로 과목명과 PDF 파일 받음)"""
        try:
            # 필수 필드 확인
            if 'name' not in request.form:
                return jsonify({'error': 'name is required'}), 400
            if 'user_id' not in request.form:
                return jsonify({'error': 'user_id is required'}), 400
            if 'subject_type' not in request.form:
                return jsonify({'error': 'subject_type is required'}), 400
            if 'file' not in request.files:
                return jsonify({'error': 'file is required'}), 400
            
            name = request.form.get('name')
            user_id = int(request.form.get('user_id'))
            subject_type = request.form.get('subject_type')
            file = request.files['file']
            
            # subject_type 검증
            if subject_type not in ['교양', '전공']:
                return jsonify({'error': 'subject_type must be either "교양" or "전공"'}), 400
            
            # 파일 확인
            if file.filename == '':
                return jsonify({'error': 'No file selected'}), 400
            
            if not allowed_file(file.filename):
                return jsonify({'error': 'Only PDF files are allowed'}), 400
            
            # 사용자 확인
            user = User.query.get(user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            # 파일 저장
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = secure_filename(f"{user_id}_{timestamp}_{file.filename}")
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            
            # 상대 경로 저장 (DB에 저장할 때)
            relative_path = os.path.join('uploads', 'syllabus', filename)
            
            # PDF에서 텍스트 추출 (PyPDF2 사용)
            # File API 대신 텍스트만 추출하여 API에 전달
            syllabus_text = ''
            try:
                print(f"📄 PDF 파일에서 텍스트 추출 시작: {filename}")
                pdf_reader = PdfReader(file_path)
                text_parts = []
                for page_num, page in enumerate(pdf_reader.pages, 1):
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)
                        print(f"   페이지 {page_num} 텍스트 추출 완료: {len(page_text)} 문자")
                
                syllabus_text = '\n\n'.join(text_parts)
                print(f"✅ PDF 텍스트 추출 완료: 총 {len(syllabus_text)} 문자, {len(text_parts)} 페이지")
                
                if len(syllabus_text.strip()) == 0:
                    print("⚠️  추출된 텍스트가 비어있습니다. PDF가 텍스트 기반이 아닐 수 있습니다.")
            except Exception as e:
                print(f"❌ PDF 텍스트 추출 중 오류 발생: {str(e)}")
                import traceback
                traceback.print_exc()
                # 텍스트 추출 실패해도 과목은 생성 (파일은 저장됨)
                syllabus_text = ''
            
            # 사용자의 기존 과목 중 가장 큰 order 값 찾기
            max_order = db.session.query(db.func.max(Subject.order)).filter_by(user_id=user_id).scalar()
            next_order = (max_order or 0) + 1
            
            # 과목 ID 기반으로 색상 선택 (일관성 유지)
            # 새 과목의 ID는 아직 생성되지 않았으므로, 사용자의 기존 과목 수를 기반으로 색상 선택
            user_subject_count = Subject.query.filter_by(user_id=user_id).count()
            random_color = PASTEL_COLORS[user_subject_count % len(PASTEL_COLORS)]
            
            # DB에 저장
            new_subject = Subject(
                user_id=user_id,
                name=name,
                subject_type=subject_type,
                syllabus_context='',
                syllabus_file_path=relative_path,
                syllabus_text=syllabus_text,
                color=random_color,
                order=next_order
            )
            db.session.add(new_subject)
            db.session.commit()
            
            # 실시간 LLM 분석 실행 (과목 생성 시점에 즉시 분석)
            if syllabus_text and len(syllabus_text.strip()) > 0:
                print(f"\n{'='*60}")
                print(f"📊 과목 생성 직후 AI 분석 시작 (실시간)")
                print(f"📄 강의계획서 텍스트 길이: {len(syllabus_text)} 문자")
                print(f"{'='*60}\n")
                try:
                    analysis_result = analyze_syllabus_with_llm(syllabus_text)
                    if analysis_result:
                        # JSON 문자열로 저장
                        new_subject.syllabus_analysis = json.dumps(analysis_result, ensure_ascii=False)
                        db.session.commit()
                        print(f"\n{'='*60}")
                        print(f"✅ 과목 ID {new_subject.id}: AI 분석 완료 및 저장 (실시간)")
                        print(f"📊 분석 결과: {len(analysis_result.get('weekly_schedule', []))}개 주차 추출")
                        print(f"{'='*60}\n")
                    else:
                        print(f"⚠️  과목 ID {new_subject.id}: AI 분석 결과가 None입니다.")
                        error_info = {
                            "error": "analysis_failed",
                            "message": "Gemini API 분석이 실패했습니다. API 키를 확인하거나 잠시 후 다시 시도해주세요."
                        }
                        new_subject.syllabus_analysis = json.dumps(error_info, ensure_ascii=False)
                        db.session.commit()
                except Exception as e:
                    error_msg = str(e)
                    print(f"\n{'='*60}")
                    print(f"❌ 과목 ID {new_subject.id}: AI 분석 실패")
                    print(f"오류 내용: {error_msg}")
                    print(f"{'='*60}\n")
                    
                    # 에러 정보 저장
                    if '429' in error_msg or 'quota' in error_msg.lower() or 'rate limit' in error_msg.lower():
                        error_info = {
                            "error": "quota_exceeded",
                            "message": "Gemini API 할당량이 초과되었습니다. 무료 티어는 모델별로 할당량이 다를 수 있습니다."
                        }
                    elif 'authentication' in error_msg.lower() or '401' in error_msg or '403' in error_msg or 'invalid' in error_msg.lower():
                        error_info = {
                            "error": "auth_error",
                            "message": "Gemini API 인증 오류가 발생했습니다. API 키를 확인해주세요."
                        }
                    else:
                        error_info = {
                            "error": "analysis_failed",
                            "message": f"AI 분석 중 오류가 발생했습니다: {error_msg}"
                        }
                    new_subject.syllabus_analysis = json.dumps(error_info, ensure_ascii=False)
                    db.session.commit()
            else:
                print("⚠️  강의계획서 텍스트가 없어 AI 분석을 건너뜁니다.")
            
            return jsonify({
                'message': 'Subject created successfully',
                'subject': new_subject.to_dict(include_weeks=True)
            }), 201
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500
    
    def get_mock_analysis_data():
        """Gemini API 호출 실패 시 사용할 Mock Data 반환 (현재 사용 안 함)"""
        return {
            "basic_info": {
                "credits": 3,
                "course_type": "전공핵심",
                "course_level": "200단위",
                "grading_policy": {
                    "midterm": 30,
                    "final": 30,
                    "assignment": 25,
                    "attendance": 10,
                    "other": 5,
                    "summary": "중간고사 30%, 기말고사 30%, 과제 25%, 출석 10%, 기타 5%"
                }
            },
            "weekly_schedule": [
                {
                    "week_no": 1,
                    "topic": "오리엔테이션",
                    "description": "강의 소개 및 학습 목표"
                },
                {
                    "week_no": 2,
                    "topic": "기초 개념",
                    "description": "기본 개념 및 이론 학습"
                },
                {
                    "week_no": 3,
                    "topic": "심화 학습",
                    "description": "심화 내용 학습"
                },
                {
                    "week_no": 4,
                    "topic": "실습 및 적용",
                    "description": "실습 문제 해결"
                },
                {
                    "week_no": 5,
                    "topic": "중간 평가",
                    "description": "중간고사"
                },
                {
                    "week_no": 6,
                    "topic": "고급 주제",
                    "description": "고급 내용 학습"
                },
                {
                    "week_no": 7,
                    "topic": "프로젝트",
                    "description": "프로젝트 진행"
                },
                {
                    "week_no": 8,
                    "topic": "발표 및 토론",
                    "description": "프로젝트 발표"
                },
                {
                    "week_no": 9,
                    "topic": "종합 정리",
                    "description": "전체 내용 정리"
                },
                {
                    "week_no": 10,
                    "topic": "기말 평가",
                    "description": "기말고사"
                }
            ]
        }
    
    def analyze_syllabus_with_llm(syllabus_text: str):
        """Google Gemini API를 사용하여 강의계획서를 실시간으로 분석하고 구조화된 정보 추출 (JSON 반환)
        
        test_gemini.py에서 성공한 모델 선택 로직을 사용하여 무료 계정에 적합한 모델을 자동 선택합니다.
        JSON Mode를 사용하여 정확한 JSON 형식으로 응답을 받습니다.
        """
        # API 키 확인
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            error_msg = "GEMINI_API_KEY가 설정되지 않았습니다."
            print(f"❌ {error_msg}")
            print("   backend/.env 파일에 GEMINI_API_KEY=... 형식으로 추가해주세요.")
            print("   API 키는 https://aistudio.google.com/app/apikey 에서 발급받을 수 있습니다.")
            raise ValueError(error_msg)
        
        # API 키 마스킹 (보안)
        masked_key = api_key[:7] + "..." + api_key[-4:] if len(api_key) > 11 else "***"
        print(f"🔑 Gemini API 키 확인: 설정됨 ({masked_key})")
        
        # 텍스트 검증
        if not syllabus_text or len(syllabus_text.strip()) == 0:
            error_msg = "강의계획서 텍스트가 비어있습니다."
            print(f"❌ {error_msg}")
            raise ValueError(error_msg)
        
        print(f"📄 강의계획서 텍스트 길이: {len(syllabus_text)} 문자")
        
        try:
            # Gemini API 클라이언트 설정
            genai.configure(api_key=api_key)
            
            # 사용 가능한 모델 목록 조회하여 무료 계정에 적합한 모델 선택
            print("📋 사용 가능한 모델 목록 조회 중...")
            models = genai.list_models()
            available_models = []
            for model_obj in models:
                model_obj_name = model_obj.name
                if model_obj_name.startswith('models/'):
                    model_obj_name = model_obj_name.replace('models/', '')
                # generateContent를 지원하는 모델만 추가
                if 'generateContent' in model_obj.supported_generation_methods:
                    available_models.append(model_obj_name)
            
            # 무료 계정에 적합한 모델 우선순위: 여러 모델 시도
            # 1순위: gemini-2.5-flash (사용자가 확인한 할당량 있는 모델)
            # 2순위: gemini-flash-latest (가장 안정적)
            # 3순위: 일반 flash 모델
            # 4순위: lite 모델 (할당량이 0일 수 있음)
            
            model_candidates = []
            
            # gemini-2.5-flash 찾기 (사용자가 확인한 할당량 있는 모델)
            flash_25_models = [m for m in available_models if '2.5-flash' in m.lower() or ('2.5' in m.lower() and 'flash' in m.lower())]
            if flash_25_models:
                # 정확히 gemini-2.5-flash 우선
                exact_match = [m for m in flash_25_models if m.lower() == 'gemini-2.5-flash']
                if exact_match:
                    model_candidates.extend(exact_match)
                else:
                    model_candidates.extend(flash_25_models)
            
            # gemini-flash-latest 찾기
            latest_models = [m for m in available_models if 'flash-latest' in m.lower()]
            if latest_models:
                model_candidates.extend(latest_models)
            
            # 일반 flash 모델 찾기 (2.5, latest 제외)
            flash_models = [m for m in available_models if 'flash' in m.lower() and 'lite' not in m.lower() and 'latest' not in m.lower() and '2.5' not in m.lower()]
            if flash_models:
                model_candidates.extend(flash_models)
            
            # lite 모델 찾기 (마지막 순위 - 할당량이 0일 수 있음)
            lite_models = [m for m in available_models if 'lite' in m.lower() and 'flash' in m.lower()]
            if lite_models:
                model_candidates.extend(lite_models)
            
            # 모델이 없으면 첫 번째 사용 가능한 모델 사용
            if not model_candidates:
                if available_models:
                    model_candidates = [available_models[0]]
                else:
                    raise Exception("사용 가능한 모델을 찾을 수 없습니다.")
            
            # 여러 모델을 순차적으로 시도
            model = None
            selected_model_name = None
            for model_name in model_candidates:
                try:
                    print(f"📡 모델 생성 중... (모델: {model_name})")
                    # Gemini 모델 생성
                    test_model = genai.GenerativeModel(
                        model_name,
                        generation_config=genai.types.GenerationConfig(
                            temperature=0.3
                        )
                    )
                    # 모델 생성만 확인 (테스트 호출 없이)
                    model = test_model
                    selected_model_name = model_name
                    print(f"✅ 모델 선택 완료: {selected_model_name}")
                    break
                except Exception as model_error:
                    error_msg = str(model_error)
                    # 404 에러면 다음 모델 시도
                    if '404' in error_msg or 'not found' in error_msg.lower():
                        print(f"⚠️  {model_name}: 모델을 찾을 수 없음 - 다음 모델 시도...")
                        continue
                    # 429 할당량 초과 에러면 다음 모델 시도
                    elif '429' in error_msg or 'quota' in error_msg.lower() or 'exceeded' in error_msg.lower():
                        print(f"⚠️  {model_name}: 할당량 초과 - 다음 모델 시도...")
                        continue
                    # 다른 에러면 재발생
                    else:
                        print(f"⚠️  {model_name}: {error_msg}")
                        if model_name == model_candidates[-1]:  # 마지막 모델이면 에러 발생
                            raise
            
            if not model:
                raise Exception("사용 가능한 모델을 찾을 수 없습니다.")
            
            # 프롬프트 구성 (JSON 구조)
            # PyPDF2로 추출된 텍스트를 프롬프트에 직접 포함
            prompt = f"""당신은 대학 강의계획서를 분석하는 전문가입니다. 주어진 텍스트에서 정확한 정보를 추출하여 JSON 형식으로 응답합니다.

다음은 대학 강의계획서의 텍스트입니다. 이 텍스트를 분석하여 다음 JSON 형식으로 추출해주세요:

{{
  "basic_info": {{
    "credits": 3,
    "course_type": "전공핵심",
    "course_level": "200단위",
    "grading_policy": {{
      "midterm": 30,
      "final": 30,
      "assignment": 25,
      "attendance": 10,
      "other": 5,
      "summary": "중간고사 30%, 기말고사 30%, 과제 25%, 출석 10%, 기타 5%"
    }}
  }},
  "weekly_schedule": [
    {{
      "week_no": 1,
      "topic": "오리엔테이션",
      "description": "강의 소개 및 학습 목표"
    }},
    {{
      "week_no": 2,
      "topic": "기초 개념",
      "description": "기본 개념 학습"
    }}
  ]
}}

강의계획서 텍스트 (PyPDF2로 추출된 텍스트):
{syllabus_text[:8000]}

중요 사항:
1. 반드시 유효한 JSON 형식으로만 응답해주세요.
2. 다른 설명이나 텍스트는 포함하지 마세요.
3. credits는 숫자로, grading_policy의 값들은 숫자(%)로 반환해주세요.
4. course_type: 강의계획서에서 "전공기초", "전공핵심", "전공심화" 등 과목구분을 찾아서 추출. 예: "전공핵심", "전공기초". 없으면 null.
5. course_level: 강의계획서에서 "100단위", "200단위", "300단위", "400단위" 등 이수구분을 찾아서 추출. 예: "200단위", "300단위". 없으면 null.
6. weekly_schedule은 강의계획서에 나온 주차별 주제를 모두 추출해주세요.
7. week_no는 1부터 시작하는 연속된 숫자여야 합니다.
8. 강의계획서 텍스트를 꼼꼼히 읽고, 과목구분(전공기초/전공핵심 등), 이수구분(100단위/200단위 등)을 정확히 찾아서 추출해주세요."""
            
            print(f"🤖 Gemini API 실시간 호출 시작...")
            print(f"   모델: {selected_model_name}")
            print(f"   프롬프트 길이: {len(prompt)} 문자")
            import time
            start_time = time.time()
            
            # 실시간 API 호출 (JSON Mode 사용)
            response = model.generate_content(prompt)
            
            elapsed_time = time.time() - start_time
            print(f"✅ Gemini API 응답 수신 완료 (소요 시간: {elapsed_time:.2f}초)")
            
            # 응답 파싱
            response_text = response.text.strip()
            
            # JSON 마크다운 코드 블록 제거 (있는 경우)
            if response_text.startswith('```json'):
                response_text = response_text[7:]  # ```json 제거
            if response_text.startswith('```'):
                response_text = response_text[3:]  # ``` 제거
            if response_text.endswith('```'):
                response_text = response_text[:-3]  # ``` 제거
            response_text = response_text.strip()
            
            # JSON 파싱
            result = json.loads(response_text)
            
            # 필수 필드가 없으면 기본값 설정
            if 'basic_info' not in result:
                result['basic_info'] = {}
            if 'grading_policy' not in result['basic_info']:
                result['basic_info']['grading_policy'] = {}
            if 'weekly_schedule' not in result:
                result['weekly_schedule'] = []
            
            # course_type, course_level이 없으면 None으로 설정
            # 빈 문자열도 None으로 변환
            if 'course_type' not in result['basic_info'] or not result['basic_info'].get('course_type'):
                result['basic_info']['course_type'] = None
            elif isinstance(result['basic_info']['course_type'], str) and result['basic_info']['course_type'].strip() == '':
                result['basic_info']['course_type'] = None
                
            if 'course_level' not in result['basic_info'] or not result['basic_info'].get('course_level'):
                result['basic_info']['course_level'] = None
            elif isinstance(result['basic_info']['course_level'], str) and result['basic_info']['course_level'].strip() == '':
                result['basic_info']['course_level'] = None
            
            # grading_policy에서 0인 값들 제거 (표시하지 않기 위해)
            if 'grading_policy' in result.get('basic_info', {}):
                grading_policy = result['basic_info']['grading_policy']
                # 0이거나 None인 필드 제거
                fields_to_remove = []
                for key in grading_policy.keys():
                    if key != 'summary' and (grading_policy[key] == 0 or grading_policy[key] is None):
                        fields_to_remove.append(key)
                for key in fields_to_remove:
                    del grading_policy[key]
            
            # 디버깅: 추출된 정보 확인
            print(f"📊 LLM 분석 결과:")
            print(f"   - 학점: {result['basic_info'].get('credits', 'N/A')}")
            print(f"   - 과목구분: {result['basic_info'].get('course_type', 'N/A')}")
            print(f"   - 이수구분: {result['basic_info'].get('course_level', 'N/A')}")
            print(f"   - 주차 수: {len(result.get('weekly_schedule', []))}")
            print(f"📊 전체 LLM 분석 결과: {json.dumps(result, ensure_ascii=False, indent=2)}")
            
            return result
            
        except json.JSONDecodeError as e:
            error_msg = str(e)
            print(f"❌ JSON 파싱 오류: {error_msg}")
            response_content = response.choices[0].message.content if 'response' in locals() and hasattr(response, 'choices') else 'N/A'
            print(f"응답 내용: {response_content}")
            raise ValueError(f"JSON 파싱 실패: {error_msg}")
            
        except Exception as e:
            error_msg = str(e)
            error_type = type(e).__name__
            print(f"❌ LLM 분석 중 오류: {error_type} - {error_msg}")
            
            # 할당량 초과 오류 처리 (Gemini)
            if '429' in error_msg or 'quota' in error_msg.lower() or 'rate limit' in error_msg.lower() or 'resourceexhausted' in error_msg.lower():
                print("\n" + "="*60)
                print("⚠️  Gemini API 할당량 문제가 발생했습니다.")
                print("해결 방법:")
                print("1. Google AI Studio (https://aistudio.google.com/)에 로그인")
                print("2. API 키 할당량 확인")
                print("3. 무료 티어는 모델별로 할당량이 다를 수 있습니다")
                print("4. 잠시 후 다시 시도하거나 다른 모델 사용")
                print("="*60 + "\n")
                raise ValueError("Gemini API 할당량이 초과되었습니다.")
            
            # 인증 오류 처리
            if 'authentication' in error_msg.lower() or 'invalid' in error_msg.lower() or '401' in error_msg or '403' in error_msg or 'permissiondenied' in error_msg.lower():
                print("\n" + "="*60)
                print("⚠️  Gemini API 키 인증 오류가 발생했습니다.")
                print("해결 방법:")
                print("1. backend/.env 파일의 GEMINI_API_KEY가 올바른지 확인")
                print("2. Google AI Studio에서 새 API 키 발급")
                print("3. 서버 재시작")
                print("="*60 + "\n")
                raise ValueError("Gemini API 인증 오류가 발생했습니다.")
            
            # 404 에러 처리 (모델을 찾을 수 없음)
            if '404' in error_msg or 'not found' in error_msg.lower() or 'notfound' in error_msg.lower():
                print("\n" + "="*60)
                print("⚠️  Gemini 모델을 찾을 수 없습니다.")
                print("해결 방법:")
                print("1. 모델 이름이 변경되었을 수 있습니다")
                print("2. genai.list_models()로 사용 가능한 모델 확인")
                print("3. 다른 모델로 자동 시도 중...")
                print("="*60 + "\n")
                raise ValueError("Gemini 모델을 찾을 수 없습니다.")
            
            # 기타 오류
            print(f"❌ 예상치 못한 오류: {error_type}")
            raise

    
    # 과목 순서 변경 API
    @app.route('/api/subjects/reorder', methods=['PATCH'])
    def reorder_subjects():
        """과목 순서 변경 (ID 리스트를 받아서 order 업데이트)"""
        try:
            data = request.get_json()
            user_id = data.get('user_id')
            subject_ids = data.get('subject_ids', [])
            
            if not user_id:
                return jsonify({'error': 'user_id is required'}), 400
            if not subject_ids or not isinstance(subject_ids, list):
                return jsonify({'error': 'subject_ids must be a list'}), 400
            
            # 사용자의 과목인지 확인
            subjects = Subject.query.filter_by(user_id=user_id).filter(Subject.id.in_(subject_ids)).all()
            if len(subjects) != len(subject_ids):
                return jsonify({'error': 'Some subjects not found or not owned by user'}), 404
            
            # order 업데이트
            for index, subject_id in enumerate(subject_ids, start=1):
                subject = next(s for s in subjects if s.id == subject_id)
                subject.order = index
                subject.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            return jsonify({
                'message': '과목 순서가 업데이트되었습니다.',
                'subjects': [subject.to_dict() for subject in subjects]
            }), 200
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500
    
    # 과목 색상 변경 API
    @app.route('/api/subjects/<int:subject_id>/color', methods=['PATCH'])
    def update_subject_color(subject_id):
        """특정 과목의 색상 변경"""
        try:
            data = request.get_json()
            color = data.get('color')
            user_id = data.get('user_id')
            
            if not color:
                return jsonify({'error': 'color is required'}), 400
            if not user_id:
                return jsonify({'error': 'user_id is required'}), 400
            
            # HEX 색상 코드 검증
            if not color.startswith('#') or len(color) != 7:
                return jsonify({'error': 'Invalid color format. Must be HEX code (e.g., #FF5733)'}), 400
            
            subject = Subject.query.get(subject_id)
            if not subject:
                return jsonify({'error': 'Subject not found'}), 404
            
            # 사용자 소유 확인
            if subject.user_id != user_id:
                return jsonify({'error': 'Unauthorized'}), 403
            
            subject.color = color
            subject.updated_at = datetime.utcnow()
            db.session.commit()
            
            return jsonify({
                'message': '과목 색상이 업데이트되었습니다.',
                'subject': subject.to_dict()
            }), 200
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500
    
    # ==================== 주차별 자료 업로드 ====================
    
    @app.route('/weeks/<int:week_id>/materials', methods=['POST'])
    def upload_week_material(week_id):
        """주차별 자료 업로드 (PDF인 경우 학습용 PDF로도 저장)"""
        try:
            if 'file' not in request.files:
                return jsonify({'error': 'No file provided'}), 400
            
            file = request.files['file']
            if file.filename == '':
                return jsonify({'error': 'No file selected'}), 400
            
            # 주차 확인 (없으면 생성)
            week = Week.query.get(week_id)
            if not week:
                # Week가 없으면 subject_id와 week_number로 찾기 시도
                # 또는 subject_id와 week_number를 받아서 생성
                data = request.form.to_dict()
                subject_id = data.get('subject_id')
                week_number = data.get('week_number')
                
                if not subject_id or not week_number:
                    return jsonify({'error': 'Week not found and missing subject_id/week_number'}), 404
                
                # Week 생성
                week = Week(
                    subject_id=int(subject_id),
                    week_number=int(week_number),
                    title=f"Week {week_number}",
                    description=""
                )
                db.session.add(week)
                db.session.flush()  # ID 생성
            
            subject = Subject.query.get(week.subject_id)
            if not subject:
                return jsonify({'error': 'Subject not found'}), 404
            
            # 파일 확장자 확인
            if not allowed_file(file.filename):
                return jsonify({'error': f'File type not allowed. Allowed types: {", ".join(app.config["ALLOWED_EXTENSIONS"])}'}), 400
            
            # 파일 저장
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = secure_filename(f"{week_id}_{timestamp}_{file.filename}")
            file_path = os.path.join(app.config['MATERIAL_FOLDER'], filename)
            file.save(file_path)
            
            # 파일 정보 추출
            file_ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
            file_size = os.path.getsize(file_path)
            
            # DB에 저장 (Material)
            relative_path = os.path.join('uploads', 'materials', filename)
            material = Material(
                week_id=week_id,
                file_name=file.filename,
                file_path=relative_path,
                file_type=file_ext,
                file_size=file_size
            )
            db.session.add(material)
            
            # PDF인 경우 학습용 PDF로도 저장 (새로운 방식에서는 벡터 인덱스 없이 저장)
            learning_pdf = None
            if file_ext == 'pdf':
                try:
                    # 텍스트 추출
                    extracted_text = extract_text_from_pdf(file_path)
                    if extracted_text:
                        # LearningPDF에 저장 (벡터 인덱스는 생성하지 않음)
                        learning_pdf = LearningPDF(
                            subject_id=subject.id,
                            file_name=file.filename,
                            file_path=relative_path,
                            file_size=file_size,
                            vector_index_path=None  # 새로운 방식에서는 벡터 인덱스 불필요
                        )
                        db.session.add(learning_pdf)
                except Exception as e:
                    print(f"⚠️  학습용 PDF 처리 중 오류 (자료는 정상 저장됨): {e}")
                    # 학습용 PDF 처리 실패해도 자료 업로드는 성공으로 처리
            
            db.session.commit()
            
            result = {
                'message': 'Material uploaded successfully',
                'material': material.to_dict(),
                'learning_pdf_id': learning_pdf.id if learning_pdf else None
            }
            if learning_pdf:
                result['learning_pdf'] = learning_pdf.to_dict()
            
            return jsonify(result), 201
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500
    
    # ==================== 자료 삭제 API ====================
    
    @app.route('/api/materials/<int:material_id>', methods=['DELETE'])
    def delete_material(material_id):
        """자료 삭제"""
        try:
            material = Material.query.get(material_id)
            if not material:
                return jsonify({'error': 'Material not found'}), 404
            
            # week 정보 가져오기 (LearningPDF 삭제를 위해 필요)
            week = material.week
            subject_id = None
            week_id = None
            if week:
                subject_id = week.subject_id
                week_id = week.id
            
            # 파일 삭제
            app_basedir = os.path.abspath(os.path.dirname(__file__))
            if material.file_path:
                if material.file_path.startswith('uploads/'):
                    file_path = os.path.join(app_basedir, material.file_path)
                else:
                    file_path = os.path.join(app_basedir, 'uploads', 'materials', os.path.basename(material.file_path))
                
                if os.path.exists(file_path):
                    try:
                        os.remove(file_path)
                        print(f"✅ 파일 삭제 완료: {file_path}")
                    except Exception as e:
                        print(f"⚠️  파일 삭제 실패: {e}")
            
            # LearningPDF도 함께 삭제 (PDF인 경우)
            if material.file_type == 'pdf' and subject_id and material.file_path:
                # subject_id와 file_path로 LearningPDF 찾기
                learning_pdf = LearningPDF.query.filter_by(
                    subject_id=subject_id,
                    file_path=material.file_path
                ).first()
                
                if not learning_pdf:
                    # file_path만으로도 시도 (경로 형식이 다를 수 있음)
                    learning_pdf = LearningPDF.query.filter(
                        LearningPDF.subject_id == subject_id,
                        LearningPDF.file_name == material.file_name
                    ).first()
                
                if learning_pdf:
                    # 벡터 인덱스 파일 삭제
                    if learning_pdf.vector_db_path and os.path.exists(learning_pdf.vector_db_path):
                        try:
                            os.remove(learning_pdf.vector_db_path)
                            chunks_path = learning_pdf.vector_db_path.replace('.index', '_chunks.pkl')
                            if os.path.exists(chunks_path):
                                os.remove(chunks_path)
                            print(f"✅ 벡터 인덱스 파일 삭제 완료")
                        except Exception as e:
                            print(f"⚠️  벡터 인덱스 파일 삭제 실패: {e}")
                    db.session.delete(learning_pdf)
                    print(f"✅ LearningPDF 삭제 완료")
            
            # PDF 삭제 시 해당 주차의 개념 학습 콘텐츠도 삭제
            if material.file_type == 'pdf' and week:
                week_id = week.id
                # 해당 주차의 모든 ConceptContent 삭제
                concept_contents = ConceptContent.query.filter_by(week_id=week_id).all()
                for content in concept_contents:
                    db.session.delete(content)
                if concept_contents:
                    print(f"✅ ConceptContent 삭제 완료 ({len(concept_contents)}개)")
            
            # Material 삭제
            db.session.delete(material)
            db.session.commit()
            
            # week_id를 응답에 포함하여 프론트엔드에서 localStorage 캐시 삭제 가능하도록
            response_data = {
                'message': 'Material deleted successfully',
                'week_id': week_id if material.file_type == 'pdf' and week else None
            }
            
            return jsonify(response_data), 200
            
        except Exception as e:
            db.session.rollback()
            import traceback
            traceback.print_exc()
            return jsonify({'error': str(e)}), 500
    
    # ==================== Concept Learning ====================
    
    @app.route('/api/concept/generate', methods=['POST'])
    def generate_concept_content():
        """Concept Learning 콘텐츠 생성 (Summary 또는 Deep Dive)"""
        try:
            data = request.get_json()
            week_id = data.get('week_id')
            mode = data.get('mode', 'summary')  # 'summary' or 'deep_dive'
            force_regenerate = data.get('force_regenerate', False)
            
            if not week_id:
                return jsonify({'error': 'week_id is required'}), 400
            
            if mode not in ['summary', 'deep_dive']:
                return jsonify({'error': 'mode must be "summary" or "deep_dive"'}), 400
            
            # Week 확인
            week = Week.query.get(week_id)
            if not week:
                return jsonify({'error': 'Week not found'}), 404
            
            # 주차 번호 확인 (1주차인지 체크)
            week_number = week.week_number
            is_first_week = (week_number == 1)
            
            # 캐시 확인 (force_regenerate가 False인 경우)
            if not force_regenerate:
                cached_content = ConceptContent.query.filter_by(
                    week_id=week_id,
                    mode=mode
                ).first()
                
                if cached_content:
                    return jsonify({
                        'content': cached_content.content
                    }), 200
            
            # 주차별 PDF 자료 찾기
            pdf_materials = Material.query.filter_by(week_id=week_id, file_type='pdf').all()
            if not pdf_materials:
                return jsonify({'error': 'No PDF materials found for this week'}), 404
            
            # 모든 PDF 파일의 텍스트 추출 및 합치기
            app_basedir = os.path.abspath(os.path.dirname(__file__))
            all_pdf_texts = []
            pdf_extraction_errors = []
            
            for pdf_material in pdf_materials:
                try:
                    # 파일 경로 구성
                    if pdf_material.file_path.startswith('uploads/'):
                        pdf_path = os.path.join(app_basedir, pdf_material.file_path)
                    else:
                        pdf_path = os.path.join(app_basedir, 'uploads', 'materials', os.path.basename(pdf_material.file_path))
                    
                    if not os.path.exists(pdf_path):
                        pdf_extraction_errors.append(f"PDF 파일을 찾을 수 없습니다: {pdf_path}")
                        continue
                    
                    pdf_text = extract_text_from_pdf(pdf_path)
                    if pdf_text and len(pdf_text.strip()) >= 50:
                        # PDF 파일명이 유효한 경우에만 구분자 추가
                        if pdf_material.file_name and pdf_material.file_name.strip():
                            all_pdf_texts.append(f"\n\n## 📄 {pdf_material.file_name}\n\n{pdf_text}\n\n")
                        else:
                            all_pdf_texts.append(f"\n\n{pdf_text}\n\n")
                    else:
                        pdf_extraction_errors.append(f"PDF에서 텍스트를 추출할 수 없거나 내용이 너무 짧습니다: {pdf_material.file_name or '알 수 없음'}")
                except Exception as pdf_error:
                    pdf_extraction_errors.append(f"PDF 처리 중 오류 발생 ({pdf_material.file_name or '알 수 없음'}): {str(pdf_error)}")
            
            if not all_pdf_texts:
                error_msg = 'PDF에서 텍스트를 추출할 수 없습니다.'
                if pdf_extraction_errors:
                    error_msg += f' 상세: {"; ".join(pdf_extraction_errors[:3])}'
                return jsonify({'error': error_msg}), 400
            
            # 모든 PDF 텍스트 합치기
            lecture_text = '\n'.join(all_pdf_texts)
            
            # 프롬프트 길이 최적화 (너무 긴 텍스트는 할당량 소모가 큼)
            # 12000자로 제한하여 토큰 사용량 감소
            max_text_length = 12000
            if len(lecture_text) > max_text_length:
                print(f"⚠️ PDF 텍스트가 너무 깁니다 ({len(lecture_text)} 문자). {max_text_length}자로 제한합니다.")
                lecture_text = lecture_text[:max_text_length] + "\n\n[이하 생략...]"
            
            # Gemini API 설정
            api_key = os.getenv('GEMINI_API_KEY')
            if not api_key:
                print("❌ GEMINI_API_KEY가 설정되지 않았습니다!")
                return jsonify({'error': 'GEMINI_API_KEY가 설정되지 않았습니다. .env 파일을 확인해주세요.'}), 500
            
            print(f"✅ Gemini API 키 확인됨 (길이: {len(api_key)})")
            genai.configure(api_key=api_key)
            
            # 모델 선택: 강의 계획서 업로드와 동일한 로직 사용
            # 사용 가능한 모델 목록 가져오기
            try:
                print("📋 사용 가능한 모델 목록 확인 중...")
                available_models = []
                for m in genai.list_models():
                    if 'generateContent' in m.supported_generation_methods:
                        model_name = m.name.replace('models/', '')  # 'models/gemini-pro' -> 'gemini-pro'
                        available_models.append(model_name)
                        print(f"  ✅ {model_name}")
                
                if not available_models:
                    raise Exception("사용 가능한 모델을 찾을 수 없습니다.")
                
                # 모델 우선순위 설정 (할당량을 고려하여)
                # gemini-2.5-flash는 할당량이 제한적이므로 우선순위에서 제외
                model_candidates = []
                preferred_models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro']
                
                # 선호하는 모델이 있으면 먼저 추가 (2.5-flash 제외)
                for preferred in preferred_models:
                    if preferred in available_models:
                        model_candidates.append(preferred)
                
                # 나머지 모델 추가 (2.5 버전은 마지막에 추가하여 할당량 문제 시 대비)
                for model_name in available_models:
                    if model_name not in model_candidates and '2.5' not in model_name.lower():
                        model_candidates.append(model_name)
                
                # 2.5 버전 모델은 마지막에만 추가 (할당량 문제가 있을 수 있음)
                for model_name in available_models:
                    if '2.5' in model_name.lower() and model_name not in model_candidates:
                        model_candidates.append(model_name)
                
                print(f"📡 모델 후보: {model_candidates}")
                
            except Exception as list_error:
                print(f"⚠️ 모델 목록 조회 실패: {str(list_error)}")
                # 기본 모델 목록 사용
                model_candidates = ['gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash']
            
            # 여러 모델을 순차적으로 시도
            model = None
            selected_model_name = None
            for model_name in model_candidates:
                try:
                    print(f"📡 모델 생성 시도 중... (모델: {model_name})")
                    test_model = genai.GenerativeModel(model_name)
                    model = test_model
                    selected_model_name = model_name
                    print(f"✅ 모델 선택 완료: {selected_model_name}")
                    break
                except Exception as model_error:
                    error_msg = str(model_error)
                    # 404 에러면 다음 모델 시도
                    if '404' in error_msg or 'not found' in error_msg.lower():
                        print(f"⚠️  {model_name}: 모델을 찾을 수 없음 - 다음 모델 시도...")
                        continue
                    # 429 할당량 초과 에러면 다음 모델 시도
                    elif '429' in error_msg or 'quota' in error_msg.lower() or 'exceeded' in error_msg.lower():
                        print(f"⚠️  {model_name}: 할당량 초과 - 다음 모델 시도...")
                        continue
                    # 다른 에러면 재발생
                    else:
                        print(f"⚠️  {model_name}: {error_msg}")
                        if model_name == model_candidates[-1]:  # 마지막 모델이면 에러 발생
                            raise
            
            if not model:
                return jsonify({
                    'error': '사용 가능한 Gemini 모델을 찾을 수 없습니다. API 키와 모델 이름을 확인해주세요.'
                }), 500
            
            # 모드별 프롬프트 구성
            # f-string에서 백슬래시를 직접 사용할 수 없으므로 일반 문자열 연결 사용
            # 주차별 특별 지시사항
            week_specific_instruction = ""
            if not is_first_week:
                week_specific_instruction = "\n**중요: 이 주차는 " + str(week_number) + "주차입니다. 강의 개요 및 운영 정보는 1주차에만 포함되므로, 이번 주차에서는 강의 개요 섹션을 포함하지 마세요. 바로 학습 내용부터 시작하세요.**\n"
            
            if mode == 'summary':
                prompt = """당신은 학습 자료를 정리하는 전문가입니다. 다음 강의 자료를 읽고, 깔끔하고 체계적인 학습 노트 형식으로 핵심 요약을 작성해주세요.

강의 자료:
""" + lecture_text + week_specific_instruction + """

**중요한 지시사항:**

1. **Markdown 헤딩 구조를 반드시 사용하세요:**
   - # (h1) - 최상위 섹션 제목""" + (""" (예: "1. 강의 개요 및 운영")""" if is_first_week else """ (강의 개요는 1주차에만 포함)""") + """
   - ## (h2) - 주요 하위 섹션 (예: "(1) 강의 정보")
   - ### (h3) - 세부 항목 (예: "→ 과목명: ...")
   - 각 헤딩은 반드시 새 줄에 시작하고, 헤딩 다음에 빈 줄을 넣으세요.

2. **계층적 리스트 구조 (매우 중요):**
   - Level 1: 번호 매기기 리스트 (1., 2., 3.) - **각 항목은 반드시 새 줄에 시작**
   - Level 2: 중첩된 번호 매기기 ((1), (2), (3)) 또는 하위 리스트 - **각 항목은 반드시 새 줄에 시작**
   - Level 3: (1) 괄호 숫자 다음으로 오는 목차는 하이픈(-)을 사용하세요. 최상위 제목(h1) 바로 아래의 항목은 화살표(→)를 사용할 수 있습니다.
   - **절대 금지:** 같은 줄에 여러 항목을 이어붙이지 마세요. 예: "- 항목1 - 항목2" (X)
   - **올바른 예:** 
     코드 블록 시작
     (1) 첫 번째 항목
     - 하위 항목1
     - 하위 항목2
     (2) 두 번째 항목
     - 하위 항목1
     코드 블록 끝

3. **수식이 포함된 경우:**
   - 수식은 LaTeX 형식($$...$$ 블록 수식, $...$ 인라인 수식)으로 작성하세요.
   - 수식이 있어도 리스트 구조는 반드시 유지하세요.
   - 수식 앞뒤로 적절한 줄바꿈을 넣으세요.
   - **예시:**
     코드 블록 시작
     (1) 선형대수학 기초
     - 벡터 (Vectors): 숫자의 1차원 배열. $x \\in R^n$와 같이 표기.
     - 행렬 (Matrices): 숫자의 2차원 배열. $A \\in R^{m \\times n}$와 같이 표기.
     코드 블록 끝

4. **형식 규칙:**
   - 각 섹션은 명확하게 구분되도록 빈 줄로 분리하세요.
   - 제목은 항상 본문보다 크고 굵게 표시되도록 헤딩 태그를 사용하세요.
   - 중요한 개념은 **굵게** 표시하세요.
   - 리스트 항목 사이에는 적절한 간격을 두세요.

5. **예시 형식:**
```
# 1. 강의 개요 및 운영

## (1) 강의 정보

### → 과목명: SOI1010 Machine Learning II

### → 담당 교수: Sungyong Baik

### → 시간 및 장소:
- 화요일 9:00 am – 11:00 am (FTC Intelligence Computing Room 3)
- 수요일 1:00 pm – 3:00 pm (FTC Intelligence Computing Room 1)

# 2. 선형대수학 및 확률 복습

## (1) 선형대수학 복습

### 스칼라 (Scalars)
단일 숫자. $a$와 같이 이탤릭체로 표기.

(1) 선형대수학 기초
- 벡터 (Vectors): 숫자의 1차원 배열. $x \\in R^n$와 같이 표기.
- 행렬 (Matrices): 숫자의 2차원 배열. $A \\in R^{m \\times n}$와 같이 표기.
```

6. **금지 사항 (반드시 지켜주세요):**
   - 같은 줄에 여러 항목을 이어붙이지 마세요. (예: "- 항목1 - 항목2" 절대 금지)
   - 제목과 본문을 구분하지 않고 작성하지 마세요.
   - 리스트 항목을 수평으로 나열하지 마세요.
   - 수식이 있어도 리스트 구조를 무시하지 마세요.
   - (1) 괄호 숫자 다음의 하위 항목은 반드시 하이픈(-)을 사용하세요. 화살표(→)는 사용하지 마세요.

7. **언어 규칙 (매우 중요):**
   - 모든 내용은 반드시 한국어로 작성하세요.
   - 영어 용어가 필요한 경우 괄호 안에 영어를 병기할 수 있지만, 설명과 본문은 모두 한국어로 작성하세요.
   - 예시: "벡터(Vector)" 또는 "행렬(Matrix)" 형식은 허용하지만, 전체 설명이 영어로 작성되면 안 됩니다.
   - 제목, 본문, 리스트 항목 모두 한국어로 작성하세요.

출력은 Markdown 형식으로만 작성하고, 다른 설명은 포함하지 마세요. 모든 내용은 반드시 한국어로 작성하세요."""
            else:  # deep_dive
                # 주차별 특별 지시사항
                week_specific_instruction = ""
                if not is_first_week:
                    week_specific_instruction = "\n**중요: 이 주차는 " + str(week_number) + "주차입니다. 강의 개요 및 운영 정보는 1주차에만 포함되므로, 이번 주차에서는 강의 개요 섹션을 포함하지 마세요. 바로 학습 내용부터 시작하세요.**\n"
                
                prompt = """당신은 개념을 쉽게 설명하는 전문가입니다. 다음 강의 자료를 읽고, 상세하고 이해하기 쉬운 설명을 작성해주세요.

강의 자료:
""" + lecture_text + week_specific_instruction + """

**중요한 지시사항:**

1. **Markdown 헤딩 구조를 반드시 사용하세요:**
   - # (h1) - 최상위 섹션 제목""" + (""" (예: "1. 강의 개요 및 운영")""" if is_first_week else """ (강의 개요는 1주차에만 포함)""") + """
   - ## (h2) - 주요 하위 섹션
   - ### (h3) - 세부 항목
   - 각 헤딩은 반드시 새 줄에 시작하고, 헤딩 다음에 빈 줄을 넣으세요.

2. **계층적 리스트 구조 (매우 중요):**
   - Level 1: 번호 매기기 리스트 (1., 2., 3.) - **각 항목은 반드시 새 줄에 시작**
   - Level 2: 중첩된 번호 매기기 ((1), (2), (3)) 또는 하위 리스트 - **각 항목은 반드시 새 줄에 시작**
   - Level 3: (1) 괄호 숫자 다음으로 오는 목차는 하이픈(-)을 사용하세요. 최상위 제목(h1) 바로 아래의 항목은 화살표(→)를 사용할 수 있습니다.
   - **절대 금지:** 같은 줄에 여러 항목을 이어붙이지 마세요. 예: "- 항목1 - 항목2" (X)
   - **올바른 예:** 
     코드 블록 시작
     (1) 첫 번째 항목
     - 하위 항목1
     - 하위 항목2
     (2) 두 번째 항목
     - 하위 항목1
     코드 블록 끝

3. **수식이 포함된 경우:**
   - 수식은 LaTeX 형식($$...$$ 블록 수식, $...$ 인라인 수식)으로 작성하세요.
   - 수식이 있어도 리스트 구조는 반드시 유지하세요.
   - 수식 앞뒤로 적절한 줄바꿈을 넣으세요.
   - **예시:**
     코드 블록 시작
     (1) 선형대수학 기초
     - 벡터 (Vectors): 숫자의 1차원 배열. $x \\in R^n$와 같이 표기.
     - 행렬 (Matrices): 숫자의 2차원 배열. $A \\in R^{m \\times n}$와 같이 표기.
     코드 블록 끝

4. **설명 방식:**
   - '왜(Why)'와 '어떻게(How)'에 집중하여 설명하세요.
   - 쉬운 예시와 비유를 사용하세요.
   - 각 개념을 단계별로 명확하게 설명하세요.

5. **형식 규칙:**
   - 각 섹션은 명확하게 구분되도록 빈 줄로 분리하세요.
   - 제목은 항상 본문보다 크고 굵게 표시되도록 헤딩 태그를 사용하세요.
   - 중요한 개념은 **굵게** 표시하세요.
   - 리스트 항목 사이에는 적절한 간격을 두세요.

6. **금지 사항 (반드시 지켜주세요):**
   - 같은 줄에 여러 항목을 이어붙이지 마세요. (예: "- 항목1 - 항목2" 절대 금지)
   - 제목과 본문을 구분하지 않고 작성하지 마세요.
   - 리스트 항목을 수평으로 나열하지 마세요.
   - 수식이 있어도 리스트 구조를 무시하지 마세요.
   - (1) 괄호 숫자 다음의 하위 항목은 반드시 하이픈(-)을 사용하세요. 화살표(→)는 사용하지 마세요.

7. **언어 규칙 (매우 중요):**
   - 모든 내용은 반드시 한국어로 작성하세요.
   - 영어 용어가 필요한 경우 괄호 안에 영어를 병기할 수 있지만, 설명과 본문은 모두 한국어로 작성하세요.
   - 예시: "벡터(Vector)" 또는 "행렬(Matrix)" 형식은 허용하지만, 전체 설명이 영어로 작성되면 안 됩니다.
   - 제목, 본문, 리스트 항목 모두 한국어로 작성하세요.

출력은 Markdown 형식으로만 작성하고, 다른 설명은 포함하지 마세요. 모든 내용은 반드시 한국어로 작성하세요."""
            
            # AI 응답 생성 (재시도 로직 포함)
            print(f"📤 Gemini API 호출 중... (프롬프트 길이: {len(prompt)} 문자)")
            
            # GenerationConfig로 토큰 사용량 최적화
            # API 버전에 따라 GenerationConfig 형식이 다를 수 있으므로 try-except로 처리
            generation_config = None
            try:
                generation_config = genai.types.GenerationConfig(
                    temperature=0.7,
                    top_p=0.95,
                    top_k=40,
                    max_output_tokens=16384,  # 충분한 길이의 콘텐츠 생성을 위해 대폭 증가
                )
                print("✅ GenerationConfig 설정 완료")
            except Exception as config_error:
                print(f"⚠️ GenerationConfig 설정 실패 (기본 설정 사용): {str(config_error)}")
                # GenerationConfig가 지원되지 않는 경우 None으로 두고 기본 설정 사용
                generation_config = None
            
            max_retries = 3
            retry_delay = 2  # 초기 지연 시간 (초)
            
            for attempt in range(max_retries):
                try:
                    # 요청 간 지연 시간 추가 (할당량 제한 방지)
                    if attempt > 0:
                        wait_time = retry_delay * (2 ** (attempt - 1))  # Exponential backoff
                        print(f"⏳ {wait_time}초 대기 후 재시도 중... (시도 {attempt + 1}/{max_retries})")
                        time.sleep(wait_time)
                    else:
                        # 첫 요청 전에도 짧은 지연 (할당량 분산)
                        time.sleep(0.5)
                    
                    # GenerationConfig가 None이면 기본 설정 사용
                    if generation_config:
                        response = model.generate_content(
                            prompt,
                            generation_config=generation_config
                        )
                    else:
                        response = model.generate_content(prompt)
                    print(f"✅ Gemini API 응답 수신됨")
                    
                    if not response:
                        print("❌ Gemini API 응답이 None입니다")
                        if attempt < max_retries - 1:
                            continue  # 재시도
                        return jsonify({'error': 'Gemini API 응답이 비어있습니다. API 키와 모델을 확인해주세요.'}), 500
                    
                    if not hasattr(response, 'text'):
                        print(f"❌ 응답 객체에 'text' 속성이 없습니다. 응답 타입: {type(response)}")
                        if attempt < max_retries - 1:
                            continue  # 재시도
                        return jsonify({'error': 'Gemini API 응답 형식이 예상과 다릅니다. API 버전을 확인해주세요.'}), 500
                    
                    if not response.text:
                        print("❌ Gemini API 응답 텍스트가 비어있습니다")
                        if attempt < max_retries - 1:
                            continue  # 재시도
                        return jsonify({'error': 'Gemini API 응답이 비어있습니다. API 키와 모델을 확인해주세요.'}), 500
                    
                    # 응답이 완전히 완료되었는지 확인
                    response_text = response.text.strip()
                    
                    # 응답이 완전한지 확인
                    if not response_text or len(response_text) < 50:
                        print(f"⚠️ 응답이 너무 짧습니다 (길이: {len(response_text)} 문자)")
                        if attempt < max_retries - 1:
                            continue  # 재시도
                        return jsonify({'error': '생성된 콘텐츠가 너무 짧습니다. 다시 시도해주세요.'}), 500
                    
                    print(f"✅ 응답 텍스트 추출 완료 (길이: {len(response_text)} 문자)")
                    
                    # 응답이 완전히 끝났는지 확인 (마지막 문장이 완료 표시로 끝나는지)
                    last_char = response_text[-1] if response_text else ''
                    if last_char not in ['.', '!', '?', ':', ';', '\n'] and not response_text.endswith('```'):
                        print("⚠️ 응답이 불완전할 수 있습니다. 하지만 계속 진행합니다.")
                    
                    break  # 성공하면 루프 종료
                    
                except Exception as api_error:
                    import traceback
                    error_trace = traceback.format_exc()
                    error_str = str(api_error)
                    
                    print("=" * 80)
                    print(f"❌ Gemini API 호출 실패! (시도 {attempt + 1}/{max_retries})")
                    print(f"오류 타입: {type(api_error).__name__}")
                    print(f"오류 메시지: {error_str}")
                    print("-" * 80)
                    
                    # 할당량 초과 에러 처리
                    is_quota_error = ('429' in error_str or 
                                     'quota' in error_str.lower() or 
                                     'exceeded' in error_str.lower() or
                                     'rate limit' in error_str.lower())
                    
                    if is_quota_error:
                        if attempt < max_retries - 1:
                            print(f"할당량 초과 감지. 재시도 대기 중...")
                            continue  # 재시도
                        else:
                            # 모든 재시도 실패
                            user_message = 'Gemini API 할당량을 초과했습니다. 잠시 후 다시 시도해주세요. (일반적으로 몇 분 후에 재시도 가능합니다)'
                            print("=" * 80)
                            return jsonify({
                                'error': user_message,
                                'error_code': 'QUOTA_EXCEEDED',
                                'retry_after': 60  # 60초 후 재시도 권장
                            }), 429
                    
                    # 기타 API 에러 - 재시도 가능한 경우
                    if attempt < max_retries - 1:
                        print(f"일시적 오류로 보입니다. 재시도 중...")
                        continue
                    else:
                        # 모든 재시도 실패
                        print("상세 스택 트레이스:")
                        print(error_trace)
                        print("=" * 80)
                        return jsonify({
                            'error': f'Gemini API 호출 실패: {error_str}',
                            'error_code': 'API_ERROR'
                        }), 500
            else:
                # 모든 재시도 실패 (for 루프가 break 없이 종료된 경우)
                return jsonify({
                    'error': 'Gemini API 호출이 여러 번 실패했습니다. 잠시 후 다시 시도해주세요.',
                    'error_code': 'MAX_RETRIES_EXCEEDED'
                }), 500
            
            # 마크다운 코드 블록 제거 (있는 경우)
            if response_text.startswith('```'):
                lines = response_text.split('\n')
                response_text = '\n'.join([line for line in lines if not line.strip().startswith('```')])
            
            # 최종 응답 길이 확인
            if not response_text or len(response_text.strip()) < 50:
                return jsonify({'error': '생성된 콘텐츠가 너무 짧습니다. 다시 시도해주세요.'}), 500
            
            print(f"✅ 최종 콘텐츠 준비 완료 (길이: {len(response_text)} 문자)")
            
            # 데이터베이스에 저장 (기존 캐시 업데이트 또는 새로 생성)
            existing_content = ConceptContent.query.filter_by(
                week_id=week_id,
                mode=mode
            ).first()
            
            if existing_content:
                existing_content.content = response_text
                existing_content.updated_at = datetime.utcnow()
            else:
                new_content = ConceptContent(
                    week_id=week_id,
                    mode=mode,
                    content=response_text
                )
                db.session.add(new_content)
            
            db.session.commit()
            
            return jsonify({
                'content': response_text
            }), 200
            
        except Exception as e:
            db.session.rollback()
            import traceback
            error_trace = traceback.format_exc()
            error_type = type(e).__name__
            error_message = str(e)
            
            print("=" * 80)
            print(f"❌ Concept Learning 생성 중 오류 발생!")
            print(f"오류 타입: {error_type}")
            print(f"오류 메시지: {error_message}")
            print(f"Week ID: {week_id}, Mode: {mode}, Force Regenerate: {force_regenerate}")
            print("-" * 80)
            print("상세 스택 트레이스:")
            print(error_trace)
            print("=" * 80)
            
            # 사용자에게 보여줄 에러 메시지
            user_error_message = f'콘텐츠 생성 중 오류가 발생했습니다: {error_message}'
            
            return jsonify({
                'error': user_error_message,
                'error_type': error_type,
                'details': error_trace if os.getenv('FLASK_ENV') == 'development' else None
            }), 500
    
    # ==================== 주차별 자료의 LearningPDF ID 조회 (FEATURE_DOCUMENTATION.md에 명시되지 않음 - 주석 처리) ====================
    
    # @app.route('/api/weeks/<int:week_id>/learning-pdf-id', methods=['GET'])
    # def get_week_learning_pdf_id(week_id):
    #     """주차별 자료 중 PDF 파일의 LearningPDF ID 조회"""
    #     try:
    #         # 주차 확인
    #         week = Week.query.get(week_id)
    #         if not week:
    #             return jsonify({'error': 'Week not found'}), 404
    #         
    #         # 주차별 자료 중 PDF 파일 찾기
    #         pdf_materials = Material.query.filter_by(week_id=week_id, file_type='pdf').all()
    #         if not pdf_materials:
    #             return jsonify({'error': 'No PDF materials found for this week'}), 404
    #         
    #         # 첫 번째 PDF 파일의 경로로 LearningPDF 찾기
    #         pdf_material = pdf_materials[0]
    #         learning_pdf = LearningPDF.query.filter_by(
    #             subject_id=week.subject_id,
    #             file_path=pdf_material.file_path
    #         ).first()
    #         
    #         if not learning_pdf:
    #             return jsonify({'error': 'Learning PDF not found'}), 404
    #         
    #         return jsonify({
    #             'message': 'Learning PDF ID retrieved',
    #             'learning_pdf_id': learning_pdf.id
    #         }), 200
    #         
    #     except Exception as e:
    #         return jsonify({'error': str(e)}), 500
    
    
    
    
    # ==================== New Quiz System (From Scratch) ====================
    
    @app.route('/api/quiz/generate', methods=['POST'])
    def generate_quiz():
        """퀴즈 생성 API - 적응형 학습 로직 포함"""
        try:
            # 데이터베이스 테이블 존재 확인
            from sqlalchemy import inspect
            inspector = inspect(db.engine)
            existing_tables = inspector.get_table_names()
            required_tables = ['quizzes', 'questions', 'user_responses', 'quiz_reports']
            missing_tables = [t for t in required_tables if t not in existing_tables]
            if missing_tables:
                print(f"⚠️ 필요한 테이블이 없습니다: {missing_tables}")
                print("백엔드 서버를 재시작하여 테이블을 생성하세요.")
                return jsonify({
                    'error': f'데이터베이스 테이블이 생성되지 않았습니다. 다음 테이블이 없습니다: {", ".join(missing_tables)}. 백엔드 서버를 재시작해주세요.'
                }), 500
            
            data = request.get_json()
            subject_id = data.get('subject_id')
            user_id = data.get('user_id')
            week_numbers = data.get('week_numbers', [])  # 선택된 주차 번호 배열
            difficulty = data.get('difficulty', 'medium')  # 'easy', 'medium', 'hard'
            question_types = data.get('question_types', ['multiple_choice'])  # ['multiple_choice', 'short_answer', 'subjective']
            language = data.get('language', 'korean')  # 'korean', 'english'
            num_questions = data.get('num_questions', 5)
            past_exam_context = data.get('past_exam_context', '')  # 과거 시험 예시/컨텍스트
            
            if not subject_id or not user_id:
                return jsonify({'error': 'subject_id and user_id are required'}), 400
            
            if not week_numbers:
                return jsonify({'error': 'At least one week must be selected'}), 400
            
            # 과목 확인
            subject = Subject.query.get(subject_id)
            if not subject:
                return jsonify({'error': 'Subject not found'}), 404
            
            # 사용자 확인
            user = User.query.get(user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            # 선택된 주차의 PDF 파일들 수집
            pdf_texts = []
            selected_weeks = []
            for week_no in week_numbers:
                week = Week.query.filter_by(subject_id=subject_id, week_number=week_no).first()
                if not week:
                    continue
                
                # 해당 주차의 PDF 자료 찾기
                pdf_materials = Material.query.filter_by(week_id=week.id, file_type='pdf').all()
                if not pdf_materials:
                    continue  # PDF가 없는 주차는 건너뛰기
                
                selected_weeks.append(week_no)
                for material in pdf_materials:
                    try:
                        text = extract_text_from_pdf(material.file_path)
                        if text:
                            pdf_texts.append(f"=== Week {week_no} - {material.file_name} ===\n{text}")
                    except Exception as e:
                        print(f"⚠️ PDF 추출 실패 ({material.file_name}): {e}")
            
            if not pdf_texts:
                return jsonify({'error': 'No PDF materials found in selected weeks'}), 400
            
            combined_text = '\n\n'.join(pdf_texts)
            
            # 이전 퀴즈 리포트에서 취약점 분석 (적응형 학습)
            previous_weakness = ""
            try:
                latest_report = db.session.query(QuizReport).join(Quiz).filter(
                    Quiz.subject_id == subject_id,
                    Quiz.user_id == user_id
                ).order_by(QuizReport.created_at.desc()).first()
                
                if latest_report:
                    # 이전 리포트에서 취약점 추출 (간단한 방법: AI 리포트에서 추출)
                    # 실제로는 더 정교한 분석이 필요할 수 있음
                    previous_weakness = latest_report.ai_report
            except Exception as e:
                print(f"⚠️ 이전 리포트 조회 중 오류 (무시하고 계속 진행): {e}")
            
            # 퀴즈 번호 계산 (해당 과목의 퀴즈 개수 + 1)
            try:
                quiz_count = Quiz.query.filter_by(subject_id=subject_id, user_id=user_id).count()
                quiz_number = quiz_count + 1
            except Exception as e:
                print(f"❌ 퀴즈 개수 조회 오류: {e}")
                # 테이블이 없을 수 있으므로 기본값 사용
                quiz_number = 1
            
            # Gemini API를 사용하여 퀴즈 생성
            api_key = os.getenv('GEMINI_API_KEY')
            if not api_key:
                return jsonify({'error': 'GEMINI_API_KEY not configured'}), 500
            
            genai.configure(api_key=api_key)
            
            # 실제 사용 가능한 모델 목록 조회 (다른 기능과 동일한 방식)
            try:
                available_models = []
                for m in genai.list_models():
                    if 'generateContent' in m.supported_generation_methods:
                        model_name = m.name.replace('models/', '')  # 'models/gemini-pro' -> 'gemini-pro'
                        available_models.append(model_name)
                
                if not available_models:
                    raise Exception("사용 가능한 모델을 찾을 수 없습니다.")
                
                # 모델 우선순위 설정 (gemini-2.5-flash를 최우선으로 설정)
                model_candidates = []
                
                # 1순위: gemini-2.5-flash (결제 계정이므로 최우선)
                for model_name in available_models:
                    if '2.5' in model_name.lower() and 'flash' in model_name.lower() and 'gemma' not in model_name.lower():
                        model_candidates.append(model_name)
                        break  # 첫 번째 2.5-flash만 추가
                
                # 2순위: gemini-1.5-pro (고품질 대안)
                if 'gemini-1.5-pro' in available_models:
                    model_candidates.append('gemini-1.5-pro')
                
                # 3순위: gemini-1.5-flash
                if 'gemini-1.5-flash' in available_models:
                    model_candidates.append('gemini-1.5-flash')
                
                # 4순위: gemini-pro
                if 'gemini-pro' in available_models:
                    model_candidates.append('gemini-pro')
                
                # 나머지 모델 추가 (gemma 제외, 2.5 버전은 이미 추가됨)
                for model_name in available_models:
                    if model_name not in model_candidates and 'gemma' not in model_name.lower() and '2.5' not in model_name.lower():
                        model_candidates.append(model_name)
                
                print(f"📡 퀴즈 생성 모델 후보: {model_candidates}")
                
            except Exception as list_error:
                print(f"⚠️ 모델 목록 조회 실패: {str(list_error)}")
                # 기본 모델 목록 사용 (2.5-flash 우선)
                model_candidates = ['gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro']
            
            # 적응형 프롬프트 구성
            adaptive_instruction = ""
            if previous_weakness:
                adaptive_instruction = f"\n\n**적응형 학습 지시사항:**\n사용자의 이전 취약점 리포트를 참고하여, 다음 약점 영역을 특히 집중적으로 다루는 문제를 생성해주세요:\n{previous_weakness}\n\n이 약점들을 개선할 수 있도록 관련 문제를 포함해주세요."
            
            # 주차 범위 문자열 생성 (연속/비연속 판단)
            week_scope_str = ""
            if len(selected_weeks) == 1:
                week_scope_str = f"Week {selected_weeks[0]}"
            else:
                sorted_weeks = sorted(selected_weeks)
                # 연속 여부 확인
                is_continuous = all(sorted_weeks[i] + 1 == sorted_weeks[i+1] for i in range(len(sorted_weeks)-1))
                if is_continuous:
                    week_scope_str = f"Weeks {sorted_weeks[0]}-{sorted_weeks[-1]}"
                else:
                    week_scope_str = "Week " + ", ".join(map(str, sorted_weeks))
            
            # 문제 유형 설명
            type_descriptions = {
                'multiple_choice': '객관식 (Multiple Choice)',
                'short_answer': '단답형 (Short Answer)',
                'subjective': '주관식 (Subjective/Essay)'
            }
            question_type_str = ', '.join([type_descriptions.get(t, t) for t in question_types])
            
            # 언어 설정
            lang_instruction = "한국어로" if language == 'korean' else "영어로"
            
            # past_exam_context 부분 처리 (f-string 내부에서 백슬래시 사용 불가)
            past_exam_section = ""
            if past_exam_context:
                past_exam_section = f"5. 참고 스타일/예시:\n{past_exam_context}"
            
            prompt = f"""당신은 교육용 퀴즈 생성 전문가입니다. 다음 강의 자료를 기반으로 {lang_instruction} 퀴즈를 생성해주세요.

**강의 자료:**
{combined_text}

**퀴즈 생성 요구사항:**
1. 난이도: {difficulty} ({'쉬움' if difficulty == 'easy' else '보통' if difficulty == 'medium' else '어려움'})
2. 문제 유형: {question_type_str}
3. 문제 개수: {num_questions}개
4. 범위: {week_scope_str}
{past_exam_section}{adaptive_instruction}

**출력 형식 (JSON):**
{{
    "questions": [
        {{
            "question_type": "multiple_choice" | "short_answer" | "subjective",
            "question_text": "문제 내용",
            "options": ["선택지1", "선택지2", "선택지3", "선택지4"],  // 객관식인 경우만
            "correct_answer": "정답",
            "explanation": "상세 설명",
            "key_concept": "핵심 개념/지식 포인트"
        }}
    ]
}}

**중요 지시사항:**
- 반드시 정확히 {num_questions}개의 문제를 생성해야 합니다. 더 많거나 적게 생성하면 안 됩니다.
- 객관식 문제는 4개의 선택지를 제공하세요.
- 각 문제는 강의 자료의 내용을 정확히 반영해야 합니다.
- 정답과 오답 선택지 모두 그럴듯해야 합니다 (객관식의 경우).
- explanation은 왜 정답인지, 왜 오답인지 명확히 설명해야 합니다.
- key_concept는 이 문제가 평가하는 핵심 지식이나 개념을 명시하세요.
- JSON 형식만 출력하고, 다른 설명은 포함하지 마세요.
- "questions" 배열에는 정확히 {num_questions}개의 객체가 있어야 합니다."""
            
            # 여러 모델을 순차적으로 시도 (모델 생성 + API 호출을 하나의 루프에서 처리)
            response = None
            response_text = ""
            selected_model_name = None
            
            print(f"📤 퀴즈 생성 요청 - Subject: {subject_id}, Weeks: {selected_weeks}, Difficulty: {difficulty}")
            
            for model_name in model_candidates:
                try:
                    print(f"📡 퀴즈 생성 모델 시도 중... (모델: {model_name})")
                    test_model = genai.GenerativeModel(model_name)
                    selected_model_name = model_name
                    
                    # 모델 생성 성공 시 즉시 API 호출 시도
                    response = test_model.generate_content(prompt)
                    
                    if response and response.text:
                        response_text = response.text.strip()
                        print(f"✅ 퀴즈 생성 완료 (모델: {selected_model_name})")
                        break  # 성공하면 루프 종료
                    else:
                        print(f"⚠️  {model_name}: 응답이 없음 - 다음 모델 시도...")
                        continue
                        
                except Exception as error:
                    error_msg = str(error)
                    # 404 에러면 다음 모델 시도
                    if '404' in error_msg or 'not found' in error_msg.lower():
                        print(f"⚠️  {model_name}: 모델을 찾을 수 없음 - 다음 모델 시도...")
                        continue
                    # 429 할당량 초과 에러면 다음 모델 시도
                    elif '429' in error_msg or 'quota' in error_msg.lower() or 'exceeded' in error_msg.lower():
                        print(f"⚠️  {model_name}: 할당량 초과 - 다음 모델 시도...")
                        continue
                    # 다른 에러면 재발생
                    else:
                        print(f"⚠️  {model_name}: {error_msg}")
                        if model_name == model_candidates[-1]:  # 마지막 모델이면 에러 발생
                            raise
            
            if response is None or not response_text:
                return jsonify({'error': '사용 가능한 Gemini 모델을 찾을 수 없거나 할당량이 초과되었습니다. 잠시 후 다시 시도해주세요.'}), 500
            
            # JSON 파싱
            # JSON 코드 블록 제거 (```json ... ```)
            if response_text.startswith('```'):
                lines = response_text.split('\n')
                response_text = '\n'.join(lines[1:-1]) if lines[-1].startswith('```') else '\n'.join(lines[1:])
            
            try:
                quiz_data = json.loads(response_text)
            except json.JSONDecodeError as json_err:
                print(f"❌ JSON 파싱 오류: {json_err}")
                print(f"응답 텍스트: {response_text[:500]}...")  # 처음 500자만 출력
                return jsonify({'error': f'Failed to parse quiz data: {str(json_err)}'}), 500
            questions_data = quiz_data.get('questions', [])
            
            # 문제 수 검증 및 조정
            if len(questions_data) != num_questions:
                print(f"⚠️ 요청한 문제 수({num_questions})와 생성된 문제 수({len(questions_data)})가 다릅니다.")
                
                # 문제가 부족한 경우: 에러 반환 (재시도 유도)
                if len(questions_data) < num_questions:
                    error_msg = f'생성된 문제 수({len(questions_data)}개)가 요청한 문제 수({num_questions}개)보다 적습니다. 모델이 정확한 수의 문제를 생성하지 못했습니다.'
                    print(f"❌ {error_msg}")
                    return jsonify({'error': error_msg, 'model': selected_model_name}), 500
                
                # 문제가 더 많은 경우: 처음 N개만 사용
                if len(questions_data) > num_questions:
                    print(f"📝 생성된 문제가 더 많음. 처음 {num_questions}개만 사용합니다.")
                    questions_data = questions_data[:num_questions]
            
            # 퀴즈 저장
            quiz = Quiz(
                subject_id=subject_id,
                user_id=user_id,
                week_numbers=json.dumps(selected_weeks),
                difficulty=difficulty,
                question_types=json.dumps(question_types),
                language=language,
                num_questions=num_questions,
                past_exam_context=past_exam_context,
                quiz_number=quiz_number
            )
            db.session.add(quiz)
            db.session.flush()  # quiz.id를 얻기 위해
            
            # 문제들 저장
            questions = []
            for idx, q_data in enumerate(questions_data, 1):
                question = Question(
                    quiz_id=quiz.id,
                    question_type=q_data.get('question_type', 'multiple_choice'),
                    question_text=q_data.get('question_text', ''),
                    options=json.dumps(q_data.get('options')) if q_data.get('options') else None,
                    correct_answer=q_data.get('correct_answer', ''),
                    explanation=q_data.get('explanation', ''),
                    key_concept=q_data.get('key_concept', ''),
                    order=idx
                )
                db.session.add(question)
                questions.append(question)
            
            db.session.commit()
            
            return jsonify({
                'message': 'Quiz generated successfully',
                'quiz': quiz.to_dict(),
                'questions': [q.to_dict() for q in questions]
            }), 200
            
        except Exception as e:
            db.session.rollback()
            error_message = str(e)
            print(f"❌ 퀴즈 생성 오류: {error_message}")
            import traceback
            traceback.print_exc()
            
            # 데이터베이스 테이블 관련 에러인지 확인
            if 'no such table' in error_message.lower() or 'does not exist' in error_message.lower():
                error_message = '데이터베이스 테이블이 생성되지 않았습니다. 백엔드 서버를 재시작해주세요.'
            
            return jsonify({
                'error': error_message,
                'details': '서버 콘솔에서 상세 에러 메시지를 확인하세요.'
            }), 500
    
    @app.route('/api/quiz/<int:quiz_id>', methods=['GET'])
    def get_quiz(quiz_id):
        """퀴즈 상세 조회 (문제 및 답안 포함)"""
        try:
            quiz = Quiz.query.get(quiz_id)
            if not quiz:
                return jsonify({'error': 'Quiz not found'}), 404
            
            # 문제 목록 조회 (순서대로)
            questions = Question.query.filter_by(quiz_id=quiz_id).order_by(Question.order).all()
            
            # 사용자 답안 조회 (있는 경우)
            user_responses = {r.question_id: r.to_dict() for r in UserResponse.query.filter_by(quiz_id=quiz_id).all()}
            
            # 리포트 조회 (있는 경우)
            report = QuizReport.query.filter_by(quiz_id=quiz_id).first()
            
            return jsonify({
                'quiz': quiz.to_dict(),
                'questions': [q.to_dict() for q in questions],
                'user_responses': user_responses,
                'report': report.to_dict() if report else None
            }), 200
            
        except Exception as e:
            print(f"❌ 퀴즈 조회 오류: {e}")
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/quiz/<int:quiz_id>/submit', methods=['POST'])
    def submit_quiz(quiz_id):
        """퀴즈 제출 및 채점"""
        try:
            data = request.get_json()
            user_id = data.get('user_id')
            answers = data.get('answers', [])  # [{question_id: 1, answer: "..."}, ...]
            
            if not user_id:
                return jsonify({'error': 'user_id is required'}), 400
            
            quiz = Quiz.query.get(quiz_id)
            if not quiz:
                return jsonify({'error': 'Quiz not found'}), 404
            
            if quiz.user_id != user_id:
                return jsonify({'error': 'Unauthorized'}), 403
            
            # 이미 제출된 경우 기존 리포트와 답안 삭제 (재시도 허용)
            # 이전 리포트는 비교 분석에 사용하기 위해 삭제 전에 저장
            existing_report = QuizReport.query.filter_by(quiz_id=quiz_id).first()
            previous_report_for_comparison = None
            previous_score_for_comparison = None
            
            if existing_report:
                # 이전 리포트 저장 (비교 분석용)
                previous_report_for_comparison = existing_report.ai_report
                previous_score_for_comparison = existing_report.score
                # 기존 답안 삭제 (cascade가 설정되어 있지 않을 수 있으므로 명시적으로 삭제)
                try:
                    UserResponse.query.filter_by(quiz_id=quiz_id).delete(synchronize_session=False)
                    db.session.delete(existing_report)
                    # 여기서는 commit하지 않고 나중에 한 번에 commit
                    print(f"🔄 퀴즈 {quiz_id} 재시도: 기존 리포트 및 답안 삭제 예정 (이전 점수: {previous_score_for_comparison})")
                except Exception as delete_error:
                    db.session.rollback()
                    print(f"⚠️ 기존 리포트 삭제 중 오류: {delete_error}")
                    # 삭제 실패해도 계속 진행 (이미 삭제되었을 수도 있음)
            
            # 문제 조회
            questions = Question.query.filter_by(quiz_id=quiz_id).order_by(Question.order).all()
            question_dict = {q.id: q for q in questions}
            
            # 답안 저장 및 채점
            score = 0
            total = len(questions)
            results = []
            user_responses_list = []
            
            for answer_data in answers:
                question_id = answer_data.get('question_id')
                user_answer = answer_data.get('answer', '').strip()
                
                if question_id not in question_dict:
                    continue
                
                question = question_dict[question_id]
                correct_answer = question.correct_answer.strip()
                
                # 정답 판정 (대소문자 무시, 공백 무시)
                is_correct = user_answer.upper().replace(' ', '') == correct_answer.upper().replace(' ', '')
                
                if is_correct:
                    score += 1
                
                # UserResponse 저장
                user_response = UserResponse(
                    quiz_id=quiz_id,
                    question_id=question_id,
                    user_answer=user_answer,
                    is_correct=is_correct
                )
                db.session.add(user_response)
                user_responses_list.append(user_response)
                
                results.append({
                    'question_id': question_id,
                    'is_correct': is_correct,
                    'user_answer': user_answer,
                    'correct_answer': correct_answer,
                    'explanation': question.explanation,
                    'key_concept': question.key_concept
                })
            
            # AI 리포트 생성
            api_key = os.getenv('GEMINI_API_KEY')
            if not api_key:
                return jsonify({'error': 'GEMINI_API_KEY not configured'}), 500
            
            genai.configure(api_key=api_key)
            
            # 실제 사용 가능한 모델 목록 조회 (다른 기능과 동일한 방식)
            try:
                available_models = []
                for m in genai.list_models():
                    if 'generateContent' in m.supported_generation_methods:
                        model_name = m.name.replace('models/', '')  # 'models/gemini-pro' -> 'gemini-pro'
                        available_models.append(model_name)
                
                if not available_models:
                    raise Exception("사용 가능한 모델을 찾을 수 없습니다.")
                
                # 모델 우선순위 설정 (gemini-2.5-flash를 최우선으로 설정)
                model_candidates = []
                
                # 1순위: gemini-2.5-flash (결제 계정이므로 최우선)
                for model_name in available_models:
                    if '2.5' in model_name.lower() and 'flash' in model_name.lower() and 'gemma' not in model_name.lower():
                        model_candidates.append(model_name)
                        break  # 첫 번째 2.5-flash만 추가
                
                # 2순위: gemini-1.5-pro (고품질 대안)
                if 'gemini-1.5-pro' in available_models:
                    model_candidates.append('gemini-1.5-pro')
                
                # 3순위: gemini-1.5-flash
                if 'gemini-1.5-flash' in available_models:
                    model_candidates.append('gemini-1.5-flash')
                
                # 4순위: gemini-pro
                if 'gemini-pro' in available_models:
                    model_candidates.append('gemini-pro')
                
                # 나머지 모델 추가 (gemma 제외, 2.5 버전은 이미 추가됨)
                for model_name in available_models:
                    if model_name not in model_candidates and 'gemma' not in model_name.lower() and '2.5' not in model_name.lower():
                        model_candidates.append(model_name)
                
                print(f"📡 리포트 생성 모델 후보: {model_candidates}")
                
            except Exception as list_error:
                print(f"⚠️ 모델 목록 조회 실패: {str(list_error)}")
                # 기본 모델 목록 사용 (2.5-flash 우선)
                model_candidates = ['gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro']
            
            # 리포트 프롬프트
            wrong_answers = [r for r in results if not r['is_correct']]
            correct_answers = [r for r in results if r['is_correct']]
            
            # 비교 분석 섹션 구성 (재시도인 경우 이전 리포트 사용)
            comparison_section = ""
            if previous_report_for_comparison and previous_score_for_comparison is not None:
                score_diff = score - previous_score_for_comparison
                percentage_diff = round((score/total*100) - (previous_score_for_comparison/total*100), 1) if total > 0 else 0
                comparison_section = f"""

**이전 시도와의 비교:**
- 이전 점수: {previous_score_for_comparison}/{total} (정답률: {round(previous_score_for_comparison/total*100, 1)}%)
- 현재 점수: {score}/{total} (정답률: {round(score/total*100, 1)}%)
- 점수 변화: {score_diff:+d}점 (정답률 변화: {percentage_diff:+.1f}%)
- 이전 리포트 요약: {previous_report_for_comparison[:300]}...

**중요:** 이전 시도 대비 성과 변화와 발전 정도를 구체적으로 분석하고, 개선된 부분과 여전히 부족한 부분을 명확히 구분하여 작성해주세요."""
            
            report_prompt = f"""당신은 학습 분석 전문가입니다. 다음 퀴즈 결과를 분석하여 사용자의 성과 리포트를 작성해주세요.

**성적: {score}/{total} (정답률: {round(score/total*100, 1)}%)**

**정답한 문제 ({len(correct_answers)}개):**
{chr(10).join([f"- {r['key_concept']}: {r['question_id']}번 문제" for r in correct_answers[:5]])}

**오답한 문제 ({len(wrong_answers)}개):**
{chr(10).join([f"- {r['question_id']}번: {r['key_concept']} - 사용자 답: {r['user_answer']}, 정답: {r['correct_answer']}" for r in wrong_answers])}{comparison_section}

**리포트 작성 규칙 (반드시 정확히 따르세요):**

1. **마크다운 형식 규칙:**
   - 최상위 섹션 제목: 정확히 "# " (해시 1개 + 공백)로 시작
   - 하위 섹션 제목: 정확히 "## " (해시 2개 + 공백)로 시작
   - 해시 기호는 제목 앞에만 사용하고, 다른 곳에는 사용하지 마세요
   - 제목에 해시 기호를 중복으로 사용하지 마세요 (예: "### ##" 같은 형식 금지)

2. **섹션 1: "1. 전반적인 평가"**
   - 제목: 정확히 "# 1. 전반적인 평가" (해시 1개 + 공백 + 숫자 + 점 + 공백 + 제목)
   - 내용: 2-3문장으로 간결하고 구체적인 평가 작성
   - 형식 예시:
# 1. 전반적인 평가
[여기에 평가 내용 작성]

3. **섹션 2: "2. 결과 분석 리포트"**
   - 제목: 정확히 "# 2. 결과 분석 리포트" (해시 1개 + 공백 + 숫자 + 점 + 공백 + 제목)
   - 하위 항목 3개를 아래 형식으로 작성:
   
   **하위 항목 (1):**
   - 제목: 정확히 "## (1) 잘한 부분 (강점)" (해시 2개 + 공백 + 괄호 숫자 + 공백 + 제목)
   - 내용: 구체적인 강점 분석
   
   **하위 항목 (2):**
   - 제목: 정확히 "## (2) 부족한 부분 (약점)" (해시 2개 + 공백 + 괄호 숫자 + 공백 + 제목)
   - 중요: 모든 문제를 맞춘 경우에도 반드시 포함. "이 부분은 학습이 잘 되었습니다"와 같은 긍정적 뉘앙스로 작성
   - 내용: 구체적인 약점 분석 또는 긍정적 피드백
   
   **하위 항목 (3):**
   - 제목: 정확히 "## (3) 구체적인 학습 권장사항" (해시 2개 + 공백 + 괄호 숫자 + 공백 + 제목)
   - 내용: 실용적이고 구체적인 학습 권장사항
   
   - 형식 예시:
# 2. 결과 분석 리포트

## (1) 잘한 부분 (강점)
[내용]

## (2) 부족한 부분 (약점)
[내용]

## (3) 구체적인 학습 권장사항
[내용]

4. **섹션 3: "3. 마무리"**
   - 제목: 정확히 "# 3. 마무리" (해시 1개 + 공백 + 숫자 + 점 + 공백 + 제목)
   - 내용: 격려하는 마무리 문구
   - 형식 예시:
# 3. 마무리
[마무리 내용]

**최종 확인 사항:**
- 반드시 위 순서대로 작성: 1. 전반적인 평가 → 2. 결과 분석 리포트 → 3. 마무리
- 해시 기호는 정확히 "# " 또는 "## " 형식으로만 사용 (중복 금지)
- 제목 앞에 해시 기호 외 다른 기호 사용 금지 (예: "### ##" 같은 형식 절대 금지)
- 모든 섹션이 빠짐없이 포함되어야 함
- 약점 섹션은 모든 문제를 맞춰도 반드시 포함
- 이전 시도가 있는 경우 발전 정도를 구체적으로 분석
- 한국어로 친절하고 격려하는 톤으로 작성
- 평가는 구체적이고 명확하게 작성 (애매한 표현 지양)"""
            
            # 여러 모델을 순차적으로 시도 (모델 생성 + API 호출을 하나의 루프에서 처리)
            report_response = None
            ai_report = "리포트 생성 실패"
            selected_model_name = None
            
            for model_name in model_candidates:
                try:
                    print(f"📡 리포트 생성 모델 시도 중... (모델: {model_name})")
                    test_model = genai.GenerativeModel(model_name)
                    selected_model_name = model_name
                    
                    # 모델 생성 성공 시 즉시 API 호출 시도
                    report_response = test_model.generate_content(report_prompt)
                    
                    if report_response and report_response.text:
                        ai_report = report_response.text
                        print(f"✅ 리포트 생성 완료 (모델: {selected_model_name})")
                        break  # 성공하면 루프 종료
                    else:
                        print(f"⚠️  {model_name}: 응답이 없음 - 다음 모델 시도...")
                        continue
                        
                except Exception as error:
                    error_msg = str(error)
                    # 404 에러면 다음 모델 시도
                    if '404' in error_msg or 'not found' in error_msg.lower():
                        print(f"⚠️  {model_name}: 모델을 찾을 수 없음 - 다음 모델 시도...")
                        continue
                    # 429 할당량 초과 에러면 다음 모델 시도
                    elif '429' in error_msg or 'quota' in error_msg.lower() or 'exceeded' in error_msg.lower():
                        print(f"⚠️  {model_name}: 할당량 초과 - 다음 모델 시도...")
                        continue
                    # 다른 에러면 재발생
                    else:
                        print(f"⚠️  {model_name}: {error_msg}")
                        if model_name == model_candidates[-1]:  # 마지막 모델이면 에러 발생
                            raise
            
            if report_response is None or ai_report == "리포트 생성 실패":
                return jsonify({'error': '사용 가능한 Gemini 모델을 찾을 수 없거나 할당량이 초과되었습니다. 잠시 후 다시 시도해주세요.'}), 500
            
            # QuizReport 저장
            quiz_report = QuizReport(
                quiz_id=quiz_id,
                score=score,
                total=total,
                ai_report=ai_report
            )
            db.session.add(quiz_report)
            db.session.commit()
            
            return jsonify({
                'message': 'Quiz submitted successfully',
                'score': score,
                'total': total,
                'results': results,
                'report': quiz_report.to_dict()
            }), 200
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ 퀴즈 제출 오류: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/subjects/<int:subject_id>/quizzes', methods=['GET'])
    def get_quiz_history(subject_id):
        """과목별 퀴즈 히스토리 조회"""
        try:
            user_id = request.args.get('user_id', type=int)
            if not user_id:
                return jsonify({'error': 'user_id is required'}), 400
            
            # 과목 확인
            subject = Subject.query.get(subject_id)
            if not subject:
                return jsonify({'error': 'Subject not found'}), 404
            
            # 퀴즈 목록 조회 (최신순)
            quizzes = Quiz.query.filter_by(
                subject_id=subject_id,
                user_id=user_id
            ).order_by(Quiz.created_at.desc()).all()
            
            # 각 퀴즈의 리포트 포함
            quiz_list = []
            for quiz in quizzes:
                quiz_dict = quiz.to_dict()
                report = QuizReport.query.filter_by(quiz_id=quiz.id).first()
                quiz_dict['report'] = report.to_dict() if report else None
                quiz_list.append(quiz_dict)
            
            return jsonify({
                'quizzes': quiz_list
            }), 200
            
        except Exception as e:
            print(f"❌ 퀴즈 히스토리 조회 오류: {e}")
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/quiz/<int:quiz_id>', methods=['DELETE'])
    def delete_quiz(quiz_id):
        """퀴즈 삭제"""
        try:
            user_id = request.args.get('user_id', type=int)
            if not user_id:
                return jsonify({'error': 'user_id is required'}), 400
            
            quiz = Quiz.query.get(quiz_id)
            if not quiz:
                return jsonify({'error': 'Quiz not found'}), 404
            
            if quiz.user_id != user_id:
                return jsonify({'error': 'Unauthorized'}), 403
            
            # 관련 데이터 삭제 (cascade로 자동 삭제되지만 명시적으로)
            UserResponse.query.filter_by(quiz_id=quiz_id).delete()
            Question.query.filter_by(quiz_id=quiz_id).delete()
            QuizReport.query.filter_by(quiz_id=quiz_id).delete()
            db.session.delete(quiz)
            db.session.commit()
            
            return jsonify({
                'message': 'Quiz deleted successfully'
            }), 200
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ 퀴즈 삭제 오류: {e}")
            return jsonify({'error': str(e)}), 500
    
    # ==================== D-Day Exam Planner API ====================
    
    @app.route('/api/subjects/<int:subject_id>/exam-date', methods=['PUT'])
    def set_exam_date(subject_id):
        """시험 날짜 설정"""
        try:
            data = request.get_json()
            exam_date_str = data.get('exam_date')
            exam_type = data.get('exam_type')  # 'midterm' | 'final'
            exam_week_start = data.get('exam_week_start')
            exam_week_end = data.get('exam_week_end')
            
            # 정수로 변환 (None이 아닌 경우에만)
            if exam_week_start is not None:
                exam_week_start = int(exam_week_start)
            if exam_week_end is not None:
                exam_week_end = int(exam_week_end)
            
            if not exam_date_str:
                return jsonify({'error': 'exam_date is required'}), 400
            
            subject = Subject.query.get(subject_id)
            if not subject:
                return jsonify({'error': 'Subject not found'}), 404
            
            # 날짜 문자열을 DateTime으로 변환 (UTC 기준)
            exam_date_str_clean = exam_date_str.replace('Z', '+00:00') if 'Z' in exam_date_str else exam_date_str
            exam_date = datetime.fromisoformat(exam_date_str_clean)
            # UTC로 변환 (naive datetime인 경우)
            if exam_date.tzinfo is None:
                exam_date = exam_date.replace(tzinfo=None)
            else:
                exam_date = exam_date.replace(tzinfo=None)
            
            # 기존 날짜와 비교 (날짜만 비교, 시간 제외)
            old_exam_date = subject.exam_date.replace(tzinfo=None) if subject.exam_date and subject.exam_date.tzinfo else subject.exam_date
            old_exam_date_only = old_exam_date.date() if old_exam_date else None
            new_exam_date_only = exam_date.date() if exam_date else None
            
            # 시험 정보가 변경되면 기존 학습 계획 삭제
            if (old_exam_date_only != new_exam_date_only or 
                subject.exam_type != exam_type or 
                subject.exam_week_start != exam_week_start or 
                subject.exam_week_end != exam_week_end):
                subject.study_plan = None  # 학습 계획 초기화
                print(f"📝 시험 정보 변경 감지 - 학습 계획 초기화")
            
            subject.exam_date = exam_date
            subject.exam_type = exam_type
            subject.exam_week_start = exam_week_start
            subject.exam_week_end = exam_week_end
            subject.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            print(f"✅ 시험 날짜 업데이트 완료: {exam_date}, 유형: {exam_type}, 범위: {exam_week_start}~{exam_week_end}주차")
            
            return jsonify({
                'message': 'Exam date set successfully',
                'subject': subject.to_dict()
            }), 200
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ 시험 날짜 설정 오류: {e}")
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/subjects/<int:subject_id>/exam-date', methods=['DELETE'])
    def delete_exam_date(subject_id):
        """시험 날짜 삭제"""
        try:
            subject = Subject.query.get(subject_id)
            if not subject:
                return jsonify({'error': 'Subject not found'}), 404
            
            subject.exam_date = None
            subject.study_plan = None  # 학습 계획도 함께 삭제
            subject.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            return jsonify({
                'message': 'Exam date deleted successfully',
                'subject': subject.to_dict()
            }), 200
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ 시험 날짜 삭제 오류: {e}")
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/subjects/<int:subject_id>/notification', methods=['PUT'])
    def toggle_notification(subject_id):
        """학습 알림 토글"""
        try:
            data = request.get_json()
            is_notification_on = data.get('is_notification_on', True)
            
            subject = Subject.query.get(subject_id)
            if not subject:
                return jsonify({'error': 'Subject not found'}), 404
            
            subject.is_notification_on = is_notification_on
            subject.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            return jsonify({
                'message': 'Notification setting updated',
                'subject': subject.to_dict()
            }), 200
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ 알림 설정 오류: {e}")
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/subjects/<int:subject_id>/study-plan', methods=['POST'])
    def generate_study_plan(subject_id):
        """AI 학습 계획 생성"""
        try:
            user_id = request.args.get('user_id', type=int)
            if not user_id:
                return jsonify({'error': 'user_id is required'}), 400
            
            subject = Subject.query.get(subject_id)
            if not subject:
                return jsonify({'error': 'Subject not found'}), 404
            
            if not subject.exam_date:
                return jsonify({'error': 'Exam date must be set first'}), 400
            
            user = User.query.get(user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            # 오늘 날짜와 시험 날짜 계산 (한국 시간 기준, UTC+9)
            from datetime import timezone, timedelta
            korea_tz = timezone(timedelta(hours=9))
            today = datetime.now(korea_tz).date()
            exam_date = subject.exam_date.date() if isinstance(subject.exam_date, datetime) else subject.exam_date
            
            if exam_date <= today:
                return jsonify({'error': 'Exam date must be in the future'}), 400
            
            days_until_exam = (exam_date - today).days
            
            # 강의계획서 요약 수집 (시험 범위에 맞춰 필터링)
            syllabus_summary = ""
            exam_range_info = ""
            if subject.syllabus_analysis:
                try:
                    analysis = json.loads(subject.syllabus_analysis) if isinstance(subject.syllabus_analysis, str) else subject.syllabus_analysis
                    if isinstance(analysis, dict) and 'weekly_schedule' in analysis:
                        weekly_schedule = analysis.get('weekly_schedule', [])
                        
                        # 시험 범위 필터링
                        if subject.exam_week_start and subject.exam_week_end:
                            filtered_weeks = [
                                week for week in weekly_schedule
                                if subject.exam_week_start <= week.get('week_no', 0) <= subject.exam_week_end
                            ]
                            exam_range_info = f"시험 범위: {subject.exam_week_start}주차 ~ {subject.exam_week_end}주차"
                            syllabus_summary = "\n".join([f"Week {week.get('week_no', i+1)}: {week.get('topic', '')}" for i, week in enumerate(filtered_weeks)])
                        else:
                            weekly_topics = [week.get('topic', '') for week in weekly_schedule]
                            syllabus_summary = "\n".join([f"Week {i+1}: {topic}" for i, topic in enumerate(weekly_topics)])
                except:
                    pass
            
            if not syllabus_summary and subject.syllabus_text:
                # syllabus_text에서 첫 2000자만 사용
                syllabus_summary = subject.syllabus_text[:2000]
            
            # 시험 유형 정보
            exam_type_info = ""
            if subject.exam_type:
                exam_type_info = "중간고사" if subject.exam_type == 'midterm' else "기말고사"
            
            # 사용자 학습 스타일 수집
            learning_style = {
                'exam_style': user.exam_style or '미리미리',
                'learning_depth': user.learning_depth or '원리파악',
                'material_preference': user.material_preference or '텍스트',
                'practice_style': user.practice_style or '이론중심',
                'ai_persona': user.ai_persona or '격려형'
            }
            
            # 학습 스타일 설명 생성
            style_description = f"""
- 시험 준비 방식: {learning_style['exam_style']}
- 이해 깊이: {learning_style['learning_depth']}
- 자료 선호: {learning_style['material_preference']}
- 실전 선호: {learning_style['practice_style']}
- AI 성격: {learning_style['ai_persona']}
"""
            
            # Gemini 프롬프트 생성
            prompt = f"""당신은 학습 계획 전문가입니다. 다음 정보를 바탕으로 {days_until_exam}일간의 일일 학습 계획을 생성해주세요.

**과목 정보:**
- 과목명: {subject.name}
- 시험 유형: {exam_type_info if exam_type_info else "시험"}
- 시험 날짜: {exam_date.isoformat()}
- 오늘 날짜: {today.isoformat()}
- 남은 일수: {days_until_exam}일
{exam_range_info if exam_range_info else ""}

**강의계획서 요약 (시험 범위):**
{syllabus_summary if syllabus_summary else "강의계획서 정보가 없습니다."}

**사용자 학습 스타일:**
{style_description}

**요구사항:**
1. 오늘({today.isoformat()})부터 시험일({exam_date.isoformat()})까지 매일의 학습 계획을 생성하세요.
2. 각 날짜별로 구체적이고 실행 가능한 학습 계획을 작성하세요:
   - **학습 범위**: 어느 주차, 어느 단원, 어느 개념부터 어디까지 학습할지 명시
   - **학습 방법**: 이론 정리, 예제 풀이, 개념 이해, 복습 등 구체적인 방법 제시
   - **퀴즈 활용**: 퀴즈를 언제, 어떻게 활용할지 (예: "Week 1-2 개념 퀴즈 생성 후 풀이", "이전에 틀린 문제 재풀이", "중요 개념 확인 퀴즈")
   - **학습 자료**: 어떤 자료를 사용할지 (교재, 강의노트, PDF 등)
3. 사용자의 학습 스타일에 맞춰 계획을 조정하세요:
   - {learning_style['material_preference']} 선호: 해당 자료 유형을 활용한 학습 제안
   - {learning_style['learning_depth']}: 이해 깊이에 맞는 학습 방법 제안
   - {learning_style['practice_style']}: 실전 선호에 맞는 문제/이론 비율 조정
4. 시험일이 가까워질수록 복습과 문제 풀이 비중을 높이세요.
5. 주말에는 더 많은 시간을 할당하고, 주중에는 집중적인 학습을 제안하세요.
6. 각 날짜의 학습 계획은 2-3줄로 구체적으로 작성하세요.

**출력 형식:**
반드시 다음 JSON 형식으로 출력하세요 (다른 텍스트 없이 JSON만):
{{
  "plan": {{
    "YYYY-MM-DD": "구체적인 학습 계획 (학습 범위, 방법, 퀴즈 활용 포함)",
    "YYYY-MM-DD": "구체적인 학습 계획",
    ...
  }}
}}

예시:
{{
  "plan": {{
    "2024-12-15": "Week 1-2 범위 복습: 선형대수 기초 개념(벡터, 행렬)부터 중간 개념(행렬식, 역행렬)까지 이론 정리. Week 1-2 개념 확인 퀴즈 생성 후 풀이하며 약점 파악.",
    "2024-12-16": "Week 3-4 범위 학습: 확률론 기본 개념(확률의 정의, 조건부 확률)부터 베이즈 정리까지 교재로 학습. 각 개념별 예제 문제 5개씩 풀이 후 이해도 확인.",
    "2024-12-17": "Week 1-4 종합 복습: 지난 3일간 학습한 내용 전체 복습. 종합 퀴즈 생성하여 실전 감각 익히기. 틀린 문제는 오답노트 정리.",
    ...
  }}
}}

중요: 
- 각 날짜의 계획은 학습 범위(어디부터 어디까지), 학습 방법, 퀴즈 활용 방법을 모두 포함해야 합니다.
- 반드시 JSON 형식만 출력하고, 다른 설명이나 텍스트는 포함하지 마세요."""

            # Gemini API 호출
            try:
                api_key = os.getenv('GEMINI_API_KEY')
                if not api_key:
                    return jsonify({'error': 'GEMINI_API_KEY not configured'}), 500
                
                genai.configure(api_key=api_key)
                
                # 모델 선택 (gemini-2.5-flash 우선)
                model_candidates = ['gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro']
                model = None
                
                for model_name in model_candidates:
                    try:
                        model = genai.GenerativeModel(model_name)
                        break
                    except:
                        continue
                
                if not model:
                    return jsonify({'error': 'No available Gemini model'}), 500
                
                response = model.generate_content(prompt)
                
                if not response or not response.text:
                    return jsonify({'error': 'Failed to generate study plan'}), 500
                
                # JSON 파싱
                response_text = response.text.strip()
                # JSON 코드 블록 제거 (```json ... ```)
                if response_text.startswith('```'):
                    response_text = response_text.split('```')[1]
                    if response_text.startswith('json'):
                        response_text = response_text[4:]
                    response_text = response_text.strip()
                
                plan_data = json.loads(response_text)
                
                # 학습 계획 저장
                subject.study_plan = json.dumps(plan_data, ensure_ascii=False)
                subject.updated_at = datetime.utcnow()
                db.session.commit()
                
                return jsonify({
                    'message': 'Study plan generated successfully',
                    'study_plan': plan_data
                }), 200
                
            except json.JSONDecodeError as e:
                print(f"❌ JSON 파싱 오류: {e}")
                print(f"응답 텍스트: {response.text if 'response' in locals() else 'N/A'}")
                return jsonify({'error': 'Failed to parse AI response as JSON'}), 500
            except Exception as e:
                print(f"❌ 학습 계획 생성 오류: {e}")
                return jsonify({'error': str(e)}), 500
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ 학습 계획 생성 오류: {e}")
            return jsonify({'error': str(e)}), 500
    
    return app


if __name__ == '__main__':
    app = create_app()
    
    # 개발 서버 실행
    print("Flask 서버를 시작합니다...")
    print("서버 주소: http://127.0.0.1:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)

