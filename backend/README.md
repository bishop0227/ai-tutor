# Backend Setup Guide

## 가상환경 생성 및 활성화

### Windows (PowerShell) - 방법 1: 실행 정책 변경
```powershell
# 관리자 권한으로 PowerShell 실행 후
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### Windows (PowerShell) - 방법 2: activate.bat 사용 (권장)
```powershell
python -m venv venv
.\venv\Scripts\activate.bat
```

### Windows (CMD)
```cmd
python -m venv venv
venv\Scripts\activate.bat
```

## 패키지 설치
```bash
pip install -r requirements.txt
```

## 서버 실행
```bash
python app.py
```

## 의존성 충돌 해결

만약 `anaconda-cloud-auth`와 `pydantic` 버전 충돌이 발생한다면:
1. 가상환경을 사용하여 프로젝트 의존성을 격리하세요 (권장)
2. 또는 `anaconda-cloud-auth`를 제거: `pip uninstall anaconda-cloud-auth`

