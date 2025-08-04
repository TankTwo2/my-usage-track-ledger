const si = require('systeminformation');
const psList = require('ps-list');
const os = require('os');

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
            await this.collectSystemData();
        }, 5000); // 5초마다 데이터 수집

        console.log('시스템 모니터링 시작됨');
    }

    async stop() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        this.isMonitoring = false;
        console.log('시스템 모니터링 중지됨');
    }

    async collectSystemData() {
        try {
            const timestamp = new Date().toISOString();

            // CPU 사용률
            const cpuUsage = await this.getCpuUsage();

            // 메모리 사용률
            const memoryUsage = await this.getMemoryUsage();

            // 디스크 사용률
            const diskUsage = await this.getDiskUsage();

            // 네트워크 사용률
            const networkUsage = await this.getNetworkUsage();

            // 실행 중인 프로세스
            const processes = await this.getActiveProcesses();

            // 데이터베이스에 저장
            await this.dbManager.saveSystemData({
                timestamp,
                cpu: cpuUsage,
                memory: memoryUsage,
                disk: diskUsage,
                network: networkUsage,
                processes: processes.length,
            });

            // 앱별 사용 시간 업데이트
            await this.updateAppUsage(processes);
        } catch (error) {
            console.error('시스템 데이터 수집 오류:', error);
        }
    }

    async getCpuUsage() {
        try {
            const cpu = await si.currentLoad();
            return {
                load: cpu.currentLoad,
                cores: cpu.cpus.length,
                temperature: cpu.temperature || null,
            };
        } catch (error) {
            console.error('CPU 사용률 수집 오류:', error);
            return { load: 0, cores: os.cpus().length, temperature: null };
        }
    }

    async getMemoryUsage() {
        try {
            const mem = await si.mem();
            const total = mem.total;
            const used = mem.used;
            const free = mem.free;

            return {
                total: total,
                used: used,
                free: free,
                usagePercent: ((used / total) * 100).toFixed(2),
            };
        } catch (error) {
            console.error('메모리 사용률 수집 오류:', error);
            return { total: 0, used: 0, free: 0, usagePercent: 0 };
        }
    }

    async getDiskUsage() {
        try {
            const disk = await si.fsSize();
            return disk.map((fs) => ({
                filesystem: fs.fs,
                size: fs.size,
                used: fs.used,
                available: fs.available,
                usagePercent: fs.use,
            }));
        } catch (error) {
            console.error('디스크 사용률 수집 오류:', error);
            return [];
        }
    }

    async getNetworkUsage() {
        try {
            const network = await si.networkStats();
            return network.map((net) => ({
                interface: net.iface,
                rxBytes: net.rx_bytes,
                txBytes: net.tx_bytes,
                rxSec: net.rx_sec,
                txSec: net.tx_sec,
            }));
        } catch (error) {
            console.error('네트워크 사용률 수집 오류:', error);
            return [];
        }
    }

    async getActiveProcesses() {
        try {
            const processes = await psList();
            return processes
                .filter((proc) => proc.cmd && !proc.cmd.includes('node_modules') && !proc.cmd.includes('system'))
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
        try {
            const [cpu, mem, disk, os] = await Promise.all([si.cpu(), si.mem(), si.diskLayout(), si.osInfo()]);

            return {
                os: {
                    platform: os.platform,
                    distro: os.distro,
                    release: os.release,
                    arch: os.arch,
                },
                cpu: {
                    manufacturer: cpu.manufacturer,
                    brand: cpu.brand,
                    cores: cpu.cores,
                    speed: cpu.speed,
                },
                memory: {
                    total: mem.total,
                },
                disk: disk.map((d) => ({
                    device: d.device,
                    size: d.size,
                    type: d.type,
                })),
            };
        } catch (error) {
            console.error('시스템 정보 수집 오류:', error);
            return {};
        }
    }
}

module.exports = SystemMonitor;
