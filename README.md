<h1 align="center">📊 Smart Auto Report</h1>

<p align="center">
  <strong>스마트 자동 업무 보고서 시스템</strong><br/>
  NestJS 기반의 업무 자동화 및 AI 통합 백엔드 서비스
</p>

</p>

---

## 📋 프로젝트 소개

**Smart Auto Report**는 Notion 데이터베이스와 연동하여 주간 업무 보고서를 자동으로 생성하고 이메일로 발송하는 자동화 시스템입니다. 또한 AI 모델 정보 크롤링, OCR 텍스트 추출, 음성-텍스트 변환(STT) 등 다양한 AI 기능을 통합하여 업무 효율성을 극대화합니다.

---

## ✨ 주요 기능

### 📧 자동 업무 보고서 생성 및 발송
- Notion 데이터베이스에서 주간 업무 데이터 자동 수집
- HTML 형식의 업무 보고서 자동 생성
- 스케줄러를 통한 정기 이메일 발송

### 🤖 AI 모델 정보 크롤링
- 최신 AI 모델 정보 자동 크롤링 (매일 오전 10시)
- OpenAI GPT-4를 활용한 데이터 분석 및 정리
- Notion 데이터베이스에 자동 저장

### 📷 OCR (광학 문자 인식)
- Google Cloud Vision API 기반 텍스트 추출
- 이미지 업로드 시 자동 OCR 처리
- 추출된 텍스트 이메일 발송

### 🎙️ STT (음성-텍스트 변환)
- OpenAI Whisper API (gpt-4o-transcribe) 기반 음성 인식
- Google Speech-to-Text 대안 지원
- 한국어 음성 인식 최적화

### 💡 아이디어 관리
- 텍스트/음성 기반 아이디어 빠른 기록
- Notion 데이터베이스 자동 연동
- 키워드 및 위치 정보 메타데이터 지원

### 🌐 네트워크 모니터링
- IP 주소 변경 모니터링
- Ngrok 터널 상태 모니터링

---

## 🛠️ 기술 스택

| 분류 | 기술 |
|------|------|
| **Framework** | NestJS 10.x |
| **Language** | TypeScript 5.x |
| **AI/ML** | OpenAI GPT-4, Whisper API |
| **Cloud Services** | Google Cloud Vision, Google Speech-to-Text |
| **Integration** | Notion API |
| **Scheduler** | @nestjs/schedule (Cron) |
| **Email** | Nodemailer |
| **Crawler** | Puppeteer, Cheerio, Axios |
| **Excel** | ExcelJS, XLSX |

---

## 📁 프로젝트 구조

```
src/
├── ai-crawler/          # AI 모델 정보 자동 크롤링
├── dto/                 # 데이터 전송 객체
├── idea/                # 아이디어 관리 (텍스트/음성)
├── ipMonitor/           # IP 주소 모니터링
├── mailer/              # 이메일 발송 서비스
├── ngrokMonitor/        # Ngrok 터널 모니터링
├── notion/              # Notion API 연동 (회사/개인)
├── ocr/                 # OCR 텍스트 추출
├── openai/              # OpenAI API 서비스
├── sheet/               # 엑셀 시트 생성
├── static-crawler/      # 정적 웹 크롤링
├── stt/                 # 음성-텍스트 변환
├── task/                # 업무 보고서 생성/발송
├── upload/              # 파일 업로드 처리
└── utils/               # 유틸리티 함수
```

---

## ⚙️ 환경 설정

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 다음 변수들을 설정하세요:

```env
# Notion API
NOTION_TOKEN=your_notion_integration_token
NOTION_DATABASE_ID=your_database_id
PERSONAL_NOTION_TOKEN=your_personal_notion_token
PERSONAL_NOTION_DATABASE_ID=your_personal_database_id

# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# Email (SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password
MAIL_TO=recipient@example.com
```

### 3. Google Cloud 인증

`secrets/google-cloud-credentials.json` 파일에 Google Cloud 서비스 계정 키를 배치하세요.

---

## 🚀 실행 방법

```bash
# 개발 모드 (watch mode)
npm run start:dev

# 프로덕션 빌드
npm run build

# 프로덕션 실행
npm run start:prod
```

---

## 📡 API 엔드포인트

### 업무 보고서
- `POST /task/send` - 업무 보고서 수동 생성 및 발송

### 파일 업로드 & OCR
- `POST /upload/photo` - 이미지 업로드 및 OCR 처리

### 아이디어
- `POST /idea/text` - 텍스트 아이디어 저장
- `POST /idea/voice` - 음성 아이디어 저장 (STT 변환)

### AI 크롤러
- `POST /ai-crawler/run` - AI 모델 크롤링 수동 실행

---

## ⏰ 스케줄러

| 작업 | 실행 시간 | 설명 |
|------|----------|------|
| AI 모델 크롤링 | 매일 오전 10시 | 최신 AI 모델 정보 수집 및 분석 |

---

## 📝 라이선스

이 프로젝트는 UNLICENSED입니다.

---

## 👨‍💻 개발자

Smart Access Team - 김수만

---

<p align="center">
  <sub>Built with ❤️ using NestJS</sub>
</p>
