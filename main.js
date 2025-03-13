"use strict";
exports.__esModule = true;
var electron_1 = require("electron");
function createWindow() {
    var win = new electron_1.BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    // React 개발 서버 주소로 변경
    win.loadURL('http://localhost:3000');
    // React 개발 서버 주소로 변경
    // win.loadFile(path.join(__dirname, '../src/index.html')); 
    // 개발자 도구를 열기 위한 옵션 (선택사항)
    win.webContents.openDevTools();
}
electron_1.app.whenReady().then(createWindow);
electron_1.app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', function () {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
