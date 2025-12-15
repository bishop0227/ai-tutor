# 기능 구현 문서

## 📋 목차
1. [인증 및 사용자 관리](#1-인증-및-사용자-관리)
2. [온보딩 시스템](#2-온보딩-시스템)
3. [대시보드](#3-대시보드)
4. [과목 관리](#4-과목-관리)
5. [과목 상세 페이지](#5-과목-상세-페이지)
6. [설정 페이지](#6-설정-페이지)
7. [기술 스택](#7-기술-스택)

---

## 1. 인증 및 사용자 관리

### 1.1 회원가입 (`SignUp.tsx`)
**기능:**
- 사용자 계정 생성
- 입력 필드:
  - 아이디 (4자 이상, 중복 확인)
  - 비밀번호 (6자 이상)
  - 비밀번호 확인
  - 사용자명
  - 학교명
  - 학과
  - 학년 (1~4)
- 유효성 검사 및 에러 처리
- 회원가입 성공 시 환영 화면으로 이동

**API 엔드포인트:**
- `POST /register`

**주요 특징:**
- 실시간 입력 유효성 검사
- 중복 아이디 확인
- 비밀번호 일치 확인
- 로딩 상태 표시

---

### 1.2 로그인 (`Login.tsx`)
**기능:**
- 아이디/비밀번호 기반 로그인
- 로그인 상태 유지 (localStorage)
- 회원가입 화면으로 이동 링크

**API 엔드포인트:**
- `POST /login`

**주요 특징:**
- 자동 포커스 (아이디 입력 필드)
- 에러 메시지 표시
- 로그인 성공 시 사용자 정보 localStorage 저장
- 온보딩 완료 여부 확인

---

### 1.3 환영 화면 (`Welcome.tsx`)
**기능:**
- 회원가입 완료 후 표시
- 3초 후 자동으로 온보딩 화면으로 이동
- 사용자명 표시

**주요 특징:**
- 애니메이션 효과
- 자동 전환

---

## 2. 온보딩 시스템

### 2.1 학습 성향 분석 (`Onboarding.tsx`)
**기능:**
- 5가지 학습 성향 질문에 답변
- 사용자 프로필 정보 입력 (사용자명, 이메일)
- AI 튜터 맞춤 설정 저장

**질문 항목:**
1. **시험 기간이 다가오면?**
   - 미리미리 계획형 🐣
   - 발등에 불 벼락치기 🔥

2. **새로운 개념을 배울 땐?**
   - 원리부터 깊게 🧐
   - 비유로 쉽고 빠르게 💡

3. **더 좋아하는 자료는?**
   - 깔끔한 텍스트 정리 📝
   - 유튜브 영상 시청 📺

4. **공부 스타일은?**
   - 이론 완벽 마스터 📚
   - 일단 문제 박치기 ⚔️

5. **선호하는 AI 선생님은?**
   - 칭찬해주는 당근형 🥰
   - 팩트 날리는 채찍형 🤖

**API 엔드포인트:**
- `POST /api/user/profile`

**저장되는 데이터:**
- `exam_style`: 시험 준비 방식
- `learning_depth`: 이해 깊이
- `material_preference`: 자료 선호도
- `practice_style`: 실전 선호도
- `ai_persona`: AI 성격

**주요 특징:**
- 모든 질문에 답변 필수
- 라디오 버튼 UI
- 이모지와 함께 직관적인 선택지
- 성공 메시지 표시 후 자동 새로고침

---

## 3. 대시보드

### 3.1 과목 목록 표시 (`Dashboard.tsx`)
**기능:**
- 사용자의 모든 과목을 카드 형태로 표시
- 그리드 레이아웃 (반응형: 1열/2열/3열)
- 과목별 색상 표시
- 강의계획서 등록 여부 뱃지

**주요 특징:**
- 과목별 고유 색상 (HEX 코드)
- 호버 효과 (카드 상승 애니메이션)
- 빈 상태 (Empty State) UI
- 로딩 상태 표시

---

### 3.2 과목 추가 (`AddSubjectDialog.tsx`)
**기능:**
- 새 과목 생성
- 강의계획서 PDF 업로드
- 과목 유형 선택 (교양/전공)
- AI 분석 진행률 표시

**API 엔드포인트:**
- `POST /api/subjects`

**주요 특징:**
- 파일 선택 UI
- 진행률 표시 (퍼센트)
- 단계별 로딩 메시지:
  - PDF 파일 업로드 중...
  - 텍스트 추출 중...
  - AI 분석 중...
  - 완료 중...
- 자동 색상 할당 (랜덤)
- 자동 순서 할당

---

### 3.3 과목 카드 기능

#### 3.3.1 드래그 앤 드롭으로 순서 변경
**기능:**
- 카드를 드래그하여 순서 변경
- Long press (150ms)로 드래그 시작
- Optimistic Update (UI 먼저 변경, 실패 시 롤백)

**API 엔드포인트:**
- `PATCH /api/subjects/reorder`

**기술:**
- `@dnd-kit/core` 라이브러리 사용
- `PointerSensor` with activation constraint
- `KeyboardSensor` for accessibility

---

#### 3.3.2 색상 변경 (`ColorPicker.tsx`)
**기능:**
- 과목 카드 색상 변경
- 12가지 색상 팔레트 제공
- Popover UI

**API 엔드포인트:**
- `PATCH /api/subjects/<subject_id>/color`

**주요 특징:**
- Optimistic Update
- 클릭 이벤트 전파 방지 (`stopPropagation`)

---

#### 3.3.3 과목 삭제
**기능:**
- 과목 삭제 (확인 다이얼로그)
- 관련된 모든 주차와 자료도 함께 삭제

**API 엔드포인트:**
- `DELETE /api/subjects/<subject_id>`

**주요 특징:**
- 확인 다이얼로그
- Cascade 삭제 (주차, 자료, 퀴즈 결과 등)

---

#### 3.3.4 과목 상세 페이지 이동
**기능:**
- 화살표 버튼 클릭으로 상세 페이지 이동
- 드래그와 클릭 이벤트 분리

**주요 특징:**
- 화살표 버튼만 클릭 가능
- 드래그 중에는 클릭 이벤트 무시

---

### 3.4 설정 메뉴
**기능:**
- 우측 상단 설정 버튼
- 드롭다운 메뉴:
  - 설정 페이지 이동
  - 로그아웃
- 외부 클릭 시 자동 닫힘

---

## 4. 과목 관리

### 4.1 과목 모델 (`models.py`)
**데이터베이스 필드:**
- `id`: 과목 고유 ID
- `user_id`: 소유자 사용자 ID
- `name`: 과목명
- `subject_type`: 과목 유형 (교양/전공)
- `syllabus_file_path`: 강의계획서 PDF 경로
- `syllabus_text`: PDF에서 추출한 텍스트
- `syllabus_analysis`: AI 분석 결과 (JSON)
- `color`: HEX 색상 코드
- `order`: 표시 순서
- `created_at`, `updated_at`: 생성/수정 시간

**관계:**
- `weeks`: 주차 목록 (1:N)
- `quiz_results`: 퀴즈 결과 목록 (1:N)

---

## 5. 과목 상세 페이지

### 5.1 과목 정보 표시 (`SubjectDetail.tsx`)
**기능:**
- 과목명, 유형 표시
- 뒤로가기 버튼
- AI 분석 결과 표시

---

### 5.2 강의계획서 AI 분석
**기능:**
- 강의계획서 PDF 업로드 시 자동 분석
- Gemini API를 사용한 분석
- 분석 결과:
  - 기본 정보 (학점, 평가 기준)
  - 주차별 커리큘럼 (주차 번호, 주제, 설명)

**API 엔드포인트:**
- `POST /api/subjects` (과목 생성 시)
- 분석은 백그라운드에서 비동기 처리

**주요 특징:**
- 분석 중 상태 표시
- 주기적 새로고침 (최대 20회, 100초)
- 분석 완료 시 자동 업데이트
- 에러 처리

---

### 5.3 주차별 커리큘럼 표시
**기능:**
- AI 분석 결과를 기반으로 주차별 카드 표시
- 각 주차 카드에 표시되는 정보:
  - 주차 번호 뱃지
  - 주제 (제목)
  - 자료 업로드 버튼 / 자료 보기 버튼

**주요 특징:**
- 주차별 색상 구분
- 자료 유무에 따른 버튼 표시

---

### 5.4 주차 제목 편집
**기능:**
- 주차 제목 클릭 시 편집 모드
- 인라인 편집 (Enter: 저장, Escape: 취소)

**API 엔드포인트:**
- `PATCH /api/weeks/<week_id>/topic`

---

### 5.5 주차별 자료 업로드
**기능:**
- 주차별로 학습 자료 업로드
- 다중 파일 업로드 지원
- 지원 파일 형식: PDF, PPT, PPTX, DOC, DOCX, XLS, XLSX
- 파일 선택 및 미리보기
- 업로드 전 파일 제거 가능

**API 엔드포인트:**
- `POST /api/weeks/<week_id>/materials`

**주요 특징:**
- `week_id`가 0이면 새 주차 생성
- 파일명 자동 보안 처리 (`secure_filename`)
- 파일 크기 제한 (16MB)
- 업로드 폴더: `uploads/materials/`

---

### 5.6 자료 관리
**기능:**
- 업로드된 자료 목록 표시
- 자료 삭제
- 추가 자료 업로드

**UI:**
- "📁 자료 보기 (개수)" 버튼
- 다이얼로그로 자료 목록 표시
- 각 자료에 삭제 버튼
- 추가 업로드 버튼

**API 엔드포인트:**
- `GET /api/subjects/<subject_id>` (자료 목록 포함)
- `DELETE /api/materials/<material_id>`

**주요 특징:**
- 파일 타입별 아이콘 표시
- 파일 크기 표시
- 업로드 날짜 표시
- 삭제 확인

---

### 5.7 주차 자동 생성
**기능:**
- 강의계획서 분석 완료 시 주차 자동 생성
- `syllabus_analysis.weekly_schedule` 기반
- 과목 상세 페이지 로드 시 누락된 주차 자동 생성

**주요 특징:**
- 중복 생성 방지 (기존 주차 확인)
- 주차 번호와 제목 자동 설정

---

## 6. 설정 페이지

### 6.1 프로필 수정 (`Settings.tsx`)
**기능:**
- 사용자 정보 수정:
  - 사용자명
  - 이메일
  - 학교
  - 학과
  - 학년

**API 엔드포인트:**
- `GET /api/user/<user_id>` (사용자 정보 조회)
- `PUT /api/user/profile` (프로필 업데이트)

**주요 특징:**
- 탭 기반 UI
- 실시간 유효성 검사
- 성공/에러 메시지 표시

---

### 6.2 비밀번호 변경
**기능:**
- 현재 비밀번호 확인
- 새 비밀번호 설정
- 비밀번호 확인

**API 엔드포인트:**
- `POST /api/user/change-password`

**주요 특징:**
- 비밀번호 표시/숨김 토글
- 최소 6자 이상 요구
- 일치 확인

---

### 6.3 계정 삭제
**기능:**
- 계정 영구 삭제
- 확인 다이얼로그
- "DELETE" 입력 필수

**API 엔드포인트:**
- `DELETE /api/user/<user_id>`

**주요 특징:**
- 이중 확인 (확인 텍스트 입력)
- Cascade 삭제 (과목, 자료 등)

---

### 6.4 테마 설정
**기능:**
- 라이트/다크/시스템 테마 선택
- (현재는 UI만 구현, 실제 테마 적용은 미구현)

---

### 6.5 알림 설정
**기능:**
- 이메일 알림 ON/OFF
- 푸시 알림 ON/OFF
- (현재는 UI만 구현, 실제 알림 기능은 미구현)

---

## 7. 기술 스택

### 7.1 Frontend
- **React 18** + **TypeScript**
- **Vite** (빌드 도구)
- **Tailwind CSS** (스타일링)
- **Shadcn UI** (UI 컴포넌트 라이브러리)
  - Card, Button, Badge, Dialog, Input, Label, RadioGroup, Tabs, Switch, Progress 등
- **Radix UI** (접근성 기반 UI 프리미티브)
- **@dnd-kit** (드래그 앤 드롭)
- **Axios** (HTTP 클라이언트)
- **Lucide React** (아이콘)
- **Pretendard** (한글 폰트)

### 7.2 Backend
- **Python 3.11**
- **Flask** (웹 프레임워크)
- **SQLAlchemy** (ORM)
- **SQLite** (데이터베이스)
- **PyPDF2** (PDF 텍스트 추출)
- **Google Generative AI (Gemini)** (AI 분석)
- **Flask-CORS** (CORS 처리)
- **Werkzeug** (비밀번호 해싱, 파일 업로드)

### 7.3 데이터베이스 모델
1. **User** (사용자)
2. **Subject** (과목)
3. **Week** (주차)
4. **Material** (수업자료)
5. **LearningPDF** (학습용 PDF - RAG용, 현재 미사용)
6. **ChatHistory** (채팅 히스토리 - Concept Learning용, 현재 미사용)
7. **QuizResult** (퀴즈 결과)

---

## 8. 주요 API 엔드포인트

### 8.1 인증
- `POST /register` - 회원가입
- `POST /login` - 로그인

### 8.2 사용자
- `GET /api/user/<user_id>` - 사용자 정보 조회
- `PUT /api/user/profile` - 프로필 업데이트
- `POST /api/user/profile` - 온보딩 프로필 저장
- `POST /api/user/change-password` - 비밀번호 변경
- `DELETE /api/user/<user_id>` - 계정 삭제

### 8.3 과목
- `GET /api/subjects` - 과목 목록 조회
- `POST /api/subjects` - 과목 생성
- `GET /api/subjects/<subject_id>` - 과목 상세 조회
- `DELETE /api/subjects/<subject_id>` - 과목 삭제
- `PATCH /api/subjects/reorder` - 과목 순서 변경
- `PATCH /api/subjects/<subject_id>/color` - 과목 색상 변경

### 8.4 주차
- `PATCH /api/weeks/<week_id>/topic` - 주차 제목 수정

### 8.5 자료
- `POST /api/weeks/<week_id>/materials` - 자료 업로드
- `DELETE /api/materials/<material_id>` - 자료 삭제

---

## 9. 주요 기능 흐름

### 9.1 회원가입 → 온보딩 → 대시보드
1. 회원가입 (`SignUp.tsx`)
2. 환영 화면 (`Welcome.tsx`) - 3초 자동 전환
3. 온보딩 (`Onboarding.tsx`) - 학습 성향 분석
4. 대시보드 (`Dashboard.tsx`)

### 9.2 과목 생성 → AI 분석 → 주차 표시
1. 과목 추가 다이얼로그에서 과목명, 유형, PDF 업로드
2. 백엔드에서 PDF 텍스트 추출
3. Gemini API로 강의계획서 분석
4. 분석 결과를 `syllabus_analysis`에 저장
5. 주차별 커리큘럼 자동 생성
6. 과목 상세 페이지에서 주차별 카드 표시

### 9.3 자료 업로드 → 자료 관리
1. 주차 카드에서 "자료 업로드" 버튼 클릭
2. 다중 파일 선택
3. 업로드 완료 후 "자료 보기" 버튼으로 변경
4. "자료 보기" 클릭 시 다이얼로그에서 자료 목록 확인
5. 자료 삭제 또는 추가 업로드 가능

---

## 10. UI/UX 특징

### 10.1 디자인 시스템
- **색상 팔레트**: 12가지 파스텔 톤 색상
- **그라데이션 배경**: 대시보드 및 로그인 화면
- **카드 기반 레이아웃**: 모든 주요 콘텐츠를 카드로 표시
- **반응형 디자인**: 모바일/태블릿/데스크톱 지원

### 10.2 인터랙션
- **드래그 앤 드롭**: Long press (150ms)로 드래그 시작
- **호버 효과**: 카드 상승, 버튼 색상 변경
- **로딩 상태**: 스피너, 진행률 표시
- **에러 처리**: 사용자 친화적 에러 메시지

### 10.3 접근성
- **키보드 네비게이션**: 드래그 앤 드롭 키보드 지원
- **포커스 관리**: 자동 포커스, 포커스 트랩
- **스크린 리더**: Radix UI 기반 접근성

---

## 11. 향후 구현 예정 기능 (PRD 기반)

### 11.1 개념 학습 (Concept Learning)
- **핵심 요약 모드**: 간결한 요약 제공
- **상세 설명 모드**: 깊이 있는 설명 제공
- **ELI5 모드**: 쉬운 비유로 설명
- **PDF 기반 RAG**: 업로드된 PDF에서 관련 내용 검색

### 11.2 퀴즈 생성 및 진단
- **맥락 기반 퀴즈 생성**: PDF 내용 기반 문제 생성
- **난이도 조절**: Easy/Medium/Hard
- **과거 시험 스타일 반영**: 과거 시험 PDF 업로드 시 스타일 학습
- **취약점 리포트**: 오답 분석 및 피드백
- **개념 복습 링크**: 오답 시 관련 개념 학습 페이지로 이동

### 11.3 AI 학습 플래너
- **시험 일정 기반 계획**: 시험 날짜와 범위 입력
- **학습 속도 분석**: 과거 학습 데이터 기반
- **일일 학습 계획**: 현실적인 일정 제시

---

## 12. 파일 구조

```
프로젝트/
├── backend/
│   ├── app.py              # Flask 애플리케이션 메인
│   ├── models.py            # 데이터베이스 모델
│   ├── rag_utils.py         # PDF 처리 유틸리티
│   ├── requirements.txt     # Python 의존성
│   └── uploads/             # 업로드된 파일 저장
│       ├── syllabus/        # 강의계획서 PDF
│       ├── materials/       # 주차별 자료
│       └── learning_pdfs/  # 학습용 PDF
│
└── src/
    ├── components/
    │   ├── Login.tsx        # 로그인
    │   ├── SignUp.tsx       # 회원가입
    │   ├── Welcome.tsx      # 환영 화면
    │   ├── Onboarding.tsx   # 온보딩
    │   ├── Dashboard.tsx   # 대시보드
    │   ├── SubjectDetail.tsx # 과목 상세
    │   ├── Settings.tsx    # 설정
    │   ├── AddSubjectDialog.tsx # 과목 추가
    │   ├── ColorPicker.tsx  # 색상 선택
    │   └── ui/              # Shadcn UI 컴포넌트
    ├── services/
    │   └── api.ts           # API 클라이언트
    ├── App.tsx              # 루트 컴포넌트
    └── main.tsx             # 진입점
```

---

## 13. 환경 설정

### 13.1 Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 13.2 Frontend
```bash
npm install
npm run dev
```

### 13.3 환경 변수
`.env` 파일 (backend 폴더):
```
GEMINI_API_KEY=your_api_key_here
```

---

## 14. 주요 개선 사항 및 이슈 해결

### 14.1 데이터베이스 마이그레이션
- `subjects` 테이블에 `color`, `order` 컬럼 추가
- 앱 시작 시 자동 마이그레이션

### 14.2 CORS 설정
- 모든 라우트에 CORS 적용 (`r"/*"`)
- 프론트엔드 origin 허용

### 14.3 파일 업로드
- `secure_filename`으로 파일명 보안 처리
- 파일 크기 제한 (16MB)
- 지원 파일 형식 검증

### 14.4 드래그 앤 드롭
- Long press로 드래그와 클릭 구분
- Optimistic Update로 즉각적인 UI 반응
- 실패 시 자동 롤백

---

## 15. 참고 자료

- **PRD 문서**: `PRD.md`
- **API 문서**: 백엔드 코드 주석 참조
- **데이터베이스 스키마**: `backend/models.py`

---

**작성일**: 2024년 12월
**버전**: 1.0


