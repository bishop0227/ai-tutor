/**
 * API 서비스 모듈
 * 백엔드 서버와의 통신을 담당합니다.
 */

import axios from 'axios';

// Axios 인스턴스 생성 (Base URL 설정)
const api = axios.create({
  baseURL: 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// API 응답 타입 정의
export interface UserProfile {
  id?: number;
  username: string;
  login_id?: string;
  email?: string;
  school: string;
  major: string;
  grade: number;
  exam_style?: '미리미리' | '벼락치기';
  learning_depth?: '원리파악' | '직관이해';
  material_preference?: '텍스트' | '영상';
  practice_style?: '이론중심' | '문제중심';
  ai_persona?: '격려형' | '엄격형';
  onboarding_completed?: boolean;
  theme?: 'light' | 'dark' | 'system';
  email_notifications?: boolean;
  push_notifications?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RegisterRequest {
  login_id: string;
  password: string;
  username: string;
  school: string;
  major: string;
  grade: number;
}

export interface LoginRequest {
  login_id: string;
  password: string;
}


export interface SaveUserProfileResponse {
  message: string;
  user: UserProfile;
}

/**
 * 회원가입 API
 * @param data - 회원가입 정보
 * @returns 생성된 사용자 정보
 */
export const register = async (data: RegisterRequest): Promise<{ message: string; user: UserProfile }> => {
  try {
    const response = await api.post<{ message: string; user: UserProfile }>('/register', data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || '회원가입에 실패했습니다.'
      );
    }
    throw error;
  }
};

/**
 * 로그인 API
 * @param data - 로그인 정보 (아이디, 비밀번호)
 * @returns 사용자 정보
 */
export const login = async (data: LoginRequest): Promise<{ message: string; user: UserProfile }> => {
  try {
    const response = await api.post<{ message: string; user: UserProfile }>('/login', data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || '로그인에 실패했습니다.'
      );
    }
    throw error;
  }
};

/**
 * 사용자 프로필 저장 API (온보딩)
 * 5가지 성향 분석 결과를 저장합니다.
 * 
 * @param userId - 사용자 ID
 * @param profile - 온보딩 프로필 정보
 * @returns 저장된 사용자 프로필 정보
 */
export const saveUserProfile = async (
  userId: number,
  profile: {
    exam_style: '미리미리' | '벼락치기';
    learning_depth: '원리파악' | '직관이해';
    material_preference: '텍스트' | '영상';
    practice_style: '이론중심' | '문제중심';
    ai_persona: '격려형' | '엄격형';
  }
): Promise<SaveUserProfileResponse> => {
  try {
    const response = await api.post<SaveUserProfileResponse>(
      '/save-profile',
      {
        user_id: userId,
        ...profile
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || '프로필 저장에 실패했습니다.'
      );
    }
    throw error;
  }
};

// 과목 관련 타입 정의
export interface SyllabusAnalysis {
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

export interface Subject {
  id: number;
  user_id: number;
  name: string;
  subject_type: '교양' | '전공';
  syllabus_context: string;
  syllabus_file_path: string | null;
  syllabus_text: string | null;  // PDF에서 추출한 텍스트
  syllabus_analysis: SyllabusAnalysis | null;  // AI 분석 결과
  color?: string;  // HEX 색상 코드
  order?: number;  // 표시 순서
  exam_date?: string | null;  // 시험 날짜 (ISO format)
  exam_type?: 'midterm' | 'final' | null;  // 시험 유형
  exam_week_start?: number | null;  // 시험 범위 시작 주차
  exam_week_end?: number | null;  // 시험 범위 종료 주차
  is_notification_on?: boolean;  // 학습 알림 설정
  study_plan?: { plan: { [date: string]: string } } | null;  // 학습 계획
  created_at?: string;
  updated_at?: string;
}

export interface GetSubjectsResponse {
  subjects: Subject[];
}

export interface CreateSubjectResponse {
  message: string;
  subject: Subject;
}

export interface Week {
  id: number;
  subject_id: number;
  week_number: number;
  title: string;
  description: string | null;
  materials: Material[];
  created_at?: string;
  updated_at?: string;
}

export interface Material {
  id: number;
  week_id: number;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_at?: string;
  learning_pdf_id?: number; // PDF인 경우 학습용 PDF ID
}

export interface SubjectDetail extends Subject {
  weeks?: Week[];
}

/**
 * 사용자 정보 조회 API
 * @param userId - 사용자 ID
 * @returns 사용자 정보
 */
export const getUser = async (userId: number): Promise<{ user: UserProfile }> => {
  try {
    const response = await api.get<{ user: UserProfile }>('/api/user', {
      params: { user_id: userId }
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || '사용자 정보 조회에 실패했습니다.'
      );
    }
    throw error;
  }
};

/**
 * 과목 목록 조회 API
 * @param userId - 사용자 ID
 * @returns 과목 목록
 */
export const getSubjects = async (userId: number): Promise<GetSubjectsResponse> => {
  try {
    const response = await api.get<GetSubjectsResponse>('/subjects', {
      params: { user_id: userId }
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || '과목 목록 조회에 실패했습니다.'
      );
    }
    throw error;
  }
};

/**
 * 과목 상세 조회 API
 * @param subjectId - 과목 ID
 * @returns 과목 상세 정보 (주차 정보 포함)
 */
export const getSubjectDetail = async (subjectId: number): Promise<{ subject: SubjectDetail }> => {
  try {
    const response = await api.get<{ subject: SubjectDetail }>(`/subjects/${subjectId}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || '과목 정보 조회에 실패했습니다.'
      );
    }
    throw error;
  }
};

/**
 * 과목 삭제 API
 * @param subjectId - 과목 ID
 * @returns 삭제 성공 메시지
 */
export const deleteSubject = async (subjectId: number): Promise<{ message: string }> => {
  try {
    const response = await api.delete<{ message: string }>(`/subjects/${subjectId}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || '과목 삭제에 실패했습니다.'
      );
    }
    throw error;
  }
};

/**
 * 주차 생성 API
 * @param subjectId - 과목 ID
 * @param weekNumber - 주차 번호
 * @param title - 주차 제목
 * @param description - 주차 설명 (선택)
 * @returns 생성된 주차 정보
 */
export const createWeek = async (
  subjectId: number,
  weekNumber: number,
  title: string,
  description?: string
): Promise<{ message: string; week: Week }> => {
  try {
    const response = await api.post<{ message: string; week: Week }>(
      `/subjects/${subjectId}/weeks`,
      {
        week_number: weekNumber,
        title,
        description: description || '',
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || '주차 생성에 실패했습니다.'
      );
    }
    throw error;
  }
};

/**
 * 주차별 자료 업로드 API
 * @param weekId - 주차 ID
 * @param file - 업로드할 파일
 * @returns 업로드된 자료 정보
 */
export const uploadMaterial = async (
  weekId: number,
  file: File,
  subjectId?: number,
  weekNumber?: number
): Promise<{ message: string; material: Material; learning_pdf_id?: number }> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    // Week가 없을 경우를 대비해 subject_id와 week_number도 전송
    if (subjectId) {
      formData.append('subject_id', subjectId.toString());
    }
    if (weekNumber) {
      formData.append('week_number', weekNumber.toString());
    }

    const response = await api.post<{ message: string; material: Material }>(
      `/weeks/${weekId}/materials`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || '자료 업로드에 실패했습니다.'
      );
    }
    throw error;
  }
};

