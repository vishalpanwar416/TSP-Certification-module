import {
    Award,
    LayoutDashboard,
    FileText,
    Send,
    Settings,
    Users,
    BarChart3,
    Menu,
    X
} from 'lucide-react';
import { useState } from 'react';

function Sidebar({ activeTab, setActiveTab }) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'certificates', label: 'Certificates', icon: FileText },
        { id: 'send', label: 'Send WhatsApp', icon: Send },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'recipients', label: 'Recipients', icon: Users },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    return (
        <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <Award size={32} color="#d32f2f" />
                    {!isCollapsed && <span className="sidebar-brand">CertSender</span>}
                </div>
                <button
                    className="sidebar-toggle"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    title={isCollapsed ? 'Expand' : 'Collapse'}
                >
                    {isCollapsed ? <Menu size={20} /> : <X size={20} />}
                </button>
            </div>

            <nav className="sidebar-nav">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(item.id)}
                            title={isCollapsed ? item.label : ''}
                        >
                            <Icon size={20} />
                            {!isCollapsed && <span>{item.label}</span>}
                        </button>
                    );
                })}
            </nav>

            <div className="sidebar-footer">
                <div className="sidebar-item">
                    <div className="user-avatar">
                        <Users size={20} />
                    </div>
                    {!isCollapsed && (
                        <div className="user-info">
                            <div className="user-name">Admin User</div>
                            <div className="user-email">admin@certapp.com</div>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;
