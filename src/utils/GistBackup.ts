import { BackupData, DailyData, StructuredGistData } from '../types';

interface GistResponse {
  id: string;
  files: {
    [key: string]: {
      content: string;
    };
  };
}

export class GistBackup {
  private githubToken: string;
  private gistId: string | null;
  private apiBase = 'https://api.github.com';

  constructor(githubToken: string, gistId: string | null = null) {
    this.githubToken = githubToken;
    this.gistId = gistId;
  }

  // 새로운 Gist 생성 (날짜별 구조화된 데이터)
  public async createGist(dailyData: DailyData): Promise<GistResponse> {
    try {
      const today = dailyData.date;
      const structuredData: StructuredGistData = {
        [today]: dailyData,
        metadata: {
          lastUpdated: new Date().toISOString(),
          totalDays: 1,
          oldestDate: today,
          newestDate: today
        }
      };

      const response = await fetch(`${this.apiBase}/gists`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${this.githubToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: 'Usage Tracker Data Backup (Structured)',
          public: false,
          files: {
            'usage-data.json': {
              content: JSON.stringify(structuredData, null, 2)
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`GitHub API Error: ${response.status}`);
      }

      const gist: GistResponse = await response.json();
      this.gistId = gist.id;
      console.log('✅ 새로운 구조화된 Gist 생성 완료:', this.gistId);
      return gist;
    } catch (error) {
      console.error('❌ Gist 생성 실패:', error);
      throw error;
    }
  }

  // 기존 Gist 업데이트 (날짜별 구조에 특정 날짜 데이터 추가/업데이트)
  public async updateGist(dailyData: DailyData): Promise<GistResponse> {
    if (!this.gistId) {
      throw new Error('Gist ID가 설정되지 않음');
    }

    try {
      // 먼저 기존 데이터를 가져온다
      const existingData = await this.loadStructuredData();
      
      const today = dailyData.date;
      
      // 새로운 데이터로 업데이트
      existingData[today] = dailyData;
      
      // 메타데이터 업데이트
      const dates = Object.keys(existingData).filter(key => key !== 'metadata').sort();
      existingData.metadata = {
        lastUpdated: new Date().toISOString(),
        totalDays: dates.length,
        oldestDate: dates[0],
        newestDate: dates[dates.length - 1]
      };

      const response = await fetch(`${this.apiBase}/gists/${this.gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${this.githubToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: {
            'usage-data.json': {
              content: JSON.stringify(existingData, null, 2)
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`GitHub API Error: ${response.status}`);
      }

      const gist: GistResponse = await response.json();
      console.log(`✅ Gist 업데이트 완료 (${today} 데이터):`, this.gistId);
      return gist;
    } catch (error) {
      console.error('❌ Gist 업데이트 실패:', error);
      throw error;
    }
  }

  // Gist에서 구조화된 데이터 로드
  public async loadStructuredData(): Promise<StructuredGistData> {
    if (!this.gistId) {
      throw new Error('Gist ID가 설정되지 않음');
    }

    try {
      const response = await fetch(`${this.apiBase}/gists/${this.gistId}`, {
        headers: {
          'Authorization': `token ${this.githubToken}`,
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API Error: ${response.status}`);
      }

      const gist: GistResponse = await response.json();
      const fileContent = gist.files['usage-data.json'].content;
      const data: StructuredGistData = JSON.parse(fileContent);
      
      console.log('✅ Gist에서 구조화된 데이터 로드 완료');
      return data;
    } catch (error) {
      console.error('❌ Gist 구조화된 데이터 로드 실패:', error);
      throw error;
    }
  }

  // 기존 호환성을 위한 메서드 (BackupData 형태로 반환)
  public async loadFromGist(): Promise<BackupData> {
    try {
      const structuredData = await this.loadStructuredData();
      
      // 모든 날짜의 데이터를 하나로 병합하여 BackupData 형태로 반환
      const allAppUsage: any[] = [];
      let totalUsageSeconds = 0;
      let totalApps = 0;
      
      const platformStats = {
        windows: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
        macos: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
        android: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } }
      };

      // 모든 날짜의 데이터를 병합
      Object.keys(structuredData).forEach(dateKey => {
        if (dateKey === 'metadata') return;
        
        const dailyData = structuredData[dateKey];
        // Type guard: DailyData인지 확인
        if ('appUsage' in dailyData && 'dailyStats' in dailyData) {
          allAppUsage.push(...dailyData.appUsage);
          totalUsageSeconds += dailyData.dailyStats.total_usage_seconds;
        }
      });

      // 앱별로 중복 제거 및 병합
      const appMap = new Map();
      allAppUsage.forEach(app => {
        const key = `${app.app_name}_${app.platform}`;
        if (appMap.has(key)) {
          const existing = appMap.get(key);
          existing.total_usage_seconds += app.total_usage_seconds;
          existing.lastUpdated = app.lastUpdated > existing.lastUpdated ? app.lastUpdated : existing.lastUpdated;
        } else {
          appMap.set(key, { ...app });
        }
      });

      const mergedApps = Array.from(appMap.values());
      totalApps = mergedApps.length;

      // 플랫폼별 통계 재계산
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

      console.log('✅ Gist에서 병합된 데이터 로드 완료');
      return {
        appUsage: mergedApps,
        dailyStats: {
          total_apps: totalApps,
          total_usage_seconds: totalUsageSeconds,
          date: new Date().toISOString().split('T')[0]
        },
        platformStats,
        backupTimestamp: structuredData.metadata.lastUpdated
      };
    } catch (error) {
      console.error('❌ Gist 데이터 로드 실패:', error);
      throw error;
    }
  }

  // 백업 실행 (생성 또는 업데이트) - 새로운 DailyData 구조용
  public async backupDaily(dailyData: DailyData): Promise<GistResponse> {
    try {
      if (this.gistId) {
        return await this.updateGist(dailyData);
      } else {
        return await this.createGist(dailyData);
      }
    } catch (error) {
      console.error('❌ 일별 백업 실패:', error);
      throw error;
    }
  }

  // 기존 호환성을 위한 메서드 (BackupData를 DailyData로 변환)
  public async backup(data: BackupData): Promise<GistResponse> {
    try {
      // BackupData를 DailyData로 변환
      const dailyData: DailyData = {
        date: data.dailyStats?.date || new Date().toISOString().split('T')[0],
        appUsage: data.appUsage || [],
        dailyStats: data.dailyStats || {
          total_apps: 0,
          total_usage_seconds: 0,
          date: new Date().toISOString().split('T')[0]
        },
        platformStats: data.platformStats || {
          windows: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
          macos: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
          android: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } }
        },
        createdAt: new Date().toISOString(),
        lastUpdated: data.backupTimestamp || new Date().toISOString()
      };

      return await this.backupDaily(dailyData);
    } catch (error) {
      console.error('❌ 백업 실패:', error);
      throw error;
    }
  }
}