/**
 * 자료 삭제 API
 * @param materialId - 자료 ID
 * @returns 삭제 성공 메시지
 */
export const deleteMaterial = async (
  materialId: number
): Promise<{ message: string; week_id?: number }> => {
  try {
    const response = await api.delete<{ message: string; week_id?: number }>(
      `/api/materials/${materialId}`
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || '자료 삭제에 실패했습니다.'
      );
    }
    throw error;
  }
};

/**
 * 주차 주제 업데이트 API
 * @param subjectId - 과목 ID
 * @param weekNo - 주차 번호
 * @param topic - 새로운 주제
 * @returns 업데이트된 과목 정보
 */
export const updateWeekTopic = async (
  subjectId: number,
  weekNo: number,
  topic: string
): Promise<{ message: string; subject: SubjectDetail }> => {
  try {
    const response = await api.put<{ message: string; subject: SubjectDetail }>(
      `/subjects/${subjectId}/update-week-topic`,
      {
        week_no: weekNo,
        topic,
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || '주차 주제 업데이트에 실패했습니다.'
      );
    }
    throw error;
  }
};

/**
 * 학습용 PDF 업로드 API
 * @param subjectId - 과목 ID
 * @param file - 학습용 PDF 파일
 * @returns 업로드된 PDF 정보
 */
