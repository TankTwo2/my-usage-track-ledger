import React, { useState, useEffect } from 'react';
import './App.css';

// Electron API는 window.electronAPI를 통해 접근

function App() {
    const [systemInfo, setSystemInfo] = useState(null);
    const [usageStats, setUsageStats] = useState(null);
    const [appUsage, setAppUsage] = useState([]);
    const [currentCpu, setCurrentCpu] = useState(0);
    const [currentMemory, setCurrentMemory] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadInitialData();

        // 실시간 업데이트 (5초마다)
        const interval = setInterval(() => {
            updateCurrentStats();
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const loadInitialData = async () => {
        try {
            setLoading(true);

            // 시스템 정보 로드
            const sysInfo = await window.electronAPI.getSystemInfo();
            setSystemInfo(sysInfo);

            // 사용량 통계 로드
            const stats = await window.electronAPI.getUsageStats('today');
            setUsageStats(stats);

            // 앱 사용량 로드
            const apps = await window.electronAPI.getAppUsage('today');
            setAppUsage(apps);

            // 현재 CPU/메모리 사용률
            await updateCurrentStats();
        } catch (error) {
            console.error('데이터 로드 오류:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateCurrentStats = async () => {
        try {
            const cpu = await window.electronAPI.getCpuUsage();
            const memory = await window.electronAPI.getMemoryUsage();

            setCurrentCpu(cpu.load);
            setCurrentMemory(memory.usagePercent);
        } catch (error) {
            console.error('실시간 통계 업데이트 오류:', error);
        }
    };

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (loading) {
        return (
            <div className="App">
                <div className="loading">
                    <h2>시스템 정보를 로딩 중...</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="App">
            <header className="App-header">
                <h1>Usage Tracker</h1>
                <p>시스템 사용량 모니터링</p>
            </header>

            <main className="App-main">
                {/* 실시간 시스템 상태 */}
                <section className="realtime-stats">
                    <h2>실시간 시스템 상태</h2>
                    <div className="stats-grid">
                        <div className="stat-card">
                            <h3>CPU 사용률</h3>
                            <div className="stat-value">{currentCpu.toFixed(1)}%</div>
                            <div className="stat-bar">
                                <div className="stat-bar-fill" style={{ width: `${currentCpu}%` }}></div>
                            </div>
                        </div>

                        <div className="stat-card">
                            <h3>메모리 사용률</h3>
                            <div className="stat-value">{currentMemory.toFixed(1)}%</div>
                            <div className="stat-bar">
                                <div className="stat-bar-fill" style={{ width: `${currentMemory}%` }}></div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 시스템 정보 */}
                {systemInfo && (
                    <section className="system-info">
                        <h2>시스템 정보</h2>
                        <div className="info-grid">
                            <div className="info-item">
                                <strong>OS:</strong> {systemInfo.os?.platform} {systemInfo.os?.release}
                            </div>
                            <div className="info-item">
                                <strong>CPU:</strong> {systemInfo.cpu?.brand} ({systemInfo.cpu?.cores} cores)
                            </div>
                            <div className="info-item">
                                <strong>메모리:</strong> {formatBytes(systemInfo.memory?.total)}
                            </div>
                        </div>
                    </section>
                )}

                {/* 오늘 통계 */}
                {usageStats && (
                    <section className="daily-stats">
                        <h2>오늘 통계</h2>
                        <div className="stats-grid">
                            <div className="stat-card">
                                <h3>평균 CPU</h3>
                                <div className="stat-value">{usageStats.avg_cpu?.toFixed(1) || 0}%</div>
                            </div>
                            <div className="stat-card">
                                <h3>최대 CPU</h3>
                                <div className="stat-value">{usageStats.max_cpu?.toFixed(1) || 0}%</div>
                            </div>
                            <div className="stat-card">
                                <h3>평균 메모리</h3>
                                <div className="stat-value">{usageStats.avg_memory?.toFixed(1) || 0}%</div>
                            </div>
                            <div className="stat-card">
                                <h3>데이터 포인트</h3>
                                <div className="stat-value">{usageStats.data_points || 0}</div>
                            </div>
                        </div>
                    </section>
                )}

                {/* 앱 사용량 */}
                {appUsage.length > 0 && (
                    <section className="app-usage">
                        <h2>앱 사용량 (오늘)</h2>
                        <div className="app-list">
                            {appUsage.map((app, index) => (
                                <div key={index} className="app-item">
                                    <div className="app-name">{app.app_name}</div>
                                    <div className="app-usage-count">{app.total_usage}회</div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}

export default App;
