import React from 'react';
import { formatTime } from '../utils/formatTime';

const TotalStats = ({ dailyStats, appUsage }) => {
    const filteredApps = appUsage?.filter((app) => app.total_usage_seconds > 0) || [];

    return (
        <section className="total-stats">
            <h2>전체 통계</h2>
            <div className="stats-grid">
                <div className="stat-card">
                    <h3>사용한 앱 수</h3>
                    <div className="stat-value">{dailyStats?.total_apps || 0}개</div>
                </div>
                <div className="stat-card">
                    <h3>총 사용 시간</h3>
                    <div className="stat-value">{formatTime(dailyStats?.total_usage_seconds || 0)}</div>
                </div>
            </div>

            {filteredApps.length > 0 ? (
                <div className="app-usage-section">
                    <h3>앱별 사용량</h3>
                    <div className="usage-list">
                        {filteredApps.map((app, index) => (
                            <div key={index} className="usage-item">
                                <div className="app-name">{app.app_name}</div>
                                <div className="usage-time">{formatTime(app.total_usage_seconds)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="no-data">
                    <p>아직 사용량 데이터가 없습니다. 잠시 후 다시 확인해주세요.</p>
                </div>
            )}
        </section>
    );
};

export default TotalStats;
