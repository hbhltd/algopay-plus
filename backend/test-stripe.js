require('dotenv').config();
const Stripe = require('stripe');

console.log('🔑 Testing Stripe Configuration...\n');

// Check if key exists
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not found in environment');
  process.exit(1);
}

console.log('✅ STRIPE_SECRET_KEY found');
console.log(`📝 Key starts with: ${process.env.STRIPE_SECRET_KEY.substring(0, 20)}...`);

// Initialize Stripe
try {
  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  console.log('\n✅ Stripe initialized successfully');

  // Test the key by making a simple API call
  stripe.products.list({ limit: 1 })
    .then((products) => {
      console.log('✅ Stripe API connection successful!');
      console.log(`📦 Found ${products.data.length} product(s) in your account`);
      console.log('\n🎉 Stripe is fully configured and working!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Stripe API Error:',error.message);
      if (error.type === 'StripeAuthenticationError') {
        console.error('🔐 Authentication failed - please check your API key');
      }
      process.exit(1);
    });
} catch (error) {
  console.error('\n❌ Error initializing Stripe:', error.message);
  process.exit(1);
}
