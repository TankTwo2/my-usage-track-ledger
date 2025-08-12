import { Tray, Menu, nativeImage, Notification, shell, BrowserWindow, app } from 'electron';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
const log = require('electron-log');

export class TrayService {
  private tray: Tray | null = null;
  private dashboardWindow: BrowserWindow | null = null;
  private logViewerWindow: BrowserWindow | null = null;
  private currentStatus: string = '트래킹 중...';
  private lastDetectedApp: string = '없음';
  private startTime: Date = new Date();

  public createTray(): void {
    try {
      // 투명 배경에 흰색 "T" 16x16 PNG (정확한 base64)
      const tIconData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAIElEQVR4nGNgGDTgP4mA+gbgcxXF3ho1YNQAigygCwAAY8evUW8RUBMAAAAASUVORK5CYII=';
      
      const icon = nativeImage.createFromDataURL(tIconData);
      
      // 크기가 정상인지 확인
      if (icon.isEmpty() || icon.getSize().width === 0) {
        throw new Error('T 아이콘 생성 실패');
      }
      
      // macOS Template 이미지로 설정 (다크/라이트 모드 자동 적응)
      icon.setTemplateImage(true);
      
      this.tray = new Tray(icon);
      console.log('✅ 투명 배경 흰색 "T" Template 아이콘으로 트레이 생성');
      
    } catch (error) {
      try {
        // 폴백: macOS 시스템 아이콘 중 깔끔한 것 선택
        console.log('🔄 다른 시스템 아이콘으로 재시도...');
        const icon = nativeImage.createFromNamedImage('NSStatusAvailable');
        if (!icon.isEmpty()) {
          this.tray = new Tray(icon);
          console.log('✅ 시스템 아이콘으로 트레이 생성');
        } else {
          throw new Error('시스템 아이콘 실패');
        }
        
      } catch (fallbackError) {
        // 최후의 수단 - 트레이 없이 실행
        console.log('⚠️ 트레이 아이콘 생성 실패 - 백그라운드 모드로 실행');
        this.tray = null;
        return;
      }
    }
    
    this.setupContextMenu();
    this.showStartupNotification();
  }

