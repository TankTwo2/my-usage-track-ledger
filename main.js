const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

// 시스템 모니터링 모듈
const SystemMonitor = require('./src/utils/SystemMonitor');
const DatabaseManager = require('./src/utils/DatabaseManager');

let mainWindow;
let systemMonitor;
let dbManager;

function createWindow() {
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
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC 핸들러들
ipcMain.handle('get-system-info', async () => {
    return await systemMonitor.getSystemInfo();
});

ipcMain.handle('get-usage-stats', async (event, period = 'today') => {
    return await dbManager.getUsageStats(period);
});

ipcMain.handle('get-app-usage', async (event, period = 'today') => {
    return await dbManager.getAppUsage(period);
});

ipcMain.handle('get-cpu-usage', async () => {
    return await systemMonitor.getCpuUsage();
});

ipcMain.handle('get-memory-usage', async () => {
    return await systemMonitor.getMemoryUsage();
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
