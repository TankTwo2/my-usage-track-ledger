import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class SystemMonitor {
    constructor(dbManager) {
        this.dbManager = dbManager;
        this.monitoringInterval = null;
        this.isMonitoring = false;
    }

    async start() {
        if (this.isMonitoring) return;

        this.isMonitoring = true;
        this.monitoringInterval = setInterval(async () => {
            await this.collectAppUsage();
        }, 5000); // 5초마다 앱 사용량 수집

        console.log('앱 사용량 모니터링 시작됨');
    }

    async stop() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        this.isMonitoring = false;
        console.log('앱 사용량 모니터링 중지됨');
    }

    async collectAppUsage() {
        try {
            // 실행 중인 프로세스 가져오기
            const processes = await this.getActiveProcesses();
            
            // 앱별 사용 시간 업데이트
            await this.updateAppUsage(processes);
            
        } catch (error) {
            console.error('앱 사용량 수집 오류:', error);
        }
    }

    async getActiveProcesses() {
        try {
            // Node.js 내장 모듈을 사용하여 프로세스 목록 가져오기
            const { stdout } = await execAsync('ps -eo comm,pid,pcpu,pmem --no-headers');
            const lines = stdout.trim().split('\n');
            
            return lines
                .map(line => {
                    const parts = line.trim().split(/\s+/);
                    if (parts.length >= 1) {
                        return {
                            cmd: parts[0],
                            pid: parts[1] || '',
                            cpu: parts[2] || '0',
                            mem: parts[3] || '0'
                        };
                    }
                    return null;
                })
                .filter(proc => proc && proc.cmd && !proc.cmd.includes('node_modules') && !proc.cmd.includes('system'))
                .slice(0, 20); // 상위 20개 프로세스만
        } catch (error) {
            console.error('프로세스 목록 수집 오류:', error);
            return [];
        }
    }

    async updateAppUsage(processes) {
        const appUsage = {};

        processes.forEach((proc) => {
            const appName = this.extractAppName(proc.cmd);
            if (appName) {
                appUsage[appName] = (appUsage[appName] || 0) + 1;
            }
        });

        // 데이터베이스에 앱 사용 시간 저장
        for (const [appName, usage] of Object.entries(appUsage)) {
            await this.dbManager.saveAppUsage(appName, usage);
        }
    }

    extractAppName(cmd) {
        if (!cmd) return null;

        // 일반적인 앱 이름 추출
        const commonApps = [
            'chrome',
            'firefox',
            'safari',
            'edge',
            'vscode',
            'sublime',
            'atom',
            'spotify',
            'discord',
            'slack',
            'photoshop',
            'illustrator',
            'figma',
            'excel',
            'word',
            'powerpoint',
            'terminal',
            'finder',
            'explorer',
            'cursor',
            'intellij',
            'webstorm',
            'pycharm',
            'xcode',
            'android studio',
            'postman',
            'notion',
            'zoom',
            'teams',
            'skype',
            'telegram',
            'whatsapp',
            'wechat',
            'line',
            'kakao',
            'naver',
            'daum',
            'google',
            'microsoft',
            'apple',
            'adobe'
        ];

        const lowerCmd = cmd.toLowerCase();
        for (const app of commonApps) {
            if (lowerCmd.includes(app)) {
                return app;
            }
        }

        // 파일명에서 추출
        const fileName = cmd.split('/').pop().split('\\').pop();
        return fileName.split('.')[0];
    }

    async getSystemInfo() {
        return {
            message: '앱 사용량 추적 모드',
            timestamp: new Date().toISOString()
        };
    }
}

export default SystemMonitor;
