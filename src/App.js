import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import TotalStats from './components/TotalStats';
import PlatformStats from './components/PlatformStats';
import { loadDataFromURL, saveDataToURL } from './utils/dataCompression';

function App() {
    const [state, setState] = useState({
        loading: true,
        isElectron: false,
        appUsage: [],
        dailyStats: null,
        platformStats: null,
        currentDateTime: new Date(),
    });

    const updateState = (updates) => setState((prev) => ({ ...prev, ...updates }));
    const lastProcessedTimestamp = useRef(null);

    // Electron API 확인 함수
    const checkElectronAPI = () => {
        console.log('Electron API 확인 중...');
        console.log('window.electronAPI:', window.electronAPI);
        if (window.electronAPI) {
            console.log('electronAPI 함수들:', Object.keys(window.electronAPI));
            console.log('sendUsageData:', typeof window.electronAPI.sendUsageData);
            console.log('on:', typeof window.electronAPI.on);
        }
        return (
            window.electronAPI &&
            typeof window.electronAPI.sendUsageData === 'function' &&
            typeof window.electronAPI.on === 'function'
        );
    };

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
            // Electron에서 실제 데이터를 가져오는 대신 URL에서 로드
            const urlData = loadDataFromURL();
            if (!urlData) {
                // 초기 빈 데이터 설정
                const initialData = {
                    appUsage: [],
                    dailyStats: {
                        total_apps: 0,
                        total_usage_seconds: 0,
                        date: new Date().toISOString().split('T')[0],
                    },
                    platformStats: {
                        windows: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
                        macos: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
                        android: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
                    },
                };
                updateState(initialData);
                saveDataToURL(initialData);
            }
        } catch (error) {
            console.error('데이터 로드 오류:', error);
        } finally {
            updateState({ loading: false });
        }
    }, []);

    const loadBrowserData = useCallback(() => {
        const today = new Date().toISOString().split('T')[0];

        updateState({
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
    }, []);

    // 사용량 데이터 처리 함수를 useRef로 관리
    const handleUsageUpdate = useCallback((usageData) => {
        console.log('🔥 handleUsageUpdate 호출됨:', usageData);
        console.log('🔥 호출 스택:', new Error().stack);
        
        // 중복 처리 방지: 같은 타임스탬프의 데이터는 무시
        if (lastProcessedTimestamp.current === usageData.timestamp) {
            console.log('❌ 중복된 타임스탬프 데이터 무시:', usageData.timestamp);
            return;
        }
        lastProcessedTimestamp.current = usageData.timestamp;
        console.log('✅ 데이터 처리 진행:', usageData.timestamp);

        setState((prev) => {
            console.log('setState 콜백 실행 - 이전 상태:', prev.appUsage);
            
            // Strict Mode에서 setState 콜백이 중복 실행되는 것을 방지
            // 이미 같은 타임스탬프로 처리된 앱이 있는지 확인
            const existingAppIndex = prev.appUsage.findIndex((app) => app.app_name === usageData.app_name);
            
            if (existingAppIndex >= 0) {
                const existingApp = prev.appUsage[existingAppIndex];
                // 마지막 업데이트 타임스탬프와 비교
                if (existingApp.lastUpdated === usageData.timestamp) {
                    console.log('❌ setState 중복 실행 방지:', usageData.timestamp);
                    return prev; // 상태 변경 없음
                }
            }

            const newAppUsage = [...prev.appUsage];

            if (existingAppIndex >= 0) {
                newAppUsage[existingAppIndex] = {
                    ...newAppUsage[existingAppIndex],
                    total_usage_seconds: newAppUsage[existingAppIndex].total_usage_seconds + usageData.usage_seconds,
                    lastUpdated: usageData.timestamp
                };
                console.log('기존 앱 업데이트:', newAppUsage[existingAppIndex]);
            } else {
                newAppUsage.push({
                    app_name: usageData.app_name,
                    total_usage_seconds: usageData.usage_seconds,
                    platform: usageData.platform,
                    lastUpdated: usageData.timestamp
                });
                console.log('새 앱 추가:', newAppUsage[newAppUsage.length - 1]);
            }

            // 통계 업데이트
            const totalUsageSeconds = newAppUsage.reduce((sum, app) => sum + app.total_usage_seconds, 0);

            const newData = {
                appUsage: newAppUsage,
                dailyStats: {
                    total_apps: newAppUsage.length,
                    total_usage_seconds: totalUsageSeconds,
                    date: new Date().toISOString().split('T')[0],
                },
                platformStats: {
                    windows: {
                        apps: newAppUsage.filter((app) => app.platform === 'windows'),
                        stats: {
                            total_apps: newAppUsage.filter((app) => app.platform === 'windows').length,
                            total_usage_seconds: newAppUsage
                                .filter((app) => app.platform === 'windows')
                                .reduce((sum, app) => sum + app.total_usage_seconds, 0),
                        },
                    },
                    macos: {
                        apps: newAppUsage.filter((app) => app.platform === 'macos'),
                        stats: {
                            total_apps: newAppUsage.filter((app) => app.platform === 'macos').length,
                            total_usage_seconds: newAppUsage
                                .filter((app) => app.platform === 'macos')
                                .reduce((sum, app) => sum + app.total_usage_seconds, 0),
                        },
                    },
                    android: {
                        apps: newAppUsage.filter((app) => app.platform === 'android'),
                        stats: {
                            total_apps: newAppUsage.filter((app) => app.platform === 'android').length,
                            total_usage_seconds: newAppUsage
                                .filter((app) => app.platform === 'android')
                                .reduce((sum, app) => sum + app.total_usage_seconds, 0),
                        },
                    },
                },
            };

            // URL에 저장
            saveDataToURL(newData);

            return {
                ...prev,
                ...newData,
            };
        });
    }, []);

    // Electron 이벤트 리스너 등록/해제
    useEffect(() => {
        let wrappedCallback = null;
        
        if (window.electronAPI && typeof window.electronAPI.on === 'function') {
            console.log('usage-data-updated 이벤트 리스너 등록 시도');
            
            // 기존 리스너 먼저 제거
            window.electronAPI.off('usage-data-updated');
            
            // 이벤트 리스너 등록
            wrappedCallback = window.electronAPI.on('usage-data-updated', handleUsageUpdate);
            
            // cleanup 함수
            return () => {
                console.log('usage-data-updated 이벤트 리스너 해제');
                if (window.electronAPI && typeof window.electronAPI.off === 'function') {
                    window.electronAPI.off('usage-data-updated', wrappedCallback);
                }
            };
        }
    }, [handleUsageUpdate]);

    // 초기 데이터 로드
    useEffect(() => {
        const electronAvailable = window.electronAPI !== undefined;
        updateState({ isElectron: electronAvailable });

        // URL에서 데이터 로드 시도
        const urlData = loadDataFromURL();

        if (urlData) {
            // URL에서 데이터를 성공적으로 로드한 경우
            updateState({
                appUsage: urlData.appUsage || [],
                dailyStats: urlData.dailyStats || {
                    total_apps: 0,
                    total_usage_seconds: 0,
                    date: new Date().toISOString().split('T')[0],
                },
                platformStats: urlData.platformStats || {
                    windows: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
                    macos: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
                    android: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
                },
                loading: false,
            });
        } else {
            // URL에 데이터가 없는 경우
            if (electronAvailable) {
                loadElectronData();
            } else {
                loadBrowserData();
            }
        }

        // Electron에서 사용량 모니터링 시작
        if (electronAvailable && checkElectronAPI()) {
            console.log('Electron API 확인됨 - 모니터링 시작');
            // sendUsageData 함수가 있으므로 모니터링이 이미 시작된 것으로 간주
        } else if (electronAvailable) {
            console.log('Electron API가 아직 로드되지 않았습니다. 잠시 후 다시 시도합니다.');
            // 1초 후 다시 시도
            setTimeout(() => {
                if (checkElectronAPI()) {
                    console.log('Electron API 확인됨 - 모니터링 시작');
                } else {
                    console.log('Electron API 로드 실패');
                }
            }, 1000);
        }
    }, [loadElectronData, loadBrowserData]);

    const formatCurrentDateTime = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${year}년 ${month}월 ${day}일 ${hours}:${minutes}:${seconds}`;
    };

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
                        <p>• 10초마다 자동으로 앱 사용량을 추적합니다</p>
                        <p>• Windows, macOS, Android 플랫폼별로 통계를 제공합니다</p>
                        <p>• 데이터는 URL에 자동으로 저장됩니다</p>
                        <p>• 새로고침해도 데이터가 유지됩니다</p>
                        {!state.isElectron && (
                            <div
                                style={{
                                    marginTop: '10px',
                                    padding: '10px',
                                    backgroundColor: '#f0f0f0',
                                    borderRadius: '5px',
                                }}
                            >
                                <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>브라우저 테스트:</p>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        const testData = {
                                            app_name: 'Chrome',
                                            platform: 'macos',
                                            usage_seconds: 10,
                                            timestamp: new Date().toISOString(),
                                        };
                                        console.log('테스트 데이터 전송:', testData);
                                        // 브라우저에서 테스트용 데이터 처리
                                        handleUsageUpdate(testData);
                                    }}
                                    style={{
                                        padding: '5px 10px',
                                        backgroundColor: '#007bff',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '3px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    테스트 데이터 추가
                                </button>
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}

export default App;
