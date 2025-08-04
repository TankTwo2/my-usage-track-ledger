import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

const formatTime = (seconds) => {
    if (!seconds || seconds === 0) return '0분';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes === 0) return `${remainingSeconds}초`;
    if (remainingSeconds === 0) return `${minutes}분`;
    return `${minutes}분 ${remainingSeconds}초`;
};

const PlatformStats = ({ platform, stats, apps }) => {
    const platformNames = {
        windows: 'Windows',
        macos: 'macOS',
        android: 'Android',
    };

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

const TotalStats = ({ dailyStats, appUsage }) => {
    const filteredApps = appUsage?.filter((app) => app.total_usage_seconds > 0) || [];

    return (
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

            {filteredApps.length > 0 ? (
                <div className="app-usage-section">
                    <h3>앱별 사용량</h3>
                    <div className="usage-list">
                        {filteredApps.map((app, index) => (
                            <div key={index} className="usage-item">
                                <div className="app-name">{app.app_name}</div>
                                <div className="usage-time">{formatTime(app.total_usage_seconds)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="no-data">
                    <p>아직 사용량 데이터가 없습니다. 잠시 후 다시 확인해주세요.</p>
                </div>
            )}
        </section>
    );
};

function App() {
    const [state, setState] = useState({
        loading: true,
        isElectron: false,
        systemInfo: null,
        appUsage: [],
        dailyStats: null,
        platformStats: null,
        currentDateTime: new Date(),
    });

    const updateState = (updates) => setState((prev) => ({ ...prev, ...updates }));

    // 실시간 날짜/시간 업데이트
    useEffect(() => {
        const updateDateTime = () => {
            updateState({ currentDateTime: new Date() });
        };

        const interval = setInterval(updateDateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    const loadElectronData = useCallback(async () => {
        try {
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
        } catch (error) {
            console.error('데이터 로드 오류:', error);
        } finally {
            updateState({ loading: false });
        }
    }, []);

    const loadBrowserData = useCallback(() => {
        const today = new Date().toISOString().split('T')[0];
        const savedData = localStorage.getItem(`usage_${today}`);

        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                updateState({
                    systemInfo: {
                        message: '브라우저 모드',
                        platform: 'browser',
                    },
                    appUsage: data.appUsage || [],
                    dailyStats: data.dailyStats || {
                        total_apps: 0,
                        total_usage_seconds: 0,
                        date: today,
                    },
                    platformStats: {
                        windows: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
                        macos: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
                        android: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
                    },
                    loading: false,
                });
            } catch (error) {
                console.error('브라우저 데이터 로드 오류:', error);
                updateState({ loading: false });
            }
        } else {
            updateState({
                systemInfo: {
                    message: '브라우저 모드',
                    platform: 'browser',
                },
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
                loading: false,
            });
        }
    }, []);

    const updateBrowserData = useCallback(() => {
        const today = new Date().toISOString().split('T')[0];
        const savedData = localStorage.getItem(`usage_${today}`);

        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                const updatedData = {
                    appUsage: data.appUsage || [],
                    dailyStats: data.dailyStats || {
                        total_apps: 0,
                        total_usage_seconds: 0,
                        date: today,
                    },
                };

                updateState({
                    appUsage: updatedData.appUsage,
                    dailyStats: updatedData.dailyStats,
                });
                localStorage.setItem(`usage_${today}`, JSON.stringify(updatedData));
            } catch (error) {
                console.error('브라우저 데이터 업데이트 오류:', error);
            }
        }
    }, []);

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
    }, [loadElectronData, loadBrowserData, updateBrowserData]);

    if (state.loading) {
        return (
            <div className="App">
                <div className="loading">
                    <h2>앱 사용량 정보를 로딩 중...</h2>
                </div>
            </div>
        );
    }

    const formatCurrentDateTime = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${year}년 ${month}월 ${day}일 ${hours}:${minutes}:${seconds}`;
    };

    return (
        <div className="App">
            <header className="App-header">
                <h1>Usage Tracker</h1>
                <p>오늘의 앱 사용량 추적</p>
                <p className="current-time">{formatCurrentDateTime(state.currentDateTime)}</p>
                {!state.isElectron && (
                    <p style={{ color: 'orange', fontSize: '14px' }}>브라우저 모드 - Electron 앱에서 실행하세요</p>
                )}
            </header>

            <main className="App-main">
                {state.dailyStats && <TotalStats dailyStats={state.dailyStats} appUsage={state.appUsage} />}

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
