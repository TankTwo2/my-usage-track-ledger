"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
require("./App.css");
const TotalStats_1 = __importDefault(require("./components/TotalStats"));
const PlatformStats_1 = __importDefault(require("./components/PlatformStats"));
const useUsageData_1 = require("./hooks/useUsageData");
const DataService_1 = require("./services/DataService");
function App() {
    // GitHub 토큰과 Gist ID (환경변수에서 로드)
    const GITHUB_TOKEN = process.env.REACT_APP_GITHUB_TOKEN || '';
    const GIST_ID = process.env.REACT_APP_GIST_ID || '';
    const { state, updateState, handleUsageUpdate, backupToGist, restoreFromGist, loadElectronData, loadBrowserData, } = (0, useUsageData_1.useUsageData)(GITHUB_TOKEN, GIST_ID);
    // 실시간 날짜/시간 업데이트
    (0, react_1.useEffect)(() => {
        const updateDateTime = () => {
            updateState({ currentDateTime: new Date() });
        };
        const interval = setInterval(updateDateTime, 1000);
        return () => clearInterval(interval);
    }, [updateState]);
    // Electron 이벤트 리스너 등록/해제
    (0, react_1.useEffect)(() => {
        const electronAPI = window.electronAPI;
        if (electronAPI && typeof electronAPI.on === 'function') {
            console.log('usage-data-updated 이벤트 리스너 등록 시도');
            // 기존 리스너 먼저 제거
            if (typeof electronAPI.off === 'function') {
                electronAPI.off('usage-data-updated');
            }
            // 이벤트 리스너 등록
            const wrappedCallback = electronAPI.on('usage-data-updated', handleUsageUpdate);
            // cleanup 함수
            return () => {
                console.log('usage-data-updated 이벤트 리스너 해제');
                if (electronAPI && typeof electronAPI.off === 'function') {
                    electronAPI.off('usage-data-updated', wrappedCallback);
                }
            };
        }
    }, [handleUsageUpdate]);
    // 초기 데이터 로드
    (0, react_1.useEffect)(() => {
        const electronAvailable = window.electronAPI !== undefined;
        updateState({ isElectron: electronAvailable });
        // URL에서 데이터 로드 시도
        const urlData = DataService_1.DataService.loadDataFromURL();
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
        }
        else {
            // URL에 데이터가 없는 경우
            if (electronAvailable) {
                loadElectronData();
            }
            else {
                loadBrowserData();
            }
        }
        // Electron에서 사용량 모니터링 시작
        if (electronAvailable && DataService_1.DataService.checkElectronAPI()) {
            console.log('Electron API 확인됨 - 모니터링 시작');
        }
        else if (electronAvailable) {
            console.log('Electron API가 아직 로드되지 않았습니다. 잠시 후 다시 시도합니다.');
            // 1초 후 다시 시도
            setTimeout(() => {
                if (DataService_1.DataService.checkElectronAPI()) {
                    console.log('Electron API 확인됨 - 모니터링 시작');
                }
                else {
                    console.log('Electron API 로드 실패');
                }
            }, 1000);
        }
    }, [loadElectronData, loadBrowserData, updateState]);
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
        return ((0, jsx_runtime_1.jsx)("div", { className: "App", children: (0, jsx_runtime_1.jsx)("div", { className: "loading", children: (0, jsx_runtime_1.jsx)("h2", { children: "\uC571 \uC0AC\uC6A9\uB7C9 \uC815\uBCF4\uB97C \uB85C\uB529 \uC911..." }) }) }));
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "App", children: [(0, jsx_runtime_1.jsxs)("header", { className: "App-header", children: [(0, jsx_runtime_1.jsx)("h1", { children: "Usage Tracker" }), (0, jsx_runtime_1.jsx)("p", { children: "\uC624\uB298\uC758 \uC571 \uC0AC\uC6A9\uB7C9 \uCD94\uC801" }), (0, jsx_runtime_1.jsx)("p", { className: "current-time", children: formatCurrentDateTime(state.currentDateTime) }), !state.isElectron && ((0, jsx_runtime_1.jsx)("p", { style: { color: 'orange', fontSize: '14px' }, children: "\uBE0C\uB77C\uC6B0\uC800 \uBAA8\uB4DC - Electron \uC571\uC5D0\uC11C \uC2E4\uD589\uD558\uC138\uC694" }))] }), (0, jsx_runtime_1.jsxs)("main", { className: "App-main", children: [state.dailyStats && (0, jsx_runtime_1.jsx)(TotalStats_1.default, { dailyStats: state.dailyStats, appUsage: state.appUsage }), state.platformStats && ((0, jsx_runtime_1.jsxs)("section", { className: "platform-overview", children: [(0, jsx_runtime_1.jsx)("h2", { children: "\uD50C\uB7AB\uD3FC\uBCC4 \uD1B5\uACC4" }), (0, jsx_runtime_1.jsxs)("div", { className: "platform-grid", children: [(0, jsx_runtime_1.jsx)(PlatformStats_1.default, { platform: "windows", stats: state.platformStats.windows.stats, apps: state.platformStats.windows.apps }), (0, jsx_runtime_1.jsx)(PlatformStats_1.default, { platform: "macos", stats: state.platformStats.macos.stats, apps: state.platformStats.macos.apps }), (0, jsx_runtime_1.jsx)(PlatformStats_1.default, { platform: "android", stats: state.platformStats.android.stats, apps: state.platformStats.android.apps })] })] })), (0, jsx_runtime_1.jsxs)("section", { className: "usage-guide", children: [(0, jsx_runtime_1.jsx)("h2", { children: "\uC0AC\uC6A9 \uC548\uB0B4" }), (0, jsx_runtime_1.jsxs)("div", { className: "guide-content", children: [(0, jsx_runtime_1.jsx)("p", { children: "\u2022 10\uCD08\uB9C8\uB2E4 \uC790\uB3D9\uC73C\uB85C \uC571 \uC0AC\uC6A9\uB7C9\uC744 \uCD94\uC801\uD569\uB2C8\uB2E4" }), (0, jsx_runtime_1.jsx)("p", { children: "\u2022 Windows, macOS, Android \uD50C\uB7AB\uD3FC\uBCC4\uB85C \uD1B5\uACC4\uB97C \uC81C\uACF5\uD569\uB2C8\uB2E4" }), (0, jsx_runtime_1.jsx)("p", { children: "\u2022 \uB370\uC774\uD130\uB294 URL\uC5D0 \uC790\uB3D9\uC73C\uB85C \uC800\uC7A5\uB429\uB2C8\uB2E4" }), (0, jsx_runtime_1.jsx)("p", { children: "\u2022 \uC0C8\uB85C\uACE0\uCE68\uD574\uB3C4 \uB370\uC774\uD130\uAC00 \uC720\uC9C0\uB429\uB2C8\uB2E4" }), GITHUB_TOKEN && ((0, jsx_runtime_1.jsx)("p", { children: "\u2022 GitHub Gist\uC5D0 5\uBD84\uB9C8\uB2E4 \uC790\uB3D9 \uBC31\uC5C5\uB429\uB2C8\uB2E4" })), !state.isElectron && ((0, jsx_runtime_1.jsxs)("div", { style: {
                                            marginTop: '10px',
                                            padding: '10px',
                                            backgroundColor: '#f0f0f0',
                                            borderRadius: '5px',
                                        }, children: [(0, jsx_runtime_1.jsx)("p", { style: { margin: '0 0 10px 0', fontWeight: 'bold' }, children: "\uBE0C\uB77C\uC6B0\uC800 \uD14C\uC2A4\uD2B8:" }), (0, jsx_runtime_1.jsx)("button", { onClick: (e) => {
                                                    e.preventDefault();
                                                    const testData = {
                                                        app_name: 'Chrome',
                                                        platform: 'macos',
                                                        usage_seconds: 10,
                                                        timestamp: new Date().toISOString(),
                                                    };
                                                    console.log('테스트 데이터 전송:', testData);
                                                    handleUsageUpdate(testData);
                                                }, style: {
                                                    padding: '5px 10px',
                                                    backgroundColor: '#007bff',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '3px',
                                                    cursor: 'pointer',
                                                }, children: "\uD14C\uC2A4\uD2B8 \uB370\uC774\uD130 \uCD94\uAC00" })] }))] })] }), (0, jsx_runtime_1.jsxs)("section", { className: "gist-backup", children: [(0, jsx_runtime_1.jsx)("h2", { children: "GitHub Gist \uBC31\uC5C5" }), (0, jsx_runtime_1.jsxs)("div", { className: "backup-content", children: [(0, jsx_runtime_1.jsxs)("div", { className: "backup-status", children: [(0, jsx_runtime_1.jsx)("span", { children: "\uBC31\uC5C5 \uC0C1\uD0DC: " }), (0, jsx_runtime_1.jsxs)("span", { style: {
                                                    color: state.gistBackupStatus === 'success' ? 'green' :
                                                        state.gistBackupStatus === 'error' ? 'red' :
                                                            state.gistBackupStatus === 'backing-up' ? 'orange' : 'gray'
                                                }, children: [state.gistBackupStatus === 'idle' && '대기중', state.gistBackupStatus === 'backing-up' && '백업중...', state.gistBackupStatus === 'success' && '백업 완료', state.gistBackupStatus === 'error' && '백업 실패'] })] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginTop: '10px' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                                                    padding: '10px',
                                                    backgroundColor: '#e8f5e8',
                                                    borderRadius: '5px',
                                                    marginBottom: '15px',
                                                    border: '1px solid #28a745'
                                                }, children: [(0, jsx_runtime_1.jsx)("p", { style: { margin: '0 0 5px 0', fontSize: '14px', color: '#155724', fontWeight: 'bold' }, children: "\u2705 GitHub \uBC31\uC5C5\uC774 \uC124\uC815\uB418\uC5C8\uC2B5\uB2C8\uB2E4" }), (0, jsx_runtime_1.jsx)("p", { style: { margin: '0', fontSize: '12px', color: '#155724' }, children: "\uC790\uB3D9 \uBC31\uC5C5\uC774 \uD65C\uC131\uD654\uB418\uC5B4 5\uBD84\uB9C8\uB2E4 \uB370\uC774\uD130\uB97C \uBC31\uC5C5\uD569\uB2C8\uB2E4" }), GIST_ID && GIST_ID !== 'your_gist_id_here' && ((0, jsx_runtime_1.jsxs)("p", { style: { margin: '5px 0 0 0', fontSize: '12px', color: '#666' }, children: ["Gist ID: ", GIST_ID] }))] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: '10px' }, children: [(0, jsx_runtime_1.jsx)("button", { onClick: backupToGist, disabled: state.gistBackupStatus === 'backing-up', style: {
                                                            padding: '8px 16px',
                                                            backgroundColor: state.gistBackupStatus === 'backing-up' ? '#ccc' : '#28a745',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            cursor: state.gistBackupStatus === 'backing-up' ? 'not-allowed' : 'pointer',
                                                            marginRight: '10px'
                                                        }, children: state.gistBackupStatus === 'backing-up' ? '백업중...' : '수동 백업' }), GIST_ID && GIST_ID !== 'your_gist_id_here' && ((0, jsx_runtime_1.jsx)("button", { onClick: restoreFromGist, disabled: state.gistBackupStatus === 'backing-up', style: {
                                                            padding: '8px 16px',
                                                            backgroundColor: state.gistBackupStatus === 'backing-up' ? '#ccc' : '#17a2b8',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            cursor: state.gistBackupStatus === 'backing-up' ? 'not-allowed' : 'pointer',
                                                            marginRight: '10px'
                                                        }, children: state.gistBackupStatus === 'backing-up' ? '복원중...' : 'Gist에서 복원' }))] })] })] })] })] })] }));
}
exports.default = App;
