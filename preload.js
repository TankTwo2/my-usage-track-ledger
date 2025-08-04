const { contextBridge, ipcRenderer } = require('electron');

// 렌더러 프로세스에서 사용할 수 있는 API를 노출
contextBridge.exposeInMainWorld('electronAPI', {
    // 시스템 정보 관련
    getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
    getCpuUsage: () => ipcRenderer.invoke('get-cpu-usage'),
    getMemoryUsage: () => ipcRenderer.invoke('get-memory-usage'),
    
    // 사용량 통계 관련
    getUsageStats: (period) => ipcRenderer.invoke('get-usage-stats', period),
    getAppUsage: (period) => ipcRenderer.invoke('get-app-usage', period),
}); 