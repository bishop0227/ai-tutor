"""
OpenAI API 연결 테스트 스크립트
.env 파일의 OPENAI_API_KEY를 사용하여 간단한 API 호출 테스트
"""

import os
from dotenv import load_dotenv
from openai import OpenAI
import httpx

def test_openai_connection():
    """OpenAI API 연결 테스트"""
    
    # .env 파일 로드
    basedir = os.path.abspath(os.path.dirname(__file__))
    env_path = os.path.join(basedir, '.env')
    load_dotenv(env_path)
    
    # API 키 확인
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("❌ 오류: OPENAI_API_KEY가 .env 파일에 설정되지 않았습니다.")
        print(f"   .env 파일 경로: {env_path}")
        return False
    
    # API 키 마스킹 (보안)
    masked_key = api_key[:7] + "..." + api_key[-4:] if len(api_key) > 11 else "***"
    print(f"🔑 API 키 확인: {masked_key}")
    
    try:
        # OpenAI 클라이언트 생성 (최신 v1.x.x 문법)
        # httpx 클라이언트를 명시적으로 생성하여 proxies 문제 방지
        print("📡 httpx 클라이언트 생성 중...")
        http_client = httpx.Client(timeout=60.0)
        print("✅ httpx 클라이언트 생성 완료")
        
        print("📡 OpenAI 클라이언트 생성 중...")
        client = OpenAI(api_key=api_key, http_client=http_client)
        print("✅ OpenAI 클라이언트 생성 완료")
        
        # 간단한 API 호출 테스트
        print("📤 API 호출 중... (모델: gpt-4o-mini)")
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": "Hello"
                }
            ],
            max_tokens=50
        )
        
        # 응답 처리
        response_text = response.choices[0].message.content
        print("\n" + "="*60)
        print("✅ 연결 성공!")
        print("="*60)
        print(f"📥 응답: {response_text}")
        print("="*60 + "\n")
        
        return True
        
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        
        print("\n" + "="*60)
        print("❌ 연결 실패!")
        print("="*60)
        print(f"오류 타입: {error_type}")
        print(f"오류 메시지: {error_msg}")
        print("="*60)
        
        # 에러 코드 추출
        if '429' in error_msg or 'rate limit' in error_msg.lower() or 'quota' in error_msg.lower():
            print("\n⚠️  에러 코드: 429 (Rate Limit / Quota Exceeded)")
            print("   이유: API 할당량이 초과되었거나 요청 한도를 초과했습니다.")
            print("   해결 방법:")
            print("   1. OpenAI Platform에서 사용량 확인")
            print("   2. 잠시 후 다시 시도")
            print("   3. 결제 정보 확인")
        elif '401' in error_msg or 'authentication' in error_msg.lower() or 'invalid' in error_msg.lower():
            print("\n⚠️  에러 코드: 401 (Authentication Error)")
            print("   이유: API 키가 유효하지 않거나 인증에 실패했습니다.")
            print("   해결 방법:")
            print("   1. .env 파일의 OPENAI_API_KEY 확인")
            print("   2. OpenAI Platform에서 새 API 키 발급")
            print("   3. API 키가 활성화되어 있는지 확인")
        elif '403' in error_msg or 'forbidden' in error_msg.lower():
            print("\n⚠️  에러 코드: 403 (Forbidden)")
            print("   이유: API 키에 권한이 없거나 접근이 거부되었습니다.")
            print("   해결 방법:")
            print("   1. API 키 권한 확인")
            print("   2. OpenAI Platform에서 계정 상태 확인")
        elif 'proxies' in error_msg.lower():
            print("\n⚠️  에러: proxies 파라미터 문제")
            print("   이유: httpx 클라이언트 초기화 시 proxies 파라미터가 전달되었습니다.")
            print("   해결 방법:")
            print("   1. 환경 변수에서 HTTP_PROXY, HTTPS_PROXY 확인")
            print("   2. httpx 버전 확인 및 업데이트")
        else:
            print(f"\n⚠️  알 수 없는 오류: {error_type}")
            print("   전체 오류 메시지를 확인하세요.")
        
        print("="*60 + "\n")
        
        return False

if __name__ == "__main__":
    print("🧪 OpenAI API 연결 테스트 시작\n")
    success = test_openai_connection()
    
    if success:
        print("✅ 테스트 완료: 연결 성공")
        exit(0)
    else:
        print("❌ 테스트 완료: 연결 실패")
        exit(1)

