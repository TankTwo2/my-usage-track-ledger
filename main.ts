import { app, BrowserWindow } from 'electron';
import * as path from 'path';

function createWindow() {
  const win = new BrowserWindow({
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

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});