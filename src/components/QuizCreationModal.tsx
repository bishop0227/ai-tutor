/**
 * 퀴즈 생성 모달 컴포넌트
 * 주차 선택, 난이도, 문제 유형 등을 설정하여 퀴즈를 생성합니다.
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Loader2, CheckCircle2, Plus, Minus } from 'lucide-react';
import { Progress } from './ui/progress';
import { generateQuiz, type SubjectDetail, type Week } from '../services/api';

interface QuizCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: SubjectDetail;
  userId: number;
  onQuizGenerated: (quizId: number) => void;
}

export default function QuizCreationModal({
  open,
  onOpenChange,
  subject,
  userId,
  onQuizGenerated,
}: QuizCreationModalProps) {
  const [selectedWeeks, setSelectedWeeks] = useState<number[]>([]);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [questionTypes, setQuestionTypes] = useState<('multiple_choice' | 'short_answer' | 'subjective')[]>(['multiple_choice']);
  const [language, setLanguage] = useState<'korean' | 'english'>('korean');
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [numQuestionsInput, setNumQuestionsInput] = useState<string>('5'); // 입력 중인 값
  const [pastExamContext, setPastExamContext] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // PDF가 있는 주차만 필터링
  const weeksWithPDFs = subject.weeks?.filter((week) => {
    const pdfMaterials = week.materials?.filter((m) => m.file_type === 'pdf');
    return pdfMaterials && pdfMaterials.length > 0;
  }) || [];

  useEffect(() => {
    if (open) {
      // 모달이 열릴 때 초기화
      setSelectedWeeks([]);
      setDifficulty('medium');
      setQuestionTypes(['multiple_choice']);
      setLanguage('korean');
      setNumQuestions(5);
      setNumQuestionsInput('5');
      setPastExamContext('');
      setError(null);
      setGenerationProgress(0);
    }
  }, [open]);

  const handleWeekToggle = (weekNumber: number) => {
    setSelectedWeeks((prev) =>
      prev.includes(weekNumber)
        ? prev.filter((w) => w !== weekNumber)
        : [...prev, weekNumber]
    );
  };

  const handleQuestionTypeToggle = (type: 'multiple_choice' | 'short_answer' | 'subjective') => {
    setQuestionTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  const handleGenerate = async () => {
    if (selectedWeeks.length === 0) {
      setError('최소 한 개의 주차를 선택해주세요.');
      return;
    }

    if (questionTypes.length === 0) {
      setError('최소 한 가지 문제 유형을 선택해주세요.');
      return;
    }

    if (numQuestions < 1) {
      setError('문제 개수는 1개 이상이어야 합니다.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGenerationProgress(0);

    // 진행률 시뮬레이션
    const progressInterval = setInterval(() => {
      setGenerationProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 300);

    try {
      const result = await generateQuiz(subject.id, userId, {
        week_numbers: selectedWeeks,
        difficulty,
        question_types: questionTypes,
        language,
        num_questions: numQuestions,
        past_exam_context: pastExamContext || undefined,
      });

      clearInterval(progressInterval);
      setGenerationProgress(100);
      
      // 완료 후 잠시 대기
      await new Promise(resolve => setTimeout(resolve, 300));
      
      onQuizGenerated(result.quiz.id);
      onOpenChange(false);
    } catch (err) {
      clearInterval(progressInterval);
      console.error('퀴즈 생성 에러:', err);
      if (err instanceof Error) {
        setError(err.message || '퀴즈 생성에 실패했습니다. 백엔드 서버 콘솔을 확인하세요.');
      } else {
        setError('퀴즈 생성에 실패했습니다. 백엔드 서버 콘솔을 확인하세요.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>퀴즈 생성</DialogTitle>
          <DialogDescription>
            주차별 PDF 자료를 기반으로 퀴즈를 생성합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 주차 선택 */}
          <div className="space-y-2">
            <Label>범위 (주차 선택)</Label>
            <p className="text-sm text-muted-foreground">
              PDF 파일이 업로드된 주차만 선택 가능합니다.
            </p>
            <div className="grid grid-cols-4 gap-2 max-h-[150px] overflow-y-auto p-2 border rounded-md">
              {weeksWithPDFs.map((week) => {
                const isSelected = selectedWeeks.includes(week.week_number);
                return (
                  <Button
                    key={week.id}
                    type="button"
                    variant={isSelected ? 'default' : 'outline'}
                    onClick={() => handleWeekToggle(week.week_number)}
                    className="h-10"
                  >
                    Week {week.week_number}
                  </Button>
                );
              })}
              {weeksWithPDFs.length === 0 && (
                <p className="col-span-4 text-sm text-muted-foreground text-center py-4">
                  PDF가 업로드된 주차가 없습니다.
                </p>
              )}
            </div>
          </div>

          {/* 난이도 선택 */}
          <div className="space-y-2">
            <Label>난이도</Label>
            <RadioGroup value={difficulty} onValueChange={(value) => setDifficulty(value as 'easy' | 'medium' | 'hard')}>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="easy" id="difficulty-easy" />
                  <Label htmlFor="difficulty-easy" className="cursor-pointer font-normal">
                    Easy
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="difficulty-medium" />
                  <Label htmlFor="difficulty-medium" className="cursor-pointer font-normal">
                    Medium
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hard" id="difficulty-hard" />
                  <Label htmlFor="difficulty-hard" className="cursor-pointer font-normal">
                    Hard
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* 문제 유형 선택 */}
          <div className="space-y-2">
            <Label>문제 유형 (복수 선택 가능)</Label>
            <div className="flex gap-4 flex-wrap">
              {(['multiple_choice', 'short_answer', 'subjective'] as const).map((type) => {
                const isSelected = questionTypes.includes(type);
                const labels = {
                  multiple_choice: '객관식',
                  short_answer: '단답형',
                  subjective: '주관식',
                };
                return (
                  <Button
                    key={type}
                    type="button"
                    variant={isSelected ? 'default' : 'outline'}
                    onClick={() => handleQuestionTypeToggle(type)}
                    className="gap-2"
                  >
                    {isSelected && <CheckCircle2 className="h-4 w-4" />}
                    {labels[type]}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* 언어 선택 */}
          <div className="space-y-2">
            <Label>언어</Label>
            <RadioGroup value={language} onValueChange={(value) => setLanguage(value as 'korean' | 'english')}>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="korean" id="language-korean" />
                  <Label htmlFor="language-korean" className="cursor-pointer font-normal">
                    한국어
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="english" id="language-english" />
                  <Label htmlFor="language-english" className="cursor-pointer font-normal">
                    English
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* 문제 개수 */}
          <div className="space-y-2">
            <Label htmlFor="num-questions">문제 개수</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  const newValue = Math.max(1, numQuestions - 1);
                  setNumQuestions(newValue);
                  setNumQuestionsInput(newValue.toString());
                }}
                disabled={numQuestions <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                id="num-questions"
                type="number"
                min="1"
                max="20"
                value={numQuestionsInput}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  setNumQuestionsInput(inputValue);
                  
                  // 숫자만 입력 가능하도록 처리
                  if (inputValue === '') {
                    // 빈 문자열은 허용 (사용자가 입력 중)
                    return;
                  }
                  
                  const value = parseInt(inputValue, 10);
                  if (!isNaN(value)) {
                    if (value >= 1 && value <= 20) {
                      setNumQuestions(value);
                    } else if (value < 1) {
                      setNumQuestions(1);
                      setNumQuestionsInput('1');
                    } else if (value > 20) {
                      setNumQuestions(20);
                      setNumQuestionsInput('20');
                    }
                  }
                }}
                onBlur={(e) => {
                  // 포커스를 잃을 때 빈 값이거나 유효하지 않은 값이면 기본값으로 설정
                  const value = parseInt(e.target.value, 10);
                  if (isNaN(value) || value < 1) {
                    setNumQuestions(1);
                    setNumQuestionsInput('1');
                  } else if (value > 20) {
                    setNumQuestions(20);
                    setNumQuestionsInput('20');
                  } else {
                    setNumQuestions(value);
                    setNumQuestionsInput(value.toString());
                  }
                }}
                className="text-center"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  const newValue = Math.min(20, numQuestions + 1);
                  setNumQuestions(newValue);
                  setNumQuestionsInput(newValue.toString());
                }}
                disabled={numQuestions >= 20}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 과거 시험 예시 */}
          <div className="space-y-2">
            <Label htmlFor="past-exam">과거 시험 예시 (선택사항)</Label>
            <Textarea
              id="past-exam"
              placeholder="e.g., What is the prerequisite for selecting training data in ML?"
              value={pastExamContext}
              onChange={(e) => setPastExamContext(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              참고할 과거 시험 문제나 문제 스타일을 입력하세요.
            </p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
              {error}
            </div>
          )}

          {/* 진행률 표시 (생성 중일 때만) */}
          {isGenerating && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>퀴즈 생성 중...</span>
                <span>{Math.round(generationProgress)}%</span>
              </div>
              <Progress value={generationProgress} className="h-2" />
            </div>
          )}

          {/* 생성 버튼 */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || selectedWeeks.length === 0 || questionTypes.length === 0}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                퀴즈 생성 중...
              </>
            ) : (
              '퀴즈 생성하기'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

