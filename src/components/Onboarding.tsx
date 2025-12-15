/**
 * 학습 성향 온보딩 컴포넌트
 * 5가지 성향 분석 질문을 통해 사용자의 학습 스타일을 파악합니다.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { saveUserProfile, type UserProfile } from '../services/api';

// 질문 데이터 타입
interface Question {
  id: keyof Omit<UserProfile, 'id' | 'username' | 'email' | 'created_at' | 'updated_at'>;
  title: string;
  options: {
    value: string;
    label: string;
    emoji: string;
  }[];
}

const questions: Question[] = [
  {
    id: 'exam_style',
    title: '시험 기간이 다가오면?',
    options: [
      { value: '미리미리', label: '미리미리 계획형', emoji: '🐣' },
      { value: '벼락치기', label: '발등에 불 벼락치기', emoji: '🔥' },
    ],
  },
  {
    id: 'learning_depth',
    title: '새로운 개념을 배울 땐?',
    options: [
      { value: '원리파악', label: '원리부터 깊게', emoji: '🧐' },
      { value: '직관이해', label: '비유로 쉽고 빠르게', emoji: '💡' },
    ],
  },
  {
    id: 'material_preference',
    title: '더 좋아하는 자료는?',
    options: [
      { value: '텍스트', label: '깔끔한 텍스트 정리', emoji: '📝' },
      { value: '영상', label: '유튜브 영상 시청', emoji: '📺' },
    ],
  },
  {
    id: 'practice_style',
    title: '공부 스타일은?',
    options: [
      { value: '이론중심', label: '이론 완벽 마스터', emoji: '📚' },
      { value: '문제중심', label: '일단 문제 박치기', emoji: '⚔️' },
    ],
  },
  {
    id: 'ai_persona',
    title: '선호하는 AI 선생님은?',
    options: [
      { value: '격려형', label: '칭찬해주는 당근형', emoji: '🥰' },
      { value: '엄격형', label: '팩트 날리는 채찍형', emoji: '🤖' },
    ],
  },
];

export default function Onboarding() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 유효성 검사
    if (!username.trim()) {
      setError('사용자명을 입력해주세요.');
      return;
    }

    if (!email.trim()) {
      setError('이메일을 입력해주세요.');
      return;
    }

    // 모든 질문에 답변했는지 확인
    const unansweredQuestions = questions.filter((q) => !answers[q.id]);
    if (unansweredQuestions.length > 0) {
      setError('모든 질문에 답변해주세요.');
      return;
    }

    setIsLoading(true);

    try {
      // userId는 localStorage에서 가져오기
      const userId = parseInt(localStorage.getItem('user_id') || '0');
      if (!userId) {
        setError('사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.');
        return;
      }

      await saveUserProfile(userId, {
        exam_style: answers.exam_style as '미리미리' | '벼락치기',
        learning_depth: answers.learning_depth as '원리파악' | '직관이해',
        material_preference: answers.material_preference as '텍스트' | '영상',
        practice_style: answers.practice_style as '이론중심' | '문제중심',
        ai_persona: answers.ai_persona as '격려형' | '엄격형',
      });
      setSuccess(true);

      // 성공 메시지 표시 후 메인 화면으로 이동
      setTimeout(() => {
        localStorage.setItem('onboarding_completed', 'true');
        window.location.reload();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : '프로필 저장에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold mb-2">설정이 저장되었습니다</h2>
            <p className="text-muted-foreground">잠시 후 메인 화면으로 이동합니다...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-3xl font-bold">학습 성향 분석</CardTitle>
            <CardDescription className="text-lg mt-2">
              당신에게 맞는 AI 튜터를 만들기 위해 몇 가지 질문에 답해주세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 기본 정보 */}
              <div className="space-y-4 pb-4 border-b">
                <div className="space-y-2">
                  <Label htmlFor="username">사용자명</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="홍길동"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">이메일</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@university.ac.kr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* 질문 리스트 */}
              <div className="space-y-6">
                {questions.map((question) => (
                  <div key={question.id} className="space-y-3">
                    <Label className="text-base font-semibold">{question.title}</Label>
                    <RadioGroup
                      value={answers[question.id] || ''}
                      onValueChange={(value) => handleAnswerChange(question.id, value)}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {question.options.map((option) => (
                          <div
                            key={option.value}
                            className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              answers[question.id] === option.value
                                ? 'border-primary bg-primary/5 shadow-md'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-accent'
                            }`}
                            onClick={() => handleAnswerChange(question.id, option.value)}
                          >
                            <RadioGroupItem
                              value={option.value}
                              id={`${question.id}-${option.value}`}
                            />
                            <Label
                              htmlFor={`${question.id}-${option.value}`}
                              className="flex-1 cursor-pointer flex items-center gap-2"
                            >
                              <span className="text-2xl">{option.emoji}</span>
                              <span className="font-medium">{option.label}</span>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  </div>
                ))}
              </div>

              {/* 에러 메시지 */}
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {/* 시작하기 버튼 */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? '저장 중...' : '시작하기'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
