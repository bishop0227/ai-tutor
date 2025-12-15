/**
 * 설정 페이지 컴포넌트
 * 프로필, 계정/보안, 일반/테마, 알림, 정보 설정을 관리합니다.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import {
  User,
  Lock,
  Bell,
  Palette,
  Info,
  Trash2,
  Save,
  Eye,
  EyeOff,
  Upload,
  ArrowLeft,
} from 'lucide-react';
import {
  getUser,
  updateProfile,
  changePassword,
  deleteAccount,
  updatePreferences,
  type UserProfile,
} from '../services/api';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';

interface SettingsProps {
  userId: number;
  onBack: () => void;
  onLogout: () => void;
}

type TabValue = 'profile' | 'account' | 'general' | 'notifications' | 'about';

export default function Settings({ userId, onBack, onLogout }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<TabValue>('profile');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 프로필 수정
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [school, setSchool] = useState('');
  const [major, setMajor] = useState('');
  const [grade, setGrade] = useState(1);

  // 비밀번호 변경
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 테마 설정
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');

  // 알림 설정
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  // 회원 탈퇴 확인 모달
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    loadUserData();
  }, [userId]);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const response = await getUser(userId);
      const userData = response.user;
      setUser(userData);
      setUsername(userData.username || '');
      setEmail(userData.email || '');
      setSchool(userData.school || '');
      setMajor(userData.major || '');
      setGrade(userData.grade || 1);
      setTheme(userData.theme || 'light');
      setEmailNotifications(userData.email_notifications ?? true);
      setPushNotifications(userData.push_notifications ?? true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '사용자 정보를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      await updateProfile(userId, {
        username: username.trim(),
        email: email.trim() || undefined,
        school: school.trim(),
        major: major.trim(),
        grade: grade,
      });

      setSuccess('프로필이 업데이트되었습니다.');
      await loadUserData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '프로필 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      if (newPassword !== confirmPassword) {
        setError('새 비밀번호가 일치하지 않습니다.');
        return;
      }

      if (newPassword.length < 6) {
        setError('비밀번호는 최소 6자 이상이어야 합니다.');
        return;
      }

      await changePassword(userId, currentPassword, newPassword);

      setSuccess('비밀번호가 변경되었습니다.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '비밀번호 변경에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      await updatePreferences(userId, {
        theme,
        email_notifications: emailNotifications,
        push_notifications: pushNotifications,
      });

      setSuccess('설정이 저장되었습니다.');
      applyTheme(theme);
      await loadUserData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '설정 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== '삭제') {
      setError('정확히 "삭제"라고 입력해주세요.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      await deleteAccount(userId);

      // 로그아웃 처리
      localStorage.removeItem('user_id');
      localStorage.removeItem('username');
      localStorage.removeItem('onboarding_completed');
      onLogout();
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원 탈퇴에 실패했습니다.');
      setIsSaving(false);
    }
  };

  const applyTheme = (selectedTheme: 'light' | 'dark' | 'system') => {
    const root = document.documentElement;
    
    if (selectedTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    } else if (selectedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    localStorage.setItem('theme', selectedTheme);
  };

  useEffect(() => {
    // 초기 테마 적용
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } else if (user?.theme) {
      setTheme(user.theme);
      applyTheme(user.theme);
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-lg">로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="container mx-auto max-w-6xl py-8">
        {/* 헤더 */}
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">설정</h1>
        </div>

        {/* 에러/성공 메시지 */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400">
            {success}
          </div>
        )}

        {/* 탭 메뉴 */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="w-full">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* 좌측: 탭 리스트 */}
            <div className="lg:col-span-1">
              <TabsList className="flex flex-col h-auto w-full bg-white dark:bg-gray-800 p-2">
                <TabsTrigger value="profile" className="w-full justify-start gap-2">
                  <User className="h-4 w-4" />
                  프로필
                </TabsTrigger>
                <TabsTrigger value="account" className="w-full justify-start gap-2">
                  <Lock className="h-4 w-4" />
                  계정/보안
                </TabsTrigger>
                <TabsTrigger value="general" className="w-full justify-start gap-2">
                  <Palette className="h-4 w-4" />
                  일반/테마
                </TabsTrigger>
                <TabsTrigger value="notifications" className="w-full justify-start gap-2">
                  <Bell className="h-4 w-4" />
                  알림
                </TabsTrigger>
                <TabsTrigger value="about" className="w-full justify-start gap-2">
                  <Info className="h-4 w-4" />
                  정보
                </TabsTrigger>
              </TabsList>
            </div>

            {/* 우측: 탭 내용 */}
            <div className="lg:col-span-3">
              {/* 프로필 탭 */}
              <TabsContent value="profile">
                <Card>
                    <CardHeader>
                    <CardTitle>프로필</CardTitle>
                    <CardDescription>닉네임, 이메일, 학교 정보를 변경할 수 있습니다.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">닉네임</Label>
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="닉네임을 입력하세요"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">이메일</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="이메일을 입력하세요 (선택사항)"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="school">학교</Label>
                      <Input
                        id="school"
                        value={school}
                        onChange={(e) => setSchool(e.target.value)}
                        placeholder="학교명을 입력하세요"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="major">학과</Label>
                      <Input
                        id="major"
                        value={major}
                        onChange={(e) => setMajor(e.target.value)}
                        placeholder="학과를 입력하세요"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="grade">학년</Label>
                      <Input
                        id="grade"
                        type="number"
                        min="1"
                        max="4"
                        value={grade}
                        onChange={(e) => setGrade(parseInt(e.target.value) || 1)}
                        placeholder="학년을 입력하세요 (1-4)"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>프로필 사진</Label>
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <User className="h-10 w-10 text-gray-400" />
                        </div>
                        <Button variant="outline" size="sm">
                          <Upload className="h-4 w-4 mr-2" />
                          사진 변경
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">프로필 사진 변경 기능은 준비 중입니다.</p>
                    </div>
                    <Button onClick={handleSaveProfile} disabled={isSaving}>
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? '저장 중...' : '저장'}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 계정/보안 탭 */}
              <TabsContent value="account">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>비밀번호 변경</CardTitle>
                      <CardDescription>보안을 위해 정기적으로 비밀번호를 변경하세요.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">현재 비밀번호</Label>
                        <div className="relative">
                          <Input
                            id="currentPassword"
                            type={showCurrentPassword ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="현재 비밀번호를 입력하세요"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          >
                            {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">새 비밀번호</Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="새 비밀번호를 입력하세요 (최소 6자)"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="새 비밀번호를 다시 입력하세요"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <Button onClick={handleChangePassword} disabled={isSaving}>
                        <Lock className="h-4 w-4 mr-2" />
                        {isSaving ? '변경 중...' : '비밀번호 변경'}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-red-200 dark:border-red-800">
                    <CardHeader>
                      <CardTitle className="text-red-600 dark:text-red-400">회원 탈퇴</CardTitle>
                      <CardDescription>계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        variant="destructive"
                        onClick={() => setShowDeleteModal(true)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        회원 탈퇴
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* 일반/테마 탭 */}
              <TabsContent value="general">
                <Card>
                  <CardHeader>
                    <CardTitle>테마 설정</CardTitle>
                    <CardDescription>앱의 색상 테마를 선택하세요.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>테마 모드</Label>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant={theme === 'light' ? 'default' : 'outline'}
                          onClick={() => setTheme('light')}
                          className="justify-start"
                        >
                          라이트 모드
                        </Button>
                        <Button
                          variant={theme === 'dark' ? 'default' : 'outline'}
                          onClick={() => setTheme('dark')}
                          className="justify-start"
                        >
                          다크 모드
                        </Button>
                        <Button
                          variant={theme === 'system' ? 'default' : 'outline'}
                          onClick={() => setTheme('system')}
                          className="justify-start"
                        >
                          시스템 설정 따르기
                        </Button>
                      </div>
                    </div>
                    <Button onClick={handleSavePreferences} disabled={isSaving}>
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? '저장 중...' : '설정 저장'}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 알림 탭 */}
              <TabsContent value="notifications">
                <Card>
                  <CardHeader>
                    <CardTitle>알림 설정</CardTitle>
                    <CardDescription>받고 싶은 알림을 선택하세요.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>이메일 알림</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          이메일로 알림을 받습니다.
                        </p>
                      </div>
                      <Switch
                        checked={emailNotifications}
                        onCheckedChange={setEmailNotifications}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>푸시 알림</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          앱 푸시 알림을 받습니다.
                        </p>
                      </div>
                      <Switch
                        checked={pushNotifications}
                        onCheckedChange={setPushNotifications}
                      />
                    </div>
                    <Button onClick={handleSavePreferences} disabled={isSaving}>
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? '저장 중...' : '설정 저장'}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 정보 탭 */}
              <TabsContent value="about">
                <Card>
                  <CardHeader>
                    <CardTitle>정보</CardTitle>
                    <CardDescription>서비스 정보 및 약관</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>앱 버전</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">v1.0.0</p>
                    </div>
                    <div className="space-y-2">
                      <Label>서비스 이용약관</Label>
                      <Button variant="outline" size="sm" onClick={() => alert('서비스 이용약관 페이지 준비 중입니다.')}>
                        약관 보기
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label>개인정보 처리방침</Label>
                      <Button variant="outline" size="sm" onClick={() => alert('개인정보 처리방침 페이지 준비 중입니다.')}>
                        방침 보기
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </div>
        </Tabs>

        {/* 회원 탈퇴 확인 모달 */}
        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-red-600 dark:text-red-400">회원 탈퇴 확인</DialogTitle>
              <DialogDescription>
                정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 모든 데이터가 영구적으로 삭제됩니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="deleteConfirm">
                  확인을 위해 <span className="font-bold text-red-600 dark:text-red-400">"삭제"</span>라고 입력하세요.
                </Label>
                <Input
                  id="deleteConfirm"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="삭제"
                  className="border-red-300 dark:border-red-700"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirmText('');
              }}>
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== '삭제' || isSaving}
              >
                {isSaving ? '삭제 중...' : '계정 삭제'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

