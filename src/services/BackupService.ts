import { BackupData, UsageCache, DailyData } from '../types';
import { GistBackup } from '../utils/GistBackup';
import { LocalStorageService } from './LocalStorageService';

export class BackupService {
  private gistBackup: GistBackup;
  private localStorage: LocalStorageService;
  private backupInterval: NodeJS.Timeout | null = null;
  private onStatusUpdate?: (status: string) => void;
  private isOnline: boolean = true;

  constructor(githubToken: string, gistId: string) {
    this.gistBackup = new GistBackup(githubToken, gistId);
    this.localStorage = new LocalStorageService();
  }

  public setStatusUpdateCallback(callback: (status: string) => void): void {
    this.onStatusUpdate = callback;
  }

  public async loadInitialData(): Promise<UsageCache | null> {
    let gistData: UsageCache | null = null;
    let localData: DailyData[] = [];

    // 1. Gist에서 데이터 로드 시도
    try {
      console.log('🔄 Gist에서 기존 데이터 로드 시도...');
      const existingData = await this.gistBackup.loadFromGist();
      
      if (existingData && existingData.appUsage) {
        gistData = {
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
        
        console.log(`✅ Gist 데이터 로드 완료 - 총 ${gistData.appUsage.length}개 앱 데이터 복원`);
        this.isOnline = true;
      } else {
        console.log('📋 Gist에 기존 데이터 없음');
      }
    } catch (error) {
      console.log('⚠️ Gist 연결 실패 - 오프라인 모드:', (error as Error).message);
      this.isOnline = false;
    }

    // 2. 로컬 데이터 로드
    try {
      localData = await this.localStorage.loadAllDailyData();
      if (localData.length > 0) {
        console.log(`📂 로컬 데이터 발견: ${localData.length}일치 데이터`);
      }
    } catch (error) {
      console.error('❌ 로컬 데이터 로드 실패:', error);
    }

    // 3. 데이터 병합 또는 선택
    if (gistData && localData.length > 0) {
      // 둘 다 있으면 병합
      console.log('🔄 Gist 데이터와 로컬 데이터 병합 중...');
      return await this.mergeGistAndLocalData(gistData, localData);
    } else if (gistData) {
      // Gist 데이터만 있으면 그것 사용
      return gistData;
    } else if (localData.length > 0) {
      // 로컬 데이터만 있으면 그것을 UsageCache로 변환
      console.log('🔧 로컬 데이터를 사용하여 초기화');
      return this.convertDailyDataToUsageCache(localData);
    } else {
      // 둘 다 없으면 null 반환
      console.log('📋 초기 데이터 없음 - 새로 시작');
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
    const backupTime = new Date().toLocaleTimeString();
    
    // 항상 로컬에 저장
    try {
      await this.localStorage.saveDailyData(usageCache);
    } catch (error) {
      console.error('❌ 로컬 백업 실패:', error);
    }

    // Gist 백업 시도
    try {
      if (!this.isOnline) {
        console.log('📴 오프라인 모드 - Gist 백업 스킵');
        if (this.onStatusUpdate) {
          this.onStatusUpdate(`오프라인 - 로컬 저장됨: ${backupTime}`);
        }
        return;
      }

      console.log('🔄 Gist 백업 시작...');
      
      const backupData: BackupData = {
        ...usageCache,
        backupTimestamp: new Date().toISOString()
      };
      
      await this.gistBackup.backup(backupData);
      console.log(`✅ Gist 백업 완료 - ${backupTime}`);
      console.log(`📈 백업된 데이터: ${backupData.appUsage.length}개 앱, 총 사용시간 ${backupData.dailyStats.total_usage_seconds}초`);
      
      // 백업 성공 표시
      await this.localStorage.markBackupSuccess();
      this.isOnline = true;
      
      // 상태 업데이트 콜백 호출
      if (this.onStatusUpdate) {
        this.onStatusUpdate('마지막 백업: ' + backupTime);
      }
      
    } catch (error) {
      console.error('❌ Gist 백업 실패 - 오프라인 모드 전환:', error);
      this.isOnline = false;
      
      if (this.onStatusUpdate) {
        this.onStatusUpdate(`오프라인 - 로컬 저장됨: ${backupTime}`);
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

  /**
   * Gist 데이터와 로컬 데이터 병합
   */
  private async mergeGistAndLocalData(gistData: UsageCache, localData: DailyData[]): Promise<UsageCache> {
    try {
      console.log(`🔄 데이터 병합 중: Gist(${gistData.appUsage.length}개 앱) + 로컬(${localData.length}일치)`);
      
      // Gist 데이터를 DailyData로 변환 (오늘 날짜로 가정)
      const today = new Date().toISOString().split('T')[0];
      const gistAsDailyData: DailyData = {
        date: today,
        appUsage: gistData.appUsage,
        dailyStats: gistData.dailyStats,
        platformStats: gistData.platformStats,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      // 모든 DailyData 병합 (오늘 날짜가 겹치면 병합)
      const allDailyData = [...localData];
      const todayLocalIndex = allDailyData.findIndex(data => data.date === today);
      
      if (todayLocalIndex >= 0) {
        // 오늘 날짜 데이터가 로컬에 있으면 병합
        allDailyData[todayLocalIndex] = LocalStorageService.mergeDailyData(
          allDailyData[todayLocalIndex],
          gistAsDailyData
        );
      } else {
        // 오늘 날짜 데이터가 없으면 추가
        allDailyData.push(gistAsDailyData);
      }

      // DailyData 배열을 UsageCache로 변환
      const mergedCache = this.convertDailyDataToUsageCache(allDailyData);
      
      console.log(`✅ 병합 완료: 총 ${mergedCache.appUsage.length}개 앱, ${mergedCache.dailyStats.total_usage_seconds}초`);
      return mergedCache;
      
    } catch (error) {
      console.error('❌ 데이터 병합 실패:', error);
      // 병합 실패 시 Gist 데이터 우선 사용
      return gistData;
    }
  }

  /**
   * DailyData 배열을 UsageCache로 변환
   */
  private convertDailyDataToUsageCache(dailyDataArray: DailyData[]): UsageCache {
    if (dailyDataArray.length === 0) {
      // 빈 캐시 반환
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

    // 모든 앱 데이터 병합
    const allApps = new Map<string, any>();
    
    dailyDataArray.forEach(dailyData => {
      dailyData.appUsage.forEach(app => {
        const key = `${app.app_name}_${app.platform}`;
        const existing = allApps.get(key);
        
        if (existing) {
          existing.total_usage_seconds += app.total_usage_seconds;
          existing.lastUpdated = app.lastUpdated > existing.lastUpdated ? 
            app.lastUpdated : existing.lastUpdated;
        } else {
          allApps.set(key, { ...app });
        }
      });
    });

    const mergedApps = Array.from(allApps.values());
    const totalUsageSeconds = mergedApps.reduce((sum, app) => sum + app.total_usage_seconds, 0);

    // 플랫폼별 통계 재계산
    const platformStats = {
      windows: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
      macos: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
      android: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } }
    };

    (['windows', 'macos', 'android'] as const).forEach(platform => {
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
      appUsage: mergedApps,
      dailyStats: {
        total_apps: mergedApps.length,
        total_usage_seconds: totalUsageSeconds,
        date: new Date().toISOString().split('T')[0],
      },
      platformStats
    };
  }

  /**
   * 연결 복구 시 오프라인 데이터 동기화
   */
  public async syncOfflineData(): Promise<boolean> {
    if (this.isOnline) {
      return true; // 이미 온라인
    }

    try {
      console.log('🔄 오프라인 데이터 동기화 시도...');
      
      // 로컬 데이터 로드
      const localData = await this.localStorage.loadAllDailyData();
      if (localData.length === 0) {
        console.log('📭 동기화할 로컬 데이터 없음');
        return true;
      }

      // Gist 연결 테스트
      const gistData = await this.gistBackup.loadFromGist();
      
      // 연결 성공 - 데이터 병합 후 업로드
      const mergedCache = gistData ? 
        await this.mergeGistAndLocalData(gistData, localData) :
        this.convertDailyDataToUsageCache(localData);

      await this.gistBackup.backup({
        ...mergedCache,
        backupTimestamp: new Date().toISOString()
      });

      await this.localStorage.markBackupSuccess();
      this.isOnline = true;
      
      console.log(`✅ 오프라인 데이터 동기화 완료: ${localData.length}일치 데이터`);
      
      if (this.onStatusUpdate) {
        this.onStatusUpdate('동기화 완료: ' + new Date().toLocaleTimeString());
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ 오프라인 데이터 동기화 실패:', error);
      return false;
    }
  }

  /**
   * 온라인 상태 확인
   */
  public isOnlineMode(): boolean {
    return this.isOnline;
  }

  /**
   * 강제 온라인 모드 설정 (연결 재시도)
   */
  public async forceOnlineMode(): Promise<boolean> {
    try {
      // Gist 연결 테스트
      await this.gistBackup.loadFromGist();
      this.isOnline = true;
      console.log('✅ 온라인 모드 복구 성공');
      
      // 오프라인 데이터가 있으면 동기화
      const success = await this.syncOfflineData();
      return success;
      
    } catch (error) {
      console.error('❌ 온라인 모드 복구 실패:', error);
      this.isOnline = false;
      return false;
    }
  }
}