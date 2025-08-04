const fs = require('fs');
const path = require('path');

class SystemMonitor {
    constructor(dbManager) {
        this.dbManager = dbManager;
        this.monitoringInterval = null;
        this.isMonitoring = false;
        this.appStartTimes = {}; // 앱별 시작 시간 추적
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
            console.log('=== 앱 사용량 수집 시작 ===');

            // 현재 포커스된 앱 가져오기
            const focusedApp = await this.getFocusedApp();
            console.log('현재 포커스된 앱:', focusedApp);

            if (focusedApp) {
                console.log(`포커스된 앱 이름: ${focusedApp.cmd}`);
                // 포커스된 앱에만 사용 시간 추가 (5초)
                await this.updateAppUsage([focusedApp]);
                console.log(`✅ ${focusedApp.cmd}에 5초 추가됨`);
            } else {
                console.log('❌ 포커스된 앱이 없음');
            }
            console.log('=== 앱 사용량 수집 완료 ===');
        } catch (error) {
            console.error('앱 사용량 수집 오류:', error);
        }
    }

    async getFocusedApp() {
        try {
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);

            // macOS에서 현재 활성 윈도우의 앱 이름 가져오기
            const { stdout } = await execAsync(
                'osascript -e \'tell application "System Events" to get name of first application process whose frontmost is true\''
            );
            const appName = stdout.trim();

            console.log('활성 앱 이름:', appName);

            if (appName && appName !== 'System Events' && appName !== '') {
                return {
                    cmd: appName,
                    pid: 'active',
                    cpu: '0.0',
                    mem: '0.0',
                };
            }

            return null;
        } catch (error) {
            console.error('포커스된 앱 정보 가져오기 오류:', error);
            return null;
        }
    }

    async getActiveProcesses() {
        // 이 함수는 더 이상 사용하지 않지만 호환성을 위해 유지
        return [];
    }

    filterActiveApps(processes) {
        // 이 함수는 더 이상 사용하지 않지만 호환성을 위해 유지
        return [];
    }

    async updateAppUsage(processes) {
        console.log('=== updateAppUsage 시작 ===');
        console.log('받은 프로세스:', processes);

        if (!processes || processes.length === 0) {
            console.log('❌ 업데이트할 앱이 없음');
            return;
        }

        // 포커스된 앱 하나만 처리
        const focusedApp = processes[0];
        console.log('처리할 포커스된 앱:', focusedApp);

        const appName = this.extractAppName(focusedApp.cmd);
        console.log('추출된 앱 이름:', appName);

        if (appName) {
            console.log(`🎯 현재 포커스된 앱: ${appName}`);
            // 포커스된 앱에만 5초 추가
            await this.dbManager.saveAppUsage(appName, 5);
            console.log(`✅ ${appName}에 5초 사용 시간 추가됨`);
        } else {
            console.log('❌ 유효하지 않은 앱 이름:', focusedApp.cmd);
        }
        console.log('=== updateAppUsage 완료 ===');
    }

    extractAppName(cmd) {
        if (!cmd) return null;

        // 포커스된 앱의 이름을 그대로 사용
        const appName = cmd.trim();

        // 빈 문자열이나 시스템 이벤트는 제외
        if (!appName || appName === 'System Events') {
            return null;
        }

        // 앱 이름 정규화 (첫 글자 대문자로)
        return appName.charAt(0).toUpperCase() + appName.slice(1).toLowerCase();
    }

    async getSystemInfo() {
        try {
            const os = require('os');
            return {
                message: '오늘의 앱 사용량 추적',
                platform: os.platform(),
                arch: os.arch(),
                hostname: os.hostname(),
                uptime: os.uptime(),
            };
        } catch (error) {
            console.error('시스템 정보 수집 오류:', error);
            return {
                message: '오늘의 앱 사용량 추적',
            };
        }
    }
}

module.exports = SystemMonitor;
