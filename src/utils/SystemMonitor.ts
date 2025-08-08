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
        return await this.getMacOSFocusedApp();
      } else if (this.platform === 'windows') {
        return await this.getWindowsFocusedApp();
      } else {
        return 'Android App';
      }
    } catch (error) {
      console.error('포커스된 앱 감지 오류:', error);
      return null;
    }
  }

  private async getMacOSFocusedApp(): Promise<string | null> {
    try {
      // 1차: Bundle Identifier 기반 정확한 앱 감지
      const bundleResult = await this.getAppByBundleIdentifier();
      if (bundleResult) {
        return bundleResult;
      }

      // 2차: Window Title 기반 감지 (폴백)
      const windowResult = await this.getAppByWindowTitle();
      if (windowResult) {
        return windowResult;
      }

      // 3차: 기존 방식 (최종 폴백)
      return await this.getAppByProcessName();
    } catch (error) {
      console.error('macOS 앱 감지 오류:', error);
      return null;
    }
  }

  private async getAppByBundleIdentifier(): Promise<string | null> {
    try {
      const { stdout: bundleId } = await execAsync(`
        osascript -e '
        try
            tell application "System Events"
                set frontApp to first application process whose frontmost is true
                set bundleId to bundle identifier of frontApp
                set appName to name of frontApp
                return bundleId & "|" & appName
            end tell
        on error
            return "error"
        end try
        '
      `);

      const result = bundleId.trim();
      if (result === 'error' || !result.includes('|')) {
        return null;
      }

      const [bundle, processName] = result.split('|');
      return this.getActualAppName(bundle, processName);
    } catch (error) {
      console.error('Bundle identifier 감지 오류:', error);
      return null;
    }
  }

  private async getAppByWindowTitle(): Promise<string | null> {
    try {
      const { stdout: windowInfo } = await execAsync(`
        osascript -e '
        try
            tell application "System Events"
                set frontApp to first application process whose frontmost is true
                set appName to name of frontApp
                
                try
                    set windowTitle to name of window 1 of frontApp
                    return appName & "|" & windowTitle
                on error
                    return appName & "|"
                end try
            end tell
        on error
            return "error"
        end try
        '
      `);

      const result = windowInfo.trim();
      if (result === 'error' || !result.includes('|')) {
        return null;
      }

      const [processName, windowTitle] = result.split('|');
      return this.getAppNameByWindowTitle(processName, windowTitle);
    } catch (error) {
      console.error('Window title 감지 오류:', error);
      return null;
    }
  }

  private async getAppByProcessName(): Promise<string | null> {
    try {
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
            return "Unknown"
        end try
        '
      `);
      
      const result = frontmostApp.trim();
      return result === 'Unknown' ? null : result;
    } catch (error) {
      console.error('Process name 감지 오류:', error);
      return null;
    }
  }

  private getActualAppName(bundleId: string, processName: string): string {
    // Bundle Identifier를 기반으로 실제 앱 이름 반환
    const bundleMap: Record<string, string> = {
      'com.microsoft.VSCode': 'Visual Studio Code',
      'com.microsoft.VSCodeInsiders': 'Visual Studio Code - Insiders',
      'com.google.Chrome': 'Google Chrome',
      'com.apple.Safari': 'Safari',
      'com.apple.finder': 'Finder',
      'com.apple.Terminal': 'Terminal',
      'com.github.atom': 'Atom',
      'com.sublimetext.4': 'Sublime Text',
      'com.jetbrains.intellij': 'IntelliJ IDEA',
      'com.jetbrains.WebStorm': 'WebStorm',
      'com.slack.Slack': 'Slack',
      'com.tinyspeck.slackmacgap': 'Slack',
      'com.spotify.client': 'Spotify',
      'com.figma.Desktop': 'Figma',
      // Electron 기반 앱들의 정확한 식별
      'com.electron.devdocs-app': 'DevDocs',
      'com.electron.whatsapp-for-mac': 'WhatsApp',
      'com.postmanlabs.mac': 'Postman'
    };

    // 매핑된 이름이 있으면 사용, 없으면 process name 사용
    return bundleMap[bundleId] || processName;
  }

  private getAppNameByWindowTitle(processName: string, windowTitle: string): string {
    // 윈도우 제목 기반 앱 식별 (Electron 앱들의 추가 검증용)
    if (processName === 'Electron' && windowTitle) {
      // VSCode 패턴 감지
      if (windowTitle.includes('Visual Studio Code') || 
          windowTitle.match(/\.(js|ts|jsx|tsx|html|css|md|json).*Visual Studio Code/)) {
        return 'Visual Studio Code';
      }
      
      // 다른 Electron 앱들도 추가 가능
      if (windowTitle.includes('Slack')) {
        return 'Slack';
      }
      
      if (windowTitle.includes('WhatsApp')) {
        return 'WhatsApp';
      }
    }
    
    return processName;
  }

  private async getWindowsFocusedApp(): Promise<string | null> {
    try {
      // PowerShell을 사용하여 활성 창의 프로세스 정보 가져오기
      const { stdout: activeWindow } = await execAsync(`
        powershell -Command "
        Add-Type -TypeDefinition '
          using System;
          using System.Diagnostics;
          using System.Runtime.InteropServices;
          using System.Text;
          public class Win32 {
            [DllImport(\\"user32.dll\\")]
            public static extern IntPtr GetForegroundWindow();
            [DllImport(\\"user32.dll\\")]
            public static extern int GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
            [DllImport(\\"user32.dll\\")]
            public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
          }
        ';
        $hwnd = [Win32]::GetForegroundWindow();
        $processId = 0;
        [Win32]::GetWindowThreadProcessId($hwnd, [ref]$processId);
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue;
        $windowTitle = New-Object System.Text.StringBuilder 256;
        [Win32]::GetWindowText($hwnd, $windowTitle, 256);
        if ($process) {
          Write-Output ($process.ProcessName + '|' + $process.MainWindowTitle + '|' + $windowTitle.ToString());
        } else {
          Write-Output 'Unknown|';
        }
        "
      `, { timeout: 5000 });

      const result = activeWindow.trim();
      if (!result || result === 'Unknown|') {
        return null;
      }

      const [processName, mainWindowTitle, actualWindowTitle] = result.split('|');
      return this.getWindowsAppName(processName, mainWindowTitle || actualWindowTitle);
    } catch (error) {
      console.error('Windows 포커스 앱 감지 오류:', error);
      
      // PowerShell이 실패할 경우 간단한 tasklist 명령어 사용
      try {
        // 최근 활성화된 프로세스 목록에서 추정
        const { stdout: processList } = await execAsync('tasklist /FO CSV | findstr /I "chrome firefox notepad code"');
        if (processList) {
          const lines = processList.split('\n');
          if (lines.length > 0) {
            const firstProcess = lines[0].split(',')[0].replace(/"/g, '');
            return this.getWindowsAppName(firstProcess, '');
          }
        }
      } catch (fallbackError) {
        console.error('Windows 폴백 감지도 실패:', fallbackError);
      }
      
      return null;
    }
  }

  private getWindowsAppName(processName: string, windowTitle: string): string {
    // Windows 프로세스 이름을 앱 이름으로 매핑
    const processMap: Record<string, string> = {
      'chrome': 'Google Chrome',
      'firefox': 'Mozilla Firefox',
      'msedge': 'Microsoft Edge',
      'explorer': 'File Explorer',
      'notepad': 'Notepad',
      'notepad++': 'Notepad++',
      'Code': 'Visual Studio Code',
      'devenv': 'Visual Studio',
      'sublime_text': 'Sublime Text',
      'atom': 'Atom',
      'idea64': 'IntelliJ IDEA',
      'webstorm64': 'WebStorm',
      'slack': 'Slack',
      'spotify': 'Spotify',
      'discord': 'Discord',
      'teams': 'Microsoft Teams',
      'outlook': 'Microsoft Outlook',
      'winword': 'Microsoft Word',
      'excel': 'Microsoft Excel',
      'powerpnt': 'Microsoft PowerPoint',
      'photoshop': 'Adobe Photoshop',
      'figma': 'Figma'
    };

    // 정확한 매칭을 위해 소문자로 비교
    const lowerProcessName = processName.toLowerCase();
    
    // 직접 매핑
    if (processMap[lowerProcessName]) {
      return processMap[lowerProcessName];
    }

    // 부분 매칭
    for (const [key, value] of Object.entries(processMap)) {
      if (lowerProcessName.includes(key.toLowerCase()) || 
          key.toLowerCase().includes(lowerProcessName)) {
        return value;
      }
    }

    // 윈도우 제목으로 추가 식별 시도
    if (windowTitle) {
      if (windowTitle.includes('Visual Studio Code')) {
        return 'Visual Studio Code';
      }
      if (windowTitle.includes('Chrome')) {
        return 'Google Chrome';
      }
      if (windowTitle.includes('Firefox')) {
        return 'Mozilla Firefox';
      }
    }

    // 프로세스 이름 정리 (.exe 제거 등)
    return processName.replace('.exe', '').replace(/^\w/, c => c.toUpperCase());
  }
}