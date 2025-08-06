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