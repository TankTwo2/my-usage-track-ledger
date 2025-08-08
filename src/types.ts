export type Platform = 'windows' | 'macos' | 'android';

export interface SystemInfo {
  platform: Platform;
  hostname: string;
  arch: string;
  uptime: number;
  message: string;
}

export interface AppUsage {
  name?: string;
  app_name: string; // Legacy compatibility
  platform: Platform;
  total_usage_seconds: number;
  last_active?: string;
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

export interface PlatformStatsMap {
  windows: PlatformStats;
  macos: PlatformStats;
  android: PlatformStats;
}

export interface UsageCache {
  appUsage: AppUsage[];
  dailyStats: DailyStats;
  platformStats: PlatformStatsMap;
}

export interface BackupData extends UsageCache {
  lastBackup?: string;
  backupTimestamp?: string;
}

export interface DailyData {
  date: string;
  apps?: AppUsage[];
  appUsage: AppUsage[]; // Legacy compatibility
  createdAt?: string;
  dailyStats?: DailyStats;
  platformStats?: PlatformStatsMap;
  lastUpdated?: string;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

// Additional types for services and hooks
export interface AppState {
  focusedApp?: string | null;
  isTracking?: boolean;
  usageData?: UsageCache;
  lastUpdate?: string;
  currentDateTime: Date;
  isElectron: boolean;
  loading?: boolean;
  appUsage: AppUsage[];
  dailyStats: DailyStats | null;
  platformStats: PlatformStatsMap | null;
  gistBackupStatus?: 'idle' | 'loading' | 'success' | 'error' | 'backing-up';
}

export interface UsageDataUpdate {
  app?: string;
  app_name: string;
  platform: Platform;
  duration?: number;
  usage_seconds: number;
  timestamp: string;
}

export interface UsageSample {
  appName?: string;
  app_name?: string;
  platform: Platform;
  timestamp: string;
  duration?: number;
}

export interface CompressedData extends UsageCache {
  data?: string;
  timestamp?: string;
  checksum?: string;
}

export interface LocalStorageMeta {
  version?: string;
  createdAt?: string;
  lastModified?: string;
  entries?: number;
  totalDays?: number;
  oldestDate?: string;
  newestDate?: string;
  lastBackupAttempt?: string;
  lastSuccessfulBackup?: string;
}

export interface MergeResult {
  merged: DailyData[];
  conflicts: number;
  added: number;
  updated: number;
}