export const uploadLearningPDF = async (
  subjectId: number,
  file: File
): Promise<{ message: string; learning_pdf: { id: number; file_name: string; file_path: string; uploaded_at: string } }> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<{ message: string; learning_pdf: { id: number; file_name: string; file_path: string; uploaded_at: string } }>(
      `/api/subjects/${subjectId}/learning-pdf`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || '학습용 PDF 업로드에 실패했습니다.'
      );
    }
    throw error;
  }
};

/**
 * 주차별 개념 정리 생성 API
 * @param weekId - 주차 ID
 * @param mode - 모드 ('summary' | 'deep_dive')
 * @returns 생성된 개념 정리
 */
export const generateConcept = async (
  weekId: number,
  mode: 'summary' | 'deep_dive'
): Promise<{ message: string; mode: string; concept: string }> => {
  try {
    const response = await api.post<{ message: string; mode: string; concept: string }>(
      `/api/week/${weekId}/concept`,
      { mode },
      { timeout: 300000 } // 5분 타임아웃
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.error || '개념 정리 생성에 실패했습니다.';
      // 429 에러인 경우 더 자세한 메시지
      if (error.response?.status === 429) {
        throw new Error('API 할당량을 초과했습니다. 잠시 후 다시 시도해주세요. (무료 티어: 일일 20회 제한)');
      }
      throw new Error(errorMessage);
    }
    throw error;
  }
};

/**
 * 주차별 퀴즈 생성 API
 * @param weekId - 주차 ID
 * @param difficulty - 난이도 ('easy' | 'medium' | 'hard')
 * @param pastExamFile - 기출문제 PDF 파일 (선택사항)
 * @returns 생성된 퀴즈 데이터
 */
export const generateQuizForWeek = async (
  weekId: number,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  pastExamFile?: File
): Promise<{ message: string; difficulty: string; quiz: Array<{ question: string; options: string[]; answer: string; explanation: string }> }> => {
  try {
    const formData = new FormData();
    formData.append('difficulty', difficulty);
    if (pastExamFile) {
      formData.append('past_exam_file', pastExamFile);
    }

    const response = await api.post<{ message: string; difficulty: string; quiz: Array<{ question: string; options: string[]; answer: string; explanation: string }> }>(
      `/api/week/${weekId}/quiz/generate`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || '퀴즈 생성에 실패했습니다.'
      );
    }
    throw error;
  }
};

/**
 * 주차별 자료의 LearningPDF ID 조회 API
 * @param weekId - 주차 ID
 * @returns LearningPDF ID
 */
export const getWeekLearningPdfId = async (
  weekId: number
): Promise<{ message: string; learning_pdf_id: number }> => {
  try {
    const response = await api.get<{ message: string; learning_pdf_id: number }>(
      `/api/weeks/${weekId}/learning-pdf-id`
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || 'Learning PDF ID 조회에 실패했습니다.'
      );
    }
    throw error;
  }
};

/**
 * 개념 학습 챗봇 API
 * @param subjectId - 과목 ID
 * @param message - 사용자 메시지
 * @param mode - 학습 모드 ('summary', 'deep_dive', 'eli5')
 * @param learningPdfId - 학습용 PDF ID (선택사항)
 * @returns AI 응답
 */
