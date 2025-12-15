# 수식 렌더링 문제 해결 가이드

## 문제
KaTeX 수식이 표시되지 않음

## 해결 방법

### 1단계: 패키지 재설치

터미널에서 다음 명령어를 실행하세요:

```bash
# 개발 서버 중지 (Ctrl+C)

# 수식 관련 패키지 재설치
npm uninstall react-markdown remark-math rehype-katex
npm install react-markdown@^9.1.0 remark-math@^6.0.0 rehype-katex@^7.0.1

# 또는 전체 node_modules 재설치
rm -rf node_modules package-lock.json
npm install
```

### 2단계: 브라우저 캐시 삭제

1. 브라우저 완전히 닫기
2. `Ctrl + Shift + Delete` → 캐시 삭제
3. 또는 `Ctrl + F5` (강력 새로고침)

### 3단계: 개발 서버 재시작

```bash
npm run dev
```

### 4단계: 확인

브라우저 개발자 도구(F12)에서:
- **Console 탭**: 에러 메시지 확인
- **Network 탭**: `katex.min.css` 파일이 로드되는지 확인
- **Elements 탭**: 수식이 `<span class="katex">` 형태로 렌더링되는지 확인


