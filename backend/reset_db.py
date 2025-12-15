"""
데이터베이스 재생성 스크립트
기존 데이터베이스를 삭제하고 새로 생성합니다.
"""

import os
import sys

# backend 폴더를 현재 경로로 설정
basedir = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(basedir, 'instance', 'app.db')

if os.path.exists(db_path):
    # 백업 생성
    backup_path = db_path + '.backup'
    if os.path.exists(backup_path):
        os.remove(backup_path)
    os.rename(db_path, backup_path)
    print(f"✅ 기존 데이터베이스를 백업했습니다: {backup_path}")
else:
    print("ℹ️  데이터베이스 파일이 없습니다.")

# 새 데이터베이스 생성
from app import create_app
from models import db

app = create_app()
with app.app_context():
    db.create_all()
    print("✅ 새로운 데이터베이스가 생성되었습니다.")
    print("✅ 이제 백엔드 서버를 재시작하세요.")