export const chatWithPDF = async (
  subjectId: number,
  message: string,
  mode: 'summary' | 'deep_dive' | 'eli5' = 'summary',
  learningPdfId?: number
): Promise<{ message: string; response: string; chat_id: number }> => {
  try {
    // localStorage에서 userId 가져오기
    const userId = parseInt(localStorage.getItem('user_id') || '0');
    if (!userId) {
      throw new Error('사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.');
    }
    
    const response = await api.post<{ message: string; response: string; chat_id: number }>(
      `/api/subjects/${subjectId}/chat`,
      {
        message,
        mode,
        learning_pdf_id: learningPdfId,
        user_id: userId,
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || '챗봇 응답 생성에 실패했습니다.'
      );
    }
    throw error;
  }
};

/**
 * 퀴즈 생성 API (기존 - deprecated)
 * @deprecated 이 함수는 더 이상 사용되지 않습니다. 새로운 퀴즈 시스템의 generateQuiz를 사용하세요.
 * @param subjectId - 과목 ID
 * @param learningPdfId - 학습용 PDF ID (선택사항)
 * @param numQuestions - 문제 개수 (기본값: 5)
 * @returns 생성된 퀴즈 데이터
 */
export const generateQuizOld = async (
  subjectId: number,
  learningPdfId?: number,
  numQuestions: number = 5
): Promise<{ message: string; quiz: Array<{ question: string; options: string[]; answer: string; explanation: string; topic: string }> }> => {
  try {
    const response = await api.post<{ message: string; quiz: Array<{ question: string; options: string[]; answer: string; explanation: string; topic: string }> }>(
      `/api/subjects/${subjectId}/generate-quiz`,
      {
        learning_pdf_id: learningPdfId,
        num_questions: numQuestions,
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || '퀴즈 생성에 실패했습니다.'
      );
    }
    throw error;
  }
};

/**
 * 퀴즈 제출 API (기존 - deprecated)
 * @deprecated 이 함수는 더 이상 사용되지 않습니다. 새로운 퀴즈 시스템의 submitQuiz를 사용하세요.
 * @param subjectId - 과목 ID
 * @param userId - 사용자 ID
 * @param answers - 답안 배열
 * @param quiz - 원본 퀴즈 데이터
 * @param learningPdfId - 학습용 PDF ID (선택사항)
 * @returns 채점 결과 및 취약점 리포트
 */
export const submitQuizOld = async (
  subjectId: number,
  userId: number,
  answers: Array<{ question_id: number; answer: string }>,
  quiz: Array<{ question: string; options: string[]; answer: string; explanation: string; topic: string }>,
  learningPdfId?: number
): Promise<{ message: string; score: number; total: number; results: Array<{ question_id: number; is_correct: boolean; user_answer: string; correct_answer: string }>; weaknesses: Array<{ question: string; topic: string; explanation: string; user_answer: string; correct_answer: string }> }> => {
  try {
    const response = await api.post<{ message: string; score: number; total: number; results: Array<{ question_id: number; is_correct: boolean; user_answer: string; correct_answer: string }>; weaknesses: Array<{ question: string; topic: string; explanation: string; user_answer: string; correct_answer: string }> }>(
      `/api/subjects/${subjectId}/submit-quiz`,
      {
        user_id: userId,
        learning_pdf_id: learningPdfId,
        answers,
        quiz,
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || '퀴즈 제출에 실패했습니다.'
      );
    }
    throw error;
  }
};

/**
 * PDF 요약 생성 API
 * @param subjectId - 과목 ID
 * @param learningPdfId - 학습용 PDF ID
 * @returns AI 요약 내용
 */
export const getPDFSummary = async (
  subjectId: number,
  learningPdfId: number
): Promise<{ message: string; summary: string }> => {
  try {
    // 요약은 챗봇 API를 summary 모드로 사용
    const response = await chatWithPDF(
      subjectId,
      '이 PDF의 전체 내용을 요약해주세요.',
      'summary',
      learningPdfId
    );
    return {
      message: '요약 생성 완료',
      summary: response.response,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || 'PDF 요약 생성에 실패했습니다.'
      );
    }
    throw error;
  }
};

