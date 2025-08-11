"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataService = void 0;
class DataService {
    // 데이터 압축/해제 함수들
    static compressData(data) {
        try {
            return btoa(JSON.stringify(data));
        }
        catch (error) {
            console.error('데이터 압축 오류:', error);
            return null;
        }
    }
    static decompressData(compressedData) {
        try {
            return JSON.parse(atob(compressedData));
        }
        catch (error) {
            console.error('데이터 해제 오류:', error);
            return null;
        }
    }
    static loadDataFromURL() {
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
    static saveDataToURL(data) {
        const compressed = this.compressData(data);
        if (compressed) {
            const newURL = `${window.location.origin}${window.location.pathname}?data=${compressed}`;
            window.history.pushState({}, '', newURL);
            return newURL;
        }
        return null;
    }
    // 초기 상태 생성
    static createInitialState() {
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
    static checkElectronAPI() {
        const electronAPI = window.electronAPI;
        console.log('Electron API 확인 중...');
        console.log('window.electronAPI:', electronAPI);
        if (electronAPI) {
            console.log('electronAPI 함수들:', Object.keys(electronAPI));
            console.log('sendUsageData:', typeof electronAPI.sendUsageData);
            console.log('on:', typeof electronAPI.on);
        }
        return (electronAPI &&
            typeof electronAPI.sendUsageData === 'function' &&
            typeof electronAPI.on === 'function');
    }
}
exports.DataService = DataService;
