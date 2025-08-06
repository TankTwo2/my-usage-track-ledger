"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrayService = void 0;
const electron_1 = require("electron");
class TrayService {
    constructor() {
        this.tray = null;
    }
    createTray() {
        try {
            // 투명 배경에 흰색 "T" 16x16 PNG (정확한 base64)
            const tIconData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAIElEQVR4nGNgGDTgP4mA+gbgcxXF3ho1YNQAigygCwAAY8evUW8RUBMAAAAASUVORK5CYII=';
            const icon = electron_1.nativeImage.createFromDataURL(tIconData);
            // 크기가 정상인지 확인
            if (icon.isEmpty() || icon.getSize().width === 0) {
                throw new Error('T 아이콘 생성 실패');
            }
            // macOS Template 이미지로 설정 (다크/라이트 모드 자동 적응)
            icon.setTemplateImage(true);
            this.tray = new electron_1.Tray(icon);
            console.log('✅ 투명 배경 흰색 "T" Template 아이콘으로 트레이 생성');
        }
        catch (error) {
            try {
                // 폴백: macOS 시스템 아이콘 중 깔끔한 것 선택
                console.log('🔄 다른 시스템 아이콘으로 재시도...');
                const icon = electron_1.nativeImage.createFromNamedImage('NSStatusAvailable');
                if (!icon.isEmpty()) {
                    this.tray = new electron_1.Tray(icon);
                    console.log('✅ 시스템 아이콘으로 트레이 생성');
                }
                else {
                    throw new Error('시스템 아이콘 실패');
                }
            }
            catch (fallbackError) {
                // 최후의 수단 - 트레이 없이 실행
                console.log('⚠️ 트레이 아이콘 생성 실패 - 백그라운드 모드로 실행');
                this.tray = null;
                return;
            }
        }
        this.setupContextMenu();
        this.showStartupNotification();
    }
    setupContextMenu() {
        if (!this.tray)
            return;
        const contextMenu = electron_1.Menu.buildFromTemplate([
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
                    electron_1.shell.openExternal('http://localhost:3000');
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
    showStartupNotification() {
        if (electron_1.Notification.isSupported()) {
            const notification = new electron_1.Notification({
                title: 'Usage Tracker 시작됨',
                body: this.tray ? '백그라운드에서 사용량을 추적하고 있습니다.' : '백그라운드 모드로 실행 중입니다.',
                silent: false
            });
            notification.show();
        }
    }
    updateMenu(statusText) {
        if (!this.tray)
            return;
        const contextMenu = electron_1.Menu.buildFromTemplate([
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
                    electron_1.shell.openExternal('http://localhost:3000');
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
    destroy() {
        if (this.tray) {
            this.tray.destroy();
            this.tray = null;
        }
    }
}
exports.TrayService = TrayService;
