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
        {currentPage === 'signup' && <SignupPage navigate={navigate} />}
        {currentPage === 'dashboard' && <DashboardPage navigate={navigate} />}
        {currentPage === 'payment-settings' && <PaymentSettingsPage navigate={navigate} />}
        {currentPage === 'creator' && <CreatorPage username={creatorUsername} navigate={navigate} />}
      </div>
    </AuthProvider>
  );
}

// Landing Page Component
function LandingPage({ navigate }) {
  const { connectWallet, accountAddress } = useContext(AuthContext);

  const handleGetStarted = async () => {
    if (!accountAddress) {
      await connectWallet();
    }
    navigate('signup');
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>Supportly</h1>
        <p style={{ fontSize: '24px', color: '#666' }}>Accept crypto donations with ease on Algorand</p>
      </header>

      <section style={{ textAlign: 'center', marginBottom: '60px' }}>
        <button
          onClick={handleGetStarted}
          style={{
            padding: '16px 48px',
            fontSize: '20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Get Started
        </button>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px', marginTop: '60px' }}>
        <div style={{ padding: '30px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h3>🚀 Easy Setup</h3>
          <p>Get your donation page up and running in minutes</p>
        </div>
        <div style={{ padding: '30px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h3>💰 USDC Donations</h3>
          <p>Accept stable cryptocurrency donations on Algorand</p>
        </div>
        <div style={{ padding: '30px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h3>📊 Analytics</h3>
          <p>Track your donations and supporter engagement</p>
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
            onClick={() => navigate('payment-settings')}
            style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px' }}
          >
            💳 Payment Settings
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

// Creator Page Component
function CreatorPage({ username, navigate }) {
  const [creator, setCreator] = useState(null);
  const [paymentSettings, setPaymentSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [donationAmount, setDonationAmount] = useState('');
  const [message, setMessage] = useState('');
  const [supporterName, setSupporterName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [processing, setProcessing] = useState(false);
  const { accountAddress, connectWallet } = useContext(AuthContext);

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
        supporterName,
        message,
        paymentMethod: 'crypto'
      })
    });

    alert('Donation successful! Thank you for your support!');
    setDonationAmount('');
    setMessage('');
    setSupporterName('');
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
                  supporterName,
                  message,
                  paymentMethod: 'paypal',
                  transactionHash: captureData.id
                })
              });

              alert('PayPal donation successful! Thank you for your support!');
              setDonationAmount('');
              setMessage('');
              setSupporterName('');
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
          supporterName,
          message,
          paymentMethod: 'cashapp',
          status: 'pending'
        })
      });

      setDonationAmount('');
      setMessage('');
      setSupporterName('');
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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
      {/* Main Content */}
      <div style={{ flex: 1, padding: '40px 20px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
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

        {/* Donation Widget - Buy Me A Coffee Style */}
        <div style={{ backgroundColor: '#fff', padding: '40px 30px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <h2 style={{ marginBottom: '30px', textAlign: 'center', fontSize: '24px', color: '#333' }}>
            Buy {creator.display_name.split(' ')[0]} a coffee ☕
          </h2>

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
              placeholder="Name (optional)"
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
            disabled={processing || !donationAmount}
            style={{
              width: '100%',
              padding: '18px',
              fontSize: '20px',
              fontWeight: 'bold',
              backgroundColor: processing || !donationAmount ? '#ccc' : '#FFDD00',
              color: '#000',
              border: 'none',
              borderRadius: '12px',
              cursor: processing || !donationAmount ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(255, 221, 0, 0.3)'
            }}
          >
            {processing ? 'Processing...' : `Support with $${donationAmount || '0'}`}
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
