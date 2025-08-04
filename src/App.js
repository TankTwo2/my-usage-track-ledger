import React, { useState, useEffect } from 'react';
import './App.css';

// Electron API는 window.electronAPI를 통해 접근

// 초를 분:초 형식으로 변환하는 함수
const formatTime = (seconds) => {
    if (!seconds) return '0분';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes === 0) {
        return `${remainingSeconds}초`;
    } else if (remainingSeconds === 0) {
        return `${minutes}분`;
    } else {
        return `${minutes}분 ${remainingSeconds}초`;
    }
};

function App() {
    const [systemInfo, setSystemInfo] = useState(null);
    const [appUsage, setAppUsage] = useState([]);
    const [dailyStats, setDailyStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isElectron, setIsElectron] = useState(false);

    useEffect(() => {
        // Electron 환경인지 확인
        const electronAvailable = !!window.electronAPI;
        setIsElectron(electronAvailable);
        console.log('Electron 환경:', electronAvailable);

        if (electronAvailable) {
            loadInitialData();
        } else {
            // 브라우저 환경에서는 테스트 데이터 표시
            setSystemInfo({
                message: '개발 모드 (브라우저)',
                timestamp: new Date().toISOString(),
                platform: 'browser',
                arch: 'web',
                hostname: 'localhost',
                uptime: 0,
            });
            setAppUsage([
                { app_name: 'Chrome', total_usage_seconds: 900 }, // 15분
                { app_name: 'Safari', total_usage_seconds: 480 }, // 8분
                { app_name: 'VS Code', total_usage_seconds: 720 }, // 12분
                { app_name: 'Terminal', total_usage_seconds: 300 }, // 5분
            ]);
            setDailyStats({
                total_apps: 4,
                total_usage_seconds: 2400, // 40분
                date: new Date().toISOString().split('T')[0],
            });
            setLoading(false);
        }

        // 실시간 업데이트 (5초마다)
        const interval = setInterval(() => {
            if (electronAvailable) {
                updateAppUsage();
            }
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const loadInitialData = async () => {
        try {
            setLoading(true);

            // window.electronAPI가 정의되지 않았을 때를 대비
            if (!window.electronAPI) {
                console.error('electronAPI가 정의되지 않았습니다.');
                setLoading(false);
                return;
            }

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
            if (!window.electronAPI) {
                return;
            }

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
                {!isElectron && (
                    <p style={{ color: 'orange', fontSize: '14px' }}>브라우저 모드 - Electron 앱에서 실행하세요</p>
                )}
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
                                <h3>총 사용 시간</h3>
                                <div className="stat-value">{formatTime(dailyStats.total_usage_seconds || 0)}</div>
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
                                    <div className="app-usage-count">{formatTime(app.total_usage_seconds || 0)}</div>
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
