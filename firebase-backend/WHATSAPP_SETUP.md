# WhatsApp Business API Setup Guide

This guide will help you set up the official **WhatsApp Cloud API (Meta)** for sending messages through your Marketing Dashboard.

## Prerequisites

1. **Meta Business Account** - Create one at [business.facebook.com](https://business.facebook.com)
2. **Facebook Developer Account** - Sign up at [developers.facebook.com](https://developers.facebook.com)
3. **Business Verification** - Your business must be verified by Meta (for production use)

---

## Step 1: Create a Meta App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click **My Apps** → **Create App**
3. Select **Business** as the app type
4. Enter your App name and contact email
5. Click **Create App**

---

## Step 2: Add WhatsApp to Your App

1. In your app dashboard, click **Add Product**
2. Find **WhatsApp** and click **Set Up**
3. You'll be taken to WhatsApp setup page

---

## Step 3: Get Your Credentials

### From the WhatsApp Setup Page:

1. **Phone Number ID**: Found under "Getting Started" → "API Setup"
   - Look for "Phone number ID" (e.g., `12345678901234`)

2. **Access Token**: 
   - Click "Generate" under "Temporary access token"
   - For production, create a **System User** token (see below)

3. **Business Account ID**: Found in your Business Settings

### System User Token (Recommended for Production)

1. Go to [Business Settings](https://business.facebook.com/settings)
2. Navigate to **Users** → **System Users**
3. Click **Add** to create a new System User
4. Assign the user **Admin** role
5. Add your WhatsApp app with permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
6. Generate a token with these permissions

---

## Step 4: Configure Firebase

Run these commands to set your WhatsApp credentials:

```bash
# Set your Phone Number ID
firebase functions:config:set whatsapp.phone_number_id="YOUR_PHONE_NUMBER_ID"

# Set your Access Token (System User token recommended)
firebase functions:config:set whatsapp.access_token="YOUR_ACCESS_TOKEN"

# Optional: Set Business Account ID
firebase functions:config:set whatsapp.business_account_id="YOUR_BUSINESS_ACCOUNT_ID"
```

### Example:
```bash
firebase functions:config:set whatsapp.phone_number_id="123456789012345"
firebase functions:config:set whatsapp.access_token="EAAGm0PX4ZCpsBAxxxxxxxxx..."
```

---

## Step 5: Register Your Phone Number

1. In Meta Business Suite, go to **WhatsApp Manager**
2. Click **Phone Numbers** → **Add Phone Number**
3. Enter your business phone number
4. Complete verification via SMS or phone call
5. Set up your Business Profile (name, description, etc.)

---

## Step 6: Deploy Firebase Functions

After setting up credentials:

```bash
cd firebase-backend
npm install
firebase deploy --only functions
```

---

## Testing

### Test with WhatsApp Sandbox (Development)

Before going live, test with the sandbox:

1. In Meta Developer Dashboard → WhatsApp → Getting Started
2. Add yourself as a test recipient
3. Send a test message through the dashboard
4. Or use our API:

```javascript
// This happens automatically when you send from the dashboard
POST /marketing/campaigns
{
    "type": "whatsapp",
    "message": "Hello! This is a test message.",
    "contactIds": ["contact_id_here"]
}
```

---

## Message Templates (Required for Business Initiation)

**Important**: WhatsApp requires approved message templates to initiate conversations. Free-form messages can only be sent in reply to user-initiated conversations within 24 hours.

### Creating a Template:

1. Go to **WhatsApp Manager** → **Message Templates**
2. Click **Create Template**
3. Choose a category:
   - `MARKETING` - Promotional messages
   - `UTILITY` - Order updates, alerts
   - `AUTHENTICATION` - OTPs, verification
4. Write your template with variables: `{{1}}`, `{{2}}`, etc.
5. Submit for approval (usually takes a few hours)

### Example Template:
```
Name: certificate_notification
Category: UTILITY
Body: "Congratulations {{1}}! Your certificate ({{2}}) is ready. Download here: {{3}}"
```

---

## API Endpoints

### Send WhatsApp Message
```
POST /marketing/campaigns
{
    "type": "whatsapp",
    "message": "Your message with {{name}} personalization",
    "contactIds": ["id1", "id2"]
}
```

### Check WhatsApp Status
```
GET /marketing/config/status
```

---

## Pricing

WhatsApp Business API messages are charged per conversation:

| Conversation Type | First 1,000/month | After 1,000 |
|-------------------|-------------------|-------------|
| Business-initiated | Free | ~$0.02-0.08 |
| User-initiated | Free | ~$0.01-0.02 |

*Prices vary by country. See [WhatsApp Pricing](https://developers.facebook.com/docs/whatsapp/pricing)*

---

## Troubleshooting

### "Access token expired"
- Generate a new token from Meta Developer Console
- For production, use a System User token (non-expiring)

### "Phone number not verified"
- Complete phone verification in WhatsApp Manager
- Ensure your business is verified

### "Template not found"
- Ensure template is approved
- Check template name spelling

### "User has not opted in"
- WhatsApp requires user consent for business messaging
- Use approved templates for first contact

---

## Support

- [WhatsApp Business Platform Docs](https://developers.facebook.com/docs/whatsapp)
- [Meta Business Help Center](https://www.facebook.com/business/help)
- [WhatsApp Business Community](https://developers.facebook.com/community/whatsapp)
