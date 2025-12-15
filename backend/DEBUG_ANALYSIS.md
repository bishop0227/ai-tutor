# AI 분석 문제 해결 가이드

## 문제 진단 체크리스트

### 1. GEMINI_API_KEY 확인
```bash
cd backend
# .env 파일 확인
Get-Content .env
```

`.env` 파일에 다음이 있어야 합니다:
```
GEMINI_API_KEY=여기에_API_키
```

### 2. 라이브러리 설치 확인
```bash
pip list | Select-String "google-generativeai"
```

설치되어 있지 않으면:
```bash
pip install google-generativeai==0.3.2
```

### 3. 서버 재시작
코드를 수정했다면 반드시 서버를 재시작하세요.

### 4. 서버 콘솔 로그 확인
서버를 실행한 터미널에서 다음 메시지들을 확인하세요:

**정상 동작 시:**
```
🔑 Gemini API 키 확인: 설정됨 (AIzaSy...)
📄 강의계획서 텍스트 길이: XXXX 문자
🤖 Google Gemini API 호출 시작...
   모델: gemini-1.5-flash
✅ Gemini API 응답 수신 완료 (소요 시간: X.XX초)
📊 LLM 분석 결과: {...}
✅ 과목 ID X: AI 분석 완료 및 저장
```

**문제 발생 시:**
- `⚠️ GEMINI_API_KEY가 설정되지 않았습니다.` → .env 파일 확인
- `❌ LLM 분석 중 오류` → 에러 메시지 확인
- `⏭️ 과목 ID X: 이전에 분석 실패` → 기존 에러 정보가 저장되어 있음

### 5. 기존 에러 정보 초기화

기존에 분석 실패로 저장된 정보가 있으면 재시도하지 않습니다.

**해결 방법 1: 과목 삭제 후 재생성**
- Dashboard에서 과목 삭제
- 같은 PDF로 다시 생성

**해결 방법 2: DB 직접 수정 (고급)**
```python
# Python 콘솔에서
from app import create_app
from models import db, Subject

app = create_app()
with app.app_context():
    subject = Subject.query.get(과목ID)
    subject.syllabus_analysis = None
    db.session.commit()
```

### 6. Mock Data 확인

API가 실패해도 Mock Data가 반환되므로 앱은 계속 작동합니다.
Mock Data가 표시되면:
- API 키가 없거나
- 할당량 초과이거나
- 네트워크 오류일 수 있습니다

## 빠른 해결 방법

1. **.env 파일 확인 및 설정**
   ```
   GEMINI_API_KEY=AIzaSy...여기에_실제_키
   ```

2. **서버 완전 재시작**
   - 서버 종료 (Ctrl+C)
   - 다시 시작: `python app.py`

3. **새 과목 생성**
   - 기존 과목 삭제
   - 새로 PDF 업로드

4. **브라우저 콘솔 확인 (F12)**
   - 네트워크 탭에서 API 호출 확인
   - 에러 메시지 확인



