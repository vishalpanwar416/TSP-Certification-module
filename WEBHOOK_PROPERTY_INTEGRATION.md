# Property Listing Webhook Integration Guide

This guide explains how to integrate your property listing system with the Social Media Automation Pipeline to automatically post new property listings to social media platforms.

## Overview

When a new property is listed in your system, you can send a webhook request to automatically create and post property details across all connected social media platforms (Facebook, X/Twitter, Instagram, LinkedIn, WhatsApp).

## Webhook Endpoint

**URL:** `POST {YOUR_API_URL}/api/webhooks/social-media`

**Authentication:** Optional webhook secret (configure in Firebase Functions config)

## Request Format

### Headers
```
Content-Type: application/json
```

### Request Body

```json
{
  "type": "property_listing",
  "property": {
    "id": "property_123",
    "title": "Luxury 3BHK Apartment",
    "location": "Mumbai, Maharashtra",
    "price": "₹2.5 Crores",
    "area": "1500 sq ft",
    "bedrooms": 3,
    "bathrooms": 2,
    "description": "Beautiful modern apartment with premium amenities in prime location. Perfect for families looking for a comfortable living space.",
    "imageUrl": "https://example.com/property-image.jpg",
    "propertyUrl": "https://example.com/property/123",
    "reraNumber": "RERA/123/2024",
    "amenities": ["Parking", "Gym", "Swimming Pool", "Security", "Lift"]
  },
  "platforms": ["facebook", "twitter", "instagram", "linkedin", "whatsapp"],
  "postImmediately": true,
  "scheduledAt": "2024-01-20T10:00:00Z",
  "webhookSecret": "your_webhook_secret"
}
```

### Required Fields

- `type`: Must be `"property_listing"`
- `property.title`: Property title/name
- `property.location`: Property location/address
- `property.price`: Property price (formatted string)

### Optional Fields

- `property.id`: Unique property identifier
- `property.area`: Property area (e.g., "1500 sq ft")
- `property.bedrooms`: Number of bedrooms
- `property.bathrooms`: Number of bathrooms
- `property.description`: Detailed property description
- `property.imageUrl`: URL to property image
- `property.propertyUrl`: URL to property details page
- `property.reraNumber`: RERA registration number
- `property.amenities`: Array of amenity names
- `platforms`: Array of platform IDs to post to (defaults to all)
- `postImmediately`: Boolean - post immediately or schedule (default: false)
- `scheduledAt`: ISO date string for scheduled posts
- `webhookSecret`: Webhook secret for authentication

## Response Format

### Success Response (200)

```json
{
  "success": true,
  "message": "Property posted to social media",
  "postId": "abc123-def456-ghi789",
  "post": {
    "id": "abc123-def456-ghi789",
    "content": "Formatted post content...",
    "platforms": ["facebook", "twitter", "instagram", "linkedin", "whatsapp"],
    "status": "published",
    "propertyData": {
      "propertyId": "property_123",
      "title": "Luxury 3BHK Apartment",
      "location": "Mumbai, Maharashtra",
      "price": "₹2.5 Crores"
    }
  }
}
```

### Error Response (400/500)

```json
{
  "error": "Missing required fields",
  "message": "Missing fields: title, location",
  "missingFields": ["title", "location"]
}
```

## Post Content Format

The webhook automatically formats property data into a social media-friendly post:

```
🏠 NEW PROPERTY LISTING

📍 Luxury 3BHK Apartment
📍 Location: Mumbai, Maharashtra
💰 Price: ₹2.5 Crores
📐 Area: 1500 sq ft
🛏️ 3 BHK | 2 Bath

Beautiful modern apartment with premium amenities...

✨ Amenities: Parking, Gym, Swimming Pool, Security, Lift

🏆 RERA: RERA/123/2024

🔗 View Details: https://example.com/property/123

#RealEstate #PropertyListing #NewListing #Mumbai #PropertyForSale #RealEstateInvestment
```

## Platform Support

The webhook supports posting to:
- **Facebook** - Full post with image
- **X (Twitter)** - Text post (280 char limit, will be truncated if needed)
- **Instagram** - Post with image
- **LinkedIn** - Professional post
- **WhatsApp** - Message format

