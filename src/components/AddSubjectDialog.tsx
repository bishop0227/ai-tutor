/**
 * 과목 추가 다이얼로그 컴포넌트
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Progress } from './ui/progress';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { createSubject, type Subject } from '../services/api';

interface AddSubjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number;
  onSuccess: (subject: Subject) => void;
}

export default function AddSubjectDialog({
  open,
  onOpenChange,
  userId,
  onSuccess,
}: AddSubjectDialogProps) {
  const [name, setName] = useState('');
  const [subjectType, setSubjectType] = useState<'교양' | '전공'>('교양');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [progress, setProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('PDF 파일만 업로드 가능합니다.');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 중복 클릭 방지
    if (isLoading) {
      return;
    }

    if (!name.trim()) {
      setError('과목명을 입력해주세요.');
      return;
    }

    if (!file) {
      setError('강의계획서 PDF 파일을 선택해주세요.');
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setLoadingStep('PDF 파일 업로드 중...');

    let progressInterval: ReturnType<typeof setInterval> | null = null;

    // 진행률 시뮬레이션 (실제 진행률은 백엔드에서 추적하기 어려움)
    progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          if (progressInterval) clearInterval(progressInterval);
          return 95;
        }
        if (prev < 30) {
          setLoadingStep('PDF 파일 업로드 중...');
          return prev + 2;
        } else if (prev < 50) {
          setLoadingStep('텍스트 추출 중...');
          return prev + 1.5;
        } else if (prev < 90) {
          setLoadingStep('AI 분석 중...');
          return prev + 1;
        } else {
          setLoadingStep('완료 중...');
          return prev + 0.5;
        }
      });
    }, 200);

    try {
      // FormData로 API 호출
      const response = await createSubject(userId, name.trim(), subjectType, file);
      
      // 완료 표시
      if (progressInterval) clearInterval(progressInterval);
      setProgress(100);
      setLoadingStep('완료!');
      
      // 약간의 지연 후 성공 처리
      setTimeout(() => {
        onSuccess(response.subject);
        
        // 폼 초기화
        setName('');
        setSubjectType('교양');
        setFile(null);
        setError(null);
        setProgress(0);
        setLoadingStep('');
        onOpenChange(false);
      }, 500);
    } catch (err) {
      if (progressInterval) clearInterval(progressInterval);
      setError(err instanceof Error ? err.message : '과목 생성에 실패했습니다.');
      setProgress(0);
      setLoadingStep('');
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setName('');
      setSubjectType('교양');
      setFile(null);
      setError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>새 과목 추가</DialogTitle>
          <DialogDescription>
            과목명과 강의계획서 PDF를 업로드하여 새로운 과목을 생성하세요.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* 과목명 입력 */}
            <div className="space-y-2">
              <Label htmlFor="name">과목명</Label>
              <Input
                id="name"
                type="text"
                placeholder="예: 미적분학 1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            {/* 과목 유형 선택 */}
            <div className="space-y-2">
              <Label>과목 유형</Label>
              <RadioGroup
                value={subjectType}
                onValueChange={(value) => setSubjectType(value as '교양' | '전공')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="교양" id="교양" disabled={isLoading} />
                  <Label htmlFor="교양" className="cursor-pointer font-normal">
                    교양
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="전공" id="전공" disabled={isLoading} />
                  <Label htmlFor="전공" className="cursor-pointer font-normal">
                    전공
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* 파일 업로드 */}
            <div className="space-y-2">
              <Label htmlFor="file">강의계획서 PDF</Label>
              <div className="flex items-center gap-2 min-w-0">
                <label
                  htmlFor="file"
                  className="flex flex-1 cursor-pointer items-center gap-2 rounded-md border border-input bg-white px-3 py-2 text-sm hover:bg-gray-50 min-w-0"
                >
                  <Upload className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1 min-w-0 truncate" title={file ? file.name : undefined}>
                    {file ? file.name : 'PDF 파일 선택'}
                  </span>
                </label>
                <input
                  id="file"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isLoading}
                />
                {file && (
                  <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                )}
              </div>
              {file && (
                <p className="text-xs text-muted-foreground truncate" title={`${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`}>
                  선택된 파일: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            {/* 로딩 상태 표시 */}
            {isLoading && (
              <div className="space-y-3 rounded-md bg-blue-50 p-4 border border-blue-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {loadingStep || '처리 중...'}
                  </span>
                  <span className="font-medium text-muted-foreground">
                    {Math.round(progress)}%
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* 에러 메시지 */}
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              취소
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? '생성 중...' : '생성'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

