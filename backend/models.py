"""
데이터베이스 모델 정의
SQLAlchemy를 사용하여 User, Subject, QuizResult 테이블을 정의합니다.
"""

from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class User(db.Model):
    """사용자 테이블
    
    Attributes:
        id: 사용자 고유 ID (Primary Key)
        username: 사용자명
        login_id: 로그인 아이디 (unique, 필수)
        password: 비밀번호 해시 (필수)
        email: 이메일 주소 (unique)
        school: 학교명 (필수)
        major: 학과 (필수)
        grade: 학년 (필수)
        social_type: 소셜 로그인 타입 (None, 'kakao', 'google')
        social_id: 소셜 로그인 ID
        exam_style: 시험 준비 방식 (미리미리 vs 벼락치기) - 온보딩 후 설정
        learning_depth: 이해 깊이 (원리파악 vs 직관이해) - 온보딩 후 설정
        material_preference: 자료 선호 (텍스트 vs 영상) - 온보딩 후 설정
        practice_style: 실전 선호 (이론중심 vs 문제중심) - 온보딩 후 설정
        ai_persona: AI 성격 (격려형 vs 엄격형) - 온보딩 후 설정
        onboarding_completed: 온보딩 완료 여부
        created_at: 계정 생성 시간
        updated_at: 정보 수정 시간
    """
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), nullable=False)  # 사용자명
    login_id = db.Column(db.String(80), unique=True, nullable=True)  # 로그인 아이디 (일반 로그인용)
    password = db.Column(db.String(255), nullable=True)  # 비밀번호 해시 (일반 로그인용)
    email = db.Column(db.String(120), unique=True, nullable=True, default=None)  # 이메일 (선택사항)
    school = db.Column(db.String(100), nullable=False)  # 필수: 학교명
    major = db.Column(db.String(100), nullable=False)  # 필수: 학과
    grade = db.Column(db.Integer, nullable=False)  # 필수: 학년 (1, 2, 3, 4)
    social_type = db.Column(db.String(20), nullable=True)  # 소셜 로그인 타입 ('kakao', 'google')
    social_id = db.Column(db.String(100), nullable=True)  # 소셜 로그인 ID
    exam_style = db.Column(db.String(50), nullable=True)  # 온보딩 후 설정
    learning_depth = db.Column(db.String(50), nullable=True)  # 온보딩 후 설정
    material_preference = db.Column(db.String(50), nullable=True)  # 온보딩 후 설정
    practice_style = db.Column(db.String(50), nullable=True)  # 온보딩 후 설정
    ai_persona = db.Column(db.String(50), nullable=True)  # 온보딩 후 설정
    onboarding_completed = db.Column(db.Boolean, default=False, nullable=False)  # 온보딩 완료 여부
    # 설정 관련 필드
    theme = db.Column(db.String(20), nullable=True, default='light')  # 테마: 'light', 'dark', 'system'
    email_notifications = db.Column(db.Boolean, default=True, nullable=False)  # 이메일 알림
    push_notifications = db.Column(db.Boolean, default=True, nullable=False)  # 푸시 알림
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 관계 설정
    subjects = db.relationship('Subject', backref='user', lazy=True, cascade='all, delete-orphan')
    quiz_results = db.relationship('QuizResult', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        """사용자 정보를 딕셔너리로 변환 (비밀번호 제외)"""
        return {
            'id': self.id,
            'username': self.username,
            'login_id': self.login_id,
            'email': self.email,
            'school': self.school,
            'major': self.major,
            'grade': self.grade,
            'social_type': self.social_type,
            'exam_style': self.exam_style,
            'learning_depth': self.learning_depth,
            'material_preference': self.material_preference,
            'practice_style': self.practice_style,
            'ai_persona': self.ai_persona,
            'onboarding_completed': self.onboarding_completed,
            'theme': self.theme or 'light',
            'email_notifications': self.email_notifications,
            'push_notifications': self.push_notifications,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class Subject(db.Model):
    """과목 테이블
    
    Attributes:
        id: 과목 고유 ID (Primary Key)
        user_id: 소유자 사용자 ID (Foreign Key)
        name: 과목명 (필수)
        subject_type: 과목 유형 (교양 vs 전공) (필수)
        syllabus_context: 강의계획서 요약/컨텍스트 (초기에는 빈 문자열)
        syllabus_file_path: 강의계획서 PDF 파일 경로
        syllabus_text: PDF에서 추출한 텍스트 (Text 타입)
        created_at: 생성 시간
        updated_at: 수정 시간
    """
    __tablename__ = 'subjects'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(200), nullable=False)  # 필수: 과목명
    subject_type = db.Column(db.String(50), nullable=False)  # 필수: 교양 또는 전공
    syllabus_context = db.Column(db.Text, default='', nullable=False)  # 강의계획서 요약 (초기에는 빈 문자열)
    syllabus_file_path = db.Column(db.String(500), nullable=True)  # PDF 파일 경로
    syllabus_text = db.Column(db.Text, nullable=True)  # PDF에서 추출한 텍스트
    syllabus_analysis = db.Column(db.Text, nullable=True)  # AI 분석 결과 (JSON 문자열)
    color = db.Column(db.String(7), nullable=True)  # HEX 색상 코드 (예: #FF5733)
    order = db.Column(db.Integer, nullable=True)  # 표시 순서
    exam_date = db.Column(db.DateTime, nullable=True)  # 시험 날짜 (D-Day)
    exam_type = db.Column(db.String(20), nullable=True)  # 시험 유형 ('midterm' | 'final')
    exam_week_start = db.Column(db.Integer, nullable=True)  # 시험 범위 시작 주차
    exam_week_end = db.Column(db.Integer, nullable=True)  # 시험 범위 종료 주차
    is_notification_on = db.Column(db.Boolean, default=True, nullable=False)  # 학습 알림 설정
    study_plan = db.Column(db.Text, nullable=True)  # AI 생성 학습 계획 (JSON 문자열)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 관계 설정
    weeks = db.relationship('Week', backref='subject', lazy=True, cascade='all, delete-orphan', order_by='Week.week_number')
    quiz_results = db.relationship('QuizResult', backref='subject', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self, include_weeks=False):
        """과목 정보를 딕셔너리로 변환"""
        import json
        result = {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'subject_type': self.subject_type,
            'syllabus_context': self.syllabus_context,
            'syllabus_file_path': self.syllabus_file_path,
            'syllabus_text': self.syllabus_text,
            'color': self.color,
            'order': self.order,
            'exam_date': self.exam_date.isoformat() if self.exam_date else None,
            'exam_type': self.exam_type,
            'exam_week_start': self.exam_week_start,
            'exam_week_end': self.exam_week_end,
            'is_notification_on': self.is_notification_on,
            'study_plan': json.loads(self.study_plan) if self.study_plan else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        # syllabus_analysis를 JSON으로 파싱
        if self.syllabus_analysis:
            try:
                result['syllabus_analysis'] = json.loads(self.syllabus_analysis)
            except:
                result['syllabus_analysis'] = None
        else:
            result['syllabus_analysis'] = None
        
        if include_weeks:
            result['weeks'] = [week.to_dict() for week in self.weeks]
        return result


class Week(db.Model):
    """주차 테이블
    
    Attributes:
        id: 주차 고유 ID (Primary Key)
        subject_id: 과목 ID (Foreign Key)
        week_number: 주차 번호 (1, 2, 3, ...)
        title: 주차 제목
        description: 주차 설명
        created_at: 생성 시간
        updated_at: 수정 시간
    """
    __tablename__ = 'weeks'
    
    id = db.Column(db.Integer, primary_key=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    week_number = db.Column(db.Integer, nullable=False)  # 주차 번호
    title = db.Column(db.String(200), nullable=False)  # 주차 제목
    description = db.Column(db.Text, nullable=True)  # 주차 설명
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 관계 설정
    materials = db.relationship('Material', backref='week', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        """주차 정보를 딕셔너리로 변환"""
        return {
            'id': self.id,
            'subject_id': self.subject_id,
            'week_number': self.week_number,
            'title': self.title,
            'description': self.description,
            'materials': [material.to_dict() for material in self.materials],
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class Material(db.Model):
    """수업자료 테이블
    
    Attributes:
        id: 자료 고유 ID (Primary Key)
        week_id: 주차 ID (Foreign Key)
        file_name: 파일명
        file_path: 파일 경로
        file_type: 파일 타입 (pdf, ppt, doc, etc.)
        file_size: 파일 크기 (bytes)
        uploaded_at: 업로드 시간
    """
    __tablename__ = 'materials'
    
    id = db.Column(db.Integer, primary_key=True)
    week_id = db.Column(db.Integer, db.ForeignKey('weeks.id'), nullable=False)
    file_name = db.Column(db.String(200), nullable=False)  # 파일명
    file_path = db.Column(db.String(500), nullable=False)  # 파일 경로
    file_type = db.Column(db.String(50), nullable=True)  # 파일 타입
    file_size = db.Column(db.Integer, nullable=True)  # 파일 크기 (bytes)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """자료 정보를 딕셔너리로 변환"""
        return {
            'id': self.id,
            'week_id': self.week_id,
            'file_name': self.file_name,
            'file_path': self.file_path,
            'file_type': self.file_type,
            'file_size': self.file_size,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None
        }


class LearningPDF(db.Model):
    """학습용 PDF 테이블 (RAG용)
    
    Attributes:
        id: PDF 고유 ID (Primary Key)
        subject_id: 과목 ID (Foreign Key)
        file_name: 파일명
        file_path: 파일 경로
        file_size: 파일 크기 (bytes)
        extracted_text: 추출된 텍스트
        vector_db_path: 벡터 DB 경로 (FAISS 인덱스)
        uploaded_at: 업로드 시간
    """
    __tablename__ = 'learning_pdfs'
    
    id = db.Column(db.Integer, primary_key=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    file_name = db.Column(db.String(200), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.Integer, nullable=True)
    extracted_text = db.Column(db.Text, nullable=True)  # PDF에서 추출한 텍스트
    vector_db_path = db.Column(db.String(500), nullable=True)  # 벡터 DB 인덱스 경로
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 관계 설정
    subject = db.relationship('Subject', backref='learning_pdfs', lazy=True)
    
    def to_dict(self):
        """PDF 정보를 딕셔너리로 변환"""
        return {
            'id': self.id,
            'subject_id': self.subject_id,
            'file_name': self.file_name,
            'file_path': self.file_path,
            'file_size': self.file_size,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None
        }


class ChatHistory(db.Model):
    """채팅 히스토리 테이블 (Concept Learning용)
    
    Attributes:
        id: 채팅 고유 ID (Primary Key)
        subject_id: 과목 ID (Foreign Key)
        learning_pdf_id: 학습용 PDF ID (Foreign Key, nullable)
        mode: 학습 모드 ('summary', 'deep_dive', 'eli5')
        user_message: 사용자 메시지
        ai_response: AI 응답
        created_at: 생성 시간
    """
    __tablename__ = 'chat_history'
    
    id = db.Column(db.Integer, primary_key=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    learning_pdf_id = db.Column(db.Integer, db.ForeignKey('learning_pdfs.id'), nullable=True)
    mode = db.Column(db.String(50), nullable=False)  # 'summary', 'deep_dive', 'eli5'
    user_message = db.Column(db.Text, nullable=False)
    ai_response = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """채팅 히스토리 정보를 딕셔너리로 변환"""
        return {
            'id': self.id,
            'subject_id': self.subject_id,
            'learning_pdf_id': self.learning_pdf_id,
            'mode': self.mode,
            'user_message': self.user_message,
            'ai_response': self.ai_response,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class QuizResult(db.Model):
    """퀴즈 결과 테이블 (오답 노트 기능)
    
    Attributes:
        id: 퀴즈 결과 고유 ID (Primary Key)
        user_id: 사용자 ID (Foreign Key)
        subject_id: 과목 ID (Foreign Key)
        learning_pdf_id: 학습용 PDF ID (Foreign Key, nullable)
        quiz_content: 퀴즈 내용/문제
        user_answer: 사용자 답안
        correct_answer: 정답
        is_correct: 정답 여부
        weakness_tag: 취약점 태그 (필수) - 오답 노트 기능을 위해 필요
        created_at: 생성 시간
    """
    __tablename__ = 'quiz_results'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    learning_pdf_id = db.Column(db.Integer, db.ForeignKey('learning_pdfs.id'), nullable=True)
    quiz_content = db.Column(db.Text, nullable=True)  # 퀴즈 문제 내용
    user_answer = db.Column(db.Text, nullable=True)  # 사용자 답안
    correct_answer = db.Column(db.Text, nullable=True)  # 정답
    is_correct = db.Column(db.Boolean, default=False)  # 정답 여부
    weakness_tag = db.Column(db.String(200), nullable=False)  # 필수: 취약점 태그 (예: "Comparison Test", "Limit Calculation")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """퀴즈 결과 정보를 딕셔너리로 변환"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'subject_id': self.subject_id,
            'learning_pdf_id': self.learning_pdf_id,
            'quiz_content': self.quiz_content,
            'user_answer': self.user_answer,
            'correct_answer': self.correct_answer,
            'is_correct': self.is_correct,
            'weakness_tag': self.weakness_tag,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class ConceptContent(db.Model):
    """개념 학습 콘텐츠 테이블
    
    Attributes:
        id: 콘텐츠 고유 ID (Primary Key)
        week_id: 주차 ID (Foreign Key)
        mode: 학습 모드 ('summary' 또는 'deep_dive')
        content: 생성된 콘텐츠 (Markdown 형식)
        created_at: 생성 시간
        updated_at: 수정 시간
    """
    __tablename__ = 'concept_contents'
    
    id = db.Column(db.Integer, primary_key=True)
    week_id = db.Column(db.Integer, db.ForeignKey('weeks.id'), nullable=False)
    mode = db.Column(db.String(50), nullable=False)  # 'summary' 또는 'deep_dive'
    content = db.Column(db.Text, nullable=False)  # Markdown 형식의 콘텐츠
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 관계 설정
    week = db.relationship('Week', backref='concept_contents', lazy=True)
    
    def to_dict(self):
        """콘텐츠 정보를 딕셔너리로 변환"""
        return {
            'id': self.id,
            'week_id': self.week_id,
            'mode': self.mode,
            'content': self.content,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class Quiz(db.Model):
    """퀴즈 테이블 (새로운 퀴즈 시스템)
    
    Attributes:
        id: 퀴즈 고유 ID (Primary Key)
        subject_id: 과목 ID (Foreign Key)
        user_id: 사용자 ID (Foreign Key)
        week_numbers: 선택된 주차 번호들 (JSON 배열, 예: [1, 2, 3])
        difficulty: 난이도 ('easy', 'medium', 'hard')
        question_types: 문제 유형들 (JSON 배열, 예: ['multiple_choice', 'short_answer'])
        language: 언어 ('korean', 'english')
        num_questions: 문제 개수
        past_exam_context: 과거 시험 예시/컨텍스트 (텍스트)
        quiz_number: 해당 과목 내 퀴즈 번호 (1, 2, 3, ...)
        created_at: 생성 시간
    """
    __tablename__ = 'quizzes'
    
    id = db.Column(db.Integer, primary_key=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    week_numbers = db.Column(db.Text, nullable=False)  # JSON 배열 문자열
    difficulty = db.Column(db.String(20), nullable=False)  # 'easy', 'medium', 'hard'
    question_types = db.Column(db.Text, nullable=False)  # JSON 배열 문자열
    language = db.Column(db.String(20), nullable=False)  # 'korean', 'english'
    num_questions = db.Column(db.Integer, nullable=False)
    past_exam_context = db.Column(db.Text, nullable=True)  # 과거 시험 예시
    quiz_number = db.Column(db.Integer, nullable=False)  # 과목 내 퀴즈 번호
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 관계 설정
    subject = db.relationship('Subject', backref='quizzes', lazy=True)
    user = db.relationship('User', backref='quizzes', lazy=True)
    questions = db.relationship('Question', backref='quiz', lazy=True, cascade='all, delete-orphan', order_by='Question.order')
    user_responses = db.relationship('UserResponse', backref='quiz', lazy=True, cascade='all, delete-orphan')
    report = db.relationship('QuizReport', backref='quiz', lazy=True, uselist=False, cascade='all, delete-orphan')
    
    def to_dict(self):
        """퀴즈 정보를 딕셔너리로 변환"""
        import json
        return {
            'id': self.id,
            'subject_id': self.subject_id,
            'user_id': self.user_id,
            'week_numbers': json.loads(self.week_numbers) if self.week_numbers else [],
            'difficulty': self.difficulty,
            'question_types': json.loads(self.question_types) if self.question_types else [],
            'language': self.language,
            'num_questions': self.num_questions,
            'past_exam_context': self.past_exam_context,
            'quiz_number': self.quiz_number,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Question(db.Model):
    """문제 테이블
    
    Attributes:
        id: 문제 고유 ID (Primary Key)
        quiz_id: 퀴즈 ID (Foreign Key)
        question_type: 문제 유형 ('multiple_choice', 'short_answer', 'subjective')
        question_text: 문제 내용
        options: 선택지들 (JSON 배열, 객관식용)
        correct_answer: 정답
        explanation: 설명
        key_concept: 핵심 개념
        order: 문제 순서 (1, 2, 3, ...)
    """
    __tablename__ = 'questions'
    
    id = db.Column(db.Integer, primary_key=True)
    quiz_id = db.Column(db.Integer, db.ForeignKey('quizzes.id'), nullable=False)
    question_type = db.Column(db.String(50), nullable=False)  # 'multiple_choice', 'short_answer', 'subjective'
    question_text = db.Column(db.Text, nullable=False)
    options = db.Column(db.Text, nullable=True)  # JSON 배열 문자열 (객관식용)
    correct_answer = db.Column(db.Text, nullable=False)
    explanation = db.Column(db.Text, nullable=False)
    key_concept = db.Column(db.String(200), nullable=True)  # 핵심 개념
    order = db.Column(db.Integer, nullable=False)  # 문제 순서
    
    # 관계 설정
    user_responses = db.relationship('UserResponse', backref='question', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        """문제 정보를 딕셔너리로 변환"""
        import json
        return {
            'id': self.id,
            'quiz_id': self.quiz_id,
            'question_type': self.question_type,
            'question_text': self.question_text,
            'options': json.loads(self.options) if self.options else None,
            'correct_answer': self.correct_answer,
            'explanation': self.explanation,
            'key_concept': self.key_concept,
            'order': self.order
        }


class UserResponse(db.Model):
    """사용자 답안 테이블
    
    Attributes:
        id: 답안 고유 ID (Primary Key)
        quiz_id: 퀴즈 ID (Foreign Key)
        question_id: 문제 ID (Foreign Key)
        user_answer: 사용자 답안
        is_correct: 정답 여부
        submitted_at: 제출 시간
    """
    __tablename__ = 'user_responses'
    
    id = db.Column(db.Integer, primary_key=True)
    quiz_id = db.Column(db.Integer, db.ForeignKey('quizzes.id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('questions.id'), nullable=False)
    user_answer = db.Column(db.Text, nullable=False)
    is_correct = db.Column(db.Boolean, nullable=False)
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """답안 정보를 딕셔너리로 변환"""
        return {
            'id': self.id,
            'quiz_id': self.quiz_id,
            'question_id': self.question_id,
            'user_answer': self.user_answer,
            'is_correct': self.is_correct,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None
        }


class QuizReport(db.Model):
    """퀴즈 리포트 테이블
    
    Attributes:
        id: 리포트 고유 ID (Primary Key)
        quiz_id: 퀴즈 ID (Foreign Key, unique)
        score: 점수
        total: 전체 문제 수
        ai_report: AI 생성 리포트 내용 (텍스트)
        created_at: 생성 시간
    """
    __tablename__ = 'quiz_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    quiz_id = db.Column(db.Integer, db.ForeignKey('quizzes.id'), nullable=False, unique=True)
    score = db.Column(db.Integer, nullable=False)
    total = db.Column(db.Integer, nullable=False)
    ai_report = db.Column(db.Text, nullable=False)  # AI 리포트 내용
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """리포트 정보를 딕셔너리로 변환"""
        return {
            'id': self.id,
            'quiz_id': self.quiz_id,
            'score': self.score,
            'total': self.total,
            'ai_report': self.ai_report,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

