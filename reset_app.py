#!/usr/bin/env python3
"""
프로젝트 초기화 유틸리티 스크립트
데이터베이스와 업로드된 파일들을 삭제하여 깨끗한 상태로 만듭니다.
모든 테이블을 Drop하고 새로 Create합니다.
"""

import os
import shutil
import sys
from pathlib import Path

# backend 디렉토리를 Python 경로에 추가
script_dir = Path(__file__).parent.absolute()
backend_dir = script_dir / 'backend'
sys.path.insert(0, str(backend_dir))

from flask import Flask
from sqlalchemy import inspect, text
from models import db, User, Subject, Week, Material, LearningPDF, ChatHistory, ConceptContent, Quiz, Question, UserResponse, QuizResult, QuizReport

def reset_database(backend_dir):
    """데이터베이스의 모든 테이블을 Drop하고 새로 Create합니다."""
    
    # instance 디렉토리 생성
    instance_dir = backend_dir / 'instance'
    instance_dir.mkdir(parents=True, exist_ok=True)
    
    # Flask 앱 생성 및 데이터베이스 초기화
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{backend_dir}/instance/app.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    db.init_app(app)
    
    with app.app_context():
        # 데이터베이스 파일이 존재하는지 확인
        db_path = backend_dir / 'instance' / 'app.db'
        if not db_path.exists():
            print(f"ℹ️  데이터베이스 파일이 없습니다: {db_path}")
            print("   새 데이터베이스를 생성합니다...")
            db.create_all()
            print("✅ 데이터베이스 테이블 생성 완료")
            return
        
        # Inspector를 사용하여 모든 테이블 확인
        inspector = inspect(db.engine)
        existing_tables = inspector.get_table_names()
        
        if not existing_tables:
            print("ℹ️  데이터베이스에 테이블이 없습니다.")
            db.create_all()
            print("✅ 데이터베이스 테이블 생성 완료")
            return
        
        print(f"📋 발견된 테이블: {', '.join(existing_tables)}")
        print("\n🗑️  테이블 삭제 중...")
        
        # 외래 키 제약 조건을 고려하여 삭제 순서 결정
        # 자식 테이블부터 부모 테이블 순서로 삭제
        # SQLite는 외래 키 제약 조건이 기본적으로 비활성화되어 있지만, 안전을 위해 순서대로 삭제
        
        # 삭제 순서: 자식 테이블 -> 부모 테이블
        drop_order = [
            'user_responses',      # questions, quizzes 참조
            'quiz_reports',        # quizzes 참조
            'questions',           # quizzes 참조
            'quizzes',            # subjects, users 참조
            'quiz_results',        # users, subjects, learning_pdfs 참조
            'chat_history',       # subjects, learning_pdfs 참조
            'concept_contents',   # weeks 참조
            'materials',          # weeks 참조
            'learning_pdfs',      # subjects 참조
            'weeks',              # subjects 참조
            'subjects',           # users 참조
            'users',              # 최상위 부모
        ]
        
        # 실제 존재하는 테이블만 삭제
        for table_name in drop_order:
            if table_name in existing_tables:
                try:
                    # SQLite에서 테이블 삭제
                    db.session.execute(text(f'DROP TABLE IF EXISTS {table_name}'))
                    db.session.commit()
                    print(f"   ✅ {table_name} 테이블 삭제 완료")
                except Exception as e:
                    print(f"   ⚠️  {table_name} 테이블 삭제 실패: {e}")
                    db.session.rollback()
        
        # 나머지 테이블도 삭제 (drop_order에 없는 경우)
        for table_name in existing_tables:
            if table_name not in drop_order:
                try:
                    db.session.execute(text(f'DROP TABLE IF EXISTS {table_name}'))
                    db.session.commit()
                    print(f"   ✅ {table_name} 테이블 삭제 완료")
                except Exception as e:
                    print(f"   ⚠️  {table_name} 테이블 삭제 실패: {e}")
                    db.session.rollback()
        
        print("\n🔨 새 테이블 생성 중...")
        # 모든 테이블 재생성
        db.create_all()
        print("✅ 모든 테이블 생성 완료")


