// frontend/src/App.jsx
import { useState, useEffect, createContext, useContext } from 'react';
import axios from 'axios'; // We'll use axios for cleaner API calls
import './App.css'; // This line imports the CSS file

// ----------------------------------------------------
// 1. API Configuration & Axios Instance
// ----------------------------------------------------
const API_BASE_URL = 'http://localhost:3001';

// Create an Axios instance to easily add common headers (like profile_id)
// This is a best practice for API integration in React.
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Axios interceptor to dynamically add profile_id to all requests
// This ensures that after login, all subsequent requests automatically include the auth header.
api.interceptors.request.use(config => {
  const profileId = localStorage.getItem('profileId'); // Retrieve from local storage
  if (profileId) {
    config.headers['profile_id'] = profileId;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// ----------------------------------------------------
// 2. Auth Context for Global State Management
// ----------------------------------------------------
// Using React Context API to manage the logged-in user state globally.
// This avoids prop-drilling (passing props through many components).
const AuthContext = createContext(null);

// Custom hook to easily consume the AuthContext
const useAuth = () => useContext(AuthContext);

// ----------------------------------------------------
// 3. Main Application Component (App)
// ----------------------------------------------------
export default function App() {
  const [loggedInProfile, setLoggedInProfile] = useState(null); // Stores the full logged-in profile object
  const [profiles, setProfiles] = useState([]); // All profiles fetched for login dropdown
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Effect to fetch all profiles for the login dropdown
  useEffect(() => {
    const fetchAllProfiles = async () => {
      try {
        const response = await api.get('/profiles');
        setProfiles(response.data.filter(p => p.type === 'client')); // Only show clients for login
      } catch (err) {
        console.error('Error fetching profiles:', err);
        setError('Failed to load profiles. Please check the backend server.');
      } finally {
        setLoading(false);
      }
    };

    fetchAllProfiles();
  }, []);

  // Effect to check for stored profile_id on initial load
  // This allows the user to stay "logged in" across page refreshes.
  useEffect(() => {
    const storedProfileId = localStorage.getItem('profileId');
    if (storedProfileId) {
      // If a profileId is stored, try to re-fetch the full profile details
      const fetchLoggedInProfile = async () => {
        try {
          setLoading(true); // Set loading state while re-fetching profile
          const response = await api.get('/profiles'); // Fetch all profiles again
          const profile = response.data.find(p => String(p.id) === storedProfileId); // Find the matching profile
          if (profile) {
            setLoggedInProfile(profile);
          } else {
            // If stored ID doesn't match any profile, clear it (e.g., profile was deleted)
            localStorage.removeItem('profileId');
          }
        } catch (err) {
          console.error('Error re-fetching logged in profile:', err);
          setError('Failed to re-authenticate. Please log in again.');
          localStorage.removeItem('profileId');
        } finally {
          setLoading(false);
        }
      };
      fetchLoggedInProfile();
    } else {
        setLoading(false); // No stored ID, so not loading for auth
    }
  }, []);

  // Function to handle login
  const handleLogin = (profileId) => {
    // In a real app, this would involve sending credentials and getting a token.
    // For this assignment, storing profile_id locally is the authentication mechanism.
    localStorage.setItem('profileId', profileId);
    const selectedProfile = profiles.find(p => String(p.id) === profileId);
    setLoggedInProfile(selectedProfile); // Set the full profile object
    setError(null); // Clear any previous errors
  };

  // Function to handle logout
  const handleLogout = () => {
    localStorage.removeItem('profileId');
    setLoggedInProfile(null);
    setError(null); // Clear any previous errors
  };

  if (loading) {
    return <div className="App">Loading application...</div>;
  }

  if (error) {
    return <div className="App" style={{ color: 'red', padding: '20px', border: '1px solid red', borderRadius: '8px' }}>
      <h2>Application Error</h2>
      <p>{error}</p>
      {loggedInProfile && <button onClick={handleLogout} className="button logout-button">Logout</button>}
      {!loggedInProfile && <button onClick={() => window.location.reload()} className="button refresh-button">Refresh Page</button>}
    </div>;
  }

  return (
    <AuthContext.Provider value={{ loggedInProfile, setLoggedInProfile, handleLogout, api }}>
      <div className="App">
        {loggedInProfile ? (
          <Dashboard /> // Show Dashboard if logged in
        ) : (
          <Login profiles={profiles} onLogin={handleLogin} /> // Show Login screen otherwise
        )}
      </div>
    </AuthContext.Provider>
  );
}

// ----------------------------------------------------
// 4. Login Component
// ----------------------------------------------------
function Login({ profiles, onLogin }) {
  const [selectedProfileId, setSelectedProfileId] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedProfileId) {
      onLogin(selectedProfileId);
    } else {
      console.warn('Please select a profile to log in.');
      alert('Please select a profile to log in.'); // Using alert for quick demo, replace for prod
    }
  };

  return (
    <div className="login-container">
      <h1>Welcome to Deel Jobs!</h1>
      <form onSubmit={handleSubmit} className="login-form">
        <label htmlFor="profile-select">Log in as Client:</label>
        <select
          id="profile-select"
          value={selectedProfileId}
          onChange={(e) => setSelectedProfileId(e.target.value)}
          required
        >
          <option value="">-- Select a Client Profile --</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.firstName} {profile.lastName} (ID: {profile.id})
            </option>
          ))}
        </select>
        <button type="submit" className="button login-button">Login</button>
      </form>
    </div>
  );
}

