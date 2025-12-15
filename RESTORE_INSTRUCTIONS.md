# Git으로 하루 전 버전으로 되돌리기

## 방법 1: 특정 파일만 되돌리기

```bash
# 하루 전 커밋 찾기
git log --oneline --since="2 days ago" --until="1 day ago"

# 특정 파일을 하루 전 버전으로 되돌리기
git checkout HEAD@{1 day ago} -- src/components/ui/dialog.tsx
git checkout HEAD@{1 day ago} -- src/components/ui/card.tsx
git checkout HEAD@{1 day ago} -- src/index.css
git checkout HEAD@{1 day ago} -- src/components/SubjectDetail.tsx
git checkout HEAD@{1 day ago} -- src/components/Dashboard.tsx
```

## 방법 2: 전체 프로젝트를 하루 전으로 되돌리기

```bash
# 하루 전 커밋으로 되돌리기 (주의: 모든 변경사항이 사라집니다)
git log --oneline --since="2 days ago" --until="1 day ago"
# 위 명령어로 커밋 해시를 확인한 후:
git reset --hard <커밋해시>
```

## 방법 3: 안전하게 되돌리기 (변경사항 보존)

```bash
# 현재 변경사항을 스태시에 저장
git stash

# 하루 전 커밋으로 되돌리기
git log --oneline --since="2 days ago" --until="1 day ago"
git reset --hard <커밋해시>

# 나중에 스태시된 변경사항을 다시 적용하려면:
# git stash pop
```


