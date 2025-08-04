const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const SystemMonitor = require('./src/utils/SystemMonitor');

let mainWindow;
let systemMonitor;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
        icon: path.join(__dirname, 'assets', 'appIcon.png'),
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, 'build', 'index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    createWindow();

    // 시스템 모니터 초기화
    systemMonitor = new SystemMonitor();

    // 사용량 데이터를 프론트엔드로 전송하는 함수
    const sendUsageToFrontend = async () => {
        try {
            const appName = await systemMonitor.getFocusedApp();
            if (appName && appName !== 'System Events') {
                const usageData = {
                    app_name: appName,
                    platform: systemMonitor.platform,
                    usage_seconds: 5,
                    timestamp: new Date().toISOString(),
                };

                console.log('사용량 데이터 전송:', usageData);

                // 프론트엔드로 데이터 전송
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('usage-data-updated', usageData);
                    console.log('데이터 전송 완료');
                } else {
                    console.log('메인 윈도우가 없거나 파괴됨');
                }
            } else {
                console.log('포커스된 앱이 없거나 System Events임');
            }
        } catch (error) {
            console.error('사용량 데이터 전송 오류:', error);
        }
    };

    // 5초마다 사용량 데이터 전송
    systemMonitor.monitoringInterval = setInterval(sendUsageToFrontend, 5000);

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

// 앱 종료 시 정리
app.on('before-quit', () => {
    if (systemMonitor && systemMonitor.monitoringInterval) {
        clearInterval(systemMonitor.monitoringInterval);
    }
});

// IPC 핸들러들 - URL 기반 데이터 관리
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
        // URL 기반 데이터 관리를 위해 빈 배열 반환
        // 실제 데이터는 프론트엔드에서 URL 파라미터로 관리
        return [];
    } catch (error) {
        console.error('앱 사용량 조회 오류:', error);
        return [];
    }
});

ipcMain.handle('getDailyStats', async (event, period, platform) => {
    try {
        // URL 기반 데이터 관리를 위해 기본 통계 반환
        return {
            platform: platform || 'all',
            total_apps: 0,
            total_usage_seconds: 0,
            date: new Date().toISOString().split('T')[0],
        };
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
