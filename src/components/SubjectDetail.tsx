/**
 * 과목 상세 페이지 컴포넌트
 * AI가 분석한 강의계획서 정보와 주차별 커리큘럼 표시
 */

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Input } from './ui/input';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Upload,
  FileText,
  Loader2,
  Edit2,
  Check,
  X,
  Trash2,
  FolderOpen,
  PlusCircle,
  ClipboardList,
  History,
  CalendarDays,
} from 'lucide-react';
import { getSubjectDetail, uploadMaterial, updateWeekTopic, deleteMaterial, getQuizHistory, uploadLearningPDF, setExamDate, type SubjectDetail } from '../services/api';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import QuizCreationModal from './QuizCreationModal';
import QuizHistory from './QuizHistory';

// 과목별 색상 팔레트 (Dashboard와 동일)
const subjectColors = [
  { 
    bg: 'bg-blue-100', 
    border: 'border-blue-300', 
    icon: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-700'
  },
  { 
    bg: 'bg-purple-100', 
    border: 'border-purple-300', 
    icon: 'text-purple-600',
    badge: 'bg-purple-100 text-purple-700'
  },
  { 
    bg: 'bg-pink-100', 
    border: 'border-pink-300', 
    icon: 'text-pink-600',
    badge: 'bg-pink-100 text-pink-700'
  },
  { 
    bg: 'bg-indigo-100', 
    border: 'border-indigo-300', 
    icon: 'text-indigo-600',
    badge: 'bg-indigo-100 text-indigo-700'
  },
  { 
    bg: 'bg-cyan-100', 
    border: 'border-cyan-300', 
    icon: 'text-cyan-600',
    badge: 'bg-cyan-100 text-cyan-700'
  },
  { 
    bg: 'bg-emerald-100', 
    border: 'border-emerald-300', 
    icon: 'text-emerald-600',
    badge: 'bg-emerald-100 text-emerald-700'
  },
];

// 과목 ID 기반 색상 선택 (Dashboard와 동일한 로직)
const getSubjectColor = (subjectId: number) => {
  return subjectColors[subjectId % subjectColors.length];
};
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface SubjectDetailProps {
  subjectId: number;
  onBack: () => void;
}

interface SyllabusAnalysis {
  basic_info: {
    credits: number;
    course_type?: string; // 과목구분 (전공기초, 전공핵심, 전공심화 등)
    course_level?: string; // 이수구분 (100단위, 200단위 등)
    grading_policy: {
      midterm?: number;
      final?: number;
      assignment?: number;
      attendance?: number;
      other?: number;
      summary?: string;
    };
  };
  weekly_schedule: Array<{
    week_no: number;
    topic: string;
    description?: string;
  }>;
}

