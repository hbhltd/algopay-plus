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
      const response = await fetch(\`\${API_URL}/api/creators/by-wallet/\${address}\`);
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
      window.history.pushState({}, '', \`/@\${username}\`);
    } else if (page === 'landing') {
      window.history.pushState({}, '', '/');
    } else {
      window.history.pushState({}, '', \`/\${page}\`);
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

// (Rest of the components from the code you provided...)
// Landing, Signup, Dashboard, Creator pages...

export default App;
