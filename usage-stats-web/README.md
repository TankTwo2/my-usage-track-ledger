# Usage Tracker Dashboard

Git Gist에서 실시간으로 사용량 데이터를 불러와서 표시하는 웹 대시보드입니다.

## 🚀 기능

- **실시간 데이터**: Git Gist API를 통해 최신 사용량 데이터 로드
- **다양한 기간 필터**: 일별, 주별, 월별 통계 표시
- **플랫폼별 분류**: Windows, macOS, Android 플랫폼별 사용량 분석
- **자동 새로고침**: 5분마다 자동으로 데이터 업데이트
- **반응형 디자인**: 모바일과 데스크톱 모두 지원

## 🔧 설정

### Gist ID 설정

URL 파라미터로 Gist ID를 전달할 수 있습니다:

```
https://your-domain.com/?gist=YOUR_GIST_ID
```

### 로컬 개발

```bash
npm install
npm start
```

### GitHub Pages 배포

```bash
npm run build
npm run deploy
```

## 📊 데이터 형식

Gist의 `usage-data.json` 파일은 다음 형식이어야 합니다:

```json
{
  "apps": [
    {
      "app_name": "Chrome",
      "platform": "macos",
      "total_usage_seconds": 1800,
      "lastUpdated": "2025-01-08T12:00:00Z"
    }
  ],
  "lastBackup": "2025-01-08T12:00:00Z"
}
```

## 🎨 UI 특징

- **Material Design**: 현대적이고 직관적인 인터페이스
- **글래스모피즘**: 반투명하고 블러 효과가 적용된 카드
- **다크 테마**: 눈에 편안한 어두운 배경
- **애니메이션**: 부드러운 전환 효과

## 🔍 사용법

1. **기간 선택**: 상단의 "일별", "주별", "월별" 버튼으로 기간 설정
2. **날짜 변경**: 날짜 선택기로 특정 날짜/주/월 선택  
3. **플랫폼별 확인**: 각 플랫폼별 상위 5개 앱 사용량 확인
4. **실시간 모니터링**: 자동 새로고침으로 최신 데이터 확인

## 🛠 기술 스택

- **React 19**: 최신 React 버전
- **Vanilla CSS**: CSS Grid, Flexbox 활용
- **GitHub Gist API**: 데이터 저장소
- **GitHub Pages**: 호스팅

## 📱 반응형 지원

- 데스크톱: 그리드 레이아웃으로 최적화
- 태블릿: 적응형 레이아웃  
- 모바일: 세로 스택 레이아웃