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
    const data = doc.data();
    return {
        id: doc.id,
        content: data.content || '',
        platforms: data.platforms || [],
        scheduledDate: convertTimestamp(data.scheduled_date || data.scheduledDate),
        publishedDate: convertTimestamp(data.published_date || data.publishedDate),
        status: data.status || 'scheduled',
        image: data.image || data.imageUrl || null,
        source: data.source || 'manual',
        webhookId: data.webhook_id || data.webhookId || null,
        receivedAt: convertTimestamp(data.received_at || data.receivedAt),
        propertyData: data.property_data || data.propertyData || null,
        insights: data.insights || null,
        createdAt: convertTimestamp(data.created_at),
        updatedAt: convertTimestamp(data.updated_at),
    };
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
            let q = collection(db, COLLECTION_NAME);

            // Apply filters
            if (filters.platform && filters.platform !== 'all') {
                q = query(q, where('platforms', 'array-contains', filters.platform));
            }

            if (filters.status && filters.status !== 'all') {
                q = query(q, where('status', '==', filters.status));
            }

            if (filters.source) {
                q = query(q, where('source', '==', filters.source));
            }

            // Order by created_at descending (newest first)
            q = query(q, orderBy('created_at', 'desc'));

            const querySnapshot = await getDocs(q);
            const posts = querySnapshot.docs.map(convertFirestorePost);

            // Apply search filter client-side if provided
            if (filters.searchQuery) {
                const searchLower = filters.searchQuery.toLowerCase();
                return posts.filter(post => 
                    post.content.toLowerCase().includes(searchLower)
                );
            }

            return posts;
        } catch (error) {
            console.error('Error fetching posts from Firestore:', error);
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
            let q = collection(db, COLLECTION_NAME);

            // Apply filters
            if (filters.platform && filters.platform !== 'all') {
                q = query(q, where('platforms', 'array-contains', filters.platform));
            }

            if (filters.status && filters.status !== 'all') {
                q = query(q, where('status', '==', filters.status));
            }

            if (filters.source) {
                q = query(q, where('source', '==', filters.source));
            }

            q = query(q, orderBy('created_at', 'desc'));

            return onSnapshot(q, (snapshot) => {
                const posts = snapshot.docs.map(convertFirestorePost);
                
                // Apply search filter if provided
                let filteredPosts = posts;
                if (filters.searchQuery) {
                    const searchLower = filters.searchQuery.toLowerCase();
                    filteredPosts = posts.filter(post => 
                        post.content.toLowerCase().includes(searchLower)
                    );
                }

                callback(filteredPosts);
            }, (error) => {
                console.error('Error in posts subscription:', error);
                callback([]);
            });
        } catch (error) {
            console.error('Error setting up posts subscription:', error);
            return () => {}; // Return empty unsubscribe function
        }
    },

    /**
     * Get post statistics
     */
    async getPostStats() {
        try {
            const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
            const posts = querySnapshot.docs.map(convertFirestorePost);

            const stats = {
                total: posts.length,
                published: posts.filter(p => p.status === 'published').length,
                scheduled: posts.filter(p => p.status === 'scheduled').length,
                paused: posts.filter(p => p.status === 'paused').length,
                failed: posts.filter(p => p.status === 'failed').length,
                webhook: posts.filter(p => p.source === 'webhook').length,
                manual: posts.filter(p => p.source === 'manual').length,
                byPlatform: {
                    facebook: posts.filter(p => p.platforms?.includes('facebook')).length,
                    twitter: posts.filter(p => p.platforms?.includes('twitter')).length,
                    instagram: posts.filter(p => p.platforms?.includes('instagram')).length,
                    linkedin: posts.filter(p => p.platforms?.includes('linkedin')).length,
                    whatsapp: posts.filter(p => p.platforms?.includes('whatsapp')).length,
                    youtube: posts.filter(p => p.platforms?.includes('youtube')).length,
                }
            };

            return stats;
        } catch (error) {
            console.error('Error getting post stats from Firestore:', error);
            throw error;
        }
    },
};

export default socialMediaFirebaseService;
