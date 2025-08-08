# Usage Tracker 📊

실시간 앱 사용량을 추적하고 분석하는 크로스 플랫폼 데스크톱 애플리케이션입니다.

## 🌟 주요 기능

- **실시간 앱 사용량 추적**: macOS, Windows, Android 지원
- **데이터 저장**: SQLite 로컬 저장 + Git Gist 클라우드 백업
- **웹 대시보드**: GitHub Pages에서 실시간 통계 확인
- **다양한 통계**: 일별/주별/월별/연도별 데이터 분석
- **크로스 플랫폼**: Intel/Apple Silicon Mac, Windows 10/11 지원

## 🚀 빠른 시작

### 1. 개발 환경 설정

```bash
# 저장소 클론
git clone https://github.com/TankTwo2/my-usage-track-ledger.git
cd my-usage-track-ledger

# 의존성 설치
npm install

# 개발 모드 실행 (Electron + React)
npm run electron-dev
```

### 2. 프로덕션 빌드

#### macOS 빌드

```bash
# macOS용 앱 빌드 (Intel + Apple Silicon)
npm run electron-pack-mac

# 또는 특정 아키텍처만
npm run electron-pack -- --mac --x64
npm run electron-pack -- --mac --arm64
```

빌드 결과: `dist/` 폴더
- `Usage Tracker-*.dmg`: 설치 파일
- `Usage Tracker-*.zip`: 압축 파일

#### Windows 빌드

```bash
# Windows용 앱 빌드
npm run electron-pack-win

# 또는 포터블 버전
npm run electron-pack -- --win --target portable
```

빌드 결과: `dist/` 폴더
- `Usage Tracker Setup *.exe`: 설치 프로그램
- `Usage Tracker *.exe`: 포터블 버전

#### 모든 플랫폼 빌드

```bash
# 한 번에 모든 플랫폼 빌드
npm run electron-dist-all
```

### 3. 설치 및 실행

#### macOS 설치

1. `Usage Tracker-*.dmg` 파일 다운로드
2. DMG 파일을 열고 애플리케이션 폴더로 드래그
3. 처음 실행 시 "개발자를 확인할 수 없음" 경고가 나올 경우:
   - 시스템 환경설정 → 보안 및 개인 정보 보호
   - "확인되지 않은 개발자의 앱 허용" 클릭

#### Windows 설치

1. `Usage Tracker Setup *.exe` 파일 다운로드
2. 관리자 권한으로 실행
3. 설치 마법사 따라하기

**중요**: Windows에서 앱 추적 기능을 위해 관리자 권한이 필요합니다.

## 🔧 개발 가이드

### 프로젝트 구조

```
my-usage-track-ledger/
├── src/                    # 일렉트론 소스 코드
│   ├── main.ts            # 메인 프로세스
│   ├── utils/
│   │   └── SystemMonitor.ts # 시스템 모니터링
│   └── types.ts           # 타입 정의
├── usage-stats-web/       # 웹 대시보드
│   ├── src/
│   │   ├── App.js         # 메인 컴포넌트
│   │   ├── components/    # React 컴포넌트
│   │   └── services/      # API 서비스
│   └── public/
├── public/                # React 앱 정적 파일
├── build/                 # 빌드된 React 앱
├── dist/                  # 일렉트론 빌드 결과
├── main.js               # 컴파일된 메인 프로세스
└── package.json
```

### 주요 스크립트

```bash
# 개발
npm run start              # React 개발 서버만 실행
npm run electron-dev       # React + Electron 개발 모드

# 빌드
npm run build              # React 앱 빌드
npm run electron-pack      # Electron 앱 빌드 (현재 OS)
npm run electron-pack-mac  # macOS 전용 빌드
npm run electron-pack-win  # Windows 전용 빌드

# 테스트 및 린트
npm test                   # React 테스트
npm run lint               # ESLint 검사
npm run lint:fix           # ESLint 자동 수정
```

### 플랫폼별 요구사항

#### macOS
- **Node.js** 18.0+ 권장
- **Python** (node-gyp용, sqlite3 네이티브 모듈 빌드)
- **Xcode Command Line Tools**
- **macOS 10.15+** (실행 환경)

