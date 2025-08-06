import { Tray, Menu, nativeImage, Notification, shell } from 'electron';

export class TrayService {
  private tray: Tray | null = null;

  public createTray(): void {
    try {
      // 회색 배경에 흰색 "T" 16x16 PNG (정확한 base64)
      const tIconData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAAGRJREFUOI2t0zEKwDAMQ9HXeBsP4Ck8hfd0G7d1C7du6xZu4RYu3MKt27qFW7iFW7iFW7iFWyiJCfInTizFlni7995778UY43zf913XdVVVVcaYEEIwxpgQ4q+B8zzvvRdCCGPM3wO4yg8h4wPaogAAAABJRU5ErkJggg==';
      
      const icon = nativeImage.createFromDataURL(tIconData);
      
      // 크기가 정상인지 확인
      if (icon.isEmpty() || icon.getSize().width === 0) {
        throw new Error('T 아이콘 생성 실패');
      }
      
      this.tray = new Tray(icon);
      console.log('✅ 회색 배경 "T" 아이콘으로 트레이 생성');
      
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

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Usage Tracker (백그라운드)',
        enabled: false
      },
      {
        type: 'separator'
      },
      {
        label: '상태: 트래킹 중...',
        enabled: false
      },
      {
        label: '웹 대시보드 열기',
        click: () => {
          shell.openExternal('http://localhost:3000');
        }
      },
      {
        type: 'separator'
      },
      {
        label: '종료',
        click: () => {
          require('electron').app.quit();
        }
      }
    ]);
    
    this.tray.setContextMenu(contextMenu);
    this.tray.setToolTip('Usage Tracker - 백그라운드에서 실행 중');
    console.log('📱 시스템 트레이 생성됨');
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
    if (!this.tray) return;
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Usage Tracker (백그라운드)',
        enabled: false
      },
      {
        type: 'separator'
      },
      {
        label: statusText,
        enabled: false
      },
      {
        label: '웹 대시보드 열기',
        click: () => {
          shell.openExternal('http://localhost:3000');
        }
      },
      {
        type: 'separator'
      },
      {
        label: '종료',
        click: () => {
          require('electron').app.quit();
        }
      }
    ]);
    
    this.tray.setContextMenu(contextMenu);
  }

  public destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}