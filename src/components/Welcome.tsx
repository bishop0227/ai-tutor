/**
 * 환영 화면 컴포넌트
 * 회원가입 완료 후 표시
 */

import { useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { GraduationCap, Sparkles } from 'lucide-react';

interface WelcomeProps {
  username: string;
  onContinue: () => void;
}

export default function Welcome({ username, onContinue }: WelcomeProps) {
  useEffect(() => {
    // 3초 후 자동으로 온보딩으로 이동
    const timer = setTimeout(() => {
      onContinue();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onContinue]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardContent className="pt-12 pb-12 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="rounded-full bg-primary/10 p-6 animate-pulse">
                <GraduationCap className="h-16 w-16 text-primary" />
              </div>
              <div className="absolute -top-2 -right-2">
                <Sparkles className="h-8 w-8 text-yellow-400 animate-bounce" />
              </div>
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            어서오세요! 👋
          </h1>
          
          <p className="text-xl text-gray-700 mb-2">
            <span className="font-semibold text-primary">{username}</span>님,
          </p>
          
          <p className="text-lg text-gray-600 mb-8">
            AI 튜터에 가입해주셔서 감사합니다!
          </p>
          
          <p className="text-sm text-gray-500 animate-pulse">
            잠시 후 학습 성향 분석을 시작합니다...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}