#### Windows
- **Node.js** 18.0+ 권장  
- **Python** 3.x (node-gyp용)
- **Visual Studio Build Tools** 또는 Visual Studio Community
- **Windows 10/11** (실행 환경)
- **PowerShell 5.1+** (앱 감지용)

#### Linux (테스트 중)
- **Node.js** 18.0+ 권장
- **Python** 3.x
- **build-essential** 패키지

## 🌐 웹 대시보드

### 로컬 개발

```bash
cd usage-stats-web
npm install
npm start
```

### GitHub Pages 배포

```bash
cd usage-stats-web
npm run build
npm run deploy
```

대시보드 URL: `https://tanktwo2.github.io/my-usage-track-ledger/usage-stats-web/`

### 사용자 지정 Gist

URL에 Gist ID를 추가하여 다른 사용자의 데이터를 볼 수 있습니다:
```
https://tanktwo2.github.io/my-usage-track-ledger/usage-stats-web/?gist=YOUR_GIST_ID
```

## ⚙️ 설정

### 환경 변수

`.env` 파일을 생성하여 설정을 커스터마이즈할 수 있습니다:

```env
# Git Gist 설정
GITHUB_TOKEN=your_github_personal_access_token
GIST_ID=your_gist_id

# 데이터 수집 간격 (초)
COLLECTION_INTERVAL=30

# 업로드 간격 (분)
UPLOAD_INTERVAL=5
```

### Gist 설정

1. GitHub Personal Access Token 생성:
   - GitHub → Settings → Developer settings → Personal access tokens
   - `gist` 권한 체크
2. 새 Gist 생성 (공개 또는 비공개)
3. 앱에서 토큰과 Gist ID 설정

## 🔒 보안 및 프라이버시

- **로컬 우선**: 모든 데이터는 먼저 로컬 SQLite에 저장
- **선택적 클라우드**: Gist 업로드는 선택사항
- **개인정보 보호**: 앱 이름만 수집, 개인 파일이나 내용은 추적하지 않음
- **투명성**: 오픈 소스로 코드 공개

## 🐛 문제 해결

### 일반적인 문제

#### macOS: "앱을 열 수 없습니다"
```bash
# 격리 속성 제거
sudo xattr -rd com.apple.quarantine "/Applications/Usage Tracker.app"
```

#### Windows: "관리자 권한 필요"
- 앱을 관리자 권한으로 실행
- 또는 실행 파일 속성에서 "관리자 권한으로 실행" 체크

#### 빌드 실패: node-gyp 오류
```bash
# Windows
npm install --global windows-build-tools

# macOS
xcode-select --install

# 공통
npm rebuild
```

### 로그 확인

개발자 도구에서 로그를 확인할 수 있습니다:
- `Ctrl/Cmd + Shift + I` (DevTools 열기)
- Console 탭에서 로그 확인

## 📈 성능 최적화

- **메모리 사용량**: 평균 50-100MB
- **CPU 사용량**: 평상시 0-1%
- **배터리**: 최소 영향 (백그라운드 최적화)
- **데이터 사용량**: Gist 동기화 시에만 네트워크 사용

## 🤝 기여하기

1. Fork 프로젝트
2. Feature 브랜치 생성: `git checkout -b feature/amazing-feature`
3. 커밋: `git commit -m 'Add amazing feature'`
4. 푸시: `git push origin feature/amazing-feature`
5. Pull Request 생성

### 개발 가이드라인

- TypeScript 사용 (엄격 모드)
- ESLint 규칙 준수
- 커밋 메시지는 한국어 또는 영어
- 플랫폼별 테스트 필수

## 📄 라이센스

이 프로젝트는 MIT 라이센스하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참고하세요.

## 🙏 감사의 말

- [Electron](https://electronjs.org/) - 크로스 플랫폼 데스크톱 앱 프레임워크
- [React](https://reactjs.org/) - 웹 대시보드 UI 라이브러리
- [SQLite](https://www.sqlite.org/) - 로컬 데이터베이스
- [GitHub Gist](https://gist.github.com/) - 클라우드 데이터 저장

## 📞 지원

- **Issue 추적**: [GitHub Issues](https://github.com/TankTwo2/my-usage-track-ledger/issues)
- **개발자**: [@TankTwo2](https://github.com/TankTwo2)
- **라이센스**: MIT

---

⭐ 이 프로젝트가 유용하다면 Star를 눌러주세요!
