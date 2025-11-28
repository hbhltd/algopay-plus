import React, { useState, useEffect, createContext, useContext } from 'react';
import { PeraWalletConnect } from '@perawallet/connect';
import algosdk from 'algosdk';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

// API Configuration
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const ALGORAND_NODE = process.env.REACT_APP_ALGORAND_NODE || 'https://testnet-api.algonode.cloud';
const USDC_ASSET_ID = parseInt(process.env.REACT_APP_USDC_ASSET_ID) || 10458941;

// Initialize Algorand
const algodClient = new algosdk.Algodv2('', ALGORAND_NODE, '');
const peraWallet = new PeraWalletConnect();

// Auth Context
const AuthContext = createContext();

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accountAddress, setAccountAddress] = useState(null);

  useEffect(() => {
    peraWallet.reconnectSession().then(accounts => {
      if (accounts.length) {
        setAccountAddress(accounts[0]);
        // Fetch user data if logged in
        fetchUserData(accounts[0]);
      }
    }).catch(console.error);
  }, []);

  const connectWallet = async () => {
    try {
      const accounts = await peraWallet.connect();
      setAccountAddress(accounts[0]);
      await fetchUserData(accounts[0]);
      return accounts[0];
    } catch (error) {
      // User closed the modal - this is normal, don't show scary error
      if (error?.message?.includes('closed by user')) {
        console.log('Wallet connection cancelled by user');
        return null;
      }
      console.error('Wallet connection error:', error);
      throw error;
    }
  };

  const disconnectWallet = () => {
    peraWallet.disconnect();
    setAccountAddress(null);
    setUser(null);
  };

  const fetchUserData = async (address) => {
    try {
      const response = await fetch(`${API_URL}/api/creators/by-wallet/${address}`);
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, accountAddress, connectWallet, disconnectWallet }}>
      {children}
    </AuthContext.Provider>
  );
}

// Main App Component
function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [creatorUsername, setCreatorUsername] = useState(null);

  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/@')) {
      setCurrentPage('creator');
      setCreatorUsername(path.slice(2));
    } else if (path === '/signup') {
      setCurrentPage('signup');
    } else if (path === '/dashboard') {
      setCurrentPage('dashboard');
    } else if (path === '/payment-settings') {
      setCurrentPage('payment-settings');
    } else if (path === '/donors') {
      setCurrentPage('donors');
    } else if (path === '/email-settings') {
      setCurrentPage('email-settings');
    } else if (path === '/newsletters') {
      setCurrentPage('newsletters');
    } else if (path === '/pricing') {
      setCurrentPage('pricing');
    } else {
      setCurrentPage('landing');
    }
  }, []);

  const navigate = (page, username = null) => {
    setCurrentPage(page);
    setCreatorUsername(username);
    
    if (page === 'creator' && username) {
      window.history.pushState({}, '', `/@${username}`);
    } else if (page === 'landing') {
      window.history.pushState({}, '', '/');
    } else {
      window.history.pushState({}, '', `/${page}`);
    }
  };

  return (
    <AuthProvider>
      <div className="App">
        {currentPage === 'landing' && <LandingPage navigate={navigate} />}
        {currentPage === 'pricing' && <PricingPage navigate={navigate} />}
        {currentPage === 'signup' && <SignupPage navigate={navigate} />}
        {currentPage === 'dashboard' && <DashboardPage navigate={navigate} />}
        {currentPage === 'payment-settings' && <PaymentSettingsPage navigate={navigate} />}
        {currentPage === 'email-settings' && <EmailSettingsPage navigate={navigate} />}
        {currentPage === 'newsletters' && <NewslettersPage navigate={navigate} />}
        {currentPage === 'donors' && <DonorsPage navigate={navigate} />}
        {currentPage === 'creator' && <CreatorPage username={creatorUsername} navigate={navigate} />}
      </div>
    </AuthProvider>
  );
}