// ----------------------------------------------------
// 5. Dashboard Component (Main Application Interface)
// ----------------------------------------------------
function Dashboard() {
  const { loggedInProfile, setLoggedInProfile, handleLogout, api } = useAuth();
  const [contractors, setContractors] = useState([]);
  const [selectedContractorId, setSelectedContractorId] = useState('');
  const [contractorJobs, setContractorJobs] = useState({ unpaid: [], paid: [] });
  const [dashboardError, setDashboardError] = useState(null);
  const [message, setMessage] = useState(null); // For success messages

  // Effect to fetch all contractor profiles for the "Pay Jobs for..." dropdown
  useEffect(() => {
    const fetchContractors = async () => {
      try {
        const response = await api.get('/profiles');
        setContractors(response.data.filter(p => p.type === 'contractor'));
      } catch (err) {
        console.error('Error fetching contractors:', err);
        setDashboardError('Failed to load contractors.');
      }
    };
    fetchContractors();
  }, [api]);


  // Function to refresh the logged-in client's balance
  const refreshClientBalance = async () => {
    try {
      const response = await api.get('/profiles');
      const updatedProfile = response.data.find(p => p.id === loggedInProfile.id);
      if (updatedProfile) {
        setLoggedInProfile(updatedProfile); // Update the profile in context
      }
    } catch (err) {
      console.error('Error refreshing client balance:', err);
      setDashboardError('Failed to refresh balance.');
    }
  };

  // Handle Deposit
  const handleDeposit = async (amount) => {
    setDashboardError(null);
    setMessage(null);
    try {
      const response = await api.post(`/balances/deposit/${loggedInProfile.id}`, { amount });
      setMessage(response.data.message);
      await refreshClientBalance(); // Refresh balance after successful deposit
    } catch (err) {
      console.error('Deposit error:', err.response?.data || err.message);
      setDashboardError(err.response?.data?.error || 'Deposit failed.');
    }
  };

  // Handle fetching jobs for selected contractor
  const handleFetchJobs = async (e) => {
    e.preventDefault();
    setDashboardError(null);
    setMessage(null);
    if (!selectedContractorId) {
      setDashboardError('Please select a contractor.');
      return;
    }

    try {
      const response = await api.get('/jobs/paid-and-unpaid/');
      const allJobsForSelectedContractor = response.data;

      // Filter these jobs to only show those where the logged-in client is the actual client of the contract
      // This ensures the client only sees jobs relevant to them for the selected contractor.
      const unpaidJobs = allJobsForSelectedContractor.filter(job =>
        (!job.paid || job.paid === null) && String(job.Contract.ClientId) === String(loggedInProfile.id)
      );
      const paidJobs = allJobsForSelectedContractor.filter(job =>
        job.paid === true && String(job.Contract.ClientId) === String(loggedInProfile.id)
      );

      setContractorJobs({ unpaid: unpaidJobs, paid: paidJobs });

    } catch (err) {
      console.error('Error fetching jobs for contractor:', err.response?.data || err.message);
      // Specifically check for 404 if no jobs found for contractor to give a better message
      if (err.response && err.response.status === 404) {
        setDashboardError('No jobs found for this contractor linked to your account.');
      } else {
        setDashboardError(err.response?.data?.error || 'Failed to fetch jobs for selected contractor.');
      }
    }
  };

  // Handle Job Payment
  const handlePayJob = async (jobId, jobPrice) => {
    setDashboardError(null);
    setMessage(null);

    if (loggedInProfile.balance < jobPrice) {
      setDashboardError('Insufficient balance to pay for this job.');
      return;
    }

    try {
      const response = await api.post(`/jobs/${jobId}/pay`);
      setMessage(response.data.message);
      await refreshClientBalance(); // Refresh balance after payment

      // After payment, refresh the job lists by re-triggering handleFetchJobs
      handleFetchJobs({ preventDefault: () => {} }); // Simulate form submission to refresh
    } catch (err) {
      console.error('Payment error:', err.response?.data || err.message);
      setDashboardError(err.response?.data?.error || 'Payment failed.');
    }
  };


  return (
    <div className="dashboard-container">
      <div className="header">
        <h1>Deel Jobs Dashboard</h1>
        <div className="profile-info">
          <span>Logged in as: {loggedInProfile.firstName} {loggedInProfile.lastName} ({loggedInProfile.type})</span>
          <span className="balance">Balance: ${parseFloat(loggedInProfile.balance).toFixed(2)}</span>
          <button onClick={handleLogout} className="button logout-button">Logout</button>
        </div>
      </div>

      {dashboardError && <div className="error-message">{dashboardError}</div>}
      {message && <div className="success-message">{message}</div>}

      <div className="deposit-section card">
        <h2>Deposit Money</h2>
        <div className="deposit-buttons">
          {[1, 5, 10, 50, 100, 500].map(amount => (
            <button key={amount} onClick={() => handleDeposit(amount)} className="button deposit-button">
              Deposit ${amount}
            </button>
          ))}
        </div>
      </div>

      <div className="pay-jobs-section card">
        <h2>Pay Jobs for...</h2>
        <form onSubmit={handleFetchJobs} className="pay-jobs-form">
          <select
            value={selectedContractorId}
            onChange={(e) => setSelectedContractorId(e.target.value)}
            required
          >
            <option value="">-- Select a Contractor --</option>
            {contractors.map(contractor => (
              <option key={contractor.id} value={contractor.id}>
                {contractor.firstName} {contractor.lastName} ({contractor.profession})
              </option>
            ))}
          </select>
          <button type="submit" className="button continue-button">Continue</button>
        </form>
      </div>

      {contractorJobs.unpaid.length > 0 || contractorJobs.paid.length > 0 ? (
        <div className="job-lists-section">
          {contractorJobs.unpaid.length > 0 && (
            <div className="unpaid-jobs-list card">
              <h3>Unpaid Jobs (for selected contractor, current client)</h3>
              <ul>
                {contractorJobs.unpaid.map(job => (
                  <li key={job.id} className="job-item unpaid">
                    <p><strong>Description:</strong> {job.description}</p>
                    <p><strong>Price:</strong> ${parseFloat(job.price).toFixed(2)}</p>
                    <p><strong>Contract:</strong> {job.Contract.terms.substring(0, Math.min(job.Contract.terms.length, 50))}...</p>
                    <button
                      onClick={() => handlePayJob(job.id, parseFloat(job.price))}
                      className="button pay-button"
                      disabled={loggedInProfile.balance < parseFloat(job.price)} // Disable if insufficient balance
                    >
                      {loggedInProfile.balance < parseFloat(job.price) ? 'Insufficient Funds' : 'Pay Job'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* This section will now properly display paid jobs once the backend API is added. */}
          {contractorJobs.paid.length > 0 && (
            <div className="paid-jobs-list card">
              <h3>Paid Jobs (for selected contractor, current client)</h3>
              <ul>
                {contractorJobs.paid.map(job => (
                  <li key={job.id} className="job-item paid">
                    <p><strong>Description:</strong> {job.description}</p>
                    <p><strong>Price:</strong> ${parseFloat(job.price).toFixed(2)}</p>
                    <p><strong>Contract:</strong> {job.Contract.terms.substring(0, Math.min(job.Contract.terms.length, 50))}...</p>
                    <p><em>Paid on: {new Date(job.paymentDate).toLocaleDateString()}</em></p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {contractorJobs.unpaid.length === 0 && contractorJobs.paid.length === 0 && (
            <p className="no-jobs-message">No jobs found for the selected contractor within this client's active contracts.</p>
          )}
        </div>
      ) : (
        selectedContractorId && <p className="no-jobs-message">Select a contractor and click continue to view jobs.</p>
      )}
    </div>
  );
}
