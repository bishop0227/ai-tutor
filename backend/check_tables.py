"""
데이터베이스 테이블 존재 여부 확인 스크립트
"""
from app import create_app
from models import db
from sqlalchemy import inspect

app = create_app()
with app.app_context():
    inspector = inspect(db.engine)
    existing_tables = inspector.get_table_names()
    
    print("\n=== 데이터베이스 테이블 확인 ===")
    print(f"총 {len(existing_tables)}개의 테이블이 존재합니다.\n")
    
    required_tables = ['quizzes', 'questions', 'user_responses', 'quiz_reports']
    print("필요한 퀴즈 시스템 테이블:")
    for table in required_tables:
        status = "✅ 있음" if table in existing_tables else "❌ 없음"
        print(f"  - {table}: {status}")
    
    if any(t not in existing_tables for t in required_tables):
        print("\n⚠️ 일부 테이블이 없습니다. 백엔드 서버를 재시작하세요.")
        print("서버 시작 시 자동으로 테이블이 생성됩니다.")
    else:
        print("\n✅ 모든 필요한 테이블이 존재합니다.")

