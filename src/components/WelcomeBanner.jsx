import { Plus, FileSpreadsheet } from 'lucide-react';

function WelcomeBanner({ onCreateClick, onExportClick, hasCertificates }) {
    return (
        <div className="welcome-banner">
            <div className="banner-content">
                <div className="banner-text">
                    <h2>Welcome back! 👋</h2>
                    <p>Manage your certificates, track deliveries, and export reports all in one place.</p>
                </div>
                <div className="banner-actions">
                    <button 
                        className="btn btn-light" 
                        onClick={onExportClick} 
                        disabled={!hasCertificates}
                    >
                        <FileSpreadsheet size={18} />
                        Export Excel
                    </button>
                    <button className="btn btn-primary" onClick={onCreateClick}>
                        <Plus size={18} />
                        Create Certificate
                    </button>
                </div>
            </div>
            <div className="banner-decoration"></div>
        </div>
    );
}

export default WelcomeBanner;
