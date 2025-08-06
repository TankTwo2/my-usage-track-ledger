import { BackupData, UsageCache } from '../types';
import { GistBackup } from '../utils/GistBackup';

export class BackupService {
  private gistBackup: GistBackup;
  private backupInterval: NodeJS.Timeout | null = null;
  private onStatusUpdate?: (status: string) => void;

  constructor(githubToken: string, gistId: string) {
    this.gistBackup = new GistBackup(githubToken, gistId);
  }

  public setStatusUpdateCallback(callback: (status: string) => void): void {
    this.onStatusUpdate = callback;
  }

  public async loadInitialData(): Promise<UsageCache | null> {
    try {
      console.log('🔄 Gist에서 기존 데이터 로드 시도...');
      const existingData = await this.gistBackup.loadFromGist();
      
      if (existingData && existingData.appUsage) {
        const usageCache: UsageCache = {
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
      } else {
        console.log('📋 Gist에 기존 데이터 없음 - 새로 시작');
        return null;
      }
    } catch (error) {
      console.log('⚠️ Gist 데이터 로드 실패 (새로 시작):', (error as Error).message);
      return null;
    }
  }

  public startAutoBackup(getUsageCache: () => UsageCache, intervalMinutes: number = 1): void {
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

  public stopAutoBackup(): void {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
      console.log('🛑 자동 백업 중지');
    }
  }

  public async performBackup(usageCache: UsageCache): Promise<void> {
    try {
      console.log('🔄 Gist 백업 시작...');
      
      const backupData: BackupData = {
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
      
    } catch (error) {
      console.error('❌ Gist 백업 실패:', error);
      if (this.onStatusUpdate) {
        this.onStatusUpdate('백업 실패: ' + (error as Error).message);
      }
    }
  }

  public async performFinalBackup(usageCache: UsageCache): Promise<void> {
    try {
      console.log('💾 최종 백업 수행...');
      await this.performBackup(usageCache);
    } catch (error) {
      console.error('❌ 최종 백업 실패:', error);
    }
  }
}