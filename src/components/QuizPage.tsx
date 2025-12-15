/**
 * 퀴즈 페이지 컴포넌트
 * 퀴즈 풀이 및 결과 확인을 담당합니다.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Loader2, ArrowLeft, CheckCircle2, XCircle, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { Progress } from './ui/progress';
import { getQuiz, submitQuiz, getSubjectDetail, type QuizDetail, type Question, type QuizResult, type QuizReport } from '../services/api';

interface QuizPageProps {
  quizId: number;
  userId: number;
  onBack: () => void;
  subjectId?: number | null;
  mode?: 'view' | 'retake'; // 'view': 결과만 보기, 'retake': 다시 풀기
}

export default function QuizPage({ quizId, userId, onBack, subjectId: propSubjectId, mode = 'view' }: QuizPageProps) {
  const [quizDetail, setQuizDetail] = useState<QuizDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<{ [questionId: number]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState<number>(0);
  const [results, setResults] = useState<QuizResult[] | null>(null);
  const [report, setReport] = useState<QuizReport | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [subjectName, setSubjectName] = useState<string>('');
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [isRetaking, setIsRetaking] = useState(false);

  useEffect(() => {
    loadQuiz();
  }, [quizId]);

  const loadQuiz = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getQuiz(quizId);
      setQuizDetail(data);
      
      // 과목 정보 가져오기
      const currentSubjectId = propSubjectId || data.quiz.subject_id;
      try {
        const subjectData = await getSubjectDetail(currentSubjectId);
        setSubjectName(subjectData.subject.name);
        setSubjectId(currentSubjectId);
      } catch (err) {
        console.error('Failed to load subject info:', err);
        setSubjectId(currentSubjectId); // 에러가 나도 subject_id는 설정
      }

      // 다시 풀기 모드인 경우 리포트와 답안 초기화
      if (mode === 'retake') {
        // 다시 풀기 모드에서는 리포트와 답안을 표시하지 않음
        // 백엔드에서 제출 시 자동으로 삭제되므로 여기서는 상태만 초기화
        setReport(null);
        setAnswers({});
        setResults(null);
        setIsRetaking(true);
        setShowReport(false);
        // return 전에 finally 블록이 실행되도록 함
      }

      // 결과 보기 모드이거나 이미 제출된 경우 결과 로드
      if (data.report && mode === 'view') {
        setReport(data.report);
        // 사용자 답안 복원
        const userAnswers: { [questionId: number]: string } = {};
        Object.values(data.user_responses).forEach((response) => {
          userAnswers[response.question_id] = response.user_answer;
        });
        setAnswers(userAnswers);
        // 결과 구성
        const resultsList: QuizResult[] = data.questions.map((q) => {
          const response = data.user_responses[q.id];
          return {
            question_id: q.id,
            is_correct: response ? response.is_correct : false,
            user_answer: response ? response.user_answer : '',
            correct_answer: q.correct_answer,
            explanation: q.explanation,
            key_concept: q.key_concept,
          };
        });
        setResults(resultsList);
        setIsRetaking(false);
      } else if (!data.report) {
        // 리포트가 없는 경우 (처음 풀기)
        setReport(null);
        setAnswers({});
        setResults(null);
        setIsRetaking(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '퀴즈를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetake = () => {
    if (confirm('다시 풀면 이전 답안과 결과가 삭제됩니다. 계속하시겠습니까?')) {
      // 다시 풀기 모드로 변경하기 위해 페이지 새로고침 (URL 파라미터로 모드 전달)
      window.history.pushState({}, '', `/quiz/${quizId}?mode=retake`);
      window.location.reload();
    }
  };

  const handleSubmit = async () => {
    if (!quizDetail) return;

    const unansweredQuestions = quizDetail.questions.filter((q) => !answers[q.id] || answers[q.id].trim() === '');
    if (unansweredQuestions.length > 0) {
      const confirmMessage = `아직 답하지 않은 문제가 ${unansweredQuestions.length}개 있습니다. 그래도 제출하시겠습니까?`;
      if (!confirm(confirmMessage)) {
        return;
      }
    }

    setIsSubmitting(true);
    setSubmissionProgress(0);

    // 진행률 시뮬레이션 (100%를 넘지 않도록 제한)
    const progressInterval = setInterval(() => {
      setSubmissionProgress((prev) => {
        if (prev >= 90) return 90; // 90%에서 멈춤
        const next = prev + Math.random() * 15;
        return Math.min(next, 90); // 최대 90%로 제한
      });
    }, 200);

    try {
      const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
        question_id: parseInt(questionId),
        answer: answer || '',
      }));

      const result = await submitQuiz(quizId, userId, answersArray);
      
      clearInterval(progressInterval);
      setSubmissionProgress(100);
      
      // 완료 후 잠시 대기
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setResults(result.results);
      setReport(result.report);
      setIsRetaking(false); // 재시도 모드 해제
      setShowReport(false); // 리포트는 처음에 접혀있도록
      // 페이지 리로드하지 않고 상태만 업데이트
    } catch (err) {
      clearInterval(progressInterval);
      setError(err instanceof Error ? err.message : '퀴즈 제출에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
      setSubmissionProgress(0);
    }
  };

  const formatWeekScope = (weekNumbers: number[]): string => {
    if (weekNumbers.length === 1) {
      return `Week ${weekNumbers[0]}`;
    }
    const sorted = [...weekNumbers].sort((a, b) => a - b);
    const isContinuous = sorted.every((w, i) => i === 0 || w === sorted[i - 1] + 1);
    if (isContinuous) {
      return `Weeks ${sorted[0]}-${sorted[sorted.length - 1]}`;
    }
    return `Week ${sorted.join(', ')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">퀴즈를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !quizDetail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="text-destructive text-4xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold mb-2 text-destructive">오류가 발생했습니다</h3>
            <p className="text-muted-foreground mb-4">{error || '퀴즈를 찾을 수 없습니다.'}</p>
            <Button onClick={onBack}>돌아가기</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { quiz, questions } = quizDetail;
  // 제출된 결과가 있으면 표시
  // mode === 'view'인 경우 항상 결과 표시, 그 외에는 report와 results가 있고 retaking이 아닐 때 표시
  const isSubmitted = mode === 'view' ? (!!report && !!results) : (!!report && !!results && !isRetaking);
  const score = report ? report.score : 0;
  const total = questions.length;
  const weekScope = formatWeekScope(quiz.week_numbers);
  const isViewMode = mode === 'view';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => {
              if (subjectId) {
                window.history.pushState({}, '', `/subject/${subjectId}`);
                window.dispatchEvent(new CustomEvent('pathchange'));
              } else {
                onBack();
              }
            }}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            돌아가기
          </Button>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
            {subjectName && `${subjectName} - `}{weekScope} - Quiz #{quiz.quiz_number}
          </h1>
          {isSubmitted && isViewMode && (
            <div className="mt-4 p-4 bg-white rounded-lg border-2 border-primary">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">
                  {score} / {total}
                </div>
                <div className="text-lg text-muted-foreground">
                  정답률: {Math.round((score / total) * 100)}%
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {questions.map((question, index) => {
            const questionAnswer = answers[question.id] || '';
            const result = results?.find((r) => r.question_id === question.id);
            const isCorrect = result?.is_correct ?? false;

            return (
              <Card key={question.id} className={isSubmitted ? (isCorrect ? 'border-green-500' : 'border-red-500') : ''}>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    {isSubmitted && (
                      <div className="mt-1">
                        {isCorrect ? (
                          <div className="text-3xl">⭕</div>
                        ) : (
                          <div className="text-3xl">❌</div>
                        )}
                      </div>
                    )}
                    <CardTitle className="flex-1">
                      {index + 1}. {question.question_text}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 문제 유형에 따른 입력 */}
                  {!isSubmitted ? (
                    <>
                      {question.question_type === 'multiple_choice' && question.options ? (
                        <RadioGroup
                          value={questionAnswer}
                          onValueChange={(value) => setAnswers((prev) => ({ ...prev, [question.id]: value }))}
                        >
                          <div className="space-y-2">
                            {question.options.map((option, optIdx) => (
                              <div key={optIdx} className="flex items-center space-x-2">
                                <RadioGroupItem value={option} id={`q${question.id}_opt${optIdx}`} />
                                <Label htmlFor={`q${question.id}_opt${optIdx}`} className="cursor-pointer font-normal">
                                  {option}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </RadioGroup>
                      ) : question.question_type === 'short_answer' ? (
                        <Input
                          value={questionAnswer}
                          onChange={(e) => setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))}
                          placeholder="답을 입력하세요"
                        />
                      ) : (
                        <Textarea
                          value={questionAnswer}
                          onChange={(e) => setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))}
                          placeholder="답을 입력하세요"
                          rows={4}
                        />
                      )}
                    </>
                  ) : (
                    <>
                      {/* 제출 후 상세 피드백 */}
                      <div className="space-y-3">
                        <div className="p-3 bg-muted rounded-md">
                          <div className="text-sm font-semibold mb-1">내 답안:</div>
                          <div>{result?.user_answer || '(답하지 않음)'}</div>
                        </div>
                        <div className={`p-3 rounded-md ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                          <div className="text-sm font-semibold mb-1">정답:</div>
                          <div>{question.correct_answer}</div>
                        </div>
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                          <div className="text-sm font-semibold mb-1">설명:</div>
                          <div className="text-sm">{question.explanation}</div>
                        </div>
                        {question.key_concept && (
                          <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
                            <div className="text-sm font-semibold mb-1">핵심 개념:</div>
                            <div className="text-sm">{question.key_concept}</div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Submit Button or Report */}
        {!isSubmitted ? (
          <div className="mt-8 space-y-4">
            {/* 진행률 표시 (제출 중일 때만) */}
            {isSubmitting && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>채점 중...</span>
                  <span>{Math.round(submissionProgress)}%</span>
                </div>
                <Progress value={submissionProgress} className="h-2" />
              </div>
            )}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              size="lg"
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  제출 중...
                </>
              ) : (
                '제출 및 채점하기'
              )}
            </Button>
          </div>
        ) : (
          report && (
            <div className="mt-8">
              <Button
                onClick={() => setShowReport(!showReport)}
                variant="outline"
                className="w-full gap-2"
              >
                {showReport ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showReport ? '분석 리포트 숨기기' : '분석 리포트 보기'}
              </Button>

              {showReport && report && (
                <Card className="mt-4 border-2 shadow-xl bg-white">
                  <CardHeader className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
                    <div className="flex items-start justify-between pb-2 border-b-2 border-white/20">
                      <div className="flex-1">
                        <CardTitle className="text-3xl font-extrabold text-white flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center text-2xl backdrop-blur-sm">
                            📊
                          </div>
                          AI 리포트
                        </CardTitle>
                        <div className="flex items-center gap-4 text-blue-100">
                          <div className="flex items-center gap-2">
                            <span className="text-xs">생성일시</span>
                            <span className="font-medium">
                              {new Date(report.created_at).toLocaleString('ko-KR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-6 pl-6 border-l-2 border-white/20">
                        <div className="text-4xl font-extrabold text-white mb-1">
                          {score}<span className="text-2xl text-blue-200">/{total}</span>
                        </div>
                        <div className="text-lg font-semibold text-blue-100">
                          정답률 {Math.round((score / total) * 100)}%
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-8 pb-10 px-10">
                    <div className="max-w-none">
                      {(() => {
                        // 텍스트 포맷팅 함수 (마크다운 파싱만, 색상 하이라이트 제거)
                        const formatText = (text: string): JSX.Element[] => {
                          const parts: (string | JSX.Element)[] = [];
                          let currentIndex = 0;
                          
                          // **볼드** 처리만
                          const boldRegex = /\*\*(.+?)\*\*/g;
                          let lastIndex = 0;
                          let match;
                          
                          while ((match = boldRegex.exec(text)) !== null) {
                            if (match.index > lastIndex) {
                              parts.push(text.substring(lastIndex, match.index));
                            }
                            parts.push(<strong key={`bold-${currentIndex++}`} className="font-bold text-gray-900">{match[1]}</strong>);
                            lastIndex = match.index + match[0].length;
                          }
                          
                          if (lastIndex < text.length) {
                            parts.push(text.substring(lastIndex));
                          }
                          
                          if (parts.length === 0) {
                            parts.push(text);
                          }
                          
                          return parts.map((part, idx) => {
                            if (typeof part === 'string') {
                              return <span key={`text-${idx}`}>{part}</span>;
                            }
                            return part;
                          }) as JSX.Element[];
                        };

                        const lines = report.ai_report.split('\n');
                        const sections: Array<SectionWithSubsections> = [];

                        // 섹션 타입 판단 함수
                        const determineSectionType = (text: string): 'strength' | 'weakness' | 'neutral' => {
                          const strengthKeywords = ['강점', '잘한', '우수', '정확', '완벽', '훌륭', '탁월', '뛰어난', '발전', '개선된', '향상'];
                          const weaknessKeywords = ['약점', '취약점', '부족', '미흡', '개선이 필요한', '보완', '어려움', '틀린', '실수', '부족한'];
                          
                          const lowerText = text.toLowerCase();
                          for (const keyword of strengthKeywords) {
                            if (lowerText.includes(keyword)) {
                              return 'strength';
                            }
                          }
                          for (const keyword of weaknessKeywords) {
                            if (lowerText.includes(keyword)) {
                              return 'weakness';
                            }
                          }
                          return 'neutral';
                        };

                        let currentSection: SectionWithSubsections | null = null;

                        let currentList: string[] = [];
                        let sectionCounter = 0;
                        let isFirstNumberedTitle = true; // 첫 번째 숫자. 제목인지 추적

                        // 최상위 제목 판단 함수 (성과 리포트 같은 전체 제목인지 확인)
                        const isTopLevelTitle = (text: string): boolean => {
                          const topLevelKeywords = ['성과 리포트', '리포트', '학습 성과', '퀴즈 성과', '결과 리포트'];
                          const lowerText = text.toLowerCase();
                          return topLevelKeywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
                        };

                        // 섹션 제목 추출 함수 (# 또는 ## 패턴 감지)
                        const extractSectionTitle = (text: string): { title: string; level: number; isTopLevel: boolean } | null => {
                          // # 제목 패턴 처리 (중복 해시 기호 정리)
                          const hashMatch = text.match(/^(#+)\s*(.+)$/);
                          if (hashMatch) {
                            const hashCount = hashMatch[1].length;
                            let title = hashMatch[2].replace(/\*\*/g, '').trim();
                            
                            // 제목에서 불필요한 해시 기호 제거 (예: "### ## (1)" -> "(1)")
                            title = title.replace(/^#+\s*/g, '').trim();
                            
                            // # 뒤에 숫자 패턴이 있는 경우 (예: "# 2. 결과 분석 리포트" 또는 "2. 결과 분석 리포트")
                            const numberMatch = title.match(/^\d+\.\s*(.+)$/);
                            if (numberMatch) {
                              title = numberMatch[1].trim();
                            }
                            
                            // 해시 개수에 따라 레벨 결정 (1개 또는 2개만 유효)
                            let level = hashCount >= 2 ? 2 : 1;
                            
                            if (level === 1) {
                              // 메인 섹션 (# 제목)
                              return { title, level: 1, isTopLevel: false };
                            } else if (level === 2) {
                              // 서브 섹션 (## 제목) - 특별 처리
                              return { title, level: 2, isTopLevel: false };
                            }
                          }
                          
                          // 숫자. 제목 패턴 (예: "1. 전반적인 성과 평가", "2. 결과 분석 리포트")
                          // #가 없는 경우에만 매칭
                          const numberMatch = text.match(/^\d+\.\s*(.+)$/);
                          if (numberMatch) {
                            let title = numberMatch[1].replace(/\*\*/g, '').trim();
                            // 제목에서 불필요한 해시 기호 제거
                            title = title.replace(/^#+\s*/g, '').trim();
                            return { title, level: 1, isTopLevel: false };
                          }
                          
                          return null;
                        };
                        
                        // 서브 섹션 저장을 위한 구조
                        interface SectionWithSubsections {
                          title: string | null;
                          titleLevel: number;
                          type: 'strength' | 'weakness' | 'neutral';
                          content: string[];
                          lists: string[][];
                          subsections?: Array<{
                            title: string;
                            type: 'strength' | 'weakness' | 'neutral';
                            content: string[];
                            lists: string[][];
                          }>;
                        }
                        
                        const sectionsWithSubs: Array<SectionWithSubsections> = [];
                        let currentSubsection: {
                          title: string;
                          type: 'strength' | 'weakness' | 'neutral';
                          content: string[];
                          lists: string[][];
                        } | null = null;

                        lines.forEach((line) => {
                          const trimmed = line.trim();
                          
                          // 구분선 제거 (---, === 등)
                          if (trimmed.match(/^[-=]{3,}$/)) {
                            return; // 구분선은 무시
                          }
                          
                          // 제목 처리 (# 또는 ## 또는 숫자. 패턴)
                          const extracted = extractSectionTitle(trimmed);
                          if (extracted) {
                            const { title, level } = extracted;
                            
                            if (level === 2) {
                              // ## 서브 섹션 처리 (섹션 2 안의 하위 항목)
                              // 현재 서브 섹션이 있으면 저장
                              if (currentSubsection) {
                                if (currentList.length > 0) {
                                  currentSubsection.lists.push([...currentList]);
                                  currentList = [];
                                }
                                // 현재 섹션에 서브 섹션 추가
                                if (!currentSection) {
                                  currentSection = {
                                    title: null,
                                    titleLevel: 2,
                                    type: 'neutral',
                                    content: [],
                                    lists: []
                                  };
                                }
                                if (!currentSection.subsections) {
                                  currentSection.subsections = [];
                                }
                                currentSection.subsections.push({ ...currentSubsection });
                              }
                              
                              // 새 서브 섹션 시작
                              const subsectionType = determineSectionType(title);
                              currentSubsection = {
                                title: title,
                                type: subsectionType,
                                content: [],
                                lists: []
                              };
                              return;
                            }
                            
                            // level === 1: 메인 섹션 (# 제목)
                            // 현재 서브 섹션이 있으면 먼저 저장
                            if (currentSubsection) {
                              if (currentList.length > 0) {
                                currentSubsection.lists.push([...currentList]);
                                currentList = [];
                              }
                              if (!currentSection) {
                                currentSection = {
                                  title: null,
                                  titleLevel: 2,
                                  type: 'neutral',
                                  content: [],
                                  lists: []
                                };
                              }
                              if (!currentSection.subsections) {
                                currentSection.subsections = [];
                              }
                              currentSection.subsections.push({ ...currentSubsection });
                              currentSubsection = null;
                            }
                            
                            // 이전 섹션 저장
                            if (currentSection) {
                              if (currentList.length > 0) {
                                currentSection.lists.push([...currentList]);
                                currentList = [];
                              }
                              // 내용이 있는 섹션만 저장
                              if (currentSection.title || currentSection.content.length > 0 || currentSection.lists.length > 0 || currentSection.subsections?.length) {
                                sections.push({ ...currentSection });
                                sectionCounter++;
                              }
                            }
                            
                            const sectionType = determineSectionType(title);
                            
                            // 새 섹션 시작
                            currentSection = {
                              title: title,
                              titleLevel: 2,
                              type: sectionType,
                              content: [],
                              lists: [],
                              subsections: []
                            };
                            return;
                          }

                          // 리스트 항목 처리 (* 또는 -으로 시작, 단 구분선이 아닌 경우)
                          if (trimmed.match(/^[*-]\s+/) && !trimmed.match(/^[-=]{3,}$/)) {
                            const item = trimmed.replace(/^[*-]\s+/, '').replace(/\*\*/g, '').trim();
                            if (item) {
                              currentList.push(item);
                            }
                            return;
                          }

                          // 빈 줄 처리
                          if (!trimmed) {
                            if (currentList.length > 0) {
                              if (currentSubsection) {
                                currentSubsection.lists.push([...currentList]);
                              } else if (currentSection) {
                                currentSection.lists.push([...currentList]);
                              }
                              currentList = [];
                            }
                            return;
                          }

                          // 일반 텍스트 처리
                          // 서브 섹션이 활성화되어 있으면 서브 섹션에 추가
                          if (currentSubsection) {
                            // 현재 리스트가 있으면 서브 섹션에 추가
                            if (currentList.length > 0) {
                              currentSubsection.lists.push([...currentList]);
                              currentList = [];
                            }
                            // 텍스트를 서브 섹션에 추가
                            currentSubsection.content.push(trimmed);
                            return;
                          }
                          
                          // 서브 섹션이 없으면 메인 섹션에 추가
                          if (!currentSection) {
                            // 섹션이 없으면 기본 섹션 생성 (인삿말 등)
                            currentSection = {
                              title: null,
                              titleLevel: 2,
                              type: 'neutral',
                              content: [],
                              lists: []
                            };
                          }
                          
                          // 현재 리스트가 있으면 메인 섹션에 추가
                          if (currentList.length > 0) {
                            currentSection.lists.push([...currentList]);
                            currentList = [];
                          }
                          
                          // 텍스트를 메인 섹션에 추가
                          currentSection.content.push(trimmed);
                        });

                        // 마지막 서브 섹션 저장 (있다면)
                        if (currentSubsection) {
                          if (currentList.length > 0) {
                            currentSubsection.lists.push([...currentList]);
                            currentList = [];
                          }
                          if (!currentSection) {
                            currentSection = {
                              title: null,
                              titleLevel: 2,
                              type: 'neutral',
                              content: [],
                              lists: []
                            };
                          }
                          if (!currentSection.subsections) {
                            currentSection.subsections = [];
                          }
                          currentSection.subsections.push({ ...currentSubsection });
                        }
                        
                        // 마지막 섹션 저장
                        if (currentSection) {
                          if (currentList.length > 0) {
                            currentSection.lists.push([...currentList]);
                          }
                          // 내용이 있는 섹션만 저장
                          if (currentSection.title || currentSection.content.length > 0 || currentSection.lists.length > 0 || currentSection.subsections?.length) {
                            sections.push({ ...currentSection });
                          }
                        }

                        // 섹션들을 번호와 함께 렌더링 (제목이 있는 섹션만 번호 표시)
                        let numberedSectionIndex = 0;
                        
                        return sections.map((section, sectionIdx) => {
                          const { title, titleLevel, type, content, lists, subsections } = section;
                          
                          // 제목이 있는 섹션만 번호 할당
                          const hasNumberedTitle = !!title;
                          const sectionNumber = hasNumberedTitle ? ++numberedSectionIndex : null;
                          
                          // 최상위 섹션은 항상 중립 색상 (서브 섹션에만 색상 적용)
                          const borderColor = 'border-gray-400';
                          const titleColor = 'text-gray-800';

                          return (
                            <div key={sectionIdx} className="relative">
                              {/* 섹션 구분선 (첫 번째 섹션이 아니고, 제목이 있는 섹션인 경우) */}
                              {sectionIdx > 0 && hasNumberedTitle && (
                                <div className="flex items-center my-8">
                                  <div className="flex-1 border-t border-gray-300"></div>
                                  <div className="mx-4 text-gray-400 text-sm">●</div>
                                  <div className="flex-1 border-t border-gray-300"></div>
                                </div>
                              )}
                              
                              {/* 섹션 내용 */}
                              <div className={`relative ${hasNumberedTitle ? 'pl-8 border-l-4' : 'pl-4'} ${hasNumberedTitle ? borderColor : ''} py-2`}>
                                {/* 섹션 번호 (제목이 있는 경우만) - 최상위 섹션은 항상 회색 배지 */}
                                {hasNumberedTitle && sectionNumber !== null && (
                                  <div className="absolute -left-5 top-2 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md bg-gray-400 text-white border-2 border-gray-500">
                                    {sectionNumber}
                                  </div>
                                )}
                                
                                <div className="pb-2">
                                  {/* 제목 */}
                                  {title && (
                                    <h3 className={`font-bold mb-4 ${titleColor} text-xl tracking-tight`}>
                                      {/* 제목에서 마크다운 문자 제거 후 숫자 패턴 확인 - 중복 제거 포함 */}
                                      {(() => {
                                        // 마크다운 문자 제거 (#, ##, ### 등) - 여러 번 반복 제거
                                        let cleanTitle = title.replace(/^#+\s*/g, '').trim();
                                        // 제목 중간이나 끝에 있는 해시 기호도 제거
                                        cleanTitle = cleanTitle.replace(/\s*#+\s*/g, ' ').trim();
                                        // 숫자 패턴이 있으면 그대로 사용, 없으면 섹션 번호 추가
                                        return cleanTitle.match(/^\d+\.\s/) ? cleanTitle : (sectionNumber ? `${sectionNumber}. ${cleanTitle}` : cleanTitle);
                                      })()}
                                    </h3>
                                  )}

                                  {/* 내용 (문단) - 메인 섹션의 직접적인 내용 */}
                                  {content.map((paragraph, idx) => {
                                    if (paragraph.trim()) {
                                      const formatted = formatText(paragraph.trim());
                                      return (
                                        <p key={`para-${idx}`} className="text-base leading-relaxed mb-3 text-gray-700">
                                          {formatted}
                                        </p>
                                      );
                                    }
                                    return null;
                                  })}

                                  {/* 리스트 - 메인 섹션의 직접적인 리스트 */}
                                  {lists.map((listItems, listIdx) => {
                                    if (listItems.length > 0) {
                                      return (
                                        <ul key={`list-${listIdx}`} className="list-disc list-outside space-y-2 ml-6 mb-4">
                                          {listItems.map((item, itemIdx) => {
                                            const formatted = formatText(item);
                                            return (
                                              <li key={itemIdx} className="text-base leading-relaxed text-gray-700 pl-1">
                                                {formatted}
                                              </li>
                                            );
                                          })}
                                        </ul>
                                      );
                                    }
                                    return null;
                                  })}
                                  
                                  {/* 서브 섹션 렌더링 (섹션 2의 하위 항목들) - 메인 섹션 안에 중첩 */}
                                  {subsections && subsections.length > 0 && (
                                    <div className="mt-6 space-y-6">
                                      {subsections.map((subsection, subIdx) => {
                                        const subBorderColor = subsection.type === 'strength'
                                          ? 'border-green-500'
                                          : subsection.type === 'weakness'
                                          ? 'border-red-500'
                                          : 'border-gray-400';
                                        
                                        const subTitleColor = subsection.type === 'strength'
                                          ? 'text-green-700'
                                          : subsection.type === 'weakness'
                                          ? 'text-red-700'
                                          : 'text-gray-800';
                                        
                                        // 서브 섹션 번호 추출 ((1), (2), (3))
                                        const subNumberMatch = subsection.title.match(/^\((\d+)\)/);
                                        const subNumber = subNumberMatch ? subNumberMatch[1] : null;
                                        
                                        return (
                                          <div key={subIdx} className={`relative ml-6 pl-10 border-l-4 ${subBorderColor} py-4 bg-white rounded-r-lg shadow-sm`}>
                                            {/* 서브 섹션 번호 배지 (있는 경우) */}
                                            {subNumber && (
                                              <div className={`absolute -left-6 top-4 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-lg ${
                                                subsection.type === 'strength'
                                                  ? 'bg-green-500 text-white border-2 border-green-600'
                                                  : subsection.type === 'weakness'
                                                  ? 'bg-red-500 text-white border-2 border-red-600'
                                                  : 'bg-gray-400 text-white border-2 border-gray-500'
                                              }`}>
                                                {subNumber}
                                              </div>
                                            )}
                                            
                                            {/* 서브 섹션 제목 */}
                                            <h4 className={`font-semibold mb-4 ${subTitleColor} text-lg`}>
                                              {/* 마크다운 문자 제거 - 중복 제거 포함 */}
                                              {subsection.title.replace(/^#+\s*/g, '').replace(/\s*#+\s*/g, ' ').trim()}
                                            </h4>
                                            
                                            {/* 서브 섹션 내용 */}
                                            <div className="space-y-3">
                                              {subsection.content.map((paragraph, paraIdx) => {
                                                if (paragraph.trim()) {
                                                  const formatted = formatText(paragraph.trim());
                                                  return (
                                                    <p key={`sub-para-${paraIdx}`} className="text-base leading-relaxed text-gray-700">
                                                      {formatted}
                                                    </p>
                                                  );
                                                }
                                                return null;
                                              })}
                                              
                                              {/* 서브 섹션 리스트 */}
                                              {subsection.lists.map((listItems, listIdx) => {
                                                if (listItems.length > 0) {
                                                  return (
                                                    <ul key={`sub-list-${listIdx}`} className="list-disc list-outside space-y-2 ml-6 mt-2">
                                                      {listItems.map((item, itemIdx) => {
                                                        const formatted = formatText(item);
                                                        return (
                                                          <li key={itemIdx} className="text-base leading-relaxed text-gray-700 pl-1">
                                                            {formatted}
                                                          </li>
                                                        );
                                                      })}
                                                    </ul>
                                                  );
                                                }
                                                return null;
                                              })}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}

