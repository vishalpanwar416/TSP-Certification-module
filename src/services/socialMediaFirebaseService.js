/**
 * Social Media Firebase Service
 * Direct Firestore integration for social media posts
 */

import { db } from '../config/firebase';
import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    writeBatch,
    onSnapshot,
    Timestamp
} from 'firebase/firestore';

const COLLECTION_NAME = 'social_media_posts';

/**
 * Convert Firestore timestamp to ISO string
 */
const convertTimestamp = (timestamp) => {
    if (!timestamp) return null;
    if (timestamp.toDate) {
        return timestamp.toDate().toISOString();
    }
    if (timestamp instanceof Timestamp) {
        return timestamp.toDate().toISOString();
    }
    return timestamp;
};

/**
 * Convert post data for Firestore (handles timestamps)
 */
const preparePostForFirestore = (postData) => {
    const { scheduledDate, publishedDate, receivedAt, ...rest } = postData;
    
    const prepared = {
        ...rest,
        scheduled_date: scheduledDate || null,
        published_date: publishedDate || null,
        received_at: receivedAt || null,
        updated_at: serverTimestamp(),
    };

    // Only add created_at if it's a new post
    if (!postData.id) {
        prepared.created_at = serverTimestamp();
    }

    return prepared;
};

/**
 * Convert Firestore document to post format
 */
const convertFirestorePost = (doc) => {
    try {
        const data = doc.data();
        if (!data) {
            console.warn('[Firebase Service] Document has no data:', doc.id);
            return null;
        }

        return {
            id: doc.id,
            content: data.content || '',
            platforms: Array.isArray(data.platforms) ? data.platforms : [],
            scheduledDate: convertTimestamp(data.scheduled_date || data.scheduledDate),
            publishedDate: convertTimestamp(data.published_date || data.publishedDate),
            status: data.status || 'scheduled',
            image: data.image || data.imageUrl || data.image_url || null,
            source: data.source || 'manual',
            webhookId: data.webhook_id || data.webhookId || null,
            receivedAt: convertTimestamp(data.received_at || data.receivedAt),
            propertyData: data.property_data || data.propertyData || null,
            insights: data.insights || null,
            createdAt: convertTimestamp(data.created_at) || new Date().toISOString(),
            updatedAt: convertTimestamp(data.updated_at) || new Date().toISOString(),
        };
    } catch (error) {
        console.error('[Firebase Service] Error converting document:', doc.id, error);
        return null;
    }
};

/**
 * Social Media Posts Firebase Service
 */
