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
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    // Try to reconnect wallet session
    peraWallet.reconnectSession().then(accounts => {
      if (accounts.length) {
        setAccountAddress(accounts[0]);
      }
    }).catch(console.error);

    // Try to restore user from token
    if (token) {
      fetchUserFromToken();
    }
  }, []);

  const fetchUserFromToken = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      } else {
        // Token invalid, clear it
        localStorage.removeItem('token');
        setToken(null);
      }
    } catch (error) {
      console.error('Error fetching user from token:', error);
    }
  };

  const connectWallet = async () => {
    try {
      const accounts = await peraWallet.connect();
      setAccountAddress(accounts[0]);
      return accounts[0];
    } catch (error) {
      console.error('Wallet connection error:', error);
      throw error;
    }
  };

  const disconnectWallet = () => {
    peraWallet.disconnect();
    setAccountAddress(null);
  };

  const login = async (email, password) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    setUser(data.creator);
    setToken(data.token);
    localStorage.setItem('token', data.token);
    return data;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setAccountAddress(null);
    localStorage.removeItem('token');
    peraWallet.disconnect();
  };

  const register = async (formData) => {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    const data = await response.json();
    setUser(data.creator);
    setToken(data.token);
    localStorage.setItem('token', data.token);
    return data;
  };

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      accountAddress,
      token,
      connectWallet,
      disconnectWallet,
      login,
      logout,
      register
    }}>
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
    } else if (path === '/login') {
      setCurrentPage('login');
    } else if (path === '/dashboard') {
      setCurrentPage('dashboard');
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
        {currentPage === 'login' && <LoginPage navigate={navigate} />}
        {currentPage === 'dashboard' && <DashboardPage navigate={navigate} />}
        {currentPage === 'creator' && <CreatorPage username={creatorUsername} navigate={navigate} />}
      </div>
    </AuthProvider>
  );
}

