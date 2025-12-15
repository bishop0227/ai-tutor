/**
 * 퀴즈 히스토리 컴포넌트
 * 과목별 퀴즈 목록을 보여주고 관리합니다.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Loader2, Trash2, Eye, RotateCcw } from 'lucide-react';
import { getQuizHistory, deleteQuiz, type Quiz, type QuizReport } from '../services/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface QuizHistoryProps {
  subjectId: number;
  userId: number;
  subjectName: string;
  onViewQuiz: (quizId: number, mode?: 'view' | 'retake') => void;
  onClose: () => void;
}

export default function QuizHistory({
  subjectId,
  userId,
  subjectName,
  onViewQuiz,
  onClose,
}: QuizHistoryProps) {
  const [quizzes, setQuizzes] = useState<Array<Quiz & { report: QuizReport | null }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingQuizId, setDeletingQuizId] = useState<number | null>(null);

  useEffect(() => {
    loadQuizHistory();
  }, [subjectId, userId]);

  const loadQuizHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getQuizHistory(subjectId, userId);
      setQuizzes(data.quizzes);
    } catch (err) {
      setError(err instanceof Error ? err.message : '퀴즈 히스토리를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (quizId: number) => {
    if (!confirm('이 퀴즈를 삭제하시겠습니까?')) {
      return;
    }

    setDeletingQuizId(quizId);
    try {
      await deleteQuiz(quizId, userId);
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    } catch (err) {
      alert(err instanceof Error ? err.message : '퀴즈 삭제에 실패했습니다.');
    } finally {
      setDeletingQuizId(null);
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

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{subjectName} - 퀴즈 히스토리</DialogTitle>
          <DialogDescription>
            과거에 생성한 퀴즈 목록을 확인하고 관리할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="p-4 bg-destructive/10 text-destructive rounded-md text-center">
              {error}
            </div>
          ) : quizzes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium mb-2">퀴즈가 없습니다</p>
              <p className="text-sm">새로운 퀴즈를 생성해보세요.</p>
            </div>
          ) : (
            quizzes.map((quiz) => {
              const weekScope = formatWeekScope(quiz.week_numbers);
              const hasReport = !!quiz.report;

              return (
                <Card key={quiz.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">
                            Quiz #{quiz.quiz_number} - {weekScope}
                          </h3>
                          {hasReport && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                              완료
                            </span>
                          )}
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div>
                            난이도: {quiz.difficulty} | 문제 유형: {quiz.question_types.join(', ')} | 언어: {quiz.language === 'korean' ? '한국어' : 'English'}
                          </div>
                          <div>문제 수: {quiz.num_questions}개</div>
                          {hasReport && quiz.report && (
                            <div className="font-medium text-primary">
                              점수: {quiz.report.score} / {quiz.report.total} ({Math.round((quiz.report.score / quiz.report.total) * 100)}%)
                            </div>
                          )}
                          <div>생성일: {formatDate(quiz.created_at)}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {hasReport ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onViewQuiz(quiz.id, 'view')}
                              className="gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              결과 보기
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => onViewQuiz(quiz.id, 'retake')}
                              className="gap-2"
                            >
                              <RotateCcw className="h-4 w-4" />
                              다시 풀기
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => onViewQuiz(quiz.id, 'retake')}
                            className="gap-2"
                          >
                            <RotateCcw className="h-4 w-4" />
                            풀기
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(quiz.id)}
                          disabled={deletingQuizId === quiz.id}
                          className="gap-2 text-destructive hover:text-destructive"
                        >
                          {deletingQuizId === quiz.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

