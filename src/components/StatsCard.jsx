import { FileText, CheckCircle, Clock, BarChart3 } from 'lucide-react';

const iconMap = {
    FileText,
    CheckCircle,
    Clock,
    BarChart3
};

function StatsCard({ 
    label, 
    value, 
    changeText, 
    changeType = 'positive', 
    icon: Icon, 
    progress = 0,
    variant = 'primary'
}) {
    return (
        <div className={`stat-card stat-card-${variant}`}>
            <div className="stat-card-content">
                <div className="stat-info">
                    <span className="stat-label">{label}</span>
                    <span className="stat-value">{value}</span>
                    <span className={`stat-change ${changeType}`}>
                        {Icon && <Icon size={14} />}
                        {changeText}
                    </span>
                </div>
                <div className={`stat-icon-wrapper stat-icon-${variant}`}>
                    {Icon && <Icon size={24} />}
                </div>
            </div>
            <div className="stat-progress">
                <div 
                    className={`stat-progress-bar ${variant}`} 
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
        </div>
    );
}

export default StatsCard;
