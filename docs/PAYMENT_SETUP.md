# Payment Setup Guide for Creators

This guide explains how to configure your payment settings when creating your AlgoPay Plus account.

## Overview

AlgoPay Plus supports two payment methods:
1. **Cryptocurrency (USDC on Algorand)** - Direct blockchain payments
2. **Credit Card (via Stripe)** - Traditional payment processing

## Payment Configuration During Signup

When you create your creator account, you'll be asked to provide payment configuration details:

### 1. Algorand Wallet (Required)

Your Algorand wallet address is automatically captured when you connect your Pera Wallet. This is where you'll receive:
- USDC donations from supporters
- Direct cryptocurrency payments

**Setup:**
- Click "Connect Pera Wallet" during signup
- Your wallet address will be automatically saved
- All crypto donations go directly to this wallet

### 2. Stripe Payment Keys (Optional)

You can configure Stripe to receive credit card payments. There are two options:

#### Option A: Platform Payments (Default)
If you leave the Stripe fields empty, card payments will be processed through the AlgoPay Plus platform account. This means:
- Easier setup (no Stripe account needed)
- Platform handles payment processing
- Payments are batched and transferred to your wallet

#### Option B: Direct Payments (Recommended for High Volume)
Configure your own Stripe account to receive payments directly:

**Stripe Account ID:**
- Format: `acct_xxxxxxxxxxxxx`
- Used for Stripe Connect integration
- Payments go directly to your Stripe account
- How to get: Set up a [Stripe Connect account](https://stripe.com/connect)

**Stripe Publishable Key:**
- Format: `pk_test_xxxxxxxxxxxxx` (test) or `pk_live_xxxxxxxxxxxxx` (live)
- Used for processing card payments
- Find in your Stripe Dashboard under API Keys
- Only use publishable keys (never secret keys in frontend)

## How to Get Your Stripe Keys

1. **Create a Stripe Account:**
   - Go to [stripe.com](https://stripe.com)
   - Sign up for a free account
   - Complete account verification

2. **Get Your API Keys:**
   - Log into your Stripe Dashboard
   - Navigate to Developers → API Keys
   - Copy your **Publishable Key** (starts with `pk_`)
   - For production, use Live keys; for testing, use Test keys

3. **Set Up Stripe Connect (Optional but Recommended):**
   - Enable Stripe Connect in your Stripe Dashboard
   - Get your Connect Account ID
   - This allows you to receive payments directly

## Security Notes

- **Never share your Secret Key** - Only use publishable keys in the signup form
- **Publishable keys are safe** - They can be publicly visible
- **Test in test mode first** - Use test keys before going live
- **Protect your account** - Enable 2FA on your Stripe account

## Payment Flow

### For Crypto Donations:
```
Supporter → (USDC Transfer) → Your Algorand Wallet
```

### For Card Donations (Platform):
```
Supporter → Stripe (Platform) → Batch Transfer → Your Wallet
```

### For Card Donations (Direct):
```
Supporter → Stripe → Your Stripe Account → Your Bank
```

## Updating Payment Settings

If you need to update your payment settings after signup:
1. Contact support or
2. Update your creator profile in the dashboard (feature coming soon)

## FAQs

**Q: Do I need both crypto and card payment options?**
A: No, but having both maximizes donations. Crypto is required; card payments are optional.

**Q: Which option should I choose?**
A: Start with platform payments. Switch to direct Stripe payments when you're receiving regular donations.

**Q: Are there fees?**
A:
- Crypto: Only Algorand network fees (minimal)
- Card (Platform): Standard processing fees
- Card (Direct): Your Stripe account fees

**Q: Is my payment information secure?**
A: Yes. We only store publishable keys and account IDs, never secret keys or sensitive data.

## Support

For payment setup assistance:
- Email: support@algopay.plus
- Documentation: [docs.algopay.plus](https://docs.algopay.plus)
- Discord: [discord.gg/algopay](https://discord.gg/algopay)
