# 📚 AlgoPay Plus API Documentation

**Version:** 1.0.0
**Base URL:** `http://localhost:3001` (development) | `https://api.yourdomain.com` (production)
**Last Updated:** November 28, 2025

---

## Table of Contents
1. [Authentication](#authentication)
2. [Creators](#creators)
3. [Donations](#donations)
4. [Payments (Stripe)](#payments-stripe)
5. [NFTs](#nfts)
6. [Subscriptions](#subscriptions) 🆕
7. [Content Gating](#content-gating) 🆕
8. [Email Preferences](#email-preferences) 🆕
9. [Analytics](#analytics)
10. [Email Notifications](#email-notifications)
11. [Error Handling](#error-handling)

---

## Authentication

Currently, the API uses wallet address verification and Supabase RLS policies. Future versions may include JWT tokens.

---

## Creators

### Create Creator
```http
POST /api/creators
```

**Request Body:**
```json
{
  "username": "johndoe",
  "displayName": "John Doe",
  "bio": "Content creator and artist",
  "email": "john@example.com",
  "walletAddress": "ALGORAND_WALLET_ADDRESS",
  "twitter": "https://twitter.com/johndoe",
  "youtube": "https://youtube.com/@johndoe",
  "website": "https://johndoe.com",
  "avatarUrl": "https://example.com/avatar.jpg"
}
```

**Response:**
```json
{
  "id": "uuid",
  "username": "johndoe",
  "display_name": "John Doe",
  "bio": "Content creator and artist",
  "email": "john@example.com",
  "wallet_address": "ALGORAND_WALLET_ADDRESS",
  "avatar_url": "https://example.com/avatar.jpg",
  "subscription_tier": "basic",
  "is_active": true,
  "created_at": "2025-11-28T12:00:00Z"
}
```

**Errors:**
- `400` - Username already taken
- `500` - Server error

---

### Get Creator by Username
```http
GET /api/creators/:username
```

**Example:**
```bash
curl http://localhost:3001/api/creators/johndoe
```

**Response:**
```json
{
  "id": "uuid",
  "username": "johndoe",
  "display_name": "John Doe",
  "bio": "Content creator and artist",
  "wallet_address": "ALGORAND_WALLET_ADDRESS",
  "avatar_url": "https://example.com/avatar.jpg",
  "subscription_tier": "pro",
  "subscription_expires_at": "2025-12-28T12:00:00Z",
  "created_at": "2025-11-28T12:00:00Z"
}
```

---

### Get Creator by Wallet
```http
GET /api/creators/by-wallet/:address
```

**Example:**
```bash
curl http://localhost:3001/api/creators/by-wallet/ALGORAND_WALLET_ADDRESS
```

---

### Get Creator Stats
```http
GET /api/creators/:id/stats
```

**Response:**
```json
{
  "totalReceived": "1250.50",
  "donationCount": 42,
  "supporterCount": 28
}
```

---

## Donations

### Create Donation
```http
POST /api/donations
```

**Request Body:**
```json
{
  "creatorId": "uuid",
  "amount": 25.00,
  "donorWallet": "DONOR_WALLET_ADDRESS",
  "donorName": "Jane Smith",
  "donorEmail": "jane@example.com",
  "message": "Love your content!",
  "txHash": "ALGORAND_TRANSACTION_HASH",
  "paymentMethod": "crypto"
}
```

**Response:**
```json
{
  "id": "uuid",
  "creator_id": "uuid",
  "amount": "25.00",
  "donor_wallet": "DONOR_WALLET_ADDRESS",
  "donor_name": "Jane Smith",
  "donor_email": "jane@example.com",
  "message": "Love your content!",
  "tx_hash": "ALGORAND_TRANSACTION_HASH",
  "payment_method": "crypto",
  "status": "completed",
  "created_at": "2025-11-28T12:00:00Z"
}
```

**Triggers:**
- Sends email notification to creator
- Sends receipt to donor (if email provided)
- Checks for NFT eligibility and auto-mints if qualified

---

### Get Donations for Creator
```http
GET /api/donations/:creatorId
```

**Response:**
```json
[
  {
    "id": "uuid",
    "amount": "25.00",
    "donor_name": "Jane Smith",
    "message": "Love your content!",
    "payment_method": "crypto",
    "status": "completed",
    "created_at": "2025-11-28T12:00:00Z"
  }
]
```

---

## Payments (Stripe)

### Create Payment Intent
```http
POST /api/payments/create
```

**Request Body:**
```json
{
  "amount": 50.00,
  "creatorId": "uuid",
  "donorEmail": "donor@example.com",
  "donorName": "Alex Johnson",
  "message": "Keep up the great work!"
}
```

**Response:**
```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "donationId": "uuid"
}
```

**Usage:**
Use the `clientSecret` with Stripe Elements on the frontend to complete the payment.

---

### Stripe Webhook
```http
POST /api/stripe/webhook
```

**Headers:**
```
stripe-signature: <webhook signature>
```

**Events Handled:**
- `payment_intent.succeeded` - Updates donation status to completed, sends notifications

---

## NFTs

### Create NFT Tier Configuration
```http
POST /api/nft/config
```

**Request Body:**
```json
{
  "creatorId": "uuid",
  "name": "Gold Supporter",
  "description": "Exclusive NFT for $50+ supporters",
  "minDonationAmount": 50.00,
  "imageUrl": "https://example.com/nft-image.png",
  "maxSupply": 100
}
```

**Response:**
```json
{
  "id": "uuid",
  "creator_id": "uuid",
  "name": "Gold Supporter",
  "description": "Exclusive NFT for $50+ supporters",
  "min_donation_amount": "50.00",
  "image_url": "https://example.com/nft-image.png",
  "max_supply": 100,
  "current_supply": 0,
  "active": true,
  "created_at": "2025-11-28T12:00:00Z"
}
```

---

### Get NFT Tiers for Creator
```http
GET /api/creators/:username/nfts
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Gold Supporter",
    "min_donation_amount": "50.00",
    "image_url": "https://example.com/nft-image.png",
    "current_supply": 15,
    "max_supply": 100,
    "active": true
  }
]
```

---

## Subscriptions 🆕

### Create Subscription
```http
POST /api/subscriptions/create
```

**Request Body:**
```json
{
  "creatorId": "uuid",
  "tier": "pro",
  "paymentMethod": "stripe",
  "paymentTxHash": "pi_xxx"
}
```

**Tiers:**
- `basic` - Free (365 days)
- `pro` - $9.99/month (30 days)
- `premium` - $29.99/month (30 days)

**Response:**
```json
{
  "id": "uuid",
  "creator_id": "uuid",
  "tier": "pro",
  "status": "active",
  "amount": "9.99",
  "starts_at": "2025-11-28T12:00:00Z",
  "expires_at": "2025-12-28T12:00:00Z",
  "auto_renew": true,
  "created_at": "2025-11-28T12:00:00Z"
}
```

---

### Get Creator's Subscription
```http
GET /api/subscriptions/:creatorId
```

Returns the most recent subscription for the creator.

---

### Check Subscription Status
```http
GET /api/subscriptions/check/:creatorId
```

**Response:**
```json
{
  "tier": "pro",
  "expiresAt": "2025-12-28T12:00:00Z",
  "isActive": true,
  "status": "active"
}
```

---

### Cancel Subscription
```http
PUT /api/subscriptions/:id/cancel
```

**Response:**
```json
{
  "id": "uuid",
  "status": "canceled",
  "auto_renew": false
}
```

---

### Renew Subscription
```http
POST /api/subscriptions/:id/renew
```

**Request Body:**
```json
{
  "paymentTxHash": "pi_xxx"
}
```

Creates a new subscription period starting from now.

---

### Get Subscription History
```http
GET /api/subscriptions/history/:creatorId
```

Returns all past and current subscriptions for a creator.

---

## Content Gating 🆕

### Upload/Create Content
```http
POST /api/content
```

**Request Body:**
```json
{
  "creatorId": "uuid",
  "title": "Exclusive Tutorial",
  "description": "Advanced techniques for supporters only",
  "contentType": "video",
  "contentUrl": "https://storage.example.com/video.mp4",
  "thumbnailUrl": "https://storage.example.com/thumb.jpg",
  "isGated": true,
  "requiredNftConfigId": "uuid"
}
```

**Content Types:**
- `video`
- `image`
- `post`
- `file`

**Response:**
```json
{
  "id": "uuid",
  "creator_id": "uuid",
  "title": "Exclusive Tutorial",
  "description": "Advanced techniques for supporters only",
  "content_type": "video",
  "content_url": "https://storage.example.com/video.mp4",
  "thumbnail_url": "https://storage.example.com/thumb.jpg",
  "is_gated": true,
  "required_nft_config_id": "uuid",
  "views": 0,
  "created_at": "2025-11-28T12:00:00Z"
}
```

---

### Get All Content for Creator
```http
GET /api/content/creator/:creatorId
```

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Exclusive Tutorial",
    "content_type": "video",
    "is_gated": true,
    "views": 42,
    "nft_configs": {
      "name": "Gold Supporter",
      "min_donation_amount": "50.00"
    },
    "created_at": "2025-11-28T12:00:00Z"
  }
]
```

---

### Get Specific Content (with Access Check)
```http
GET /api/content/:id?walletAddress=WALLET_ADDRESS
```

**Response (No Access):**
```json
{
  "id": "uuid",
  "title": "Exclusive Tutorial",
  "description": "Advanced techniques for supporters only",
  "is_gated": true,
  "hasAccess": false,
  "content_url": null,
  "thumbnail_url": "https://storage.example.com/thumb.jpg"
}
```

**Response (With Access):**
```json
{
  "id": "uuid",
  "title": "Exclusive Tutorial",
  "is_gated": true,
  "hasAccess": true,
  "content_url": "https://storage.example.com/video.mp4",
  "thumbnail_url": "https://storage.example.com/thumb.jpg"
}
```

---

### Check User Access to Content
```http
GET /api/content/:id/access?walletAddress=WALLET_ADDRESS
```

**Response:**
```json
{
  "hasAccess": true,
  "reason": "User owns required NFT",
  "requiredNftConfigId": "uuid",
  "ownedNfts": [
    {
      "id": "uuid",
      "token_id": "nft-token-123"
    }
  ]
}
```

---

### Increment View Count
```http
POST /api/content/:id/view
```

**Response:**
```json
{
  "views": 43
}
```

---

### Update Content
```http
PUT /api/content/:id
```

**Request Body:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "isGated": false
}
```

---

### Delete Content
```http
DELETE /api/content/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Content deleted successfully"
}
```

---

## Email Preferences 🆕

### Get Email Preferences
```http
GET /api/email-preferences/:creatorId
```

**Response:**
```json
{
  "creator_id": "uuid",
  "welcome_email": true,
  "donation_notifications": true,
  "weekly_reports": true,
  "marketing_emails": false,
  "updated_at": "2025-11-28T12:00:00Z"
}
```

**Note:** If no preferences exist, returns defaults.

---

### Update Email Preferences
```http
PUT /api/email-preferences/:creatorId
```

**Request Body:**
```json
{
  "welcomeEmail": true,
  "donationNotifications": true,
  "weeklyReports": false,
  "marketingEmails": false
}
```

---

### Unsubscribe from All Emails
```http
POST /api/email-preferences/unsubscribe
```

**Request Body:**
```json
{
  "creatorId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Unsubscribed from all emails",
  "data": {
    "welcome_email": false,
    "donation_notifications": false,
    "weekly_reports": false,
    "marketing_emails": false
  }
}
```

---

## Analytics

### Dashboard Analytics
```http
GET /api/analytics/dashboard/:creatorId?period=30
```

**Query Parameters:**
- `period` (optional) - Number of days (default: 30)

**Response:**
```json
{
  "totalRevenue": "1250.50",
  "previousPeriodRevenue": "980.25",
  "growthPercentage": 27.6,
  "donationCount": 42,
  "uniqueSupporters": 28,
  "averageDonation": "29.77",
  "paymentMethodBreakdown": {
    "crypto": 30,
    "card": 12
  }
}
```

---

### Revenue Analytics
```http
GET /api/analytics/revenue/:creatorId?period=30
```

**Response:**
```json
{
  "revenueOverTime": [
    {
      "date": "2025-11-01",
      "amount": "150.00",
      "count": 5
    }
  ],
  "totalRevenue": "1250.50",
  "averagePerDay": "41.68"
}
```

---

### Supporter Analytics
```http
GET /api/analytics/supporters/:creatorId
```

**Response:**
```json
{
  "topSupporters": [
    {
      "donor_name": "Jane Smith",
      "total_donated": "500.00",
      "donation_count": 10
    }
  ],
  "retentionRate": 0.65,
  "newVsReturning": {
    "new": 15,
    "returning": 13
  }
}
```

---

### Payment Breakdown
```http
GET /api/analytics/breakdown/:creatorId
```

**Response:**
```json
{
  "crypto": 30,
  "card": 12,
  "cryptoRevenue": "900.00",
  "cardRevenue": "350.50"
}
```

---

### Export CSV
```http
GET /api/analytics/export/csv/:creatorId
```

**Response:**
Downloads CSV file with donation data.

---

### Export JSON
```http
GET /api/analytics/export/json/:creatorId
```

**Response:**
Downloads JSON file with complete analytics data.

---

## Email Notifications

### Send Test Email
```http
POST /api/notifications/test
```

**Request Body:**
```json
{
  "email": "test@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test email sent!"
}
```

---

### Automated Emails

The following emails are sent automatically:

1. **Welcome Email** - When creator signs up
2. **Donation Notification** - When creator receives a donation
3. **Donation Receipt** - Sent to donor after donation
4. **Weekly Report** - Every Monday at 9 AM (cron job)

---

## Error Handling

### Standard Error Response
```json
{
  "error": "Error message description"
}
```

### HTTP Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

Currently, no rate limiting is implemented. For production, consider:
- 100 requests per minute per IP
- 1000 requests per hour per API key

---

## Webhooks

### Stripe Webhooks

Configure in Stripe Dashboard:
```
Endpoint URL: https://api.yourdomain.com/api/stripe/webhook
Events: payment_intent.succeeded
```

---

## CORS Configuration

**Allowed Origins (Development):**
```
http://localhost:3000
```

**Production:**
Update `FRONTEND_URL` in environment variables.

---

## Environment Variables

See `.env.example` for required configuration:

```bash
# Backend
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
STRIPE_SECRET_KEY=your_stripe_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
EMAIL_PROVIDER=resend
RESEND_API_KEY=your_resend_key
```

---

## API Changelog

### Version 1.0.0 (November 28, 2025)
- ✅ Initial release
- ✅ Creator management
- ✅ Donation system
- ✅ Stripe payments
- ✅ NFT rewards
- ✅ Analytics
- ✅ Email notifications
- 🆕 Subscription system
- 🆕 Content gating
- 🆕 Email preferences

---

## Support

For API issues or questions:
- Check server logs
- Review error messages
- Test with cURL or Postman
- Verify environment variables

---

**Built with ❤️ using Algorand blockchain**

