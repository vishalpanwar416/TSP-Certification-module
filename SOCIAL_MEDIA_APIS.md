# Social Media APIs Reference

This document outlines all the APIs required for posting to different social media platforms.

## Overview

To post to social media platforms, you'll need to integrate with their respective Business APIs. Each platform has different authentication methods, endpoints, and requirements.

---

## 1. Facebook (Meta) API

### API Documentation
- **Graph API**: https://developers.facebook.com/docs/graph-api
- **Marketing API**: https://developers.facebook.com/docs/marketing-apis

### Authentication
- **OAuth 2.0** with Access Tokens
- **App ID** and **App Secret** required
- **Page Access Token** for posting to pages
- **User Access Token** for personal posts

### Required Credentials
```
- App ID
- App Secret
- Page ID (for page posts)
- Access Token (Page Access Token or User Access Token)
```

### Key Endpoints

#### Post to Facebook Page
```
POST https://graph.facebook.com/v18.0/{page-id}/feed
```

**Headers:**
```
Authorization: Bearer {page-access-token}
Content-Type: application/json
```

**Body:**
```json
{
  "message": "Your post content",
  "link": "https://example.com", // optional
  "published": true
}
```

#### Upload Image
```
POST https://graph.facebook.com/v18.0/{page-id}/photos
```

**Body (multipart/form-data):**
```
- message: "Your caption"
- url: "https://example.com/image.jpg" // or file upload
```

### Rate Limits
- **600 requests per 600 seconds** per user
- **200 requests per hour** for page posts

### Setup Steps
1. Create Facebook App at https://developers.facebook.com
2. Add "Pages" permission
3. Get Page Access Token
4. Use Graph API to post

---

## 2. X (Twitter) API

### API Documentation
- **Twitter API v2**: https://developer.twitter.com/en/docs/twitter-api
- **Posting Tweets**: https://developer.twitter.com/en/docs/twitter-api/tweets/manage-tweets

### Authentication
- **OAuth 2.0** with Bearer Token
- **OAuth 1.0a** for user context
- **API Key** and **API Secret**
- **Access Token** and **Access Token Secret**

### Required Credentials
```
- API Key
- API Secret Key
- Bearer Token (for app-only auth)
- Access Token (for user context)
- Access Token Secret (for user context)
```

### Key Endpoints

#### Post Tweet (v2)
```
POST https://api.twitter.com/2/tweets
```

**Headers:**
```
Authorization: Bearer {bearer-token}
Content-Type: application/json
```

**Body:**
```json
{
  "text": "Your tweet content (max 280 characters)"
}
```

#### Upload Media
```
POST https://upload.twitter.com/1.1/media/upload.json
```

**Body (multipart/form-data):**
```
- media: [file]
```

**Then attach to tweet:**
```json
{
  "text": "Your tweet",
  "media": {
    "media_ids": ["media_id_here"]
  }
}
```

### Rate Limits
- **300 tweets per 3 hours** (user auth)
- **1,500 requests per 15 minutes** (app auth)

### Setup Steps
1. Apply for Twitter Developer Account
2. Create App at https://developer.twitter.com
3. Generate API Keys and Tokens
4. Use Twitter API v2 to post

---

## 3. Instagram API

### API Documentation
- **Instagram Graph API**: https://developers.facebook.com/docs/instagram-api
- **Instagram Basic Display API**: https://developers.facebook.com/docs/instagram-basic-display-api

### Authentication
- **OAuth 2.0** via Facebook Login
- **Instagram Business Account** required
- **Facebook Page** connected to Instagram account
- **Long-lived Access Token**

### Required Credentials
```
- Facebook App ID
- Facebook App Secret
- Instagram Business Account ID
- Facebook Page ID (connected to Instagram)
- Long-lived Access Token
```

### Key Endpoints

#### Create Media Container (Image)
```
POST https://graph.facebook.com/v18.0/{instagram-business-account-id}/media
```

**Body:**
```json
{
  "image_url": "https://example.com/image.jpg",
  "caption": "Your caption (max 2200 characters)",
  "access_token": "{access-token}"
}
```

#### Publish Media
```
POST https://graph.facebook.com/v18.0/{instagram-business-account-id}/media_publish
```

**Body:**
```json
{
  "creation_id": "{media-container-id}",
  "access_token": "{access-token}"
}
```

### Rate Limits
- **200 requests per hour** per user
- **25 requests per hour** for media creation

### Setup Steps
1. Convert Instagram account to Business Account
2. Connect to Facebook Page
3. Create Facebook App
4. Get Instagram Business Account ID
5. Use Instagram Graph API

---

## 4. LinkedIn API

