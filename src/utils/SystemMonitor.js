const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class SystemMonitor {
    constructor() {
        this.platform = this.detectPlatform();
    }

    detectPlatform() {
        const platform = os.platform();
        if (platform === 'win32') return 'windows';
        if (platform === 'darwin') return 'macos';
        if (platform === 'android') return 'android';
        return 'macos'; // 기본값
    }

    async getSystemInfo() {
        return {
            platform: this.platform,
            hostname: os.hostname(),
            arch: os.arch(),
            uptime: Math.floor(os.uptime()),
            message: '시스템 모니터링 중',
        };
    }

    async getFocusedApp() {
        try {
            if (this.platform === 'macos') {
                return await this.getMacOSFocusedApp();
            } else if (this.platform === 'windows') {
                // Windows용 포커스된 앱 감지 (나중에 구현)
                return 'Windows App';
            } else {
                return 'Android App';
            }
        } catch (error) {
            console.error('포커스된 앱 감지 오류:', error);
            return null;
        }
    }

    async getMacOSFocusedApp() {
        try {
            // 1차: Bundle Identifier 기반 정확한 앱 감지
            const bundleResult = await this.getAppByBundleIdentifier();
            if (bundleResult) {
                return bundleResult;
            }

            // 2차: Window Title 기반 감지 (폴백)
            const windowResult = await this.getAppByWindowTitle();
            if (windowResult) {
                return windowResult;
            }

            // 3차: 기존 방식 (최종 폴백)
            return await this.getAppByProcessName();
        } catch (error) {
            console.error('macOS 앱 감지 오류:', error);
            return null;
        }
    }

    async getAppByBundleIdentifier() {
        try {
            const { stdout: bundleId } = await execAsync(`
                osascript -e '
                try
                    tell application "System Events"
                        set frontApp to first application process whose frontmost is true
                        set bundleId to bundle identifier of frontApp
                        set appName to name of frontApp
                        return bundleId & "|" & appName
                    end tell
                on error
                    return "error"
                end try
                '
            `);

            const result = bundleId.trim();
            if (result === 'error' || !result.includes('|')) {
                return null;
            }

            const [bundle, processName] = result.split('|');
            return this.getActualAppName(bundle, processName);
        } catch (error) {
            console.error('Bundle identifier 감지 오류:', error);
            return null;
        }
    }

    async getAppByWindowTitle() {
        try {
            const { stdout: windowInfo } = await execAsync(`
                osascript -e '
                try
                    tell application "System Events"
                        set frontApp to first application process whose frontmost is true
                        set appName to name of frontApp
                        
                        try
                            set windowTitle to name of window 1 of frontApp
                            return appName & "|" & windowTitle
                        on error
                            return appName & "|"
                        end try
                    end tell
                on error
                    return "error"
                end try
                '
            `);

            const result = windowInfo.trim();
            if (result === 'error' || !result.includes('|')) {
                return null;
            }

            const [processName, windowTitle] = result.split('|');
            return this.getAppNameByWindowTitle(processName, windowTitle);
        } catch (error) {
            console.error('Window title 감지 오류:', error);
            return null;
        }
    }

    async getAppByProcessName() {
        try {
            const { stdout: frontmostApp } = await execAsync(`
                osascript -e '
                try
                    tell application "System Events"
                        set frontApp to name of first application process whose frontmost is true
                        
                        -- 특별한 경우들 처리
                        if frontApp is "loginwindow" or frontApp is "System Events" then
                            return "Unknown"
                        end if
                        
                        return frontApp
                    end tell
                on error
                    return "Unknown"
                end try
                '
            `);
            
            const result = frontmostApp.trim();
            return result === 'Unknown' ? null : result;
        } catch (error) {
            console.error('Process name 감지 오류:', error);
            return null;
        }
    }

    getActualAppName(bundleId, processName) {
        // Bundle Identifier를 기반으로 실제 앱 이름 반환
        const bundleMap = {
            'com.microsoft.VSCode': 'Visual Studio Code',
            'com.microsoft.VSCodeInsiders': 'Visual Studio Code - Insiders',
            'com.google.Chrome': 'Google Chrome',
            'com.apple.Safari': 'Safari',
            'com.apple.finder': 'Finder',
            'com.apple.Terminal': 'Terminal',
            'com.github.atom': 'Atom',
            'com.sublimetext.4': 'Sublime Text',
            'com.jetbrains.intellij': 'IntelliJ IDEA',
            'com.jetbrains.WebStorm': 'WebStorm',
            'com.slack.Slack': 'Slack',
            'com.tinyspeck.slackmacgap': 'Slack',
            'com.spotify.client': 'Spotify',
            'com.figma.Desktop': 'Figma',
            // Electron 기반 앱들의 정확한 식별
            'com.electron.devdocs-app': 'DevDocs',
            'com.electron.whatsapp-for-mac': 'WhatsApp',
            'com.postmanlabs.mac': 'Postman'
        };

        // 매핑된 이름이 있으면 사용, 없으면 process name 사용
        return bundleMap[bundleId] || processName;
    }

    getAppNameByWindowTitle(processName, windowTitle) {
        // 윈도우 제목 기반 앱 식별 (Electron 앱들의 추가 검증용)
        if (processName === 'Electron' && windowTitle) {
            // VSCode 패턴 감지
            if (windowTitle.includes('Visual Studio Code') || 
                windowTitle.match(/\\.(js|ts|jsx|tsx|html|css|md|json).*Visual Studio Code/)) {
                return 'Visual Studio Code';
            }
            
            // 다른 Electron 앱들도 추가 가능
            if (windowTitle.includes('Slack')) {
                return 'Slack';
            }
            
            if (windowTitle.includes('WhatsApp')) {
                return 'WhatsApp';
            }
        }
        
        return processName;
    }
}

module.exports = SystemMonitor;