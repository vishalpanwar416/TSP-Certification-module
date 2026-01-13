import { Bell, Plus, Menu } from 'lucide-react';

function Header({
    activeTab,
    currentDate,
    onMenuClick,
    onCreateClick,
    pendingCount = 0
}) {
    const getTitle = () => {
        const titles = {
            dashboard: 'Dashboard',
            certificates: 'Certificates',
            analytics: 'Analytics',
            users: 'Recipients',
            calendar: 'Schedule',
            'social-media': 'Social Media Automation',
            settings: 'Settings',
            help: 'Help & Support'
        };
        return titles[activeTab] || 'Dashboard';
    };

    return (
        <header className="main-header">
            <div className="header-left">
                <button className="mobile-menu-btn" onClick={onMenuClick}>
                    <Menu size={24} />
                </button>
                <div className="header-title-section">
                    <h1 className="header-title">{getTitle()}</h1>
                    <p className="header-subtitle">{currentDate}</p>
                </div>
            </div>

            <div className="header-right">
                <button className="header-icon-btn notification-btn">
                    <Bell size={20} />
                    {pendingCount > 0 && (
                        <span className="notification-badge">{pendingCount > 9 ? '9+' : pendingCount}</span>
                    )}
                </button>

                {activeTab !== 'social-media' && (
                    <button
                        className="btn btn-primary create-btn"
                        onClick={onCreateClick}
                    >
                        <Plus size={18} />
                        <span>New Certificate</span>
                    </button>
                )}
            </div>
        </header>
    );
}

export default Header;