/**
 * 과목 추가 API
 * FormData를 사용하여 multipart/form-data로 전송
 * @param userId - 사용자 ID
 * @param name - 과목명
 * @param subjectType - 과목 유형 (교양 또는 전공)
 * @param file - 강의계획서 PDF 파일
 * @returns 생성된 과목 정보
 */
export const createSubject = async (
  userId: number,
  name: string,
  subjectType: '교양' | '전공',
  file: File
): Promise<CreateSubjectResponse> => {
  try {
    // FormData 객체 생성
    const formData = new FormData();
    formData.append('user_id', userId.toString());
    formData.append('name', name);
    formData.append('subject_type', subjectType);
    formData.append('file', file);

    // multipart/form-data로 전송 (Content-Type은 브라우저가 자동으로 설정)
    const response = await api.post<CreateSubjectResponse>(
      '/subjects',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || '과목 생성에 실패했습니다.'
      );
    }
    throw error;
  }
};

/**
 * 프로필 수정 API
 * @param userId - 사용자 ID
 * @param profile - 수정할 프로필 정보 (username, email)
 * @returns 업데이트된 사용자 정보
 */
export const updateProfile = async (
  userId: number,
  profile: { username?: string; email?: string; school?: string; major?: string; grade?: number }
): Promise<{ message: string; user: UserProfile }> => {
  try {
    const response = await api.put<{ message: string; user: UserProfile }>(
      '/api/user/profile',
      {
        user_id: userId,
        ...profile
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || '프로필 수정에 실패했습니다.'
      );
    }
    throw error;
  }
};

/**
 * 비밀번호 변경 API
 * @param userId - 사용자 ID
 * @param currentPassword - 현재 비밀번호
 * @param newPassword - 새 비밀번호
 * @returns 성공 메시지
 */