export default function SubjectDetail({ subjectId, onBack }: SubjectDetailProps) {
  const [subject, setSubject] = useState<SubjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMaterialDialogOpen, setIsMaterialDialogOpen] = useState(false);
  const [selectedWeekNo, setSelectedWeekNo] = useState<number | null>(null);
  const [materialFiles, setMaterialFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingWeekNo, setEditingWeekNo] = useState<number | null>(null);
  const [editingTopic, setEditingTopic] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLearningPDFDialogOpen, setIsLearningPDFDialogOpen] = useState(false);
  const [learningPDFFile, setLearningPDFFile] = useState<File | null>(null);
  const [isUploadingLearningPDF, setIsUploadingLearningPDF] = useState(false);
  const learningPDFInputRef = useRef<HTMLInputElement>(null);
  
  // Concept Learning 다이얼로그 상태
  // Quiz 다이얼로그 상태
  const [isQuizDialogOpen, setIsQuizDialogOpen] = useState(false);
  const [quizDifficulty, setQuizDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [pastExamFile, setPastExamFile] = useState<File | null>(null);
  const [quiz, setQuiz] = useState<Array<{ question: string; options: string[]; answer: string; explanation: string }> | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<{ [key: number]: string }>({});
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizResults, setQuizResults] = useState<{ score: number; total: number; results: Array<{ question_id: number; is_correct: boolean; user_answer: string; correct_answer: string }> } | null>(null);
  
  // 자료 관리 다이얼로그 상태
  const [isMaterialManagementDialogOpen, setIsMaterialManagementDialogOpen] = useState(false);
  const [selectedWeekForMaterialManagement, setSelectedWeekForMaterialManagement] = useState<number | null>(null);
  
  // 퀴즈 관련 상태
  const [isQuizCreationModalOpen, setIsQuizCreationModalOpen] = useState(false);
  const [isQuizHistoryOpen, setIsQuizHistoryOpen] = useState(false);
  const userId = parseInt(localStorage.getItem('user_id') || '0');
  
  // D-Day 관련 상태
  const [isExamDateDialogOpen, setIsExamDateDialogOpen] = useState(false);
  const [selectedExamDate, setSelectedExamDate] = useState<string>('');
  const [selectedExamType, setSelectedExamType] = useState<'midterm' | 'final' | ''>('');
  const [examWeekStart, setExamWeekStart] = useState<number | ''>('');
  const [examWeekEnd, setExamWeekEnd] = useState<number | ''>('');

  const loadSubjectDetail = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log(`📥 과목 ID ${subjectId} 정보 로딩 중...`);
      const response = await getSubjectDetail(subjectId);
      console.log('✅ 과목 정보 로드 완료:', {
        hasAnalysis: !!response.subject.syllabus_analysis,
        hasText: !!response.subject.syllabus_text,
        examDate: response.subject.exam_date,
        examType: response.subject.exam_type,
        examWeekStart: response.subject.exam_week_start,
        examWeekEnd: response.subject.exam_week_end
      });
      setSubject(response.subject);
      
      // syllabus_analysis 확인
      if (response.subject.syllabus_analysis) {
        // 에러 정보가 있는지 확인 (타입 가드)
        const analysis = response.subject.syllabus_analysis;
        if (typeof analysis === 'object' && analysis !== null && 'error' in analysis) {
          const errorAnalysis = analysis as { error: string; message?: string };
          console.log('❌ AI 분석 실패:', errorAnalysis.error);
          setIsAnalyzing(false);
          setError(errorAnalysis.message || 'AI 분석이 실패했습니다.');
        } else {
          console.log('✅ AI 분석 완료!');
          setIsAnalyzing(false);
        }
      } else if (response.subject.syllabus_text) {
        // 분석 결과가 없고 텍스트가 있으면 분석 중 상태
        console.log('⏳ AI 분석이 아직 완료되지 않았습니다. 계속 대기합니다...');
        setIsAnalyzing(true);
      } else {
        console.log('⚠️ 강의계획서 텍스트가 없습니다.');
        setIsAnalyzing(false);
      }
    } catch (err) {
      console.error('❌ 과목 정보 로드 실패:', err);
      setError(err instanceof Error ? err.message : '과목 정보를 불러오는데 실패했습니다.');
      setIsAnalyzing(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubjectDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  // AI 분석이 진행 중이면 주기적으로 새로고침 (최대 20회 = 100초)
  useEffect(() => {
    if (!isAnalyzing) return;
    
    let refreshCount = 0;
    const MAX_REFRESH = 20; // 최대 20회 (100초)
    
    console.log('🔄 AI 분석 대기 중... 주기적으로 새로고침합니다.');
    const interval = setInterval(() => {
      refreshCount++;
      if (refreshCount > MAX_REFRESH) {
        console.log('⏰ 최대 대기 시간 초과. 분석이 완료되지 않았습니다.');
        clearInterval(interval);
        setIsAnalyzing(false);
        setError('AI 분석이 시간 내에 완료되지 않았습니다. 잠시 후 다시 시도해주세요.');
        return;
      }
      console.log(`📡 서버에 분석 상태 확인 중... (${refreshCount}/${MAX_REFRESH})`);
      loadSubjectDetail();
    }, 5000); // 5초마다 새로고침
    
    return () => clearInterval(interval);
  }, [isAnalyzing, subjectId]);

  const handleUploadMaterial = async () => {
    if (!selectedWeekNo || materialFiles.length === 0) {
      setError('주차와 파일을 선택해주세요.');
      return;
    }

    // 해당 주차의 Week ID 찾기 (없으면 임시 ID 사용)
    const week = subject?.weeks?.find(w => w.week_number === selectedWeekNo);
    const weekId = week?.id || 0; // Week가 없으면 0으로 전송 (백엔드에서 생성)

    setIsSubmitting(true);
    try {
      // 여러 파일을 순차적으로 업로드
      for (const file of materialFiles) {
        await uploadMaterial(weekId, file, subjectId, selectedWeekNo);
      }
      setIsMaterialDialogOpen(false);
      setMaterialFiles([]);
      setSelectedWeekNo(null);
      loadSubjectDetail(); // 목록 새로고침
    } catch (err) {
      setError(err instanceof Error ? err.message : '자료 업로드에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openMaterialDialog = (weekNo: number) => {
    setSelectedWeekNo(weekNo);
    setIsMaterialDialogOpen(true);
    setMaterialFiles([]); // 다이얼로그 열 때 파일 목록 초기화
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length > 0) {
      setMaterialFiles((prev) => [...prev, ...newFiles]);
      // input 초기화하여 같은 파일도 다시 선택 가능하게
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = (index: number) => {
    setMaterialFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerateQuiz = async () => {
    if (!selectedWeekNo) return;
    
    // 해당 주차의 Week ID 찾기
    const week = subject?.weeks?.find(w => w.week_number === selectedWeekNo);
    if (!week) {
      setError('주차 정보를 찾을 수 없습니다.');
      return;
    }
    
    setIsGeneratingQuiz(true);
    setQuiz(null);
    setQuizAnswers({});
    setQuizResults(null);
    
    try {
      // generateQuizForWeek는 더 이상 사용하지 않으므로 주석 처리
      // const response = await generateQuizForWeek(week.id, quizDifficulty, pastExamFile || undefined);
      // setQuiz(response.quiz);
      setError('퀴즈 생성 기능은 새로운 퀴즈 시스템을 사용해주세요.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '퀴즈 생성에 실패했습니다.');
    } finally {
      setIsGeneratingQuiz(false);
    }
  };
  
  const handleSubmitQuiz = () => {
    if (!quiz) return;
    
    const results: Array<{ question_id: number; is_correct: boolean; user_answer: string; correct_answer: string }> = [];
    let score = 0;
    const total = quiz.length;
    
    Object.entries(quizAnswers).forEach(([qIdx, userAnswer]) => {
      const questionIdx = parseInt(qIdx);
      const question = quiz[questionIdx];
      const isCorrect = userAnswer.trim().toUpperCase() === question.answer.trim().toUpperCase();
      
      if (isCorrect) score++;
      
      results.push({
        question_id: questionIdx,
        is_correct: isCorrect,
        user_answer: userAnswer,
        correct_answer: question.answer
      });
    });
    
    setQuizResults({ score, total, results });
  };

  // 다이얼로그가 열릴 때 fileInputRef 확인
  useEffect(() => {
    if (isMaterialDialogOpen) {
      // 다이얼로그가 열린 후 약간의 지연을 두고 ref 확인
      const timer = setTimeout(() => {
        console.log('다이얼로그 열림, fileInputRef 확인:', fileInputRef.current);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isMaterialDialogOpen]);

  if (isLoading && !subject) {
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

  // syllabus_analysis가 에러 정보인지 확인
  let analysis: SyllabusAnalysis | null = null;
  let analysisError: string | null = null;
  
  if (subject.syllabus_analysis) {
    try {
      const parsed = typeof subject.syllabus_analysis === 'string' 
        ? JSON.parse(subject.syllabus_analysis) 
        : subject.syllabus_analysis;
      
      if (parsed.error) {
        analysisError = parsed.message || 'AI 분석 중 오류가 발생했습니다.';
      } else {
        analysis = parsed as SyllabusAnalysis;
      }
    } catch (e) {
      // JSON 파싱 실패 시 그대로 사용
      analysis = subject.syllabus_analysis as SyllabusAnalysis;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => {
              window.history.pushState({}, '', '/');
              window.dispatchEvent(new CustomEvent('pathchange'));
            }}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            대시보드로 돌아가기
          </Button>
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              {subject && (() => {
                // subject.color가 있으면 사용, 없으면 기존 색상 팔레트 사용
                const subjectColor = subject.color || (() => {
                  const color = getSubjectColor(subject.id);
                  // Tailwind 클래스를 HEX로 변환 (대략적인 변환)
                  const colorMap: { [key: string]: string } = {
                    'bg-blue-100': '#A8D5E2',
                    'bg-purple-100': '#D4B8E8',
                    'bg-pink-100': '#F5C2C7',
                    'bg-indigo-100': '#B5C9E8',
                    'bg-cyan-100': '#C4E0F6',
                    'bg-emerald-100': '#B8D4C1',
                  };
                  return colorMap[color.bg] || '#A8D5E2';
                })();
                
                // 테두리 색상 생성
                const getBorderColor = (baseColor: string) => {
                  const hex = baseColor.replace('#', '');
                  const r = parseInt(hex.substr(0, 2), 16);
                  const g = parseInt(hex.substr(2, 2), 16);
                  const b = parseInt(hex.substr(4, 2), 16);
                  const darkerR = Math.max(0, Math.floor(r * 0.8));
                  const darkerG = Math.max(0, Math.floor(g * 0.8));
                  const darkerB = Math.max(0, Math.floor(b * 0.8));
                  return `rgb(${darkerR}, ${darkerG}, ${darkerB})`;
                };
                
                return (
                  <div 
                    className="border-l-4 rounded-lg p-6 mb-6 relative overflow-hidden"
                    style={{ 
                      backgroundColor: subjectColor,
                      borderColor: getBorderColor(subjectColor),
                    }}
                  >
                    <h1 className="text-3xl font-extrabold text-gray-900 mb-0 relative z-10">
                      {subject.name}
                    </h1>
                  </div>
                );
              })()}
              <div className="flex items-center gap-3 mb-3">
                <Badge variant="outline" className="text-sm">
                  {subject.subject_type}
                </Badge>
                {subject.syllabus_file_path && (
                  <Badge className="gap-1.5 bg-green-100 text-green-700 border-green-300">
                    <BookOpen className="h-3.5 w-3.5" />
                    강의계획서 등록됨
                  </Badge>
                )}
                {/* D-Day 표시 */}
                {subject.exam_date && (() => {
                  // 날짜 문자열에서 날짜만 추출 (YYYY-MM-DD 형식)
                  const dateStr = subject.exam_date.split('T')[0];
                  const [examYear, examMonth, examDay] = dateStr.split('-').map(Number);
                  const examDate = new Date(examYear, examMonth - 1, examDay);
                  examDate.setHours(0, 0, 0, 0);
                  
                  // 한국 시간 기준 오늘 날짜 (UTC+9)
                  const now = new Date();
                  // 현재 시간을 UTC로 변환한 후 9시간을 더해 한국 시간으로 변환
                  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
                  const koreaMs = utcMs + (9 * 60 * 60 * 1000); // UTC+9 (9시간 = 32400000ms)
                  const koreaDate = new Date(koreaMs);
                  
                  // 한국 시간 기준 날짜 생성 (로컬 시간으로)
                  const todayYear = koreaDate.getUTCFullYear();
                  const todayMonth = koreaDate.getUTCMonth();
                  const todayDay = koreaDate.getUTCDate();
                  const today = new Date(todayYear, todayMonth, todayDay);
                  today.setHours(0, 0, 0, 0);
                  
                  // 정확한 일수 차이 계산 (Math.floor 사용)
                  const daysLeft = Math.floor((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  const formattedDate = `${examYear}-${String(examMonth).padStart(2, '0')}-${String(examDay).padStart(2, '0')}`;
                  const examTypeLabel = subject.exam_type === 'midterm' ? '중간고사' : subject.exam_type === 'final' ? '기말고사' : '시험';
                  const rangeLabel = subject.exam_week_start && subject.exam_week_end 
                    ? ` (${subject.exam_week_start}~${subject.exam_week_end}주차)`
                    : '';
                  
                  return (
                    <Badge className="gap-1.5 bg-red-100 text-red-700 border-red-300">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {examTypeLabel}: {formattedDate} (D-{daysLeft > 0 ? daysLeft : 0}){rangeLabel}
                    </Badge>
                  );
                })()}
              </div>
              
              {/* 강의 정보 및 성적 평가 방법 (두 줄로 분리) */}
              {analysis && analysis.basic_info && (
                <div className="flex flex-col gap-2.5">
                  {/* 첫 번째 줄: 과목 정보 */}
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                    {analysis.basic_info.credits && (
                      <div>
                        <span className="text-gray-600">학점: </span>
                        <span className="text-gray-900 font-semibold">{analysis.basic_info.credits}학점</span>
                      </div>
                    )}
                    {analysis.basic_info.course_type && (
                      <div>
                        <span className="text-gray-600">과목 구분: </span>
                        <span className="text-gray-900 font-semibold">{analysis.basic_info.course_type}</span>
                      </div>
                    )}
                    {analysis.basic_info.course_level && (
                      <div>
                        <span className="text-gray-600">이수 구분: </span>
                        <span className="text-gray-900 font-semibold">{analysis.basic_info.course_level}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* 두 번째 줄: 성적 비율 */}
                  {analysis.basic_info.grading_policy && (
                    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm">
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                        {analysis.basic_info.grading_policy.midterm && analysis.basic_info.grading_policy.midterm > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">중간: </span>
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full transition-all"
                              style={{ width: `${analysis.basic_info.grading_policy.midterm}%` }}
                            ></div>
                          </div>
                          <span className="text-gray-900 font-semibold min-w-[32px]">{analysis.basic_info.grading_policy.midterm}%</span>
                        </div>
                      )}
                      {analysis.basic_info.grading_policy.final && analysis.basic_info.grading_policy.final > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">기말: </span>
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-red-600 h-1.5 rounded-full transition-all"
                              style={{ width: `${analysis.basic_info.grading_policy.final}%` }}
                            ></div>
                          </div>
                          <span className="text-gray-900 font-semibold min-w-[32px]">{analysis.basic_info.grading_policy.final}%</span>
                        </div>
                      )}
                      {analysis.basic_info.grading_policy.assignment && analysis.basic_info.grading_policy.assignment > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">과제: </span>
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-green-600 h-1.5 rounded-full transition-all"
                              style={{ width: `${analysis.basic_info.grading_policy.assignment}%` }}
                            ></div>
                          </div>
                          <span className="text-gray-900 font-semibold min-w-[32px]">{analysis.basic_info.grading_policy.assignment}%</span>
                        </div>
                      )}
                      {analysis.basic_info.grading_policy.attendance && analysis.basic_info.grading_policy.attendance > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">출석: </span>
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-yellow-600 h-1.5 rounded-full transition-all"
                              style={{ width: `${analysis.basic_info.grading_policy.attendance}%` }}
                            ></div>
                          </div>
                          <span className="text-gray-900 font-semibold min-w-[32px]">{analysis.basic_info.grading_policy.attendance}%</span>
                        </div>
                      )}
                      {analysis.basic_info.grading_policy.other && analysis.basic_info.grading_policy.other > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">기타: </span>
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-purple-600 h-1.5 rounded-full transition-all"
                              style={{ width: `${analysis.basic_info.grading_policy.other}%` }}
                            ></div>
                          </div>
                          <span className="text-gray-900 font-semibold min-w-[32px]">{analysis.basic_info.grading_policy.other}%</span>
                        </div>
                      )}
                      </div>
                      {/* D-Day 및 퀴즈 버튼들 */}
                      <div className="flex gap-2 flex-shrink-0 ml-auto">
                        {/* D-Day 버튼 */}
                        {!subject.exam_date ? (
                          <Button
                            onClick={() => {
                              // 모달 열 때 초기화
                              setSelectedExamDate('');
                              setSelectedExamType('');
                              setExamWeekStart('');
                              setExamWeekEnd('');
                              setIsExamDateDialogOpen(true);
                            }}
                            size="sm"
                            variant="outline"
                            className="gap-2"
                          >
                            <CalendarDays className="h-4 w-4" />
                            시험 D-Day 설정
                          </Button>
                        ) : (
                          <>
                            <Button
                              onClick={() => {
                                // 모달 열 때 기존 값 불러오기
                                if (subject.exam_date) {
                                  setSelectedExamDate(new Date(subject.exam_date).toISOString().split('T')[0]);
                                }
                                setSelectedExamType(subject.exam_type || '');
                                setExamWeekStart(subject.exam_week_start || '');
                                setExamWeekEnd(subject.exam_week_end || '');
                                setIsExamDateDialogOpen(true);
                              }}
                              size="sm"
                              variant="outline"
                              className="gap-2"
                            >
                              <CalendarDays className="h-4 w-4" />
                              D-Day 수정
                            </Button>
                            <Button
                              onClick={() => {
                                window.history.pushState({}, '', `/subject/${subjectId}/plan`);
                                window.dispatchEvent(new CustomEvent('pathchange'));
                              }}
                              size="sm"
                              className="gap-2"
                            >
                              <CalendarDays className="h-4 w-4" />
                              {subject.study_plan ? '학습 계획 보기' : '학습 계획 생성'}
                            </Button>
                          </>
                        )}
                        <Button
                          onClick={() => setIsQuizCreationModalOpen(true)}
                          size="sm"
                          className="gap-2"
                        >
                          <ClipboardList className="h-4 w-4" />
                          퀴즈 생성
                        </Button>
                        <Button
                          onClick={async () => {
                            // 퀴즈가 있는지 확인
                            try {
                              const history = await getQuizHistory(subjectId, userId);
                              if (history.quizzes.length > 0) {
                                setIsQuizHistoryOpen(true);
                              } else {
                                alert('생성된 퀴즈가 없습니다.');
                              }
                            } catch (err) {
                              console.error('퀴즈 히스토리 조회 실패:', err);
                            }
                          }}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                        >
                          <History className="h-4 w-4" />
                          퀴즈 히스토리
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI 분석 에러 메시지 */}
        {analysisError && (
          <Card className="mb-8 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="text-red-600 text-xl">⚠️</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 mb-1">AI 분석 실패</h3>
                  <p className="text-sm text-red-800 mb-2">
                    {analysisError}
                  </p>
                  <p className="text-xs text-red-700">
                    OpenAI API 할당량이 초과되었거나 인증 오류가 발생했습니다. 
                    <br />
                    API 키를 확인하거나 사용량을 확인해주세요.
                    <br />
                    서버 관리자에게 문의하거나, 수동으로 주차를 추가해주세요.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI 분석 중 스켈레톤 */}
        {isAnalyzing && !analysisError && (
          <Card className="mb-8 border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-1">AI가 강의계획서를 분석 중입니다...</h3>
                  <p className="text-sm text-blue-800 mb-2">
                    잠시만 기다려주세요. 학점, 평가 비율, 주차별 커리큘럼을 자동으로 추출하고 있습니다.
                  </p>
                  <p className="text-xs text-blue-700">
                    ⏱️ 일반적으로 10-30초 정도 소요됩니다. 브라우저 콘솔(F12)에서 진행 상황을 확인할 수 있습니다.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 섹션 1: 주차별 커리큘럼 */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">주차별 커리큘럼</h2>
          
          {analysis && analysis.weekly_schedule && analysis.weekly_schedule.length > 0 ? (
            <div className="space-y-2">
              {analysis.weekly_schedule.map((week, index) => {
                // 해당 주차의 Week 모델 찾기 (자료 업로드용)
                const weekModel = subject.weeks?.find(w => w.week_number === week.week_no);
                const hasMaterials = weekModel && weekModel.materials && weekModel.materials.length > 0;
                const pdfMaterials = weekModel?.materials?.filter(m => m.file_type === 'pdf') || [];
                const hasPDF = pdfMaterials.length > 0;
                
                return (
                  <Card
                    key={index}
                    className="group"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          {subject && (() => {
                            // subject.color가 있으면 사용, 없으면 기존 색상 팔레트 사용
                            const subjectColor = subject.color || (() => {
                              const color = getSubjectColor(subject.id);
                              const colorMap: { [key: string]: string } = {
                                'bg-blue-100': '#A8D5E2',
                                'bg-purple-100': '#D4B8E8',
                                'bg-pink-100': '#F5C2C7',
                                'bg-indigo-100': '#B5C9E8',
                                'bg-cyan-100': '#C4E0F6',
                                'bg-emerald-100': '#B8D4C1',
                              };
                              return colorMap[color.bg] || '#A8D5E2';
                            })();
                            
                            // 텍스트 색상 결정 (밝은 배경에는 어두운 텍스트)
                            const getTextColor = (baseColor: string) => {
                              const hex = baseColor.replace('#', '');
                              const r = parseInt(hex.substr(0, 2), 16);
                              const g = parseInt(hex.substr(2, 2), 16);
                              const b = parseInt(hex.substr(4, 2), 16);
                              // 밝기 계산 (0-255)
                              const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                              return brightness > 200 ? '#1F2937' : '#FFFFFF';
                            };
                            
                            return (
                              <div 
                                className="flex items-center justify-center min-w-[3.5rem] h-10 rounded-full font-bold text-sm whitespace-nowrap px-3"
                                style={{ 
                                  backgroundColor: subjectColor,
                                  color: getTextColor(subjectColor),
                                }}
                              >
                                Week {week.week_no}
                              </div>
                            );
                          })()}
                          <div className="flex-1">
                            {editingWeekNo === week.week_no ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editingTopic}
                                  onChange={(e) => setEditingTopic(e.target.value)}
                                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                  onClick={(e) => e.stopPropagation()}
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      const { subject: updatedSubject } = await updateWeekTopic(subjectId, week.week_no, editingTopic);
                                      setSubject(updatedSubject);
                                      setEditingWeekNo(null);
                                      setEditingTopic('');
                                    } catch (err) {
                                      alert(err instanceof Error ? err.message : '주제 업데이트에 실패했습니다.');
                                    }
                                  }}
                                  className="h-8 w-8 p-0"
                                >
                                  <Check className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingWeekNo(null);
                                    setEditingTopic('');
                                  }}
                                  className="h-8 w-8 p-0"
                                >
                                  <X className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <h3 className="font-semibold text-lg text-gray-900">
                                  {week.topic}
                                </h3>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingWeekNo(week.week_no);
                                    setEditingTopic(week.topic);
                                  }}
                                  className="h-7 w-7 p-0 flex-shrink-0"
                                  title="주제 수정"
                                >
                                  <Edit2 className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 transition-colors" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasMaterials ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* PDF 파일이 있는지 확인 */}
                              {hasPDF && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-3 text-xs font-medium text-primary border-primary/30 hover:bg-primary/5 hover:border-primary/50 transition-all shadow-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    // Concept Learning 페이지로 이동
                                    window.history.pushState({}, '', `/subject/${subjectId}/week/${weekModel!.id}/concept`);
                                    window.dispatchEvent(new CustomEvent('pathchange'));
                                  }}
                                  title="개념 학습"
                                >
                                  <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                                  개념 학습
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-3 text-xs font-medium text-primary border-primary/30 hover:bg-primary/5 hover:border-primary/50 transition-all shadow-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setSelectedWeekForMaterialManagement(week.week_no);
                                  setIsMaterialManagementDialogOpen(true);
                                }}
                                title="자료 보기 및 관리"
                              >
                                <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
                                자료 보기 ({weekModel!.materials!.length})
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                openMaterialDialog(week.week_no);
                              }}
                              className="gap-2"
                            >
                              <Upload className="h-4 w-4" />
                              자료 업로드
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : !isAnalyzing ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">주차별 커리큘럼 정보가 없습니다.</p>
                <p className="text-sm text-gray-500">
                  {subject.syllabus_text 
                    ? 'AI 분석이 완료되지 않았습니다. 잠시 후 새로고침해주세요.'
                    : '강의계획서를 업로드하면 주차별 커리큘럼이 자동으로 생성됩니다.'}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* 학습용 PDF 업로드 다이얼로그 */}
        <Dialog open={isLearningPDFDialogOpen} onOpenChange={setIsLearningPDFDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>학습 자료 PDF 업로드</DialogTitle>
              <DialogDescription>
                수업 자료 PDF를 업로드하면 퀴즈 생성에 활용할 수 있습니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <input
                  ref={learningPDFInputRef}
                  id="learning_pdf_file"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setLearningPDFFile(file);
                  }}
                  className="hidden"
                  disabled={isUploadingLearningPDF}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isUploadingLearningPDF) {
                      const input = learningPDFInputRef.current || document.getElementById('learning_pdf_file') as HTMLInputElement;
                      if (input) {
                        input.click();
                      }
                    }
                  }}
                  disabled={isUploadingLearningPDF}
                  className="w-full justify-start min-w-0"
                >
                  <Upload className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate" title={learningPDFFile ? learningPDFFile.name : undefined}>
                    {learningPDFFile ? learningPDFFile.name : 'PDF 파일 선택'}
                  </span>
                </Button>
                {learningPDFFile && (
                  <p className="text-xs text-muted-foreground truncate" title={`${learningPDFFile.name} (${(learningPDFFile.size / 1024 / 1024).toFixed(2)} MB)`}>
                    선택된 파일: {learningPDFFile.name} ({(learningPDFFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsLearningPDFDialogOpen(false);
                  setLearningPDFFile(null);
                }}
                disabled={isUploadingLearningPDF}
              >
                취소
              </Button>
              <Button 
                onClick={async () => {
                  if (!learningPDFFile) {
                    setError('파일을 선택해주세요.');
                    return;
                  }
                  setIsUploadingLearningPDF(true);
                  try {
                    await uploadLearningPDF(subjectId, learningPDFFile);
                    setIsLearningPDFDialogOpen(false);
                    setLearningPDFFile(null);
                    alert('학습 자료가 성공적으로 업로드되었습니다!');
                  } catch (err) {
                    setError(err instanceof Error ? err.message : '학습 자료 업로드에 실패했습니다.');
                  } finally {
                    setIsUploadingLearningPDF(false);
                  }
                }} 
                disabled={isUploadingLearningPDF || !learningPDFFile}
              >
                {isUploadingLearningPDF ? '업로드 중...' : '업로드'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 자료 업로드 다이얼로그 */}
        <Dialog open={isMaterialDialogOpen} onOpenChange={setIsMaterialDialogOpen}>
          <DialogContent className="sm:max-w-[500px] max-w-[calc(100vw-2rem)] overflow-hidden">
            <DialogHeader>
              <DialogTitle>수업자료 업로드</DialogTitle>
              <DialogDescription>
                Week {selectedWeekNo}에 수업자료를 업로드하세요. (PDF, PPT, DOC 등)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 overflow-x-hidden">
              <div className="space-y-2 min-w-0">
                <Label htmlFor="material_file">파일 선택</Label>
                <div className="w-full min-w-0">
                  <input
                    ref={fileInputRef}
                    id="material_file"
                    type="file"
                    accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isSubmitting}
                  />
                  <label
                    htmlFor="material_file"
                    className={`flex w-full cursor-pointer items-center gap-2 rounded-md border border-input bg-white px-3 py-2 text-sm hover:bg-gray-50 min-w-0 ${
                      isSubmitting ? 'cursor-not-allowed opacity-50' : ''
                    }`}
                  >
                    <Upload className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 min-w-0 truncate">
                      파일 선택 (PDF, PPT, DOC 등) - 여러 파일 선택 가능
                    </span>
                  </label>
                </div>
                
                {/* 선택된 파일 목록 */}
                {materialFiles.length > 0 && (
                  <div className="space-y-2 mt-3 min-w-0">
                    <p className="text-xs text-muted-foreground truncate">
                      선택된 파일 ({materialFiles.length}개):
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto overflow-x-hidden">
                      {materialFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded-md border border-input min-w-0"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm truncate min-w-0" title={file.name}>
                              {file.name}
                            </span>
                            <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">
                              ({(file.size / 1024).toFixed(2)} KB)
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveFile(index)}
                            disabled={isSubmitting}
                            className="h-6 w-6 flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="flex-shrink-0 gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsMaterialDialogOpen(false);
                  setMaterialFiles([]);
                  setSelectedWeekNo(null);
                }}
                disabled={isSubmitting}
                className="flex-shrink-0"
              >
                취소
              </Button>
              <Button 
                onClick={handleUploadMaterial} 
                disabled={isSubmitting || materialFiles.length === 0}
                className="flex-shrink-0 min-w-0"
              >
                <span className="truncate">
                  {isSubmitting ? `업로드 중... (${materialFiles.length}개 파일)` : `업로드 (${materialFiles.length}개)`}
                </span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Quiz 다이얼로그 */}
        <Dialog open={isQuizDialogOpen} onOpenChange={setIsQuizDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>퀴즈 생성</DialogTitle>
              <DialogDescription>
                주차별 PDF 자료를 기반으로 퀴즈를 생성합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto py-4">
              {!quiz && !isGeneratingQuiz ? (
                // Step 1: Setup
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>난이도 선택</Label>
                    <RadioGroup value={quizDifficulty} onValueChange={(value) => setQuizDifficulty(value as 'easy' | 'medium' | 'hard')}>
                      <div className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="easy" id="easy" />
                          <Label htmlFor="easy" className="cursor-pointer font-normal">
                            Easy
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="medium" id="medium" />
                          <Label htmlFor="medium" className="cursor-pointer font-normal">
                            Medium
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="hard" id="hard" />
                          <Label htmlFor="hard" className="cursor-pointer font-normal">
                            Hard
                          </Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>기출문제 PDF 업로드 (선택사항)</Label>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        setPastExamFile(file || null);
                      }}
                      className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90"
                    />
                    {pastExamFile && (
                      <p className="text-xs text-gray-600 truncate" title={pastExamFile.name}>
                        선택된 파일: {pastExamFile.name}
                      </p>
                    )}
                  </div>
                  
                  <Button
                    onClick={handleGenerateQuiz}
                    disabled={isGeneratingQuiz}
                    className="w-full"
                  >
                    {isGeneratingQuiz ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        생성 중...
                      </>
                    ) : (
                      '퀴즈 생성하기'
                    )}
                  </Button>
                </div>
              ) : isGeneratingQuiz ? (
                // Loading
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                  <p className="text-sm text-gray-600">퀴즈를 생성하는 중...</p>
                </div>
              ) : quizResults ? (
                // Step 3: Results
                <div className="space-y-6">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center mb-4">
                        <h3 className="text-2xl font-bold mb-2">
                          점수: {quizResults.score} / {quizResults.total}
                        </h3>
                        <p className="text-sm text-gray-600">
                          정답률: {Math.round((quizResults.score / quizResults.total) * 100)}%
                        </p>
                      </div>
                      
                      {/* 오답 상세 */}
                      <div className="mt-4 space-y-3">
                        {quizResults.results.map((result, idx) => {
                          const question = quiz![result.question_id];
                          if (!result.is_correct) {
                            return (
                              <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="font-medium text-red-900 text-sm mb-1">
                                  {question.question}
                                </p>
                                <p className="text-xs text-gray-600 mb-1">
                                  <span className="font-medium">내 답안:</span> {result.user_answer} | 
                                  <span className="font-medium"> 정답:</span> {result.correct_answer}
                                </p>
                                <p className="text-xs text-gray-700 mt-1">{question.explanation}</p>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQuiz(null);
                      setQuizAnswers({});
                      setQuizResults(null);
                      setPastExamFile(null);
                    }}
                    className="w-full"
                  >
                    다시 생성하기
                  </Button>
                </div>
              ) : quiz ? (
                // Step 2: Taking Quiz
                <div className="space-y-6">
                  {quiz.map((item, index) => (
                    <Card key={index}>
                      <CardContent className="pt-6">
                        <h3 className="font-semibold mb-3 text-lg">
                          {index + 1}. {item.question}
                        </h3>
                        <RadioGroup
                          value={quizAnswers[index] || ''}
                          onValueChange={(value) => {
                            setQuizAnswers((prev) => ({ ...prev, [index]: value }));
                          }}
                        >
                          <div className="space-y-2">
                            {item.options.map((option, optIdx) => (
                              <div key={optIdx} className="flex items-center space-x-2">
                                <RadioGroupItem value={option} id={`q${index}_opt${optIdx}`} />
                                <Label htmlFor={`q${index}_opt${optIdx}`} className="cursor-pointer font-normal">
                                  {option}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </RadioGroup>
                      </CardContent>
                    </Card>
                  ))}
                  
                  <Button
                    onClick={handleSubmitQuiz}
                    disabled={Object.keys(quizAnswers).length !== quiz.length}
                    className="w-full"
                  >
                    답안 제출
                  </Button>
                </div>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>

        {/* 자료 관리 다이얼로그 */}
        <Dialog open={isMaterialManagementDialogOpen} onOpenChange={setIsMaterialManagementDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-primary" />
                {selectedWeekForMaterialManagement}주차 자료
              </DialogTitle>
              <DialogDescription>
                업로드된 자료를 확인하고 삭제하거나 추가로 업로드할 수 있습니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedWeekForMaterialManagement && (() => {
                const weekModel = subject.weeks?.find(w => w.week_number === selectedWeekForMaterialManagement);
                const hasMaterials = weekModel && weekModel.materials && weekModel.materials.length > 0;
                
                return (
                  <>
                    {hasMaterials ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            업로드된 자료 <span className="text-primary font-bold">({weekModel!.materials!.length}개)</span>
                          </h4>
                        </div>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                          {weekModel!.materials!.map((material) => (
                            <div
                              key={material.id}
                              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-input hover:bg-gray-100 transition-all"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate" title={material.file_name}>
                                    {material.file_name}
                                  </p>
                                  {material.file_size && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {(material.file_size / 1024).toFixed(1)} KB
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  if (confirm(`"${material.file_name}" 파일을 삭제하시겠습니까?`)) {
                                    try {
                                      const response = await deleteMaterial(material.id);
                                      // PDF 삭제 시 해당 주차의 개념 학습 캐시도 삭제
                                      if (response.week_id && material.file_type === 'pdf') {
                                        // localStorage에서 해당 주차의 모든 모드 캐시 삭제
                                        localStorage.removeItem(`concept_${response.week_id}_summary`);
                                        localStorage.removeItem(`concept_${response.week_id}_deep_dive`);
                                        console.log(`✅ 개념 학습 캐시 삭제 완료 (week_id: ${response.week_id})`);
                                      }
                                      loadSubjectDetail(); // 목록 새로고침
                                    } catch (err) {
                                      setError(err instanceof Error ? err.message : '자료 삭제에 실패했습니다.');
                                    }
                                  }
                                }}
                                title="삭제"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <div className="p-4 bg-blue-50 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center border border-blue-100">
                          <FileText className="h-10 w-10 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium">업로드된 자료가 없습니다.</p>
                        <p className="text-xs text-muted-foreground mt-1">아래 버튼을 눌러 자료를 업로드하세요.</p>
                      </div>
                    )}
                    
                    <div className="pt-4">
                      <Button
                        variant="default"
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setIsMaterialManagementDialogOpen(false);
                          openMaterialDialog(selectedWeekForMaterialManagement);
                        }}
                      >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        {hasMaterials ? '추가 업로드' : '자료 업로드'}
                      </Button>
                    </div>
                  </>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>

        {/* 퀴즈 생성 모달 */}
        <QuizCreationModal
          open={isQuizCreationModalOpen}
          onOpenChange={setIsQuizCreationModalOpen}
          subject={subject}
          userId={userId}
          onQuizGenerated={(quizId) => {
            // 퀴즈 페이지로 이동
            window.history.pushState({}, '', `/quiz/${quizId}`);
            window.dispatchEvent(new CustomEvent('pathchange'));
          }}
        />

        {/* 퀴즈 히스토리 */}
        {isQuizHistoryOpen && (
          <QuizHistory
            subjectId={subjectId}
            userId={userId}
            subjectName={subject.name}
            onViewQuiz={(quizId, mode = 'view') => {
              setIsQuizHistoryOpen(false);
              window.history.pushState({}, '', `/quiz/${quizId}${mode === 'retake' ? '?mode=retake' : ''}`);
              window.dispatchEvent(new CustomEvent('pathchange'));
            }}
            onClose={() => setIsQuizHistoryOpen(false)}
          />
        )}

        {/* D-Day 설정 다이얼로그 */}
        <Dialog 
          open={isExamDateDialogOpen} 
          onOpenChange={(open) => {
            setIsExamDateDialogOpen(open);
            if (open && subject) {
              // 모달이 열릴 때 기존 값 불러오기
              if (subject.exam_date) {
                setSelectedExamDate(new Date(subject.exam_date).toISOString().split('T')[0]);
              } else {
                setSelectedExamDate('');
              }
              setSelectedExamType(subject.exam_type || '');
              setExamWeekStart(subject.exam_week_start || '');
              setExamWeekEnd(subject.exam_week_end || '');
            } else if (!open) {
              // 모달이 닫힐 때 초기화
              setSelectedExamDate('');
              setSelectedExamType('');
              setExamWeekStart('');
              setExamWeekEnd('');
            }
          }}
        >
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{subject?.exam_date ? '시험 D-Day 수정' : '시험 D-Day 설정'}</DialogTitle>
              <DialogDescription>
                시험 정보를 입력하면 AI가 맞춤형 학습 계획을 생성합니다.
                {subject?.exam_date && ' 기존 학습 계획은 삭제되고 새로 생성됩니다.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="exam_date">시험 날짜</Label>
                <Input
                  id="exam_date"
                  type="date"
                  value={selectedExamDate}
                  onChange={(e) => setSelectedExamDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <div className="space-y-2">
                <Label>시험 유형</Label>
                <RadioGroup
                  value={selectedExamType}
                  onValueChange={(value) => setSelectedExamType(value as 'midterm' | 'final')}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="midterm" id="midterm" />
                    <Label htmlFor="midterm" className="cursor-pointer font-normal">
                      중간고사
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="final" id="final" />
                    <Label htmlFor="final" className="cursor-pointer font-normal">
                      기말고사
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="space-y-2">
                <Label>시험 범위 (주차)</Label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Label htmlFor="week_start" className="text-xs text-muted-foreground mb-1 block">
                      시작 주차
                    </Label>
                    <Input
                      id="week_start"
                      type="number"
                      min="1"
                      max="20"
                      value={examWeekStart}
                      onChange={(e) => setExamWeekStart(e.target.value ? parseInt(e.target.value) : '')}
                      placeholder="예: 1"
                    />
                  </div>
                  <div className="pt-6">
                    <span className="text-gray-500">~</span>
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="week_end" className="text-xs text-muted-foreground mb-1 block">
                      종료 주차
                    </Label>
                    <Input
                      id="week_end"
                      type="number"
                      min="1"
                      max="20"
                      value={examWeekEnd}
                      onChange={(e) => setExamWeekEnd(e.target.value ? parseInt(e.target.value) : '')}
                      placeholder="예: 8"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  시험 범위에 해당하는 주차를 입력하면 해당 범위만 집중적으로 학습 계획이 생성됩니다.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsExamDateDialogOpen(false);
                  setSelectedExamDate('');
                  setSelectedExamType('');
                  setExamWeekStart('');
                  setExamWeekEnd('');
                }}
              >
                취소
              </Button>
              <Button
                onClick={async () => {
                  if (!selectedExamDate) {
                    setError('시험 날짜를 선택해주세요.');
                    return;
                  }
                  
                  if (!selectedExamType) {
                    setError('시험 유형을 선택해주세요.');
                    return;
                  }
                  
                  if (examWeekStart && examWeekEnd && examWeekStart > examWeekEnd) {
                    setError('시작 주차는 종료 주차보다 작거나 같아야 합니다.');
                    return;
                  }
                  
                  try {
                    const response = await setExamDate(
                      subjectId, 
                      selectedExamDate,
                      selectedExamType as 'midterm' | 'final',
                      examWeekStart ? Number(examWeekStart) : undefined,
                      examWeekEnd ? Number(examWeekEnd) : undefined
                    );
                    setIsExamDateDialogOpen(false);
                    setSelectedExamDate('');
                    setSelectedExamType('');
                    setExamWeekStart('');
                    setExamWeekEnd('');
                    // 응답 확인 후 무조건 새로고침 (타입 일치 및 최신 정보 보장)
                    console.log('📝 시험 날짜 설정 응답:', response);
                    console.log('📝 응답의 exam_date:', response?.subject?.exam_date);
                    
                    // 즉시 상태 업데이트 (응답 데이터 사용)
                    if (response && response.subject) {
                      console.log('🔄 응답 데이터로 즉시 상태 업데이트');
                      setSubject(response.subject);
                    }
                    
                    // 상태 업데이트를 위해 새로고침 (최신 정보 보장)
                    await loadSubjectDetail();
                    
                    // Dashboard에 변경 사항 알림 (과목 목록 새로고침)
                    window.dispatchEvent(new CustomEvent('subjectUpdated'));
                  } catch (err) {
                    setError(err instanceof Error ? err.message : '시험 날짜 설정에 실패했습니다.');
                  }
                }}
                disabled={!selectedExamDate || !selectedExamType}
              >
                저장
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 에러 메시지 */}
        {error && (
          <div className="fixed bottom-4 right-4 bg-destructive text-destructive-foreground px-4 py-3 rounded-md shadow-lg z-50">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
