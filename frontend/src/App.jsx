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
        <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>AlgoPay Plus</h1>
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
    email: ''
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
          ...formData,
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
        <button
          onClick={disconnectWallet}
          style={{ padding: '10px 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          Disconnect
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
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '10px' }}>{creator.display_name}</h1>
        <p style={{ fontSize: '20px', color: '#666' }}>@{creator.username}</p>
        {creator.bio && <p style={{ marginTop: '20px', fontSize: '18px' }}>{creator.bio}</p>}
      </div>

      <div style={{ backgroundColor: '#f8f9fa', padding: '40px', borderRadius: '12px' }}>
        <h2 style={{ marginBottom: '30px', textAlign: 'center' }}>Support {creator.display_name}</h2>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Amount (USDC)
          </label>
          <input
            type="number"
            value={donationAmount}
            onChange={(e) => setDonationAmount(e.target.value)}
            placeholder="10"
            style={{ width: '100%', padding: '12px', fontSize: '18px', borderRadius: '6px', border: '1px solid #ddd' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Your Name (optional)
          </label>
          <input
            type="text"
            value={supporterName}
            onChange={(e) => setSupporterName(e.target.value)}
            placeholder="Anonymous"
            style={{ width: '100%', padding: '12px', fontSize: '16px', borderRadius: '6px', border: '1px solid #ddd' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Message (optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Say something nice..."
            style={{ width: '100%', padding: '12px', fontSize: '16px', borderRadius: '6px', border: '1px solid #ddd', minHeight: '80px' }}
          />
        </div>

        <div style={{ marginBottom: '30px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Payment Method
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setPaymentMethod('crypto')}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: paymentMethod === 'crypto' ? '#007bff' : '#fff',
                color: paymentMethod === 'crypto' ? '#fff' : '#000',
                border: '1px solid #007bff',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Crypto (USDC)
            </button>
            <button
              onClick={() => setPaymentMethod('card')}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: paymentMethod === 'card' ? '#007bff' : '#fff',
                color: paymentMethod === 'card' ? '#fff' : '#000',
                border: '1px solid #007bff',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Credit Card
            </button>
          </div>
        </div>

        <button
          onClick={handleDonate}
          disabled={processing}
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '20px',
            backgroundColor: processing ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: processing ? 'not-allowed' : 'pointer'
          }}
        >
          {processing ? 'Processing...' : `Donate $${donationAmount || '0'}`}
        </button>
      </div>
    </div>
  );
}

export default App;
