"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const TrayService_1 = require("./src/services/TrayService");
const UsageTracker_1 = require("./src/services/UsageTracker");
const BackupService_1 = require("./src/services/BackupService");
// 글로벌 변수
let trayService;
let usageTracker;
let backupService;
// 설정
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GIST_ID = process.env.GIST_ID || '';
async function initializeApp() {
    // 독에서 앱 숨기기 (백그라운드 전용)
    electron_1.app.dock.hide();
    // 서비스 초기화
    trayService = new TrayService_1.TrayService();
    usageTracker = new UsageTracker_1.UsageTracker();
    backupService = new BackupService_1.BackupService(GITHUB_TOKEN, GIST_ID);
    // 트레이 생성
    trayService.createTray();
    // 백업 서비스 상태 업데이트 콜백 설정
    backupService.setStatusUpdateCallback((status) => {
        trayService.updateMenu(status);
    });
    // 초기 데이터 로드 후 모니터링 시작
    await loadInitialDataAndStart();
}
async function loadInitialDataAndStart() {
    try {
        const initialData = await backupService.loadInitialData();
        if (initialData) {
            usageTracker.setCache(initialData);
        }
        // 모니터링 시작
        usageTracker.startTracking();
        // 1분마다 자동 백업 (테스트용)
        backupService.startAutoBackup(() => usageTracker.getCache(), 1);
        // 나중에 5분으로 변경: backupService.startAutoBackup(() => usageTracker.getCache(), 5);
    }
    catch (error) {
        console.error('❌ 초기화 오류:', error);
    }
}
// 안전한 종료 처리
async function gracefulShutdown(signal) {
    if (signal) {
        console.log(`\n🛑 ${signal} 신호 수신 - 안전한 종료 시작...`);
    }
    else {
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
    }
    catch (error) {
        console.error('❌ 종료 처리 중 오류:', error);
    }
}
// Electron 앱 이벤트 처리
electron_1.app.whenReady().then(initializeApp);
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        // 백그라운드 앱이므로 윈도우 생성하지 않음
    }
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
// 앱 종료 시 안전한 정리
electron_1.app.on('before-quit', async (event) => {
    event.preventDefault();
    try {
        await gracefulShutdown();
    }
    finally {
        electron_1.app.quit();
    }
});
// 시스템 신호 처리
process.on('SIGINT', () => gracefulShutdown('SIGINT').then(() => process.exit(0)));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM').then(() => process.exit(0)));
process.on('SIGHUP', () => gracefulShutdown('SIGHUP').then(() => process.exit(0)));
