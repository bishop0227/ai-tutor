# OpenAI API 문제 해결 가이드

## 현재 오류: insufficient_quota (할당량 초과)

### 문제 원인
OpenAI API 계정에 사용 가능한 크레딧이 없습니다.

### 해결 방법

#### 1. OpenAI 계정 확인
1. [OpenAI Platform](https://platform.openai.com/)에 로그인
2. 오른쪽 상단 프로필 아이콘 클릭 → "View API keys" 선택
3. 현재 사용 중인 API 키 확인

#### 2. Billing 정보 확인
1. [Billing 페이지](https://platform.openai.com/account/billing)로 이동
2. 결제 정보가 등록되어 있는지 확인
3. 사용 가능한 크레딧 확인

#### 3. Usage 확인
1. [Usage 페이지](https://platform.openai.com/usage)로 이동
2. API 사용량 확인
3. 무료 크레딧이 남아있는지 확인

#### 4. 새 API 키 발급 (필요시)
1. [API Keys 페이지](https://platform.openai.com/api-keys)로 이동
2. "Create new secret key" 클릭
3. 새 키를 `backend/.env` 파일에 업데이트:
   ```
   OPENAI_API_KEY=sk-새로운_키_여기
   ```
4. 서버 재시작

#### 5. 결제 정보 추가 (크레딧 충전)
1. [Billing 페이지](https://platform.openai.com/account/billing)로 이동
2. "Add payment method" 클릭
3. 결제 정보 입력
4. 크레딧 충전 (최소 $5)

### 임시 해결책
- LLM 분석 없이도 앱은 작동합니다
- 수동으로 주차를 추가할 수 있습니다
- "주차 추가" 버튼으로 직접 입력 가능

### 비용 안내
- GPT-4o 모델: 약 $2.50 ~ $10.00 per 1M input tokens
- 강의계획서 분석 1회당 약 $0.01 ~ $0.05
- 무료 크레딧이 있다면 먼저 사용 가능

### 확인 사항 체크리스트
- [ ] OpenAI Platform에 로그인 가능한가?
- [ ] API 키가 올바른 형식인가? (sk-로 시작)
- [ ] .env 파일에 API 키가 올바르게 설정되어 있는가?
- [ ] Billing 페이지에 결제 정보가 등록되어 있는가?
- [ ] 사용 가능한 크레딧이 있는가?




