import { BarChart3, TrendingUp, Eye, Heart, MessageCircle, Share, Users } from 'lucide-react';

function InsightsView({ insights, platforms }) {
    if (!insights) {
        return (
            <div className="insights-view">
                <div className="empty-state">
                    <BarChart3 size={64} />
                    <h3>No insights available</h3>
                    <p>Insights will appear here once you start posting</p>
                </div>
            </div>
        );
    }

    return (
        <div className="insights-view">
            {/* Overview Stats */}
            <div className="insights-stats-grid">
                <div className="insight-stat-card">
                    <div className="stat-icon" style={{ backgroundColor: '#3B82F620', color: '#3B82F6' }}>
                        <TrendingUp size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Total Posts</span>
                        <span className="stat-value">{insights.totalPosts || 0}</span>
                    </div>
                </div>
                <div className="insight-stat-card">
                    <div className="stat-icon" style={{ backgroundColor: '#10B98120', color: '#10B981' }}>
                        <Eye size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Total Reach</span>
                        <span className="stat-value">{insights.totalReach?.toLocaleString() || 0}</span>
                    </div>
                </div>
                <div className="insight-stat-card">
                    <div className="stat-icon" style={{ backgroundColor: '#F59E0B20', color: '#F59E0B' }}>
                        <Heart size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Total Engagement</span>
                        <span className="stat-value">{insights.totalEngagement?.toLocaleString() || 0}</span>
                    </div>
                </div>
                <div className="insight-stat-card">
                    <div className="stat-icon" style={{ backgroundColor: '#8B5CF620', color: '#8B5CF6' }}>
                        <Users size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Engagement Rate</span>
                        <span className="stat-value">
                            {insights.totalReach > 0 
                                ? ((insights.totalEngagement / insights.totalReach) * 100).toFixed(1) 
                                : 0}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Platform Stats */}
            <div className="platform-insights-section">
                <h3>Platform Performance</h3>
                <div className="platform-insights-grid">
                    {platforms.map(platform => {
                        const stats = insights.platformStats?.[platform.id] || { posts: 0, reach: 0, engagement: 0 };
                        const Icon = platform.icon;
                        return (
                            <div key={platform.id} className="platform-insight-card">
                                <div className="platform-insight-header" style={{ borderLeftColor: platform.color }}>
                                    <Icon size={24} style={{ color: platform.color }} />
                                    <span>{platform.name}</span>
                                </div>
                                <div className="platform-insight-stats">
                                    <div className="platform-stat">
                                        <span className="stat-label">Posts</span>
                                        <span className="stat-value">{stats.posts || 0}</span>
                                    </div>
                                    <div className="platform-stat">
                                        <span className="stat-label">Reach</span>
                                        <span className="stat-value">{stats.reach?.toLocaleString() || 0}</span>
                                    </div>
                                    <div className="platform-stat">
                                        <span className="stat-label">Engagement</span>
                                        <span className="stat-value">{stats.engagement?.toLocaleString() || 0}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Engagement Breakdown */}
            <div className="engagement-breakdown">
                <h3>Engagement Breakdown</h3>
                <div className="engagement-stats">
                    <div className="engagement-stat">
                        <Heart size={20} />
                        <span className="label">Likes</span>
                        <span className="value">{insights.totalLikes?.toLocaleString() || 0}</span>
                    </div>
                    <div className="engagement-stat">
                        <MessageCircle size={20} />
                        <span className="label">Comments</span>
                        <span className="value">{insights.totalComments?.toLocaleString() || 0}</span>
                    </div>
                    <div className="engagement-stat">
                        <Share size={20} />
                        <span className="label">Shares</span>
                        <span className="value">{insights.totalShares?.toLocaleString() || 0}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default InsightsView;
