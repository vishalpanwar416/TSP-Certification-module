import {
    Home,
    Award,
    BarChart3,
    Users,
    Calendar,
    Settings,
    HelpCircle,
    LogOut,
    ChevronLeft,
    Share2,
    MessageSquare
} from 'lucide-react';

const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'certificates', label: 'Certificates', icon: Award },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'users', label: 'Recipients', icon: Users },
    { id: 'calendar', label: 'Schedule', icon: Calendar },
    { id: 'social-media', label: 'Social Media', icon: MessageSquare },
];

const bottomNavItems = [
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help & Support', icon: HelpCircle },
];

function Sidebar({
    activeTab,
    onTabChange,
    user,
    onLogout,
    sidebarCollapsed,
    setSidebarCollapsed,
    sidebarHovered,
    setSidebarHovered,
    mobileMenuOpen,
    setMobileMenuOpen
}) {
    // Debug: Log nav items to verify social-media is included
    console.log('Sidebar navItems:', navItems);
    
    return (
        <>
            <aside
                className={`sidebar ${sidebarCollapsed && !sidebarHovered ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''} ${sidebarHovered && sidebarCollapsed ? 'hovered' : ''}`}
                onMouseEnter={() => {
                    if (sidebarCollapsed) {
                        setSidebarHovered(true);
                    }
                }}
                onMouseLeave={() => {
                    setSidebarHovered(false);
                }}
            >
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <img
                            src="/logo.svg"
                            alt="TSP Logo"
                            className="logo-image"
                        />
                        {(!sidebarCollapsed || sidebarHovered) && (
                            <div className="sidebar-brand-container">
                                <span className="sidebar-brand">TSP Certs</span>
                                <span className="sidebar-brand-sub">Marketing Dashboard</span>
                            </div>
                        )}
                    </div>
                    <button
                        className="sidebar-toggle"
                        onClick={() => {
                            const newCollapsed = !sidebarCollapsed;
                            setSidebarCollapsed(newCollapsed);
                        }}
                        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        <ChevronLeft size={18} style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    <div className="nav-section">
                        {(!sidebarCollapsed || sidebarHovered) && <span className="nav-section-title">Main Menu</span>}
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
                                onClick={() => onTabChange(item.id)}
                                title={sidebarCollapsed && !sidebarHovered ? item.label : ''}
                            >
                                <item.icon size={20} />
                                {(!sidebarCollapsed || sidebarHovered) && <span>{item.label}</span>}
                            </button>
                        ))}
                    </div>
                </nav>

                <div className="sidebar-footer">
                    <div className="nav-section">
                        {(!sidebarCollapsed || sidebarHovered) && <span className="nav-section-title">Support</span>}
                        {bottomNavItems.map((item) => (
                            <button
                                key={item.id}
                                className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
                                onClick={() => onTabChange(item.id)}
                                title={sidebarCollapsed && !sidebarHovered ? item.label : ''}
                            >
                                <item.icon size={20} />
                                {(!sidebarCollapsed || sidebarHovered) && <span>{item.label}</span>}
                            </button>
                        ))}
                    </div>

                    <div className="user-profile-section">
                        <div className="user-avatar">
                            {user?.email?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        {(!sidebarCollapsed || sidebarHovered) && (
                            <div className="user-info">
                                <span className="user-name">{user?.email?.split('@')[0] || 'User'}</span>
                                <span className="user-email">{user?.email || 'admin@tsp.com'}</span>
                            </div>
                        )}
                        <button
                            className="logout-btn"
                            onClick={onLogout}
                            title="Logout"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Overlay */}
            {mobileMenuOpen && (
                <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
            )}
        </>
    );
}

export default Sidebar;
