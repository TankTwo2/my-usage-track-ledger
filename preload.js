const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload 스크립트가 로드되었습니다.');

// 렌더러 프로세스에서 사용할 API 노출
contextBridge.exposeInMainWorld('electronAPI', {
    // 시스템 정보
    getSystemInfo: () => {
        console.log('getSystemInfo 호출됨');
        return ipcRenderer.invoke('getSystemInfo');
    },

    // 앱 사용량 (플랫폼별)
    getAppUsage: (period, platform) => {
        console.log('getAppUsage 호출됨:', period, platform);
        return ipcRenderer.invoke('getAppUsage', period, platform);
    },

    // 일일 통계 (플랫폼별)
    getDailyStats: (period, platform) => {
        console.log('getDailyStats 호출됨:', period, platform);
        return ipcRenderer.invoke('getDailyStats', period, platform);
    },

    // 설정 관리
    getSetting: (key) => ipcRenderer.invoke('get-setting', key),
    setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),

    // 데이터 내보내기
    exportData: (format) => ipcRenderer.invoke('export-data', format),

    // 앱 제어
    minimize: () => ipcRenderer.invoke('minimize-window'),
    maximize: () => ipcRenderer.invoke('maximize-window'),
    close: () => ipcRenderer.invoke('close-window'),

    // 이벤트 리스너
    on: (channel, callback) => {
        ipcRenderer.on(channel, (event, ...args) => callback(...args));
    },

    off: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    },
});

console.log('electronAPI가 노출되었습니다.');
