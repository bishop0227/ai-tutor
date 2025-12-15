# Gemini API 키 설정 가이드

## 문제: AI 분석이 작동하지 않음

현재 `.env` 파일에 `GEMINI_API_KEY`가 설정되어 있지 않습니다.

## 해결 방법

### 1. Gemini API 키 발급

1. [Google AI Studio](https://aistudio.google.com/app/apikey) 접속
2. Google 계정으로 로그인
3. "Create API Key" 버튼 클릭
4. API 키 복사 (예: `AIzaSy...`)

### 2. .env 파일에 추가

`backend/.env` 파일을 열고 다음 줄을 추가하세요:

```
GEMINI_API_KEY=여기에_발급받은_API_키_입력
```

예시:
```
OPENAI_API_KEY=sk-proj-...
GEMINI_API_KEY=AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz1234567890
```

### 3. 서버 재시작

서버를 완전히 종료하고 다시 시작하세요:

```bash
# 서버 종료 (Ctrl+C)
# 서버 재시작
python app.py
```

### 4. 확인

서버 콘솔에서 다음 메시지가 보이면 성공입니다:

```
🔑 Gemini API 키 확인: 설정됨 (AIzaSy...)
```

## 기존 과목 재분석

기존에 분석 실패한 과목이 있다면:

1. **방법 1: 과목 삭제 후 재생성** (권장)
   - Dashboard에서 과목 삭제
   - 같은 PDF로 다시 생성

2. **방법 2: 새 과목 생성**
   - 새로운 PDF로 과목 생성

## Mock Data

API 키가 없거나 실패해도 Mock Data가 반환되어 앱은 계속 작동합니다.
하지만 실제 분석 결과를 보려면 API 키가 필요합니다.



