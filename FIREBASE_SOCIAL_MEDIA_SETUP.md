# Firebase Firestore Integration for Social Media Posts

This document explains the Firebase Firestore integration for storing and managing social media posts.

## Database Structure

### Collection: `social_media_posts`

Each document in the collection has the following structure:

```javascript
{
  // Post Content
  content: string,                    // Post text content
  platforms: string[],               // Array of platform IDs ['facebook', 'twitter', etc.]
  
  // Scheduling
  scheduled_date: timestamp,          // When to post (ISO string or Firestore timestamp)
  published_date: timestamp,          // When it was published (null if not published)
  status: string,                     // 'scheduled', 'published', 'paused', 'failed'
  
  // Media
  image: string,                      // Image URL
  image_url: string,                  // Alias for image (for compatibility)
  
  // Source Tracking
  source: string,                     // 'manual' or 'webhook'
  webhook_id: string,                 // Webhook ID if from webhook (optional)
  received_at: timestamp,              // When webhook received (optional)
  
  // Property Data (for property listings)
  property_data: {
    propertyId: string,
    title: string,
    location: string,
    price: string,
    propertyUrl: string
  },
  
  // Analytics
  insights: {
    reach: number,
    engagement: number,
    likes: number,
    comments: number,
    shares: number
  },
  
  // Timestamps
  created_at: timestamp,              // Firestore server timestamp
  updated_at: timestamp               // Firestore server timestamp
}
```

## Firestore Indexes Required

You may need to create composite indexes for certain queries. Firebase will prompt you to create them when needed, or you can create them manually:

### Index 1: Platform and Status Filter
- Collection: `social_media_posts`
- Fields:
  - `platforms` (Array)
  - `status` (Ascending)
  - `created_at` (Descending)

### Index 2: Source Filter
- Collection: `social_media_posts`
- Fields:
  - `source` (Ascending)
  - `created_at` (Descending)

### Index 3: Property Data Filter
- Collection: `social_media_posts`
- Fields:
  - `property_data.propertyId` (Ascending)
  - `created_at` (Descending)

## Frontend Service

The frontend uses `socialMediaFirebaseService.js` which provides:

- **Direct Firestore Access**: No Cloud Functions required for basic CRUD
- **Real-time Updates**: Subscribe to post changes
- **Automatic Timestamp Conversion**: Handles Firestore timestamps
- **Filtering & Search**: Client-side and server-side filtering

### Key Functions:

```javascript
// Get all posts
await socialMediaFirebaseService.getAllPosts({ 
  platform: 'facebook', 
  status: 'published',
  searchQuery: 'property'
});

// Create post
await socialMediaFirebaseService.createPost(postData);

// Update post
await socialMediaFirebaseService.updatePost(id, updates);

// Delete post
await socialMediaFirebaseService.deletePost(id);

// Real-time subscription
const unsubscribe = socialMediaFirebaseService.subscribeToPosts((posts) => {
  console.log('Posts updated:', posts);
}, filters);
```

## Backend API Endpoints

The backend provides REST API endpoints that also interact with Firestore:

- `GET /api/social-media/posts` - Get all posts
- `GET /api/social-media/posts/:id` - Get post by ID
- `POST /api/social-media/posts` - Create new post
- `PUT /api/social-media/posts/:id` - Update post
- `DELETE /api/social-media/posts/:id` - Delete post
- `POST /api/social-media/posts/bulk-delete` - Bulk delete
- `PATCH /api/social-media/posts/:id/status` - Update status
- `GET /api/social-media/posts/:id/insights` - Get post insights
- `GET /api/social-media/insights` - Get aggregated insights
- `GET /api/social-media/stats` - Get platform statistics

## Webhook Integration

The webhook endpoint (`POST /api/webhooks/social-media`) automatically saves property listings to Firestore:

```javascript
// Webhook saves to Firestore with:
{
  content: "Formatted property post...",
  platforms: ["facebook", "twitter", ...],
  source: "webhook",
  webhook_id: "wh_123456",
  property_data: { ... },
  // ... other fields
}
```

## Initialization

To initialize the `social_media_posts` collection, you can:

1. **Use the init-db endpoint**:
   ```bash
   POST /init-db
   ```
   This will create the collection if it doesn't exist.

2. **Or create a document manually**:
   The collection will be created automatically when the first document is added.

## Real-time Features

The frontend automatically subscribes to Firestore changes, so:
- New posts appear instantly
- Updates are reflected in real-time
- No page refresh needed

## Security Rules

Make sure your Firestore security rules allow read/write access:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /social_media_posts/{postId} {
      // Allow read/write for authenticated users
      allow read, write: if request.auth != null;
      
      // Or allow public read (for demo purposes)
      // allow read: if true;
      // allow write: if request.auth != null;
    }
  }
}
```

## Migration from Mock Data

The component now automatically:
1. Loads posts from Firestore on mount
2. Subscribes to real-time updates
3. Saves new posts to Firestore
4. Updates/deletes posts in Firestore

No migration needed - just start using the app and posts will be saved to Firestore!

## Troubleshooting

### Posts not appearing
- Check Firestore console to see if documents exist
- Verify security rules allow read access
- Check browser console for errors

### Real-time updates not working
- Ensure Firestore is properly initialized
- Check network connection
- Verify subscription is set up correctly

### Index errors
- Firebase will prompt you to create indexes
- Or create them manually in Firebase Console
- Indexes are required for compound queries

## Best Practices

1. **Use server timestamps**: Always use `FieldValue.serverTimestamp()` for `created_at` and `updated_at`
2. **Handle nulls**: Check for null values when reading timestamps
3. **Error handling**: Always wrap Firestore calls in try-catch
4. **Cleanup subscriptions**: Unsubscribe from real-time listeners when component unmounts
5. **Batch operations**: Use batch writes for multiple operations
