# Social Media APIs - Quick Reference

## 1. Facebook
- **API**: `POST https://graph.facebook.com/v18.0/{page-id}/feed`
- **Auth**: Page Access Token
- **Creds**: App ID, App Secret, Page Access Token
- **Docs**: https://developers.facebook.com/docs/graph-api

## 2. X (Twitter)
- **API**: `POST https://api.twitter.com/2/tweets`
- **Auth**: Bearer Token or OAuth 1.0a
- **Creds**: API Key, API Secret, Bearer Token
- **Docs**: https://developer.twitter.com/en/docs/twitter-api

## 3. Instagram
- **API**: `POST https://graph.facebook.com/v18.0/{account-id}/media` (then publish)
- **Auth**: Long-lived Access Token
- **Creds**: Instagram Business Account ID, Access Token
- **Docs**: https://developers.facebook.com/docs/instagram-api

## 4. LinkedIn
- **API**: `POST https://api.linkedin.com/v2/ugcPosts`
- **Auth**: OAuth 2.0 Access Token
- **Creds**: Client ID, Client Secret, Access Token
- **Docs**: https://learn.microsoft.com/en-us/linkedin/

## 5. WhatsApp
- **API**: `POST https://graph.facebook.com/v18.0/{phone-number-id}/messages`
- **Auth**: Access Token
- **Creds**: Phone Number ID, Access Token
- **Docs**: https://developers.facebook.com/docs/whatsapp

## 6. YouTube
- **API**: `POST https://www.googleapis.com/upload/youtube/v3/videos`
- **Auth**: OAuth 2.0 Access Token
- **Creds**: Client ID, Client Secret, Refresh Token, Channel ID
- **Docs**: https://developers.google.com/youtube/v3

---

## Your Backend API Endpoints Needed

```
POST   /api/social-media/posts/bulk          # Post to multiple platforms
GET    /api/social-media/posts               # Get all posts
GET    /api/social-media/posts/:id           # Get specific post
POST   /api/social-media/posts               # Create post
PUT    /api/social-media/posts/:id           # Update post
DELETE /api/social-media/posts/:id           # Delete post
PATCH  /api/social-media/posts/:id/status    # Pause/resume post
GET    /api/social-media/posts/:id/insights   # Get post analytics
GET    /api/social-media/insights            # Get aggregated insights
GET    /api/social-media/stats               # Get platform stats
POST   /api/social-media/platforms/:id/connect    # Connect platform
DELETE /api/social-media/platforms/:id/disconnect # Disconnect platform
GET    /api/social-media/platforms/connected      # Get connected platforms
```

---

## Required Environment Variables

```env
# Facebook
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
FACEBOOK_PAGE_ACCESS_TOKEN=

# X/Twitter
TWITTER_API_KEY=
TWITTER_API_SECRET=
TWITTER_BEARER_TOKEN=

# Instagram
INSTAGRAM_BUSINESS_ACCOUNT_ID=
INSTAGRAM_ACCESS_TOKEN=

# LinkedIn
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_ACCESS_TOKEN=

# WhatsApp
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=

# YouTube
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REFRESH_TOKEN=
YOUTUBE_CHANNEL_ID=
```
