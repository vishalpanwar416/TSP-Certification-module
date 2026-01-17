import { Share2, Plus, Pause, Play, Trash2 } from 'lucide-react';
import PostCard from './PostCard';

function PostsView({
    posts,
    platforms,
    selectedPosts,
    onToggleSelection,
    onPreview,
    onEdit,
    onDelete,
    onToggleStatus,
    onBulkDelete,
    onBulkStatusChange,
    onCreateClick,
    searchQuery,
    filterPlatform,
    filterStatus
}) {
    // Filter posts
    const filteredPosts = posts.filter(post => {
        const matchesSearch = !searchQuery || 
            post.content?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPlatform = filterPlatform === 'all' || 
            post.platforms?.includes(filterPlatform);
        const matchesStatus = filterStatus === 'all' || 
            post.status === filterStatus;
        return matchesSearch && matchesPlatform && matchesStatus;
    });

    return (
        <div className="posts-view">
            {/* Bulk Actions Bar */}
            {selectedPosts.length > 0 && (
                <div className="bulk-actions-bar">
                    <span className="bulk-selection-count">
                        {selectedPosts.length} selected
                    </span>
                    <button
                        className="btn btn-outline btn-sm"
                        onClick={() => onBulkStatusChange('paused')}
                    >
                        <Pause size={16} />
                        Pause
                    </button>
                    <button
                        className="btn btn-outline btn-sm"
                        onClick={() => onBulkStatusChange('scheduled')}
                    >
                        <Play size={16} />
                        Resume
                    </button>
                    <button
                        className="btn btn-danger btn-sm"
                        onClick={onBulkDelete}
                    >
                        <Trash2 size={16} />
                        Delete
                    </button>
                    <button
                        className="btn btn-outline btn-sm"
                        onClick={() => onToggleSelection(null, true)}
                    >
                        Clear
                    </button>
                </div>
            )}

            {/* Posts Grid */}
            {filteredPosts.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">
                        <Share2 size={64} />
                    </div>
                    <h3>No posts found</h3>
                    <p>
                        {searchQuery || filterPlatform !== 'all' || filterStatus !== 'all'
                            ? 'Try adjusting your search or filters'
                            : 'Create your first social media post to get started'}
                    </p>
                    {!searchQuery && filterPlatform === 'all' && filterStatus === 'all' && (
                        <button
                            className="btn btn-primary"
                            onClick={onCreateClick}
                        >
                            <Plus size={20} />
                            Create Your First Post
                        </button>
                    )}
                </div>
            ) : (
                <div className="posts-grid">
                    {filteredPosts.map(post => (
                        <PostCard
                            key={post.id}
                            post={post}
                            platforms={platforms}
                            isSelected={selectedPosts.includes(post.id)}
                            onSelect={onToggleSelection}
                            onPreview={onPreview}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onToggleStatus={onToggleStatus}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default PostsView;
