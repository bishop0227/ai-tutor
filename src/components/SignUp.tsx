/**
 * 회원가입 컴포넌트
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { UserPlus, GraduationCap, CheckCircle2, XCircle } from 'lucide-react';
import { register } from '../services/api';

interface SignUpProps {
  onSignUpSuccess: (user: { id: number; username: string }) => void;
  onBackToLogin: () => void;
}

export default function SignUp({ onSignUpSuccess, onBackToLogin }: SignUpProps) {
  const [formData, setFormData] = useState({
    login_id: '',
    password: '',
    passwordConfirm: '',
    username: '',
    school: '',
    major: '',
    grade: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 비밀번호 강도 체크 함수
  const checkPasswordStrength = (password: string) => {
    const checks = {
      length: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasDigit: /\d/.test(password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const passedChecks = Object.values(checks).filter(Boolean).length;
    const allChecksPassed = Object.values(checks).every(Boolean);

    let strength: 'very-weak' | 'weak' | 'medium' | 'strong' | 'very-strong' = 'very-weak';
    if (allChecksPassed && password.length >= 12) {
      strength = 'very-strong';
    } else if (allChecksPassed) {
      strength = 'strong';
    } else if (passedChecks >= 3) {
      strength = 'medium';
    } else if (passedChecks >= 2) {
      strength = 'weak';
    }

    return { checks, strength, passedChecks };
  };

  const passwordStrength = useMemo(() => {
    if (!formData.password) return null;
    return checkPasswordStrength(formData.password);
  }, [formData.password]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 유효성 검사
    if (!formData.login_id.trim()) {
      setError('아이디를 입력해주세요.');
      return;
    }

    if (formData.login_id.length < 4) {
      setError('아이디는 4자 이상이어야 합니다.');
      return;
    }

    if (!formData.password) {
      setError('비밀번호를 입력해주세요.');
      return;
    }

    // 비밀번호 유효성 검사
    if (formData.password.length < 8) {
      setError('비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }

    const passwordCheck = checkPasswordStrength(formData.password);
    if (!passwordCheck.checks.hasUpper || !passwordCheck.checks.hasLower || 
        !passwordCheck.checks.hasDigit || !passwordCheck.checks.hasSpecial) {
      setError('비밀번호는 영문 대문자, 소문자, 숫자, 특수문자를 모두 포함해야 합니다.');
      return;
    }

    if (formData.password !== formData.passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (!formData.username.trim()) {
      setError('사용자명을 입력해주세요.');
      return;
    }

    if (!formData.school.trim()) {
      setError('학교를 입력해주세요.');
      return;
    }

    if (!formData.major.trim()) {
      setError('학과를 입력해주세요.');
      return;
    }

    if (!formData.grade || parseInt(formData.grade) < 1 || parseInt(formData.grade) > 4) {
      setError('학년을 1~4 사이의 숫자로 입력해주세요.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await register({
        login_id: formData.login_id.trim(),
        password: formData.password,
        username: formData.username.trim(),
        school: formData.school.trim(),
        major: formData.major.trim(),
        grade: parseInt(formData.grade),
      });

      onSignUpSuccess({
        id: response.user.id!,
        username: response.user.username,
      });
    } catch (err) {
      if (err instanceof Error && err.message.includes('이미 사용 중인')) {
        setError('이미 사용 중인 아이디입니다.');
      } else {
        setError(err instanceof Error ? err.message : '회원가입에 실패했습니다. 다시 시도해주세요.');
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
          <CardTitle className="text-3xl font-bold">회원가입</CardTitle>
          <CardDescription className="text-base">
            계정을 생성하여 학습을 시작하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login_id">아이디</Label>
              <Input
                id="login_id"
                name="login_id"
                type="text"
                placeholder="4자 이상 입력"
                value={formData.login_id}
                onChange={handleChange}
                required
                disabled={isLoading}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="8자 이상, 영문/숫자/특수문자 포함"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
              
              {/* 비밀번호 강도 표시 */}
              {formData.password && passwordStrength && (
                <div className="space-y-2 mt-2">
                  {/* 강도 표시 바 */}
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        passwordStrength.strength === 'very-weak'
                          ? 'bg-red-500'
                          : passwordStrength.strength === 'weak'
                          ? 'bg-orange-500'
                          : passwordStrength.strength === 'medium'
                          ? 'bg-yellow-500'
                          : passwordStrength.strength === 'strong'
                          ? 'bg-blue-500'
                          : 'bg-green-500'
                      }`}
                      style={{
                        width: passwordStrength.strength === 'very-weak' ? '20%' :
                               passwordStrength.strength === 'weak' ? '40%' :
                               passwordStrength.strength === 'medium' ? '60%' :
                               passwordStrength.strength === 'strong' ? '80%' : '100%',
                      }}
                    />
                  </div>
                  
                  {/* 강도 텍스트 */}
                  <div className="text-xs font-medium">
                    {passwordStrength.strength === 'very-weak' && (
                      <span className="text-red-600">매우 약함</span>
                    )}
                    {passwordStrength.strength === 'weak' && (
                      <span className="text-orange-600">약함</span>
                    )}
                    {passwordStrength.strength === 'medium' && (
                      <span className="text-yellow-600">보통</span>
                    )}
                    {passwordStrength.strength === 'strong' && (
                      <span className="text-blue-600">강함</span>
                    )}
                    {passwordStrength.strength === 'very-strong' && (
                      <span className="text-green-600">매우 강함</span>
                    )}
                  </div>

                  {/* 조건 체크리스트 */}
                  <div className="space-y-1 text-xs">
                    <div className={`flex items-center gap-2 ${passwordStrength.checks.length ? 'text-gray-700' : 'text-gray-400'}`}>
                      {passwordStrength.checks.length ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-gray-400" />
                      )}
                      <span>최소 8자 이상</span>
                    </div>
                    <div className={`flex items-center gap-2 ${passwordStrength.checks.hasUpper ? 'text-gray-700' : 'text-gray-400'}`}>
                      {passwordStrength.checks.hasUpper ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-gray-400" />
                      )}
                      <span>영문 대문자 포함</span>
                    </div>
                    <div className={`flex items-center gap-2 ${passwordStrength.checks.hasLower ? 'text-gray-700' : 'text-gray-400'}`}>
                      {passwordStrength.checks.hasLower ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-gray-400" />
                      )}
                      <span>영문 소문자 포함</span>
                    </div>
                    <div className={`flex items-center gap-2 ${passwordStrength.checks.hasDigit ? 'text-gray-700' : 'text-gray-400'}`}>
                      {passwordStrength.checks.hasDigit ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-gray-400" />
                      )}
                      <span>숫자 포함</span>
                    </div>
                    <div className={`flex items-center gap-2 ${passwordStrength.checks.hasSpecial ? 'text-gray-700' : 'text-gray-400'}`}>
                      {passwordStrength.checks.hasSpecial ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-gray-400" />
                      )}
                      <span>특수문자 포함 (!@#$%^&* 등)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwordConfirm">비밀번호 확인</Label>
              <Input
                id="passwordConfirm"
                name="passwordConfirm"
                type="password"
                placeholder="비밀번호를 다시 입력하세요"
                value={formData.passwordConfirm}
                onChange={handleChange}
                required
                disabled={isLoading}
                className={formData.passwordConfirm && formData.password !== formData.passwordConfirm ? 'border-red-500' : formData.passwordConfirm && formData.password === formData.passwordConfirm ? 'border-green-500' : ''}
              />
              {formData.passwordConfirm && (
                <div className="flex items-center gap-2 text-xs">
                  {formData.password === formData.passwordConfirm ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      <span className="text-green-600">비밀번호가 일치합니다</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3.5 w-3.5 text-red-600" />
                      <span className="text-red-600">비밀번호가 일치하지 않습니다</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">사용자명</Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="홍길동"
                value={formData.username}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="school">학교</Label>
              <Input
                id="school"
                name="school"
                type="text"
                placeholder="예: 서울대학교"
                value={formData.school}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="major">학과</Label>
              <Input
                id="major"
                name="major"
                type="text"
                placeholder="예: 컴퓨터공학과"
                value={formData.major}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade">학년</Label>
              <Input
                id="grade"
                name="grade"
                type="number"
                min="1"
                max="4"
                placeholder="1~4"
                value={formData.grade}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
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
                  회원가입 중...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  회원가입
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onBackToLogin}
              disabled={isLoading}
            >
              로그인 화면으로 돌아가기
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}




