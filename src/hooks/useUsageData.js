"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useUsageData = void 0;
const react_1 = require("react");
const DataService_1 = require("../services/DataService");
const GistService_1 = require("../services/GistService");
const useUsageData = (githubToken, gistId) => {
    const [state, setState] = (0, react_1.useState)({
        loading: true,
        isElectron: false,
        appUsage: [],
        dailyStats: null,
        platformStats: null,
        currentDateTime: new Date(),
        gistBackupStatus: 'idle',
    });
    const lastProcessedTimestamp = (0, react_1.useRef)(null);
    const gistServiceRef = (0, react_1.useRef)(null);
    // 상태 업데이트 함수
    const updateState = (0, react_1.useCallback)((updates) => setState((prev) => ({ ...prev, ...updates })), []);
    // Gist 서비스 초기화
    (0, react_1.useEffect)(() => {
        if (githubToken) {
            gistServiceRef.current = new GistService_1.GistService(githubToken, gistId);
        }
        return () => {
            if (gistServiceRef.current) {
                gistServiceRef.current.cleanup();
            }
        };
    }, [githubToken, gistId]);
    // 사용량 데이터 처리 함수
    const handleUsageUpdate = (0, react_1.useCallback)((usageData) => {
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
            }
            else {
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
            DataService_1.DataService.saveDataToURL(newData);
            return {
                ...prev,
                ...newData,
            };
        });
    }, []);
    // Gist 백업
    const backupToGist = (0, react_1.useCallback)(async () => {
        if (!githubToken || !gistServiceRef.current) {
            console.log('GitHub 토큰이 설정되지 않음, Gist 백업 건너뜀');
            return;
        }
        try {
            updateState({ gistBackupStatus: 'backing-up' });
            await gistServiceRef.current.backupToGist(state);
            updateState({ gistBackupStatus: 'success' });
            // 5초 후 상태 초기화
            setTimeout(() => {
                updateState({ gistBackupStatus: 'idle' });
            }, 5000);
        }
        catch (error) {
            console.error('❌ Gist 백업 실패:', error);
            updateState({ gistBackupStatus: 'error' });
            // 10초 후 상태 초기화
            setTimeout(() => {
                updateState({ gistBackupStatus: 'idle' });
            }, 10000);
        }
    }, [githubToken, state, updateState]);
    // Gist에서 복원
    const restoreFromGist = (0, react_1.useCallback)(async () => {
        if (!githubToken || !gistId || !gistServiceRef.current) {
            alert('GitHub 토큰과 Gist ID가 필요합니다');
            return;
        }
        try {
            updateState({ gistBackupStatus: 'backing-up' });
            const restoredData = await gistServiceRef.current.restoreFromGist();
            if (!restoredData) {
                throw new Error('복원된 데이터가 없습니다');
            }
            // 복원된 데이터로 상태 업데이트
            updateState({
                appUsage: restoredData.appUsage,
                dailyStats: restoredData.dailyStats,
                platformStats: restoredData.platformStats,
                gistBackupStatus: 'success'
            });
            // URL에 저장
            DataService_1.DataService.saveDataToURL(restoredData);
            console.log('🎉 Gist에서 복원 성공');
            // 5초 후 상태 초기화
            setTimeout(() => {
                updateState({ gistBackupStatus: 'idle' });
            }, 5000);
        }
        catch (error) {
            console.error('❌ Gist 복원 실패:', error);
            updateState({ gistBackupStatus: 'error' });
            alert('Gist에서 데이터 복원에 실패했습니다: ' + error.message);
            // 10초 후 상태 초기화
            setTimeout(() => {
                updateState({ gistBackupStatus: 'idle' });
            }, 10000);
        }
    }, [githubToken, gistId, updateState]);
    // Electron 데이터 로드
    const loadElectronData = (0, react_1.useCallback)(async () => {
        try {
            console.log('🔄 Electron에서 데이터 로드 시도...');
            updateState({ loading: true });
            const electronAPI = window.electronAPI;
            if (electronAPI && typeof electronAPI.getAppUsage === 'function') {
                console.log('📊 Electron API로 앱 사용량 요청');
                // Electron에서 실제 앱 사용량 데이터 가져오기
                const appData = await electronAPI.getAppUsage('today', 'all');
                console.log('📊 Electron에서 받은 데이터:', appData);
                if (appData && appData.appUsage) {
                    updateState({
                        appUsage: appData.appUsage || [],
                        dailyStats: appData.dailyStats || {
                            total_apps: 0,
                            total_usage_seconds: 0,
                            date: new Date().toISOString().split('T')[0],
                        },
                        platformStats: appData.platformStats || {
                            windows: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
                            macos: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
                            android: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
                        },
                        loading: false
                    });
                    // URL에도 저장 (브라우저 호환성)
                    DataService_1.DataService.saveDataToURL(appData);
                    console.log('✅ Electron 데이터 로드 완료');
                }
                else {
                    console.log('📊 Electron에서 빈 데이터 수신 - 초기 상태로 설정');
                    throw new Error('Electron에서 유효한 데이터를 받지 못했습니다');
                }
            }
            else {
                console.log('❌ Electron API 사용 불가 - URL 데이터로 폴백');
                throw new Error('Electron API를 사용할 수 없습니다');
            }
        }
        catch (error) {
            console.error('❌ Electron 데이터 로드 오류:', error);
            // 폴백: URL 데이터 또는 초기 데이터 사용
            const urlData = DataService_1.DataService.loadDataFromURL();
            if (urlData) {
                console.log('🔄 URL 데이터로 폴백');
                updateState({
                    ...urlData,
                    loading: false
                });
            }
            else {
                console.log('🔄 초기 빈 데이터로 설정');
                const initialData = DataService_1.DataService.createInitialState();
                updateState({
                    ...initialData,
                    loading: false
                });
                DataService_1.DataService.saveDataToURL(initialData);
            }
        }
    }, [updateState]);
    // 브라우저 데이터 로드
    const loadBrowserData = (0, react_1.useCallback)(() => {
        const initialData = DataService_1.DataService.createInitialState();
        updateState({
            ...initialData,
            loading: false,
        });
    }, [updateState]);
    return {
        state,
        updateState,
        handleUsageUpdate,
        backupToGist,
        restoreFromGist,
        loadElectronData,
        loadBrowserData,
    };
};
exports.useUsageData = useUsageData;
