import React, { useState, useEffect } from 'react';
import './App.css';

const formatTime = (seconds) => {
    if (!seconds) return '0분';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes === 0
        ? `${remainingSeconds}초`
        : remainingSeconds === 0
        ? `${minutes}분`
        : `${minutes}분 ${remainingSeconds}초`;
};

const NoDataMessage = () => <div className="no-data">아직 사용량 데이터가 없습니다. 잠시 후 다시 확인해주세요.</div>;

const AppUsageSection = ({ appUsage }) => {
    const filteredApps = appUsage?.filter((app) => app.total_usage_seconds > 0) || [];

    return (
        <section className="app-usage">
            <h2>앱 사용량</h2>
            <div className="usage-list">
                {filteredApps.length > 0 ? (
                    filteredApps.map((app, index) => (
                        <div key={index} className="usage-item">
                            <div className="app-name">{app.app_name}</div>
                            <div className="usage-time">{formatTime(app.total_usage_seconds)}</div>
                        </div>
                    ))
                ) : (
                    <NoDataMessage />
                )}
            </div>
        </section>
    );
};

const PlatformStats = ({ platform, stats, apps }) => {
    const platformNames = {
        windows: 'Windows',
        macos: 'macOS',
        android: 'Android',
    };

    console.log(`PlatformStats ${platform}:`, { stats, apps });

    return (
        <section className="platform-stats">
            <h3>{platformNames[platform] || platform}</h3>
            <div className="stats-grid">
                <div className="stat-card">
                    <h4>사용한 앱 수</h4>
                    <div className="stat-value">{stats?.total_apps || 0}개</div>
                </div>
                <div className="stat-card">
                    <h4>총 사용 시간</h4>
                    <div className="stat-value">{formatTime(stats?.total_usage_seconds || 0)}</div>
                </div>
            </div>
            {apps && apps.length > 0 && (
                <div className="usage-list">
                    {apps.slice(0, 5).map((app, index) => (
                        <div key={index} className="usage-item">
                            <div className="app-name">{app.app_name}</div>
                            <div className="usage-time">{formatTime(app.total_usage_seconds)}</div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
};

const TotalStats = ({ dailyStats }) => (
    <section className="total-stats">
        <h2>전체 통계</h2>
        <div className="stats-grid">
            <div className="stat-card">
                <h3>사용한 앱 수</h3>
                <div className="stat-value">{dailyStats?.total_apps || 0}개</div>
            </div>
            <div className="stat-card">
                <h3>총 사용 시간</h3>
                <div className="stat-value">{formatTime(dailyStats?.total_usage_seconds || 0)}</div>
            </div>
        </div>
    </section>
);

function App() {
    const [state, setState] = useState({
        systemInfo: null,
        appUsage: [],
        dailyStats: null,
        loading: true,
        isElectron: false,
    });

    const updateState = (updates) => setState((prev) => ({ ...prev, ...updates }));

    const loadElectronData = async () => {
        try {
            if (!window.electronAPI) {
                console.error('electronAPI가 정의되지 않았습니다.');
                return;
            }

            // 모든 플랫폼의 데이터를 병렬로 로드
            const [
                sysInfo,
                allApps,
                allStats,
                windowsApps,
                windowsStats,
                macosApps,
                macosStats,
                androidApps,
                androidStats,
            ] = await Promise.all([
                window.electronAPI.getSystemInfo(),
                window.electronAPI.getAppUsage('today', null), // 전체 데이터
                window.electronAPI.getDailyStats('today', null), // 전체 통계
                window.electronAPI.getAppUsage('today', 'windows'),
                window.electronAPI.getDailyStats('today', 'windows'),
                window.electronAPI.getAppUsage('today', 'macos'),
                window.electronAPI.getDailyStats('today', 'macos'),
                window.electronAPI.getAppUsage('today', 'android'),
                window.electronAPI.getDailyStats('today', 'android'),
            ]);

            updateState({
                systemInfo: sysInfo,
                appUsage: allApps,
                dailyStats: allStats,
                platformStats: {
                    windows: { apps: windowsApps, stats: windowsStats },
                    macos: { apps: macosApps, stats: macosStats },
                    android: { apps: androidApps, stats: androidStats },
                },
            });

            console.log('로드된 플랫폼별 데이터:', {
                windows: { apps: windowsApps, stats: windowsStats },
                macos: { apps: macosApps, stats: macosStats },
                android: { apps: androidApps, stats: androidStats },
            });
        } catch (error) {
            console.error('데이터 로드 오류:', error);
        } finally {
            updateState({ loading: false });
        }
    };

    const loadBrowserData = () => {
        const today = new Date().toISOString().split('T')[0];
        const storedData = localStorage.getItem(`usage_${today}`);

        if (storedData) {
            const data = JSON.parse(storedData);
            updateState({
                systemInfo: data.systemInfo,
                appUsage: data.appUsage,
                dailyStats: data.dailyStats,
                loading: false,
            });
        } else {
            const initialData = {
                systemInfo: {
                    message: '개발 모드 (브라우저)',
                    platform: 'browser',
                    arch: 'web',
                    hostname: 'localhost',
                    uptime: 0,
                },
                appUsage: [],
                dailyStats: { total_apps: 0, total_usage_seconds: 0, date: today },
            };

            updateState({
                systemInfo: initialData.systemInfo,
                appUsage: initialData.appUsage,
                dailyStats: initialData.dailyStats,
                loading: false,
            });
            localStorage.setItem(`usage_${today}`, JSON.stringify(initialData));
        }
    };

    const updateBrowserData = () => {
        const today = new Date().toISOString().split('T')[0];
        const storedData = localStorage.getItem(`usage_${today}`);

        if (storedData) {
            const data = JSON.parse(storedData);
            const updatedAppUsage = data.appUsage.map((app) => ({
                ...app,
                total_usage_seconds: app.total_usage_seconds + 5,
            }));
            const totalUsageSeconds = updatedAppUsage.reduce((sum, app) => sum + app.total_usage_seconds, 0);

            const updatedData = {
                ...data,
                appUsage: updatedAppUsage,
                dailyStats: { ...data.dailyStats, total_usage_seconds: totalUsageSeconds },
            };

            updateState({
                appUsage: updatedAppUsage,
                dailyStats: updatedData.dailyStats,
            });
            localStorage.setItem(`usage_${today}`, JSON.stringify(updatedData));
        }
    };

    useEffect(() => {
        const electronAvailable = window.electronAPI !== undefined;
        updateState({ isElectron: electronAvailable });

        if (electronAvailable) {
            loadElectronData();
        } else {
            loadBrowserData();
        }

        const interval = setInterval(() => {
            electronAvailable ? loadElectronData() : updateBrowserData();
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    if (state.loading) {
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
                {!state.isElectron && (
                    <p style={{ color: 'orange', fontSize: '14px' }}>브라우저 모드 - Electron 앱에서 실행하세요</p>
                )}
            </header>

            <main className="App-main">
                {state.systemInfo && (
                    <section className="system-info">
                        <h2>시스템 정보</h2>
                        <div className="info-grid">
                            <div className="info-item">
                                <strong>상태:</strong> {state.systemInfo.message}
                            </div>
                            <div className="info-item">
                                <strong>플랫폼:</strong> {state.systemInfo.platform}
                            </div>
                        </div>
                    </section>
                )}

                {state.dailyStats && <TotalStats dailyStats={state.dailyStats} />}

                {state.platformStats && (
                    <section className="platform-overview">
                        <h2>플랫폼별 통계</h2>
                        <div className="platform-grid">
                            <PlatformStats
                                platform="windows"
                                stats={state.platformStats.windows.stats}
                                apps={state.platformStats.windows.apps}
                            />
                            <PlatformStats
                                platform="macos"
                                stats={state.platformStats.macos.stats}
                                apps={state.platformStats.macos.apps}
                            />
                            <PlatformStats
                                platform="android"
                                stats={state.platformStats.android.stats}
                                apps={state.platformStats.android.apps}
                            />
                        </div>
                    </section>
                )}

                <AppUsageSection appUsage={state.appUsage} />

                <section className="usage-guide">
                    <h2>사용 안내</h2>
                    <div className="guide-content">
                        <p>• 5초마다 자동으로 앱 사용량을 추적합니다</p>
                        <p>• Windows, macOS, Android 플랫폼별로 통계를 제공합니다</p>
                        <p>• 데이터는 로컬에 안전하게 저장됩니다</p>
                    </div>
                </section>
            </main>
        </div>
    );
}

export default App;
