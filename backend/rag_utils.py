"""
PDF 텍스트 추출 유틸리티 모듈
RAG 기능은 제거되었으며, PDF 텍스트 추출만 제공합니다.
"""

import os
from PyPDF2 import PdfReader
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()


def extract_text_from_pdf(pdf_path: str) -> str:
    """PDF에서 텍스트 추출"""
    try:
        pdf_reader = PdfReader(pdf_path)
        text_parts = []
        for page in pdf_reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
        return '\n\n'.join(text_parts)
    except Exception as e:
        print(f"❌ PDF 텍스트 추출 실패: {e}")
        return ""
