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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const TrayService_1 = require("./src/services/TrayService");
const UsageTracker_1 = require("./src/services/UsageTracker");
const BackupService_1 = require("./src/services/BackupService");
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const log = require('electron-log');
// .env 파일 로드 (프로덕션/개발 환경 모두 지원)
const isDev = process.env.NODE_ENV === 'development';
// 다양한 경로에서 .env 파일 찾기
const possibleEnvPaths = [
    isDev ? path.join(__dirname, '.env') : null,
    process.resourcesPath ? path.join(process.resourcesPath, '.env') : null,
    path.join(electron_1.app.getAppPath(), '.env'),
    path.join(process.cwd(), '.env'),
    '.env' // 상대 경로
].filter(Boolean);
console.log('🔧 환경:', isDev ? '개발' : '프로덕션');
console.log('🔧 가능한 .env 파일 경로들:');
possibleEnvPaths.forEach((envPath, index) => {
    const exists = fs.existsSync(envPath);
    console.log(`  ${index + 1}. ${envPath} ${exists ? '✅' : '❌'}`);
});
console.log('🔧 앱 경로 정보:');
console.log(`  - __dirname: ${__dirname}`);
console.log(`  - process.resourcesPath: ${process.resourcesPath || '없음'}`);
console.log(`  - app.getAppPath(): ${electron_1.app.getAppPath()}`);
console.log(`  - process.cwd(): ${process.cwd()}`);
// 존재하는 첫 번째 .env 파일 사용
let envPath = null;
let dotenvResult = { error: new Error('No .env file found') };
for (const testPath of possibleEnvPaths) {
    if (fs.existsSync(testPath)) {
        envPath = testPath;
        console.log(`🎯 사용할 .env 파일: ${envPath}`);
        dotenvResult = dotenv.config({ path: envPath });
        break;
    }
}
if (dotenvResult.error) {
    console.error('❌ .env 파일 로드 실패:', dotenvResult.error.message);
    // 마지막 폴백: 기본 dotenv.config() 시도
    console.log('🔄 기본 dotenv.config() 시도...');
    const fallbackResult = dotenv.config();
    if (fallbackResult.error) {
        console.error('❌ 기본 dotenv 로드도 실패:', fallbackResult.error.message);
        console.log('💡 환경변수를 수동으로 설정하거나 .env 파일 위치를 확인하세요');
    }
    else {
        console.log('✅ 기본 dotenv 로드 성공');
    }
}
else {
    console.log('✅ .env 파일 로드 성공:', envPath);
}
// 로그 시스템 설정
log.transports.file.level = 'info';
log.transports.file.maxSize = 10 * 1024 * 1024; // 10MB
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}] [{level}] {text}';
log.transports.file.resolvePathFn = () => path.join(require('os').homedir(), 'Documents', 'UsageTracker', 'logs', 'app.log');
log.transports.console.level = 'debug';
// 글로벌 변수
let trayService;
let usageTracker;
let backupService;
let isShuttingDown = false;
// 설정 (환경변수에서 로드)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GIST_ID = process.env.GIST_ID || '';
const BACKUP_INTERVAL = parseInt(process.env.BACKUP_INTERVAL_MINUTES || '5');
log.info(`🔧 설정 로드: GitHub Token ${GITHUB_TOKEN ? '✅' : '❌'}, Gist ID ${GIST_ID ? '✅' : '❌'}`);
console.log(`🔧 설정 로드: GitHub Token ${GITHUB_TOKEN ? '✅' : '❌'}, Gist ID ${GIST_ID ? '✅' : '❌'}`);
// 환경변수 로드 결과를 로그 파일에도 기록
log.info('🔧 환경:', isDev ? '개발' : '프로덕션');
log.info('🔧 앱 경로 정보:', {
    __dirname,
    resourcesPath: process.resourcesPath || '없음',
    appPath: electron_1.app.getAppPath(),
    cwd: process.cwd()
});
log.info('🔧 사용된 .env 파일:', envPath || '없음');
log.info('🔧 .env 로드 결과:', dotenvResult.error ? '실패' : '성공');
if (dotenvResult.error) {
    log.error('❌ .env 파일 로드 실패:', dotenvResult.error.message);
}
// 환경변수 상세 정보 로그
console.log('📋 환경변수 상태:');
console.log(`  - NODE_ENV: ${process.env.NODE_ENV || '미설정'}`);
console.log(`  - GITHUB_TOKEN: ${GITHUB_TOKEN ? `${GITHUB_TOKEN.substring(0, 8)}...` : '없음'}`);
console.log(`  - GIST_ID: ${GIST_ID || '없음'}`);
console.log(`  - BACKUP_INTERVAL: ${BACKUP_INTERVAL}분`);
log.info('📋 환경변수 상태:', {
    NODE_ENV: process.env.NODE_ENV || '미설정',
    GITHUB_TOKEN: GITHUB_TOKEN ? `${GITHUB_TOKEN.substring(0, 8)}...` : '없음',
    GIST_ID: GIST_ID || '없음',
    BACKUP_INTERVAL: BACKUP_INTERVAL
});
async function initializeApp() {
    log.info('🚀 Usage Tracker 앱 초기화 시작');
    // 독에서 앱 숨기기 (백그라운드 전용)
    electron_1.app.dock.hide();
    // IPC 핸들러 설정
    setupIpcHandlers();
    // 서비스 초기화
    try {
        log.info('🏗️ 서비스 초기화 시작...');
        log.info('📱 TrayService 생성 중...');
        trayService = new TrayService_1.TrayService();
        log.info('✅ TrayService 생성 완료');
        log.info('⏱️ UsageTracker 생성 중...');
        usageTracker = new UsageTracker_1.UsageTracker();
        log.info('✅ UsageTracker 생성 완료');
        log.info('💾 BackupService 생성 중...');
        backupService = new BackupService_1.BackupService(GITHUB_TOKEN, GIST_ID);
        log.info('✅ BackupService 생성 완료');
        // 트레이 생성
        log.info('🎯 시스템 트레이 생성 중...');
        trayService.createTray();
        log.info('✅ 시스템 트레이 생성 완료');
    }
    catch (error) {
        log.error('❌ 서비스 초기화 실패:', error);
        throw error;
    }
    // 서비스 간 연결 설정
    try {
        log.info('🔗 서비스 간 연결 설정 중...');
        // 백업 서비스 상태 업데이트 콜백 설정
        backupService.setStatusUpdateCallback((status) => {
            trayService.updateMenu(status);
        });
        log.info('✅ 백업 서비스 콜백 설정 완료');
        // UsageTracker에서 감지된 앱 정보를 트레이에 전달
        usageTracker.setAppDetectedCallback((appName) => {
            trayService.updateLastDetectedApp(appName);
        });
        log.info('✅ 사용량 추적 콜백 설정 완료');
        // 초기 데이터 로드 후 모니터링 시작
        log.info('📊 초기 데이터 로드 및 모니터링 시작...');
        await loadInitialDataAndStart();
        log.info('✅ 데이터 로드 및 모니터링 시작 완료');
        log.info('🎉 Usage Tracker 앱 초기화 완료');
    }
    catch (error) {
        log.error('❌ 서비스 연결 또는 데이터 로드 실패:', error);
        // 부분적 실패라도 앱은 계속 실행
        log.info('⚠️ 일부 기능에 문제가 있지만 앱을 계속 실행합니다');
    }
}
async function loadInitialDataAndStart() {
    try {
        log.info('📂 초기 데이터 로드 시도...');
        const initialData = await backupService.loadInitialData();
        if (initialData) {
            log.info('✅ 초기 데이터 로드 성공');
            usageTracker.setCache(initialData);
            log.info('💾 UsageTracker 캐시 설정 완료');
        }
        else {
            log.info('📋 초기 데이터 없음 - 빈 상태로 시작');
        }
        // 모니터링 시작
        log.info('🔍 사용량 모니터링 시작...');
        usageTracker.startTracking();
        log.info('✅ 사용량 모니터링 시작됨');
        // 자동 백업 설정
        if (GITHUB_TOKEN && GIST_ID) {
            log.info(`⏰ 자동 백업 설정 중... (${BACKUP_INTERVAL}분 주기)`);
            backupService.startAutoBackup(() => usageTracker.getCache(), BACKUP_INTERVAL);
            log.info('✅ 자동 백업 설정 완료');
        }
        else {
            log.warn('⚠️ GitHub Token 또는 Gist ID가 없어 자동 백업이 비활성화됩니다');
        }
    }
    catch (error) {
        log.error('❌ 초기 데이터 로드 또는 모니터링 시작 실패:', error);
        // 실패해도 모니터링은 시작
        try {
            log.info('🔄 실패 시 폴백: 모니터링만 시작...');
            usageTracker.startTracking();
            log.info('✅ 폴백 모니터링 시작됨');
        }
        catch (fallbackError) {
            log.error('❌ 폴백 모니터링 시작도 실패:', fallbackError);
        }
    }
}
// IPC 핸들러 설정
function setupIpcHandlers() {
    // 시스템 정보 조회
    electron_1.ipcMain.handle('getSystemInfo', async () => {
        return {
            platform: process.platform,
            version: electron_1.app.getVersion(),
            name: electron_1.app.getName()
        };
    });
    // 앱 사용량 데이터 조회
    electron_1.ipcMain.handle('getAppUsage', async (event, period, platform) => {
        try {
            const cache = usageTracker.getCache();
            log.info(`📊 앱 사용량 조회 요청: period=${period}, platform=${platform}`);
            // 플랫폼별 필터링
            let filteredData = cache.appUsage;
            if (platform && platform !== 'all') {
                filteredData = cache.appUsage.filter((item) => item.platform === platform);
            }
            return {
                appUsage: filteredData,
                dailyStats: cache.dailyStats,
                platformStats: cache.platformStats
            };
        }
        catch (error) {
            log.error('❌ 앱 사용량 조회 오류:', error);
            return { appUsage: [], dailyStats: {}, platformStats: {} };
        }
    });
    // 일일 통계 조회
    electron_1.ipcMain.handle('getDailyStats', async (event, period, platform) => {
        try {
            const cache = usageTracker.getCache();
            log.info(`📈 일일 통계 조회 요청: period=${period}, platform=${platform}`);
            return cache.dailyStats;
        }
        catch (error) {
            log.error('❌ 일일 통계 조회 오류:', error);
            return {};
        }
    });
    // 사용량 데이터 전송 (웹에서 받은 데이터 처리)
    electron_1.ipcMain.handle('sendUsageData', async (event, usageData) => {
        try {
            log.info('📤 웹에서 사용량 데이터 수신:', usageData);
            // 필요시 여기서 추가 처리
            return { success: true };
        }
        catch (error) {
            log.error('❌ 사용량 데이터 처리 오류:', error);
            return { success: false, error: error.message };
        }
    });
    log.info('🔗 IPC 핸들러 설정 완료');
}
// 안전한 종료 처리
async function gracefulShutdown(signal) {
    // 이미 종료 중이면 리턴
    if (isShuttingDown) {
        return;
    }
    isShuttingDown = true;
    if (signal) {
        log.info(`🛑 ${signal} 신호 수신 - 안전한 종료 시작...`);
    }
    else {
        log.info('🔄 앱 종료 - 버퍼 처리 및 정리 중...');
    }
    try {
        // 버퍼에 남은 데이터 처리
        if (usageTracker && usageTracker.hasBufferedData()) {
            log.info(`💾 종료 전 ${usageTracker.getBufferSize()}개 샘플 처리 중...`);
            usageTracker.processBuffer();
            // 최종 백업
            await backupService.performFinalBackup(usageTracker.getCache());
        }
        log.info('🛑 사용량 추적 중지');
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
        log.info('✅ 안전한 종료 완료');
    }
    catch (error) {
        log.error('❌ 종료 처리 중 오류:', error);
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
    // 이미 종료 중이면 그냥 진행
    if (isShuttingDown) {
        return;
    }
    event.preventDefault();
    try {
        await gracefulShutdown();
    }
    finally {
        // app.quit() 대신 app.exit() 사용하여 완전 종료
        electron_1.app.exit(0);
    }
});
// 시스템 신호 처리
process.on('SIGINT', () => gracefulShutdown('SIGINT').then(() => process.exit(0)));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM').then(() => process.exit(0)));
process.on('SIGHUP', () => gracefulShutdown('SIGHUP').then(() => process.exit(0)));
