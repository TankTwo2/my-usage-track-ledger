const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let systemMonitor;
let dbManager;

async function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'public/logo192.png'),
        title: 'Usage Tracker',
    });

    // 개발 모드에서는 localhost:3000, 프로덕션에서는 build 폴더
    const startUrl = isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, 'build/index.html')}`;

    mainWindow.loadURL(startUrl);

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(async () => {
    try {
        // 동적 import 사용
        const { default: DatabaseManager } = await import('./src/utils/DatabaseManager.js');
        const { default: SystemMonitor } = await import('./src/utils/SystemMonitor.js');

        // 데이터베이스 초기화
        dbManager = new DatabaseManager();
        await dbManager.init();

        // 시스템 모니터링 시작
        systemMonitor = new SystemMonitor(dbManager);
        await systemMonitor.start();

        await createWindow();

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
    return await systemMonitor.getSystemInfo();
});

ipcMain.handle('getAppUsage', async (event, period = 'today') => {
    return await dbManager.getAppUsage(period);
});

ipcMain.handle('getDailyStats', async (event, period = 'today') => {
    return await dbManager.getDailyStats(period);
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
