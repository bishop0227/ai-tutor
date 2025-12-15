# OpenAI API 할당량 문제 해결 가이드

## 왜 할당량 초과가 발생하나요?

### OpenAI API의 무료 크레딧 정책

1. **신규 계정 무료 크레딧**
   - 과거에는 신규 계정에 $5~$18 정도의 무료 크레딧을 제공했습니다
   - 하지만 2024년 이후로는 무료 크레딧 제공이 중단되었거나 매우 제한적입니다

2. **현재 정책**
   - 대부분의 계정은 **결제 정보를 추가해야만** API를 사용할 수 있습니다
   - 최소 $5 크레딧 충전이 필요합니다

3. **사용량 기반 과금**
   - GPT-4o 모델: 약 $2.50 ~ $10.00 per 1M input tokens
   - 강의계획서 분석 1회당 약 $0.01 ~ $0.05 소요
   - $5 크레딧으로 약 100~500회 분석 가능

## 해결 방법

### 방법 1: OpenAI 크레딧 충전 (권장)

1. [OpenAI Platform](https://platform.openai.com/)에 로그인
2. [Billing 페이지](https://platform.openai.com/account/billing)로 이동
3. "Add payment method" 클릭
4. 결제 정보 입력 (신용카드, PayPal 등)
5. 최소 $5 크레딧 충전

**장점:**
- 가장 정확하고 빠른 분석
- GPT-4o의 고품질 결과
- 안정적인 서비스

**단점:**
- 비용 발생 (하지만 매우 저렴함)

### 방법 2: 다른 LLM 서비스 사용

#### A. Google Gemini API (무료 티어 제공)
- 무료 티어: 월 15 RPM (Requests Per Minute)
- 비용: 무료 티어 후 $0.25 per 1M tokens
- 설정 방법:
  ```python
  # backend/app.py 수정 필요
  from google import generativeai as genai
  genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
  ```

#### B. Anthropic Claude API
- 무료 티어 없음
- 비용: $3 per 1M input tokens
- OpenAI보다 약간 저렴

#### C. Hugging Face Inference API
- 일부 모델은 무료
- 성능이 OpenAI보다 낮을 수 있음

### 방법 3: 로컬 LLM 사용 (고급)

- Ollama, LM Studio 등을 사용하여 로컬에서 실행
- 비용 없음
- 하지만 성능과 속도가 낮을 수 있음
- 한국어 지원이 제한적일 수 있음

## 현재 상황 확인 방법

### 1. OpenAI Platform에서 확인
1. [Usage 페이지](https://platform.openai.com/usage) 접속
2. 사용량 및 남은 크레딧 확인
3. 할당량 제한 확인

### 2. API 키 확인
- [API Keys 페이지](https://platform.openai.com/api-keys)
- 현재 사용 중인 API 키 확인
- 새 API 키 발급 가능

## 추천 해결책

### 즉시 해결 (가장 빠름)
**OpenAI 크레딧 충전 ($5)**
- 약 100~500회 분석 가능
- 가장 정확한 결과
- 설정 변경 불필요

### 장기적 해결
1. **Google Gemini API** 사용 (무료 티어 활용)
2. **하이브리드 방식**: 무료 티어 + 유료 크레딧 조합
3. **캐싱 최적화**: 같은 강의계획서는 재분석하지 않도록

## 비용 비교

| 서비스 | 무료 티어 | 유료 가격 | 추천도 |
|--------|----------|----------|--------|
| OpenAI GPT-4o | ❌ 없음 | $2.50~$10/1M tokens | ⭐⭐⭐⭐⭐ |
| Google Gemini | ✅ 있음 (제한적) | $0.25/1M tokens | ⭐⭐⭐⭐ |
| Anthropic Claude | ❌ 없음 | $3/1M tokens | ⭐⭐⭐⭐ |
| Hugging Face | ✅ 일부 무료 | 다양 | ⭐⭐⭐ |

## 결론

**무료 버전으로는 현재 OpenAI API 분석이 불가능합니다.**

하지만:
- **$5 크레딧으로 약 100~500회 분석 가능** (매우 저렴)
- 또는 **Google Gemini API의 무료 티어** 활용 가능
- 강의계획서 분석은 **1회당 $0.01~$0.05**로 매우 저렴합니다

가장 빠른 해결책은 OpenAI Platform에서 결제 정보를 추가하고 $5 크레딧을 충전하는 것입니다.



