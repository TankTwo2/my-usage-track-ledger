import { GistBackup } from '../utils/GistBackup';
import { AppState, CompressedData } from '../types';

export class GistService {
  private gistBackup: GistBackup;
  private backupInterval: NodeJS.Timeout | null = null;

  constructor(githubToken: string, gistId: string) {
    this.gistBackup = new GistBackup(githubToken, gistId);
  }

  // Gist에서 데이터 복원 (구조화된 데이터에서 오늘 날짜만)
  public async restoreFromGist(): Promise<CompressedData | null> {
    try {
      console.log('🔄 웹 UI: 구조화된 Gist에서 데이터 복원 시도...');
      
      // 1. 구조화된 데이터 로드 시도
      try {
        const structuredData = await this.gistBackup.loadStructuredData();
        const today = new Date().toISOString().split('T')[0];
        const todayData = structuredData[today];
        
        if (todayData && 'appUsage' in todayData) {
          console.log(`✅ 웹 UI: 구조화된 Gist에서 오늘(${today}) 데이터 로드 성공`);
          return {
            appUsage: todayData.appUsage || [],
            dailyStats: todayData.dailyStats || {
              total_apps: 0,
              total_usage_seconds: 0,
              date: today,
            },
            platformStats: todayData.platformStats || {
              windows: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
              macos: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
              android: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
            }
          };
        } else {
          console.log(`📋 웹 UI: 구조화된 Gist에 오늘(${today}) 데이터 없음`);
          return {
            appUsage: [],
            dailyStats: {
              total_apps: 0,
              total_usage_seconds: 0,
              date: today,
            },
            platformStats: {
              windows: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
              macos: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
              android: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
            }
          };
        }
      } catch (structuredError) {
        console.log('⚠️ 웹 UI: 구조화된 데이터 로드 실패, 기존 방식으로 폴백:', structuredError);
        
        // 2. 기존 방식으로 폴백 (하위 호환성)
        const restoredData = await this.gistBackup.loadFromGist();
        console.log('✅ 웹 UI: 기존 방식으로 데이터 로드 성공');
        
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
      }
    } catch (error) {
      console.error('❌ 웹 UI: Gist 복원 완전 실패:', error);
      throw error;
    }
  }

  // Gist에 데이터 백업 (구조화된 형태로)
  public async backupToGist(appState: AppState): Promise<void> {
    try {
      console.log('🔄 웹 UI: 구조화된 형태로 Gist 백업 시도...');
      
      // AppState를 DailyData 형태로 변환
      const today = new Date().toISOString().split('T')[0];
      const dailyData = {
        date: today,
        appUsage: appState.appUsage || [],
        dailyStats: appState.dailyStats || {
          total_apps: 0,
          total_usage_seconds: 0,
          date: today
        },
        platformStats: appState.platformStats || {
          windows: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
          macos: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
          android: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } }
        },
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      // 구조화된 백업 방식 사용
      const gist = await this.gistBackup.backupDaily(dailyData);
      
      // 새로 생성된 Gist ID 출력 (코드에 복사해서 하드코딩)
      if (gist.id && !this.gistBackup['gistId']) {
        console.log('🔥 생성된 Gist ID (코드에 하드코딩하세요):', gist.id);
        alert(`생성된 Gist ID: ${gist.id}\n코드에서 GIST_ID 값을 이것으로 변경하세요!`);
      }

      console.log('🎉 웹 UI: 구조화된 Gist 백업 성공');
    } catch (error) {
      console.error('❌ 웹 UI: Gist 백업 실패:', error);
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