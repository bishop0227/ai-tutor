/**
 * 로그인 컴포넌트
 * 아이디/비밀번호 로그인 및 소셜 로그인
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { LogIn, GraduationCap, Lock, User } from 'lucide-react';
import { login } from '../services/api';

interface LoginProps {
  onLoginSuccess: (user: { id: number; username: string }) => void;
  onSignUp: () => void;
}

export default function Login({ onLoginSuccess, onSignUp }: LoginProps) {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!loginId.trim()) {
      setError('아이디를 입력해주세요.');
      return;
    }

    if (!password) {
      setError('비밀번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await login({
        login_id: loginId.trim(),
        password: password,
      });

      const user = response.user;

      if (user && user.id) {
        // 로그인 성공 - 사용자 정보 저장
        localStorage.setItem('user_id', user.id.toString());
        localStorage.setItem('username', user.username);
        localStorage.setItem('onboarding_completed', user.onboarding_completed ? 'true' : 'false');

        onLoginSuccess({
          id: user.id,
          username: user.username,
        });
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('존재하지 않습니다')) {
        setError('아이디가 존재하지 않습니다.');
      } else if (err instanceof Error && err.message.includes('비밀번호')) {
        setError('비밀번호가 틀렸습니다.');
      } else {
        setError(err instanceof Error ? err.message : '로그인에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-4">
              <GraduationCap className="h-12 w-12 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">AI 튜터에 오신 것을 환영합니다</CardTitle>
          <CardDescription className="text-base">
            로그인하여 학습을 시작하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login_id">아이디</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="login_id"
                  type="text"
                  placeholder="아이디를 입력하세요"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="비밀번호를 입력하세요"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full gap-2"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  로그인 중...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  로그인
                </>
              )}
            </Button>


            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onSignUp}
              disabled={isLoading}
            >
              처음이신가요? 회원가입하기
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
