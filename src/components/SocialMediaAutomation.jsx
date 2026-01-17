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
import PostsView from './social-media/PostsView';
import CalendarView from './social-media/CalendarView';
import InsightsView from './social-media/InsightsView';
import PipelineView from './social-media/PipelineView';

function SocialMediaAutomation({ 
    searchQuery: externalSearchQuery = '',
    filterPlatform: externalFilterPlatform = 'all',
    filterStatus: externalFilterStatus = 'all'
}) {
    const [activeTab, setActiveTab] = useState('posts'); // posts, calendar, insights, pipeline
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
                console.log('[Social Media] Loading posts from Firestore...');
                
                // Check if Firebase is initialized
                if (!socialMediaFirebaseService) {
                    throw new Error('Firebase service is not initialized');
                }

                // Get all posts
                const allPosts = await socialMediaFirebaseService.getAllPosts({
                    platform: externalFilterPlatform,
                    status: externalFilterStatus,
                    searchQuery: externalSearchQuery
                });

                console.log('[Social Media] Posts loaded:', allPosts?.length || 0);

                // Separate manual and webhook posts
                const manualPosts = allPosts.filter(p => p.source === 'manual' || !p.source);
                const webhookPostsData = allPosts.filter(p => p.source === 'webhook');

                setPosts(manualPosts);
                setWebhookPosts(webhookPostsData);

                // Load insights/stats
                try {
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
                } catch (statsError) {
                    console.warn('[Social Media] Error loading stats (non-critical):', statsError);
                    // Set default insights if stats fail
                    setInsights({
                        totalPosts: allPosts.length,
                        totalReach: 0,
                        totalEngagement: 0,
                        totalLikes: 0,
                        totalComments: 0,
                        totalShares: 0,
                        platformStats: {
                            facebook: { posts: 0, reach: 0, engagement: 0 },
                            twitter: { posts: 0, reach: 0, engagement: 0 },
                            instagram: { posts: 0, reach: 0, engagement: 0 },
                            linkedin: { posts: 0, reach: 0, engagement: 0 },
                            whatsapp: { posts: 0, reach: 0, engagement: 0 },
                            youtube: { posts: 0, reach: 0, engagement: 0 }
                        }
                    });
                }
            } catch (error) {
                console.error('[Social Media] Error loading posts from Firestore:', error);
                console.error('[Social Media] Error details:', {
                    message: error.message,
                    code: error.code,
                    stack: error.stack
                });
                
                // Show user-friendly error message
                const errorMessage = error.message || 'Unknown error';
                let userMessage = 'Failed to load social media posts';
                
                if (error.code === 'permission-denied') {
                    userMessage = 'Permission denied. Please check your Firebase security rules.';
                } else if (error.code === 'unavailable') {
                    userMessage = 'Firebase service is unavailable. Please check your internet connection.';
                } else if (error.message?.includes('index')) {
                    userMessage = 'Firestore index missing. Please create the required index in Firebase Console.';
                } else if (error.message) {
                    userMessage = `Error: ${error.message}`;
                }
                
                alert(`${userMessage}\n\nCheck browser console for more details.`);
                
                // Fallback to empty arrays on error
                setPosts([]);
                setWebhookPosts([]);
                setInsights({
                    totalPosts: 0,
                    totalReach: 0,
                    totalEngagement: 0,
                    totalLikes: 0,
                    totalComments: 0,
                    totalShares: 0,
                    platformStats: {
                        facebook: { posts: 0, reach: 0, engagement: 0 },
                        twitter: { posts: 0, reach: 0, engagement: 0 },
                        instagram: { posts: 0, reach: 0, engagement: 0 },
                        linkedin: { posts: 0, reach: 0, engagement: 0 },
                        whatsapp: { posts: 0, reach: 0, engagement: 0 },
                        youtube: { posts: 0, reach: 0, engagement: 0 }
                    }
                });
            } finally {
                setLoading(false);
            }
        };

        loadPosts();

        // Subscribe to real-time updates
        let unsubscribe;
        try {
            unsubscribe = socialMediaFirebaseService.subscribeToPosts((updatedPosts) => {
                console.log('[Social Media] Real-time update received:', updatedPosts?.length || 0, 'posts');
                const manualPosts = (updatedPosts || []).filter(p => p.source === 'manual' || !p.source);
                const webhookPostsData = (updatedPosts || []).filter(p => p.source === 'webhook');
                setPosts(manualPosts);
                setWebhookPosts(webhookPostsData);
            }, {
                platform: externalFilterPlatform,
                status: externalFilterStatus,
                searchQuery: externalSearchQuery
            });
        } catch (subscribeError) {
            console.error('[Social Media] Error setting up subscription:', subscribeError);
        }

        return () => {
            if (unsubscribe && typeof unsubscribe === 'function') {
                unsubscribe();
            }
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
        <PostsView
            posts={filteredPosts}
            platforms={platforms}
            selectedPosts={selectedPosts}
            onToggleSelection={(postId, clearAll) => {
                if (clearAll) {
                    setSelectedPosts([]);
                } else {
                    togglePostSelection(postId);
                }
            }}
            onPreview={(post) => {
                // TODO: Implement preview
                alert('Preview: ' + post.content.substring(0, 50));
            }}
            onEdit={handleEditPost}
            onDelete={handleDeletePost}
            onToggleStatus={handleToggleStatus}
            onBulkDelete={handleBulkDelete}
            onBulkStatusChange={handleBulkStatusChange}
            onCreateClick={() => {
                resetForm();
                setShowCreateModal(true);
            }}
            searchQuery={externalSearchQuery}
            filterPlatform={externalFilterPlatform}
            filterStatus={externalFilterStatus}
        />
    );

    const renderCalendarView = () => (
        <CalendarView
            posts={posts}
            onCreateClick={() => {
                resetForm();
                setShowCreateModal(true);
            }}
            onBestTimesClick={() => setShowBestTimeModal(true)}
        />
    );


    const renderInsightsView = () => (
        <InsightsView
            insights={insights}
            platforms={platforms}
        />
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

    const renderPipelineView = () => (
        <PipelineView
            pipelineEnabled={pipelineEnabled}
            onTogglePipeline={handleTogglePipeline}
            webhookUrl={webhookUrl}
            webhookSecret={webhookSecret}
            webhookCopied={webhookCopied}
            onCopyWebhookUrl={copyWebhookUrl}
            onCopyWebhookSecret={copyWebhookSecret}
            webhookPosts={webhookPosts}
            posts={posts}
            platforms={platforms}
            selectedPosts={selectedPosts}
            onToggleSelection={togglePostSelection}
            onPreview={(post) => {
                // TODO: Implement preview
                alert('Preview: ' + post.content.substring(0, 50));
            }}
            onEdit={handleEditPost}
            onDelete={handleDeletePost}
            onToggleStatus={handleToggleStatus}
            loading={loading}
            onSendTestWebhook={sendTestWebhook}
        />
    );


    return (
        <div className="social-media-automation">
            {/* Header */}
            <div className="card">
                <div className="card-header" style={{ justifyContent: 'flex-end' }}>
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
                </div>
            </div>

            {/* Content */}
            <div className="tab-content">
                {activeTab === 'posts' && renderPostsView()}
                {activeTab === 'calendar' && renderCalendarView()}
                {activeTab === 'insights' && renderInsightsView()}
                {activeTab === 'pipeline' && renderPipelineView()}
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
