const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload 스크립트가 로드되었습니다.');

// 렌더러 프로세스에서 사용할 API 노출
contextBridge.exposeInMainWorld('electronAPI', {
    getSystemInfo: () => ipcRenderer.invoke('getSystemInfo'),
    getAppUsage: (period, platform) => ipcRenderer.invoke('getAppUsage', period, platform),
    getDailyStats: (period, platform) => ipcRenderer.invoke('getDailyStats', period, platform),
    sendUsageData: (usageData) => ipcRenderer.invoke('sendUsageData', usageData),
    on: (channel, callback) => {
        console.log(`이벤트 리스너 등록: ${channel}`);
        const wrappedCallback = (event, ...args) => callback(...args);
        ipcRenderer.on(channel, wrappedCallback);
        return wrappedCallback; // cleanup을 위해 반환
    },
    off: (channel, callback) => {
        console.log(`이벤트 리스너 해제: ${channel}`);
        if (callback) {
            ipcRenderer.removeListener(channel, callback);
        } else {
            ipcRenderer.removeAllListeners(channel);
        }
    },
});

console.log('electronAPI가 노출되었습니다.');
