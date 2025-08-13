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

// 일별 저장용 데이터 구조
export interface DailyData {
  date: string; // YYYY-MM-DD 형식
  appUsage: AppUsage[];
  dailyStats: DailyStats;
  platformStats: {
    windows: PlatformStats;
    macos: PlatformStats;
    android: PlatformStats;
  };
  createdAt: string; // ISO timestamp
  lastUpdated: string; // ISO timestamp
}

// Gist에 저장되는 날짜별 구조화된 데이터
export interface StructuredGistData {
  [date: string]: DailyData | StructuredGistMetadata; // 키는 YYYY-MM-DD 형식 또는 'metadata'
  metadata: StructuredGistMetadata;
}

export interface StructuredGistMetadata {
  lastUpdated: string;
  totalDays: number;
  oldestDate?: string;
  newestDate?: string;
}

// 로컬 저장소 메타데이터
export interface LocalStorageMeta {
  totalDays: number;
  oldestDate: string;
  newestDate: string;
  lastBackupAttempt?: string;
  lastSuccessfulBackup?: string;
}

// 데이터 병합을 위한 인터페이스
export interface MergeResult {
  merged: DailyData[];
  conflicts: string[];
  warnings: string[];
}