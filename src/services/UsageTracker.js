"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsageTracker = void 0;
const SystemMonitor_1 = require("../utils/SystemMonitor");
class UsageTracker {
    constructor() {
        this.usageBuffer = [];
        this.samplingInterval = null;
        this.systemMonitor = new SystemMonitor_1.SystemMonitor();
        this.usageCache = this.initializeCache();
    }
    initializeCache() {
        return {
            appUsage: [],
            dailyStats: {
                total_apps: 0,
                total_usage_seconds: 0,
                date: new Date().toISOString().split('T')[0],
            },
            platformStats: {
                windows: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
                macos: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
                android: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
            }
        };
    }
    setCache(cache) {
        this.usageCache = cache;
    }
    getCache() {
        return this.usageCache;
    }
    startTracking() {
        console.log('🚀 사용량 추적 시작');
        // 1초마다 앱 샘플링 (10개 모이면 자동 처리)
        this.samplingInterval = setInterval(() => this.sampleCurrentApp(), 1000);
        console.log('⏰ 앱 샘플링 시작 - 1초 주기 (10개마다 자동 처리)');
    }
    stopTracking() {
        if (this.samplingInterval) {
            clearInterval(this.samplingInterval);
            this.samplingInterval = null;
        }
        console.log('🛑 사용량 추적 중지');
    }
    async sampleCurrentApp() {
        try {
            const appName = await this.systemMonitor.getFocusedApp();
            if (appName && appName !== 'System Events') {
                this.usageBuffer.push({
                    app_name: appName,
                    platform: this.systemMonitor.platform,
                    timestamp: new Date().toISOString()
                });
                // 자세한 로깅 (디버깅용)
                console.log(`📊 샘플 수집: ${appName} [${this.usageBuffer.length}/10]`);
                // 10개가 모이면 즉시 처리
                if (this.usageBuffer.length >= 10) {
                    console.log('🎯 10개 샘플 완료 - 즉시 처리');
                    this.processBuffer();
                }
            }
        }
        catch (error) {
            console.error('❌ 앱 샘플링 오류:', error);
        }
    }
    processBuffer() {
        if (this.usageBuffer.length === 0) {
            return;
        }
        console.log(`🔄 ${this.usageBuffer.length}개 샘플 처리 중...`);
        // 앱별 사용 시간 계산 (샘플 개수 = 초 단위)
        const appUsageCount = {};
        this.usageBuffer.forEach(sample => {
            const appName = sample.app_name || sample.appName;
            if (appName && !appUsageCount[appName]) {
                appUsageCount[appName] = {
                    count: 0,
                    platform: sample.platform
                };
            }
            if (appName) {
                appUsageCount[appName].count++;
            }
        });
        // 캐시 업데이트
        Object.keys(appUsageCount).forEach(appName => {
            const { count, platform } = appUsageCount[appName];
            const existingAppIndex = this.usageCache.appUsage.findIndex(app => app.app_name === appName);
            if (existingAppIndex >= 0) {
                this.usageCache.appUsage[existingAppIndex].total_usage_seconds += count;
            }
            else {
                this.usageCache.appUsage.push({
                    name: appName,
                    app_name: appName,
                    total_usage_seconds: count,
                    platform: platform,
                    last_active: new Date().toISOString(),
                    lastUpdated: new Date().toISOString()
                });
            }
        });
        this.updateStats();
        // 버퍼 초기화
        this.usageBuffer = [];
        // 처리 완료 로그
        if (this.usageCache.appUsage.length > 0) {
            console.log(`📊 처리 완료 - 총 ${this.usageCache.appUsage.length}개 앱 추적중`);
        }
    }
    updateStats() {
        // 통계 업데이트
        const totalUsage = this.usageCache.appUsage.reduce((sum, app) => sum + app.total_usage_seconds, 0);
        this.usageCache.dailyStats = {
            total_apps: this.usageCache.appUsage.length,
            total_usage_seconds: totalUsage,
            date: new Date().toISOString().split('T')[0],
        };
        // 플랫폼별 통계 업데이트
        const platforms = ['windows', 'macos', 'android'];
        platforms.forEach(platform => {
            const platformApps = this.usageCache.appUsage.filter(app => app.platform === platform);
            this.usageCache.platformStats[platform] = {
                apps: platformApps,
                stats: {
                    total_apps: platformApps.length,
                    total_usage_seconds: platformApps.reduce((sum, app) => sum + app.total_usage_seconds, 0)
                }
            };
        });
    }
    hasBufferedData() {
        return this.usageBuffer.length > 0;
    }
    getBufferSize() {
        return this.usageBuffer.length;
    }
}
exports.UsageTracker = UsageTracker;
