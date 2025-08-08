import { app, BrowserWindow } from 'electron';
import { TrayService } from './src/services/TrayService';
import { UsageTracker } from './src/services/UsageTracker';
import { BackupService } from './src/services/BackupService';
import * as dotenv from 'dotenv';

// .env 파일 로드
dotenv.config();

// 글로벌 변수
let trayService: TrayService;
let usageTracker: UsageTracker;
let backupService: BackupService;
let isShuttingDown = false;

// 설정 (환경변수에서 로드)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GIST_ID = process.env.GIST_ID || '';
const BACKUP_INTERVAL = parseInt(process.env.BACKUP_INTERVAL_MINUTES || '5');

console.log(`🔧 설정 로드: GitHub Token ${GITHUB_TOKEN ? '✅' : '❌'}, Gist ID ${GIST_ID ? '✅' : '❌'}`);

async function initializeApp(): Promise<void> {
  // 독에서 앱 숨기기 (백그라운드 전용)
  app.dock.hide();
  
  // 서비스 초기화
  trayService = new TrayService();
  usageTracker = new UsageTracker();
  backupService = new BackupService(GITHUB_TOKEN, GIST_ID);
  
  // 트레이 생성
  trayService.createTray();
  
  // 백업 서비스 상태 업데이트 콜백 설정
  backupService.setStatusUpdateCallback((status: string) => {
    trayService.updateMenu(status);
  });
  
  // 초기 데이터 로드 후 모니터링 시작
  await loadInitialDataAndStart();
}

async function loadInitialDataAndStart(): Promise<void> {
  try {
    const initialData = await backupService.loadInitialData();
    
    if (initialData) {
      usageTracker.setCache(initialData);
    }
    
    // 모니터링 시작
    usageTracker.startTracking();
    
    // 환경변수에서 설정된 간격으로 자동 백업
    backupService.startAutoBackup(() => usageTracker.getCache(), BACKUP_INTERVAL);
    console.log(`⏰ 자동 백업 설정: ${BACKUP_INTERVAL}분 주기`);
    
  } catch (error) {
    console.error('❌ 초기화 오류:', error);
  }
}

// 안전한 종료 처리
async function gracefulShutdown(signal?: string): Promise<void> {
  // 이미 종료 중이면 리턴
  if (isShuttingDown) {
    return;
  }
  
  isShuttingDown = true;
  
  if (signal) {
    console.log(`\n🛑 ${signal} 신호 수신 - 안전한 종료 시작...`);
  } else {
    console.log('🔄 앱 종료 - 버퍼 처리 및 정리 중...');
  }
  
  try {
    // 버퍼에 남은 데이터 처리
    if (usageTracker && usageTracker.hasBufferedData()) {
      console.log(`💾 종료 전 ${usageTracker.getBufferSize()}개 샘플 처리 중...`);
      usageTracker.processBuffer();
      
      // 최종 백업
      await backupService.performFinalBackup(usageTracker.getCache());
    }
    
    console.log('🛑 사용량 추적 중지');
    
    // 서비스 정리
    if (usageTracker) {
      usageTracker.stopTracking();
    }
    
    if (backupService) {
      backupService.stopAutoBackup();
    }
    
    if (trayService) {
      trayService.destroy();
    }
    
    console.log('✅ 안전한 종료 완료');
    
  } catch (error) {
    console.error('❌ 종료 처리 중 오류:', error);
  }
}

// Electron 앱 이벤트 처리
app.whenReady().then(initializeApp);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    // 백그라운드 앱이므로 윈도우 생성하지 않음
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 앱 종료 시 안전한 정리
app.on('before-quit', async (event) => {
  // 이미 종료 중이면 그냥 진행
  if (isShuttingDown) {
    return;
  }
  
  event.preventDefault();
  
  try {
    await gracefulShutdown();
  } finally {
    // app.quit() 대신 app.exit() 사용하여 완전 종료
    app.exit(0);
  }
});

// 시스템 신호 처리
process.on('SIGINT', () => gracefulShutdown('SIGINT').then(() => process.exit(0)));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM').then(() => process.exit(0)));
process.on('SIGHUP', () => gracefulShutdown('SIGHUP').then(() => process.exit(0)));