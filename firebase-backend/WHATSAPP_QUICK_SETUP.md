# WhatsApp Business API - Quick Setup

## 🚀 Quick Setup (5 minutes)

### Step 1: Get Your Credentials from Meta

1. Go to: https://developers.facebook.com/apps/
2. Select your app (or create one)
3. Go to **WhatsApp** → **API Setup**
4. Copy:
   - **Phone number ID** (e.g., `123456789012345`)
   - **Temporary access token** (or generate System User Token)

### Step 2: Configure in Firebase

```bash
cd firebase-backend

# Set Meta WhatsApp Business API credentials
firebase functions:config:set \
  whatsapp.phone_number_id="YOUR_PHONE_NUMBER_ID" \
  whatsapp.access_token="YOUR_ACCESS_TOKEN"
```

**Example:**
```bash
firebase functions:config:set \
  whatsapp.phone_number_id="123456789012345" \
  whatsapp.access_token="EAAxxxxxxxxxxxxx"
```

### Step 3: Remove AiSensy Config (if switching)

```bash
firebase functions:config:unset whatsapp.api_key
firebase functions:config:unset whatsapp.campaign_name
```

### Step 4: Deploy

```bash
firebase deploy --only functions
```

### Step 5: Test

Send a test message via your application!

## ✅ Verify Setup

```bash
firebase functions:config:get whatsapp
```

Should show:
```json
{
  "phone_number_id": "123456789012345",
  "access_token": "EAAxxxxxxxxxxxxx"
}
```

## 🔄 Switch Between APIs

**Use Meta API:**
```bash
firebase functions:config:unset whatsapp.api_key
firebase functions:config:set whatsapp.phone_number_id="..." whatsapp.access_token="..."
```

**Use AiSensy:**
```bash
firebase functions:config:unset whatsapp.phone_number_id
firebase functions:config:unset whatsapp.access_token
firebase functions:config:set whatsapp.api_key="..."
```

## 📚 Full Documentation

See `WHATSAPP_BUSINESS_API_SETUP.md` for detailed setup instructions.

