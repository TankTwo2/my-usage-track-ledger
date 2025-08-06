"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const TrayService_1 = require("./src/services/TrayService");
const UsageTracker_1 = require("./src/services/UsageTracker");
const BackupService_1 = require("./src/services/BackupService");
const dotenv = __importStar(require("dotenv"));
// .env 파일 로드
dotenv.config();
// 글로벌 변수
let trayService;
let usageTracker;
let backupService;
// 설정 (환경변수에서 로드)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GIST_ID = process.env.GIST_ID || '';
const BACKUP_INTERVAL = parseInt(process.env.BACKUP_INTERVAL_MINUTES || '5');
console.log(`🔧 설정 로드: GitHub Token ${GITHUB_TOKEN ? '✅' : '❌'}, Gist ID ${GIST_ID ? '✅' : '❌'}`);
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
        // 환경변수에서 설정된 간격으로 자동 백업
        backupService.startAutoBackup(() => usageTracker.getCache(), BACKUP_INTERVAL);
        console.log(`⏰ 자동 백업 설정: ${BACKUP_INTERVAL}분 주기`);
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
