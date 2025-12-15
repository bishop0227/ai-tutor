# OpenAI API 키 설정 가이드

## 1. OpenAI API 키 발급받기

1. [OpenAI Platform](https://platform.openai.com/)에 접속
2. 회원가입 또는 로그인
3. **API Keys 페이지로 이동:**
   - 오른쪽 상단의 **프로필 아이콘** (사용자 이름 옆)을 클릭
   - 드롭다운 메뉴에서 **"View API keys"** 선택
   - 또는 직접 [API Keys 페이지](https://platform.openai.com/api-keys)로 이동
4. "Create new secret key" 버튼 클릭
5. 키 이름을 입력하고 생성 (선택사항)
6. **생성된 키를 복사해두세요** (다시 볼 수 없습니다!)

## 2. .env 파일 생성

`backend` 폴더에 `.env` 파일을 생성하고 다음 내용을 입력하세요:

```
OPENAI_API_KEY=sk-your-api-key-here
```

예시:
```
OPENAI_API_KEY=sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

## 3. 주의사항

- `.env` 파일은 **절대 Git에 커밋하지 마세요!**
- API 키가 노출되면 누구나 사용할 수 있습니다
- `.gitignore`에 `.env`가 포함되어 있는지 확인하세요

## 4. API 키 없이 사용하기

API 키가 없어도 앱은 정상 작동합니다:
- 과목 생성은 가능합니다
- PDF 텍스트 추출은 가능합니다
- **LLM 분석만 건너뜁니다** (학점, 평가비율, 주차 자동 생성 불가)
- 수동으로 주차를 추가할 수 있습니다

## 5. 비용 안내

- OpenAI API는 사용량에 따라 비용이 발생합니다
- GPT-4o 모델 사용 시 약 $2.50 ~ $10.00 per 1M input tokens
- 강의계획서 분석 1회당 약 $0.01 ~ $0.05 정도 소요될 수 있습니다
- [OpenAI 가격 페이지](https://openai.com/api/pricing/)에서 자세한 정보 확인 가능

## 6. 테스트

서버를 재시작한 후 과목을 생성해보세요. 콘솔에 다음 메시지가 나타나면 정상 작동합니다:

```
✅ LLM 분석 완료: 과목 ID 1
```

또는 API 키가 없으면:

```
⚠️  OPENAI_API_KEY가 설정되지 않았습니다. LLM 분석을 건너뜁니다.
```

