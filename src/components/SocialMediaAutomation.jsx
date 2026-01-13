import { useState, useEffect } from 'react';
import {
    Share2,
    Facebook,
    Twitter,
    Instagram,
    Linkedin,
    Youtube,
    Calendar,
    Clock,
    CheckCircle,
    X,
    Plus,
    Edit,
    Trash2,
    Play,
    Pause,
    Settings,
    BarChart3,
    Eye,
    Heart,
    MessageCircle,
    Share,
    TrendingUp,
    Users,
    Image as ImageIcon,
    Upload,
    Zap,
    Filter,
    MoreVertical,
    ExternalLink,
    AlertCircle,
    RefreshCw,
    CalendarDays,
    Lightbulb,
    Hash,
    Layers,
    Target,
    Sparkles,
    Activity,
    BookOpen,
    Repeat,
    CheckSquare,
    Square,
    GitBranch,
    Webhook,
    ToggleLeft,
    ToggleRight,
    Copy as CopyIcon,
    Check,
    AlertTriangle
} from 'lucide-react';
import { socialMediaAPI } from '../services/socialMediaService';
import socialMediaFirebaseService from '../services/socialMediaFirebaseService';

function SocialMediaAutomation({ 
    searchQuery: externalSearchQuery = '',
    filterPlatform: externalFilterPlatform = 'all',
    filterStatus: externalFilterStatus = 'all'
}) {
    const [activeTab, setActiveTab] = useState('posts'); // posts, calendar, insights, pipeline, settings
    const [posts, setPosts] = useState([]);
    const [insights, setInsights] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingPost, setEditingPost] = useState(null);
    
    // Post creation state
    const [selectedPlatforms, setSelectedPlatforms] = useState(['facebook', 'twitter', 'instagram', 'linkedin', 'whatsapp']);
    const [postContent, setPostContent] = useState('');
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
    const [postImage, setPostImage] = useState(null);
    const [postNow, setPostNow] = useState(false);
    const [showPreview, setShowPreview] = useState(true);
    const [hashtags, setHashtags] = useState('');
    
    // Advanced features state
    const [selectedPosts, setSelectedPosts] = useState([]); // For bulk operations
    const [showBestTimeModal, setShowBestTimeModal] = useState(false);
    const [showHashtagAnalytics, setShowHashtagAnalytics] = useState(false);
    const [platformVariations, setPlatformVariations] = useState({}); // Platform-specific content
    const [useBestTime, setUseBestTime] = useState(false);
    
    // Pipeline state
    const [pipelineEnabled, setPipelineEnabled] = useState(false);
    const [webhookUrl, setWebhookUrl] = useState('');
    const [webhookSecret, setWebhookSecret] = useState('');
    const [webhookPosts, setWebhookPosts] = useState([]);
    const [webhookCopied, setWebhookCopied] = useState(false);
    const [webhookConnectionStatus, setWebhookConnectionStatus] = useState(null); // null, 'checking', 'connected', 'disconnected', 'error'
    const [webhookLastChecked, setWebhookLastChecked] = useState(null);

    const platforms = [
        { id: 'facebook', name: 'Facebook', icon: Facebook, color: '#1877F2', connected: true, charLimit: 5000, optimalLength: 250 },
        { id: 'twitter', name: 'X', icon: Twitter, color: '#000000', connected: true, charLimit: 280, optimalLength: 240 },
        { id: 'instagram', name: 'Instagram', icon: Instagram, color: '#E4405F', connected: true, charLimit: 2200, optimalLength: 150 },
        { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: '#0077B5', connected: true, charLimit: 3000, optimalLength: 150 },
        { id: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, color: '#25D366', connected: true, charLimit: 4096, optimalLength: 200 },
        { id: 'youtube', name: 'YouTube', icon: Youtube, color: '#FF0000', connected: false, charLimit: 5000, optimalLength: 200 }
    ];

    // Get character limit warning for selected platforms
    const getCharLimitWarning = () => {
        if (selectedPlatforms.length === 0) return null;
        const limits = selectedPlatforms.map(pId => {
            const platform = platforms.find(p => p.id === pId);
            return platform?.charLimit || 5000;
        });
        const minLimit = Math.min(...limits);
        const maxLimit = Math.max(...limits);
        
        if (postContent.length > minLimit) {
            const exceededPlatform = platforms.find(p => p.id === selectedPlatforms.find(sp => {
                const platform = platforms.find(pl => pl.id === sp);
                return platform?.charLimit === minLimit;
            }));
            return {
                type: 'error',
                message: `Content exceeds ${exceededPlatform?.name} limit of ${minLimit} characters`,
                platform: exceededPlatform
            };
        } else if (postContent.length > minLimit * 0.9) {
            return {
                type: 'warning',
                message: `Approaching ${minLimit} character limit`,
                platform: platforms.find(p => p.charLimit === minLimit)
            };
        }
        return null;
    };

    const charWarning = getCharLimitWarning();

    // Load posts from Firestore
    useEffect(() => {
        // Generate webhook URL
        const baseUrl = window.location.origin;
        setWebhookUrl(`${baseUrl}/api/webhooks/social-media`);
        setWebhookSecret('whsec_' + Math.random().toString(36).substring(2, 15));
        
        // Load posts from Firestore
        const loadPosts = async () => {
            setLoading(true);
            try {
                // Get all posts
                const allPosts = await socialMediaFirebaseService.getAllPosts({
                    platform: externalFilterPlatform,
                    status: externalFilterStatus,
                    searchQuery: externalSearchQuery
                });

                // Separate manual and webhook posts
                const manualPosts = allPosts.filter(p => p.source === 'manual' || !p.source);
                const webhookPostsData = allPosts.filter(p => p.source === 'webhook');

                setPosts(manualPosts);
                setWebhookPosts(webhookPostsData);

                // Load insights/stats
                const stats = await socialMediaFirebaseService.getPostStats();
                setInsights({
                    totalPosts: stats.total,
                    totalReach: 0, // Will be calculated from insights
                    totalEngagement: 0,
                    totalLikes: 0,
                    totalComments: 0,
                    totalShares: 0,
                    platformStats: {
                        facebook: { posts: stats.byPlatform.facebook, reach: 0, engagement: 0 },
                        twitter: { posts: stats.byPlatform.twitter, reach: 0, engagement: 0 },
                        instagram: { posts: stats.byPlatform.instagram, reach: 0, engagement: 0 },
                        linkedin: { posts: stats.byPlatform.linkedin, reach: 0, engagement: 0 },
                        whatsapp: { posts: stats.byPlatform.whatsapp, reach: 0, engagement: 0 },
                        youtube: { posts: stats.byPlatform.youtube, reach: 0, engagement: 0 }
                    }
                });
            } catch (error) {
                console.error('Error loading posts from Firestore:', error);
                // Fallback to empty arrays on error
                setPosts([]);
                setWebhookPosts([]);
            } finally {
                setLoading(false);
            }
        };

        loadPosts();

        // Subscribe to real-time updates
        const unsubscribe = socialMediaFirebaseService.subscribeToPosts((updatedPosts) => {
            const manualPosts = updatedPosts.filter(p => p.source === 'manual' || !p.source);
            const webhookPostsData = updatedPosts.filter(p => p.source === 'webhook');
            setPosts(manualPosts);
            setWebhookPosts(webhookPostsData);
        }, {
            platform: externalFilterPlatform,
            status: externalFilterStatus,
            searchQuery: externalSearchQuery
        });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [externalFilterPlatform, externalFilterStatus, externalSearchQuery]);

    const handleCreatePost = async () => {
        if (!postContent.trim()) {
            alert('Please enter post content');
            return;
        }

        if (selectedPlatforms.length === 0) {
            alert('Please select at least one platform');
            return;
        }

        if (!postNow && (!scheduledDate || !scheduledTime)) {
            alert('Please select scheduled date and time, or choose "Post Now"');
            return;
        }

        setLoading(true);
        try {
            const postData = {
                content: postContent,
                platforms: selectedPlatforms,
                scheduledDate: postNow ? new Date().toISOString() : `${scheduledDate}T${scheduledTime}:00`,
                publishedDate: postNow ? new Date().toISOString() : null,
                status: postNow ? 'published' : 'scheduled',
                image: postImage,
                source: 'manual',
                insights: null
            };

            // Save to Firestore
            const newPost = await socialMediaFirebaseService.createPost(postData);
            
            // Also call backend API if needed for actual posting
            // await socialMediaAPI.postToAllPlatforms({
            //     content: postContent,
            //     platforms: selectedPlatforms,
            //     scheduledAt: postNow ? null : `${scheduledDate}T${scheduledTime}:00`,
            //     imageUrl: postImage
            // });

            setShowCreateModal(false);
            resetForm();
            alert(postNow ? 'Post published successfully!' : 'Post scheduled successfully!');
        } catch (error) {
            console.error('Error creating post:', error);
            alert('Failed to create post. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePost = async (id, updates) => {
        setLoading(true);
        try {
            // Update in Firestore
            await socialMediaFirebaseService.updatePost(id, updates);
            
            // Also call backend API if needed
            // await socialMediaAPI.updatePost(id, updates);
            
            setShowEditModal(false);
            setEditingPost(null);
            alert('Post updated successfully!');
        } catch (error) {
            console.error('Error updating post:', error);
            alert('Failed to update post. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePost = async (id) => {
        if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
            return;
        }

        setLoading(true);
        try {
            // Delete from Firestore
            await socialMediaFirebaseService.deletePost(id);
            
            // Also call backend API if needed
            // await socialMediaAPI.deletePost(id);
            
            alert('Post deleted successfully!');
        } catch (error) {
            console.error('Error deleting post:', error);
            alert('Failed to delete post. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (id) => {
        setLoading(true);
        try {
            const post = posts.find(p => p.id === id);
            const newStatus = post.status === 'scheduled' ? 'paused' : 'scheduled';
            
            // TODO: Replace with actual API call
            // await socialMediaAPI.togglePostStatus(id, newStatus);
            
            setPosts(posts.map(post => 
                post.id === id ? { ...post, status: newStatus } : post
            ));
        } catch (error) {
            console.error('Error toggling post status:', error);
            alert('Failed to update post status. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleEditPost = (post) => {
        setEditingPost(post);
        setSelectedPlatforms(post.platforms);
        setPostContent(post.content);
        if (post.scheduledDate) {
            const date = new Date(post.scheduledDate);
            setScheduledDate(date.toISOString().split('T')[0]);
            setScheduledTime(date.toTimeString().slice(0, 5));
        }
        setPostNow(post.status === 'published');
        setPostImage(post.image);
        setShowEditModal(true);
    };

    const resetForm = () => {
        setSelectedPlatforms(['facebook', 'twitter', 'instagram', 'linkedin', 'whatsapp']);
        setPostContent('');
        setScheduledDate('');
        setScheduledTime('');
        setPostImage(null);
        setPostNow(false);
        setHashtags('');
    };

    const togglePlatform = (platformId) => {
        if (selectedPlatforms.includes(platformId)) {
            setSelectedPlatforms(selectedPlatforms.filter(p => p !== platformId));
        } else {
            setSelectedPlatforms([...selectedPlatforms, platformId]);
        }
    };

    const selectAllPlatforms = () => {
        const connectedPlatforms = platforms.filter(p => p.connected).map(p => p.id);
        if (selectedPlatforms.length === connectedPlatforms.length) {
            setSelectedPlatforms([]);
        } else {
            setSelectedPlatforms(connectedPlatforms);
        }
    };

    const addHashtags = () => {
        if (hashtags.trim()) {
            const tags = hashtags.split(',').map(t => t.trim()).filter(t => t);
            const formattedTags = tags.map(t => t.startsWith('#') ? t : `#${t}`).join(' ');
            setPostContent(prev => prev ? `${prev}\n\n${formattedTags}` : formattedTags);
            setHashtags('');
        }
    };

    const getPlatformIcon = (platformId) => {
        const platform = platforms.find(p => p.id === platformId);
        return platform ? platform.icon : Share2;
    };

    const getPlatformName = (platformId) => {
        const platform = platforms.find(p => p.id === platformId);
        return platform ? platform.name : 'Unknown';
    };

    const getStatusBadge = (status) => {
        const badges = {
            scheduled: { label: 'Scheduled', color: 'badge-info', icon: Clock },
            published: { label: 'Published', color: 'badge-success', icon: CheckCircle },
            paused: { label: 'Paused', color: 'badge-warning', icon: Pause },
            failed: { label: 'Failed', color: 'badge-danger', icon: AlertCircle }
        };
        const badge = badges[status] || badges.scheduled;
        const Icon = badge.icon;
        return (
            <span className={`badge ${badge.color}`}>
                <Icon size={12} />
                {badge.label}
            </span>
        );
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const filteredPosts = (posts || []).filter(post => {
        // Use external filters from main dashboard when in posts tab
        if (activeTab === 'posts') {
            if (externalFilterPlatform !== 'all' && !post.platforms?.includes(externalFilterPlatform)) return false;
            if (externalFilterStatus !== 'all' && post.status !== externalFilterStatus) return false;
            if (externalSearchQuery && !post.content?.toLowerCase().includes(externalSearchQuery.toLowerCase())) return false;
        }
        return true;
    });

    // Toggle post selection for bulk operations
    const togglePostSelection = (postId) => {
        if (selectedPosts.includes(postId)) {
            setSelectedPosts(selectedPosts.filter(id => id !== postId));
        } else {
            setSelectedPosts([...selectedPosts, postId]);
        }
    };

    const selectAllPosts = () => {
        if (selectedPosts.length === filteredPosts.length) {
            setSelectedPosts([]);
        } else {
            setSelectedPosts(filteredPosts.map(p => p.id));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedPosts.length === 0) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedPosts.length} post(s)?`)) return;
        
        setLoading(true);
        try {
            setPosts(posts.filter(p => !selectedPosts.includes(p.id)));
            setSelectedPosts([]);
            alert(`${selectedPosts.length} post(s) deleted successfully!`);
        } catch (error) {
            console.error('Error deleting posts:', error);
            alert('Failed to delete posts');
        } finally {
            setLoading(false);
        }
    };

    const handleBulkStatusChange = async (newStatus) => {
        if (selectedPosts.length === 0) return;
        
        setLoading(true);
        try {
            setPosts(posts.map(post => 
                selectedPosts.includes(post.id) ? { ...post, status: newStatus } : post
            ));
            setSelectedPosts([]);
            alert(`${selectedPosts.length} post(s) updated successfully!`);
        } catch (error) {
            console.error('Error updating posts:', error);
            alert('Failed to update posts');
        } finally {
            setLoading(false);
        }
    };

    // Get best posting times based on analytics
    const getBestPostingTimes = () => {
        // Mock data - in real app, this would come from analytics
        return {
            facebook: ['09:00', '13:00', '18:00'],
            twitter: ['08:00', '12:00', '17:00', '21:00'],
            instagram: ['11:00', '14:00', '17:00'],
            linkedin: ['08:00', '12:00', '17:00'],
            whatsapp: ['09:00', '13:00', '20:00']
        };
    };

    // Get hashtag suggestions
    const getHashtagSuggestions = (content) => {
        // Mock suggestions - in real app, use AI or analytics
        const commonHashtags = ['marketing', 'business', 'socialmedia', 'digital', 'growth', 'tips', 'strategy'];
        const contentWords = content.toLowerCase().split(/\s+/);
        return commonHashtags.filter(tag => 
            contentWords.some(word => word.includes(tag) || tag.includes(word))
        ).slice(0, 5);
    };


    const renderPostsView = () => (
        <div className="posts-view">
            {/* Bulk Actions - Only show when posts are selected */}
            {selectedPosts.length > 0 && (
                <div className="bulk-actions-bar">
                        <span className="bulk-selection-count">
                            {selectedPosts.length} selected
                        </span>
                        <button
                            className="btn btn-outline btn-sm"
                            onClick={() => handleBulkStatusChange('paused')}
                        >
                            <Pause size={16} />
                            Pause
                        </button>
                        <button
                            className="btn btn-outline btn-sm"
                            onClick={() => handleBulkStatusChange('scheduled')}
                        >
                            <Play size={16} />
                            Resume
                        </button>
                        <button
                            className="btn btn-danger btn-sm"
                            onClick={handleBulkDelete}
                        >
                            <Trash2 size={16} />
                            Delete
                        </button>
                        <button
                            className="btn btn-outline btn-sm"
                            onClick={() => setSelectedPosts([])}
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
                    <p>{externalSearchQuery || externalFilterPlatform !== 'all' || externalFilterStatus !== 'all' 
                        ? 'Try adjusting your search or filters' 
                        : 'Create your first social media post to get started'}
                    </p>
                    {!externalSearchQuery && externalFilterPlatform === 'all' && externalFilterStatus === 'all' && (
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowCreateModal(true)}
                        >
                            <Plus size={20} />
                            Create Your First Post
                        </button>
                    )}
                </div>
            ) : (
                <div className="posts-grid">
                    {filteredPosts.map(post => {
                        const isSelected = selectedPosts.includes(post.id);
                        return (
                            <div key={post.id} className={`post-card ${isSelected ? 'selected' : ''}`}>
                                <div className="post-card-checkbox">
                                    <button
                                        className="post-select-btn"
                                        onClick={() => togglePostSelection(post.id)}
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
                                        <div className="meta-item">
                                            <Calendar size={14} />
                                            <span>
                                                {post.status === 'published' && post.publishedDate
                                                    ? formatDateTime(post.publishedDate)
                                                    : formatDateTime(post.scheduledDate)
                                                }
                                            </span>
                                        </div>
                                        {post.insights && (
                                            <div className="post-insights-preview">
                                                <Eye size={14} /> {post.insights.reach}
                                                <Heart size={14} /> {post.insights.likes}
                                                <MessageCircle size={14} /> {post.insights.comments}
                                            </div>
                                        )}
                                    </div>
                                    <div className="post-actions">
                                        <button
                                            className="action-btn action-btn-edit"
                                            onClick={() => handleEditPost(post)}
                                            title="Edit"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            className="action-btn action-btn-toggle"
                                            onClick={() => handleToggleStatus(post.id)}
                                            title={post.status === 'scheduled' ? 'Pause' : 'Resume'}
                                        >
                                            {post.status === 'scheduled' ? (
                                                <Pause size={16} />
                                            ) : (
                                                <Play size={16} />
                                            )}
                                        </button>
                                        <button
                                            className="action-btn action-btn-delete"
                                            onClick={() => handleDeletePost(post.id)}
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );

    const renderCalendarView = () => {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
        
        const scheduledPostsByDate = {};
        posts.filter(p => p.status === 'scheduled' && p.scheduledDate).forEach(post => {
            const date = new Date(post.scheduledDate).toDateString();
            if (!scheduledPostsByDate[date]) {
                scheduledPostsByDate[date] = [];
            }
            scheduledPostsByDate[date].push(post);
        });

        const calendarDays = [];
        for (let i = 0; i < firstDayOfMonth; i++) {
            calendarDays.push(null);
        }
        for (let day = 1; day <= daysInMonth; day++) {
            calendarDays.push(day);
        }

        return (
            <div className="calendar-view">
                <div className="calendar-header">
                    <h3>Content Calendar</h3>
                    <div className="calendar-actions">
                        <button className="btn btn-outline" onClick={() => setShowCreateModal(true)}>
                            <Plus size={18} />
                            Schedule Post
                        </button>
                        <button className="btn btn-outline" onClick={() => setShowBestTimeModal(true)}>
                            <Lightbulb size={18} />
                            Best Times
                        </button>
                    </div>
                </div>
                <div className="calendar-grid">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="calendar-day-header">{day}</div>
                    ))}
                    {calendarDays.map((day, index) => {
                        if (day === null) {
                            return <div key={`empty-${index}`} className="calendar-day empty"></div>;
                        }
                        const date = new Date(currentYear, currentMonth, day);
                        const dateKey = date.toDateString();
                        const dayPosts = scheduledPostsByDate[dateKey] || [];
                        const isToday = day === today.getDate() && currentMonth === today.getMonth();
                        
                        return (
                            <div key={day} className={`calendar-day ${isToday ? 'today' : ''}`}>
                                <div className="calendar-day-number">{day}</div>
                                {dayPosts.length > 0 && (
                                    <div className="calendar-posts">
                                        {dayPosts.slice(0, 3).map(post => (
                                            <div 
                                                key={post.id} 
                                                className="calendar-post-item"
                                                onClick={() => handleEditPost(post)}
                                                title={post.content.substring(0, 50)}
                                            >
                                                <div className="calendar-post-platforms">
                                                    {post.platforms.slice(0, 2).map(platformId => {
                                                        const platform = platforms.find(p => p.id === platformId);
                                                        const Icon = platform?.icon || Share2;
                                                        return (
                                                            <Icon key={platformId} size={12} style={{ color: platform?.color }} />
                                                        );
                                                    })}
                                                    {post.platforms.length > 2 && <span>+{post.platforms.length - 2}</span>}
                                                </div>
                                                <div className="calendar-post-time">
                                                    {new Date(post.scheduledDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        ))}
                                        {dayPosts.length > 3 && (
                                            <div className="calendar-post-more">+{dayPosts.length - 3} more</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };


    const renderInsightsView = () => (
        <div className="insights-view">
            {!insights ? (
                <div className="empty-state">
                    <BarChart3 size={64} />
                    <h3>No insights available</h3>
                    <p>Insights will appear here once you start posting</p>
                </div>
            ) : (
                <>
                    {/* Overview Stats */}
                    <div className="insights-overview">
                        <div className="insight-card">
                            <div className="insight-icon" style={{ backgroundColor: '#1877F220', color: '#1877F2' }}>
                                <Share2 size={24} />
                            </div>
                            <div className="insight-content">
                                <span className="insight-label">Total Posts</span>
                                <span className="insight-value">{insights.totalPosts}</span>
                            </div>
                        </div>
                        <div className="insight-card">
                            <div className="insight-icon" style={{ backgroundColor: '#10B98120', color: '#10B981' }}>
                                <Eye size={24} />
                            </div>
                            <div className="insight-content">
                                <span className="insight-label">Total Reach</span>
                                <span className="insight-value">{insights.totalReach.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="insight-card">
                            <div className="insight-icon" style={{ backgroundColor: '#F59E0B20', color: '#F59E0B' }}>
                                <TrendingUp size={24} />
                            </div>
                            <div className="insight-content">
                                <span className="insight-label">Total Engagement</span>
                                <span className="insight-value">{insights.totalEngagement.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="insight-card">
                            <div className="insight-icon" style={{ backgroundColor: '#EF444420', color: '#EF4444' }}>
                                <Heart size={24} />
                            </div>
                            <div className="insight-content">
                                <span className="insight-label">Total Likes</span>
                                <span className="insight-value">{insights.totalLikes.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Platform Performance */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Platform Performance</h3>
                        </div>
                        <div className="platform-performance">
                            {platforms.filter(p => insights.platformStats[p.id]).map(platform => {
                                const stats = insights.platformStats[platform.id];
                                const Icon = platform.icon;
                                return (
                                    <div key={platform.id} className="platform-performance-card">
                                        <div className="platform-header">
                                            <div className="platform-icon-large" style={{ color: platform.color }}>
                                                <Icon size={32} />
                                            </div>
                                            <div className="platform-stats-info">
                                                <span className="platform-name">{platform.name}</span>
                                                <span className="platform-posts-count">{stats.posts} posts</span>
                                            </div>
                                        </div>
                                        <div className="platform-metrics">
                                            <div className="metric">
                                                <span className="metric-label">Reach</span>
                                                <span className="metric-value">{stats.reach.toLocaleString()}</span>
                                            </div>
                                            <div className="metric">
                                                <span className="metric-label">Engagement</span>
                                                <span className="metric-value">{stats.engagement.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Post Insights Table */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Post Performance</h3>
                        </div>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Post</th>
                                        <th>Platforms</th>
                                        <th>Reach</th>
                                        <th>Engagement</th>
                                        <th>Likes</th>
                                        <th>Comments</th>
                                        <th>Shares</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {posts.filter(p => p.insights).map(post => (
                                        <tr key={post.id}>
                                            <td>
                                                <div className="post-content-cell">
                                                    {post.content.substring(0, 50)}...
                                                </div>
                                            </td>
                                            <td>
                                                <div className="platform-badges">
                                                    {post.platforms.map(platformId => {
                                                        const platform = platforms.find(p => p.id === platformId);
                                                        const Icon = platform?.icon || Share2;
                                                        return (
                                                            <span
                                                                key={platformId}
                                                                className="platform-badge-small"
                                                                style={{ color: platform?.color }}
                                                                title={platform?.name}
                                                            >
                                                                <Icon size={14} />
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                            <td>{post.insights.reach.toLocaleString()}</td>
                                            <td>{post.insights.engagement.toLocaleString()}</td>
                                            <td>{post.insights.likes.toLocaleString()}</td>
                                            <td>{post.insights.comments.toLocaleString()}</td>
                                            <td>{post.insights.shares.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );

    const handleTogglePipeline = async () => {
        const newStatus = !pipelineEnabled;
        setLoading(true);
        try {
            // TODO: Replace with actual API call
            // await socialMediaAPI.togglePipeline(newStatus);
            
            setPipelineEnabled(newStatus);
            alert(newStatus ? 'Automation Pipeline enabled successfully!' : 'Automation Pipeline disabled.');
        } catch (error) {
            console.error('Error toggling pipeline:', error);
            alert('Failed to toggle pipeline. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const copyWebhookUrl = () => {
        navigator.clipboard.writeText(webhookUrl);
        setWebhookCopied(true);
        setTimeout(() => setWebhookCopied(false), 2000);
    };

    const copyWebhookSecret = () => {
        navigator.clipboard.writeText(webhookSecret);
        alert('Webhook secret copied to clipboard!');
    };

    const checkWebhookConnection = async () => {
        setWebhookConnectionStatus('checking');
        setLoading(true);
        
        try {
            // TODO: Replace with actual API call to test webhook connection
            // const response = await socialMediaAPI.testWebhookConnection();
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Simulate success (in real implementation, check actual response)
            const isConnected = pipelineEnabled; // Check if pipeline is enabled
            setWebhookConnectionStatus(isConnected ? 'connected' : 'disconnected');
            setWebhookLastChecked(new Date());
            
            if (isConnected) {
                alert('Webhook connection is active and working!');
            } else {
                alert('Webhook connection is inactive. Please enable the pipeline first.');
            }
        } catch (error) {
            console.error('Error checking webhook connection:', error);
            setWebhookConnectionStatus('error');
            setWebhookLastChecked(new Date());
            alert('Failed to check webhook connection. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const sendTestWebhook = async () => {
        if (!pipelineEnabled) {
            alert('Please enable the pipeline first before sending a test webhook.');
            return;
        }

        setLoading(true);
        try {
            // Send test property listing webhook
            const testProperty = {
                type: 'property_listing',
                property: {
                    id: 'test_property_' + Date.now(),
                    title: 'Luxury 3BHK Apartment',
                    location: 'Mumbai, Maharashtra',
                    price: '₹2.5 Crores',
                    area: '1500 sq ft',
                    bedrooms: 3,
                    bathrooms: 2,
                    description: 'Beautiful modern apartment with premium amenities in prime location. Perfect for families looking for a comfortable living space.',
                    imageUrl: null,
                    propertyUrl: 'https://example.com/property/test',
                    reraNumber: 'RERA/123/2024',
                    amenities: ['Parking', 'Gym', 'Swimming Pool', 'Security', 'Lift']
                },
                platforms: ['facebook', 'twitter', 'instagram', 'linkedin'],
                postImmediately: true
            };

            // TODO: Replace with actual API call
            // const response = await fetch(`${window.location.origin}/api/webhooks/social-media`, {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(testProperty)
            // });
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Create a test post with property data
            const testPost = {
                id: Date.now(),
                platforms: ['facebook', 'twitter', 'instagram', 'linkedin'],
                content: `🏠 NEW PROPERTY LISTING\n\n📍 Luxury 3BHK Apartment\n📍 Location: Mumbai, Maharashtra\n💰 Price: ₹2.5 Crores\n📐 Area: 1500 sq ft\n🛏️ 3 BHK | 2 Bath\n\nBeautiful modern apartment with premium amenities in prime location. Perfect for families looking for a comfortable living space.\n\n✨ Amenities: Parking, Gym, Swimming Pool, Security, Lift\n\n🏆 RERA: RERA/123/2024\n\n🔗 View Details: https://example.com/property/test\n\n#RealEstate #PropertyListing #NewListing #Mumbai #PropertyForSale #RealEstateInvestment`,
                scheduledDate: new Date().toISOString(),
                publishedDate: new Date().toISOString(),
                status: 'published',
                image: null,
                source: 'webhook',
                webhookId: 'wh_test_' + Date.now(),
                receivedAt: new Date().toISOString(),
                propertyData: {
                    propertyId: testProperty.property.id,
                    title: testProperty.property.title,
                    location: testProperty.property.location,
                    price: testProperty.property.price,
                    propertyUrl: testProperty.property.propertyUrl
                },
                insights: null
            };
            
            setWebhookPosts(prev => [testPost, ...prev]);
            alert('Test property webhook sent successfully! Check the Pipeline tab to see the property post.');
        } catch (error) {
            console.error('Error sending test webhook:', error);
            alert('Failed to send test webhook. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const renderPipelineView = () => {
        const allWebhookPosts = [...(webhookPosts || []), ...(posts || []).filter(p => p.source === 'webhook')];
        const pipelineStats = {
            totalWebhookPosts: allWebhookPosts.length,
            successfulPosts: allWebhookPosts.filter(p => p.status === 'published').length,
            failedPosts: allWebhookPosts.filter(p => p.status === 'failed').length,
            pendingPosts: allWebhookPosts.filter(p => p.status === 'scheduled' || p.status === 'pending').length
        };

        return (
            <div className="pipeline-view">
                {/* Pipeline Status Card */}
                <div className={`card pipeline-main-card ${pipelineEnabled ? 'pipeline-active' : 'pipeline-inactive'}`}>
                    <div className="card-header pipeline-header">
                        <div className="card-header-left">
                            <div className="pipeline-title-section">
                                <div className="pipeline-icon-wrapper">
                                    <GitBranch size={28} />
                                    {pipelineEnabled && (
                                        <span className="pipeline-pulse"></span>
                                    )}
                                </div>
                                <div>
                                    <h3 className="card-title">
                                        Automation Pipeline
                                    </h3>
                                    <p className="card-description">
                                        Monitor and manage automated posts from webhooks
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="pipeline-toggle-container">
                            <div className="pipeline-status-indicator">
                                <div className={`status-dot ${pipelineEnabled ? 'active' : 'inactive'}`}></div>
                                <span className={`status-text ${pipelineEnabled ? 'active' : 'inactive'}`}>
                                    {pipelineEnabled ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <label className="pipeline-toggle-label">
                                <button
                                    className={`pipeline-toggle-btn ${pipelineEnabled ? 'enabled' : 'disabled'}`}
                                    onClick={handleTogglePipeline}
                                    disabled={loading}
                                    title={pipelineEnabled ? 'Disable Pipeline' : 'Enable Pipeline'}
                                >
                                    <div className="toggle-slider">
                                        <div className="toggle-handle"></div>
                                    </div>
                                    <span className="toggle-label">
                                        {pipelineEnabled ? 'ON' : 'OFF'}
                                    </span>
                                </button>
                            </label>
                        </div>
                    </div>
                    
                    {pipelineEnabled && (
                        <div className="card-body">
                            {/* Webhook Configuration */}
                            <div className="webhook-config-section">
                                <div className="section-header">
                                    <div className="section-icon">
                                        <Webhook size={24} />
                                    </div>
                                    <div>
                                        <h4>Webhook Configuration</h4>
                                        <p className="section-subtitle">Configure your webhook endpoint for automated posts</p>
                                    </div>
                                </div>
                                <div className="webhook-info-grid">
                                    <div className="webhook-info-card enhanced">
                                        <div className="webhook-card-header">
                                            <div className="webhook-info-header">
                                                <div className="webhook-icon-wrapper">
                                                    <Webhook size={22} />
                                                </div>
                                                <div>
                                                    <span className="webhook-label">Webhook URL</span>
                                                    <span className="webhook-badge">Public</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="webhook-url-container enhanced">
                                            <code className="webhook-url">{webhookUrl}</code>
                                            <button
                                                className={`btn-icon btn-copy enhanced ${webhookCopied ? 'copied' : ''}`}
                                                onClick={copyWebhookUrl}
                                                title="Copy URL"
                                            >
                                                {webhookCopied ? (
                                                    <>
                                                        <Check size={18} />
                                                        <span className="copy-feedback">Copied!</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <CopyIcon size={18} />
                                                        <span className="copy-feedback">Copy</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                        <div className="webhook-hint-box">
                                            <Activity size={14} />
                                            <small>Use this URL to receive property listings and automatically post to social media</small>
                                        </div>
                                        <div className="webhook-example-section">
                                            <strong>Example Payload:</strong>
                                            <pre className="webhook-example-code">
{`{
  "type": "property_listing",
  "property": {
    "title": "Luxury 3BHK Apartment",
    "location": "Mumbai, Maharashtra",
    "price": "₹2.5 Crores",
    "area": "1500 sq ft",
    "bedrooms": 3,
    "bathrooms": 2,
    "description": "Beautiful apartment...",
    "imageUrl": "https://...",
    "propertyUrl": "https://..."
  },
  "platforms": ["facebook", "twitter"],
  "postImmediately": true
}`}
                                            </pre>
                                        </div>
                                    </div>
                                    
                                    <div className="webhook-info-card enhanced">
                                        <div className="webhook-card-header">
                                            <div className="webhook-info-header">
                                                <div className="webhook-icon-wrapper">
                                                    <Activity size={22} />
                                                </div>
                                                <div>
                                                    <span className="webhook-label">Webhook Secret</span>
                                                    <span className="webhook-badge secret">Secret</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="webhook-secret-container enhanced">
                                            <code className="webhook-secret">
                                                {webhookSecret.substring(0, 20)}...
                                            </code>
                                            <button
                                                className="btn-icon btn-copy enhanced"
                                                onClick={copyWebhookSecret}
                                                title="Copy Secret"
                                            >
                                                <CopyIcon size={18} />
                                                <span className="copy-feedback">Copy</span>
                                            </button>
                                        </div>
                                        <div className="webhook-hint-box">
                                            <AlertTriangle size={14} />
                                            <small>Keep this secret secure. Use it to verify webhook requests.</small>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Pipeline Statistics */}
                            <div className="pipeline-stats-section">
                                <div className="stats-section-header">
                                    <h4>Pipeline Statistics</h4>
                                    <span className="stats-update-time">Updated just now</span>
                                </div>
                                <div className="pipeline-stats-grid">
                                    <div className="pipeline-stat-card enhanced">
                                        <div className="stat-icon-wrapper" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #8B0000 100%)' }}>
                                            <Webhook size={24} />
                                        </div>
                                        <div className="stat-content">
                                            <span className="stat-label">Total Webhook Posts</span>
                                            <span className="stat-value">{pipelineStats.totalWebhookPosts}</span>
                                            <div className="stat-trend">
                                                <TrendingUp size={12} />
                                                <span>All time</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pipeline-stat-card enhanced success">
                                        <div className="stat-icon-wrapper" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #8B0000 100%)' }}>
                                            <CheckCircle size={24} />
                                        </div>
                                        <div className="stat-content">
                                            <span className="stat-label">Successful</span>
                                            <span className="stat-value">{pipelineStats.successfulPosts}</span>
                                            <div className="stat-trend positive">
                                                <TrendingUp size={12} />
                                                <span>{pipelineStats.totalWebhookPosts > 0 ? Math.round((pipelineStats.successfulPosts / pipelineStats.totalWebhookPosts) * 100) : 0}% success rate</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pipeline-stat-card enhanced warning">
                                        <div className="stat-icon-wrapper" style={{ background: 'linear-gradient(135deg, #8B0000 0%, var(--primary) 100%)' }}>
                                            <Clock size={24} />
                                        </div>
                                        <div className="stat-content">
                                            <span className="stat-label">Pending</span>
                                            <span className="stat-value">{pipelineStats.pendingPosts}</span>
                                            <div className="stat-trend">
                                                <Clock size={12} />
                                                <span>In queue</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pipeline-stat-card enhanced danger">
                                        <div className="stat-icon-wrapper" style={{ background: 'linear-gradient(135deg, #8B0000 0%, var(--primary) 100%)' }}>
                                            <AlertCircle size={24} />
                                        </div>
                                        <div className="stat-content">
                                            <span className="stat-label">Failed</span>
                                            <span className="stat-value">{pipelineStats.failedPosts}</span>
                                            <div className="stat-trend negative">
                                                <AlertCircle size={12} />
                                                <span>{pipelineStats.failedPosts > 0 ? 'Needs attention' : 'No errors'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {!pipelineEnabled && (
                        <div className="card-body">
                            <div className="pipeline-inactive-state enhanced">
                                <div className="inactive-icon-wrapper">
                                    <GitBranch size={64} />
                                    <div className="inactive-overlay"></div>
                                </div>
                                <div className="inactive-content">
                                    <h3>Pipeline is Inactive</h3>
                                    <p>Enable the automation pipeline to start receiving posts from webhooks and automate your social media posting workflow.</p>
                                    <button
                                        className="btn btn-primary btn-large"
                                        onClick={handleTogglePipeline}
                                        disabled={loading}
                                    >
                                        <Zap size={20} />
                                        <span>Enable Pipeline</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Webhook Posts List */}
                {pipelineEnabled && (
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">
                                <Webhook size={24} />
                                Webhook Posts
                            </h3>
                            <span className="card-badge">{allWebhookPosts.length} posts</span>
                        </div>
                        <div className="card-body">
                            {allWebhookPosts.length === 0 ? (
                                <div className="empty-state">
                                    <Webhook size={64} style={{ opacity: 0.3 }} />
                                    <h3>No webhook posts yet</h3>
                                    <p>Posts received via webhook will appear here</p>
                                </div>
                            ) : (
                                <div className="webhook-posts-list">
                                    {allWebhookPosts.map(post => {
                                        const isSelected = selectedPosts.includes(post.id);
                                        return (
                                            <div key={post.id} className={`post-card webhook-post ${isSelected ? 'selected' : ''}`}>
                                                <div className="post-card-checkbox">
                                                    <button
                                                        className="post-select-btn"
                                                        onClick={() => togglePostSelection(post.id)}
                                                    >
                                                        {isSelected ? (
                                                            <CheckSquare size={18} />
                                                        ) : (
                                                            <Square size={18} />
                                                        )}
                                                    </button>
                                                </div>
                                                <div className="webhook-post-badge">
                                                    <Webhook size={14} />
                                                    <span>{post.propertyData ? 'Property Listing' : 'Webhook'}</span>
                                                    {post.webhookId && (
                                                        <span className="webhook-id">ID: {post.webhookId}</span>
                                                    )}
                                                </div>
                                                {post.propertyData && (
                                                    <div className="property-data-badge">
                                                        <div className="property-icon">
                                                            <Share2 size={14} />
                                                        </div>
                                                        <div className="property-info">
                                                            <span className="property-title">{post.propertyData.title}</span>
                                                            <span className="property-location">{post.propertyData.location}</span>
                                                        </div>
                                                        <div className="property-price">{post.propertyData.price}</div>
                                                    </div>
                                                )}
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
                                                        <div className="meta-item">
                                                            <Calendar size={14} />
                                                            <span>
                                                                {post.status === 'published' && post.publishedDate
                                                                    ? formatDateTime(post.publishedDate)
                                                                    : formatDateTime(post.scheduledDate)
                                                                }
                                                            </span>
                                                        </div>
                                                        {post.receivedAt && (
                                                            <div className="meta-item">
                                                                <Webhook size={14} />
                                                                <span>Received: {formatDateTime(post.receivedAt)}</span>
                                                            </div>
                                                        )}
                                                        {post.insights && (
                                                            <div className="post-insights-preview">
                                                                <Eye size={14} /> {post.insights.reach}
                                                                <Heart size={14} /> {post.insights.likes}
                                                                <MessageCircle size={14} /> {post.insights.comments}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="post-actions">
                                                        <button
                                                            className="action-btn action-btn-edit"
                                                            onClick={() => handleEditPost(post)}
                                                            title="View Details"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        <button
                                                            className="action-btn action-btn-delete"
                                                            onClick={() => handleDeletePost(post.id)}
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderSettingsView = () => (
        <div className="settings-view">
            {/* Webhook Connection Check */}
            <div className="card webhook-connection-card">
                <div className="card-header">
                    <div className="webhook-settings-header">
                        <div className="webhook-settings-icon-wrapper">
                            <Webhook size={28} />
                        </div>
                        <div>
                            <h3 className="card-title">Webhook Connection</h3>
                            <p className="card-description">Test and verify your webhook connection status</p>
                        </div>
                    </div>
                </div>
                <div className="card-body">
                    <div className="webhook-connection-section-enhanced">
                        {/* Status Card */}
                        <div className="webhook-status-card">
                            <div className="webhook-status-header-enhanced">
                                <div className="status-header-left">
                                    <div className="status-icon-wrapper">
                                        {webhookConnectionStatus === 'checking' && (
                                            <RefreshCw size={24} className="spinning" />
                                        )}
                                        {webhookConnectionStatus === 'connected' && (
                                            <CheckCircle size={24} />
                                        )}
                                        {webhookConnectionStatus === 'disconnected' && (
                                            <AlertCircle size={24} />
                                        )}
                                        {webhookConnectionStatus === 'error' && (
                                            <X size={24} />
                                        )}
                                        {!webhookConnectionStatus && (
                                            <Activity size={24} />
                                        )}
                                    </div>
                                    <div>
                                        <span className="webhook-status-label-enhanced">Connection Status</span>
                                        {webhookConnectionStatus && (
                                            <span className={`webhook-status-badge-enhanced ${webhookConnectionStatus}`}>
                                                {webhookConnectionStatus === 'checking' && 'Checking...'}
                                                {webhookConnectionStatus === 'connected' && 'Connected'}
                                                {webhookConnectionStatus === 'disconnected' && 'Disconnected'}
                                                {webhookConnectionStatus === 'error' && 'Error'}
                                            </span>
                                        )}
                                        {!webhookConnectionStatus && (
                                            <span className="webhook-status-badge-enhanced not-checked">Not Checked</span>
                                        )}
                                    </div>
                                </div>
                                {webhookLastChecked && (
                                    <div className="status-timestamp">
                                        <Clock size={14} />
                                        <span>Last checked: {formatDateTime(webhookLastChecked)}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Configuration Details */}
                        <div className="webhook-config-details-grid">
                            <div className="webhook-config-detail-card">
                                <div className="config-detail-header">
                                    <Webhook size={18} />
                                    <span>Webhook URL</span>
                                </div>
                                <div className="config-detail-content">
                                    <code className="config-detail-value">{webhookUrl || 'Not configured'}</code>
                                </div>
                            </div>
                            <div className="webhook-config-detail-card">
                                <div className="config-detail-header">
                                    <GitBranch size={18} />
                                    <span>Pipeline Status</span>
                                </div>
                                <div className="config-detail-content">
                                    <span className={`config-detail-value status-indicator ${pipelineEnabled ? 'enabled' : 'disabled'}`}>
                                        <div className={`status-dot-small ${pipelineEnabled ? 'active' : 'inactive'}`}></div>
                                        {pipelineEnabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="webhook-actions-container">
                            <div className="actions-header">
                                <h4>Quick Actions</h4>
                                <p>Test and manage your webhook connection</p>
                            </div>
                            <div className="webhook-connection-actions-enhanced">
                                <button
                                    className="btn-action-primary"
                                    onClick={checkWebhookConnection}
                                    disabled={loading || webhookConnectionStatus === 'checking'}
                                >
                                    <div className="btn-icon-wrapper">
                                        {webhookConnectionStatus === 'checking' ? (
                                            <RefreshCw size={20} className="spinning" />
                                        ) : (
                                            <Activity size={20} />
                                        )}
                                    </div>
                                    <div className="btn-content">
                                        <span className="btn-label">
                                            {webhookConnectionStatus === 'checking' ? 'Checking...' : 'Check Connection'}
                                        </span>
                                        <span className="btn-description">Verify webhook connectivity</span>
                                    </div>
                                </button>
                                <button
                                    className="btn-action-secondary"
                                    onClick={sendTestWebhook}
                                    disabled={loading || !pipelineEnabled}
                                    title={!pipelineEnabled ? 'Enable pipeline first to send test webhook' : 'Send a test webhook'}
                                >
                                    <div className="btn-icon-wrapper">
                                        <Zap size={20} />
                                    </div>
                                    <div className="btn-content">
                                        <span className="btn-label">Send Test Webhook</span>
                                        <span className="btn-description">Test webhook functionality</span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    {/* Status Messages */}
                    {webhookConnectionStatus === 'connected' && (
                        <div className="webhook-status-message success">
                            <div className="message-icon">
                                <CheckCircle size={24} />
                            </div>
                            <div className="message-content">
                                <strong>Webhook is active!</strong>
                                <p>Your webhook endpoint is ready to receive automated posts. Posts sent to this webhook will appear in the Pipeline tab.</p>
                            </div>
                        </div>
                    )}
                    
                    {webhookConnectionStatus === 'disconnected' && (
                        <div className="webhook-status-message warning">
                            <div className="message-icon">
                                <AlertCircle size={24} />
                            </div>
                            <div className="message-content">
                                <strong>Webhook is inactive</strong>
                                <p>Enable the automation pipeline in the Pipeline tab to activate webhook receiving.</p>
                            </div>
                        </div>
                    )}
                    
                    {webhookConnectionStatus === 'error' && (
                        <div className="webhook-status-message error">
                            <div className="message-icon">
                                <X size={24} />
                            </div>
                            <div className="message-content">
                                <strong>Connection check failed</strong>
                                <p>Unable to verify webhook connection. Please check your configuration and try again.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Connected Platforms */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">Connected Platforms</h3>
                    <p className="card-description">Manage your social media platform connections</p>
                </div>
                <div className="platforms-settings">
                    {platforms.map(platform => {
                        const Icon = platform.icon;
                        return (
                            <div key={platform.id} className="platform-setting-card-enhanced">
                                <div className="platform-card-content">
                                    <div className="platform-info-enhanced">
                                        <div className="platform-icon-wrapper-enhanced" style={{ backgroundColor: platform.color + '15', borderColor: platform.color + '40' }}>
                                            <Icon size={28} style={{ color: platform.color }} />
                                        </div>
                                        <div className="platform-details">
                                            <div className="platform-name-row">
                                                <span className="platform-name-enhanced">{platform.name}</span>
                                                <span className={`connection-status-badge ${platform.connected ? 'connected' : 'disconnected'}`}>
                                                    <div className={`status-indicator-dot ${platform.connected ? 'active' : 'inactive'}`}></div>
                                                    {platform.connected ? 'Connected' : 'Not Connected'}
                                                </span>
                                            </div>
                                            {platform.connected && (
                                                <div className="platform-meta">
                                                    <span className="platform-meta-item">
                                                        <CheckCircle size={12} />
                                                        <span>Business API</span>
                                                    </span>
                                                    <span className="platform-meta-item">
                                                        <Clock size={12} />
                                                        <span>Last synced: {new Date().toLocaleDateString()}</span>
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="platform-action-wrapper">
                                        <button
                                            className={`platform-action-btn ${platform.connected ? 'connected' : 'disconnected'}`}
                                            onClick={() => {
                                                // TODO: Implement connect/disconnect
                                                alert(`${platform.connected ? 'Disconnect' : 'Connect'} ${platform.name} - API integration needed`);
                                            }}
                                        >
                                            {platform.connected ? (
                                                <>
                                                    <X size={16} />
                                                    <span>Disconnect</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Plus size={16} />
                                                    <span>Connect</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    return (
        <div className="social-media-automation">
            {/* Header */}
            <div className="card">
                <div className="card-header">
                    <div className="card-header-left">
                        <h2 className="card-title">
                            <Share2 size={24} />
                            Social Media Automation
                        </h2>
                        <p className="card-description">
                            Manage, schedule, and analyze your social media posts across all platforms
                        </p>
                    </div>
                    <div className="card-header-actions">
                        <button 
                            className="btn btn-primary" 
                            onClick={() => {
                                resetForm();
                                setShowCreateModal(true);
                            }}
                        >
                            <Zap size={18} />
                            Post to All Platforms
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="tabs">
                    <button
                        className={`tab ${activeTab === 'posts' ? 'active' : ''}`}
                        onClick={() => setActiveTab('posts')}
                    >
                        <Calendar size={18} />
                        Posts
                        <span className="tab-badge">{posts?.length || 0}</span>
                    </button>
                    <button
                        className={`tab ${activeTab === 'calendar' ? 'active' : ''}`}
                        onClick={() => setActiveTab('calendar')}
                    >
                        <CalendarDays size={18} />
                        Calendar
                    </button>
                    <button
                        className={`tab ${activeTab === 'insights' ? 'active' : ''}`}
                        onClick={() => setActiveTab('insights')}
                    >
                        <BarChart3 size={18} />
                        Insights
                    </button>
                    <button
                        className={`tab ${activeTab === 'pipeline' ? 'active' : ''}`}
                        onClick={() => setActiveTab('pipeline')}
                    >
                        <GitBranch size={18} />
                        Pipeline
                        {pipelineEnabled && (
                            <span className="tab-badge" style={{ backgroundColor: '#10B981', color: 'white' }}>
                                Active
                            </span>
                        )}
                    </button>
                    <button
                        className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
                        onClick={() => setActiveTab('settings')}
                    >
                        <Settings size={18} />
                        Settings
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="tab-content">
                {activeTab === 'posts' && renderPostsView()}
                {activeTab === 'calendar' && renderCalendarView()}
                {activeTab === 'insights' && renderInsightsView()}
                {activeTab === 'pipeline' && renderPipelineView()}
                {activeTab === 'settings' && renderSettingsView()}
            </div>

            {/* Create/Edit Post Modal */}
            {(showCreateModal || showEditModal) && (
                <div className="modal-overlay" onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    setEditingPost(null);
                    resetForm();
                }}>
                    <div className="modal modal-extra-large" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2 className="modal-title">
                                    {showEditModal ? 'Edit Post' : 'Create Social Media Post'}
                                </h2>
                                <p className="modal-subtitle">
                                    {showEditModal 
                                        ? 'Update your post details'
                                        : 'Post to multiple platforms at once or schedule for later'
                                    }
                                </p>
                            </div>
                            <div className="modal-header-actions">
                                <button
                                    className="btn-icon"
                                    onClick={() => setShowPreview(!showPreview)}
                                    title={showPreview ? 'Hide Preview' : 'Show Preview'}
                                >
                                    <Eye size={20} />
                                </button>
                                <button
                                    className="modal-close"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setShowEditModal(false);
                                        setEditingPost(null);
                                        resetForm();
                                    }}
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>
                        <div className="modal-body-split">
                            {/* Left Side - Form */}
                            <div className="modal-form-section">
                            <div className="form-group">
                                <div className="form-group-header">
                                    <label>Select Platforms *</label>
                                    <button
                                        type="button"
                                        className="btn-link"
                                        onClick={selectAllPlatforms}
                                    >
                                        {selectedPlatforms.length === platforms.filter(p => p.connected).length 
                                            ? 'Deselect All' 
                                            : 'Select All'}
                                    </button>
                                </div>
                                <p className="form-help-text">Choose one or more platforms to post to</p>
                                <div className="platform-selector-grid">
                                    {platforms.map(platform => {
                                        const Icon = platform.icon;
                                        const isSelected = selectedPlatforms.includes(platform.id);
                                        const charLimit = platform.charLimit;
                                        const isOverLimit = postContent.length > charLimit;
                                        return (
                                            <button
                                                key={platform.id}
                                                type="button"
                                                className={`platform-option-card ${isSelected ? 'active' : ''} ${!platform.connected ? 'disabled' : ''} ${isSelected && isOverLimit ? 'warning' : ''}`}
                                                onClick={() => platform.connected && togglePlatform(platform.id)}
                                                disabled={!platform.connected}
                                                style={{
                                                    borderColor: isSelected ? platform.color : '#e0e0e0',
                                                    backgroundColor: isSelected ? platform.color + '10' : '#fff'
                                                }}
                                            >
                                                <div className="platform-option-header">
                                                    <Icon size={28} style={{ color: platform.color }} />
                                                    <span>{platform.name}</span>
                                                    {isSelected && (
                                                        <span className="char-limit-badge" style={{ 
                                                            backgroundColor: isOverLimit ? '#fee2e2' : '#dbeafe',
                                                            color: isOverLimit ? '#dc2626' : '#1d4ed8'
                                                        }}>
                                                            {charLimit}
                                                        </span>
                                                    )}
                                                </div>
                                                {!platform.connected && (
                                                    <span className="platform-disabled-badge">Not Connected</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="form-group">
                                <div className="form-group-header">
                                    <label htmlFor="post-content">Post Content *</label>
                                    {charWarning && (
                                        <span className={`char-warning ${charWarning.type}`}>
                                            {charWarning.type === 'error' ? <AlertCircle size={16} /> : <Clock size={16} />}
                                            {charWarning.message}
                                        </span>
                                    )}
                                </div>
                                <textarea
                                    id="post-content"
                                    className={`form-control ${charWarning?.type === 'error' ? 'error' : ''}`}
                                    rows="10"
                                    placeholder="Write your post content here... This will be posted to all selected platforms."
                                    value={postContent}
                                    onChange={(e) => setPostContent(e.target.value)}
                                />
                                <div className="form-help-row">
                                    <div className="char-count-info">
                                        <span className={`char-count ${postContent.length > 0 ? 'active' : ''}`}>
                                            {postContent.length} characters
                                        </span>
                                        {selectedPlatforms.length > 0 && (
                                            <span className="char-limits">
                                                {selectedPlatforms.map(pId => {
                                                    const platform = platforms.find(p => p.id === pId);
                                                    const isOver = postContent.length > (platform?.charLimit || 0);
                                                    return (
                                                        <span key={pId} className={`platform-char-limit ${isOver ? 'over' : ''}`}>
                                                            {platform?.name}: {platform?.charLimit}
                                                        </span>
                                                    );
                                                })}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Hashtags Helper */}
                            <div className="form-group">
                                <div className="form-group-header">
                                    <label>Hashtags (Optional)</label>
                                    <button
                                        type="button"
                                        className="btn-link"
                                        onClick={() => setShowHashtagAnalytics(true)}
                                    >
                                        <Hash size={16} />
                                        Analytics
                                    </button>
                                </div>
                                <div className="hashtags-input-group">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Enter hashtags separated by commas (e.g., marketing, business, tips)"
                                        value={hashtags}
                                        onChange={(e) => setHashtags(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-outline"
                                        onClick={addHashtags}
                                        disabled={!hashtags.trim()}
                                    >
                                        Add
                                    </button>
                                </div>
                                {postContent && (
                                    <div className="hashtag-suggestions">
                                        <span className="suggestions-label">Suggestions:</span>
                                        {getHashtagSuggestions(postContent).map((tag, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                className="hashtag-suggestion-tag"
                                                onClick={() => {
                                                    const newTag = tag.startsWith('#') ? tag : `#${tag}`;
                                                    setHashtags(prev => prev ? `${prev}, ${newTag}` : newTag);
                                                }}
                                            >
                                                {tag.startsWith('#') ? tag : `#${tag}`}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <small className="form-text">Add hashtags to increase reach and engagement</small>
                            </div>

                            <div className="form-group">
                                <label htmlFor="post-image">Image (Optional)</label>
                                <div className="image-upload-area">
                                    {postImage ? (
                                        <div className="image-preview">
                                            <img src={postImage} alt="Preview" />
                                            <button
                                                type="button"
                                                className="remove-image-btn"
                                                onClick={() => setPostImage(null)}
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <label htmlFor="image-upload" className="image-upload-label">
                                            <Upload size={32} />
                                            <div>
                                                <span className="upload-text">Click to upload or drag and drop</span>
                                                <span className="upload-hint">PNG, JPG, GIF up to 10MB</span>
                                            </div>
                                            <input
                                                id="image-upload"
                                                type="file"
                                                accept="image/*"
                                                style={{ display: 'none' }}
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        if (file.size > 10 * 1024 * 1024) {
                                                            alert('Image size must be less than 10MB');
                                                            return;
                                                        }
                                                        const reader = new FileReader();
                                                        reader.onload = (e) => setPostImage(e.target.result);
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={postNow}
                                        onChange={(e) => setPostNow(e.target.checked)}
                                    />
                                    <span>
                                        <Zap size={16} />
                                        Post immediately (publish now instead of scheduling)
                                    </span>
                                </label>
                            </div>

                            {!postNow && (
                                <div className="form-row">
                                    <div className="form-group">
                                        <div className="form-group-header">
                                            <label htmlFor="scheduled-date">
                                                <Calendar size={16} />
                                                Scheduled Date *
                                            </label>
                                            <button
                                                type="button"
                                                className="btn-link"
                                                onClick={() => setShowBestTimeModal(true)}
                                            >
                                                <Lightbulb size={16} />
                                                Best Times
                                            </button>
                                        </div>
                                        <input
                                            id="scheduled-date"
                                            type="date"
                                            className="form-control"
                                            value={scheduledDate}
                                            onChange={(e) => setScheduledDate(e.target.value)}
                                            min={new Date().toISOString().split('T')[0]}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="scheduled-time">
                                            <Clock size={16} />
                                            Scheduled Time *
                                        </label>
                                        <input
                                            id="scheduled-time"
                                            type="time"
                                            className="form-control"
                                            value={scheduledTime}
                                            onChange={(e) => setScheduledTime(e.target.value)}
                                        />
                                        {useBestTime && selectedPlatforms.length > 0 && (
                                            <div className="best-time-suggestions">
                                                {selectedPlatforms.map(platformId => {
                                                    const platform = platforms.find(p => p.id === platformId);
                                                    const bestTimes = getBestPostingTimes()[platformId] || [];
                                                    return (
                                                        <div key={platformId} className="best-time-platform">
                                                            <span className="best-time-label">{platform?.name}:</span>
                                                            {bestTimes.map((time, i) => (
                                                                <button
                                                                    key={i}
                                                                    type="button"
                                                                    className="best-time-btn"
                                                                    onClick={() => setScheduledTime(time)}
                                                                >
                                                                    {time}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            <div className="form-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={useBestTime}
                                        onChange={(e) => setUseBestTime(e.target.checked)}
                                    />
                                    <span>
                                        <Target size={16} />
                                        Use best posting times (based on your audience analytics)
                                    </span>
                                </label>
                            </div>
                            </div>

                            {/* Right Side - Preview */}
                            {showPreview && (
                                <div className="modal-preview-section">
                                    <div className="preview-header">
                                        <h3>Live Preview</h3>
                                        <p>See how your post will look on each platform</p>
                                    </div>
                                    <div className="platform-previews">
                                        {selectedPlatforms.length === 0 ? (
                                            <div className="preview-empty">
                                                <Share2 size={48} />
                                                <p>Select platforms to see preview</p>
                                            </div>
                                        ) : (
                                            selectedPlatforms.map(platformId => {
                                                const platform = platforms.find(p => p.id === platformId);
                                                const Icon = platform?.icon || Share2;
                                                const isOverLimit = postContent.length > (platform?.charLimit || 0);
                                                return (
                                                    <div key={platformId} className="platform-preview-card">
                                                        <div className="preview-platform-header" style={{ borderLeftColor: platform?.color }}>
                                                            <Icon size={20} style={{ color: platform?.color }} />
                                                            <span className="preview-platform-name">{platform?.name}</span>
                                                            {isOverLimit && (
                                                                <span className="preview-warning-badge">
                                                                    <AlertCircle size={14} />
                                                                    Over limit
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="preview-content">
                                                            {postImage && (
                                                                <div className="preview-image">
                                                                    <img src={postImage} alt="Preview" />
                                                                </div>
                                                            )}
                                                            <div className="preview-text">
                                                                {postContent || (
                                                                    <span className="preview-placeholder">Your post content will appear here...</span>
                                                                )}
                                                            </div>
                                                            {hashtags && (
                                                                <div className="preview-hashtags">
                                                                    {hashtags.split(',').map((tag, i) => (
                                                                        <span key={i} className="hashtag-preview">
                                                                            {tag.trim().startsWith('#') ? tag.trim() : `#${tag.trim()}`}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            <div className="preview-footer">
                                                                <div className="preview-char-count" style={{ 
                                                                    color: isOverLimit ? '#dc2626' : 'inherit' 
                                                                }}>
                                                                    {postContent.length} / {platform?.charLimit} characters
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setShowEditModal(false);
                                    setEditingPost(null);
                                    resetForm();
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={showEditModal ? () => handleUpdatePost(editingPost.id, {
                                    platforms: selectedPlatforms,
                                    content: postContent,
                                    scheduledDate: postNow ? null : `${scheduledDate}T${scheduledTime}:00`,
                                    image: postImage
                                }) : handleCreatePost}
                                disabled={loading || selectedPlatforms.length === 0 || !postContent.trim() || (charWarning?.type === 'error')}
                            >
                                {loading ? (
                                    <>
                                        <RefreshCw size={18} className="spinning" />
                                        {showEditModal ? 'Updating...' : 'Posting...'}
                                    </>
                                ) : (
                                    <>
                                        {postNow ? <Zap size={18} /> : <Calendar size={18} />}
                                        {showEditModal 
                                            ? 'Update Post' 
                                            : postNow ? 'Post Now' : 'Schedule Post'
                                        }
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Best Time to Post Modal */}
            {showBestTimeModal && (
                <div className="modal-overlay" onClick={() => setShowBestTimeModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2 className="modal-title">
                                    <Lightbulb size={24} />
                                    Best Times to Post
                                </h2>
                                <p className="modal-subtitle">Optimal posting times based on your audience engagement</p>
                            </div>
                            <button className="modal-close" onClick={() => setShowBestTimeModal(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="best-times-grid">
                                {platforms.filter(p => p.connected).map(platform => {
                                    const Icon = platform.icon;
                                    const bestTimes = getBestPostingTimes()[platform.id] || [];
                                    return (
                                        <div key={platform.id} className="best-time-card">
                                            <div className="best-time-platform-header">
                                                <Icon size={24} style={{ color: platform.color }} />
                                                <h4>{platform.name}</h4>
                                            </div>
                                            <div className="best-time-list">
                                                {bestTimes.length > 0 ? (
                                                    bestTimes.map((time, i) => (
                                                        <div key={i} className="best-time-item">
                                                            <Clock size={16} />
                                                            <span>{time}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-muted">No data available</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-primary" onClick={() => {
                                setUseBestTime(true);
                                setShowBestTimeModal(false);
                            }}>
                                Use Best Times
                            </button>
                            <button className="btn btn-secondary" onClick={() => setShowBestTimeModal(false)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hashtag Analytics Modal */}
            {showHashtagAnalytics && (
                <div className="modal-overlay" onClick={() => setShowHashtagAnalytics(false)}>
                    <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2 className="modal-title">
                                    <Hash size={24} />
                                    Hashtag Analytics
                                </h2>
                                <p className="modal-subtitle">Track performance of your hashtags</p>
                            </div>
                            <button className="modal-close" onClick={() => setShowHashtagAnalytics(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="hashtag-stats-grid">
                                <div className="hashtag-stat-card">
                                    <div className="stat-icon" style={{ backgroundColor: '#3B82F620', color: '#3B82F6' }}>
                                        <TrendingUp size={24} />
                                    </div>
                                    <div className="stat-content">
                                        <span className="stat-label">Top Hashtag</span>
                                        <span className="stat-value">#marketing</span>
                                        <span className="stat-change">+15% this week</span>
                                    </div>
                                </div>
                                <div className="hashtag-stat-card">
                                    <div className="stat-icon" style={{ backgroundColor: '#10B98120', color: '#10B981' }}>
                                        <Activity size={24} />
                                    </div>
                                    <div className="stat-content">
                                        <span className="stat-label">Total Reach</span>
                                        <span className="stat-value">45.2K</span>
                                        <span className="stat-change">From hashtags</span>
                                    </div>
                                </div>
                                <div className="hashtag-stat-card">
                                    <div className="stat-icon" style={{ backgroundColor: '#F59E0B20', color: '#F59E0B' }}>
                                        <Users size={24} />
                                    </div>
                                    <div className="stat-content">
                                        <span className="stat-label">Engagement Rate</span>
                                        <span className="stat-value">8.5%</span>
                                        <span className="stat-change">Above average</span>
                                    </div>
                                </div>
                            </div>
                            <div className="hashtag-trending">
                                <h4>Trending Hashtags</h4>
                                <div className="trending-tags">
                                    {['#marketing', '#business', '#socialmedia', '#digital', '#growth', '#tips', '#strategy', '#innovation'].map((tag, i) => (
                                        <div key={i} className="trending-tag-item">
                                            <Hash size={16} />
                                            <span>{tag}</span>
                                            <span className="trending-score">+{Math.floor(Math.random() * 20) + 5}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowHashtagAnalytics(false)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SocialMediaAutomation;
