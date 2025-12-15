"""
Google Gemini API 연결 테스트 스크립트
.env 파일의 GEMINI_API_KEY를 사용하여 간단한 API 호출 테스트
"""

import os
from dotenv import load_dotenv
import google.generativeai as genai

def test_gemini_connection():
    """Google Gemini API 연결 테스트"""
    
    # .env 파일 로드
    basedir = os.path.abspath(os.path.dirname(__file__))
    env_path = os.path.join(basedir, '.env')
    load_dotenv(env_path)
    
    # API 키 확인
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("❌ 오류: GEMINI_API_KEY가 .env 파일에 설정되지 않았습니다.")
        print(f"   .env 파일 경로: {env_path}")
        return False
    
    # API 키 마스킹 (보안)
    masked_key = api_key[:7] + "..." + api_key[-4:] if len(api_key) > 11 else "***"
    print(f"🔑 API 키 확인: {masked_key}")
    
    try:
        # Gemini API 클라이언트 설정
        print("📡 Gemini API 클라이언트 설정 중...")
        genai.configure(api_key=api_key)
        print("✅ 클라이언트 설정 완료")
        
        # 사용 가능한 모델 목록 조회하여 무료 계정에 적합한 모델 선택
        print("\n📋 사용 가능한 모델 목록 조회 중...")
        models = genai.list_models()
        available_models = []
        for model_obj in models:
            model_obj_name = model_obj.name
            if model_obj_name.startswith('models/'):
                model_obj_name = model_obj_name.replace('models/', '')
            # generateContent를 지원하는 모델만 추가
            if 'generateContent' in model_obj.supported_generation_methods:
                available_models.append(model_obj_name)
        
        # 무료 계정에 적합한 모델 우선순위: 여러 모델 시도
        # 1순위: gemini-2.5-flash (사용자가 확인한 할당량 있는 모델)
        # 2순위: gemini-flash-latest (가장 안정적)
        # 3순위: 일반 flash 모델
        # 4순위: lite 모델 (할당량이 0일 수 있음)
        
        model_candidates = []
        
        # gemini-2.5-flash 찾기 (사용자가 확인한 할당량 있는 모델)
        flash_25_models = [m for m in available_models if '2.5-flash' in m.lower() or '2.5' in m.lower() and 'flash' in m.lower()]
        if flash_25_models:
            # 정확히 gemini-2.5-flash 우선
            exact_match = [m for m in flash_25_models if m.lower() == 'gemini-2.5-flash']
            if exact_match:
                model_candidates.extend(exact_match)
            else:
                model_candidates.extend(flash_25_models)
        
        # gemini-flash-latest 찾기
        latest_models = [m for m in available_models if 'flash-latest' in m.lower()]
        if latest_models:
            model_candidates.extend(latest_models)
        
        # 일반 flash 모델 찾기 (2.5, latest 제외)
        flash_models = [m for m in available_models if 'flash' in m.lower() and 'lite' not in m.lower() and 'latest' not in m.lower() and '2.5' not in m.lower()]
        if flash_models:
            model_candidates.extend(flash_models)
        
        # lite 모델 찾기 (마지막 순위 - 할당량이 0일 수 있음)
        lite_models = [m for m in available_models if 'lite' in m.lower() and 'flash' in m.lower()]
        if lite_models:
            model_candidates.extend(lite_models)
        
        # 모델이 없으면 첫 번째 사용 가능한 모델 사용
        if not model_candidates:
            if available_models:
                model_candidates = [available_models[0]]
            else:
                raise Exception("사용 가능한 모델을 찾을 수 없습니다.")
        
        # 여러 모델을 순차적으로 시도
        success = False
        for model_name in model_candidates:
            try:
                print(f"\n📡 모델 시도 중... (모델: {model_name})")
                model = genai.GenerativeModel(model_name)
                print("✅ 모델 생성 완료")
                
                # 간단한 API 호출 테스트
                print("📤 API 호출 중...")
                test_message = "Hello"
                print(f"   전송 메시지: {test_message}")
                
                response = model.generate_content(test_message)
                
                # 응답 처리
                response_text = response.text
                print("\n" + "="*60)
                print("✅ 연결 성공!")
                print("="*60)
                print(f"📥 사용된 모델: {model_name}")
                print(f"📥 응답: {response_text}")
                print("="*60 + "\n")
                
                success = True
                break
                
            except Exception as model_error:
                error_msg = str(model_error)
                # 429 에러면 다음 모델 시도
                if '429' in error_msg or 'quota' in error_msg.lower() or 'rate limit' in error_msg.lower():
                    print(f"⚠️  {model_name}: 할당량 초과 - 다음 모델 시도...")
                    continue
                # 다른 에러면 재발생
                else:
                    print(f"⚠️  {model_name}: {error_msg}")
                    if model_name == model_candidates[-1]:  # 마지막 모델이면 에러 발생
                        raise
        
        if not success:
            raise Exception("모든 모델에서 할당량 초과 또는 연결 실패")
        
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
        
        # 에러 코드별 구분
        error_msg_lower = error_msg.lower()
        
        # 404 (NotFound) - 모델을 찾을 수 없음
        if '404' in error_msg or 'not found' in error_msg_lower or 'notfound' in error_msg_lower:
            print("\n⚠️  에러 코드: 404 (NotFound)")
            print("   이유: 요청한 모델을 찾을 수 없습니다")
            print("   상세:")
            print("   - 모델 이름이 잘못되었거나 더 이상 사용할 수 없을 수 있습니다")
            print("   - 모델 이름이 변경되었을 수 있습니다")
            print("   해결 방법:")
            print("   1. genai.list_models()로 사용 가능한 모델 목록 확인")
            print("   2. 최신 모델 이름 사용 (예: gemini-1.5-flash-latest)")
            print("   3. Google AI Studio에서 사용 가능한 모델 확인")
        
        # 429 (ResourceExhausted) - 속도 제한 또는 할당량 초과
        elif '429' in error_msg or 'resourceexhausted' in error_msg_lower or 'rate limit' in error_msg_lower or 'quota' in error_msg_lower or 'rpm' in error_msg_lower:
            print("\n⚠️  에러 코드: 429 (ResourceExhausted)")
            print("   이유: 속도 제한(RPM) 또는 할당량 초과")
            print("   상세:")
            print("   - 무료 티어는 월 15 RPM (Requests Per Minute) 제한이 있습니다")
            print("   - 1분에 15개 이상의 요청을 보내면 이 에러가 발생합니다")
            print("   해결 방법:")
            print("   1. 1분 정도 기다린 후 다시 시도")
            print("   2. Google AI Studio에서 사용량 확인")
            print("   3. 요청 간격을 늘려서 사용")
        
        # 403 (PermissionDenied) - API 키 오류 또는 지역 제한
        elif '403' in error_msg or 'permissiondenied' in error_msg_lower or 'permission' in error_msg_lower or 'forbidden' in error_msg_lower:
            print("\n⚠️  에러 코드: 403 (PermissionDenied)")
            print("   이유: API 키가 틀렸거나 지역 제한 문제")
            print("   상세:")
            print("   - API 키가 유효하지 않거나 만료되었을 수 있습니다")
            print("   - 일부 지역에서는 Gemini API 사용이 제한될 수 있습니다")
            print("   해결 방법:")
            print("   1. .env 파일의 GEMINI_API_KEY 확인")
            print("   2. Google AI Studio (https://aistudio.google.com/app/apikey)에서 새 API 키 발급")
            print("   3. API 키가 활성화되어 있는지 확인")
            print("   4. VPN 사용 여부 확인 (지역 제한 가능)")
        
        # 401 (Unauthenticated) - 인증 오류
        elif '401' in error_msg or 'unauthenticated' in error_msg_lower or 'authentication' in error_msg_lower or 'invalid' in error_msg_lower:
            print("\n⚠️  에러 코드: 401 (Unauthenticated)")
            print("   이유: API 키 인증 실패")
            print("   해결 방법:")
            print("   1. .env 파일의 GEMINI_API_KEY가 올바른지 확인")
            print("   2. API 키 앞뒤에 공백이나 따옴표가 없는지 확인")
            print("   3. Google AI Studio에서 새 API 키 발급")
        
        # 기타 에러 - 네트워크 또는 라이브러리 설정 문제
        else:
            print("\n⚠️  기타 오류: 네트워크 혹은 라이브러리 설정 문제")
            print("   가능한 원인:")
            print("   1. 네트워크 연결 문제")
            print("   2. google-generativeai 라이브러리 버전 문제")
            print("   3. Python 환경 설정 문제")
            print("   4. 모델 이름 오류")
            print("   해결 방법:")
            print("   1. 인터넷 연결 확인")
            print("   2. 라이브러리 재설치: pip install --upgrade google-generativeai")
            print("   3. Python 버전 확인 (3.8 이상 필요)")
            print("   4. 방화벽 설정 확인")
            print("   5. genai.list_models()로 사용 가능한 모델 확인")
        
        print("="*60 + "\n")
        
        return False

if __name__ == "__main__":
    print("🧪 Google Gemini API 연결 테스트 시작\n")
    success = test_gemini_connection()
    
    if success:
        print("✅ 테스트 완료: 연결 성공")
        exit(0)
    else:
        print("❌ 테스트 완료: 연결 실패")
        exit(1)

