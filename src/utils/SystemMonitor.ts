import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Platform, SystemInfo } from '../types';

const execAsync = promisify(exec);

export class SystemMonitor {
  public platform: Platform;

  constructor() {
    this.platform = this.detectPlatform();
  }

  private detectPlatform(): Platform {
    const platform = os.platform();
    if (platform === 'win32') return 'windows';
    if (platform === 'darwin') return 'macos';
    if (platform === 'android') return 'android';
    return 'macos'; // 기본값
  }

  public async getSystemInfo(): Promise<SystemInfo> {
    return {
      platform: this.platform,
      hostname: os.hostname(),
      arch: os.arch(),
      uptime: Math.floor(os.uptime()),
      message: '시스템 모니터링 중',
    };
  }

  public async getFocusedApp(): Promise<string | null> {
    try {
      if (this.platform === 'macos') {
        // 더 안전한 AppleScript로 frontmost 앱 직접 감지
        const { stdout: frontmostApp } = await execAsync(`
          osascript -e '
          try
              tell application "System Events"
                  set frontApp to name of first application process whose frontmost is true
                  
                  -- 특별한 경우들 처리
                  if frontApp is "loginwindow" or frontApp is "System Events" then
                      return "Unknown"
                  end if
                  
                  return frontApp
              end tell
          on error
              try
                  -- 폴백: 가장 최근에 활성화된 앱 찾기
                  tell application "System Events"
                      set activeApps to {}
                      repeat with proc in (application processes)
                          try
                              if visible of proc is true and (count of windows of proc) > 0 then
                                  set procName to name of proc
                                  if procName is not "loginwindow" and procName is not "System Events" and procName is not "Finder" then
                                      set end of activeApps to procName
                                  end if
                              end if
                          end try
                      end repeat
                      
                      if length of activeApps > 0 then
                          return item 1 of activeApps
                      else
                          return "Unknown"
                      end if
                  end tell
              on error
                  return "Unknown"
              end try
          end try
          '
        `);
        
        const result = frontmostApp.trim();
        return result === 'Unknown' ? null : result;
      } else if (this.platform === 'windows') {
        // Windows용 포커스된 앱 감지 (나중에 구현)
        return 'Windows App';
      } else {
        return 'Android App';
      }
    } catch (error) {
      console.error('포커스된 앱 감지 오류:', error);
      return null;
    }
  }
}