// Landing Page Component
function LandingPage({ navigate }) {
  const [activeTab, setActiveTab] = useState('welcome');

  const tabs = [
    { id: 'welcome', label: 'Welcome' },
    { id: 'tour', label: 'Platform Tour' },
    { id: 'examples', label: 'Examples' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'build', label: 'Build Your Page' }
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <header style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '20px 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
          <h1 style={{ fontSize: '32px', margin: 0, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Supportly
          </h1>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px', display: 'flex', gap: '30px' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '16px 8px',
                border: 'none',
                background: 'none',
                fontSize: '16px',
                fontWeight: activeTab === tab.id ? '600' : '400',
                color: activeTab === tab.id ? '#667eea' : '#6b7280',
                borderBottom: activeTab === tab.id ? '3px solid #667eea' : '3px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Tab Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '60px 20px' }}>
        {activeTab === 'welcome' && <WelcomeTab navigate={navigate} setActiveTab={setActiveTab} />}
        {activeTab === 'tour' && <TourTab />}
        {activeTab === 'examples' && <ExamplesTab navigate={navigate} />}
        {activeTab === 'pricing' && <PricingTab navigate={navigate} setActiveTab={setActiveTab} />}
        {activeTab === 'build' && <BuildTab navigate={navigate} />}
      </div>

      {/* Footer */}
      <footer style={{ backgroundColor: 'white', borderTop: '1px solid #e5e7eb', padding: '40px 0', marginTop: '80px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px', textAlign: 'center' }}>
          <p style={{ color: '#6b7280', marginBottom: '10px' }}>Questions? We're here to help!</p>
          <p style={{ fontSize: '18px', fontWeight: '600', color: '#667eea' }}>
            Email us at: <a href="mailto:support@supportly.com" style={{ color: '#667eea', textDecoration: 'none' }}>support@supportly.com</a>
          </p>
        </div>
      </footer>
    </div>
  );
}

// Welcome Tab - Hero with Core Messaging
function WelcomeTab({ navigate, setActiveTab }) {
  return (
    <div style={{ textAlign: 'center' }}>
      {/* Hero Section */}
      <div style={{ marginBottom: '80px' }}>
        <h2 style={{ fontSize: '56px', fontWeight: '700', marginBottom: '30px', lineHeight: '1.2' }}>
          It's <span style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Your Money</span>.<br />
          <span style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Your Content</span>.<br />
          <span style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Your Donors</span>.
        </h2>
        <p style={{ fontSize: '24px', color: '#6b7280', marginBottom: '40px', maxWidth: '800px', margin: '0 auto 40px' }}>
          The creator monetization platform that puts you in complete control. No percentage cuts, just a simple yearly fee.
        </p>
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('build')}
            style={{
              padding: '18px 48px',
              fontSize: '20px',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px 0 rgba(102, 126, 234, 0.4)'
            }}
          >
            Build Your Donation Page
          </button>
          <button
            onClick={() => setActiveTab('tour')}
            style={{
              padding: '18px 48px',
              fontSize: '20px',
              fontWeight: '600',
              background: 'white',
              color: '#667eea',
              border: '2px solid #667eea',
              borderRadius: '12px',
              cursor: 'pointer'
            }}
          >
            See How It Works
          </button>
        </div>
      </div>

      {/* Key Benefits */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginTop: '60px' }}>
        <div style={{ padding: '40px', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>💰</div>
          <h3 style={{ fontSize: '24px', marginBottom: '15px' }}>It's Your Money - You Keep It</h3>
          <p style={{ color: '#6b7280', fontSize: '16px' }}>
            Payments go directly to YOUR accounts. We never touch your money. Zero platform fees on donations.
          </p>
        </div>
        <div style={{ padding: '40px', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎨</div>
          <h3 style={{ fontSize: '24px', marginBottom: '15px' }}>Your Content - You Control It</h3>
          <p style={{ color: '#6b7280', fontSize: '16px' }}>
            Store content on YOUR preferred platform. Use YOUR storage. Connect YOUR tools. Total control.
          </p>
        </div>
        <div style={{ padding: '40px', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>👥</div>
          <h3 style={{ fontSize: '24px', marginBottom: '15px' }}>They Are Your Donors</h3>
          <p style={{ color: '#6b7280', fontSize: '16px' }}>
            Build direct relationships with YOUR supporters. Export their data. They're yours, not ours.
          </p>
        </div>
      </div>

      {/* Payment Methods */}
      <div style={{ marginTop: '80px', padding: '60px', backgroundColor: 'white', borderRadius: '16px' }}>
        <h3 style={{ fontSize: '32px', marginBottom: '30px' }}>Accept Payments Your Way</h3>
        <p style={{ fontSize: '18px', color: '#6b7280', marginBottom: '40px' }}>
          Choose any payment methods that work for you and your audience
        </p>
        <div style={{ display: 'flex', gap: '30px', justifyContent: 'center', flexWrap: 'wrap', fontSize: '18px', color: '#374151' }}>
          <span>💳 Stripe</span>
          <span>💰 PayPal</span>
          <span>🔷 Pera Wallet</span>
          <span>⚡ Lightning (Bitcoin)</span>
          <span>🔵 Circle USDC</span>
          <span>🌐 Noah</span>
        </div>
      </div>
    </div>
  );
}

// Tour Tab - Platform Walkthrough
function TourTab() {
  return (
    <div>
      <h2 style={{ fontSize: '42px', marginBottom: '40px', textAlign: 'center' }}>How Supportly Works</h2>

      <div style={{ display: 'grid', gap: '60px' }}>
        {/* Step 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '64px', fontWeight: '700', color: '#667eea', marginBottom: '20px' }}>01</div>
            <h3 style={{ fontSize: '32px', marginBottom: '20px' }}>Build Your Page</h3>
            <p style={{ fontSize: '18px', color: '#6b7280', lineHeight: '1.8' }}>
              Use our interactive builder to create your donation page. Upload your logo, select payment methods, connect your social media, and preview your page - all before paying a cent!
            </p>
          </div>
          <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '16px', border: '2px solid #e5e7eb' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px', textAlign: 'center' }}>🎨</div>
            <p style={{ textAlign: 'center', color: '#6b7280' }}>Interactive page builder with live preview</p>
          </div>
        </div>

        {/* Step 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', alignItems: 'center' }}>
          <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '16px', border: '2px solid #e5e7eb' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px', textAlign: 'center' }}>💳</div>
            <p style={{ textAlign: 'center', color: '#6b7280' }}>Pay with ANY method you prefer</p>
          </div>
          <div>
            <div style={{ fontSize: '64px', fontWeight: '700', color: '#667eea', marginBottom: '20px' }}>02</div>
            <h3 style={{ fontSize: '32px', marginBottom: '20px' }}>Purchase Your Platform</h3>
            <p style={{ fontSize: '18px', color: '#6b7280', lineHeight: '1.8' }}>
              Love what you built? Pay just $49.95/year using Stripe, PayPal, Pera Wallet, Lightning, Circle USDC, or Noah. Choose what works best for you!
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '64px', fontWeight: '700', color: '#667eea', marginBottom: '20px' }}>03</div>
            <h3 style={{ fontSize: '32px', marginBottom: '20px' }}>Go Live Instantly</h3>
            <p style={{ fontSize: '18px', color: '#6b7280', lineHeight: '1.8' }}>
              Your page goes live at @yourname immediately. Add your real API keys for payment methods, connect your storage (S3, R2, Spaces), and start accepting donations right away!
            </p>
          </div>
          <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '16px', border: '2px solid #e5e7eb' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px', textAlign: 'center' }}>🚀</div>
            <p style={{ textAlign: 'center', color: '#6b7280' }}>Instant activation, full control</p>
          </div>
        </div>

        {/* Step 4 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', alignItems: 'center' }}>
          <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '16px', border: '2px solid #e5e7eb' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px', textAlign: 'center' }}>💰</div>
            <p style={{ textAlign: 'center', color: '#6b7280' }}>Keep 100% of every donation</p>
          </div>
          <div>
            <div style={{ fontSize: '64px', fontWeight: '700', color: '#667eea', marginBottom: '20px' }}>04</div>
            <h3 style={{ fontSize: '32px', marginBottom: '20px' }}>Accept Donations</h3>
            <p style={{ fontSize: '18px', color: '#6b7280', lineHeight: '1.8' }}>
              Donors can give you "Boosts" (one-time) or "Wings" (recurring support) using any payment method you've enabled. Money goes directly to YOUR accounts - we never touch it!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Examples Tab
function ExamplesTab({ navigate }) {
  const examples = [
    {
      name: 'Sarah Chen',
      username: 'sarahcodes',
      category: 'Software Developer',
      description: 'Teaching programming through live coding sessions',
      methods: ['Stripe', 'Lightning', 'USDC']
    },
    {
      name: 'Alex Rivera',
      username: 'alexart',
      category: 'Digital Artist',
      description: 'Creating exclusive NFT art for supporters',
      methods: ['PayPal', 'Pera Wallet', 'Stripe']
    },
    {
      name: 'Jamie Park',
      username: 'jamiegaming',
      category: 'Gaming Streamer',
      description: 'Live streaming with exclusive Discord perks',
      methods: ['Stripe', 'Circle', 'PayPal']
    }
  ];

  return (
    <div>
      <h2 style={{ fontSize: '42px', marginBottom: '20px', textAlign: 'center' }}>Creators Using Supportly</h2>
      <p style={{ fontSize: '20px', color: '#6b7280', textAlign: 'center', marginBottom: '60px' }}>
        See how creators are building sustainable income with Supportly
      </p>

      <div style={{ display: 'grid', gap: '30px' }}>
        {examples.map((creator, index) => (
          <div key={index} style={{ backgroundColor: 'white', padding: '40px', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '28px', marginBottom: '8px' }}>{creator.name}</h3>
                <p style={{ color: '#667eea', fontSize: '18px', marginBottom: '4px' }}>@{creator.username}</p>
                <p style={{ color: '#9ca3af', fontSize: '16px' }}>{creator.category}</p>
              </div>
              <button
                onClick={() => {/* In real app, would navigate to creator page */}}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Visit Page
              </button>
            </div>
            <p style={{ fontSize: '18px', color: '#4b5563', marginBottom: '20px' }}>
              {creator.description}
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '600' }}>Accepts:</span>
              {creator.methods.map((method, i) => (
                <span key={i} style={{
                  padding: '6px 12px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#374151'
                }}>
                  {method}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Pricing Tab (simplified for homepage)
function PricingTab({ navigate, setActiveTab }) {
  return (
    <div>
      <h2 style={{ fontSize: '42px', marginBottom: '20px', textAlign: 'center' }}>Simple, Transparent Pricing</h2>
      <p style={{ fontSize: '20px', color: '#6b7280', textAlign: 'center', marginBottom: '60px' }}>
        Everything included. No hidden fees. No percentage cuts on donations.
      </p>

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{
          backgroundColor: 'white',
          padding: '60px',
          borderRadius: '24px',
          border: '3px solid #667eea',
          boxShadow: '0 20px 60px rgba(102, 126, 234, 0.2)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h3 style={{ fontSize: '36px', marginBottom: '20px' }}>Supportly Creator</h3>
            <div style={{ fontSize: '72px', fontWeight: '700', marginBottom: '10px' }}>
              <span style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                $49.95
              </span>
            </div>
            <p style={{ fontSize: '24px', color: '#6b7280' }}>per year • billed annually</p>
          </div>

          <div style={{ marginBottom: '40px' }}>
            <h4 style={{ fontSize: '24px', marginBottom: '20px', textAlign: 'center' }}>What's Included</h4>
            <div style={{ display: 'grid', gap: '15px' }}>
              {[
                'All payment methods (Stripe, PayPal, Pera, Lightning, Circle, Noah)',
                'Unlimited donations - no caps, no limits',
                'Zero platform fees on donations (you keep 100%)',
                'One-time "Boosts" and recurring "Wings" support',
                'Exclusive donor shop with token-based access',
                'QR code generator for offline donations',
                'Connect your own storage (S3, R2, Spaces, etc.)',
                'Social media integrations (X, Instagram, YouTube, TikTok)',
                'Advanced analytics and donor insights',
                'Customizable donation page',
                'Email support'
              ].map((feature, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                  <span style={{ color: '#667eea', fontSize: '24px', flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: '18px', color: '#374151' }}>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setActiveTab('build')}
            style={{
              width: '100%',
              padding: '20px',
              fontSize: '22px',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px 0 rgba(102, 126, 234, 0.4)'
            }}
          >
            Start Building Your Page Now
          </button>
        </div>

        {/* Comparison */}
        <div style={{ marginTop: '60px', padding: '40px', backgroundColor: 'white', borderRadius: '16px' }}>
          <h4 style={{ fontSize: '28px', marginBottom: '30px', textAlign: 'center' }}>Compare to Other Platforms</h4>
          <div style={{ display: 'grid', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <div><strong>Platform</strong></div>
              <div><strong>Annual Cost</strong></div>
              <div><strong>Donation Fees</strong></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', padding: '20px', backgroundColor: '#ecfdf5', borderRadius: '8px' }}>
              <div style={{ fontWeight: '600' }}>Supportly</div>
              <div style={{ color: '#059669' }}>$49.95/year</div>
              <div style={{ color: '#059669', fontWeight: '600' }}>0% - You keep 100%</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', padding: '20px' }}>
              <div>Buy Me A Coffee</div>
              <div>$0</div>
              <div style={{ color: '#dc2626' }}>5% platform fee</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', padding: '20px' }}>
              <div>Patreon</div>
              <div>$0-$144/year</div>
              <div style={{ color: '#dc2626' }}>5-12% platform fee</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', padding: '20px' }}>
              <div>Ko-fi</div>
              <div>$72/year</div>
              <div style={{ color: '#dc2626' }}>5% (free tier)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Build Tab - Interactive Page Builder
function BuildTab({ navigate }) {
  const [email, setEmail] = useState('');
  const [showBuilder, setShowBuilder] = useState(false);
  const [builderData, setBuilderData] = useState({
    displayName: '',
    username: '',
    bio: '',
    logo: null,
    paymentMethods: {
      stripe: false,
      paypal: false,
      pera: false,
      lightning: false,
      circle: false,
      noah: false
    },
    socialMedia: {
      twitter: '',
      instagram: '',
      youtube: '',
      tiktok: ''
    }
  });

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (email) {
      setShowBuilder(true);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBuilderData(prev => ({ ...prev, logo: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const togglePaymentMethod = (method) => {
    setBuilderData(prev => ({
      ...prev,
      paymentMethods: {
        ...prev.paymentMethods,
        [method]: !prev.paymentMethods[method]
      }
    }));
  };

  if (!showBuilder) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: '42px', marginBottom: '20px' }}>Build Your Donation Page</h2>
        <p style={{ fontSize: '20px', color: '#6b7280', marginBottom: '40px' }}>
          See exactly what you're getting before you pay. Create your page interactively and purchase when you're ready!
        </p>

        <form onSubmit={handleEmailSubmit} style={{ marginTop: '40px' }}>
          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', fontSize: '18px', marginBottom: '10px', fontWeight: '600' }}>
              What's your email?
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '18px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '18px',
              fontSize: '20px',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px 0 rgba(102, 126, 234, 0.4)'
            }}
          >
            Start Building
          </button>
        </form>

        <p style={{ marginTop: '30px', color: '#9ca3af', fontSize: '14px' }}>
          No account needed yet - just your email to save your progress
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: '42px', marginBottom: '40px', textAlign: 'center' }}>Build Your Donation Page</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
        {/* Builder Form */}
        <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '16px', height: 'fit-content' }}>
          <h3 style={{ fontSize: '24px', marginBottom: '30px' }}>Customize Your Page</h3>

          {/* Basic Info */}
          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Display Name</label>
            <input
              type="text"
              value={builderData.displayName}
              onChange={(e) => setBuilderData(prev => ({ ...prev, displayName: e.target.value }))}
              placeholder="Your Name"
              style={{ width: '100%', padding: '12px', fontSize: '16px', border: '2px solid #e5e7eb', borderRadius: '8px' }}
            />
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Username</label>
            <input
              type="text"
              value={builderData.username}
              onChange={(e) => setBuilderData(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') }))}
              placeholder="yourname"
              style={{ width: '100%', padding: '12px', fontSize: '16px', border: '2px solid #e5e7eb', borderRadius: '8px' }}
            />
            {builderData.username && (
              <p style={{ marginTop: '8px', color: '#667eea', fontSize: '14px' }}>
                Your page: supportly.com/@{builderData.username}
              </p>
            )}
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Bio</label>
            <textarea
              value={builderData.bio}
              onChange={(e) => setBuilderData(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell your supporters about yourself..."
              rows="4"
              style={{ width: '100%', padding: '12px', fontSize: '16px', border: '2px solid #e5e7eb', borderRadius: '8px', fontFamily: 'inherit' }}
            />
          </div>

          {/* Logo Upload */}
          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Logo / Profile Picture</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              style={{ marginBottom: '10px' }}
            />
            {builderData.logo && (
              <img src={builderData.logo} alt="Logo preview" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover' }} />
            )}
          </div>

          {/* Payment Methods */}
          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600' }}>Payment Methods You'll Accept</label>
            <div style={{ display: 'grid', gap: '12px' }}>
              {[
                { id: 'stripe', label: '💳 Stripe (Credit/Debit Cards)' },
                { id: 'paypal', label: '💰 PayPal' },
                { id: 'pera', label: '🔷 Pera Wallet (Algorand)' },
                { id: 'lightning', label: '⚡ Lightning Network (Bitcoin)' },
                { id: 'circle', label: '🔵 Circle USDC' },
                { id: 'noah', label: '🌐 Noah Payments' }
              ].map(method => (
                <label key={method.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', backgroundColor: builderData.paymentMethods[method.id] ? '#ecfdf5' : '#f9fafb', borderRadius: '8px', cursor: 'pointer', border: builderData.paymentMethods[method.id] ? '2px solid #059669' : '2px solid transparent' }}>
                  <input
                    type="checkbox"
                    checked={builderData.paymentMethods[method.id]}
                    onChange={() => togglePaymentMethod(method.id)}
                    style={{ width: '20px', height: '20px' }}
                  />
                  <span>{method.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Social Media */}
          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600' }}>Social Media (Optional)</label>
            <input
              type="text"
              value={builderData.socialMedia.twitter}
              onChange={(e) => setBuilderData(prev => ({ ...prev, socialMedia: { ...prev.socialMedia, twitter: e.target.value } }))}
              placeholder="Twitter/X username"
              style={{ width: '100%', padding: '12px', fontSize: '16px', border: '2px solid #e5e7eb', borderRadius: '8px', marginBottom: '10px' }}
            />
            <input
              type="text"
              value={builderData.socialMedia.instagram}
              onChange={(e) => setBuilderData(prev => ({ ...prev, socialMedia: { ...prev.socialMedia, instagram: e.target.value } }))}
              placeholder="Instagram username"
              style={{ width: '100%', padding: '12px', fontSize: '16px', border: '2px solid #e5e7eb', borderRadius: '8px', marginBottom: '10px' }}
            />
            <input
              type="text"
              value={builderData.socialMedia.youtube}
              onChange={(e) => setBuilderData(prev => ({ ...prev, socialMedia: { ...prev.socialMedia, youtube: e.target.value } }))}
              placeholder="YouTube channel"
              style={{ width: '100%', padding: '12px', fontSize: '16px', border: '2px solid #e5e7eb', borderRadius: '8px', marginBottom: '10px' }}
            />
            <input
              type="text"
              value={builderData.socialMedia.tiktok}
              onChange={(e) => setBuilderData(prev => ({ ...prev, socialMedia: { ...prev.socialMedia, tiktok: e.target.value } }))}
              placeholder="TikTok username"
              style={{ width: '100%', padding: '12px', fontSize: '16px', border: '2px solid #e5e7eb', borderRadius: '8px' }}
            />
          </div>

          <button
            onClick={() => navigate('signup')}
            style={{
              width: '100%',
              padding: '18px',
              fontSize: '20px',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px 0 rgba(102, 126, 234, 0.4)'
            }}
          >
            Purchase This Page - $49.95/year
          </button>
        </div>

        {/* Live Preview */}
        <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '16px', border: '3px dashed #667eea', position: 'sticky', top: '20px', height: 'fit-content' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px', padding: '10px', backgroundColor: '#667eea', color: 'white', borderRadius: '8px', fontWeight: '600' }}>
            📱 LIVE PREVIEW
          </div>

          {builderData.logo && (
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <img src={builderData.logo} alt="Logo" style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover' }} />
            </div>
          )}

          <h2 style={{ fontSize: '32px', textAlign: 'center', marginBottom: '10px' }}>
            {builderData.displayName || 'Your Name'}
          </h2>

          {builderData.username && (
            <p style={{ textAlign: 'center', color: '#667eea', marginBottom: '20px' }}>
              @{builderData.username}
            </p>
          )}

          {builderData.bio && (
            <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '30px', lineHeight: '1.6' }}>
              {builderData.bio}
            </p>
          )}

          {/* Preview Donation Buttons */}
          <div style={{ display: 'grid', gap: '15px', marginTop: '30px' }}>
            <button style={{ padding: '16px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: '600', cursor: 'not-allowed', opacity: 0.7 }}>
              💜 Give a Boost
            </button>
            <button style={{ padding: '16px', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: '600', cursor: 'not-allowed', opacity: 0.7 }}>
              🦋 Give Wings (Monthly)
            </button>
          </div>

          {/* Preview Payment Methods */}
          {Object.values(builderData.paymentMethods).some(v => v) && (
            <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <p style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px', color: '#6b7280' }}>Accepts:</p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {builderData.paymentMethods.stripe && <span style={{ fontSize: '12px', padding: '6px 12px', backgroundColor: 'white', borderRadius: '6px' }}>💳 Stripe</span>}
                {builderData.paymentMethods.paypal && <span style={{ fontSize: '12px', padding: '6px 12px', backgroundColor: 'white', borderRadius: '6px' }}>💰 PayPal</span>}
                {builderData.paymentMethods.pera && <span style={{ fontSize: '12px', padding: '6px 12px', backgroundColor: 'white', borderRadius: '6px' }}>🔷 Pera</span>}
                {builderData.paymentMethods.lightning && <span style={{ fontSize: '12px', padding: '6px 12px', backgroundColor: 'white', borderRadius: '6px' }}>⚡ Lightning</span>}
                {builderData.paymentMethods.circle && <span style={{ fontSize: '12px', padding: '6px 12px', backgroundColor: 'white', borderRadius: '6px' }}>🔵 Circle</span>}
                {builderData.paymentMethods.noah && <span style={{ fontSize: '12px', padding: '6px 12px', backgroundColor: 'white', borderRadius: '6px' }}>🌐 Noah</span>}
              </div>
            </div>
          )}

          {/* Preview Social Links */}
          {Object.values(builderData.socialMedia).some(v => v) && (
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {builderData.socialMedia.twitter && <span style={{ padding: '8px 16px', backgroundColor: '#1da1f2', color: 'white', borderRadius: '8px', fontSize: '14px' }}>𝕏 Twitter</span>}
              {builderData.socialMedia.instagram && <span style={{ padding: '8px 16px', background: 'linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)', color: 'white', borderRadius: '8px', fontSize: '14px' }}>📷 Instagram</span>}
              {builderData.socialMedia.youtube && <span style={{ padding: '8px 16px', backgroundColor: '#ff0000', color: 'white', borderRadius: '8px', fontSize: '14px' }}>▶️ YouTube</span>}
              {builderData.socialMedia.tiktok && <span style={{ padding: '8px 16px', backgroundColor: '#000000', color: 'white', borderRadius: '8px', fontSize: '14px' }}>🎵 TikTok</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Pricing Page Component
function PricingPage({ navigate }) {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleStartFreeTrial = () => {
    navigate('signup');
  };

  const handleUpgradeToPaid = async () => {
    // If not logged in, redirect to signup
    if (!user) {
      navigate('signup');
      return;
    }

    // Redirect to payment settings where they can subscribe
    navigate('payment-settings');
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <header style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '20px', fontWeight: 'bold' }}>Supportly Pricing</h1>
        <p style={{ fontSize: '24px', color: '#666', marginBottom: '10px' }}>
          Simple, transparent pricing for creators
        </p>
        <p style={{ fontSize: '18px', color: '#888' }}>
          No hidden fees. Cancel anytime.
        </p>
      </header>

      {/* Platform Benefits */}
      <section style={{ marginBottom: '60px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '32px', marginBottom: '30px' }}>Why Choose Supportly?</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '30px', marginTop: '40px' }}>
          <div style={{ padding: '20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>💰</div>
            <h3 style={{ fontSize: '20px', marginBottom: '10px' }}>Zero Platform Fees</h3>
            <p style={{ color: '#666' }}>Keep 100% of your donations. We don't take a cut.</p>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🔒</div>
            <h3 style={{ fontSize: '20px', marginBottom: '10px' }}>Multiple Payment Methods</h3>
            <p style={{ color: '#666' }}>Accept PayPal, Stripe, Cash App, and Crypto (USDC)</p>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>📊</div>
            <h3 style={{ fontSize: '20px', marginBottom: '10px' }}>Powerful Analytics</h3>
            <p style={{ color: '#666' }}>Track donations, manage donors, export data for taxes</p>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>⚡</div>
            <h3 style={{ fontSize: '20px', marginBottom: '10px' }}>Integrations</h3>
            <p style={{ color: '#666' }}>Discord, Zapier, QuickBooks, Social Media & more</p>
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section style={{ marginBottom: '60px' }}>
        <h2 style={{ fontSize: '32px', marginBottom: '40px', textAlign: 'center' }}>Choose Your Plan</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '40px', maxWidth: '900px', margin: '0 auto' }}>

          {/* Free Trial */}
          <div style={{
            border: '2px solid #e0e0e0',
            borderRadius: '12px',
            padding: '40px 30px',
            backgroundColor: '#fafafa',
            position: 'relative'
          }}>
            <h3 style={{ fontSize: '28px', marginBottom: '10px' }}>Free Trial</h3>
            <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '20px' }}>
              $0
              <span style={{ fontSize: '18px', fontWeight: 'normal', color: '#666' }}>/month</span>
            </div>
            <p style={{ color: '#666', marginBottom: '30px' }}>Perfect for trying out Supportly</p>

            <button
              onClick={handleStartFreeTrial}
              style={{
                width: '100%',
                padding: '15px 30px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginBottom: '30px'
              }}
            >
              Start Free Trial
            </button>

            <div style={{ textAlign: 'left' }}>
              <h4 style={{ fontSize: '16px', marginBottom: '15px', fontWeight: 'bold' }}>What's Included:</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: '#28a745', marginRight: '10px', fontSize: '18px' }}>✓</span>
                  Crypto (USDC) payments only
                </li>
                <li style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: '#28a745', marginRight: '10px', fontSize: '18px' }}>✓</span>
                  Up to 10 donations/month
                </li>
                <li style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: '#28a745', marginRight: '10px', fontSize: '18px' }}>✓</span>
                  Basic analytics
                </li>
                <li style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: '#28a745', marginRight: '10px', fontSize: '18px' }}>✓</span>
                  Email notifications
                </li>
                <li style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: '#28a745', marginRight: '10px', fontSize: '18px' }}>✓</span>
                  Community support
                </li>
              </ul>
            </div>
          </div>

          {/* Paid Tier */}
          <div style={{
            border: '3px solid #007bff',
            borderRadius: '12px',
            padding: '40px 30px',
            backgroundColor: 'white',
            position: 'relative',
            boxShadow: '0 10px 30px rgba(0,123,255,0.2)'
          }}>
            <div style={{
              position: 'absolute',
              top: '-15px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#007bff',
              color: 'white',
              padding: '5px 20px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              MOST POPULAR
            </div>

            <h3 style={{ fontSize: '28px', marginBottom: '10px' }}>Supportly Creator</h3>
            <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '20px' }}>
              $49.95
              <span style={{ fontSize: '18px', fontWeight: 'normal', color: '#666' }}>/year</span>
            </div>
            <p style={{ color: '#666', marginBottom: '30px' }}>Everything you need - ALL features unlocked!</p>

            <button
              onClick={handleUpgradeToPaid}
              disabled={loading}
              style={{
                width: '100%',
                padding: '15px 30px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginBottom: '30px',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Processing...' : 'Upgrade to Paid'}
            </button>

            {error && (
              <div style={{
                padding: '10px',
                backgroundColor: '#f8d7da',
                color: '#721c24',
                borderRadius: '6px',
                marginBottom: '20px',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            <div style={{ textAlign: 'left' }}>
              <h4 style={{ fontSize: '16px', marginBottom: '15px', fontWeight: 'bold' }}>Everything in Free, plus:</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: '#007bff', marginRight: '10px', fontSize: '18px', fontWeight: 'bold' }}>✓</span>
                  <strong>All payment methods:</strong> Stripe, PayPal, Cash App, Crypto
                </li>
                <li style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: '#007bff', marginRight: '10px', fontSize: '18px', fontWeight: 'bold' }}>✓</span>
                  Unlimited donations
                </li>
                <li style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: '#007bff', marginRight: '10px', fontSize: '18px', fontWeight: 'bold' }}>✓</span>
                  NFT rewards for supporters
                </li>
                <li style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: '#007bff', marginRight: '10px', fontSize: '18px', fontWeight: 'bold' }}>✓</span>
                  Advanced analytics & reporting
                </li>
                <li style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: '#007bff', marginRight: '10px', fontSize: '18px', fontWeight: 'bold' }}>✓</span>
                  Unlimited webhooks & email campaigns
                </li>
                <li style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: '#007bff', marginRight: '10px', fontSize: '18px', fontWeight: 'bold' }}>✓</span>
                  Discord & Zapier integrations
                </li>
                <li style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: '#007bff', marginRight: '10px', fontSize: '18px', fontWeight: 'bold' }}>✓</span>
                  QuickBooks & Social Media sync
                </li>
                <li style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: '#007bff', marginRight: '10px', fontSize: '18px', fontWeight: 'bold' }}>✓</span>
                  Digital product sales & content gating
                </li>
                <li style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: '#007bff', marginRight: '10px', fontSize: '18px', fontWeight: 'bold' }}>✓</span>
                  Custom branding & domain support
                </li>
                <li style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: '#007bff', marginRight: '10px', fontSize: '18px', fontWeight: 'bold' }}>✓</span>
                  Email support & unlimited data retention
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ / Additional Info */}
      <section style={{ textAlign: 'center', marginBottom: '40px', padding: '40px 20px', backgroundColor: '#f8f9fa', borderRadius: '12px' }}>
        <h2 style={{ fontSize: '28px', marginBottom: '20px' }}>Frequently Asked Questions</h2>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left' }}>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>Can I cancel anytime?</h3>
            <p style={{ color: '#666' }}>Yes! You can cancel your subscription at any time. You'll continue to have access until the end of your billing period.</p>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>Are there really no platform fees?</h3>
            <p style={{ color: '#666' }}>Absolutely! Unlike other platforms that take 5-10% of every donation, we charge a simple annual subscription. You keep 100% of what your supporters give you.</p>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>What payment methods do you support?</h3>
            <p style={{ color: '#666' }}>Free tier supports crypto (USDC). Paid tier includes Stripe (credit cards, Apple Pay, Google Pay), PayPal, Cash App, and crypto (USDC).</p>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>How do automatic renewals work?</h3>
            <p style={{ color: '#666' }}>Your subscription automatically renews each year via Stripe. We'll send you reminder emails 30, 7, and 1 day before renewal. You can turn off auto-renewal anytime.</p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section style={{ textAlign: 'center', padding: '40px 20px' }}>
        <h2 style={{ fontSize: '32px', marginBottom: '20px' }}>Ready to get started?</h2>
        <p style={{ fontSize: '18px', color: '#666', marginBottom: '30px' }}>
          Join thousands of creators already using Supportly
        </p>
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleStartFreeTrial}
            style={{
              padding: '15px 40px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Start Free Trial
          </button>
          <button
            onClick={() => navigate('landing')}
            style={{
              padding: '15px 40px',
              backgroundColor: 'white',
              color: '#007bff',
              border: '2px solid #007bff',
              borderRadius: '8px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Learn More
          </button>
        </div>
      </section>
    </div>
  );
}

// Signup Page Component
function SignupPage({ navigate }) {
  const { connectWallet, accountAddress, setUser } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    username: '',
    displayName: '',
    bio: '',
    email: '',
    avatarUrl: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let walletAddress = accountAddress;
      if (!walletAddress) {
        walletAddress = await connectWallet();
      }

      const response = await fetch(`${API_URL}/api/creators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          displayName: formData.displayName,
          bio: formData.bio,
          email: formData.email,
          avatarUrl: formData.avatarUrl,
          walletAddress
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create account');
      }

      const creator = await response.json();
      setUser(creator);
      navigate('dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '40px' }}>Create Your Account</h1>

      {!accountAddress && (
        <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '8px', textAlign: 'center' }}>
          <p style={{ marginBottom: '15px' }}>First, connect your Algorand wallet</p>
          <button
            onClick={connectWallet}
            style={{
              padding: '12px 24px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Connect Pera Wallet
          </button>
        </div>
      )}

      {accountAddress && (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Username*
            </label>
            <input
              type="text"
              required
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              style={{ width: '100%', padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ddd' }}
              placeholder="yourname"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Display Name*
            </label>
            <input
              type="text"
              required
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              style={{ width: '100%', padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ddd' }}
              placeholder="Your Name"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              style={{ width: '100%', padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ddd', minHeight: '100px' }}
              placeholder="Tell your supporters about yourself..."
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={{ width: '100%', padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ddd' }}
              placeholder="your@email.com"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Logo / Avatar URL (optional)
            </label>
            <input
              type="url"
              value={formData.avatarUrl}
              onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
              style={{ width: '100%', padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ddd' }}
              placeholder="https://example.com/your-logo.png"
            />
            <small style={{ color: '#666', fontSize: '14px' }}>Upload your logo to a service like imgur.com and paste the URL here</small>
          </div>

          {error && (
            <div style={{ padding: '12px', backgroundColor: '#fee', color: '#c00', borderRadius: '4px', marginBottom: '20px' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '18px',
              backgroundColor: loading ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      )}
    </div>
  );
}

// Dashboard Page Component
function DashboardPage({ navigate }) {
  const { user, accountAddress, disconnectWallet } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [donations, setDonations] = useState([]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, donationsRes] = await Promise.all([
        fetch(`${API_URL}/api/analytics/${user.id}/dashboard`),
        fetch(`${API_URL}/api/donations/creator/${user.id}`)
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (donationsRes.ok) {
        const donationsData = await donationsRes.json();
        setDonations(donationsData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  if (!user) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Please sign up or connect your wallet to access the dashboard.</p>
        <button onClick={() => navigate('signup')} style={{ marginTop: '20px', padding: '10px 20px' }}>
          Go to Signup
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1>Dashboard</h1>
          <p style={{ color: '#666' }}>Welcome back, {user.display_name}!</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => navigate('landing')}
            style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px' }}
          >
            🏠 Home
          </button>
          <button
            onClick={() => navigate('creator', user.username)}
            style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px' }}
          >
            👁️ View My Page
          </button>
          <button
            onClick={() => navigate('donors')}
            style={{ padding: '10px 20px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px' }}
          >
            👥 Donors
          </button>
          <button
            onClick={() => navigate('payment-settings')}
            style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px' }}
          >
            💳 Payment Settings
          </button>
          <button
            onClick={() => navigate('newsletters')}
            style={{ padding: '10px 20px', backgroundColor: '#6f42c1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px' }}
          >
            📧 Newsletters
          </button>
          <button
            onClick={() => navigate('email-settings')}
            style={{ padding: '10px 20px', backgroundColor: '#ffc107', color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px' }}
          >
            📧 Email Settings
          </button>
          <button
            onClick={disconnectWallet}
            style={{ padding: '10px 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px' }}
          >
            Disconnect
          </button>
        </div>
      </header>

      <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <p style={{ marginBottom: '10px' }}><strong>Your Page:</strong> <a href={`/@${user.username}`} onClick={(e) => { e.preventDefault(); navigate('creator', user.username); }}>algopay.com/@{user.username}</a></p>
        <p><strong>Wallet:</strong> {accountAddress}</p>
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
          <div style={{ padding: '30px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '36px', color: '#28a745', margin: '0 0 10px 0' }}>${stats.totalRevenue || 0}</h3>
            <p style={{ color: '#666', margin: 0 }}>Total Revenue</p>
          </div>
          <div style={{ padding: '30px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '36px', color: '#007bff', margin: '0 0 10px 0' }}>{stats.totalDonations || 0}</h3>
            <p style={{ color: '#666', margin: 0 }}>Total Donations</p>
          </div>
          <div style={{ padding: '30px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '36px', color: '#17a2b8', margin: '0 0 10px 0' }}>{stats.totalSupporters || 0}</h3>
            <p style={{ color: '#666', margin: 0 }}>Supporters</p>
          </div>
        </div>
      )}

      <div>
        <h2 style={{ marginBottom: '20px' }}>Recent Donations</h2>
        {donations.length === 0 ? (
          <p style={{ color: '#666' }}>No donations yet. Share your page to start receiving support!</p>
        ) : (
          <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
            {donations.slice(0, 10).map((donation, idx) => (
              <div key={donation.id} style={{ padding: '15px', borderBottom: idx < 9 ? '1px solid #eee' : 'none', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <strong>{donation.supporter_name || 'Anonymous'}</strong>
                  {donation.message && <p style={{ margin: '5px 0 0 0', color: '#666' }}>{donation.message}</p>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ color: '#28a745' }}>${donation.amount}</strong>
                  <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#999' }}>
                    {new Date(donation.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Payment Settings Page Component
function PaymentSettingsPage({ navigate }) {
  const { user } = useContext(AuthContext);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
    crypto_enabled: true,
    stripe_enabled: false,
    stripe_publishable_key: '',
    stripe_secret_key: '',
    paypal_enabled: false,
    paypal_client_id: '',
    paypal_client_secret: '',
    cashapp_enabled: false,
    cashapp_tag: ''
  });

  useEffect(() => {
    if (user) {
      fetchPaymentSettings();
    }
  }, [user]);

  const fetchPaymentSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/api/payment-settings/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setFormData({
          crypto_enabled: data.crypto_enabled ?? true,
          stripe_enabled: data.stripe_enabled ?? false,
          stripe_publishable_key: data.stripe_publishable_key || '',
          stripe_secret_key: data.stripe_secret_key || '',
          paypal_enabled: data.paypal_enabled ?? false,
          paypal_client_id: data.paypal_client_id || '',
          paypal_client_secret: data.paypal_client_secret || '',
          cashapp_enabled: data.cashapp_enabled ?? false,
          cashapp_tag: data.cashapp_tag || ''
        });
      }
    } catch (error) {
      console.error('Error fetching payment settings:', error);
      setMessage({ type: 'error', text: 'Failed to load payment settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(`${API_URL}/api/payment-settings/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      const data = await response.json();
      setSettings(data);
      setMessage({ type: 'success', text: 'Payment settings saved successfully!' });

      // Refresh the form with updated data (to handle hidden keys)
      await fetchPaymentSettings();
    } catch (error) {
      console.error('Error saving payment settings:', error);
      setMessage({ type: 'error', text: 'Failed to save payment settings' });
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Please sign up or connect your wallet to access payment settings.</p>
        <button onClick={() => navigate('signup')} style={{ marginTop: '20px', padding: '10px 20px' }}>
          Go to Signup
        </button>
      </div>
    );
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading payment settings...</div>;
  }

  return (
    <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h1>Payment Settings</h1>
        <button
          onClick={() => navigate('dashboard')}
          style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          ← Back to Dashboard
        </button>
      </header>

      {message.text && (
        <div style={{
          padding: '12px 20px',
          marginBottom: '30px',
          backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
          color: message.type === 'success' ? '#155724' : '#721c24',
          borderRadius: '6px',
          border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          {message.text}
        </div>
      )}

      <p style={{ marginBottom: '30px', color: '#666', fontSize: '16px' }}>
        Configure which payment methods you accept. Connect your own payment accounts to receive payments directly with zero platform fees.
      </p>

      {/* Crypto (USDC) */}
      <div style={{ marginBottom: '30px', padding: '30px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div>
            <h3 style={{ margin: '0 0 5px 0' }}>💰 Crypto (USDC on Algorand)</h3>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Accept stable cryptocurrency donations</p>
          </div>
          <label style={{ position: 'relative', display: 'inline-block', width: '60px', height: '34px' }}>
            <input
              type="checkbox"
              checked={formData.crypto_enabled}
              onChange={(e) => setFormData({ ...formData, crypto_enabled: e.target.checked })}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute',
              cursor: 'pointer',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: formData.crypto_enabled ? '#28a745' : '#ccc',
              transition: '0.4s',
              borderRadius: '34px'
            }}>
              <span style={{
                position: 'absolute',
                content: '',
                height: '26px',
                width: '26px',
                left: formData.crypto_enabled ? '30px' : '4px',
                bottom: '4px',
                backgroundColor: 'white',
                transition: '0.4s',
                borderRadius: '50%'
              }}></span>
            </span>
          </label>
        </div>
        <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
            ✓ Always available since you have a connected wallet<br />
            ✓ Instant, low-fee transactions on Algorand<br />
            ✓ Payments go directly to your wallet: {user.wallet_address?.slice(0, 10)}...
          </p>
        </div>
      </div>

      {/* Stripe */}
      <div style={{ marginBottom: '30px', padding: '30px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div>
            <h3 style={{ margin: '0 0 5px 0' }}>💳 Stripe (Credit Cards, Apple Pay, Google Pay)</h3>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Accept card payments and digital wallets</p>
          </div>
          <label style={{ position: 'relative', display: 'inline-block', width: '60px', height: '34px' }}>
            <input
              type="checkbox"
              checked={formData.stripe_enabled}
              onChange={(e) => setFormData({ ...formData, stripe_enabled: e.target.checked })}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute',
              cursor: 'pointer',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: formData.stripe_enabled ? '#28a745' : '#ccc',
              transition: '0.4s',
              borderRadius: '34px'
            }}>
              <span style={{
                position: 'absolute',
                content: '',
                height: '26px',
                width: '26px',
                left: formData.stripe_enabled ? '30px' : '4px',
                bottom: '4px',
                backgroundColor: 'white',
                transition: '0.4s',
                borderRadius: '50%'
              }}></span>
            </span>
          </label>
        </div>

        {formData.stripe_enabled && (
          <>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
                Publishable Key
              </label>
              <input
                type="text"
                value={formData.stripe_publishable_key}
                onChange={(e) => setFormData({ ...formData, stripe_publishable_key: e.target.value })}
                placeholder="pk_live_..."
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  borderRadius: '4px',
                  border: '1px solid #ddd'
                }}
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
                Secret Key
              </label>
              <input
                type="password"
                value={formData.stripe_secret_key}
                onChange={(e) => setFormData({ ...formData, stripe_secret_key: e.target.value })}
                placeholder={formData.stripe_secret_key === '***hidden***' ? 'Key is set (enter new to change)' : 'sk_live_...'}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  borderRadius: '4px',
                  border: '1px solid #ddd'
                }}
              />
            </div>
            <div style={{ padding: '12px', backgroundColor: '#e7f3ff', borderRadius: '6px', fontSize: '13px', color: '#004085' }}>
              <strong>How to get Stripe keys:</strong><br />
              1. Create a Stripe account at <a href="https://stripe.com" target="_blank" rel="noopener noreferrer">stripe.com</a><br />
              2. Go to Developers → API keys<br />
              3. Copy your Publishable key and Secret key<br />
              4. Payments go directly to your Stripe account
            </div>
          </>
        )}
      </div>

      {/* PayPal */}
      <div style={{ marginBottom: '30px', padding: '30px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div>
            <h3 style={{ margin: '0 0 5px 0' }}>🅿️ PayPal</h3>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Accept PayPal payments</p>
          </div>
          <label style={{ position: 'relative', display: 'inline-block', width: '60px', height: '34px' }}>
            <input
              type="checkbox"
              checked={formData.paypal_enabled}
              onChange={(e) => setFormData({ ...formData, paypal_enabled: e.target.checked })}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute',
              cursor: 'pointer',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: formData.paypal_enabled ? '#28a745' : '#ccc',
              transition: '0.4s',
              borderRadius: '34px'
            }}>
              <span style={{
                position: 'absolute',
                content: '',
                height: '26px',
                width: '26px',
                left: formData.paypal_enabled ? '30px' : '4px',
                bottom: '4px',
                backgroundColor: 'white',
                transition: '0.4s',
                borderRadius: '50%'
              }}></span>
            </span>
          </label>
        </div>

        {formData.paypal_enabled && (
          <>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
                Client ID
              </label>
              <input
                type="text"
                value={formData.paypal_client_id}
                onChange={(e) => setFormData({ ...formData, paypal_client_id: e.target.value })}
                placeholder="AYourPayPalClientID..."
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  borderRadius: '4px',
                  border: '1px solid #ddd'
                }}
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
                Client Secret
              </label>
              <input
                type="password"
                value={formData.paypal_client_secret}
                onChange={(e) => setFormData({ ...formData, paypal_client_secret: e.target.value })}
                placeholder={formData.paypal_client_secret === '***hidden***' ? 'Secret is set (enter new to change)' : 'EYourPayPalSecret...'}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  borderRadius: '4px',
                  border: '1px solid #ddd'
                }}
              />
            </div>
            <div style={{ padding: '12px', backgroundColor: '#e7f3ff', borderRadius: '6px', fontSize: '13px', color: '#004085' }}>
              <strong>How to get PayPal credentials:</strong><br />
              1. Create a PayPal Business account<br />
              2. Go to <a href="https://developer.paypal.com" target="_blank" rel="noopener noreferrer">developer.paypal.com</a><br />
              3. Create a REST API app<br />
              4. Copy your Client ID and Secret<br />
              5. Payments go directly to your PayPal account
            </div>
          </>
        )}
      </div>

      {/* Cash App */}
      <div style={{ marginBottom: '30px', padding: '30px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div>
            <h3 style={{ margin: '0 0 5px 0' }}>💵 Cash App</h3>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Accept Cash App payments</p>
          </div>
          <label style={{ position: 'relative', display: 'inline-block', width: '60px', height: '34px' }}>
            <input
              type="checkbox"
              checked={formData.cashapp_enabled}
              onChange={(e) => setFormData({ ...formData, cashapp_enabled: e.target.checked })}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute',
              cursor: 'pointer',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: formData.cashapp_enabled ? '#28a745' : '#ccc',
              transition: '0.4s',
              borderRadius: '34px'
            }}>
              <span style={{
                position: 'absolute',
                content: '',
                height: '26px',
                width: '26px',
                left: formData.cashapp_enabled ? '30px' : '4px',
                bottom: '4px',
                backgroundColor: 'white',
                transition: '0.4s',
                borderRadius: '50%'
              }}></span>
            </span>
          </label>
        </div>

        {formData.cashapp_enabled && (
          <>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
                Cash App Tag (Cashtag)
              </label>
              <input
                type="text"
                value={formData.cashapp_tag}
                onChange={(e) => setFormData({ ...formData, cashapp_tag: e.target.value })}
                placeholder="$yourcashtag"
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  borderRadius: '4px',
                  border: '1px solid #ddd'
                }}
              />
            </div>
            <div style={{ padding: '12px', backgroundColor: '#e7f3ff', borderRadius: '6px', fontSize: '13px', color: '#004085' }}>
              <strong>How to use Cash App:</strong><br />
              1. Download Cash App and create an account<br />
              2. Set up your $Cashtag in the app<br />
              3. Enter your $Cashtag above (e.g., $yourname)<br />
              4. Supporters will be shown a link to pay you directly
            </div>
          </>
        )}
      </div>

      {/* Save Button */}
      <div style={{ textAlign: 'center', marginTop: '40px' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '16px 48px',
            fontSize: '18px',
            fontWeight: 'bold',
            backgroundColor: saving ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: saving ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 12px rgba(0,123,255,0.3)'
          }}
        >
          {saving ? 'Saving...' : 'Save Payment Settings'}
        </button>
      </div>
    </div>
  );
}

