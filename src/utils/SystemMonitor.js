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
                const { stdout } = await execAsync(
                    'osascript -e \'tell application "System Events" to get name of first application process whose frontmost is true\''
                );
                return stdout.trim();
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
}

module.exports = SystemMonitor;
