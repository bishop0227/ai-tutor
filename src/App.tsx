import { useState, useEffect } from 'react';
import Login from './components/Login';
import SignUp from './components/SignUp';
import Welcome from './components/Welcome';
import OnboardingSimple from './components/Onboarding.simple';
import Dashboard from './components/Dashboard';
import SubjectDetail from './components/SubjectDetail';
import Settings from './components/Settings';
import ConceptLearningPage from './components/ConceptLearningPage';
import QuizPage from './components/QuizPage';
import StudyPlanPage from './components/StudyPlanPage';
import { getUser } from './services/api';

type AppState = 'login' | 'signup' | 'welcome' | 'onboarding' | 'dashboard' | 'subject' | 'settings' | 'concept' | 'quiz' | 'study-plan';

function App() {
  const [appState, setAppState] = useState<AppState>('login');
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<{
    id: number;
    username: string;
  } | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);
  const [error] = useState<string | null>(null);

  // URL 경로 기반 라우팅 처리
  useEffect(() => {
    const checkPath = () => {
      const pathname = window.location.pathname;
      const quizMatch = pathname.match(/^\/quiz\/(\d+)$/);
      if (quizMatch) {
        const quizId = parseInt(quizMatch[1]);
        if (!isNaN(quizId) && userInfo) {
          setSelectedQuizId(quizId);
          setAppState('quiz');
          // URL 쿼리 파라미터에서 모드 확인
          const urlParams = new URLSearchParams(window.location.search);
          const mode = urlParams.get('mode') || 'view';
          if (mode === 'retake') {
            localStorage.setItem(`quiz_${quizId}_mode`, 'retake');
          } else {
            localStorage.removeItem(`quiz_${quizId}_mode`);
          }
          return;
        }
      }
      const studyPlanMatch = pathname.match(/^\/subject\/(\d+)\/plan$/);
      if (studyPlanMatch) {
        const subjectId = parseInt(studyPlanMatch[1]);
        if (!isNaN(subjectId) && userInfo) {
          setSelectedSubjectId(subjectId);
          setAppState('study-plan');
          return;
        }
      }
      const conceptMatch = pathname.match(/^\/subject\/(\d+)\/week\/(\d+)\/concept$/);
      if (conceptMatch) {
        const subjectId = parseInt(conceptMatch[1]);
        const weekId = parseInt(conceptMatch[2]);
        if (!isNaN(subjectId) && !isNaN(weekId) && userInfo) {
          setSelectedSubjectId(subjectId);
          setSelectedWeekId(weekId);
          setAppState('concept');
          return;
        }
      }
      const subjectMatch = pathname.match(/^\/subject\/(\d+)$/);
      if (subjectMatch) {
        const subjectId = parseInt(subjectMatch[1]);
        if (!isNaN(subjectId) && userInfo) {
          setSelectedSubjectId(subjectId);
          setSelectedWeekId(null);
          setAppState('subject');
          return;
        }
      } else if (pathname === '/settings' && userInfo) {
        setAppState('settings');
        return;
      } else if ((pathname === '/' || pathname === '') && userInfo) {
        // 루트 경로로 돌아왔을 때
        setSelectedSubjectId(null);
        setSelectedWeekId(null);
        setSelectedQuizId(null);
        setAppState('dashboard');
      }
    };

    // 초기 체크
    checkPath();

    // popstate 이벤트 리스너 (뒤로가기/앞으로가기)
    const handlePopState = () => {
      checkPath();
    };
    window.addEventListener('popstate', handlePopState);

    // 커스텀 이벤트 리스너 (프로그래밍 방식 경로 변경)
    const handlePathChange = () => {
      checkPath();
    };
    window.addEventListener('pathchange', handlePathChange);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('pathchange', handlePathChange);
    };
  }, [userInfo]);

  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        const userId = localStorage.getItem('user_id');

        if (userId) {
          // userId가 유효한 숫자인지 확인
          const userIdNum = parseInt(userId);
          if (isNaN(userIdNum)) {
            console.warn('Invalid user_id in localStorage, clearing...');
            localStorage.removeItem('user_id');
            localStorage.removeItem('username');
            localStorage.removeItem('onboarding_completed');
            setAppState('login');
            setIsLoading(false);
            return;
          }

          // 기존 로그인 정보 확인
          try {
            const response = await getUser(userIdNum);
            const user = response.user;
            
            if (user && user.id) {
              setUserInfo({
                id: user.id,
                username: user.username,
              });
              
              // 온보딩 완료 여부 확인
              if (user.onboarding_completed) {
                // URL 경로 확인 - settings가 아니면 dashboard로
                const pathname = window.location.pathname;
                if (pathname === '/settings') {
                  setAppState('settings');
                } else {
                  // 메인 화면(대시보드)으로 이동
                  window.history.pushState({}, '', '/');
                  setAppState('dashboard');
                }
              } else {
                setAppState('onboarding');
              }
            } else {
              // 사용자 정보가 없으면 로그인 화면으로
              console.warn('User not found, clearing localStorage...');
              localStorage.removeItem('user_id');
              localStorage.removeItem('username');
              localStorage.removeItem('onboarding_completed');
              setAppState('login');
            }
          } catch (err) {
            console.error('Failed to get user info:', err);
            // 사용자 정보를 가져올 수 없으면 로그인 화면으로
            // 백엔드 서버가 실행되지 않았거나 네트워크 오류일 수 있음
            localStorage.removeItem('user_id');
            localStorage.removeItem('username');
            localStorage.removeItem('onboarding_completed');
            setAppState('login');
          }
        } else {
          // 로그인 정보가 없으면 로그인 화면으로
          setAppState('login');
        }
      } catch (error) {
        console.error('Error checking user status:', error);
        // 에러가 발생해도 로그인 화면을 보여줌
        setAppState('login');
      } finally {
        setIsLoading(false);
      }
    };

    checkUserStatus();
  }, []);

  const handleLoginSuccess = (user: { id: number; username: string }) => {
    setUserInfo(user);
    // 온보딩 완료 여부 확인
    const onboardingCompleted = localStorage.getItem('onboarding_completed') === 'true';
    if (onboardingCompleted) {
      // 로그인 성공 시 메인 화면(대시보드)으로 이동
      window.history.pushState({}, '', '/');
      setAppState('dashboard');
    } else {
      setAppState('onboarding');
    }
  };

  const handleSignUpClick = () => {
    setAppState('signup');
  };

  const handleSignUpSuccess = (user: { id: number; username: string }) => {
    setUserInfo(user);
    setAppState('welcome');
  };

  const handleWelcomeContinue = () => {
    setAppState('onboarding');
  };

  const handleOnboardingComplete = () => {
    setAppState('dashboard');
  };

  const handleLogout = () => {
    // 로그아웃 처리
    localStorage.removeItem('onboarding_completed');
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    setUserInfo(null);
    setAppState('login');
  };

  if (isLoading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f3f4f6'
      }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div style={{ fontSize: '1.25rem' }}>로딩 중...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#fee',
        padding: '20px'
      }}>
        <div style={{ 
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '8px',
          maxWidth: '600px'
        }}>
          <h2 style={{ color: '#d00', marginBottom: '16px' }}>에러 발생</h2>
          <p style={{ color: '#666' }}>{error}</p>
        </div>
      </div>
    );
  }

  // 로그인 화면 (기본값)
  if (appState === 'login' || !appState) {
    return <Login onLoginSuccess={handleLoginSuccess} onSignUp={handleSignUpClick} />;
  }

  // 회원가입 화면
  if (appState === 'signup') {
    return <SignUp onSignUpSuccess={handleSignUpSuccess} onBackToLogin={() => setAppState('login')} />;
  }

  // 환영 화면
  if (appState === 'welcome' && userInfo) {
    return <Welcome username={userInfo.username} onContinue={handleWelcomeContinue} />;
  }

  // 온보딩 화면
  if (appState === 'onboarding' && userInfo) {
    return <OnboardingSimple userId={userInfo.id} onComplete={handleOnboardingComplete} />;
  }

  // 대시보드 화면
  if (appState === 'dashboard' && userInfo) {
    return (
      <Dashboard
        userId={userInfo.id}
        username={userInfo.username}
        onLogout={handleLogout}
        onSubjectClick={(subjectId) => {
          setSelectedSubjectId(subjectId);
          setAppState('subject');
        }}
        onSettingsClick={() => {
          window.history.pushState({}, '', '/settings');
          setAppState('settings');
        }}
      />
    );
  }

  // 설정 화면
  if (appState === 'settings' && userInfo) {
    return (
      <Settings
        userId={userInfo.id}
        onBack={() => {
          window.history.pushState({}, '', '/');
          setAppState('dashboard');
        }}
        onLogout={handleLogout}
      />
    );
  }

  // 과목 상세 화면 (URL 경로 기반)
  if (appState === 'subject' && userInfo && selectedSubjectId) {
    return (
      <SubjectDetail
        subjectId={selectedSubjectId}
        onBack={() => {
          window.location.href = '/';
        }}
      />
    );
  }

  // Concept Learning 화면
  if (appState === 'concept' && userInfo && selectedSubjectId && selectedWeekId) {
    return (
      <ConceptLearningPage
        subjectId={selectedSubjectId}
        weekId={selectedWeekId}
        onBack={() => {
          window.history.pushState({}, '', `/subject/${selectedSubjectId}`);
          window.dispatchEvent(new CustomEvent('pathchange'));
        }}
      />
    );
  }

  // Quiz 화면
  if (appState === 'quiz' && userInfo && selectedQuizId) {
    const userId = userInfo.id;
    // QuizPage에서 subject_id를 가져올 수 있도록 처리
    // QuizPage 내부에서 subject_id를 로드하므로, onBack에서 처리
    // URL에서 모드 확인 또는 localStorage에서 확인
    const urlParams = new URLSearchParams(window.location.search);
    const modeFromUrl = urlParams.get('mode') as 'view' | 'retake' | null;
    const modeFromStorage = localStorage.getItem(`quiz_${selectedQuizId}_mode`) as 'view' | 'retake' | null;
    const quizMode = modeFromUrl || modeFromStorage || 'view';
    
    return (
      <QuizPage
        quizId={selectedQuizId}
        userId={userId}
        mode={quizMode}
        onBack={() => {
          // QuizPage에서 로드한 subject_id를 사용하여 과목 상세 페이지로 이동
          // QuizPage 내부에서 subject_id를 전달받아 사용
          // 우선 대시보드로 이동하고, QuizPage에서 subject_id를 확인하여 처리
          window.history.pushState({}, '', '/');
          window.dispatchEvent(new CustomEvent('pathchange'));
        }}
      />
    );
  }

  // Study Plan 화면
  if (appState === 'study-plan' && userInfo && selectedSubjectId) {
    return (
      <StudyPlanPage
        subjectId={selectedSubjectId}
        onBack={() => {
          window.history.pushState({}, '', `/subject/${selectedSubjectId}`);
          window.dispatchEvent(new CustomEvent('pathchange'));
        }}
      />
    );
  }

  // 예상치 못한 상태 - 로그인 화면으로 폴백
  console.warn('Unexpected app state:', appState, 'userInfo:', userInfo);
  return <Login onLoginSuccess={handleLoginSuccess} onSignUp={handleSignUpClick} />;
}

export default App;