// Email Settings Page Component
function EmailSettingsPage({ navigate }) {
  const { user } = useContext(AuthContext);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
    email_provider: 'supportly',
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    smtp_secure: true,
    sendgrid_api_key: '',
    resend_api_key: '',
    from_email: '',
    from_name: ''
  });

  useEffect(() => {
    if (user) {
      fetchEmailSettings();
    }
  }, [user]);

  const fetchEmailSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/api/email-settings/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setFormData({
          email_provider: data.email_provider || 'supportly',
          smtp_host: data.smtp_host || '',
          smtp_port: data.smtp_port || 587,
          smtp_username: data.smtp_username || '',
          smtp_password: data.smtp_password || '',
          smtp_secure: data.smtp_secure ?? true,
          sendgrid_api_key: data.sendgrid_api_key || '',
          resend_api_key: data.resend_api_key || '',
          from_email: data.from_email || '',
          from_name: data.from_name || ''
        });
      }
    } catch (error) {
      console.error('Error fetching email settings:', error);
      setMessage({ type: 'error', text: 'Failed to load email settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(`${API_URL}/api/email-settings/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      const data = await response.json();
      setSettings(data);
      setMessage({ type: 'success', text: 'Email settings saved successfully!' });

      // Refresh the form with updated data (to handle hidden keys)
      await fetchEmailSettings();
    } catch (error) {
      console.error('Error saving email settings:', error);
      setMessage({ type: 'error', text: 'Failed to save email settings' });
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Please sign up or connect your wallet to access email settings.</p>
        <button onClick={() => navigate('signup')} style={{ marginTop: '20px', padding: '10px 20px' }}>
          Go to Signup
        </button>
      </div>
    );
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading email settings...</div>;
  }

  return (
    <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h1>Email Settings</h1>
        <button
          onClick={() => navigate('dashboard')}
          style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          ← Back to Dashboard
        </button>
      </header>

      {message.text && (
        <div style={{
          padding: '12px 20px',
          marginBottom: '30px',
          backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
          color: message.type === 'success' ? '#155724' : '#721c24',
          borderRadius: '6px',
          border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          {message.text}
        </div>
      )}

      <p style={{ marginBottom: '30px', color: '#666', fontSize: '16px' }}>
        Configure your own email service to send newsletters and donation receipts from your email address. All emails will come from your domain, not Supportly.
      </p>

      {/* Email Provider Selection */}
      <div style={{ marginBottom: '30px', padding: '30px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3 style={{ marginBottom: '20px' }}>Email Service Provider</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', padding: '15px', border: `2px solid ${formData.email_provider === 'supportly' ? '#007bff' : '#ddd'}`, borderRadius: '6px', cursor: 'pointer' }}>
            <input
              type="radio"
              name="email_provider"
              value="supportly"
              checked={formData.email_provider === 'supportly'}
              onChange={(e) => setFormData({ ...formData, email_provider: e.target.value })}
              style={{ marginRight: '10px' }}
            />
            <div>
              <strong>Supportly (Default)</strong>
              <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>Use Supportly's email service - no configuration needed</p>
            </div>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', padding: '15px', border: `2px solid ${formData.email_provider === 'smtp' ? '#007bff' : '#ddd'}`, borderRadius: '6px', cursor: 'pointer' }}>
            <input
              type="radio"
              name="email_provider"
              value="smtp"
              checked={formData.email_provider === 'smtp'}
              onChange={(e) => setFormData({ ...formData, email_provider: e.target.value })}
              style={{ marginRight: '10px' }}
            />
            <div>
              <strong>SMTP (Gmail, Outlook, Custom)</strong>
              <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>Use your own SMTP server</p>
            </div>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', padding: '15px', border: `2px solid ${formData.email_provider === 'sendgrid' ? '#007bff' : '#ddd'}`, borderRadius: '6px', cursor: 'pointer' }}>
            <input
              type="radio"
              name="email_provider"
              value="sendgrid"
              checked={formData.email_provider === 'sendgrid'}
              onChange={(e) => setFormData({ ...formData, email_provider: e.target.value })}
              style={{ marginRight: '10px' }}
            />
            <div>
              <strong>SendGrid</strong>
              <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>Professional email delivery service</p>
            </div>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', padding: '15px', border: `2px solid ${formData.email_provider === 'resend' ? '#007bff' : '#ddd'}`, borderRadius: '6px', cursor: 'pointer' }}>
            <input
              type="radio"
              name="email_provider"
              value="resend"
              checked={formData.email_provider === 'resend'}
              onChange={(e) => setFormData({ ...formData, email_provider: e.target.value })}
              style={{ marginRight: '10px' }}
            />
            <div>
              <strong>Resend</strong>
              <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>Modern email API for developers</p>
            </div>
          </label>
        </div>
      </div>

      {/* From Email Configuration */}
      <div style={{ marginBottom: '30px', padding: '30px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3 style={{ marginBottom: '20px' }}>From Address</h3>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
            From Email
          </label>
          <input
            type="email"
            value={formData.from_email}
            onChange={(e) => setFormData({ ...formData, from_email: e.target.value })}
            placeholder="you@yourdomain.com"
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '14px',
              borderRadius: '4px',
              border: '1px solid #ddd'
            }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
            From Name
          </label>
          <input
            type="text"
            value={formData.from_name}
            onChange={(e) => setFormData({ ...formData, from_name: e.target.value })}
            placeholder="Your Name"
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '14px',
              borderRadius: '4px',
              border: '1px solid #ddd'
            }}
          />
        </div>
      </div>

      {/* SMTP Configuration */}
      {formData.email_provider === 'smtp' && (
        <div style={{ marginBottom: '30px', padding: '30px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '20px' }}>SMTP Configuration</h3>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
              SMTP Host
            </label>
            <input
              type="text"
              value={formData.smtp_host}
              onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
              placeholder="smtp.gmail.com"
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
              SMTP Port
            </label>
            <input
              type="number"
              value={formData.smtp_port}
              onChange={(e) => setFormData({ ...formData, smtp_port: parseInt(e.target.value) })}
              placeholder="587"
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
              Username (Email)
            </label>
            <input
              type="text"
              value={formData.smtp_username}
              onChange={(e) => setFormData({ ...formData, smtp_username: e.target.value })}
              placeholder="you@gmail.com"
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
              Password (App Password for Gmail)
            </label>
            <input
              type="password"
              value={formData.smtp_password}
              onChange={(e) => setFormData({ ...formData, smtp_password: e.target.value })}
              placeholder={formData.smtp_password === '***hidden***' ? 'Password is set (enter new to change)' : 'Your password'}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
            />
          </div>

          <div style={{ padding: '12px', backgroundColor: '#e7f3ff', borderRadius: '6px', fontSize: '13px', color: '#004085' }}>
            <strong>Gmail Setup:</strong><br />
            1. Go to Google Account Settings → Security<br />
            2. Enable 2-Step Verification<br />
            3. Create an App Password<br />
            4. Use that App Password here (not your Gmail password)
          </div>
        </div>
      )}

      {/* SendGrid Configuration */}
      {formData.email_provider === 'sendgrid' && (
        <div style={{ marginBottom: '30px', padding: '30px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '20px' }}>SendGrid API Key</h3>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
              API Key
            </label>
            <input
              type="password"
              value={formData.sendgrid_api_key}
              onChange={(e) => setFormData({ ...formData, sendgrid_api_key: e.target.value })}
              placeholder={formData.sendgrid_api_key === '***hidden***' ? 'Key is set (enter new to change)' : 'SG.xxxxxxxxxx'}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
            />
          </div>
          <div style={{ padding: '12px', backgroundColor: '#e7f3ff', borderRadius: '6px', fontSize: '13px', color: '#004085' }}>
            <strong>How to get SendGrid API key:</strong><br />
            1. Create account at <a href="https://sendgrid.com" target="_blank" rel="noopener noreferrer">sendgrid.com</a><br />
            2. Go to Settings → API Keys<br />
            3. Create new API key with Full Access<br />
            4. Copy and paste here
          </div>
        </div>
      )}

      {/* Resend Configuration */}
      {formData.email_provider === 'resend' && (
        <div style={{ marginBottom: '30px', padding: '30px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '20px' }}>Resend API Key</h3>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
              API Key
            </label>
            <input
              type="password"
              value={formData.resend_api_key}
              onChange={(e) => setFormData({ ...formData, resend_api_key: e.target.value })}
              placeholder={formData.resend_api_key === '***hidden***' ? 'Key is set (enter new to change)' : 're_xxxxxxxxxx'}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
            />
          </div>
          <div style={{ padding: '12px', backgroundColor: '#e7f3ff', borderRadius: '6px', fontSize: '13px', color: '#004085' }}>
            <strong>How to get Resend API key:</strong><br />
            1. Create account at <a href="https://resend.com" target="_blank" rel="noopener noreferrer">resend.com</a><br />
            2. Go to API Keys<br />
            3. Create new API key<br />
            4. Copy and paste here
          </div>
        </div>
      )}

      {/* Save Button */}
      <div style={{ textAlign: 'center', marginTop: '40px' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '16px 48px',
            fontSize: '18px',
            fontWeight: 'bold',
            backgroundColor: saving ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: saving ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 12px rgba(0,123,255,0.3)'
          }}
        >
          {saving ? 'Saving...' : 'Save Email Settings'}
        </button>
      </div>
    </div>
  );
}

// Donors Page Component
function DonorsPage({ navigate }) {
  const { user } = useContext(AuthContext);
  const [donors, setDonors] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user) {
      fetchDonors();
    }
  }, [user]);

  const fetchDonors = async () => {
    try {
      // Fetch all donations for this creator
      const response = await fetch(`${API_URL}/api/donations/creator/${user.id}`);
      if (response.ok) {
        const allDonations = await response.json();
        setDonations(allDonations);

        // Group by donor email to create donor list
        const donorMap = {};
        allDonations.forEach(donation => {
          const email = donation.donor_email || 'anonymous';
          const name = donation.donor_name || 'Anonymous';

          if (!donorMap[email]) {
            donorMap[email] = {
              email: email,
              name: name,
              totalDonated: 0,
              donationCount: 0,
              firstDonation: donation.created_at,
              lastDonation: donation.created_at,
              paymentMethods: new Set()
            };
          }

          donorMap[email].totalDonated += parseFloat(donation.amount);
          donorMap[email].donationCount += 1;
          donorMap[email].paymentMethods.add(donation.payment_method);

          // Update last donation date
          if (new Date(donation.created_at) > new Date(donorMap[email].lastDonation)) {
            donorMap[email].lastDonation = donation.created_at;
          }
        });

        // Convert to array and sort by total donated
        const donorList = Object.values(donorMap)
          .map(d => ({
            ...d,
            paymentMethods: Array.from(d.paymentMethods)
          }))
          .sort((a, b) => b.totalDonated - a.totalDonated);

        setDonors(donorList);
      }
    } catch (error) {
      console.error('Error fetching donors:', error);
      setMessage({ type: 'error', text: 'Failed to load donors' });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    // Create CSV header
    let csv = 'Donor Name,Email,Total Donated,Number of Donations,First Donation,Last Donation,Payment Methods\n';

    // Add donor rows
    donors.forEach(donor => {
      csv += `"${donor.name}","${donor.email}","$${donor.totalDonated.toFixed(2)}",${donor.donationCount},"${new Date(donor.firstDonation).toLocaleDateString()}","${new Date(donor.lastDonation).toLocaleDateString()}","${donor.paymentMethods.join(', ')}"\n`;
    });

    // Add all donations section
    csv += '\n\nAll Donations\n';
    csv += 'Date,Donor Name,Email,Amount,Payment Method,Message\n';
    donations.forEach(donation => {
      const date = new Date(donation.created_at).toLocaleDateString();
      const name = donation.donor_name || 'Anonymous';
      const email = donation.donor_email || '';
      const message = (donation.message || '').replace(/"/g, '""');
      csv += `"${date}","${name}","${email}","$${parseFloat(donation.amount).toFixed(2)}","${donation.payment_method}","${message}"\n`;
    });

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supportly-donors-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const sendNewsletter = async () => {
    if (!emailSubject || !emailMessage) {
      setMessage({ type: 'error', text: 'Please fill in subject and message' });
      return;
    }

    setSending(true);
    setMessage({ type: '', text: '' });

    try {
      // Get all donor emails (exclude anonymous)
      const recipientEmails = donors
        .filter(d => d.email !== 'anonymous' && d.email)
        .map(d => d.email);

      if (recipientEmails.length === 0) {
        setMessage({ type: 'error', text: 'No donors with email addresses to send to' });
        setSending(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/newsletter/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: user.id,
          subject: emailSubject,
          message: emailMessage,
          recipients: recipientEmails
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send newsletter');
      }

      setMessage({ type: 'success', text: `Newsletter sent to ${recipientEmails.length} donors!` });
      setEmailSubject('');
      setEmailMessage('');
      setShowEmailComposer(false);
    } catch (error) {
      console.error('Error sending newsletter:', error);
      setMessage({ type: 'error', text: 'Failed to send newsletter' });
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Please sign up or connect your wallet to access donors.</p>
        <button onClick={() => navigate('signup')} style={{ marginTop: '20px', padding: '10px 20px' }}>
          Go to Signup
        </button>
      </div>
    );
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading donors...</div>;
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1>Donor Management</h1>
          <p style={{ color: '#666', margin: '10px 0 0 0' }}>Track and manage your supporters</p>
        </div>
        <button
          onClick={() => navigate('dashboard')}
          style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          ← Back to Dashboard
        </button>
      </header>

      {message.text && (
        <div style={{
          padding: '12px 20px',
          marginBottom: '30px',
          backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
          color: message.type === 'success' ? '#155724' : '#721c24',
          borderRadius: '6px',
          border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          {message.text}
        </div>
      )}

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
        <div style={{ padding: '30px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '36px', color: '#17a2b8', margin: '0 0 10px 0' }}>{donors.length}</h3>
          <p style={{ color: '#666', margin: 0 }}>Total Donors</p>
        </div>
        <div style={{ padding: '30px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '36px', color: '#28a745', margin: '0 0 10px 0' }}>
            ${donors.reduce((sum, d) => sum + d.totalDonated, 0).toFixed(2)}
          </h3>
          <p style={{ color: '#666', margin: 0 }}>Total Raised</p>
        </div>
        <div style={{ padding: '30px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '36px', color: '#007bff', margin: '0 0 10px 0' }}>
            {donors.filter(d => d.email !== 'anonymous').length}
          </h3>
          <p style={{ color: '#666', margin: 0 }}>With Email</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ marginBottom: '30px', display: 'flex', gap: '15px' }}>
        <button
          onClick={exportToCSV}
          disabled={donors.length === 0}
          style={{
            padding: '12px 24px',
            backgroundColor: donors.length === 0 ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: donors.length === 0 ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          📊 Export to CSV (Tax Report)
        </button>
        <button
          onClick={() => setShowEmailComposer(!showEmailComposer)}
          disabled={donors.filter(d => d.email !== 'anonymous').length === 0}
          style={{
            padding: '12px 24px',
            backgroundColor: donors.filter(d => d.email !== 'anonymous').length === 0 ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: donors.filter(d => d.email !== 'anonymous').length === 0 ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          ✉️ Send Newsletter
        </button>
      </div>

      {/* Email Composer */}
      {showEmailComposer && (
        <div style={{ marginBottom: '40px', padding: '30px', backgroundColor: '#fff', border: '2px solid #007bff', borderRadius: '8px' }}>
          <h2 style={{ marginBottom: '20px' }}>Compose Newsletter</h2>
          <p style={{ marginBottom: '20px', color: '#666' }}>
            Send an email to all {donors.filter(d => d.email !== 'anonymous').length} donors with email addresses
          </p>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Subject</label>
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Newsletter subject..."
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Message</label>
            <textarea
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              placeholder="Your message to supporters..."
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                minHeight: '200px',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={sendNewsletter}
              disabled={sending}
              style={{
                padding: '12px 24px',
                backgroundColor: sending ? '#ccc' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: sending ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              {sending ? 'Sending...' : 'Send Newsletter'}
            </button>
            <button
              onClick={() => setShowEmailComposer(false)}
              style={{
                padding: '12px 24px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Donors Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd' }}>
        <h2 style={{ padding: '20px', margin: 0, borderBottom: '1px solid #ddd' }}>Your Donors</h2>

        {donors.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            <p>No donors yet. Share your page to start receiving support!</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f8f9fa' }}>
                <tr>
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Donor</th>
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Email</th>
                  <th style={{ padding: '15px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Total Donated</th>
                  <th style={{ padding: '15px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Donations</th>
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>First Donation</th>
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Last Donation</th>
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Payment Methods</th>
                </tr>
              </thead>
              <tbody>
                {donors.map((donor, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '15px' }}>{donor.name}</td>
                    <td style={{ padding: '15px', color: donor.email === 'anonymous' ? '#999' : '#333' }}>
                      {donor.email === 'anonymous' ? 'Anonymous' : donor.email}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold', color: '#28a745' }}>
                      ${donor.totalDonated.toFixed(2)}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>{donor.donationCount}</td>
                    <td style={{ padding: '15px', fontSize: '14px', color: '#666' }}>
                      {new Date(donor.firstDonation).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '15px', fontSize: '14px', color: '#666' }}>
                      {new Date(donor.lastDonation).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '15px', fontSize: '14px' }}>
                      {donor.paymentMethods.join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Newsletters Page Component
function NewslettersPage({ navigate }) {
  const { user } = useContext(AuthContext);
  const [newsletters, setNewsletters] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [showComposer, setShowComposer] = useState(false);
  const [currentNewsletter, setCurrentNewsletter] = useState(null);

  // Form state
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sendTo, setSendTo] = useState('all');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNewsletters();
      fetchSubscribers();
    }
  }, [user]);

  const fetchNewsletters = async () => {
    try {
      const response = await fetch(`${API_URL}/api/newsletters/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setNewsletters(data.newsletters || []);
      }
    } catch (error) {
      console.error('Error fetching newsletters:', error);
    }
  };

  const fetchSubscribers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/community/subscribers/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setSubscribers(data.subscribers || []);
      }
    } catch (error) {
      console.error('Error fetching subscribers:', error);
    }
  };

  const createNewsletter = () => {
    setCurrentNewsletter(null);
    setSubject('');
    setContent('');
    setSendTo('all');
    setShowComposer(true);
  };

  const saveNewsletter = async () => {
    try {
      const response = await fetch(`${API_URL}/api/newsletters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: user.id,
          subject,
          contentHtml: content,
          sendTo
        })
      });

      if (response.ok) {
        alert('Newsletter saved as draft!');
        setShowComposer(false);
        fetchNewsletters();
      } else {
        const data = await response.json();
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Error saving newsletter: ' + error.message);
    }
  };

  const sendNewsletter = async (newsletterId) => {
    if (!window.confirm('Are you sure you want to send this newsletter to all subscribers?')) {
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`${API_URL}/api/newsletters/${newsletterId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Newsletter sent successfully to ${data.sent} subscribers!`);
        fetchNewsletters();
      } else {
        const data = await response.json();
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Error sending newsletter: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  const deleteNewsletter = async (newsletterId) => {
    if (!window.confirm('Are you sure you want to delete this draft?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/newsletters/${newsletterId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('Newsletter deleted');
        fetchNewsletters();
      } else {
        const data = await response.json();
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Error deleting newsletter: ' + error.message);
    }
  };

  if (!user) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Please sign in to access newsletters.</p>
        <button onClick={() => navigate('signup')}>Go to Signup</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1>📧 Newsletter Management</h1>
          <p style={{ color: '#666' }}>{subscribers.length} active subscribers</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => navigate('dashboard')}
            style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            ← Back to Dashboard
          </button>
          <button
            onClick={createNewsletter}
            style={{ padding: '10px 20px', backgroundColor: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
          >
            ✏️ Create Newsletter
          </button>
        </div>
      </header>

      {/* Composer Modal */}
      {showComposer && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px',
          overflow: 'auto'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '40px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2 style={{ marginBottom: '20px' }}>Create Newsletter</h2>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Subject Line</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject..."
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '16px',
                  borderRadius: '6px',
                  border: '1px solid #ddd'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Send To</label>
              <select
                value={sendTo}
                onChange={(e) => setSendTo(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '16px',
                  borderRadius: '6px',
                  border: '1px solid #ddd'
                }}
              >
                <option value="all">All Subscribers ({subscribers.length})</option>
                <option value="verified_only">Verified Only</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your newsletter content here... You can use {{subscriber_name}} and {{creator_name}} as placeholders."
                rows={15}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '16px',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  fontFamily: 'monospace'
                }}
              />
              <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                Available variables: <code>{'{{subscriber_name}}'}</code>, <code>{'{{creator_name}}'}</code>, <code>{'{{unsubscribe_link}}'}</code>
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={saveNewsletter}
                disabled={!subject || !content}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: subject && content ? '#28a745' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: subject && content ? 'pointer' : 'not-allowed',
                  fontWeight: '600'
                }}
              >
                💾 Save Draft
              </button>
              <button
                onClick={() => setShowComposer(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Newsletters List */}
      <div>
        <h2 style={{ marginBottom: '20px' }}>Your Newsletters</h2>
        {newsletters.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#f8f9fa', borderRadius: '12px' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📧</div>
            <h3 style={{ marginBottom: '10px' }}>No newsletters yet</h3>
            <p style={{ color: '#666', marginBottom: '20px' }}>Create your first newsletter to engage with your subscribers!</p>
            <button
              onClick={createNewsletter}
              style={{
                padding: '12px 24px',
                backgroundColor: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              Create First Newsletter
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '20px' }}>
            {newsletters.map(newsletter => (
              <div key={newsletter.id} style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '12px',
                border: '1px solid #e0e0e0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, marginBottom: '8px' }}>{newsletter.subject}</h3>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#666' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: newsletter.status === 'draft' ? '#ffc107' :
                                         newsletter.status === 'sent' ? '#28a745' :
                                         newsletter.status === 'sending' ? '#17a2b8' : '#dc3545',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '12px'
                      }}>
                        {newsletter.status.toUpperCase()}
                      </span>
                      <span>Created: {new Date(newsletter.created_at).toLocaleDateString()}</span>
                      {newsletter.sent_at && <span>Sent: {new Date(newsletter.sent_at).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {newsletter.status === 'draft' && (
                      <>
                        <button
                          onClick={() => sendNewsletter(newsletter.id)}
                          disabled={sending}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#667eea',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: sending ? 'not-allowed' : 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          {sending ? 'Sending...' : '📤 Send'}
                        </button>
                        <button
                          onClick={() => deleteNewsletter(newsletter.id)}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {newsletter.status === 'sent' && (
                  <div style={{
                    marginTop: '16px',
                    padding: '16px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '16px'
                  }}>
                    <div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: '#667eea' }}>{newsletter.total_sent || 0}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>Sent</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: '#28a745' }}>{newsletter.total_opened || 0}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>Opened</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: '#17a2b8' }}>{newsletter.open_rate || 0}%</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>Open Rate</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: '#ffc107' }}>{newsletter.total_clicked || 0}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>Clicked</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Creator Page Component
function CreatorPage({ username, navigate }) {
  const [creator, setCreator] = useState(null);
  const [paymentSettings, setPaymentSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [donationAmount, setDonationAmount] = useState('');
  const [message, setMessage] = useState('');
  const [supporterName, setSupporterName] = useState('');
  const [supporterEmail, setSupporterEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [processing, setProcessing] = useState(false);
  const { accountAddress, connectWallet } = useContext(AuthContext);

  // Community subscription state
  const [showCommunityModal, setShowCommunityModal] = useState(false);
  const [communityEmail, setCommunityEmail] = useState('');
  const [communityName, setCommunityName] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeSuccess, setSubscribeSuccess] = useState(false);

  useEffect(() => {
    fetchCreator();
  }, [username]);

  const fetchCreator = async () => {
    try {
      const response = await fetch(`${API_URL}/api/creators/by-username/${username}`);
      if (response.ok) {
        const data = await response.json();
        setCreator(data);

        // Fetch payment settings for this creator
        const settingsResponse = await fetch(`${API_URL}/api/payment-settings/${data.id}`);
        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          setPaymentSettings(settingsData);

          // Set default payment method to first enabled method
          if (settingsData.crypto_enabled) {
            setPaymentMethod('crypto');
          } else if (settingsData.stripe_enabled) {
            setPaymentMethod('stripe');
          } else if (settingsData.paypal_enabled) {
            setPaymentMethod('paypal');
          } else if (settingsData.cashapp_enabled) {
            setPaymentMethod('cashapp');
          }
        }
      }
    } catch (error) {
      console.error('Error fetching creator:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDonate = async () => {
    if (!donationAmount || parseFloat(donationAmount) <= 0) {
      alert('Please enter a valid donation amount');
      return;
    }

    setProcessing(true);

    try {
      if (paymentMethod === 'crypto') {
        await handleCryptoDonation();
      } else if (paymentMethod === 'stripe') {
        await handleStripeDonation();
      } else if (paymentMethod === 'paypal') {
        await handlePayPalDonation();
      } else if (paymentMethod === 'cashapp') {
        await handleCashAppDonation();
      }
    } catch (error) {
      console.error('Donation error:', error);
      alert('Donation failed: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleCryptoDonation = async () => {
    let senderAddress = accountAddress;
    if (!senderAddress) {
      senderAddress = await connectWallet();
      // User cancelled wallet connection
      if (!senderAddress) {
        return;
      }
    }

    const amount = parseFloat(donationAmount);
    const amountInMicroUnits = Math.floor(amount * 1000000);

    const params = await algodClient.getTransactionParams().do();

    const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: senderAddress,
      to: creator.wallet_address,
      amount: amountInMicroUnits,
      assetIndex: USDC_ASSET_ID,
      suggestedParams: params
    });

    const singleTxnGroups = [{ txn, signers: [senderAddress] }];
    const signedTxn = await peraWallet.signTransaction([singleTxnGroups]);

    const { txId } = await algodClient.sendRawTransaction(signedTxn).do();

    await algosdk.waitForConfirmation(algodClient, txId, 4);

    await fetch(`${API_URL}/api/donations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creatorId: creator.id,
        amount,
        transactionHash: txId,
        donorName: supporterName,
        donorEmail: supporterEmail,
        donorWallet: senderAddress,
        message,
        paymentMethod: 'crypto'
      })
    });

    alert('Donation successful! Thank you for your support!');
    setDonationAmount('');
    setMessage('');
    setSupporterName('');
    setSupporterEmail('');
  };

  const handleStripeDonation = async () => {
    alert('Stripe payment processing will be implemented next!');
    // TODO: Implement Stripe payment using creator's keys
  };

  const handlePayPalDonation = async () => {
    try {
      // Create PayPal order on backend
      const orderResponse = await fetch(`${API_URL}/api/paypal/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: creator.id,
          amount: parseFloat(donationAmount)
        })
      });

      if (!orderResponse.ok) {
        throw new Error('Failed to create PayPal order');
      }

      const { orderID } = await orderResponse.json();

      // Open PayPal approval window
      const approvalUrl = `https://www.sandbox.paypal.com/checkoutnow?token=${orderID}`;
      const paypalWindow = window.open(approvalUrl, 'PayPal', 'width=500,height=600');

      // Poll for window close or wait for user action
      const checkWindowClosed = setInterval(async () => {
        if (paypalWindow.closed) {
          clearInterval(checkWindowClosed);

          // User may have completed payment, try to capture
          try {
            const captureResponse = await fetch(`${API_URL}/api/paypal/capture-order`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                creatorId: creator.id,
                orderID
              })
            });

            if (captureResponse.ok) {
              const captureData = await captureResponse.json();

              // Record the donation
              await fetch(`${API_URL}/api/donations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  creatorId: creator.id,
                  amount: parseFloat(donationAmount),
                  donorName: supporterName,
                  donorEmail: supporterEmail,
                  message,
                  paymentMethod: 'paypal',
                  transactionHash: captureData.id
                })
              });

              alert('PayPal donation successful! Thank you for your support!');
              setDonationAmount('');
              setMessage('');
              setSupporterName('');
              setSupporterEmail('');
            } else {
              console.log('Payment not completed or cancelled');
            }
          } catch (error) {
            console.error('Capture error:', error);
          }
        }
      }, 1000);

      // Stop checking after 5 minutes
      setTimeout(() => {
        clearInterval(checkWindowClosed);
        if (!paypalWindow.closed) {
          paypalWindow.close();
        }
      }, 300000);
    } catch (error) {
      console.error('PayPal payment error:', error);
      alert('PayPal payment failed: ' + error.message);
    }
  };

  const handleCashAppDonation = async () => {
    if (paymentSettings?.cashapp_tag) {
      // Open Cash App payment link
      window.open(`https://cash.app/${paymentSettings.cashapp_tag.replace('$', '')}/${donationAmount}`, '_blank');

      alert('Please complete your Cash App payment in the new window. Thank you for your support!');

      // Optionally record the donation attempt
      await fetch(`${API_URL}/api/donations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: creator.id,
          amount: parseFloat(donationAmount),
          donorName: supporterName,
          donorEmail: supporterEmail,
          message,
          paymentMethod: 'cashapp',
          status: 'pending'
        })
      });

      setDonationAmount('');
      setMessage('');
      setSupporterName('');
      setSupporterEmail('');
    }
  };

  const handleJoinCommunity = async () => {
    if (!communityEmail) {
      alert('Please enter your email address');
      return;
    }

    setSubscribing(true);

    try {
      const response = await fetch(`${API_URL}/api/community/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: creator.id,
          email: communityEmail,
          name: communityName || null,
          source: 'join_community_button'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join community');
      }

      setSubscribeSuccess(true);
      setCommunityEmail('');
      setCommunityName('');

      setTimeout(() => {
        setShowCommunityModal(false);
        setSubscribeSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Join community error:', error);
      alert(error.message || 'Failed to join community. Please try again.');
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
  }

  if (!creator) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Creator not found</h2>
        <button onClick={() => navigate('landing')} style={{ marginTop: '20px', padding: '10px 20px' }}>
          Go Home
        </button>
      </div>
    );
  }

  // Check if creator account is suspended or pending payment
  const isSuspended = creator.account_status === 'suspended' || creator.account_status === 'pending_payment';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
      {/* Suspension Notice Banner */}
      {isSuspended && (
        <div style={{
          backgroundColor: '#FEF3C7',
          borderBottom: '3px solid #F59E0B',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>⚠️</div>
            <h2 style={{
              fontSize: '24px',
              color: '#92400E',
              marginBottom: '8px',
              fontWeight: '600'
            }}>
              Creator Will Return Shortly
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#78350F',
              margin: 0
            }}>
              Updates in progress. This page will be back soon!
            </p>
            {creator.account_status === 'pending_payment' && (
              <p style={{
                fontSize: '14px',
                color: '#78350F',
                marginTop: '8px',
                fontStyle: 'italic'
              }}>
                (Account subscription renewal pending)
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={{ flex: 1, padding: '40px 20px', maxWidth: '600px', margin: '0 auto', width: '100%', opacity: isSuspended ? '0.5' : '1' }}>
        {/* Creator Profile */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          {creator.avatar_url && (
            <img
              src={creator.avatar_url}
              alt={creator.display_name}
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '4px solid #fff',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                marginBottom: '20px'
              }}
            />
          )}
          <h1 style={{ fontSize: '32px', marginBottom: '8px', color: '#333' }}>{creator.display_name}</h1>
          {creator.bio && <p style={{ fontSize: '16px', color: '#666', maxWidth: '500px', margin: '0 auto' }}>{creator.bio}</p>}
        </div>

        {/* Join Community Button */}
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <button
            onClick={() => setShowCommunityModal(true)}
            style={{
              padding: '14px 32px',
              fontSize: '16px',
              fontWeight: '600',
              backgroundColor: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
              transition: 'all 0.2s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#5568d3';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#667eea';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
            }}
          >
            <span>📧</span>
            <span>Join the Community (FREE)</span>
          </button>
          <p style={{ fontSize: '14px', color: '#666', marginTop: '8px', fontStyle: 'italic' }}>
            Get updates and exclusive content via email
          </p>
        </div>

        {/* Community Join Modal */}
        {showCommunityModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '40px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              position: 'relative'
            }}>
              {/* Close button */}
              <button
                onClick={() => setShowCommunityModal(false)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#999',
                  lineHeight: 1
                }}
              >
                ×
              </button>

              {subscribeSuccess ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: '64px', marginBottom: '20px' }}>✅</div>
                  <h2 style={{ fontSize: '24px', marginBottom: '12px', color: '#333' }}>
                    Welcome to the Community!
                  </h2>
                  <p style={{ fontSize: '16px', color: '#666' }}>
                    Check your email for a welcome message from {creator.display_name}
                  </p>
                </div>
              ) : (
                <>
                  <h2 style={{ fontSize: '24px', marginBottom: '12px', color: '#333', textAlign: 'center' }}>
                    Join {creator.display_name}'s Community
                  </h2>
                  <p style={{ fontSize: '14px', color: '#666', marginBottom: '30px', textAlign: 'center' }}>
                    Get exclusive updates, behind-the-scenes content, and be the first to know about new releases.
                  </p>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#333' }}>
                      Your Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={communityName}
                      onChange={(e) => setCommunityName(e.target.value)}
                      placeholder="Enter your name"
                      style={{
                        width: '100%',
                        padding: '14px',
                        fontSize: '16px',
                        borderRadius: '8px',
                        border: '2px solid #e0e0e0',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#667eea'}
                      onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                    />
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#333' }}>
                      Email Address <span style={{ color: '#e74c3c' }}>*</span>
                    </label>
                    <input
                      type="email"
                      value={communityEmail}
                      onChange={(e) => setCommunityEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      style={{
                        width: '100%',
                        padding: '14px',
                        fontSize: '16px',
                        borderRadius: '8px',
                        border: '2px solid #e0e0e0',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#667eea'}
                      onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && communityEmail) {
                          handleJoinCommunity();
                        }
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '24px', fontSize: '12px', color: '#666', lineHeight: '1.5' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
                      <input type="checkbox" defaultChecked disabled style={{ marginTop: '2px' }} />
                      <span>
                        I agree to receive emails from {creator.display_name}. You can unsubscribe at any time.
                      </span>
                    </label>
                  </div>

                  <button
                    onClick={handleJoinCommunity}
                    disabled={subscribing || !communityEmail}
                    style={{
                      width: '100%',
                      padding: '16px',
                      fontSize: '16px',
                      fontWeight: '600',
                      backgroundColor: communityEmail ? '#667eea' : '#ccc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: communityEmail ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s'
                    }}
                  >
                    {subscribing ? 'Joining...' : 'Join Community'}
                  </button>

                  <p style={{ fontSize: '11px', color: '#999', marginTop: '16px', textAlign: 'center' }}>
                    We respect your privacy. Your email will never be shared.
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Donation Widget - Buy Me A Coffee Style */}
        <div style={{ backgroundColor: '#fff', padding: '40px 30px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <h2 style={{ marginBottom: '10px', textAlign: 'center', fontSize: '24px', color: '#333' }}>
            Buy {creator.display_name.split(' ')[0]} a coffee ☕
          </h2>
          <p style={{ marginBottom: '30px', textAlign: 'center', fontSize: '14px', color: '#28a745', fontWeight: '500' }}>
            ✓ No account required - Donate anonymously
          </p>

          {/* Quick Amount Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            {[5, 10, 20].map(amount => (
              <button
                key={amount}
                onClick={() => setDonationAmount(amount.toString())}
                style={{
                  flex: 1,
                  padding: '12px',
                  fontSize: '16px',
                  backgroundColor: donationAmount === amount.toString() ? '#FFDD00' : '#fff',
                  color: '#333',
                  border: '2px solid #FFDD00',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                ${amount}
              </button>
            ))}
          </div>

          {/* Custom Amount */}
          <div style={{ marginBottom: '20px' }}>
            <input
              type="number"
              value={donationAmount}
              onChange={(e) => setDonationAmount(e.target.value)}
              placeholder="Custom amount"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '18px',
                borderRadius: '8px',
                border: '2px solid #e0e0e0',
                outline: 'none'
              }}
            />
          </div>

          {/* Name */}
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              value={supporterName}
              onChange={(e) => setSupporterName(e.target.value)}
              placeholder="Your name (optional)"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '16px',
                borderRadius: '8px',
                border: '2px solid #e0e0e0',
                outline: 'none'
              }}
            />
          </div>

          {/* Email */}
          <div style={{ marginBottom: '20px' }}>
            <input
              type="email"
              value={supporterEmail}
              onChange={(e) => setSupporterEmail(e.target.value)}
              placeholder="Email for receipt (optional)"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '16px',
                borderRadius: '8px',
                border: '2px solid #e0e0e0',
                outline: 'none'
              }}
            />
          </div>

          {/* Message */}
          <div style={{ marginBottom: '30px' }}>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Say something nice... (optional)"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '16px',
                borderRadius: '8px',
                border: '2px solid #e0e0e0',
                outline: 'none',
                minHeight: '100px',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Payment Method Tabs - Only show enabled methods */}
          {paymentSettings && (
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>Payment Methods:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', borderBottom: '2px solid #e0e0e0' }}>
                {paymentSettings.crypto_enabled && (
                  <button
                    onClick={() => setPaymentMethod('crypto')}
                    style={{
                      flex: 1,
                      minWidth: '120px',
                      padding: '12px',
                      backgroundColor: 'transparent',
                      color: paymentMethod === 'crypto' ? '#FFDD00' : '#999',
                      border: 'none',
                      borderBottom: paymentMethod === 'crypto' ? '3px solid #FFDD00' : '3px solid transparent',
                      cursor: 'pointer',
                      fontWeight: paymentMethod === 'crypto' ? 'bold' : 'normal',
                      fontSize: '14px'
                    }}
                  >
                    💰 Crypto
                  </button>
                )}
                {paymentSettings.stripe_enabled && (
                  <button
                    onClick={() => setPaymentMethod('stripe')}
                    style={{
                      flex: 1,
                      minWidth: '120px',
                      padding: '12px',
                      backgroundColor: 'transparent',
                      color: paymentMethod === 'stripe' ? '#FFDD00' : '#999',
                      border: 'none',
                      borderBottom: paymentMethod === 'stripe' ? '3px solid #FFDD00' : '3px solid transparent',
                      cursor: 'pointer',
                      fontWeight: paymentMethod === 'stripe' ? 'bold' : 'normal',
                      fontSize: '14px'
                    }}
                  >
                    💳 Card
                  </button>
                )}
                {paymentSettings.paypal_enabled && (
                  <button
                    onClick={() => setPaymentMethod('paypal')}
                    style={{
                      flex: 1,
                      minWidth: '120px',
                      padding: '12px',
                      backgroundColor: 'transparent',
                      color: paymentMethod === 'paypal' ? '#FFDD00' : '#999',
                      border: 'none',
                      borderBottom: paymentMethod === 'paypal' ? '3px solid #FFDD00' : '3px solid transparent',
                      cursor: 'pointer',
                      fontWeight: paymentMethod === 'paypal' ? 'bold' : 'normal',
                      fontSize: '14px'
                    }}
                  >
                    🅿️ PayPal
                  </button>
                )}
                {paymentSettings.cashapp_enabled && (
                  <button
                    onClick={() => setPaymentMethod('cashapp')}
                    style={{
                      flex: 1,
                      minWidth: '120px',
                      padding: '12px',
                      backgroundColor: 'transparent',
                      color: paymentMethod === 'cashapp' ? '#FFDD00' : '#999',
                      border: 'none',
                      borderBottom: paymentMethod === 'cashapp' ? '3px solid #FFDD00' : '3px solid transparent',
                      cursor: 'pointer',
                      fontWeight: paymentMethod === 'cashapp' ? 'bold' : 'normal',
                      fontSize: '14px'
                    }}
                  >
                    💵 Cash App
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Donate Button */}
          <button
            onClick={handleDonate}
            disabled={processing || !donationAmount || isSuspended}
            style={{
              width: '100%',
              padding: '18px',
              fontSize: '20px',
              fontWeight: 'bold',
              backgroundColor: processing || !donationAmount || isSuspended ? '#ccc' : '#FFDD00',
              color: '#000',
              border: 'none',
              borderRadius: '12px',
              cursor: processing || !donationAmount || isSuspended ? 'not-allowed' : 'pointer',
              boxShadow: isSuspended ? 'none' : '0 4px 12px rgba(255, 221, 0, 0.3)'
            }}
          >
            {isSuspended ? 'Page Temporarily Unavailable' : processing ? 'Processing...' : `Support with $${donationAmount || '0'}`}
          </button>
        </div>
      </div>

      {/* Supportly Footer */}
      <footer style={{
        backgroundColor: '#fff',
        borderTop: '1px solid #e0e0e0',
        padding: '20px',
        textAlign: 'center',
        marginTop: 'auto'
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>
            Powered by <strong style={{ color: '#333' }}>Supportly</strong>
          </p>
          <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
            Accept crypto donations on Algorand blockchain
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