export const changePassword = async (
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<{ message: string }> => {
  try {
    const response = await api.put<{ message: string }>(
      '/api/user/password',
      {
        user_id: userId,
        current_password: currentPassword,
        new_password: newPassword
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || '비밀번호 변경에 실패했습니다.'
      );
    }
    throw error;
  }
};

/**
 * 회원 탈퇴 API
 * @param userId - 사용자 ID
 * @returns 성공 메시지
 */
export const deleteAccount = async (
  userId: number
): Promise<{ message: string }> => {
  try {
    const response = await api.delete<{ message: string }>(
      '/api/user/account',
      {
        data: { user_id: userId }
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || '회원 탈퇴에 실패했습니다.'
      );
    }
    throw error;
  }
};

/**
 * 사용자 설정 저장 API (테마, 알림)
 * @param userId - 사용자 ID
 * @param preferences - 설정 정보 (theme, email_notifications, push_notifications)
 * @returns 업데이트된 사용자 정보
 */
export const updatePreferences = async (
  userId: number,
  preferences: {
    theme?: 'light' | 'dark' | 'system';
    email_notifications?: boolean;
    push_notifications?: boolean;
  }
): Promise<{ message: string; user: UserProfile }> => {
  try {
    const response = await api.put<{ message: string; user: UserProfile }>(
      '/api/user/preferences',
      {
        user_id: userId,
        ...preferences
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || '설정 저장에 실패했습니다.'
      );
    }
    throw error;
  }
};

/**
 * 과목 순서 변경 API
 * @param userId - 사용자 ID
 * @param subjectIds - 변경된 순서의 과목 ID 배열
 * @returns 업데이트된 과목 목록
 */
export const reorderSubjects = async (
  userId: number,
  subjectIds: number[]
): Promise<{ message: string; subjects: Subject[] }> => {
  try {
    const response = await api.patch<{ message: string; subjects: Subject[] }>(
      '/api/subjects/reorder',
      {
        user_id: userId,
        subject_ids: subjectIds
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || '과목 순서 변경에 실패했습니다.'
      );
    }
    throw error;
  }
};

/**
 * 과목 색상 변경 API
 * @param subjectId - 과목 ID
 * @param userId - 사용자 ID
 * @param color - HEX 색상 코드 (예: #FF5733)
 * @returns 업데이트된 과목 정보
 */
export const updateSubjectColor = async (
  subjectId: number,
  userId: number,
  color: string
): Promise<{ message: string; subject: Subject }> => {
  try {
    const response = await api.patch<{ message: string; subject: Subject }>(
      `/api/subjects/${subjectId}/color`,
      {
        user_id: userId,
        color
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || '과목 색상 변경에 실패했습니다.'
      );
    }
    throw error;
  }
};

/**
 * Concept Learning 콘텐츠 생성 API
 * @param weekId - 주차 ID
 * @param mode - 학습 모드 ('summary' 또는 'deep_dive')
 * @param forceRegenerate - 강제 재생성 여부
 * @returns 생성된 콘텐츠
 */
export const generateConceptContent = async (
  weekId: number,
  mode: 'summary' | 'deep_dive',
  forceRegenerate: boolean = false
): Promise<{ content: string }> => {
  try {
    const response = await api.post<{ content: string }>(
      '/api/concept/generate',
      {
        week_id: weekId,
        mode,
        force_regenerate: forceRegenerate,
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          `서버 오류 (${error.response?.status || '알 수 없음'})`;
      console.error('Concept Content 생성 오류:', {
        status: error.response?.status,
        data: error.response?.data,
        error: errorMessage
      });
      throw new Error(errorMessage);
    }
    console.error('Concept Content 생성 중 예상치 못한 오류:', error);
    throw error instanceof Error ? error : new Error('콘텐츠 생성에 실패했습니다.');
  }
};

// ==================== New Quiz System Types ====================

export interface Question {
  id: number;
  quiz_id: number;
  question_type: 'multiple_choice' | 'short_answer' | 'subjective';
  question_text: string;
  options: string[] | null;
  correct_answer: string;
  explanation: string;
  key_concept: string | null;
  order: number;
}

export interface Quiz {
  id: number;
  subject_id: number;
  user_id: number;
  week_numbers: number[];
  difficulty: 'easy' | 'medium' | 'hard';
  question_types: ('multiple_choice' | 'short_answer' | 'subjective')[];
  language: 'korean' | 'english';
  num_questions: number;
  past_exam_context: string | null;
  quiz_number: number;
  created_at: string;
}

export interface UserResponse {
  id: number;
  quiz_id: number;
  question_id: number;
  user_answer: string;
  is_correct: boolean;
  submitted_at: string;
}

export interface QuizReport {
  id: number;
  quiz_id: number;
  score: number;
  total: number;
  ai_report: string;
  created_at: string;
}

export interface QuizDetail {
  quiz: Quiz;
  questions: Question[];
  user_responses: { [question_id: number]: UserResponse };
  report: QuizReport | null;
}

export interface QuizResult {
  question_id: number;
  is_correct: boolean;
  user_answer: string;
  correct_answer: string;
  explanation: string;
  key_concept: string | null;
}

/**
 * 퀴즈 생성 API
 */
export const generateQuiz = async (
  subjectId: number,
  userId: number,
  options: {
    week_numbers: number[];
    difficulty: 'easy' | 'medium' | 'hard';
    question_types: ('multiple_choice' | 'short_answer' | 'subjective')[];
    language: 'korean' | 'english';
    num_questions: number;
    past_exam_context?: string;
  }
): Promise<{ message: string; quiz: Quiz; questions: Question[] }> => {
  try {
    const response = await api.post<{ message: string; quiz: Quiz; questions: Question[] }>(
      '/api/quiz/generate',
      {
        subject_id: subjectId,
        user_id: userId,
        ...options
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || '퀴즈 생성에 실패했습니다.'
      );
    }
    throw error;
  }
};

/**
 * 퀴즈 상세 조회 API
 */
export const getQuiz = async (quizId: number): Promise<QuizDetail> => {
  try {
    const response = await api.get<QuizDetail>(`/api/quiz/${quizId}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || '퀴즈 조회에 실패했습니다.'
      );
    }
    throw error;
  }
};

/**
 * 퀴즈 제출 API
 */
export const submitQuiz = async (
  quizId: number,
  userId: number,
  answers: Array<{ question_id: number; answer: string }>
): Promise<{
  message: string;
  score: number;
  total: number;
  results: QuizResult[];
  report: QuizReport;
}> => {
  try {
    const response = await api.post<{
      message: string;
      score: number;
      total: number;
      results: QuizResult[];
      report: QuizReport;
    }>(`/api/quiz/${quizId}/submit`, {
      user_id: userId,
      answers
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || '퀴즈 제출에 실패했습니다.'
      );
    }
    throw error;
  }
};

/**
 * 퀴즈 히스토리 조회 API
 */
export const getQuizHistory = async (
  subjectId: number,
  userId: number
): Promise<{ quizzes: Array<Quiz & { report: QuizReport | null }> }> => {
  try {
    const response = await api.get<{ quizzes: Array<Quiz & { report: QuizReport | null }> }>(
      `/api/subjects/${subjectId}/quizzes`,
      {
        params: { user_id: userId }
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || '퀴즈 히스토리 조회에 실패했습니다.'
      );
    }
    throw error;
  }
};

/**
 * 퀴즈 삭제 API
 */
export const deleteQuiz = async (
  quizId: number,
  userId: number
): Promise<{ message: string }> => {
  try {
    const response = await api.delete<{ message: string }>(
      `/api/quiz/${quizId}`,
      {
        params: { user_id: userId }
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || '퀴즈 삭제에 실패했습니다.'
      );
    }
    throw error;
  }
};

/**
 * D-Day 시험 날짜 설정 API
 */
export const setExamDate = async (
  subjectId: number,
  examDate: string,
  examType?: 'midterm' | 'final',
  examWeekStart?: number,
  examWeekEnd?: number
): Promise<{ message: string; subject: Subject }> => {
  try {
    const response = await api.put<{ message: string; subject: Subject }>(
      `/api/subjects/${subjectId}/exam-date`,
      { 
        exam_date: examDate,
        exam_type: examType,
        exam_week_start: examWeekStart,
        exam_week_end: examWeekEnd
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || '시험 날짜 설정에 실패했습니다.'
      );
    }
    throw error;
  }
};

/**
 * D-Day 시험 날짜 삭제 API
 */
export const deleteExamDate = async (
  subjectId: number
): Promise<{ message: string; subject: Subject }> => {
  try {
    const response = await api.delete<{ message: string; subject: Subject }>(
      `/api/subjects/${subjectId}/exam-date`
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || '시험 날짜 삭제에 실패했습니다.'
      );
    }
    throw error;
  }
};

/**
 * 학습 알림 토글 API
 */
export const toggleNotification = async (
  subjectId: number,
  isNotificationOn: boolean
): Promise<{ message: string; subject: Subject }> => {
  try {
    const response = await api.put<{ message: string; subject: Subject }>(
      `/api/subjects/${subjectId}/notification`,
      { is_notification_on: isNotificationOn }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || '알림 설정 변경에 실패했습니다.'
      );
    }
    throw error;
  }
};

/**
 * 학습 계획 생성 API
 */
export const generateStudyPlan = async (
  subjectId: number,
  userId: number
): Promise<{ message: string; study_plan: { plan: { [date: string]: string } } }> => {
  try {
    const response = await api.post<{ message: string; study_plan: { plan: { [date: string]: string } } }>(
      `/api/subjects/${subjectId}/study-plan`,
      {},
      {
        params: { user_id: userId }
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || '학습 계획 생성에 실패했습니다.'
      );
    }
    throw error;
  }
};

export default api;


