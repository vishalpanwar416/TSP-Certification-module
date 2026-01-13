import { FileText, CheckCircle, Clock, BarChart3 } from 'lucide-react';
import StatsCard from './StatsCard';

function StatsGrid({ stats }) {
    const { total, whatsapp_sent, pending } = stats;
    const deliveryRate = total > 0 ? Math.round((whatsapp_sent / total) * 100) : 0;
    const sentProgress = total > 0 ? (whatsapp_sent / total) * 100 : 0;
    const pendingProgress = total > 0 ? (pending / total) * 100 : 0;

    return (
        <div className="stats-grid">
            <StatsCard
                label="Total Certificates"
                value={total}
                changeText="All time"
                changeType="positive"
                icon={FileText}
                progress={100}
                variant="primary"
            />
            <StatsCard
                label="Sent via WhatsApp"
                value={whatsapp_sent}
                changeText="Delivered"
                changeType="positive"
                icon={CheckCircle}
                progress={sentProgress}
                variant="success"
            />
            <StatsCard
                label="Pending Delivery"
                value={pending}
                changeText="Awaiting"
                changeType="warning"
                icon={Clock}
                progress={pendingProgress}
                variant="warning"
            />
            <StatsCard
                label="Delivery Rate"
                value={`${deliveryRate}%`}
                changeText="Success rate"
                changeType="positive"
                icon={BarChart3}
                progress={sentProgress}
                variant="info"
            />
        </div>
    );
}

export default StatsGrid;
