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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemMonitor = void 0;
const os = __importStar(require("os"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class SystemMonitor {
    constructor() {
        this.platform = this.detectPlatform();
        // macOS에서 권한 상태 확인
        if (this.platform === 'macos') {
            this.checkMacOSPermissions();
        }
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
    async checkMacOSPermissions() {
        try {
            console.log('🔐 [권한 확인] macOS 접근성 권한 상태 확인 중...');
            // 간단한 System Events 접근 테스트
            const { stdout: testResult } = await execAsync(`
        osascript -e '
        try
            tell application "System Events"
                set frontApp to name of first application process whose frontmost is true
                return "success:" & frontApp
            end tell
        on error errMsg
            return "error:" & errMsg
        end try
        '
      `, { timeout: 3000 });
            const result = testResult.trim();
            if (result.startsWith('success:')) {
                const appName = result.substring(8);
                console.log(`✅ [권한 확인] 접근성 권한 OK - 현재 앱: ${appName}`);
            }
            else if (result.startsWith('error:')) {
                const errorMsg = result.substring(6);
                console.error(`🚫 [권한 확인] 접근성 권한 문제:`, errorMsg);
                if (errorMsg.includes('not allowed') || errorMsg.includes('accessibility')) {
                    console.error('⚠️ [권한 확인] "Usage Tracker" 앱에 접근성 권한을 부여해야 합니다!');
                    console.error('💡 [권한 확인] 시스템 환경설정 > 보안 및 개인 정보 보호 > 개인 정보 보호 > 접근성에서 설정하세요');
                }
            }
        }
        catch (error) {
            console.error('❌ [권한 확인] 권한 상태 확인 실패:', error);
        }
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
            console.log(`🔍 [SystemMonitor] 포커스된 앱 감지 시작 (플랫폼: ${this.platform})`);
            let result = null;
            if (this.platform === 'macos') {
                result = await this.getMacOSFocusedApp();
            }
            else if (this.platform === 'windows') {
                result = await this.getWindowsFocusedApp();
            }
            else {
                result = 'Android App';
            }
            console.log(`🎯 [SystemMonitor] 감지된 앱: ${result || 'null'}`);
            return result;
        }
        catch (error) {
            console.error('❌ [SystemMonitor] 포커스된 앱 감지 오류:', error);
            return null;
        }
    }
    async getMacOSFocusedApp() {
        try {
            console.log('🍎 [macOS] 1차: Bundle Identifier 기반 앱 감지 시도...');
            // 1차: Bundle Identifier 기반 정확한 앱 감지
            const bundleResult = await this.getAppByBundleIdentifier();
            if (bundleResult) {
                console.log(`✅ [macOS] Bundle ID로 감지 성공: ${bundleResult}`);
                return bundleResult;
            }
            console.log('📋 [macOS] 2차: Window Title 기반 감지 시도...');
            // 2차: Window Title 기반 감지 (폴백)
            const windowResult = await this.getAppByWindowTitle();
            if (windowResult) {
                console.log(`✅ [macOS] Window Title로 감지 성공: ${windowResult}`);
                return windowResult;
            }
            console.log('🔧 [macOS] 3차: Process Name 기반 감지 시도...');
            // 3차: 기존 방식 (최종 폴백)
            const processResult = await this.getAppByProcessName();
            console.log(`🎯 [macOS] Process Name 결과: ${processResult || 'null'}`);
            return processResult;
        }
        catch (error) {
            console.error('❌ [macOS] 앱 감지 오류:', error);
            return null;
        }
    }
    async getAppByBundleIdentifier() {
        try {
            console.log('🔍 [Bundle ID] AppleScript 실행 중...');
            const { stdout: bundleId } = await execAsync(`
        osascript -e '
        try
            tell application "System Events"
                set frontApp to first application process whose frontmost is true
                set bundleId to bundle identifier of frontApp
                set appName to name of frontApp
                return bundleId & "|" & appName
            end tell
        on error errMsg
            return "error:" & errMsg
        end try
        '
      `);
            const result = bundleId.trim();
            console.log(`📝 [Bundle ID] AppleScript 결과: ${result}`);
            if (result.startsWith('error:')) {
                console.log(`⚠️ [Bundle ID] AppleScript 에러: ${result.substring(6)}`);
                return null;
            }
            if (result === 'error' || !result.includes('|')) {
                console.log('❌ [Bundle ID] 잘못된 결과 형식');
                return null;
            }
            const [bundle, processName] = result.split('|');
            console.log(`🎯 [Bundle ID] 파싱된 정보: Bundle=${bundle}, Process=${processName}`);
            const actualName = this.getActualAppName(bundle, processName);
            console.log(`✨ [Bundle ID] 최종 앱 이름: ${actualName}`);
            return actualName;
        }
        catch (error) {
            console.error('❌ [Bundle ID] 감지 오류:', error);
            // 권한 문제인지 확인
            if (error.message.includes('not allowed') || error.message.includes('permission')) {
                console.error('🚫 [Bundle ID] 접근성 권한 문제일 수 있습니다!');
            }
            return null;
        }
    }
    async getAppByWindowTitle() {
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
        }
        catch (error) {
            console.error('Window title 감지 오류:', error);
            return null;
        }
    }
    async getAppByProcessName() {
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
        }
        catch (error) {
            console.error('Process name 감지 오류:', error);
            return null;
        }
    }
    getActualAppName(bundleId, processName) {
        // Bundle Identifier를 기반으로 실제 앱 이름 반환
        const bundleMap = {
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
    getAppNameByWindowTitle(processName, windowTitle) {
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
    async getWindowsFocusedApp() {
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
        }
        catch (error) {
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
            }
            catch (fallbackError) {
                console.error('Windows 폴백 감지도 실패:', fallbackError);
            }
            return null;
        }
    }
    getWindowsAppName(processName, windowTitle) {
        // Windows 프로세스 이름을 앱 이름으로 매핑
        const processMap = {
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
exports.SystemMonitor = SystemMonitor;
