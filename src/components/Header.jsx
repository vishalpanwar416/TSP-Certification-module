import { Bell, Search, Moon, Sun } from 'lucide-react';
import { useState } from 'react';

function Header({ title, subtitle }) {
    const [darkMode, setDarkMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
        // You can implement dark mode toggle here
        document.documentElement.classList.toggle('dark-mode');
    };

    return (
        <header className="main-header">
            <div className="header-left">
                <div className="header-title-section">
                    <h1 className="header-title">{title}</h1>
                    {subtitle && <p className="header-subtitle">{subtitle}</p>}
                </div>
            </div>

            <div className="header-right">
                <div className="header-search">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search certificates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                </div>

                <button
                    className="header-icon-btn"
                    onClick={toggleDarkMode}
                    title={darkMode ? 'Light Mode' : 'Dark Mode'}
                >
                    {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                <button className="header-icon-btn notification-btn" title="Notifications">
                    <Bell size={20} />
                    <span className="notification-badge">3</span>
                </button>
            </div>
        </header>
    );
}

export default Header;
