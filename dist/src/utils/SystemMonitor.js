"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemMonitor = void 0;
const os = __importStar(require("os"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class SystemMonitor {
    constructor() {
        this.platform = this.detectPlatform();
    }
    detectPlatform() {
        const platform = os.platform();
        if (platform === 'win32')
            return 'windows';
        if (platform === 'darwin')
            return 'macos';
        if (platform === 'android')
            return 'android';
        return 'macos'; // 기본값
    }
    async getSystemInfo() {
        return {
            platform: this.platform,
            hostname: os.hostname(),
            arch: os.arch(),
            uptime: Math.floor(os.uptime()),
            message: '시스템 모니터링 중',
        };
    }
    async getFocusedApp() {
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
            }
            else if (this.platform === 'windows') {
                // Windows용 포커스된 앱 감지 (나중에 구현)
                return 'Windows App';
            }
            else {
                return 'Android App';
            }
        }
        catch (error) {
            console.error('포커스된 앱 감지 오류:', error);
            return null;
        }
    }
}
exports.SystemMonitor = SystemMonitor;
