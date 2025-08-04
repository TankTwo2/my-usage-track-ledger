const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// 개발 모드 확인
const isDev = process.env.NODE_ENV !== 'production' || process.env.ELECTRON_IS_DEV;
console.log('개발 모드:', isDev);

// 시스템 모니터링 모듈
const SystemMonitor = require('./src/utils/SystemMonitor');
const DatabaseManager = require('./src/utils/DatabaseManager');

let mainWindow;
let systemMonitor;
let dbManager;

function createWindow() {
    const preloadPath = path.resolve(__dirname, 'preload.js');
    console.log('Preload 스크립트 경로:', preloadPath);
    console.log('현재 디렉토리:', __dirname);

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: preloadPath,
        },
        icon: path.join(__dirname, 'public/logo192.png'),
        title: 'Usage Tracker',
    });

    // 개발 모드에서는 localhost:3000, 프로덕션에서는 build 폴더
    const startUrl = isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, 'build/index.html')}`;
    console.log('로딩할 URL:', startUrl);

    // React 앱 로딩 시도
    mainWindow.loadURL(startUrl).catch((error) => {
        console.error('URL 로딩 실패:', error);
        // 실패 시 빈 페이지 로드
        mainWindow.loadURL('data:text/html,<html><body><h1>로딩 중...</h1></body></html>');
    });

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    // 페이지 로딩 완료 이벤트
    mainWindow.webContents.on('did-finish-load', () => {
        console.log('페이지 로딩 완료');
    });

    // 페이지 로딩 실패 이벤트
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('페이지 로딩 실패:', errorCode, errorDescription);
        console.error('실패한 URL:', event.sender.getURL());
    });

    // DOM 준비 완료 이벤트
    mainWindow.webContents.on('dom-ready', () => {
        console.log('DOM 준비 완료');
    });

    // 콘솔 메시지 수신
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        console.log(`[Renderer] ${level}: ${message} (${sourceId}:${line})`);
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(async () => {
    try {
        // 데이터베이스 초기화
        dbManager = new DatabaseManager();
        await dbManager.init();

        // 시스템 모니터링 시작
        systemMonitor = new SystemMonitor(dbManager);
        await systemMonitor.start();

        createWindow();

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    } catch (error) {
        console.error('앱 초기화 오류:', error);
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC 핸들러들 - App.js에서 사용하는 이름과 일치
ipcMain.handle('getSystemInfo', async () => {
    try {
        return await systemMonitor.getSystemInfo();
    } catch (error) {
        console.error('시스템 정보 조회 오류:', error);
        return null;
    }
});

ipcMain.handle('getAppUsage', async (event, period, platform) => {
    try {
        return await dbManager.getAppUsage(period, platform);
    } catch (error) {
        console.error('앱 사용량 조회 오류:', error);
        return [];
    }
});

ipcMain.handle('getDailyStats', async (event, period, platform) => {
    try {
        return await dbManager.getDailyStats(period, platform);
    } catch (error) {
        console.error('일일 통계 조회 오류:', error);
        return {
            platform: platform || 'all',
            total_apps: 0,
            total_usage_seconds: 0,
            date: new Date().toISOString().split('T')[0],
        };
    }
});

// 설정 관리
ipcMain.handle('get-setting', async (event, key) => {
    return await dbManager.getSetting(key);
});

ipcMain.handle('set-setting', async (event, key, value) => {
    return await dbManager.setSetting(key, value);
});

// 데이터 내보내기
ipcMain.handle('export-data', async (event, format = 'json') => {
    try {
        const data = await dbManager.getAppUsage('month');
        return { success: true, data, format };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// 윈도우 제어
ipcMain.handle('minimize-window', () => {
    if (mainWindow) {
        mainWindow.minimize();
    }
});

ipcMain.handle('maximize-window', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
});

ipcMain.handle('close-window', () => {
    if (mainWindow) {
        mainWindow.close();
    }
});

// 앱 종료 시 정리
app.on('before-quit', async () => {
    if (systemMonitor) {
        await systemMonitor.stop();
    }
    if (dbManager) {
        await dbManager.close();
    }
});
