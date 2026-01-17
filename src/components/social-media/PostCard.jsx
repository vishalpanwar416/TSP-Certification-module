import { Share2, Eye, Edit, Trash2, Play, Pause, Image as ImageIcon, CheckSquare, Square } from 'lucide-react';

function PostCard({ 
    post, 
    platforms, 
    isSelected, 
    onSelect, 
    onPreview, 
    onEdit, 
    onDelete, 
    onToggleStatus 
}) {
    const getStatusBadge = (status) => {
        const badges = {
            published: { label: 'Published', className: 'badge-success' },
            scheduled: { label: 'Scheduled', className: 'badge-warning' },
            paused: { label: 'Paused', className: 'badge-info' },
            failed: { label: 'Failed', className: 'badge-danger' }
        };
        const badge = badges[status] || badges.scheduled;
        return (
            <span className={`badge ${badge.className}`}>
                {badge.label}
            </span>
        );
    };

    return (
        <div className={`post-card ${isSelected ? 'selected' : ''}`}>
            <div className="post-card-checkbox">
                <button
                    className="post-select-btn"
                    onClick={() => onSelect(post.id)}
                >
                    {isSelected ? (
                        <CheckSquare size={18} />
                    ) : (
                        <Square size={18} />
                    )}
                </button>
            </div>
            <div className="post-card-header">
                <div className="post-platforms">
                    {post.platforms.map(platformId => {
                        const platform = platforms.find(p => p.id === platformId);
                        const Icon = platform?.icon || Share2;
                        return (
                            <div
                                key={platformId}
                                className="platform-badge"
                                style={{ backgroundColor: platform?.color + '20', color: platform?.color }}
                                title={platform?.name}
                            >
                                <Icon size={16} />
                            </div>
                        );
                    })}
                </div>
                {getStatusBadge(post.status)}
            </div>
            <div className="post-card-content">
                <p>{post.content}</p>
                {post.image && (
                    <div className="post-image-preview">
                        <ImageIcon size={20} />
                        <span>Image attached</span>
                    </div>
                )}
            </div>
            <div className="post-card-footer">
                <div className="post-meta">
                    {post.scheduledDate && (
                        <span className="post-date">
                            {new Date(post.scheduledDate).toLocaleDateString()}
                        </span>
                    )}
                    {post.insights && (
                        <span className="post-engagement">
                            {post.insights.engagement || 0} engagements
                        </span>
                    )}
                </div>
                <div className="post-actions">
                    <button
                        className="action-btn action-btn-view"
                        onClick={() => onPreview(post)}
                        title="Preview"
                    >
                        <Eye size={16} />
                    </button>
                    <button
                        className="action-btn action-btn-edit"
                        onClick={() => onEdit(post)}
                        title="Edit"
                    >
                        <Edit size={16} />
                    </button>
                    {post.status === 'scheduled' || post.status === 'paused' ? (
                        <button
                            className="action-btn action-btn-play"
                            onClick={() => onToggleStatus(post.id)}
                            title={post.status === 'paused' ? 'Resume' : 'Pause'}
                        >
                            {post.status === 'paused' ? <Play size={16} /> : <Pause size={16} />}
                        </button>
                    ) : null}
                    <button
                        className="action-btn action-btn-delete"
                        onClick={() => onDelete(post.id)}
                        title="Delete"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default PostCard;
