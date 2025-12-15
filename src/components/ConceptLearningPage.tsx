/**
 * Concept Learning Page
 * 노트북 스타일의 개념 학습 페이지
 */

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Progress } from './ui/progress';
import { ArrowLeft, RefreshCw, Loader2, BookOpen } from 'lucide-react';
import { generateConceptContent, getSubjectDetail, type SubjectDetail } from '../services/api';

interface ConceptLearningPageProps {
  subjectId: number;
  weekId: number;
  onBack: () => void;
}

type Mode = 'summary' | 'deep_dive';

export default function ConceptLearningPage({ subjectId, weekId, onBack }: ConceptLearningPageProps) {
  const [subject, setSubject] = useState<SubjectDetail | null>(null);
  const [activeMode, setActiveMode] = useState<Mode>('summary');
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // 주차 정보 찾기
  const week = subject?.weeks?.find(w => w.id === weekId);
  const weekNumber = week?.week_number || 0;
  const subjectName = subject?.name || '';

  // Subject의 테마 색상 가져오기
  const subjectColor = subject?.color || '#A8D5E2';
  
  // 텍스트 색상 결정 함수 (밝은 배경에는 어두운 텍스트)
  const getTextColor = (baseColor: string) => {
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 200 ? '#1F2937' : '#FFFFFF';
  };

  useEffect(() => {
    loadSubjectAndContent();
  }, [subjectId, weekId]);

  // 모드 변경 시 캐시만 확인 (자동 생성하지 않음)
  useEffect(() => {
    if (subject && weekId) {
      // localStorage에서 캐시 확인
      const cacheKey = `concept_${weekId}_${activeMode}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setContent(cached);
        setIsLoading(false);
      } else {
        setContent('');
        setIsLoading(false);
      }
    }
  }, [activeMode, subject, weekId]);

  const loadSubjectAndContent = async () => {
    try {
      setIsLoading(true);
      const response = await getSubjectDetail(subjectId);
      setSubject(response.subject);
    } catch (err) {
      setError(err instanceof Error ? err.message : '과목 정보를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadContent = async (mode: Mode, forceRegenerate: boolean) => {
    // 진행률 시뮬레이션을 위한 인터벌
    let progressInterval: ReturnType<typeof setInterval> | null = null;
    
    try {
      if (forceRegenerate) {
        setIsRegenerating(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      setLoadingProgress(0);

      // 진행률 시뮬레이션 시작 (0% → 90%)
      progressInterval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 90) {
            return 90; // 90%에서 대기
          }
          return prev + Math.random() * 15; // 랜덤하게 증가
        });
      }, 200);

      const response = await generateConceptContent(weekId, mode, forceRegenerate);
      
      // 응답이 완전한지 확인
      if (!response || !response.content || response.content.trim().length === 0) {
        throw new Error('콘텐츠가 비어있습니다. 다시 시도해주세요.');
      }
      
      // 콘텐츠가 완전히 생성되었는지 확인 (최소 길이 체크)
      if (response.content.trim().length < 100) {
        throw new Error('생성된 콘텐츠가 너무 짧습니다. 다시 시도해주세요.');
      }
      
      // 완료 시 100%로 설정
      setLoadingProgress(100);
      
      // 응답이 완전히 받아진 후에만 콘텐츠 설정
      // 약간의 지연을 두어 진행률이 100%에 도달한 것을 사용자가 볼 수 있도록 함
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 콘텐츠가 완전히 준비된 후에만 상태 업데이트
      setContent(response.content);
      
      // localStorage에 캐시 저장
      const cacheKey = `concept_${weekId}_${mode}`;
      localStorage.setItem(cacheKey, response.content);
      
      // 완료 후 잠시 대기 후 진행률 초기화
      setTimeout(() => {
        setLoadingProgress(0);
      }, 500);
    } catch (err) {
      let errorMessage = '콘텐츠를 불러오는데 실패했습니다.';
      
      if (err instanceof Error) {
        errorMessage = err.message;
        
        // 할당량 초과 에러인 경우 더 친절한 메시지
        if (errorMessage.includes('할당량') || errorMessage.includes('quota') || errorMessage.includes('exceeded')) {
          errorMessage = 'Gemini API 할당량을 초과했습니다. 잠시 후 다시 시도해주세요. (일반적으로 몇 분 후에 재시도 가능합니다)';
        }
      }
      
      setError(errorMessage);
      setLoadingProgress(0);
      console.error('콘텐츠 로드 오류:', err);
    } finally {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      setIsLoading(false);
      setIsRegenerating(false);
    }
  };

  const handleRegenerate = () => {
    loadContent(activeMode, true);
  };

  if (isLoading && !content) {
    const textColor = getTextColor(subjectColor);
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: subjectColor }}
      >
        <div className="text-center w-full max-w-md px-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" style={{ color: textColor }} />
          <p className="text-lg mb-4" style={{ color: textColor }}>콘텐츠를 불러오는 중...</p>
          <div className="bg-white/20 rounded-full p-1 mb-2">
            <Progress value={loadingProgress} className="h-2" />
          </div>
          <p className="text-sm" style={{ color: textColor }}>
            {Math.round(loadingProgress)}%
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen"
      style={{ backgroundColor: subjectColor }}
    >
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="container mx-auto max-w-5xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="hover:bg-gray-100"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {subjectName} {weekNumber}주차 개념 학습
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {activeMode === 'summary' ? '핵심 요약' : '상세 설명'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isRegenerating && (
                <div className="flex items-center gap-2 min-w-[120px]">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${loadingProgress}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 whitespace-nowrap">
                    {Math.round(loadingProgress)}%
                  </span>
                </div>
              )}
              <Button
                onClick={handleRegenerate}
                disabled={isRegenerating}
                variant="outline"
                className="gap-2"
              >
                {isRegenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {content ? '다시 생성 중...' : '생성 중...'}
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    {content ? '다시 생성하기' : '생성하기'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-5xl px-4 py-8">
        {/* Mode Selection Tabs */}
        <Tabs value={activeMode} onValueChange={(v) => setActiveMode(v as Mode)} className="mb-6">
          <TabsList className="bg-white/90 backdrop-blur-sm">
            <TabsTrigger value="summary" className="gap-2">
              <BookOpen className="h-4 w-4" />
              핵심 요약
            </TabsTrigger>
            <TabsTrigger value="deep_dive" className="gap-2">
              <BookOpen className="h-4 w-4" />
              상세 설명
            </TabsTrigger>
          </TabsList>

          {/* Summary Mode */}
          <TabsContent value="summary" className="mt-6">
            <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
              <CardContent className="p-8">
                {error ? (
                  <div className="text-center py-12">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
                      <p className="text-red-800 font-semibold mb-2">오류 발생</p>
                      <p className="text-red-600 mb-4 text-sm">{error}</p>
                      {error.includes('할당량') && (
                        <p className="text-gray-600 text-xs mb-4">
                          💡 팁: Gemini API의 무료 할당량은 시간당 제한이 있습니다. 몇 분 후에 다시 시도해보세요.
                        </p>
                      )}
                      <Button onClick={() => loadContent('summary', false)} variant="outline">
                        다시 시도
                      </Button>
                    </div>
                  </div>
                ) : content ? (
                  <div className="concept-content">
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      components={{
                        // Heading with highlighter effect and proper sizing
                        h1: ({ node, ...props }) => (
                          <h1
                            className="font-bold mb-6 mt-8 pb-3 border-b-2 border-gray-300 first:mt-0"
                            style={{
                              backgroundColor: 'rgba(255, 255, 0, 0.2)',
                              padding: '0.75rem 1.25rem',
                              borderRadius: '0.375rem',
                              display: 'block',
                              fontSize: '2rem',
                            }}
                            {...props}
                          />
                        ),
                        h2: ({ node, ...props }) => (
                          <h2
                            className="font-semibold mb-4 mt-6 first:mt-0"
                            style={{
                              display: 'block',
                              fontSize: '1.5rem',
                            }}
                            {...props}
                          />
                        ),
                        h3: ({ node, ...props }) => (
                          <h3
                            className="font-semibold mb-3 mt-5 first:mt-0"
                            style={{
                              display: 'block',
                              fontSize: '1.25rem',
                            }}
                            {...props}
                          />
                        ),
                        // Ordered list with hierarchical numbering
                        ol: ({ node, ...props }) => (
                          <ol className="concept-list-level-1" style={{ display: 'block' }} {...props} />
                        ),
                        li: ({ node, children, ...props }) => {
                          // 리스트 항목이 인라인으로 표시되지 않도록 강제
                          return (
                            <li className="concept-list-item" style={{ display: 'block', marginBottom: '0.5rem' }} {...props}>
                              {children}
                            </li>
                          );
                        },
                        // Unordered list
                        ul: ({ node, ...props }) => (
                          <ul className="ml-6 mb-4 space-y-2" style={{ display: 'block' }} {...props} />
                        ),
                        // Paragraph with proper sizing (smaller than headings)
                        p: ({ node, ...props }) => (
                          <p className="mb-4 leading-relaxed text-gray-800 text-base" style={{ fontSize: '1rem' }} {...props} />
                        ),
                        // Math display (block) - KaTeX가 자동으로 처리
                        div: ({ node, ...props }) => <div {...props} />,
                        // Inline math - KaTeX가 자동으로 처리
                        span: ({ node, ...props }) => <span {...props} />,
                        // Code blocks
                        code: ({ node, ...props }: any) => {
                          const inline = (props as any).inline;
                          if (inline) {
                            return (
                              <code
                                className="px-1.5 py-0.5 bg-gray-100 rounded text-sm font-mono"
                                {...props}
                              />
                            );
                          }
                          return (
                            <code
                              className="block p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto mb-4"
                              {...props}
                            />
                          );
                        },
                      }}
                    >
                      {content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50 text-gray-400" />
                    <p className="text-gray-600">콘텐츠가 없습니다. 생성하기 버튼을 클릭하여 내용을 생성하세요.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deep Dive Mode */}
          <TabsContent value="deep_dive" className="mt-6">
            <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
              <CardContent className="p-8">
                {error ? (
                  <div className="text-center py-12">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
                      <p className="text-red-800 font-semibold mb-2">오류 발생</p>
                      <p className="text-red-600 mb-4 text-sm">{error}</p>
                      {error.includes('할당량') && (
                        <p className="text-gray-600 text-xs mb-4">
                          💡 팁: Gemini API의 무료 할당량은 시간당 제한이 있습니다. 몇 분 후에 다시 시도해보세요.
                        </p>
                      )}
                      <Button onClick={() => loadContent('deep_dive', false)} variant="outline">
                        다시 시도
                      </Button>
                    </div>
                  </div>
                ) : content ? (
                  <div className="concept-content">
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      components={{
                        h1: ({ node, ...props }) => (
                          <h1
                            className="font-bold mb-6 mt-8 pb-3 border-b-2 border-gray-300 first:mt-0"
                            style={{
                              backgroundColor: 'rgba(255, 255, 0, 0.2)',
                              padding: '0.75rem 1.25rem',
                              borderRadius: '0.375rem',
                              display: 'block',
                              fontSize: '2rem',
                            }}
                            {...props}
                          />
                        ),
                        h2: ({ node, ...props }) => (
                          <h2
                            className="font-semibold mb-4 mt-6 first:mt-0"
                            style={{
                              display: 'block',
                              fontSize: '1.5rem',
                            }}
                            {...props}
                          />
                        ),
                        h3: ({ node, ...props }) => (
                          <h3
                            className="font-semibold mb-3 mt-5 first:mt-0"
                            style={{
                              display: 'block',
                              fontSize: '1.25rem',
                            }}
                            {...props}
                          />
                        ),
                        ol: ({ node, ...props }) => (
                          <ol className="concept-list-level-1" style={{ display: 'block' }} {...props} />
                        ),
                        li: ({ node, children, ...props }) => {
                          return (
                            <li className="concept-list-item" style={{ display: 'block', marginBottom: '0.5rem' }} {...props}>
                              {children}
                            </li>
                          );
                        },
                        ul: ({ node, ...props }) => (
                          <ul className="ml-6 mb-4 space-y-2" style={{ display: 'block' }} {...props} />
                        ),
                        p: ({ node, ...props }) => (
                          <p className="mb-4 leading-relaxed text-gray-800 text-base" style={{ fontSize: '1rem' }} {...props} />
                        ),
                        div: ({ node, ...props }) => <div {...props} />,
                        span: ({ node, ...props }) => <span {...props} />,
                        code: ({ node, ...props }: any) => {
                          const inline = (props as any).inline;
                          if (inline) {
                            return (
                              <code
                                className="px-1.5 py-0.5 bg-gray-100 rounded text-sm font-mono"
                                {...props}
                              />
                            );
                          }
                          return (
                            <code
                              className="block p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto mb-4"
                              {...props}
                            />
                          );
                        },
                      }}
                    >
                      {content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50 text-gray-400" />
                    <p className="text-gray-600">콘텐츠가 없습니다. 생성하기 버튼을 클릭하여 내용을 생성하세요.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}