  private setupContextMenu(): void {
    if (!this.tray) return;

    const uptime = Math.floor((Date.now() - this.startTime.getTime()) / 1000 / 60); // 분 단위
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Usage Tracker',
        enabled: false
      },
      {
        type: 'separator'
      },
      {
        label: `상태: ${this.currentStatus}`,
        enabled: false
      },
      {
        label: `실행 시간: ${uptime}분`,
        enabled: false
      },
      {
        label: `마지막 감지: ${this.lastDetectedApp}`,
        enabled: false
      },
      {
        type: 'separator'
      },
      {
        label: '대시보드 열기',
        click: () => {
          this.openDashboard();
        }
      },
      {
        label: '로그 보기',
        click: () => {
          this.openLogFile();
        }
      },
      {
        label: '데이터 폴더 열기',
        click: () => {
          this.openDataFolder();
        }
      },
      {
        type: 'separator'
      },
      {
        label: '설정',
        click: () => {
          this.openSettings();
        }
      },
      {
        type: 'separator'
      },
      {
        label: '종료',
        click: () => {
          app.quit();
        }
      }
    ]);
    
    this.tray.setContextMenu(contextMenu);
    this.tray.setToolTip(`Usage Tracker - 실행 중 (${uptime}분)`);
    log.info('📱 시스템 트레이 메뉴 업데이트됨');
  }

  private showStartupNotification(): void {
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: 'Usage Tracker 시작됨',
        body: this.tray ? '백그라운드에서 사용량을 추적하고 있습니다.' : '백그라운드 모드로 실행 중입니다.',
        silent: false
      });
      notification.show();
    }
  }

  public updateMenu(statusText: string): void {
    this.currentStatus = statusText;
    this.setupContextMenu();
  }

  public updateLastDetectedApp(appName: string): void {
    this.lastDetectedApp = appName;
    this.setupContextMenu();
  }

  private openDashboard(): void {
    if (this.dashboardWindow && !this.dashboardWindow.isDestroyed()) {
      this.dashboardWindow.focus();
      return;
    }

    this.dashboardWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      title: 'Usage Tracker Dashboard',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../../preload.js')
      }
    });

    // React 빌드된 파일 로드
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
      this.dashboardWindow.loadURL('http://localhost:3000');
    } else {
      this.dashboardWindow.loadFile(path.join(__dirname, '../../build/index.html'));
    }

    this.dashboardWindow.on('closed', () => {
      this.dashboardWindow = null;
    });

    log.info('📊 대시보드 창 열림');
  }

  private openLogFile(): void {
    this.openLogViewer();
  }

  private openLogViewer(): void {
    // 이미 로그 뷰어가 열려있으면 포커스
    if (this.logViewerWindow && !this.logViewerWindow.isDestroyed()) {
      this.logViewerWindow.focus();
      return;
    }

    this.logViewerWindow = new BrowserWindow({
      width: 1000,
      height: 600,
      title: 'Usage Tracker - 로그 뷰어',
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    const logPath = log.transports.file.getFile().path;
    
    // 간단한 HTML 로그 뷰어 생성
    const logViewerHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>로그 뷰어</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            background: #1e1e1e;
            color: #d4d4d4;
            margin: 0;
            padding: 20px;
          }
          #log-container {
            background: #252526;
            border: 1px solid #3e3e42;
            border-radius: 4px;
            padding: 15px;
            height: calc(100vh - 100px);
            overflow-y: auto;
            white-space: pre-wrap;
            font-size: 12px;
            line-height: 1.4;
          }
          .log-header {
            background: #007acc;
            color: white;
            padding: 10px 15px;
            margin: -20px -20px 20px -20px;
            font-weight: bold;
          }
          .refresh-btn {
            background: #0e639c;
            color: white;
            border: none;
            padding: 8px 16px;
            margin-left: 10px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
          }
          .refresh-btn:hover {
            background: #1177bb;
          }
        </style>
      </head>
      <body>
        <div class="log-header">
          Usage Tracker 로그 뷰어
          <button class="refresh-btn" onclick="refreshLog()">새로고침</button>
          <button class="refresh-btn" onclick="autoRefresh()">자동 새로고침 ON/OFF</button>
        </div>
        <div id="log-container">로그를 불러오는 중...</div>
        
        <script>
          const { readFileSync } = require('fs');
          const logPath = '${logPath.replace(/\\/g, '\\\\')}';
          let autoRefreshInterval = null;
          let isAutoRefresh = false;
          
          function loadLog() {
            try {
              const logContent = readFileSync(logPath, 'utf8');
              const container = document.getElementById('log-container');
              container.textContent = logContent;
              // 항상 맨 아래로 스크롤
              container.scrollTop = container.scrollHeight;
            } catch (error) {
              document.getElementById('log-container').textContent = '로그 파일을 읽을 수 없습니다: ' + error.message;
            }
          }
          
          function refreshLog() {
            loadLog();
          }
          
          function autoRefresh() {
            if (isAutoRefresh) {
              clearInterval(autoRefreshInterval);
              isAutoRefresh = false;
            } else {
              autoRefreshInterval = setInterval(loadLog, 2000); // 2초마다 새로고침
              isAutoRefresh = true;
            }
          }
          
          // 초기 로드
          loadLog();
          
          // 자동 새로고침 시작
          autoRefresh();
        </script>
      </body>
      </html>
    `;

    this.logViewerWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(logViewerHTML));

    this.logViewerWindow.on('closed', () => {
      this.logViewerWindow = null;
    });

    log.info('📄 전용 로그 뷰어 열림:', logPath);
  }

  private openDataFolder(): void {
    const usageTrackerPath = path.join(os.homedir(), 'Documents', 'UsageTracker');
    const dataPath = path.join(usageTrackerPath, 'data');
    const logsPath = path.join(usageTrackerPath, 'logs');
    
    try {
      // UsageTracker 폴더 생성 (없으면)
      if (!fs.existsSync(usageTrackerPath)) {
        fs.mkdirSync(usageTrackerPath, { recursive: true });
        log.info('📁 UsageTracker 폴더 생성됨:', usageTrackerPath);
      }
      
      // data 폴더 생성 (없으면)
      if (!fs.existsSync(dataPath)) {
        fs.mkdirSync(dataPath, { recursive: true });
        log.info('📁 데이터 폴더 생성됨:', dataPath);
      }
      
      // logs 폴더 생성 (없으면)
      if (!fs.existsSync(logsPath)) {
        fs.mkdirSync(logsPath, { recursive: true });
        log.info('📁 로그 폴더 생성됨:', logsPath);
      }
      
      // 데이터 폴더 열기
      shell.openPath(dataPath).then(() => {
        log.info('📁 데이터 폴더 열림:', dataPath);
      }).catch((error) => {
        log.error('❌ 데이터 폴더 열기 실패:', error);
        // 폴백: UsageTracker 폴더 열기
        shell.openPath(usageTrackerPath).catch((fallbackError) => {
          log.error('❌ UsageTracker 폴더 열기도 실패:', fallbackError);
          // 최종 폴백: Documents 폴더 열기
          shell.openPath(path.join(os.homedir(), 'Documents'));
        });
      });
      
    } catch (error) {
      log.error('❌ 폴더 생성 또는 접근 실패:', error);
      // 에러 발생 시 Documents 폴더 열기
      shell.openPath(path.join(os.homedir(), 'Documents'));
    }
  }

  private openSettings(): void {
    // 간단한 알림으로 설정 안내
    const notification = new Notification({
      title: 'Usage Tracker 설정',
      body: '설정은 .env 파일에서 GITHUB_TOKEN과 GIST_ID를 설정하세요.\n로그에서 현재 설정 상태를 확인할 수 있습니다.',
      silent: false
    });
    notification.show();
    log.info('⚙️ 설정 안내 표시됨');
  }

  public destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
    
    if (this.dashboardWindow && !this.dashboardWindow.isDestroyed()) {
      this.dashboardWindow.close();
      this.dashboardWindow = null;
    }
    
    if (this.logViewerWindow && !this.logViewerWindow.isDestroyed()) {
      this.logViewerWindow.close();
      this.logViewerWindow = null;
    }
  }
}