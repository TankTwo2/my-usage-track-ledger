import React, { useEffect } from 'react';
import './App.css';
import TotalStats from './components/TotalStats';
import PlatformStats from './components/PlatformStats';
import { useUsageData } from './hooks/useUsageData';
import { DataService } from './services/DataService';

function App() {
  // GitHub 토큰과 Gist ID (환경변수 또는 URL에서 로드)
  const GITHUB_TOKEN = process.env.REACT_APP_GITHUB_TOKEN || '';
  const URL_GIST_ID = DataService.loadGistIdFromURL();
  const GIST_ID = URL_GIST_ID || process.env.REACT_APP_GIST_ID || '';

  const {
    state,
    updateState,
    handleUsageUpdate,
    backupToGist,
    restoreFromGist,
    loadElectronData,
    loadBrowserData,
  } = useUsageData(GITHUB_TOKEN, GIST_ID);

  // 실시간 날짜/시간 업데이트
  useEffect(() => {
    const updateDateTime = () => {
      updateState({ currentDateTime: new Date() });
    };

    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, [updateState]);

  // Electron 이벤트 리스너 등록/해제
  useEffect(() => {
    const electronAPI = (window as any).electronAPI;
    
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
  useEffect(() => {
    const initializeData = async () => {
      const electronAvailable = (window as any).electronAPI !== undefined;
      updateState({ isElectron: electronAvailable });

      // 1. URL에서 압축된 데이터 로드 시도
      const urlData = DataService.loadDataFromURL();
      
      if (urlData) {
        // URL에서 데이터를 성공적으로 로드한 경우
        console.log('✅ URL 압축 데이터에서 로드 성공');
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
        return;
      }

      // 2. URL에서 Gist ID로 데이터 로드 시도
      const gistId = DataService.loadGistIdFromURL();
      if (gistId) {
        console.log(`🔄 URL에서 Gist ID 감지: ${gistId}`);
        try {
          const gistData = await DataService.loadGistDataFromURL();
          if (gistData) {
            console.log('✅ URL Gist에서 데이터 로드 성공');
            updateState({
              appUsage: gistData.appUsage || [],
              dailyStats: gistData.dailyStats || {
                total_apps: 0,
                total_usage_seconds: 0,
                date: new Date().toISOString().split('T')[0],
              },
              platformStats: gistData.platformStats || {
                windows: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
                macos: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
                android: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
              },
              loading: false,
            });
            return;
          }
        } catch (error) {
          console.error('❌ URL Gist 데이터 로드 실패:', error);
        }
      }

      // 3. Electron 또는 브라우저 기본 로직
      if (electronAvailable) {
        loadElectronData();
      } else {
        loadBrowserData();
      }

      // Electron에서 사용량 모니터링 시작
      if (electronAvailable && DataService.checkElectronAPI()) {
        console.log('Electron API 확인됨 - 모니터링 시작');
      } else if (electronAvailable) {
        console.log('Electron API가 아직 로드되지 않았습니다. 잠시 후 다시 시도합니다.');
        // 1초 후 다시 시도
        setTimeout(() => {
          if (DataService.checkElectronAPI()) {
            console.log('Electron API 확인됨 - 모니터링 시작');
          } else {
            console.log('Electron API 로드 실패');
          }
        }, 1000);
      }
    };

    initializeData();
  }, [loadElectronData, loadBrowserData, updateState]);

  const formatCurrentDateTime = (date: Date): string => {
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
            {GITHUB_TOKEN && (
              <p>• GitHub Gist에 5분마다 자동 백업됩니다</p>
            )}
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
                      platform: 'macos' as const,
                      usage_seconds: 10,
                      timestamp: new Date().toISOString(),
                    };
                    console.log('테스트 데이터 전송:', testData);
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

        <section className="gist-backup">
          <h2>GitHub Gist 백업</h2>
          <div className="backup-content">
            <div className="backup-status">
              <span>백업 상태: </span>
              <span 
                style={{
                  color: state.gistBackupStatus === 'success' ? 'green' : 
                         state.gistBackupStatus === 'error' ? 'red' : 
                         state.gistBackupStatus === 'backing-up' ? 'orange' : 'gray'
                }}
              >
                {state.gistBackupStatus === 'idle' && '대기중'}
                {state.gistBackupStatus === 'backing-up' && '백업중...'}
                {state.gistBackupStatus === 'success' && '백업 완료'}
                {state.gistBackupStatus === 'error' && '백업 실패'}
              </span>
            </div>
            
            <div style={{ marginTop: '10px' }}>
              <div style={{ 
                padding: '10px', 
                backgroundColor: '#e8f5e8', 
                borderRadius: '5px', 
                marginBottom: '15px',
                border: '1px solid #28a745'
              }}>
                <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#155724', fontWeight: 'bold' }}>
                  ✅ GitHub 백업이 설정되었습니다
                </p>
                <p style={{ margin: '0', fontSize: '12px', color: '#155724' }}>
                  자동 백업이 활성화되어 5분마다 데이터를 백업합니다
                </p>
                {GIST_ID && GIST_ID !== 'your_gist_id_here' && (
                  <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#666' }}>
                    Gist ID: {GIST_ID}
                  </p>
                )}
              </div>
              
              <div style={{ marginBottom: '10px' }}>
                <button
                  onClick={backupToGist}
                  disabled={state.gistBackupStatus === 'backing-up'}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: state.gistBackupStatus === 'backing-up' ? '#ccc' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: state.gistBackupStatus === 'backing-up' ? 'not-allowed' : 'pointer',
                    marginRight: '10px'
                  }}
                >
                  {state.gistBackupStatus === 'backing-up' ? '백업중...' : '수동 백업'}
                </button>
                
                {GIST_ID && GIST_ID !== 'your_gist_id_here' && (
                  <button
                    onClick={restoreFromGist}
                    disabled={state.gistBackupStatus === 'backing-up'}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: state.gistBackupStatus === 'backing-up' ? '#ccc' : '#17a2b8',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: state.gistBackupStatus === 'backing-up' ? 'not-allowed' : 'pointer',
                      marginRight: '10px'
                    }}
                  >
                    {state.gistBackupStatus === 'backing-up' ? '복원중...' : 'Gist에서 복원'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;