// Landing Page Component
function LandingPage({ navigate }) {
  const { user } = useContext(AuthContext);

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>Supportly</h1>
        <p style={{ fontSize: '24px', color: '#666' }}>Accept donations and grow your community</p>
        <p style={{ fontSize: '18px', color: '#888' }}>Only $49.95/year - Multiple payment options available</p>
      </header>

      <section style={{ textAlign: 'center', marginBottom: '60px' }}>
        {user ? (
          <button
            onClick={() => navigate('dashboard')}
            style={{
              padding: '16px 48px',
              fontSize: '20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginRight: '15px'
            }}
          >
            Go to Dashboard
          </button>
        ) : (
          <>
            <button
              onClick={() => navigate('signup')}
              style={{
                padding: '16px 48px',
                fontSize: '20px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                marginRight: '15px'
              }}
            >
              Get Started
            </button>
            <button
              onClick={() => navigate('login')}
              style={{
                padding: '16px 48px',
                fontSize: '20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Log In
            </button>
          </>
        )}
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px', marginTop: '60px' }}>
        <div style={{ padding: '30px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h3>🚀 Easy Setup</h3>
          <p>Get your donation page up and running in minutes</p>
        </div>
        <div style={{ padding: '30px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h3>💰 Multiple Payment Options</h3>
          <p>Accept Stripe, PayPal, USDC, Pera, and more</p>
        </div>
        <div style={{ padding: '30px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h3>📊 Analytics</h3>
          <p>Track your donations and supporter engagement</p>
        </div>
      </section>
    </div>
  );
}

// Login Page Component
function LoginPage({ navigate }) {
  const { login } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(formData.email, formData.password);
      navigate('dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '500px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '40px' }}>Log In</h1>

      {error && (
        <div style={{ padding: '15px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '6px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Email*
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            style={{ width: '100%', padding: '12px', fontSize: '16px', borderRadius: '6px', border: '1px solid #ddd' }}
            placeholder="your@email.com"
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Password*
          </label>
          <input
            type="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            style={{ width: '100%', padding: '12px', fontSize: '16px', borderRadius: '6px', border: '1px solid #ddd' }}
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            fontSize: '18px',
            backgroundColor: loading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginTop: '10px'
          }}
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <p style={{ color: '#666' }}>
          Don't have an account?{' '}
          <button
            onClick={() => navigate('signup')}
            style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}

// Signup Page Component
function SignupPage({ navigate }) {
  const { register, connectWallet, accountAddress } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    username: '',
    displayName: '',
    bio: '',
    email: '',
    password: '',
    confirmPassword: '',
    avatarUrl: '',
    twitter: '',
    youtube: '',
    instagram: '',
    tiktok: '',
    linkedin: '',
    facebook: '',
    website: '',
    walletAddress: '',
    stripeAccountId: '',
    stripePublishableKey: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPaymentSection, setShowPaymentSection] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      await register({
        username: formData.username,
        displayName: formData.displayName,
        bio: formData.bio,
        email: formData.email,
        password: formData.password,
        avatarUrl: formData.avatarUrl,
        walletAddress: accountAddress || formData.walletAddress,
        twitter: formData.twitter,
        youtube: formData.youtube,
        instagram: formData.instagram,
        tiktok: formData.tiktok,
        linkedin: formData.linkedin,
        facebook: formData.facebook,
        website: formData.website,
        stripeAccountId: formData.stripeAccountId,
        stripePublishableKey: formData.stripePublishableKey
      });

      // After successful registration, show subscription payment page
      navigate('dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectWallet = async () => {
    try {
      const address = await connectWallet();
      setFormData({ ...formData, walletAddress: address });
    } catch (err) {
      setError('Failed to connect wallet');
    }
  };

  const inputStyle = { width: '100%', padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ddd' };
  const labelStyle = { display: 'block', marginBottom: '8px', fontWeight: 'bold' };

  return (
    <div style={{ padding: '40px', maxWidth: '700px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>Create Your Supportly Account</h1>
      <p style={{ textAlign: 'center', color: '#666', marginBottom: '40px' }}>
        Join for just $49.95/year - Accept donations via Stripe, PayPal, USDC, Pera Wallet, and more
      </p>

      {error && (
        <div style={{ padding: '15px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '6px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <h3 style={{ marginBottom: '15px', paddingBottom: '10px', borderBottom: '2px solid #e0e0e0' }}>Basic Information</h3>

        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Username*</label>
          <input
            type="text"
            required
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            style={inputStyle}
            placeholder="yourname"
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Display Name*</label>
          <input
            type="text"
            required
            value={formData.displayName}
            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            style={inputStyle}
            placeholder="Your Name"
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Email*</label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            style={inputStyle}
            placeholder="your@email.com"
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Password*</label>
          <input
            type="password"
            required
            minLength="8"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            style={inputStyle}
            placeholder="••••••••"
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Confirm Password*</label>
          <input
            type="password"
            required
            minLength="8"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            style={inputStyle}
            placeholder="••••••••"
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Bio</label>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            style={{ ...inputStyle, minHeight: '80px' }}
            placeholder="Tell your supporters about yourself..."
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Avatar / Logo URL</label>
          <input
            type="url"
            value={formData.avatarUrl}
            onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
            style={inputStyle}
            placeholder="https://example.com/your-logo.png"
          />
        </div>

        <h3 style={{ marginTop: '30px', marginBottom: '15px', paddingBottom: '10px', borderBottom: '2px solid #e0e0e0' }}>Social Media Links</h3>

        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Twitter / X</label>
          <input
            type="url"
            value={formData.twitter}
            onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
            style={inputStyle}
            placeholder="https://twitter.com/yourhandle"
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>YouTube</label>
          <input
            type="url"
            value={formData.youtube}
            onChange={(e) => setFormData({ ...formData, youtube: e.target.value })}
            style={inputStyle}
            placeholder="https://youtube.com/@yourchannel"
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Instagram</label>
          <input
            type="url"
            value={formData.instagram}
            onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
            style={inputStyle}
            placeholder="https://instagram.com/yourhandle"
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>TikTok</label>
          <input
            type="url"
            value={formData.tiktok}
            onChange={(e) => setFormData({ ...formData, tiktok: e.target.value })}
            style={inputStyle}
            placeholder="https://tiktok.com/@yourhandle"
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>LinkedIn</label>
          <input
            type="url"
            value={formData.linkedin}
            onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
            style={inputStyle}
            placeholder="https://linkedin.com/in/yourprofile"
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Facebook</label>
          <input
            type="url"
            value={formData.facebook}
            onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
            style={inputStyle}
            placeholder="https://facebook.com/yourpage"
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Website</label>
          <input
            type="url"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            style={inputStyle}
            placeholder="https://yourwebsite.com"
          />
        </div>

        <h3 style={{ marginTop: '30px', marginBottom: '15px', paddingBottom: '10px', borderBottom: '2px solid #e0e0e0' }}>
          Optional Features
        </h3>

        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
          <h4 style={{ marginBottom: '10px' }}>Algorand Wallet (Optional)</h4>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
            Connect your Pera wallet to enable crypto donations and NFT features
          </p>
          {accountAddress ? (
            <div style={{ fontSize: '14px', color: '#28a745', fontWeight: 'bold' }}>
              Connected: {accountAddress.slice(0, 10)}...{accountAddress.slice(-8)}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleConnectWallet}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Connect Pera Wallet
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '18px',
            backgroundColor: loading ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginTop: '20px'
          }}
        >
          {loading ? 'Creating Account...' : 'Create Account & Continue to Payment'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <p style={{ color: '#666' }}>
          Already have an account?{' '}
          <button
            onClick={() => navigate('login')}
            style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Log in
          </button>
        </p>
      </div>
    </div>
  );
}

// Dashboard Page Component
function DashboardPage({ navigate }) {
  const { user, accountAddress, logout } = useContext(AuthContext);
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
        <button
          onClick={() => { logout(); navigate('landing'); }}
          style={{ padding: '10px 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          Log Out
        </button>
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

// Creator Page Component
function CreatorPage({ username, navigate }) {
  const [creator, setCreator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [donationAmount, setDonationAmount] = useState('');
  const [message, setMessage] = useState('');
  const [supporterName, setSupporterName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('crypto');
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
      } else {
        await handleCardDonation();
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

  const handleCardDonation = async () => {
    alert('Card payments will be available soon!');
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
          {creator.bio && <p style={{ fontSize: '16px', color: '#666', maxWidth: '500px', margin: '0 auto 20px auto' }}>{creator.bio}</p>}

          {/* Social Media Icons */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '20px', flexWrap: 'wrap' }}>
            {creator.twitter_url && (
              <a href={creator.twitter_url} target="_blank" rel="noopener noreferrer"
                 style={{ color: '#1DA1F2', fontSize: '28px', textDecoration: 'none', transition: 'transform 0.2s' }}
                 title="Twitter / X">
                <span style={{ display: 'inline-block', width: '36px', height: '36px', lineHeight: '36px', textAlign: 'center', backgroundColor: '#1DA1F2', color: 'white', borderRadius: '50%', fontSize: '18px' }}>𝕏</span>
              </a>
            )}
            {creator.youtube_url && (
              <a href={creator.youtube_url} target="_blank" rel="noopener noreferrer"
                 style={{ color: '#FF0000', fontSize: '28px', textDecoration: 'none' }}
                 title="YouTube">
                <span style={{ display: 'inline-block', width: '36px', height: '36px', lineHeight: '36px', textAlign: 'center', backgroundColor: '#FF0000', color: 'white', borderRadius: '50%', fontSize: '18px' }}>▶</span>
              </a>
            )}
            {creator.instagram_url && (
              <a href={creator.instagram_url} target="_blank" rel="noopener noreferrer"
                 style={{ color: '#E4405F', fontSize: '28px', textDecoration: 'none' }}
                 title="Instagram">
                <span style={{ display: 'inline-block', width: '36px', height: '36px', lineHeight: '36px', textAlign: 'center', background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', color: 'white', borderRadius: '50%', fontSize: '18px' }}>📷</span>
              </a>
            )}
            {creator.tiktok_url && (
              <a href={creator.tiktok_url} target="_blank" rel="noopener noreferrer"
                 style={{ color: '#000', fontSize: '28px', textDecoration: 'none' }}
                 title="TikTok">
                <span style={{ display: 'inline-block', width: '36px', height: '36px', lineHeight: '36px', textAlign: 'center', backgroundColor: '#000', color: 'white', borderRadius: '50%', fontSize: '18px' }}>♪</span>
              </a>
            )}
            {creator.linkedin_url && (
              <a href={creator.linkedin_url} target="_blank" rel="noopener noreferrer"
                 style={{ color: '#0077B5', fontSize: '28px', textDecoration: 'none' }}
                 title="LinkedIn">
                <span style={{ display: 'inline-block', width: '36px', height: '36px', lineHeight: '36px', textAlign: 'center', backgroundColor: '#0077B5', color: 'white', borderRadius: '50%', fontSize: '18px', fontWeight: 'bold' }}>in</span>
              </a>
            )}
            {creator.facebook_url && (
              <a href={creator.facebook_url} target="_blank" rel="noopener noreferrer"
                 style={{ color: '#1877F2', fontSize: '28px', textDecoration: 'none' }}
                 title="Facebook">
                <span style={{ display: 'inline-block', width: '36px', height: '36px', lineHeight: '36px', textAlign: 'center', backgroundColor: '#1877F2', color: 'white', borderRadius: '50%', fontSize: '18px', fontWeight: 'bold' }}>f</span>
              </a>
            )}
            {creator.website_url && (
              <a href={creator.website_url} target="_blank" rel="noopener noreferrer"
                 style={{ color: '#666', fontSize: '28px', textDecoration: 'none' }}
                 title="Website">
                <span style={{ display: 'inline-block', width: '36px', height: '36px', lineHeight: '36px', textAlign: 'center', backgroundColor: '#666', color: 'white', borderRadius: '50%', fontSize: '18px' }}>🌐</span>
              </a>
            )}
          </div>
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

          {/* Payment Method Tabs */}
          <div style={{ marginBottom: '20px', display: 'flex', borderBottom: '2px solid #e0e0e0' }}>
            <button
              onClick={() => setPaymentMethod('crypto')}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: 'transparent',
                color: paymentMethod === 'crypto' ? '#FFDD00' : '#999',
                border: 'none',
                borderBottom: paymentMethod === 'crypto' ? '3px solid #FFDD00' : '3px solid transparent',
                cursor: 'pointer',
                fontWeight: paymentMethod === 'crypto' ? 'bold' : 'normal',
                fontSize: '16px'
              }}
            >
              💰 Crypto (USDC)
            </button>
            <button
              onClick={() => setPaymentMethod('card')}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: 'transparent',
                color: paymentMethod === 'card' ? '#FFDD00' : '#999',
                border: 'none',
                borderBottom: paymentMethod === 'card' ? '3px solid #FFDD00' : '3px solid transparent',
                cursor: 'pointer',
                fontWeight: paymentMethod === 'card' ? 'bold' : 'normal',
                fontSize: '16px'
              }}
            >
              💳 Credit Card
            </button>
          </div>

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

      {/* AlgoPay Plus Footer */}
      <footer style={{
        backgroundColor: '#fff',
        borderTop: '1px solid #e0e0e0',
        padding: '20px',
        textAlign: 'center',
        marginTop: 'auto'
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>
            Powered by <strong style={{ color: '#333' }}>AlgoPay Plus</strong>
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
