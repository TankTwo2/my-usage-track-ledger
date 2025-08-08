import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './App.css';
import TotalStats from './components/TotalStats';
import PlatformStats from './components/PlatformStats';
import DateRangePicker from './components/DateRangePicker';
import GistService from './services/GistService';

// URL 파라미터에서 GIST_ID를 가져오거나 기본값 사용
const getGistId = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('gist') || '7ecfb90402b739968cbbf9866615d32c'; // 기본 Gist ID
};

function App() {
  const [state, setState] = useState({
    loading: true,
    error: null,
    rawData: null,
    filteredData: null,
    selectedPeriod: 'daily', // 기본값: 일별
    selectedDate: new Date().toISOString().split('T')[0], // 오늘 날짜
    lastUpdated: null
  });

  // GistService 인스턴스를 useMemo로 메모이제이션
  const gistService = useMemo(() => new GistService(getGistId()), []);

  const updateState = (updates) => setState((prev) => ({ ...prev, ...updates }));

  // 날짜 필터 적용
  const applyDateFilter = useCallback((rawData, period, date) => {
    if (!rawData) return;

    let filteredData;

    switch (period) {
      case 'daily':
        filteredData = gistService.filterDataByDateRange(rawData, date, date);
        break;
      case 'weekly':
        filteredData = gistService.getWeeklyData(rawData, date);
        break;
      case 'monthly':
        filteredData = gistService.getMonthlyData(rawData, date);
        break;
      default:
        filteredData = rawData;
    }

    updateState({ filteredData });
  }, [gistService]);

  // 데이터 로드 함수
  const loadData = useCallback(async () => {
    try {
      updateState({ loading: true, error: null });
      
      const rawData = await gistService.fetchGistData();
      
      if (!rawData) {
        throw new Error('Gist 데이터를 불러올 수 없습니다.');
      }

      updateState({
        rawData,
        lastUpdated: rawData.lastUpdated,
        loading: false
      });

      // 현재 선택된 기간에 맞춰 데이터 필터링
      applyDateFilter(rawData, state.selectedPeriod, state.selectedDate);
      
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      updateState({
        loading: false,
        error: error.message
      });
    }
  }, [state.selectedPeriod, state.selectedDate, gistService, applyDateFilter]);

  // 기간 변경 핸들러
  const handlePeriodChange = useCallback((newPeriod) => {
    updateState({ selectedPeriod: newPeriod });
    
    if (state.rawData) {
      applyDateFilter(state.rawData, newPeriod, state.selectedDate);
    }
  }, [state.rawData, state.selectedDate, applyDateFilter]);

  // 날짜 변경 핸들러
  const handleDateChange = useCallback((newDate) => {
    updateState({ selectedDate: newDate });
    
    if (state.rawData) {
      applyDateFilter(state.rawData, state.selectedPeriod, newDate);
    }
  }, [state.rawData, state.selectedPeriod, applyDateFilter]);

  // 초기 데이터 로드
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 5분마다 자동 새로고침
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 자동 데이터 새로고침...');
      loadData();
    }, 5 * 60 * 1000); // 5분

    return () => clearInterval(interval);
  }, [loadData]);

  const formatLastUpdated = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (state.loading) {
    return (
      <div className="App">
        <div className="loading">
          <div className="loading-spinner"></div>
          <h2>사용량 데이터를 불러오는 중...</h2>
          <p>Git Gist에서 최신 데이터를 가져오고 있습니다.</p>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="App">
        <div className="error">
          <h2>❌ 데이터 로드 실패</h2>
          <p>{state.error}</p>
          <button onClick={loadData} className="retry-btn">
            다시 시도
          </button>
          <div className="error-help">
            <h3>문제 해결 방법:</h3>
            <ul>
              <li>URL에 올바른 Gist ID가 포함되어 있는지 확인하세요 (?gist=YOUR_GIST_ID)</li>
              <li>Gist가 공개 상태인지 확인하세요</li>
              <li>인터넷 연결을 확인하세요</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  const { filteredData } = state;

  return (
    <div className="App">
      <header className="App-header">
        <h1>📊 Usage Tracker Dashboard</h1>
        <p>실시간 앱 사용량 통계</p>
        
        {state.lastUpdated && (
          <p className="last-updated">
            마지막 업데이트: {formatLastUpdated(state.lastUpdated)}
          </p>
        )}
        
        <button onClick={loadData} className="refresh-btn" title="새로고침">
          🔄
        </button>
      </header>

      <main className="App-main">
        <DateRangePicker
          selectedPeriod={state.selectedPeriod}
          selectedDate={state.selectedDate}
          onPeriodChange={handlePeriodChange}
          onDateChange={handleDateChange}
        />

        {filteredData && (
          <>
            <TotalStats 
              dailyStats={filteredData.dailyStats} 
              appUsage={filteredData.appUsage} 
            />

            <section className="platform-overview">
              <h2>플랫폼별 통계</h2>
              <div className="platform-grid">
                <PlatformStats
                  platform="macos"
                  stats={filteredData.platformStats.macos.stats}
                  apps={filteredData.platformStats.macos.apps}
                />
                <PlatformStats
                  platform="windows"
                  stats={filteredData.platformStats.windows.stats}
                  apps={filteredData.platformStats.windows.apps}
                />
                <PlatformStats
                  platform="android"
                  stats={filteredData.platformStats.android.stats}
                  apps={filteredData.platformStats.android.apps}
                />
              </div>
            </section>
          </>
        )}

        <section className="info-section">
          <h2>ℹ️ 정보</h2>
          <div className="info-content">
            <p>• Git Gist에서 실시간으로 데이터를 가져옵니다</p>
            <p>• 5분마다 자동으로 데이터를 새로고침합니다</p>
            <p>• 일별, 주별, 월별 통계를 제공합니다</p>
            <p>• URL에 ?gist=YOUR_GIST_ID를 추가하여 다른 Gist를 볼 수 있습니다</p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;