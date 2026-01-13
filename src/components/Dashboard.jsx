import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { certificateAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { getCurrentDate, formatDate } from '../utils/dateUtils';

// Modular Components
import Sidebar from './Sidebar';
import Header from './Header';
import WelcomeBanner from './WelcomeBanner';
import StatsGrid from './StatsGrid';
import CertificatesTable from './CertificatesTable';
import CertificatePreviewModal from './CertificatePreviewModal';
import CreateCertificateModal from './CreateCertificateModal';
import SendCertificateModal from './SendCertificateModal';
import SocialMediaAutomation from './SocialMediaAutomation';

function Dashboard() {
    const { logout, user } = useAuth();
    const [certificates, setCertificates] = useState([]);
    const [stats, setStats] = useState({ total: 0, whatsapp_sent: 0, pending: 0 });
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showSendModal, setShowSendModal] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [selectedCertificate, setSelectedCertificate] = useState(null);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [sidebarHovered, setSidebarHovered] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');

    // Fetch certificates
    const fetchCertificates = async () => {
        try {
            setLoading(true);
            const response = await certificateAPI.getAll();
            const certificates = Array.isArray(response) ? response : [];
            setCertificates(certificates);
        } catch (error) {
            console.error('Error fetching certificates:', error);
            const errorMessage = error.message || 'Failed to load certificates';
            alert(`Failed to load certificates: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    // Fetch statistics
    const fetchStats = async () => {
        try {
            const response = await certificateAPI.getStats();
            const statsData = response || {};
            setStats({
                total: statsData.total || 0,
                whatsapp_sent: statsData.whatsapp_sent || 0,
                pending: statsData.pending || 0
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    useEffect(() => {
        fetchCertificates();
        fetchStats();
    }, []);

    // Use all certificates (no filtering)
    const filteredCertificates = certificates;
    
    // Get current date
    const currentDate = getCurrentDate();

    // Handle create certificate
    const handleCreateSuccess = () => {
        setShowCreateModal(false);
        fetchCertificates();
        fetchStats();
    };

    // Handle send (WhatsApp/Email)
    const handleSendCertificate = (certificate) => {
        setSelectedCertificate(certificate);
        setShowSendModal(true);
    };

    const handleSendSuccess = () => {
        setShowSendModal(false);
        setSelectedCertificate(null);
        fetchCertificates();
        fetchStats();
    };

    // Handle delete
    const handleDelete = async (id, certificateNumber) => {
        if (!window.confirm(`Are you sure you want to delete certificate ${certificateNumber}?`)) {
            return;
        }

        try {
            await certificateAPI.delete(id);
            alert('Certificate deleted successfully!');
            fetchCertificates();
            fetchStats();
        } catch (error) {
            console.error('Error deleting certificate:', error);
            alert('Failed to delete certificate');
        }
    };

    // Handle download
    const handleDownload = (certificate) => {
        const content = `Certificate Details\n==================\nRecipient: ${certificate.recipient_name}\nCertificate Number: ${certificate.certificate_number}\nRERA Number: ${certificate.award_rera_number || 'N/A'}\nDescription: ${certificate.description || 'N/A'}\nPhone: ${certificate.phone_number || 'N/A'}\nStatus: ${certificate.whatsapp_sent ? 'Sent' : 'Pending'}\nCreated: ${formatDate(certificate.created_at)}`;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificate-${certificate.certificate_number}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Handle preview
    const handlePreview = (certificate) => {
        setSelectedCertificate(certificate);
        setShowPreviewModal(true);
    };

    const handlePreviewClose = () => {
        setShowPreviewModal(false);
        setSelectedCertificate(null);
    };

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    // Export to Excel
    const handleExportToExcel = () => {
        if (certificates.length === 0) {
            alert('No certificates to export');
            return;
        }

        try {
            const excelData = certificates.map(cert => ({
                'Name': cert.recipient_name || '',
                'RERA Awarde No.': cert.award_rera_number || '',
                'Certificate Number': cert.certificate_number || '',
                'Professional': cert.description || ''
            }));

            const worksheet = XLSX.utils.json_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Certificates');

            const columnWidths = [
                { wch: 30 },
                { wch: 20 },
                { wch: 20 },
                { wch: 40 }
            ];
            worksheet['!cols'] = columnWidths;

            const date = new Date().toISOString().split('T')[0];
            const filename = `Certificates_${date}.xlsx`;

            XLSX.writeFile(workbook, filename);
            alert(`Exported ${certificates.length} certificate(s) to ${filename}`);
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            alert('Failed to export to Excel. Please try again.');
        }
    };

    return (
        <div className="dashboard-layout">
            <Sidebar
                activeTab={activeTab}
                onTabChange={setActiveTab}
                user={user}
                onLogout={handleLogout}
                sidebarCollapsed={sidebarCollapsed}
                setSidebarCollapsed={setSidebarCollapsed}
                sidebarHovered={sidebarHovered}
                setSidebarHovered={setSidebarHovered}
                mobileMenuOpen={mobileMenuOpen}
                setMobileMenuOpen={setMobileMenuOpen}
            />

            <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                <Header
                    activeTab={activeTab}
                    currentDate={currentDate}
                    onMenuClick={() => setMobileMenuOpen(true)}
                    onCreateClick={() => setShowCreateModal(true)}
                    pendingCount={stats.pending}
                />

                <main className="content-area">
                    {activeTab === 'social-media' ? (
                        <SocialMediaAutomation />
                    ) : (
                        <>
                            <WelcomeBanner
                                onCreateClick={() => setShowCreateModal(true)}
                                onExportClick={handleExportToExcel}
                                hasCertificates={certificates.length > 0}
                            />

                            <StatsGrid stats={stats} />

                            <CertificatesTable
                                certificates={filteredCertificates}
                                loading={loading}
                                onPreview={handlePreview}
                                onDownload={handleDownload}
                                onSend={handleSendCertificate}
                                onDelete={handleDelete}
                                onCreateClick={() => setShowCreateModal(true)}
                                onExportClick={handleExportToExcel}
                            />
                        </>
                    )}
                </main>
            </div>

            {/* Modals */}
            {showCreateModal && (
                <CreateCertificateModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={handleCreateSuccess}
                />
            )}

            {showSendModal && selectedCertificate && (
                <SendCertificateModal
                    certificate={selectedCertificate}
                    onClose={() => {
                        setShowSendModal(false);
                        setSelectedCertificate(null);
                    }}
                    onSuccess={handleSendSuccess}
                />
            )}

            {showPreviewModal && selectedCertificate && (
                <CertificatePreviewModal
                    certificate={selectedCertificate}
                    onClose={() => {
                                    setShowPreviewModal(false);
                                    setSelectedCertificate(null);
                                }}
                    onDownload={handleDownload}
                    onSend={handleSendCertificate}
                />
            )}
        </div>
    );
}

export default Dashboard;
