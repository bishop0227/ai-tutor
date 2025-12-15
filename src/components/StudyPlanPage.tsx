/**
 * 학습 계획 페이지 컴포넌트
 * D-Day부터 오늘까지의 일일 학습 계획을 캘린더 형식으로 표시
 */

import { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { ArrowLeft, CalendarDays, Loader2, RefreshCw, Bell, BellOff } from 'lucide-react';
import { getSubjectDetail, generateStudyPlan, toggleNotification, type SubjectDetail } from '../services/api';
import { Progress } from './ui/progress';

// 한국 시간 기준 오늘 날짜 계산 유틸리티 함수 (UTC+9)
const getKoreaToday = (): Date => {
  const now = new Date();
  // 현재 시간을 UTC 밀리초로 변환
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  // UTC에 9시간을 더해 한국 시간(UTC+9)으로 변환
  const koreaMs = utcMs + (9 * 60 * 60 * 1000); // UTC+9 (9시간 = 32400000ms)
  const koreaDate = new Date(koreaMs);
  
  // 한국 시간 기준 날짜 생성 (로컬 시간으로)
  const todayYear = koreaDate.getUTCFullYear();
  const todayMonth = koreaDate.getUTCMonth();
  const todayDay = koreaDate.getUTCDate();
  const today = new Date(todayYear, todayMonth, todayDay);
  today.setHours(0, 0, 0, 0);
  
  // 디버깅: 한국 시간 확인
  console.log('🇰🇷 한국 시간 기준 오늘:', {
    now: now.toISOString(),
    utcMs,
    koreaMs,
    koreaDate: koreaDate.toISOString(),
    today: formatKoreaDate(today)
  });
  
  return today;
};

// 한국 시간 기준 날짜 문자열 생성 (YYYY-MM-DD)
const formatKoreaDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface StudyPlanPageProps {
  subjectId: number;
  onBack: () => void;
}

export default function StudyPlanPage({ subjectId, onBack }: StudyPlanPageProps) {
  const [subject, setSubject] = useState<SubjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const userId = parseInt(localStorage.getItem('user_id') || '0');

  const loadSubject = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getSubjectDetail(subjectId);
      setSubject(response.subject);
    } catch (err) {
      setError(err instanceof Error ? err.message : '과목 정보를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubject();
  }, [subjectId]);

  // 과목 정보 업데이트 이벤트 리스너
  useEffect(() => {
    const handleSubjectUpdate = () => {
      loadSubject();
    };
    window.addEventListener('subjectUpdated', handleSubjectUpdate);
    return () => {
      window.removeEventListener('subjectUpdated', handleSubjectUpdate);
    };
  }, []);

  const handleGeneratePlan = async () => {
    if (!subject?.exam_date) {
      setError('시험 날짜가 설정되지 않았습니다.');
      return;
    }

    setIsGeneratingPlan(true);
    setError(null);
    setGenerationProgress(0);
    setGenerationStep('학습 계획 생성 준비 중...');

    // 진행률 시뮬레이션
    let progressInterval: ReturnType<typeof setInterval> | null = null;
    
    try {
      progressInterval = setInterval(() => {
        setGenerationProgress((prev) => {
          if (prev >= 95) {
            if (progressInterval) clearInterval(progressInterval);
            return 95;
          }
          if (prev < 30) {
            setGenerationStep('강의계획서 분석 중...');
            return prev + 2;
          } else if (prev < 60) {
            setGenerationStep('학습 스타일 분석 중...');
            return prev + 1.5;
          } else if (prev < 90) {
            setGenerationStep('AI 학습 계획 생성 중...');
            return prev + 1;
          } else {
            setGenerationStep('최종 검토 중...');
            return prev + 0.5;
          }
        });
      }, 300);

      await generateStudyPlan(subjectId, userId);
      
      // 완료 표시
      if (progressInterval) clearInterval(progressInterval);
      setGenerationProgress(100);
      setGenerationStep('완료!');
      
      // 약간의 지연 후 새로고침
      setTimeout(async () => {
        await loadSubject(); // 계획 생성 후 새로고침
        setGenerationProgress(0);
        setGenerationStep('');
      }, 500);
    } catch (err) {
      if (progressInterval) clearInterval(progressInterval);
      setError(err instanceof Error ? err.message : '학습 계획 생성에 실패했습니다.');
      setGenerationProgress(0);
      setGenerationStep('');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleToggleNotification = async (checked: boolean) => {
    try {
      await toggleNotification(subjectId, checked);
      await loadSubject();
    } catch (err) {
      setError(err instanceof Error ? err.message : '알림 설정 변경에 실패했습니다.');
    }
  };

  // 날짜 범위 생성 (오늘부터 시험일까지) - 한국 시간 기준
  const generateDateRange = () => {
    if (!subject?.exam_date) return [];

    // 날짜 문자열에서 날짜만 추출 (YYYY-MM-DD 형식)
    const dateStr = subject.exam_date.split('T')[0];
    const [year, month, day] = dateStr.split('-').map(Number);
    const examDate = new Date(year, month - 1, day);
    examDate.setHours(0, 0, 0, 0);

    // 한국 시간 기준 오늘 날짜
    const today = getKoreaToday();

    const dates: Date[] = [];
    const current = new Date(today);

    while (current <= examDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  // D-Day 계산 - 한국 시간 기준
  const calculateDaysLeft = () => {
    if (!subject?.exam_date) return null;

    // 한국 시간 기준 오늘 날짜
    const today = getKoreaToday();
    
    // 날짜 문자열에서 날짜만 추출 (YYYY-MM-DD 형식)
    const dateStr = subject.exam_date.split('T')[0];
    const [year, month, day] = dateStr.split('-').map(Number);
    const examDate = new Date(year, month - 1, day);
    examDate.setHours(0, 0, 0, 0);
    
    // 정확한 일수 차이 계산 (Math.floor 사용)
    const daysLeft = Math.floor((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    return daysLeft >= 0 ? daysLeft : 0;
  };

  // 주차별로 날짜 그룹화
  const groupDatesByWeek = (dates: Date[]) => {
    const weeks: { week: number; dates: Date[] }[] = [];
    let currentWeek = 1;
    let weekDates: Date[] = [];

    dates.forEach((date, index) => {
      if (index > 0 && date.getDay() === 0) {
        // 일요일이면 새 주차 시작
        if (weekDates.length > 0) {
          weeks.push({ week: currentWeek, dates: [...weekDates] });
          weekDates = [];
          currentWeek++;
        }
      }
      weekDates.push(date);
    });

    if (weekDates.length > 0) {
      weeks.push({ week: currentWeek, dates: weekDates });
    }

    return weeks;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">과목 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error && !subject) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="text-destructive text-4xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold mb-2 text-destructive">오류가 발생했습니다</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={onBack}>돌아가기</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!subject) {
    return null;
  }

  if (!subject.exam_date) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            뒤로 가기
          </Button>
          <Card>
            <CardContent className="pt-6 text-center">
              <CalendarDays className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">시험 날짜가 설정되지 않았습니다</h2>
              <p className="text-muted-foreground mb-4">
                학습 계획을 생성하려면 먼저 시험 날짜를 설정해주세요.
              </p>
              <Button onClick={onBack}>과목 상세로 돌아가기</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const dates = generateDateRange();
  const daysLeft = calculateDaysLeft();
  // 날짜 문자열에서 날짜만 추출 (YYYY-MM-DD 형식)
  const examDateStr = subject.exam_date ? subject.exam_date.split('T')[0] : '';
  const studyPlan = subject.study_plan?.plan || {};
  const koreaTodayStr = formatKoreaDate(getKoreaToday());

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            뒤로 가기
          </Button>
          
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
                {subject.name} 학습 계획
              </h1>
              <div className="flex items-center gap-4 mb-4">
                <Badge className="bg-red-100 text-red-700 border-red-300 gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {subject.exam_type === 'midterm' ? '중간고사' : subject.exam_type === 'final' ? '기말고사' : '시험'}: {(() => {
                    // 날짜 문자열에서 날짜만 추출 (YYYY-MM-DD 형식)
                    if (!subject.exam_date) return examDateStr;
                    const dateStr = subject.exam_date.split('T')[0];
                    return dateStr;
                  })()} (D-{daysLeft})
                  {subject.exam_week_start && subject.exam_week_end && (
                    <span className="ml-1">({subject.exam_week_start}~{subject.exam_week_end}주차)</span>
                  )}
                </Badge>
                {subject.study_plan && (
                  <Badge className="bg-green-100 text-green-700 border-green-300">
                    학습 계획 생성됨
                  </Badge>
                )}
              </div>
            </div>
            
            {/* 알림 토글 */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="notification-toggle" className="text-sm font-medium">
                  학습 알림
                </Label>
                <Switch
                  id="notification-toggle"
                  checked={subject.is_notification_on ?? true}
                  onCheckedChange={handleToggleNotification}
                />
                {subject.is_notification_on ? (
                  <Bell className="h-4 w-4 text-primary" />
                ) : (
                  <BellOff className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 학습 계획 생성 버튼 */}
        {!subject.study_plan && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">AI 학습 계획 생성</h3>
                  <p className="text-sm text-blue-800">
                    강의계획서와 학습 스타일을 분석하여 맞춤형 일일 학습 계획을 생성합니다.
                  </p>
                </div>
                <Button
                  onClick={handleGeneratePlan}
                  disabled={isGeneratingPlan}
                  className="gap-2"
                >
                  {isGeneratingPlan ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      학습 계획 생성
                    </>
                  )}
                </Button>
              </div>
              
              {/* 진행률 표시 */}
              {isGeneratingPlan && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-700">{generationStep || '처리 중...'}</span>
                    <span className="font-medium text-blue-700">{Math.round(generationProgress)}%</span>
                  </div>
                  <Progress value={generationProgress} className="h-2" />
                  <div className="text-xs text-blue-600 text-center mt-1">
                    진행률: {Math.round(generationProgress)}%
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 에러 메시지 */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-sm text-red-700">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* 캘린더 뷰 */}
        {subject.study_plan ? (
          <div className="space-y-6">
            {dates.map((date, index) => {
              // 한국 시간 기준 날짜 문자열 생성
              const dateStr = formatKoreaDate(date);
              const task = studyPlan[dateStr] || '학습 계획이 없습니다.';
              const isToday = dateStr === koreaTodayStr;
              const isExamDay = dateStr === examDateStr;
              const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];

              return (
                <Card
                  key={dateStr}
                  className={`transition-all hover:shadow-md ${
                    isToday ? 'border-2 border-blue-500 bg-blue-50' : ''
                  } ${isExamDay ? 'border-2 border-red-500 bg-red-50' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className={`text-center p-3 rounded-lg ${
                          isToday ? 'bg-blue-500 text-white' :
                          isExamDay ? 'bg-red-500 text-white' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          <div className="text-xs font-medium mb-1">{dayOfWeek}</div>
                          <div className="text-2xl font-bold">{date.getDate()}</div>
                          <div className="text-xs mt-1">
                            {date.getMonth() + 1}/{date.getFullYear()}
                          </div>
                        </div>
                        {isToday && (
                          <Badge className="mt-2 w-full justify-center bg-blue-600">
                            오늘
                          </Badge>
                        )}
                        {isExamDay && (
                          <Badge className="mt-2 w-full justify-center bg-red-600">
                            시험일
                          </Badge>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2 text-gray-900">
                          {dateStr}
                        </h3>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {task}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6 text-center">
              <CalendarDays className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">학습 계획이 생성되지 않았습니다</h2>
              <p className="text-muted-foreground mb-4">
                위의 버튼을 클릭하여 AI 학습 계획을 생성하세요.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

