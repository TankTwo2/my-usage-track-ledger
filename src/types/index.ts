export interface AppUsage {
  app_name: string;
  total_usage_seconds: number;
  platform: Platform;
  lastUpdated: string;
}

export interface DailyStats {
  total_apps: number;
  total_usage_seconds: number;
  date: string;
}

export interface PlatformStats {
  apps: AppUsage[];
  stats: {
    total_apps: number;
    total_usage_seconds: number;
  };
}

export interface UsageCache {
  appUsage: AppUsage[];
  dailyStats: DailyStats;
  platformStats: {
    windows: PlatformStats;
    macos: PlatformStats;
    android: PlatformStats;
  };
}

export interface UsageSample {
  app_name: string;
  platform: Platform;
  timestamp: string;
}

export interface BackupData extends UsageCache {
  backupTimestamp: string;
}

export type Platform = 'windows' | 'macos' | 'android';

export interface SystemInfo {
  platform: Platform;
  hostname: string;
  arch: string;
  uptime: number;
  message: string;
}

// React App 상태 관련 타입들
export interface AppState {
  loading: boolean;
  isElectron: boolean;
  appUsage: AppUsage[];
  dailyStats: DailyStats | null;
  platformStats: {
    windows: PlatformStats;
    macos: PlatformStats;
    android: PlatformStats;
  } | null;
  currentDateTime: Date;
  gistBackupStatus: GistBackupStatus;
}

export type GistBackupStatus = 'idle' | 'backing-up' | 'success' | 'error';

export interface UsageDataUpdate {
  app_name: string;
  platform: Platform;
  usage_seconds: number;
  timestamp: string;
}

// URL 데이터 압축 관련
export interface CompressedData {
  appUsage: AppUsage[];
  dailyStats: DailyStats;
  platformStats: {
    windows: PlatformStats;
    macos: PlatformStats;
    android: PlatformStats;
  };
}