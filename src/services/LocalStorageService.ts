import * as fs from 'fs';
import * as path from 'path';
import { DailyData, LocalStorageMeta, UsageCache, MergeResult, AppUsage, Platform } from '../types';

export class LocalStorageService {
  private dataDir: string;
  private metaFile: string;

  constructor(dataDir: string = './data/local') {
    this.dataDir = dataDir;
    this.metaFile = path.join(this.dataDir, 'meta.json');
    this.ensureDataDirectory();
  }

  private ensureDataDirectory(): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
        console.log(`📁 로컬 저장소 디렉토리 생성: ${this.dataDir}`);
      }
    } catch (error) {
      console.error('❌ 로컬 저장소 디렉토리 생성 실패:', error);
    }
  }

  /**
   * 일별 데이터 저장
   */
  public async saveDailyData(usageCache: UsageCache): Promise<boolean> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const dailyData: DailyData = {
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
    } catch (error) {
      console.error('❌ 로컬 데이터 저장 실패:', error);
      return false;
    }
  }

  /**
   * 일별 데이터 로드
   */
  public async loadDailyData(date: string): Promise<DailyData | null> {
    try {
      const fileName = `${date}.json`;
      const filePath = path.join(this.dataDir, fileName);
      
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const fileContent = fs.readFileSync(filePath, 'utf8');
      const dailyData: DailyData = JSON.parse(fileContent);
      
      return dailyData;
    } catch (error) {
      console.error(`❌ 로컬 데이터 로드 실패 (${date}):`, error);
      return null;
    }
  }

  /**
   * 모든 로컬 데이터 로드
   */
  public async loadAllDailyData(): Promise<DailyData[]> {
    try {
      const files = fs.readdirSync(this.dataDir)
        .filter(file => file.endsWith('.json') && file !== 'meta.json')
        .sort();

      const allData: DailyData[] = [];

      for (const file of files) {
        const date = file.replace('.json', '');
        const dailyData = await this.loadDailyData(date);
        if (dailyData) {
          allData.push(dailyData);
        }
      }

      console.log(`📂 로컬 데이터 로드 완료: ${allData.length}일치 데이터`);
      return allData;
    } catch (error) {
      console.error('❌ 전체 로컬 데이터 로드 실패:', error);
      return [];
    }
  }

  /**
   * 날짜 범위 내 데이터 로드
   */
  public async loadDataInRange(startDate: string, endDate: string): Promise<DailyData[]> {
    try {
      const allData = await this.loadAllDailyData();
      return allData.filter(data => 
        data.date >= startDate && data.date <= endDate
      );
    } catch (error) {
      console.error('❌ 날짜 범위 데이터 로드 실패:', error);
      return [];
    }
  }

  /**
   * 오래된 데이터 삭제 (보관 기간 초과)
   */
  public async cleanupOldData(retentionDays: number = 30): Promise<number> {
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
    } catch (error) {
      console.error('❌ 오래된 데이터 삭제 실패:', error);
      return 0;
    }
  }

  /**
   * 메타데이터 업데이트
   */
  private async updateMeta(): Promise<void> {
    try {
      const files = fs.readdirSync(this.dataDir)
        .filter(file => file.endsWith('.json') && file !== 'meta.json')
        .sort();

      const meta: LocalStorageMeta = {
        totalDays: files.length,
        oldestDate: files.length > 0 ? files[0].replace('.json', '') : '',
        newestDate: files.length > 0 ? files[files.length - 1].replace('.json', '') : '',
        lastBackupAttempt: new Date().toISOString()
      };

      fs.writeFileSync(this.metaFile, JSON.stringify(meta, null, 2));
    } catch (error) {
      console.error('❌ 메타데이터 업데이트 실패:', error);
    }
  }

  /**
   * 메타데이터 로드
   */
  public async loadMeta(): Promise<LocalStorageMeta | null> {
    try {
      if (!fs.existsSync(this.metaFile)) {
        return null;
      }

      const content = fs.readFileSync(this.metaFile, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error('❌ 메타데이터 로드 실패:', error);
      return null;
    }
  }

  /**
   * 백업 성공 시간 기록
   */
  public async markBackupSuccess(): Promise<void> {
    try {
      const meta = await this.loadMeta() || {
        totalDays: 0,
        oldestDate: '',
        newestDate: ''
      };

      meta.lastSuccessfulBackup = new Date().toISOString();
      fs.writeFileSync(this.metaFile, JSON.stringify(meta, null, 2));
    } catch (error) {
      console.error('❌ 백업 성공 기록 실패:', error);
    }
  }

  /**
   * 데이터 병합 (같은 날짜의 앱별 사용시간 합산)
   */
  public static mergeDailyData(data1: DailyData, data2: DailyData): DailyData {
    if (data1.date !== data2.date) {
      throw new Error(`날짜가 다른 데이터는 병합할 수 없습니다: ${data1.date} vs ${data2.date}`);
    }

    // 앱별 사용시간 병합
    const mergedAppUsage = new Map<string, AppUsage>();

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
      } else {
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

    (['windows', 'macos', 'android'] as Platform[]).forEach(platform => {
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