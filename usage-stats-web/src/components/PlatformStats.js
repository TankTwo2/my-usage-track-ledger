import React from 'react';
import { formatTime } from '../utils/formatTime';

const PlatformStats = ({ platform, stats, apps }) => {
    const platformNames = {
        windows: 'Windows',
        macos: 'macOS',
        android: 'Android',
    };

    const platformIcons = {
        windows: '🪟',
        macos: '🍎',
        android: '🤖',
    };

    return (
        <section className="platform-stats">
            <h3>
                <span className="platform-icon">{platformIcons[platform]}</span>
                {platformNames[platform] || platform}
            </h3>
            <div className="stats-grid">
                <div className="stat-card">
                    <h4>사용한 앱 수</h4>
                    <div className="stat-value">{stats?.total_apps || 0}개</div>
                </div>
                <div className="stat-card">
                    <h4>총 사용 시간</h4>
                    <div className="stat-value">{formatTime(stats?.total_usage_seconds || 0)}</div>
                </div>
            </div>
            {apps && apps.length > 0 && (
                <div className="usage-list">
                    {apps
                        .sort((a, b) => b.total_usage_seconds - a.total_usage_seconds)
                        .slice(0, 5)
                        .map((app, index) => (
                            <div key={`${platform}-${app.app_name}-${index}`} className="usage-item">
                                <div className="app-name">{app.app_name}</div>
                                <div className="usage-time">{formatTime(app.total_usage_seconds)}</div>
                            </div>
                        ))}
                    {apps.length > 5 && (
                        <div className="more-apps">
                            그 외 {apps.length - 5}개 앱...
                        </div>
                    )}
                </div>
            )}
        </section>
    );
};

export default PlatformStats;