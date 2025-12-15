/**
 * 메인 대시보드 컴포넌트
 * HCI 관점에서 UX를 고려한 디자인
 */

import { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { BookOpen, Plus, ArrowRight, FolderPlus, CheckCircle2, Settings, LogOut, Trash2 } from 'lucide-react';
import { getSubjects, deleteSubject, reorderSubjects, updateSubjectColor, type Subject } from '../services/api';
import AddSubjectDialog from './AddSubjectDialog';
import ColorPicker from './ColorPicker';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// DragEndEvent 타입 정의
interface DragEndEvent {
  active: { id: number | string };
  over: { id: number | string } | null;
}

interface DashboardProps {
  userId: number;
  username: string;
  onLogout: () => void;
  onSubjectClick?: (subjectId: number) => void;
  onSettingsClick?: () => void;
}

// 과목별 색상 팔레트는 더 이상 사용하지 않음 (subject.color 사용)

// 드래그 가능한 과목 카드 컴포넌트
function SortableSubjectCard({
  subject,
  onColorChange,
  onDelete,
  onClick,
}: {
  subject: Subject;
  onColorChange: (subjectId: number, color: string) => void;
  onDelete: (subjectId: number, e: React.MouseEvent) => void;
  onClick: (subjectId: number, e?: React.MouseEvent) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subject.id });


  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const cardColor = subject.color || '#A8D5E2';
  const hasSyllabus = !!subject.syllabus_file_path;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={isDragging ? 'z-50' : ''}
    >
      <Card
        {...attributes}
        {...listeners}
        className={`group transition-all duration-300 hover:-translate-y-2 overflow-hidden relative ${
          isDragging ? 'scale-105' : ''
        }`}
        style={{
          backgroundColor: cardColor,
        }}
      >
        <CardContent className="px-6 pt-6 pb-3">
            {/* 상단: 아이콘, 상태 뱃지 */}
            <div className="flex items-start justify-between mb-5 relative">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-white/50 p-3 shadow-md group-hover:scale-110 transition-transform">
                  <BookOpen className="h-5 w-5 text-gray-700" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasSyllabus && (
                  <Badge className="bg-white/80 text-gray-700 gap-1.5 border-0 shadow-sm pointer-events-none">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    강의계획서 등록됨
                  </Badge>
                )}
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
                  
                  if (daysLeft >= 0) {
                    return (
                      <Badge className="bg-red-100 text-red-700 gap-1.5 border-0 shadow-sm pointer-events-none font-bold">
                        D-{daysLeft}
                      </Badge>
                    );
                  }
                  return null;
                })()}
                <div 
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <ColorPicker
                    currentColor={subject.color}
                    onColorChange={(color) => onColorChange(subject.id, color)}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity delete-button"
                  onClick={(e) => onDelete(subject.id, e)}
                  onMouseDown={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>

            {/* 과목명 */}
            <h3 className="text-2xl font-bold mb-5 text-gray-900 group-hover:text-gray-800 transition-colors">
              {subject.name}
            </h3>

            {/* 하단: 학습하러 가기 */}
            <div className="flex items-center justify-end gap-3 pt-3 pb-1 border-t border-gray-200/50 mt-4">
              <span className="text-xs font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">
                학습하러 가기
              </span>
              <div 
                className="rounded-full text-gray-700 bg-white p-2.5 group-hover:translate-x-1 transition-transform shadow-sm cursor-pointer hover:bg-gray-50"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick(subject.id, e);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <ArrowRight className="h-5 w-5" />
              </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Dashboard({ userId, username, onLogout, onSubjectClick, onSettingsClick }: DashboardProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 드래그 앤 드롭 센서 설정 (버튼 클릭 시 드래그 방지)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 150, // 150ms 이상 누르고 있어야 드래그 시작 (long press)
        tolerance: 8, // 8px 이내의 움직임은 허용
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadSubjects = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getSubjects(userId);
      // order 순서대로 정렬
      const sortedSubjects = [...response.subjects].sort((a, b) => {
        const orderA = a.order ?? a.id;
        const orderB = b.order ?? b.id;
        return orderA - orderB;
      });
      setSubjects(sortedSubjects);
    } catch (err) {
      setError(err instanceof Error ? err.message : '과목 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, [userId]);

  // 과목 정보 업데이트 이벤트 리스너
  useEffect(() => {
    const handleSubjectUpdate = () => {
      loadSubjects();
    };
    window.addEventListener('subjectUpdated', handleSubjectUpdate);
    return () => {
      window.removeEventListener('subjectUpdated', handleSubjectUpdate);
    };
  }, []);

  const handleSubjectCreated = (newSubject: Subject) => {
    setSubjects((prev) => [newSubject, ...prev]);
    // 목록 새로고침하여 최신 데이터 가져오기
    loadSubjects();
  };

  const handleSubjectClick = (subjectId: number, e?: React.MouseEvent) => {
    // 삭제 버튼 클릭 시에는 상세 페이지로 이동하지 않음
    if (e && (e.target as HTMLElement).closest('.delete-button')) {
      return;
    }
    
    // onSubjectClick prop이 있으면 사용 (App.tsx에서 전달)
    if (onSubjectClick) {
      onSubjectClick(subjectId);
      return;
    }
    
    // fallback: URL 변경
    window.history.pushState({ subjectId }, '', `/subject/${subjectId}`);
    window.dispatchEvent(new CustomEvent('pathchange'));
  };

  const handleDeleteSubject = async (subjectId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('정말 이 과목을 삭제하시겠습니까? 관련된 모든 주차와 자료도 함께 삭제됩니다.')) {
      try {
        await deleteSubject(subjectId);
        loadSubjects(); // 목록 새로고침
      } catch (err) {
        alert(err instanceof Error ? err.message : '과목 삭제에 실패했습니다.');
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = subjects.findIndex((s) => s.id === active.id);
    const newIndex = subjects.findIndex((s) => s.id === over.id);

    // Optimistic Update: UI 먼저 변경
    const newSubjects = arrayMove(subjects, oldIndex, newIndex);
    setSubjects(newSubjects);

    // 백엔드에 순서 변경 요청
    try {
      const subjectIds = newSubjects.map((s) => s.id);
      await reorderSubjects(userId, subjectIds);
    } catch (err) {
      // 실패 시 원래 순서로 복구
      setSubjects(subjects);
      alert(err instanceof Error ? err.message : '과목 순서 변경에 실패했습니다.');
    }
  };

  const handleColorChange = async (subjectId: number, color: string) => {
    // Optimistic Update: UI 먼저 변경
    setSubjects((prev) =>
      prev.map((s) => (s.id === subjectId ? { ...s, color } : s))
    );

    // 백엔드에 색상 변경 요청
    try {
      await updateSubjectColor(subjectId, userId, color);
    } catch (err) {
      // 실패 시 원래 색상으로 복구
      loadSubjects();
      alert(err instanceof Error ? err.message : '과목 색상 변경에 실패했습니다.');
    }
  };

  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showSettingsMenu && !target.closest('.settings-menu-container')) {
        setShowSettingsMenu(false);
      }
    };

    if (showSettingsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettingsMenu]);

  const handleLogout = () => {
    // 로그아웃 확인
    if (window.confirm('정말 로그아웃하시겠습니까?')) {
      setShowSettingsMenu(false);
      onLogout();
    }
  };

  // const handleResetOnboarding = () => {
  //   // 프로필 수정 확인
  //   if (window.confirm('프로필을 수정하시겠습니까? 온보딩 화면으로 이동합니다.')) {
  //     setShowSettingsMenu(false);
  //     // 온보딩 화면으로 이동 (localStorage는 유지)
  //     localStorage.removeItem('onboarding_completed');
  //     window.location.reload();
  //   }
  // };

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">과목 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="text-destructive text-4xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold mb-2 text-destructive">오류가 발생했습니다</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadSubjects}>다시 시도</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Case A: 과목이 없을 때 (Empty State)
  if (subjects.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 relative">
        {/* 설정 버튼 - 우측 상단 고정 */}
        <div className="absolute top-4 right-4 z-10">
          <div className="relative settings-menu-container">
            <Button
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              variant="ghost"
              size="icon"
              className="h-9 w-9 hover:bg-gray-100"
            >
              <Settings className="h-5 w-5 text-gray-600" />
            </Button>
            
            {showSettingsMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-md border border-border bg-card shadow-lg z-50 backdrop-blur-sm">
                <div className="py-1">
                  <button
                    onClick={() => {
                      handleLogout();
                      setShowSettingsMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-600 flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    로그아웃
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="text-center max-w-md w-full">
          {/* Empty State */}
          <div className="mb-8">
            <div className="flex justify-center mb-6">
              <div className="rounded-full bg-white p-6 shadow-lg">
                <FolderPlus className="h-16 w-16 text-gray-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              아직 등록된 과목이 없어요.
            </h2>
            <p className="text-gray-500 text-lg mb-8">
              강의계획서를 업로드하고 AI 튜터와 학습을 시작해보세요!
            </p>
            <div className="flex flex-col gap-3 items-center">
              <Button
                onClick={() => setIsDialogOpen(true)}
                size="lg"
                className="gap-2 text-lg px-8 py-6 h-auto shadow-lg hover:shadow-xl transition-shadow w-full max-w-xs"
              >
                <Plus className="h-5 w-5" />
                첫 번째 과목 추가하기
              </Button>
            </div>
          </div>
        </div>

        {/* 과목 추가 다이얼로그 */}
        <AddSubjectDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          userId={userId}
          onSuccess={handleSubjectCreated}
        />
      </div>
    );
  }

  // Case B: 과목이 있을 때 (Dashboard)
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* 설정 버튼 - 우측 상단 고정 (과목 추가 버튼과 겹치지 않도록 위치 조정) */}
        <div className="absolute top-4 right-4 z-10">
          <div className="relative settings-menu-container">
            <Button
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              variant="ghost"
              size="icon"
              className="h-9 w-9 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Settings className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </Button>
            
            {showSettingsMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-md border bg-white dark:bg-gray-800 shadow-lg z-50">
                <div className="py-1">
                  <button
                    onClick={() => {
                      if (onSettingsClick) {
                        onSettingsClick();
                      }
                      setShowSettingsMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white"
                  >
                    <Settings className="h-4 w-4" />
                    설정
                  </button>
                  <button
                    onClick={() => {
                      handleLogout();
                      setShowSettingsMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 dark:text-red-400 flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    로그아웃
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8 pr-16">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              반가워요, {username}님! 👋
            </h1>
            <p className="text-gray-600">
              오늘 공부할 과목을 선택하세요.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsDialogOpen(true)}
              size="lg"
              className="gap-2 shadow-md hover:shadow-lg transition-shadow"
            >
              <Plus className="h-5 w-5" />
              과목 추가
            </Button>
          </div>
        </div>

        {/* 과목 그리드 - 드래그 앤 드롭 */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={subjects.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map((subject) => (
                <SortableSubjectCard
                  key={subject.id}
                  subject={subject}
                  onColorChange={handleColorChange}
                  onDelete={handleDeleteSubject}
                  onClick={handleSubjectClick}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* 과목 추가 다이얼로그 */}
        <AddSubjectDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          userId={userId}
          onSuccess={handleSubjectCreated}
        />
      </div>
    </div>
  );
}
