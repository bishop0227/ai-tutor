/**
 * 간단한 버전의 Onboarding 컴포넌트 (인라인 스타일만 사용)
 */

import { useState, useEffect } from 'react';
import { saveUserProfile } from '../services/api';

// 컴포넌트 마운트 확인
console.log('OnboardingSimple component file loaded');

const questions = [
  {
    id: 'exam_style' as const,
    title: '시험 기간이 다가오면?',
    options: [
      { value: '미리미리', label: '🐣 미리미리 계획형' },
      { value: '벼락치기', label: '🔥 발등에 불 벼락치기' },
    ],
  },
  {
    id: 'learning_depth' as const,
    title: '새로운 개념을 배울 땐?',
    options: [
      { value: '원리파악', label: '🧐 원리부터 깊게' },
      { value: '직관이해', label: '💡 비유로 쉽고 빠르게' },
    ],
  },
  {
    id: 'material_preference' as const,
    title: '더 좋아하는 자료는?',
    options: [
      { value: '텍스트', label: '📝 깔끔한 텍스트 정리' },
      { value: '영상', label: '📺 유튜브 영상 시청' },
    ],
  },
  {
    id: 'practice_style' as const,
    title: '공부 스타일은?',
    options: [
      { value: '이론중심', label: '📚 이론 완벽 마스터' },
      { value: '문제중심', label: '⚔️ 일단 문제 박치기' },
    ],
  },
  {
    id: 'ai_persona' as const,
    title: '선호하는 AI 선생님은?',
    options: [
      { value: '격려형', label: '🥰 칭찬해주는 당근형' },
      { value: '엄격형', label: '🤖 팩트 날리는 채찍형' },
    ],
  },
];

interface OnboardingSimpleProps {
  userId: number;
  onComplete?: () => void;
}

export default function OnboardingSimple({ userId, onComplete }: OnboardingSimpleProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    console.log('OnboardingSimple component mounted');
  }, []);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const unansweredQuestions = questions.filter((q) => !answers[q.id]);
    if (unansweredQuestions.length > 0) {
      setError('모든 질문에 답변해주세요.');
      return;
    }

    setIsLoading(true);

    try {
      await saveUserProfile(userId, {
        exam_style: answers.exam_style as '미리미리' | '벼락치기',
        learning_depth: answers.learning_depth as '원리파악' | '직관이해',
        material_preference: answers.material_preference as '텍스트' | '영상',
        practice_style: answers.practice_style as '이론중심' | '문제중심',
        ai_persona: answers.ai_persona as '격려형' | '엄격형',
      });

      setSuccess(true);

      // 온보딩 완료 표시
      localStorage.setItem('onboarding_completed', 'true');

      // 완료 콜백 호출
      if (onComplete) {
        setTimeout(() => {
          onComplete();
        }, 1500);
      } else {
        // 기본 동작: 페이지 새로고침
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '온보딩 저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(to bottom right, #dbeafe, #bfdbfe)',
        padding: '20px'
      }}>
        <div style={{ 
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '8px',
          maxWidth: '500px',
          width: '100%',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '60px', marginBottom: '20px' }}>✅</div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>
            설정이 저장되었습니다
          </h2>
          <p style={{ color: '#666' }}>잠시 후 메인 화면으로 이동합니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #dbeafe, #bfdbfe)',
      padding: '20px'
    }}>
      <div style={{ 
        maxWidth: '800px',
        margin: '0 auto',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        padding: '40px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '10px' }}>
            학습 성향 분석
          </h1>
          <p style={{ color: '#666', fontSize: '18px' }}>
            당신에게 맞는 AI 튜터를 만들기 위해 몇 가지 질문에 답해주세요
          </p>
          <p style={{ color: '#999', fontSize: '14px', marginTop: '8px' }}>
            모든 질문에 답변해주시면 더 나은 학습 경험을 제공할 수 있습니다
          </p>
        </div>

        <form onSubmit={handleSubmit}>

          {/* 질문 리스트 */}
          <div style={{ marginBottom: '30px' }}>
            {questions.map((question) => (
              <div key={question.id} style={{ marginBottom: '30px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '15px', 
                  fontWeight: '600',
                  fontSize: '18px'
                }}>
                  {question.title}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {question.options.map((option) => {
                    const isSelected = answers[question.id] === option.value;
                    return (
                      <div
                        key={option.value}
                        onClick={() => handleAnswerChange(question.id, option.value)}
                        style={{
                          padding: '20px',
                          border: `2px solid ${isSelected ? '#3b82f6' : '#e5e7eb'}`,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? '#eff6ff' : 'white',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}
                      >
                        <input
                          type="radio"
                          name={question.id}
                          value={option.value}
                          checked={isSelected}
                          onChange={() => handleAnswerChange(question.id, option.value)}
                          style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '16px', fontWeight: isSelected ? '600' : '400' }}>
                          {option.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div style={{ 
              padding: '15px',
              backgroundColor: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              marginBottom: '20px',
              color: '#991b1b'
            }}>
              {error}
            </div>
          )}

          {/* 시작하기 버튼 */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '15px',
              backgroundColor: isLoading ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '18px',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            {isLoading ? '저장 중...' : '시작하기'}
          </button>
        </form>
      </div>
    </div>
  );
}

