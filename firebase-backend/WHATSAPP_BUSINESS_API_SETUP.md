# WhatsApp Business API Integration Guide

This guide will help you integrate Meta's official WhatsApp Business API into your application.

## 📋 Prerequisites

1. **Meta Business Account** - You need a Facebook Business account
2. **Meta Developer Account** - Create at https://developers.facebook.com
3. **WhatsApp Business Account** - Set up in Meta Business Manager
4. **Verified Business** - Your business must be verified by Meta

## 🚀 Step-by-Step Setup

### Step 1: Create Meta App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click **"My Apps"** → **"Create App"**
3. Select **"Business"** as the app type
4. Fill in app details:
   - App Name: "Top Selling Properties"
   - Contact Email: Your email
5. Click **"Create App"**

### Step 2: Add WhatsApp Product

1. In your app dashboard, click **"Add Product"**
2. Find **"WhatsApp"** and click **"Set Up"**
3. Follow the setup wizard

### Step 3: Get Your Credentials

You'll need these three values:

#### 1. Phone Number ID
- Go to **WhatsApp** → **API Setup** in your app dashboard
- Find **"Phone number ID"** (looks like: `123456789012345`)
- Copy this value

#### 2. Access Token
- In the same **API Setup** page
- Find **"Temporary access token"** (for testing)
- Or generate a **System User Token** (for production)
- Copy this value

#### 3. Business Account ID (Optional)
- Go to **Meta Business Manager** → **Business Settings**
- Find your **Business Account ID**
- Copy this value

### Step 4: Configure in Firebase

Run these commands to set your credentials:

```bash
cd firebase-backend

# Set WhatsApp Business API credentials
firebase functions:config:set \
  whatsapp.phone_number_id="YOUR_PHONE_NUMBER_ID" \
  whatsapp.access_token="YOUR_ACCESS_TOKEN" \
  whatsapp.business_account_id="YOUR_BUSINESS_ACCOUNT_ID" \
  whatsapp.api_version="v18.0"
```

**Example:**
```bash
firebase functions:config:set \
  whatsapp.phone_number_id="123456789012345" \
  whatsapp.access_token="EAAxxxxxxxxxxxxx" \
  whatsapp.business_account_id="987654321098765" \
  whatsapp.api_version="v18.0"
```

### Step 5: Switch to Meta API

The service supports both AiSensy and Meta API. To use Meta API:

1. **Remove AiSensy config** (if set):
```bash
firebase functions:config:unset whatsapp.api_key
firebase functions:config:unset whatsapp.campaign_name
```

2. **Set Meta API config** (as shown in Step 4)

3. **Deploy functions:**
```bash
firebase deploy --only functions
```

## 🔑 Access Token Types

### Temporary Token (Testing)
- Valid for 24 hours
- Good for development/testing
- Found in API Setup page

### System User Token (Production)
1. Go to **Meta Business Manager** → **Business Settings** → **Users** → **System Users**
2. Create a new System User
3. Assign WhatsApp permissions
4. Generate token with **WhatsApp Business Management** permission
5. Set expiration (recommended: 60 days)

### Permanent Token (Recommended)
Use **WhatsApp Cloud API** with a permanent token:
1. Set up webhook verification
2. Use long-lived access tokens
3. Implement token refresh mechanism

## 📝 API Version

Current supported version: **v18.0**

To use a different version:
```bash
firebase functions:config:set whatsapp.api_version="v19.0"
```

## ✅ Verify Configuration

After setting up, verify your configuration:

```bash
firebase functions:config:get whatsapp
```

You should see:
```json
{
  "phone_number_id": "123456789012345",
  "access_token": "EAAxxxxxxxxxxxxx",
  "business_account_id": "987654321098765",
  "api_version": "v18.0"
}
```

## 🧪 Test Your Integration

### Test via API Endpoint

```bash
curl -X POST https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/api/certificates/CERT_ID/send-whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+919876543210"
  }'
```

### Test via Frontend

1. Go to your application
2. Create a certificate
3. Click "Send via WhatsApp"
4. Enter a test phone number
5. Check if message is received

## 🔒 Security Best Practices

1. **Never commit tokens to git**
   - Use Firebase Functions config
   - Or environment variables

2. **Use System User Tokens for production**
   - More secure than temporary tokens
   - Can be rotated easily

3. **Set token expiration**
   - Regularly rotate access tokens
   - Monitor token expiration

4. **Restrict API access**
   - Use IP whitelisting if possible
   - Monitor API usage

## 📊 Rate Limits

WhatsApp Business API has rate limits:
- **Tier 1**: 1,000 conversations per 24 hours
- **Tier 2**: 10,000 conversations per 24 hours
- **Tier 3**: 100,000 conversations per 24 hours

Check your tier in Meta Business Manager.

## 🐛 Troubleshooting

### Error: "Invalid OAuth access token"
- Token expired or invalid
- Regenerate token in Meta Business Manager

### Error: "Phone number not registered"
- Phone number not added to your WhatsApp Business Account
- Add phone number in Meta Business Manager

### Error: "Message template not found"
- Template not approved
- Submit template for approval first

### Error: "Rate limit exceeded"
- Too many messages sent
- Wait for rate limit window to reset
- Upgrade your tier if needed

## 📚 Additional Resources

- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp)
- [Meta for Developers](https://developers.facebook.com/)
- [WhatsApp Business API Setup Guide](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
- [API Reference](https://developers.facebook.com/docs/whatsapp/cloud-api/reference)

## 🔄 Switching Between AiSensy and Meta API

The service automatically detects which API to use:

- **If `api_key` is set** → Uses AiSensy
- **If `phone_number_id` and `access_token` are set** → Uses Meta API

To switch:
1. Unset the config you don't want to use
2. Set the config for the API you want
3. Redeploy functions