export const socialMediaFirebaseService = {
    /**
     * Get all posts with optional filters
     */
    async getAllPosts(filters = {}) {
        try {
            // Check if db is initialized
            if (!db) {
                throw new Error('Firestore database is not initialized. Please check Firebase configuration.');
            }

            console.log('[Firebase Service] Fetching posts with filters:', filters);

            let q = collection(db, COLLECTION_NAME);
            let querySnapshot;
            let useClientSideFiltering = false;

            // Try to build optimized query, but fallback to simple query if index is missing
            try {
                const conditions = [];

                // Apply filters
                if (filters.platform && filters.platform !== 'all') {
                    conditions.push(where('platforms', 'array-contains', filters.platform));
                }

                if (filters.status && filters.status !== 'all') {
                    conditions.push(where('status', '==', filters.status));
                }

                if (filters.source) {
                    conditions.push(where('source', '==', filters.source));
                }

                // Try to add orderBy, but handle case where field might not exist
                try {
                    conditions.push(orderBy('created_at', 'desc'));
                    
                    // Build query with all conditions
                    if (conditions.length > 0) {
                        q = query(q, ...conditions);
                    } else {
                        // Simple query with just orderBy
                        q = query(q, orderBy('created_at', 'desc'));
                    }

                    querySnapshot = await getDocs(q);
                    console.log('[Firebase Service] Query successful, got', querySnapshot.docs.length, 'documents');
                } catch (orderByError) {
                    // If orderBy fails, try without it
                    console.warn('[Firebase Service] orderBy failed, trying without it:', orderByError.message);
                    useClientSideFiltering = true;
                    
                    // Build query without orderBy
                    if (conditions.length > 0) {
                        q = query(q, ...conditions);
                    } else {
                        q = collection(db, COLLECTION_NAME);
                    }
                    
                    querySnapshot = await getDocs(q);
                    console.log('[Firebase Service] Query without orderBy successful, got', querySnapshot.docs.length, 'documents');
                }
            } catch (queryError) {
                // If query fails due to missing index, try simplest query
                if (queryError.code === 'failed-precondition' || queryError.code === 'invalid-argument') {
                    console.warn('[Firebase Service] Query failed, falling back to simple query:', queryError.message);
                    useClientSideFiltering = true;
                    
                    // Fallback: Get all posts without any filters
                    q = collection(db, COLLECTION_NAME);
                    querySnapshot = await getDocs(q);
                    console.log('[Firebase Service] Simple query successful, got', querySnapshot.docs.length, 'documents');
                } else {
                    throw queryError;
                }
            }

            let posts = querySnapshot.docs.map(doc => {
                try {
                    return convertFirestorePost(doc);
                } catch (convertError) {
                    console.warn('[Firebase Service] Error converting document', doc.id, ':', convertError);
                    return null;
                }
            }).filter(post => post !== null); // Remove any null posts

            console.log('[Firebase Service] Converted', posts.length, 'posts');

            // Apply filters client-side if query was simplified or if we need to
            if (useClientSideFiltering || filters.platform && filters.platform !== 'all') {
                if (filters.platform && filters.platform !== 'all') {
                    posts = posts.filter(post => post.platforms?.includes(filters.platform));
                }
            }

            if (useClientSideFiltering || filters.status && filters.status !== 'all') {
                if (filters.status && filters.status !== 'all') {
                    posts = posts.filter(post => post.status === filters.status);
                }
            }

            if (useClientSideFiltering || filters.source) {
                if (filters.source) {
                    posts = posts.filter(post => post.source === filters.source);
                }
            }

            // Sort client-side if we couldn't use orderBy
            if (useClientSideFiltering) {
                posts.sort((a, b) => {
                    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return bTime - aTime; // Descending order
                });
            }

            // Apply search filter client-side if provided
            if (filters.searchQuery) {
                const searchLower = filters.searchQuery.toLowerCase();
                posts = posts.filter(post => 
                    post.content && post.content.toLowerCase().includes(searchLower)
                );
            }

            console.log('[Firebase Service] Final posts count after filtering:', posts.length);
            return posts;
        } catch (error) {
            console.error('[Firebase Service] Error fetching posts from Firestore:', error);
            console.error('[Firebase Service] Error code:', error.code);
            console.error('[Firebase Service] Error message:', error.message);
            console.error('[Firebase Service] Error stack:', error.stack);
            
            // Provide more helpful error messages
            if (error.code === 'permission-denied') {
                throw new Error('Permission denied. Please check Firestore security rules allow read access to social_media_posts collection.');
            } else if (error.code === 'unavailable') {
                throw new Error('Firebase service is unavailable. Please check your internet connection.');
            } else if (error.message?.includes('index')) {
                throw new Error('Firestore index missing. The app will work but may be slower. Check Firebase Console for index creation link.');
            }
            
            throw error;
        }
    },

    /**
     * Get a single post by ID
     */
    async getPostById(id) {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                throw new Error('Post not found');
            }

            return convertFirestorePost(docSnap);
        } catch (error) {
            console.error('Error fetching post from Firestore:', error);
            throw error;
        }
    },

    /**
     * Create a new post
     */
    async createPost(postData) {
        try {
            const prepared = preparePostForFirestore(postData);
            const docRef = await addDoc(collection(db, COLLECTION_NAME), prepared);
            
            return {
                id: docRef.id,
                ...postData,
            };
        } catch (error) {
            console.error('Error creating post in Firestore:', error);
            throw error;
        }
    },

    /**
     * Update an existing post
     */
    async updatePost(id, updates) {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            const prepared = preparePostForFirestore(updates);
            
            // Remove created_at from updates (shouldn't change)
            delete prepared.created_at;
            
            await updateDoc(docRef, prepared);
            
            return {
                id,
                ...updates,
            };
        } catch (error) {
            console.error('Error updating post in Firestore:', error);
            throw error;
        }
    },

    /**
     * Delete a post
     */
    async deletePost(id) {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            await deleteDoc(docRef);
            return { success: true };
        } catch (error) {
            console.error('Error deleting post from Firestore:', error);
            throw error;
        }
    },

    /**
     * Delete multiple posts
     */
    async bulkDeletePosts(ids) {
        try {
            const batch = writeBatch(db);
            
            ids.forEach(id => {
                const docRef = doc(db, COLLECTION_NAME, id);
                batch.delete(docRef);
            });

            await batch.commit();
            return { success: true, deleted: ids.length };
        } catch (error) {
            console.error('Error bulk deleting posts from Firestore:', error);
            throw error;
        }
    },

    /**
     * Update post status
     */
    async updatePostStatus(id, status) {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            await updateDoc(docRef, {
                status,
                updated_at: serverTimestamp(),
            });
            return { success: true, id, status };
        } catch (error) {
            console.error('Error updating post status in Firestore:', error);
            throw error;
        }
    },

    /**
     * Get webhook posts only
     */
    async getWebhookPosts() {
        try {
            const q = query(
                collection(db, COLLECTION_NAME),
                where('source', '==', 'webhook'),
                orderBy('created_at', 'desc')
            );
            
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(convertFirestorePost);
        } catch (error) {
            console.error('Error fetching webhook posts from Firestore:', error);
            throw error;
        }
    },

    /**
     * Get posts by property ID
     */
    async getPostsByPropertyId(propertyId) {
        try {
            const q = query(
                collection(db, COLLECTION_NAME),
                where('property_data.propertyId', '==', propertyId),
                orderBy('created_at', 'desc')
            );
            
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(convertFirestorePost);
        } catch (error) {
            console.error('Error fetching property posts from Firestore:', error);
            throw error;
        }
    },

    /**
     * Subscribe to real-time updates
     */
    subscribeToPosts(callback, filters = {}) {
        try {
            if (!db) {
                console.error('[Firebase Service] Database not initialized for subscription');
                callback([]);
                return () => {}; // Return empty unsubscribe function
            }

            let q = collection(db, COLLECTION_NAME);
            let useClientSideFiltering = false;

            // Try to build query with orderBy
            try {
                const conditions = [];

                // Apply filters
                if (filters.platform && filters.platform !== 'all') {
                    conditions.push(where('platforms', 'array-contains', filters.platform));
                }

                if (filters.status && filters.status !== 'all') {
                    conditions.push(where('status', '==', filters.status));
                }

                if (filters.source) {
                    conditions.push(where('source', '==', filters.source));
                }

                conditions.push(orderBy('created_at', 'desc'));

                if (conditions.length > 0) {
                    q = query(q, ...conditions);
                } else {
                    q = query(q, orderBy('created_at', 'desc'));
                }
            } catch (queryError) {
                // If query setup fails, use simple query
                console.warn('[Firebase Service] Subscription query setup failed, using simple query:', queryError.message);
                useClientSideFiltering = true;
                q = collection(db, COLLECTION_NAME);
            }

            return onSnapshot(q, (snapshot) => {
                console.log('[Firebase Service] Subscription update, got', snapshot.docs.length, 'documents');
                
                let posts = snapshot.docs.map(doc => {
                    try {
                        return convertFirestorePost(doc);
                    } catch (convertError) {
                        console.warn('[Firebase Service] Error converting document in subscription:', doc.id);
                        return null;
                    }
                }).filter(post => post !== null);

                // Apply filters client-side if needed
                if (useClientSideFiltering) {
                    if (filters.platform && filters.platform !== 'all') {
                        posts = posts.filter(post => post.platforms?.includes(filters.platform));
                    }
                    if (filters.status && filters.status !== 'all') {
                        posts = posts.filter(post => post.status === filters.status);
                    }
                    if (filters.source) {
                        posts = posts.filter(post => post.source === filters.source);
                    }
                    // Sort client-side
                    posts.sort((a, b) => {
                        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                        return bTime - aTime;
                    });
                }
                
                // Apply search filter if provided
                if (filters.searchQuery) {
                    const searchLower = filters.searchQuery.toLowerCase();
                    posts = posts.filter(post => 
                        post.content && post.content.toLowerCase().includes(searchLower)
                    );
                }

                console.log('[Firebase Service] Subscription callback with', posts.length, 'filtered posts');
                callback(posts);
            }, (error) => {
                console.error('[Firebase Service] Error in posts subscription:', error);
                console.error('[Firebase Service] Subscription error code:', error.code);
                console.error('[Firebase Service] Subscription error message:', error.message);
                
                // Don't call callback with empty array on error - let the initial load handle it
                // callback([]);
            });
        } catch (error) {
            console.error('[Firebase Service] Error setting up posts subscription:', error);
            callback([]);
            return () => {}; // Return empty unsubscribe function
        }
    },

    /**
     * Get post statistics
     */
    async getPostStats() {
        try {
            if (!db) {
                throw new Error('Firestore database is not initialized');
            }

            let querySnapshot;
            try {
                // Try with orderBy first
                const q = query(collection(db, COLLECTION_NAME), orderBy('created_at', 'desc'));
                querySnapshot = await getDocs(q);
            } catch (orderByError) {
                // If orderBy fails, get all without ordering
                console.warn('[Firebase Service] Stats query orderBy failed, using simple query');
                querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
            }

            const posts = querySnapshot.docs.map(doc => {
                try {
                    return convertFirestorePost(doc);
                } catch (error) {
                    console.warn('[Firebase Service] Error converting document in stats:', doc.id);
                    return null;
                }
            }).filter(post => post !== null);

            const stats = {
                total: posts.length,
                published: posts.filter(p => p.status === 'published').length,
                scheduled: posts.filter(p => p.status === 'scheduled').length,
                paused: posts.filter(p => p.status === 'paused').length,
                failed: posts.filter(p => p.status === 'failed').length,
                webhook: posts.filter(p => p.source === 'webhook').length,
                manual: posts.filter(p => p.source === 'manual' || !p.source).length,
                byPlatform: {
                    facebook: posts.filter(p => p.platforms?.includes('facebook')).length,
                    twitter: posts.filter(p => p.platforms?.includes('twitter')).length,
                    instagram: posts.filter(p => p.platforms?.includes('instagram')).length,
                    linkedin: posts.filter(p => p.platforms?.includes('linkedin')).length,
                    whatsapp: posts.filter(p => p.platforms?.includes('whatsapp')).length,
                    youtube: posts.filter(p => p.platforms?.includes('youtube')).length,
                }
            };

            console.log('[Firebase Service] Stats calculated:', stats);
            return stats;
        } catch (error) {
            console.error('[Firebase Service] Error getting post stats from Firestore:', error);
            // Return default stats instead of throwing
            return {
                total: 0,
                published: 0,
                scheduled: 0,
                paused: 0,
                failed: 0,
                webhook: 0,
                manual: 0,
                byPlatform: {
                    facebook: 0,
                    twitter: 0,
                    instagram: 0,
                    linkedin: 0,
                    whatsapp: 0,
                    youtube: 0,
                }
            };
        }
    },
};

export default socialMediaFirebaseService;
