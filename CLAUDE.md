# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a desktop usage tracking application built with Electron + React that monitors app usage across platforms (Windows, macOS, Android) and automatically backs up data to GitHub Gist.

### Architecture

The application has a **dual-layer architecture**:

1. **Electron Main Process** (`main.ts`): Background service that runs system monitoring and data collection
2. **React Frontend** (`src/App.tsx`): Web UI for viewing usage statistics and managing backups

**Key Services:**
- `UsageTracker`: Collects app usage samples every 1 second, processes in batches of 10
- `BackupService`: Handles automated GitHub Gist backups (configurable interval, default 1 minute for testing)  
- `TrayService`: Creates system tray icon with menu for background operation
- `SystemMonitor`: Platform-specific app detection and usage monitoring
- `GistBackup`: GitHub Gist API integration for cloud storage

**Data Flow:**
1. SystemMonitor detects active apps → UsageTracker buffers samples
2. Every 10 samples, UsageTracker processes batch and updates cache
3. BackupService periodically syncs cache to GitHub Gist
4. React frontend displays real-time stats from cache

## Development Commands

### Build & Run
```bash
# Start React development server
npm start

# Build main Electron process (TypeScript compilation)
npm run build-main

# Run Electron app (builds main first)
npm run electron

# Development mode (React + Electron concurrently)
npm run electron-dev

# Package for distribution
npm run electron-pack
```

### Code Quality
```bash
# Lint TypeScript/JavaScript files
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Run tests
npm test
```

## Configuration

### GitHub Integration
- GitHub token and Gist ID are currently hardcoded in `main.ts:12-13` and `src/App.tsx:10-11`
- Auto-backup interval is set to 1 minute for testing (`main.ts:48`) - change to 5 minutes for production

### File Structure
```
src/
├── services/        # Core business logic
│   ├── UsageTracker.ts    # App usage monitoring
│   ├── BackupService.ts   # Gist backup management
│   ├── TrayService.ts     # System tray integration
│   ├── GistService.ts     # Gist API client
│   └── DataService.ts     # Data persistence
├── utils/
│   ├── SystemMonitor.ts   # Platform-specific monitoring
│   └── GistBackup.ts      # Gist backup utilities
├── types/
│   └── index.ts           # TypeScript definitions
├── components/
│   ├── TotalStats.tsx     # Daily usage overview
│   └── PlatformStats.tsx  # Per-platform statistics
└── hooks/
    └── useUsageData.ts    # React state management
```

## Critical Implementation Details

### Usage Tracking Strategy
- **1-second sampling** for responsive monitoring
- **10-sample batching** to balance performance with data accuracy
- **Graceful shutdown** ensures no data loss (processes remaining buffer on app quit)

### Platform Detection
The SystemMonitor uses different methods per platform:
- **macOS**: AppleScript for frontmost application detection
- **Windows**: Windows API calls (ps-list package)
- **Android**: Future implementation planned

### Data Persistence
- **Primary storage**: GitHub Gist (cloud backup)
- **Fallback**: Local URL parameters (browser storage)
- **Cache**: In-memory for real-time updates

### Error Handling
- Backup failures are logged but don't interrupt tracking
- Missing Gist data triggers clean initialization
- Electron API unavailability gracefully degrades to browser mode

## Development Notes

- The app runs as a **background-only** Electron app (no main window, dock hidden on macOS)
- System tray provides access to quit functionality
- React frontend is accessible via localhost:3000 during development
- All hardcoded credentials should be moved to environment variables for production use