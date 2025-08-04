import React, { useState, useEffect } from 'react';
import './App.css';

// Electron API는 window.electronAPI를 통해 접근

function App() {
    const [systemInfo, setSystemInfo] = useState(null);
    const [appUsage, setAppUsage] = useState([]);
    const [dailyStats, setDailyStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadInitialData();

        // 실시간 업데이트 (5초마다)
        const interval = setInterval(() => {
            updateAppUsage();
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const loadInitialData = async () => {
        try {
            setLoading(true);

            // 시스템 정보 로드
            const sysInfo = await window.electronAPI.getSystemInfo();
            setSystemInfo(sysInfo);

            // 앱 사용량 로드
            const apps = await window.electronAPI.getAppUsage('today');
            setAppUsage(apps);

            // 일일 통계 로드
            const stats = await window.electronAPI.getDailyStats('today');
            setDailyStats(stats);
        } catch (error) {
            console.error('데이터 로드 오류:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateAppUsage = async () => {
        try {
            const apps = await window.electronAPI.getAppUsage('today');
            setAppUsage(apps);

            const stats = await window.electronAPI.getDailyStats('today');
            setDailyStats(stats);
        } catch (error) {
            console.error('앱 사용량 업데이트 오류:', error);
        }
    };

    if (loading) {
        return (
            <div className="App">
                <div className="loading">
                    <h2>앱 사용량 정보를 로딩 중...</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="App">
            <header className="App-header">
                <h1>Usage Tracker</h1>
                <p>앱 사용량 모니터링</p>
            </header>

            <main className="App-main">
                {/* 시스템 정보 */}
                {systemInfo && (
                    <section className="system-info">
                        <h2>시스템 정보</h2>
                        <div className="info-grid">
                            <div className="info-item">
                                <strong>모드:</strong> {systemInfo.message}
                            </div>
                            <div className="info-item">
                                <strong>시작 시간:</strong> {new Date(systemInfo.timestamp).toLocaleString()}
                            </div>
                        </div>
                    </section>
                )}

                {/* 오늘 통계 */}
                {dailyStats && (
                    <section className="daily-stats">
                        <h2>오늘 통계</h2>
                        <div className="stats-grid">
                            <div className="stat-card">
                                <h3>사용한 앱 수</h3>
                                <div className="stat-value">{dailyStats.total_apps || 0}개</div>
                            </div>
                            <div className="stat-card">
                                <h3>총 사용 횟수</h3>
                                <div className="stat-value">{dailyStats.total_usage_time || 0}회</div>
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

                {/* 사용 안내 */}
                <section className="usage-guide">
                    <h2>사용 안내</h2>
                    <div className="guide-content">
                        <p>• 5초마다 자동으로 앱 사용량을 추적합니다</p>
                        <p>• Chrome, Safari, VS Code 등 주요 앱을 자동 감지합니다</p>
                        <p>• 데이터는 로컬에 안전하게 저장됩니다</p>
                    </div>
                </section>
            </main>
        </div>
    );
}

export default App;
