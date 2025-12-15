/**
 * Dashboard 테스트 컴포넌트
 * Tailwind CSS가 제대로 작동하는지 확인용
 */

export default function DashboardTest() {
  return (
    <div style={{ padding: '40px', backgroundColor: '#f0f0f0' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>Dashboard 테스트</h1>
      
      {/* 인라인 스타일 테스트 */}
      <div style={{ 
        padding: '20px', 
        backgroundColor: 'white', 
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>인라인 스타일 테스트</h2>
        <p>이 박스가 보이면 React는 정상 작동 중입니다.</p>
      </div>

      {/* Tailwind CSS 테스트 */}
      <div className="p-5 bg-white rounded-lg shadow-md mb-5">
        <h2 className="text-lg font-bold mb-2">Tailwind CSS 테스트</h2>
        <p className="text-gray-600">이 텍스트가 회색으로 보이면 Tailwind가 작동 중입니다.</p>
        <button className="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Tailwind 버튼 테스트
        </button>
      </div>

      {/* 그라데이션 테스트 */}
      <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg mb-5">
        <h2 className="text-lg font-bold mb-2">그라데이션 테스트</h2>
        <p>이 박스가 파란색 그라데이션으로 보이면 그라데이션이 작동 중입니다.</p>
      </div>

      {/* Flex 레이아웃 테스트 */}
      <div className="flex items-center justify-between p-5 bg-white rounded-lg">
        <span>왼쪽</span>
        <span>중앙</span>
        <span>오른쪽</span>
      </div>
    </div>
  );
}



