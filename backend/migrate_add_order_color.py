"""
데이터베이스 마이그레이션 스크립트
subjects 테이블에 color와 order 컬럼을 추가합니다.
"""

import sqlite3
import os

# 데이터베이스 경로
basedir = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(basedir, 'instance', 'app.db')

if not os.path.exists(db_path):
    print(f"❌ 데이터베이스 파일을 찾을 수 없습니다: {db_path}")
    exit(1)

print(f"📂 데이터베이스 경로: {db_path}")

# 데이터베이스 연결
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # 기존 컬럼 확인
    cursor.execute("PRAGMA table_info(subjects)")
    columns = [row[1] for row in cursor.fetchall()]
    print(f"📋 기존 컬럼: {columns}")
    
    # color 컬럼 추가
    if 'color' not in columns:
        print("➕ color 컬럼 추가 중...")
        cursor.execute('ALTER TABLE subjects ADD COLUMN color VARCHAR(7)')
        print("✅ color 컬럼이 추가되었습니다.")
    else:
        print("ℹ️  color 컬럼이 이미 존재합니다.")
    
    # order 컬럼 추가
    if 'order' not in columns:
        print("➕ order 컬럼 추가 중...")
        cursor.execute('ALTER TABLE subjects ADD COLUMN "order" INTEGER')
        # 기존 과목들의 order를 id 기반으로 설정
        cursor.execute('UPDATE subjects SET "order" = id WHERE "order" IS NULL')
        print("✅ order 컬럼이 추가되었습니다.")
    else:
        print("ℹ️  order 컬럼이 이미 존재합니다.")
    
    # 변경사항 저장
    conn.commit()
    print("✅ 마이그레이션이 완료되었습니다!")
    
    # 최종 컬럼 확인
    cursor.execute("PRAGMA table_info(subjects)")
    final_columns = [row[1] for row in cursor.fetchall()]
    print(f"📋 최종 컬럼: {final_columns}")
    
except Exception as e:
    conn.rollback()
    print(f"❌ 마이그레이션 중 오류 발생: {e}")
    exit(1)
finally:
    conn.close()



