"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStorageService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class LocalStorageService {
    constructor(dataDir = './data/local') {
        this.dataDir = dataDir;
        this.metaFile = path.join(this.dataDir, 'meta.json');
        this.ensureDataDirectory();
    }
    ensureDataDirectory() {
        try {
            if (!fs.existsSync(this.dataDir)) {
                fs.mkdirSync(this.dataDir, { recursive: true });
                console.log(`📁 로컬 저장소 디렉토리 생성: ${this.dataDir}`);
            }
        }
        catch (error) {
            console.error('❌ 로컬 저장소 디렉토리 생성 실패:', error);
        }
    }
    /**
     * 일별 데이터 저장
     */
    async saveDailyData(usageCache) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const dailyData = {
                date: today,
                appUsage: usageCache.appUsage,
                dailyStats: usageCache.dailyStats,
                platformStats: usageCache.platformStats,
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            };
            const fileName = `${today}.json`;
            const filePath = path.join(this.dataDir, fileName);
            fs.writeFileSync(filePath, JSON.stringify(dailyData, null, 2));
            // 메타데이터 업데이트
            await this.updateMeta();
            console.log(`💾 로컬 데이터 저장 완료: ${fileName}`);
            return true;
        }
        catch (error) {
            console.error('❌ 로컬 데이터 저장 실패:', error);
            return false;
        }
    }
    /**
     * 일별 데이터 로드
     */
    async loadDailyData(date) {
        try {
            const fileName = `${date}.json`;
            const filePath = path.join(this.dataDir, fileName);
            if (!fs.existsSync(filePath)) {
                return null;
            }
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const dailyData = JSON.parse(fileContent);
            return dailyData;
        }
        catch (error) {
            console.error(`❌ 로컬 데이터 로드 실패 (${date}):`, error);
            return null;
        }
    }
    /**
     * 모든 로컬 데이터 로드
     */
    async loadAllDailyData() {
        try {
            const files = fs.readdirSync(this.dataDir)
                .filter(file => file.endsWith('.json') && file !== 'meta.json')
                .sort();
            const allData = [];
            for (const file of files) {
                const date = file.replace('.json', '');
                const dailyData = await this.loadDailyData(date);
                if (dailyData) {
                    allData.push(dailyData);
                }
            }
            console.log(`📂 로컬 데이터 로드 완료: ${allData.length}일치 데이터`);
            return allData;
        }
        catch (error) {
            console.error('❌ 전체 로컬 데이터 로드 실패:', error);
            return [];
        }
    }
    /**
     * 날짜 범위 내 데이터 로드
     */
    async loadDataInRange(startDate, endDate) {
        try {
            const allData = await this.loadAllDailyData();
            return allData.filter(data => data.date >= startDate && data.date <= endDate);
        }
        catch (error) {
            console.error('❌ 날짜 범위 데이터 로드 실패:', error);
            return [];
        }
    }
    /**
     * 오래된 데이터 삭제 (보관 기간 초과)
     */
    async cleanupOldData(retentionDays = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
            const cutoffString = cutoffDate.toISOString().split('T')[0];
            const files = fs.readdirSync(this.dataDir)
                .filter(file => file.endsWith('.json') && file !== 'meta.json');
            let deletedCount = 0;
            for (const file of files) {
                const date = file.replace('.json', '');
                if (date < cutoffString) {
                    const filePath = path.join(this.dataDir, file);
                    fs.unlinkSync(filePath);
                    deletedCount++;
                }
            }
            if (deletedCount > 0) {
                await this.updateMeta();
                console.log(`🗑️ 오래된 로컬 데이터 삭제: ${deletedCount}개 파일`);
            }
            return deletedCount;
        }
        catch (error) {
            console.error('❌ 오래된 데이터 삭제 실패:', error);
            return 0;
        }
    }
    /**
     * 메타데이터 업데이트
     */
    async updateMeta() {
        try {
            const files = fs.readdirSync(this.dataDir)
                .filter(file => file.endsWith('.json') && file !== 'meta.json')
                .sort();
            const meta = {
                totalDays: files.length,
                oldestDate: files.length > 0 ? files[0].replace('.json', '') : '',
                newestDate: files.length > 0 ? files[files.length - 1].replace('.json', '') : '',
                lastBackupAttempt: new Date().toISOString()
            };
            fs.writeFileSync(this.metaFile, JSON.stringify(meta, null, 2));
        }
        catch (error) {
            console.error('❌ 메타데이터 업데이트 실패:', error);
        }
    }
    /**
     * 메타데이터 로드
     */
    async loadMeta() {
        try {
            if (!fs.existsSync(this.metaFile)) {
                return null;
            }
            const content = fs.readFileSync(this.metaFile, 'utf8');
            return JSON.parse(content);
        }
        catch (error) {
            console.error('❌ 메타데이터 로드 실패:', error);
            return null;
        }
    }
    /**
     * 백업 성공 시간 기록
     */
    async markBackupSuccess() {
        try {
            const meta = await this.loadMeta() || {
                totalDays: 0,
                oldestDate: '',
                newestDate: ''
            };
            meta.lastSuccessfulBackup = new Date().toISOString();
            fs.writeFileSync(this.metaFile, JSON.stringify(meta, null, 2));
        }
        catch (error) {
            console.error('❌ 백업 성공 기록 실패:', error);
        }
    }
    /**
     * 데이터 병합 (같은 날짜의 앱별 사용시간 합산)
     */
    static mergeDailyData(data1, data2) {
        if (data1.date !== data2.date) {
            throw new Error(`날짜가 다른 데이터는 병합할 수 없습니다: ${data1.date} vs ${data2.date}`);
        }
        // 앱별 사용시간 병합
        const mergedAppUsage = new Map();
        // data1의 앱 데이터 추가
        data1.appUsage.forEach(app => {
            const key = `${app.app_name}_${app.platform}`;
            mergedAppUsage.set(key, { ...app });
        });
        // data2의 앱 데이터 병합
        data2.appUsage.forEach(app => {
            const key = `${app.app_name}_${app.platform}`;
            const existing = mergedAppUsage.get(key);
            if (existing) {
                existing.total_usage_seconds += app.total_usage_seconds;
                existing.lastUpdated = app.lastUpdated > existing.lastUpdated ?
                    app.lastUpdated : existing.lastUpdated;
            }
            else {
                mergedAppUsage.set(key, { ...app });
            }
        });
        const mergedApps = Array.from(mergedAppUsage.values());
        // 통계 재계산
        const totalUsageSeconds = mergedApps.reduce((sum, app) => sum + app.total_usage_seconds, 0);
        // 플랫폼별 통계 재계산
        const platformStats = {
            windows: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
            macos: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
            android: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } }
        };
        ['windows', 'macos', 'android'].forEach(platform => {
            const platformApps = mergedApps.filter(app => app.platform === platform);
            platformStats[platform] = {
                apps: platformApps,
                stats: {
                    total_apps: platformApps.length,
                    total_usage_seconds: platformApps.reduce((sum, app) => sum + app.total_usage_seconds, 0)
                }
            };
        });
        return {
            date: data1.date,
            appUsage: mergedApps,
            dailyStats: {
                total_apps: mergedApps.length,
                total_usage_seconds: totalUsageSeconds,
                date: data1.date
            },
            platformStats,
            createdAt: data1.createdAt < data2.createdAt ? data1.createdAt : data2.createdAt,
            lastUpdated: new Date().toISOString()
        };
    }
}
exports.LocalStorageService = LocalStorageService;