### API Documentation
- **LinkedIn API v2**: https://learn.microsoft.com/en-us/linkedin/
- **Share API**: https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/ugc-posts-api

### Authentication
- **OAuth 2.0** with 3-legged OAuth
- **Client ID** and **Client Secret**
- **Access Token** (with specific scopes)

### Required Credentials
```
- Client ID
- Client Secret
- Redirect URI
- Access Token (with w_member_social scope)
- Organization URN (for company pages)
```

### Key Endpoints

#### Post to Personal Profile
```
POST https://api.linkedin.com/v2/ugcPosts
```

**Headers:**
```
Authorization: Bearer {access-token}
Content-Type: application/json
X-Restli-Protocol-Version: 2.0.0
```

**Body:**
```json
{
  "author": "urn:li:person:{person-id}",
  "lifecycleState": "PUBLISHED",
  "specificContent": {
    "com.linkedin.ugc.ShareContent": {
      "shareCommentary": {
        "text": "Your post content"
      },
      "shareMediaCategory": "NONE"
    }
  },
  "visibility": {
    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
  }
}
```

#### Post to Company Page
```
POST https://api.linkedin.com/v2/ugcPosts
```

**Body:**
```json
{
  "author": "urn:li:organization:{organization-id}",
  "lifecycleState": "PUBLISHED",
  "specificContent": {
    "com.linkedin.ugc.ShareContent": {
      "shareCommentary": {
        "text": "Your post content"
      },
      "shareMediaCategory": "IMAGE",
      "media": [{
        "status": "READY",
        "media": "urn:li:digitalmediaAsset:{asset-id}",
        "title": {
          "text": "Image Title"
        }
      }]
    }
  },
  "visibility": {
    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
  }
}
```

### Rate Limits
- **500 requests per day** per user
- **100 requests per day** for UGC posts

### Setup Steps
1. Create LinkedIn App at https://www.linkedin.com/developers
2. Request Marketing Developer Platform access
3. Get OAuth tokens with required scopes
4. Use LinkedIn API v2 to post

---

## 5. WhatsApp Business API

### API Documentation
- **Meta WhatsApp Business API**: https://developers.facebook.com/docs/whatsapp
- **Cloud API**: https://developers.facebook.com/docs/whatsapp/cloud-api

### Authentication
- **OAuth 2.0** with Access Token
- **Phone Number ID** required
- **Business Account ID**

### Required Credentials
```
- Phone Number ID
- Access Token
- Business Account ID (optional)
- API Version (default: v18.0)
```

### Key Endpoints

#### Send Text Message
```
POST https://graph.facebook.com/v18.0/{phone-number-id}/messages
```

**Headers:**
```
Authorization: Bearer {access-token}
Content-Type: application/json
```

**Body:**
```json
{
  "messaging_product": "whatsapp",
  "to": "{recipient-phone-number}",
  "type": "text",
  "text": {
    "body": "Your message content (max 4096 characters)"
  }
}
```

#### Send Media Message
```
POST https://graph.facebook.com/v18.0/{phone-number-id}/messages
```

**Body:**
```json
{
  "messaging_product": "whatsapp",
  "to": "{recipient-phone-number}",
  "type": "image",
  "image": {
    "link": "https://example.com/image.jpg",
    "caption": "Your caption"
  }
}
```

### Rate Limits
- **1,000 conversations per 24 hours** (tier 1)
- **10,000 conversations per 24 hours** (tier 2)
- **100,000 conversations per 24 hours** (tier 3)

### Setup Steps
1. Create Meta App
2. Add WhatsApp product
3. Get Phone Number ID
4. Generate Access Token
5. Use WhatsApp Business API

### Alternative: AiSensy API
If using AiSensy service:
```
POST https://backend.aisensy.com/campaign/t1/api/v2
```

**Headers:**
```
Authorization: Bearer {aisensy-jwt-token}
Content-Type: application/json
```

---

## 6. YouTube API

### API Documentation
- **YouTube Data API v3**: https://developers.google.com/youtube/v3
- **Upload Videos**: https://developers.google.com/youtube/v3/guides/uploading_a_video

### Authentication
- **OAuth 2.0** with Google Sign-In
- **Client ID** and **Client Secret**
- **Refresh Token** for long-term access

### Required Credentials
```
- Client ID
- Client Secret
- Redirect URI
- Access Token
- Refresh Token
- Channel ID
```

### Key Endpoints

#### Upload Video
```
POST https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status
```

**Headers:**
```
Authorization: Bearer {access-token}
Content-Type: application/json
```

