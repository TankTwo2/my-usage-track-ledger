class GistService {
  constructor(gistId) {
    this.gistId = gistId;
    this.apiBase = 'https://api.github.com';
  }

  async fetchGistData() {
    try {
      const response = await fetch(`${this.apiBase}/gists/${this.gistId}`);
      
      if (!response.ok) {
        throw new Error(`Gist fetch failed: ${response.status}`);
      }

      const gistData = await response.json();
      
      // usage-data.json 파일 찾기
      const usageDataFile = gistData.files['usage-data.json'];
      
      if (!usageDataFile || !usageDataFile.content) {
        console.warn('usage-data.json not found in gist');
        return null;
      }

      const content = JSON.parse(usageDataFile.content);
      
      // 실제 데이터 구조 확인용 로깅
      console.log('📊 Gist 원본 데이터 구조:', {
        hasAppUsage: !!content.appUsage,
        appUsageLength: content.appUsage?.length || 0,
        hasDailyStats: !!content.dailyStats,
        hasPlatformStats: !!content.platformStats,
        lastUpdate: gistData.updated_at
      });
      
      console.log('📊 Gist 데이터 로드 완료:', {
        totalApps: content.appUsage?.length || 0,
        lastUpdate: gistData.updated_at
      });

      return this.transformGistData(content);
      
    } catch (error) {
      console.error('❌ Gist 데이터 로드 실패:', error);
      return null;
    }
  }

  transformGistData(gistContent) {
    // Gist에서 이미 올바른 구조로 되어 있는 경우 그대로 사용
    if (gistContent.appUsage && gistContent.dailyStats && gistContent.platformStats) {
      console.log('✅ Gist 데이터가 이미 올바른 구조입니다.');
      return {
        appUsage: gistContent.appUsage,
        dailyStats: gistContent.dailyStats,
        platformStats: gistContent.platformStats,
        lastUpdated: gistContent.lastBackup || new Date().toISOString()
      };
    }
    
    // 구버전 데이터 구조 처리 (apps 배열이 있는 경우)
    const apps = gistContent.apps || gistContent.appUsage || [];
    
    // 플랫폼별로 앱 분류
    const platformStats = {
      windows: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
      macos: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
      android: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } }
    };

    apps.forEach(app => {
      const platform = app.platform || 'macos';
      if (platformStats[platform]) {
        platformStats[platform].apps.push(app);
        platformStats[platform].stats.total_apps += 1;
        platformStats[platform].stats.total_usage_seconds += app.total_usage_seconds || 0;
      }
    });

    const totalUsageSeconds = apps.reduce((sum, app) => sum + (app.total_usage_seconds || 0), 0);

    return {
      appUsage: apps,
      dailyStats: gistContent.dailyStats || {
        total_apps: apps.length,
        total_usage_seconds: totalUsageSeconds,
        date: new Date().toISOString().split('T')[0],
      },
      platformStats,
      lastUpdated: gistContent.lastBackup || new Date().toISOString()
    };
  }

  // 사용량 데이터를 날짜별로 필터링
  filterDataByDateRange(data, startDate, endDate) {
    if (!data || !data.appUsage) return data;

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // 해당 날짜 끝까지 포함

    // 앱별로 날짜 범위 내의 데이터만 필터링
    const filteredApps = data.appUsage.filter(app => {
      if (!app.lastUpdated) return true; // 날짜 정보가 없는 데이터는 포함
      
      const appDate = new Date(app.lastUpdated);
      return appDate >= start && appDate <= end;
    });

    // 플랫폼별 통계 재계산
    const platformStats = {
      windows: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
      macos: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } },
      android: { apps: [], stats: { total_apps: 0, total_usage_seconds: 0 } }
    };

    filteredApps.forEach(app => {
      const platform = app.platform || 'macos';
      if (platformStats[platform]) {
        platformStats[platform].apps.push(app);
        platformStats[platform].stats.total_apps += 1;
        platformStats[platform].stats.total_usage_seconds += app.total_usage_seconds || 0;
      }
    });

    const totalUsageSeconds = filteredApps.reduce((sum, app) => sum + (app.total_usage_seconds || 0), 0);

    return {
      ...data,
      appUsage: filteredApps,
      dailyStats: {
        total_apps: filteredApps.length,
        total_usage_seconds: totalUsageSeconds,
        date: startDate,
      },
      platformStats
    };
  }

  // 주별 데이터 집계
  getWeeklyData(data, targetDate) {
    const target = new Date(targetDate);
    const startOfWeek = new Date(target);
    startOfWeek.setDate(target.getDate() - target.getDay()); // 일요일부터 시작
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // 토요일까지
    
    return this.filterDataByDateRange(data, startOfWeek.toISOString().split('T')[0], endOfWeek.toISOString().split('T')[0]);
  }

  // 월별 데이터 집계
  getMonthlyData(data, targetDate) {
    const target = new Date(targetDate);
    const startOfMonth = new Date(target.getFullYear(), target.getMonth(), 1);
    const endOfMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0);
    
    return this.filterDataByDateRange(data, startOfMonth.toISOString().split('T')[0], endOfMonth.toISOString().split('T')[0]);
  }
}

export default GistService;