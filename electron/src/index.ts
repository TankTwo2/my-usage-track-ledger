import type { CapacitorElectronConfig } from '@capacitor-community/electron';
import { getCapacitorElectronConfig, setupElectronDeepLinking } from '@capacitor-community/electron';
import type { MenuItemConstructorOptions } from 'electron';
import { app, MenuItem, ipcMain, BrowserWindow } from 'electron';
import electronIsDev from 'electron-is-dev';
import unhandled from 'electron-unhandled';
import { autoUpdater } from 'electron-updater';
import { exec } from 'child_process';
import { promisify } from 'util';

import { ElectronCapacitorApp, setupContentSecurityPolicy, setupReloadWatcher } from './setup';

const execAsync = promisify(exec);

// Graceful handling of unhandled errors.
unhandled();

// Define our menu templates (these are optional)
const trayMenuTemplate: (MenuItemConstructorOptions | MenuItem)[] = [new MenuItem({ label: 'Quit App', role: 'quit' })];
const appMenuBarMenuTemplate: (MenuItemConstructorOptions | MenuItem)[] = [
    { role: process.platform === 'darwin' ? 'appMenu' : 'fileMenu' },
    { role: 'viewMenu' },
];

// Get Config options from capacitor.config
const capacitorFileConfig: CapacitorElectronConfig = getCapacitorElectronConfig();

// Initialize our app. You can pass menu templates into the app here.
// const myCapacitorApp = new ElectronCapacitorApp(capacitorFileConfig);
const myCapacitorApp = new ElectronCapacitorApp(capacitorFileConfig, trayMenuTemplate, appMenuBarMenuTemplate);

// If deeplinking is enabled then we will set it up here.
if (capacitorFileConfig.electron?.deepLinkingEnabled) {
    setupElectronDeepLinking(myCapacitorApp, {
        customProtocol: capacitorFileConfig.electron.deepLinkingCustomProtocol ?? 'mycapacitorapp',
    });
}

// If we are in Dev mode, use the file watcher components.
if (electronIsDev) {
    setupReloadWatcher(myCapacitorApp);
}

// Run Application
(async () => {
    // Wait for electron app to be ready.
    await app.whenReady();
    // Security - Set Content-Security-Policy based on whether or not we are in dev mode.
    setupContentSecurityPolicy(myCapacitorApp.getCustomURLScheme());
    // Initialize our app, build windows, and load content.
    await myCapacitorApp.init();
    // Check for updates if we are in a packaged app.
    autoUpdater.checkForUpdatesAndNotify();
})();

// Handle when all of our windows are close (platforms have their own expectations).
app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// When the dock icon is clicked.
app.on('activate', async function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (myCapacitorApp.getMainWindow().isDestroyed()) {
        await myCapacitorApp.init();
    }
});

// Place all ipc or other electron api calls and custom functionality under this line

// 사용량 모니터링 관련 변수들
let usageMonitorInterval: NodeJS.Timeout | null = null;
let currentAppName: string = '';
let currentPlatform: string = '';

// 플랫폼 감지 함수
function detectPlatform(): string {
    const platform = process.platform;
    if (platform === 'win32') return 'windows';
    if (platform === 'darwin') return 'macos';
    if (platform === 'android') return 'android';
    return 'macos'; // 기본값
}

// 현재 포커스된 앱 감지 함수
async function getFocusedApp(): Promise<string> {
    try {
        if (process.platform === 'darwin') {
            const { stdout } = await execAsync(
                'osascript -e \'tell application "System Events" to get name of first application process whose frontmost is true\''
            );
            return stdout.trim();
        } else if (process.platform === 'win32') {
            // Windows용 포커스된 앱 감지 (나중에 구현)
            return 'Windows App';
        } else {
            return 'Android App';
        }
    } catch (error) {
        console.error('포커스된 앱 감지 오류:', error);
        return 'Unknown App';
    }
}

// 사용량 데이터 전송 함수
function sendUsageData(appName: string, usageSeconds: number, platform: string) {
    const usageData = {
        app_name: appName,
        platform: platform,
        usage_seconds: usageSeconds,
        timestamp: new Date().toISOString(),
    };

    // 모든 브라우저 윈도우에 데이터 전송
    BrowserWindow.getAllWindows().forEach((window) => {
        if (!window.isDestroyed()) {
            console.log('윈도우에 데이터 전송 시도:', window.webContents.getURL());
            window.webContents.send('usage-data-updated', usageData);
        }
    });

    console.log('사용량 데이터 전송:', usageData);
    console.log('데이터 전송 완료');
}

// 사용량 모니터링 시작 함수
function startUsageMonitoring() {
    if (usageMonitorInterval) {
        clearInterval(usageMonitorInterval);
    }

    currentPlatform = detectPlatform();
    console.log('사용량 모니터링 시작 - 플랫폼:', currentPlatform);

    usageMonitorInterval = setInterval(async () => {
        try {
            const newAppName = await getFocusedApp();

            if (newAppName && newAppName !== 'Unknown App') {
                if (currentAppName && currentAppName === newAppName) {
                    // 같은 앱이 계속 사용 중이면 5초 추가
                    sendUsageData(currentAppName, 5, currentPlatform);
                } else {
                    // 새로운 앱으로 변경된 경우
                    if (currentAppName) {
                        // 이전 앱의 마지막 사용량 전송
                        sendUsageData(currentAppName, 5, currentPlatform);
                    }
                    currentAppName = newAppName;
                }
            }
        } catch (error) {
            console.error('사용량 모니터링 오류:', error);
        }
    }, 5000); // 5초마다 실행
}

// 사용량 모니터링 중지 함수
function stopUsageMonitoring() {
    if (usageMonitorInterval) {
        clearInterval(usageMonitorInterval);
        usageMonitorInterval = null;
    }
    console.log('사용량 모니터링 중지');
}

// IPC 핸들러들 추가
ipcMain.handle('getSystemInfo', async () => {
    return {
        message: 'Electron 앱이 실행 중입니다',
        timestamp: Date.now(),
        platform: process.platform,
        version: process.version,
    };
});

ipcMain.handle('getAppUsage', async (event, period = 'today') => {
    // 임시 데이터 반환 (실제로는 데이터베이스에서 가져와야 함)
    return [
        { app_name: 'Chrome', total_usage: 15 },
        { app_name: 'Safari', total_usage: 8 },
        { app_name: 'VS Code', total_usage: 12 },
        { app_name: 'Terminal', total_usage: 5 },
    ];
});

ipcMain.handle('getDailyStats', async (event, period = 'today') => {
    // 임시 데이터 반환 (실제로는 데이터베이스에서 가져와야 함)
    return {
        total_apps: 4,
        total_usage_time: 40,
        date: new Date().toISOString().split('T')[0],
    };
});

// 사용량 모니터링 시작/중지 핸들러
ipcMain.handle('startUsageMonitoring', () => {
    startUsageMonitoring();
    return { success: true, message: '사용량 모니터링이 시작되었습니다.' };
});

ipcMain.handle('stopUsageMonitoring', () => {
    stopUsageMonitoring();
    return { success: true, message: '사용량 모니터링이 중지되었습니다.' };
});