## Integration Examples

### cURL Example

```bash
curl -X POST https://your-api-url.com/api/webhooks/social-media \
  -H "Content-Type: application/json" \
  -d '{
    "type": "property_listing",
    "property": {
      "title": "Luxury 3BHK Apartment",
      "location": "Mumbai, Maharashtra",
      "price": "₹2.5 Crores",
      "area": "1500 sq ft",
      "bedrooms": 3,
      "bathrooms": 2,
      "description": "Beautiful apartment...",
      "imageUrl": "https://example.com/image.jpg",
      "propertyUrl": "https://example.com/property/123"
    },
    "platforms": ["facebook", "twitter", "instagram"],
    "postImmediately": true
  }'
```

### JavaScript/Node.js Example

```javascript
async function postPropertyToSocialMedia(propertyData) {
  const response = await fetch('https://your-api-url.com/api/webhooks/social-media', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'property_listing',
      property: propertyData,
      platforms: ['facebook', 'twitter', 'instagram', 'linkedin'],
      postImmediately: true
    })
  });

  const result = await response.json();
  return result;
}

// Usage
const property = {
  title: 'Luxury 3BHK Apartment',
  location: 'Mumbai, Maharashtra',
  price: '₹2.5 Crores',
  area: '1500 sq ft',
  bedrooms: 3,
  bathrooms: 2,
  description: 'Beautiful modern apartment...',
  imageUrl: 'https://example.com/image.jpg',
  propertyUrl: 'https://example.com/property/123'
};

postPropertyToSocialMedia(property);
```

### PHP Example

```php
<?php
function postPropertyToSocialMedia($propertyData) {
    $url = 'https://your-api-url.com/api/webhooks/social-media';
    
    $data = [
        'type' => 'property_listing',
        'property' => $propertyData,
        'platforms' => ['facebook', 'twitter', 'instagram'],
        'postImmediately' => true
    ];
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($response, true);
}

// Usage
$property = [
    'title' => 'Luxury 3BHK Apartment',
    'location' => 'Mumbai, Maharashtra',
    'price' => '₹2.5 Crores',
    'area' => '1500 sq ft',
    'bedrooms' => 3,
    'bathrooms' => 2,
    'description' => 'Beautiful modern apartment...',
    'imageUrl' => 'https://example.com/image.jpg',
    'propertyUrl' => 'https://example.com/property/123'
];

$result = postPropertyToSocialMedia($property);
?>
```

## Setup Instructions

### 1. Enable the Pipeline

1. Navigate to **Social Media Automation** → **Pipeline** tab
2. Toggle the pipeline to **Active**
3. Copy the webhook URL from the configuration section

### 2. Configure Webhook Secret (Optional but Recommended)

```bash
firebase functions:config:set webhook.secret="your_secure_secret_here"
```

### 3. Test the Webhook

Use the "Send Test Webhook" button in the Settings tab to verify the integration.

## Monitoring

- View all webhook posts in the **Pipeline** tab
- Check post status (published, scheduled, failed)
- Monitor post insights and engagement
- Track property-specific posts with the property badge

## Best Practices

1. **Always include images**: Property images significantly increase engagement
2. **Use descriptive titles**: Clear, compelling property titles perform better
3. **Include RERA numbers**: Builds trust and credibility
4. **Schedule strategically**: Use `postImmediately: false` and schedule for optimal posting times
5. **Monitor performance**: Check insights to see which properties perform best
6. **Use proper formatting**: Ensure price and area are clearly formatted

## Troubleshooting

### Webhook not receiving data
- Verify the pipeline is enabled
- Check the webhook URL is correct
- Ensure the request format matches the expected structure

### Posts not appearing
- Check the Pipeline tab for webhook posts
- Verify the post status (may be scheduled, not immediate)
- Check browser console for errors

### Authentication errors
- Verify webhook secret matches configuration
- Check Firebase Functions config

## Support

For issues or questions, check:
- Pipeline tab for post status
- Settings tab for connection status
- Browser console for detailed error messages
