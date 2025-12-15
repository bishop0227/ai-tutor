/**
 * 간단한 테스트용 Onboarding 컴포넌트
 */

export default function OnboardingTest() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      padding: '40px',
      backgroundColor: '#f0f0f0'
    }}>
      <div style={{ 
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '8px',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <h1 style={{ fontSize: '32px', marginBottom: '20px' }}>
          학습 성향 분석
        </h1>
        <p style={{ color: '#666', marginBottom: '30px' }}>
          테스트 컴포넌트가 정상적으로 로드되었습니다.
        </p>
        <div style={{ 
          padding: '20px',
          backgroundColor: '#e3f2fd',
          borderRadius: '4px'
        }}>
          <p>이 메시지가 보이면 React 컴포넌트는 정상 작동 중입니다.</p>
          <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
            다음 단계: UI 컴포넌트들을 하나씩 추가해가며 문제를 찾아봅시다.
          </p>
        </div>
      </div>
    </div>
  );
}



