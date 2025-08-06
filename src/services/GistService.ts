import { GistBackup } from '../utils/GistBackup';
import { AppState, CompressedData } from '../types';

export class GistService {
  private gistBackup: GistBackup;
  private backupInterval: NodeJS.Timeout | null = null;

  constructor(githubToken: string, gistId: string) {
    this.gistBackup = new GistBackup(githubToken, gistId);
  }

  // Gist에서 데이터 복원
  public async restoreFromGist(): Promise<CompressedData | null> {
    try {
      const restoredData = await this.gistBackup.loadFromGist();
      
      return {
        appUsage: restoredData.appUsage || [],
        dailyStats: restoredData.dailyStats || {
          total_apps: 0,
          total_usage_seconds: 0,
          date: new Date().toISOString().split('T')[0],
        },
        platformStats: restoredData.platformStats || {
          windows: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
          macos: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
          android: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
        }
      };
    } catch (error) {
      console.error('❌ Gist 복원 실패:', error);
      throw error;
    }
  }

  // Gist에 데이터 백업
  public async backupToGist(appState: AppState): Promise<void> {
    try {
      const currentData = {
        appUsage: appState.appUsage,
        dailyStats: appState.dailyStats!,
        platformStats: appState.platformStats!,
        backupTimestamp: new Date().toISOString(),
      };

      const gist = await this.gistBackup.backup(currentData);
      
      // 새로 생성된 Gist ID 출력 (코드에 복사해서 하드코딩)
      if (gist.id && !this.gistBackup['gistId']) {
        console.log('🔥 생성된 Gist ID (코드에 하드코딩하세요):', gist.id);
        alert(`생성된 Gist ID: ${gist.id}\n코드에서 GIST_ID 값을 이것으로 변경하세요!`);
      }

      console.log('🎉 Gist 백업 성공');
    } catch (error) {
      console.error('❌ Gist 백업 실패:', error);
      throw error;
    }
  }

  // 자동 백업 시작 (5분 간격)
  public startAutoBackup(getAppState: () => AppState): void {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
    }
    
    // 5분마다 백업 (300000ms)
    this.backupInterval = setInterval(async () => {
      try {
        const appState = getAppState();
        if (appState.appUsage.length > 0) {
          await this.backupToGist(appState);
        }
      } catch (error) {
        console.error('❌ 자동 백업 실패:', error);
      }
    }, 300000);
    
    console.log('⏰ Gist 자동 백업 시작 (5분 간격)');
  }

  // 자동 백업 중지
  public stopAutoBackup(): void {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
    }
  }

  // 컴포넌트 언마운트 시 정리
  public cleanup(): void {
    this.stopAutoBackup();
  }
}