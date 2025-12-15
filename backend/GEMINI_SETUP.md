# Google Gemini API 설정 가이드

## 1. API 키 발급

1. [Google AI Studio](https://aistudio.google.com/app/apikey) 접속
2. Google 계정으로 로그인
3. "Create API Key" 버튼 클릭
4. API 키 복사

## 2. .env 파일 설정

`backend/.env` 파일에 다음을 추가:

```
GEMINI_API_KEY=여기에_발급받은_API_키_입력
```

## 3. 라이브러리 설치

```bash
cd backend
pip install google-generativeai==0.3.2
```

## 4. 서버 재시작

```bash
python app.py
```

## 5. 기존 에러 정보 초기화 (필요시)

기존에 OpenAI 에러로 인해 저장된 분석 실패 정보를 초기화하려면:

1. SQLite 데이터베이스에서 해당 과목의 `syllabus_analysis` 컬럼을 NULL로 설정
2. 또는 과목을 삭제하고 다시 생성

## 무료 티어 제한

- 월 15 RPM (Requests Per Minute)
- 일일 제한 있음
- 제한 초과 시 429 에러 발생

## 문제 해결

### API 키가 인식되지 않는 경우
1. `.env` 파일이 `backend` 폴더에 있는지 확인
2. 서버를 재시작했는지 확인
3. API 키 앞뒤에 공백이 없는지 확인

### 분석이 실패하는 경우
1. 서버 콘솔에서 에러 메시지 확인
2. API 키가 유효한지 확인
3. 할당량 제한을 초과하지 않았는지 확인