def reset_app():
    """프로젝트를 초기 상태로 리셋합니다."""
    
    # 스크립트가 있는 디렉토리 (프로젝트 루트)
    script_dir = Path(__file__).parent.absolute()
    backend_dir = script_dir / 'backend'
    
    # 1. 데이터베이스 테이블 리셋
    print("="*60)
    print("데이터베이스 리셋 중...")
    print("="*60)
    try:
        reset_database(backend_dir)
    except Exception as e:
        print(f"⚠️  데이터베이스 리셋 중 오류 발생: {e}")
        print("   데이터베이스 파일을 직접 삭제합니다...")
        db_path = backend_dir / 'instance' / 'app.db'
        db_backup_path = backend_dir / 'instance' / 'app.db.backup'
        
        if db_path.exists():
            try:
                db_path.unlink()
                print(f"✅ 데이터베이스 파일 삭제: {db_path}")
            except Exception as e2:
                print(f"⚠️  데이터베이스 파일 삭제 실패: {e2}")
        
        if db_backup_path.exists():
            try:
                db_backup_path.unlink()
                print(f"✅ 데이터베이스 백업 파일 삭제: {db_backup_path}")
            except Exception as e2:
                print(f"⚠️  백업 파일 삭제 실패: {e2}")
    
    # 2. 업로드 디렉토리 내부 파일 삭제 (디렉토리는 유지)
    uploads_dir = backend_dir / 'uploads'
    
    if uploads_dir.exists():
        # 업로드 디렉토리 내의 모든 서브디렉토리 확인
        subdirs = ['syllabus', 'learning_pdfs', 'materials']
        
        for subdir_name in subdirs:
            subdir_path = uploads_dir / subdir_name
            if subdir_path.exists() and subdir_path.is_dir():
                try:
                    # 디렉토리 내의 모든 파일 삭제
                    deleted_count = 0
                    for file_path in subdir_path.iterdir():
                        if file_path.is_file():
                            file_path.unlink()
                            deleted_count += 1
                        elif file_path.is_dir():
                            # 중첩된 디렉토리도 삭제
                            shutil.rmtree(file_path)
                            deleted_count += 1
                    
                    if deleted_count > 0:
                        print(f"✅ {subdir_name}/ 디렉토리에서 {deleted_count}개 파일 삭제")
                    else:
                        print(f"ℹ️  {subdir_name}/ 디렉토리가 비어있습니다")
                except Exception as e:
                    print(f"⚠️  {subdir_name}/ 디렉토리 정리 실패: {e}")
            else:
                print(f"ℹ️  {subdir_name}/ 디렉토리가 없습니다")
    else:
        print(f"ℹ️  업로드 디렉토리가 없습니다: {uploads_dir}")
    
    # 3. vector_db 디렉토리 정리 (선택사항)
    vector_db_dir = backend_dir / 'vector_db'
    if vector_db_dir.exists():
        try:
            # vector_db 디렉토리 내의 모든 파일/디렉토리 삭제
            deleted_count = 0
            for item in vector_db_dir.iterdir():
                if item.is_file():
                    item.unlink()
                    deleted_count += 1
                elif item.is_dir():
                    shutil.rmtree(item)
                    deleted_count += 1
            
            if deleted_count > 0:
                print(f"✅ vector_db/ 디렉토리에서 {deleted_count}개 항목 삭제")
            else:
                print(f"ℹ️  vector_db/ 디렉토리가 비어있습니다")
        except Exception as e:
            print(f"⚠️  vector_db/ 디렉토리 정리 실패: {e}")
    
    print("\n" + "="*60)
    print("✅ System Reset Complete: Database and Uploads cleared.")
    print("="*60)
    print("\n다음 단계:")
    print("1. 백엔드 서버를 재시작하세요 (데이터베이스는 이미 재생성되었습니다).")
    print("2. 프론트엔드를 실행하여 새로운 사용자로 시작할 수 있습니다.")


if __name__ == '__main__':
    # 안전 확인
    print("⚠️  이 스크립트는 다음을 수행합니다:")
    print("   - 데이터베이스의 모든 테이블을 Drop하고 새로 Create")
    print("   - backend/uploads/ 내의 모든 파일 삭제")
    print("   - backend/vector_db/ 내의 모든 파일 삭제")
    print("\n소스 코드나 설정 파일은 삭제되지 않습니다.")
    
    response = input("\n계속하시겠습니까? (yes/no): ").strip().lower()
    
    if response in ['yes', 'y']:
        print("\n리셋을 시작합니다...\n")
        reset_app()
    else:
        print("❌ 취소되었습니다.")

