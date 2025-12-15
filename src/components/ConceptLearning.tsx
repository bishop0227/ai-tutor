/**
 * 개념 학습 페이지 컴포넌트
 * 수식 렌더링 문제 해결 버전
 */

import { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { ArrowLeft, Loader2, BookOpen, RefreshCw } from 'lucide-react';
import { generateConcept, getSubjectDetail, type SubjectDetail } from '../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Progress } from './ui/progress';

interface ConceptLearningProps {
  weekId: number;
  subjectId: number;
  onBack: () => void;
  subject?: SubjectDetail;
}

export default function ConceptLearning({ weekId, subjectId, onBack, subject: initialSubject }: ConceptLearningProps) {
  const [conceptMode, setConceptMode] = useState<'summary' | 'deep_dive'>('summary');
  const [conceptText, setConceptText] = useState<string | null>(null);
  const [isLoadingConcept, setIsLoadingConcept] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState<SubjectDetail | null>(initialSubject || null);


  // 과목 정보 로드
  useEffect(() => {
    const loadSubject = async () => {
      if (subject) return;
      
      try {
        const cachedSubject = sessionStorage.getItem(`subject_${subjectId}`);
        if (cachedSubject) {
          setSubject(JSON.parse(cachedSubject));
          return;
        }
        
        const subjectData = await getSubjectDetail(subjectId);
        setSubject(subjectData.subject);
        sessionStorage.setItem(`subject_${subjectId}`, JSON.stringify(subjectData.subject));
      } catch (err) {
        console.error('❌ 과목 정보 로드 실패:', err);
      }
    };
    
    loadSubject();
  }, [subjectId, subject]);

  // 개념 생성 함수 (항상 새로 생성)
  const handleGenerateConcept = async () => {
    setError(null);
    
    setIsLoadingConcept(true);
    setConceptText(null);
    setLoadingProgress(0);
    
    let progressValue = 0;
    let progressInterval: ReturnType<typeof setInterval> | null = null;

    try {
      progressInterval = setInterval(() => {
        progressValue += 2;
        if (progressValue >= 95) {
          if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
          }
          setLoadingProgress(95);
        } else {
          setLoadingProgress(progressValue);
        }
      }, 300);
      
      const response = await generateConcept(weekId, conceptMode);
      let text = response.concept;
      
      // 최소한의 정리만 수행 - 수식은 절대 건드리지 않음
      text = text.replace(/<br\s*\/?>/gi, '\n');
      text = text.replace(/\n{3,}/g, '\n\n');
      
      setConceptText(text);
      
      const cacheKey = `concept_${weekId}_${conceptMode}`;
      localStorage.setItem(cacheKey, text);
      
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      setLoadingProgress(100);
      
      setTimeout(() => {
        setLoadingProgress(0);
      }, 500);
    } catch (err) {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      setError(err instanceof Error ? err.message : '개념 정리 생성에 실패했습니다.');
      setLoadingProgress(0);
    } finally {
      setIsLoadingConcept(false);
    }
  };

  // 초기 로드 및 모드 변경 시 캐시 확인만 수행 (자동 생성하지 않음)
  useEffect(() => {
    const cacheKey = `concept_${weekId}_${conceptMode}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      setConceptText(cached);
    } else {
      setConceptText(null);
    }
  }, [conceptMode, weekId]);

  // 제목 생성: "과목명 주차 개념 학습"
  const getTitle = () => {
    if (!subject) return '개념 학습';
    const week = subject.weeks?.find(w => w.id === weekId);
    const weekNo = week?.week_number || '';
    return `${subject.name} ${weekNo}주차 개념 학습`;
  };

  const subjectColor = subject?.color || '#3B82F6';
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 59, g: 130, b: 246 };
  };
  
  const rgb = hexToRgb(subjectColor);
  const pageBgColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`;

  const loadingMessage = conceptMode === 'summary' ? '내용을 요약하는 중...' : '상세한 내용 설명 생성 중...';

  return (
    <div 
      className="min-h-screen"
      style={{ 
        background: `linear-gradient(to bottom right, ${pageBgColor}, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.20))`
      }}
    >
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* 제목: "과목명 주차 개념 학습" */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            뒤로 가기
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{getTitle()}</h1>
        </div>

        {/* 학습 모드 선택 및 다시 생성 버튼 */}
        <Card className="mb-6 bg-white">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <Label className="text-sm font-medium text-gray-700 mb-2 block">학습 모드</Label>
                <RadioGroup 
                  value={conceptMode} 
                  onValueChange={(value) => setConceptMode(value as 'summary' | 'deep_dive')}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="summary" id="summary" />
                    <Label htmlFor="summary" className="cursor-pointer font-normal text-sm">
                      핵심 요약
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="deep_dive" id="deep_dive" />
                    <Label htmlFor="deep_dive" className="cursor-pointer font-normal text-sm">
                      상세 설명
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerateConcept()}
                disabled={isLoadingConcept}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingConcept ? 'animate-spin' : ''}`} />
                {conceptText ? '다시 생성하기' : '생성하기'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 에러 표시 */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-red-700">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* 결과 표시 - 노트 정리 느낌, 수식 렌더링에 집중 */}
        <Card className="shadow-lg border-0 bg-white">
          <CardContent className="pt-8 pb-8">
            {isLoadingConcept ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-base text-gray-600 mb-4">{loadingMessage}</p>
                <div className="w-full max-w-md">
                  <Progress value={loadingProgress} className="mb-2 h-3" />
                  <p className="text-sm font-medium text-gray-700 text-center mt-2">{Math.round(loadingProgress)}%</p>
                </div>
              </div>
            ) : conceptText ? (
              <div className="prose prose-lg max-w-none">
                {/* 디버깅: 수식이 포함되어 있는지 확인 */}
                {conceptText.includes('$') && (
                  <div className="mb-4 p-2 bg-blue-50 text-xs text-blue-700 rounded">
                    ✅ 수식 감지됨: {conceptText.match(/\$[^$@]+\$/g)?.filter(m => !m.includes('http') && !m.includes('@')).length || 0}개의 인라인 수식, {conceptText.match(/\$\$[^$]+\$\$/g)?.length || 0}개의 블록 수식
                  </div>
                )}
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[[rehypeKatex, { 
                    strict: 'ignore',
                    throwOnError: false,
                    errorColor: '#cc0000'
                  }]]}
                  components={{
                    // 문단: 충분한 간격, 수식이 있으면 더 큰 간격
                    p: ({ children, ...props }: any) => {
                      const text = typeof children === 'string' 
                        ? children 
                        : (Array.isArray(children) ? children.join('') : '');
                      const hasMath = text.includes('$') || text.includes('\\[') || text.includes('\\(');
                      return (
                        <p 
                          className={`text-gray-700 leading-relaxed ${hasMath ? 'my-8' : 'my-6'}`}
                          {...props}
                        >
                          {children}
                        </p>
                      );
                    },
                    // 제목: 충분한 간격
                    h2: ({ children, ...props }: any) => (
                      <h2 
                        className="text-2xl font-bold text-gray-900 mt-12 mb-6 pb-3 border-b border-gray-200"
                        {...props}
                      >
                        {children}
                      </h2>
                    ),
                    h3: ({ children, ...props }: any) => (
                      <h3 
                        className="text-xl font-semibold text-gray-800 mt-8 mb-4"
                        {...props}
                      >
                        {children}
                      </h3>
                    ),
                    // 리스트: 충분한 간격
                    ul: ({ children, ...props }: any) => (
                      <ul className="list-disc list-outside ml-6 my-6 space-y-2" {...props}>
                        {children}
                      </ul>
                    ),
                    ol: ({ children, ...props }: any) => (
                      <ol className="list-decimal list-outside ml-6 my-6 space-y-2" {...props}>
                        {children}
                      </ol>
                    ),
                    li: ({ children, ...props }: any) => (
                      <li className="text-gray-700 mb-2" {...props}>
                        {children}
                      </li>
                    ),
                    // 코드: 수식이 아닌 경우에만 스타일 적용
                    code: ({ node, inline, className, children, ...props }: any) => {
                      // KaTeX 수식인지 확인
                      const parent = node?.parent;
                      const isKatex = parent?.properties?.className?.some?.((cls: string) => 
                        cls?.includes?.('katex')
                      ) || false;
                      
                      if (isKatex) {
                        // 수식이면 그대로 반환
                        return <>{children}</>;
                      }
                      
                      // 일반 코드만 스타일 적용
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <code className="block bg-gray-900 text-gray-100 p-4 rounded-lg text-sm font-mono overflow-x-auto my-6" {...props}>
                          {children}
                        </code>
                      ) : (
                        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800" {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {conceptText}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-20">
                <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-base mb-4">
                  콘텐츠가 없습니다. 생성하기 버튼을 클릭하여 내용을 생성하세요.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