**Body:**
```json
{
  "snippet": {
    "title": "Video Title",
    "description": "Video description",
    "tags": ["tag1", "tag2"],
    "categoryId": "22"
  },
  "status": {
    "privacyStatus": "public"
  }
}
```

#### Upload Thumbnail
```
POST https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId={video-id}
```

### Rate Limits
- **10,000 units per day** (default quota)
- **Video upload**: 1,600 units per upload

### Setup Steps
1. Create Google Cloud Project
2. Enable YouTube Data API v3
3. Create OAuth 2.0 credentials
4. Get user authorization
5. Use YouTube Data API

---

## Backend Implementation Structure

### Recommended API Endpoints for Your Backend

```javascript
// POST /api/social-media/posts/bulk
// Post to multiple platforms at once
{
  "content": "Post content",
  "platforms": ["facebook", "twitter", "instagram", "linkedin", "whatsapp"],
  "scheduledAt": "2024-01-15T10:00:00Z", // optional
  "imageUrl": "https://example.com/image.jpg" // optional
}

// GET /api/social-media/posts
// Get all posts with filters
Query params: ?platform=facebook&status=scheduled

// GET /api/social-media/posts/:id
// Get specific post

// PUT /api/social-media/posts/:id
// Update post

// DELETE /api/social-media/posts/:id
// Delete post

// PATCH /api/social-media/posts/:id/status
// Pause/resume scheduled post
{
  "status": "paused" // or "scheduled"
}

// GET /api/social-media/posts/:id/insights
// Get post analytics

// GET /api/social-media/insights
// Get aggregated insights
Query params: ?platform=facebook&startDate=2024-01-01&endDate=2024-01-31

// GET /api/social-media/stats
// Get platform statistics

// POST /api/social-media/platforms/:platformId/connect
// Connect platform account
{
  "credentials": {
    "accessToken": "...",
    "refreshToken": "...",
    // platform-specific credentials
  }
}

// DELETE /api/social-media/platforms/:platformId/disconnect
// Disconnect platform

// GET /api/social-media/platforms/connected
// Get connected platforms
```

---

## Environment Variables Needed

```env
# Facebook/Meta
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret
FACEBOOK_PAGE_ACCESS_TOKEN=your_page_token

# X/Twitter
TWITTER_API_KEY=your_api_key
TWITTER_API_SECRET=your_api_secret
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret
TWITTER_BEARER_TOKEN=your_bearer_token

# Instagram
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_account_id
INSTAGRAM_ACCESS_TOKEN=your_access_token

# LinkedIn
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_ACCESS_TOKEN=your_access_token
LINKEDIN_ORGANIZATION_ID=your_org_id

# WhatsApp
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
# OR for AiSensy
WHATSAPP_AISENSY_API_KEY=your_aisensy_key
WHATSAPP_AISENSY_CAMPAIGN_NAME=your_campaign

# YouTube
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_REFRESH_TOKEN=your_refresh_token
YOUTUBE_CHANNEL_ID=your_channel_id
```

---

## Implementation Priority

### Phase 1: Basic Posting
1. ✅ Facebook (Meta Graph API)
2. ✅ X/Twitter (Twitter API v2)
3. ✅ LinkedIn (LinkedIn API v2)

### Phase 2: Media Support
4. ✅ Instagram (Instagram Graph API)
5. ✅ WhatsApp (WhatsApp Business API)

### Phase 3: Advanced Features
6. ✅ YouTube (YouTube Data API v3)
7. Analytics and Insights
8. Scheduling and Automation

---

## Common Challenges

1. **Rate Limiting**: Each platform has different rate limits
2. **Authentication**: OAuth flows vary by platform
3. **Media Upload**: Different methods for each platform
4. **Error Handling**: Platform-specific error codes
5. **Webhooks**: For real-time updates and status changes

---

## Testing

Each platform provides:
- **Sandbox/Test Environments**
- **Developer Tools**
- **API Explorer**
- **Webhook Testing Tools**

---

## Security Best Practices

1. Store credentials securely (environment variables, secrets manager)
2. Use HTTPS for all API calls
3. Implement token refresh mechanisms
4. Validate and sanitize user input
5. Implement rate limiting on your backend
6. Log API calls for debugging
7. Handle errors gracefully

---

## Resources

- **Facebook Developers**: https://developers.facebook.com
- **Twitter Developer Portal**: https://developer.twitter.com
- **LinkedIn Developers**: https://www.linkedin.com/developers
- **Google Cloud Console**: https://console.cloud.google.com
- **Meta Business**: https://business.facebook.com

---

## Notes

- All APIs require proper authentication
- Most platforms require app approval for production use
- Rate limits apply to all platforms
- Some features require business/verified accounts
- Webhooks recommended for real-time status updates
