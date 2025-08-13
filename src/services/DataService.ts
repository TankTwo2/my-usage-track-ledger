import { CompressedData, AppState } from '../types';

export class DataService {
  // 데이터 압축/해제 함수들
  public static compressData(data: CompressedData): string | null {
    try {
      return btoa(JSON.stringify(data));
    } catch (error) {
      console.error('데이터 압축 오류:', error);
      return null;
    }
  }

  public static decompressData(compressedData: string): CompressedData | null {
    try {
      return JSON.parse(atob(compressedData));
    } catch (error) {
      console.error('데이터 해제 오류:', error);
      return null;
    }
  }

  public static loadDataFromURL(): CompressedData | null {
    const urlParams = new URLSearchParams(window.location.search);
    const dataParam = urlParams.get('data');

    if (dataParam) {
      const decompressed = this.decompressData(dataParam);
      if (decompressed) {
        return decompressed;
      }
    }
    return null;
  }

  // URL에서 Gist ID 추출
  public static loadGistIdFromURL(): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('gist');
  }

  // URL의 Gist ID로부터 데이터 로드
  public static async loadGistDataFromURL(): Promise<CompressedData | null> {
    const gistId = this.loadGistIdFromURL();
    if (!gistId) {
      return null;
    }

    try {
      console.log(`🔄 URL에서 Gist ID 감지: ${gistId}, 데이터 로드 시도...`);
      
      // 공개 Gist API 호출 (토큰 없이)
      const response = await fetch(`https://api.github.com/gists/${gistId}`);
      
      if (!response.ok) {
        throw new Error(`GitHub API Error: ${response.status}`);
      }

      const gist = await response.json();
      const fileContent = gist.files['usage-data.json']?.content;
      
      if (!fileContent) {
        throw new Error('usage-data.json 파일을 찾을 수 없습니다');
      }

      const structuredData = JSON.parse(fileContent);
      
      // 구조화된 데이터에서 오늘 날짜 추출
      const today = new Date().toISOString().split('T')[0];
      const todayData = structuredData[today];
      
      if (todayData && 'appUsage' in todayData) {
        console.log(`✅ URL Gist에서 오늘(${today}) 데이터 로드 성공`);
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
        console.log(`📋 URL Gist에 오늘(${today}) 데이터 없음`);
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
    } catch (error) {
      console.error('❌ URL Gist 데이터 로드 실패:', error);
      return null;
    }
  }

  public static saveDataToURL(data: CompressedData): string | null {
    const compressed = this.compressData(data);
    if (compressed) {
      const newURL = `${window.location.origin}${window.location.pathname}?data=${compressed}`;
      window.history.pushState({}, '', newURL);
      return newURL;
    }
    return null;
  }

  // 초기 상태 생성
  public static createInitialState(): Partial<AppState> {
    const today = new Date().toISOString().split('T')[0];
    
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
      },
    };
  }

  // 전자 API 확인
  public static checkElectronAPI(): boolean {
    const electronAPI = (window as any).electronAPI;
    console.log('Electron API 확인 중...');
    console.log('window.electronAPI:', electronAPI);
    
    if (electronAPI) {
      console.log('electronAPI 함수들:', Object.keys(electronAPI));
      console.log('sendUsageData:', typeof electronAPI.sendUsageData);
      console.log('on:', typeof electronAPI.on);
    }
    
    return (
      electronAPI &&
      typeof electronAPI.sendUsageData === 'function' &&
      typeof electronAPI.on === 'function'
    );
  }
}