import React from 'react';
import { formatTime } from '../utils/formatTime';

const PlatformStats = ({ platform, stats, apps }) => {
    const platformNames = {
        windows: 'Windows',
        macos: 'macOS',
        android: 'Android',
    };

    return (
        <section className="platform-stats">
            <h3>{platformNames[platform] || platform}</h3>
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
                    {apps.slice(0, 5).map((app, index) => (
                        <div key={index} className="usage-item">
                            <div className="app-name">{app.app_name}</div>
                            <div className="usage-time">{formatTime(app.total_usage_seconds)}</div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
};

export default PlatformStats;
