"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupService = void 0;
const GistBackup_1 = require("../utils/GistBackup");
class BackupService {
    constructor(githubToken, gistId) {
        this.backupInterval = null;
        this.gistBackup = new GistBackup_1.GistBackup(githubToken, gistId);
    }
    setStatusUpdateCallback(callback) {
        this.onStatusUpdate = callback;
    }
    async loadInitialData() {
        try {
            console.log('🔄 Gist에서 기존 데이터 로드 시도...');
            const existingData = await this.gistBackup.loadFromGist();
            if (existingData && existingData.appUsage) {
                const usageCache = {
                    appUsage: existingData.appUsage || [],
                    dailyStats: existingData.dailyStats || {
                        total_apps: 0,
                        total_usage_seconds: 0,
                        date: new Date().toISOString().split('T')[0],
                    },
                    platformStats: existingData.platformStats || {
                        windows: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
                        macos: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
                        android: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
                    }
                };
                console.log(`✅ Gist 데이터 로드 완료 - 총 ${usageCache.appUsage.length}개 앱 데이터 복원`);
                return usageCache;
            }
            else {
                console.log('📋 Gist에 기존 데이터 없음 - 새로 시작');
                return null;
            }
        }
        catch (error) {
            console.log('⚠️ Gist 데이터 로드 실패 (새로 시작):', error.message);
            return null;
        }
    }
    startAutoBackup(getUsageCache, intervalMinutes = 1) {
        // 기존 인터벌이 있으면 정리
        if (this.backupInterval) {
            clearInterval(this.backupInterval);
        }
        const intervalMs = intervalMinutes * 60 * 1000;
        this.backupInterval = setInterval(() => {
            this.performBackup(getUsageCache());
        }, intervalMs);
        console.log(`⏰ Gist 백업 시작 - ${intervalMinutes}분 주기 (테스트용)`);
    }
    stopAutoBackup() {
        if (this.backupInterval) {
            clearInterval(this.backupInterval);
            this.backupInterval = null;
            console.log('🛑 자동 백업 중지');
        }
    }
    async performBackup(usageCache) {
        try {
            console.log('🔄 Gist 백업 시작...');
            const backupData = {
                ...usageCache,
                backupTimestamp: new Date().toISOString()
            };
            await this.gistBackup.backup(backupData);
            const backupTime = new Date().toLocaleTimeString();
            console.log(`✅ Gist 백업 완료 - ${backupTime}`);
            console.log(`📈 백업된 데이터: ${backupData.appUsage.length}개 앱, 총 사용시간 ${backupData.dailyStats.total_usage_seconds}초`);
            // 상태 업데이트 콜백 호출
            if (this.onStatusUpdate) {
                this.onStatusUpdate('마지막 백업: ' + backupTime);
            }
        }
        catch (error) {
            console.error('❌ Gist 백업 실패:', error);
            if (this.onStatusUpdate) {
                this.onStatusUpdate('백업 실패: ' + error.message);
            }
        }
    }
    async performFinalBackup(usageCache) {
        try {
            console.log('💾 최종 백업 수행...');
            await this.performBackup(usageCache);
        }
        catch (error) {
            console.error('❌ 최종 백업 실패:', error);
        }
    }
}
exports.BackupService = BackupService;
