import React, { useState, useEffect } from 'react';
import StationPicker from './components/StationPicker';
import RouteResult from './components/RouteResult';
import LostFound from './components/LostFound';
import BusCommute from './components/BusCommute';
import FarePredictor from './components/FarePredictor';
import CrowdPredictor from './components/CrowdPredictor';
import MetroMap from './components/MetroMap';
import Chatbot from './components/Chatbot';
import { fetchRoute } from './api';
import './App.css';

const METRO_LINES = [
  { name: 'Red Line', color: '#FF3333', status: 'ACTIVE' },
  { name: 'Yellow Line', color: '#FFD700', status: 'ACTIVE' },
  { name: 'Blue Line', color: '#0066CC', status: 'ACTIVE' },
  { name: 'Green Line', color: '#33AA33', status: 'ACTIVE' },
  { name: 'Violet Line', color: '#9933CC', status: 'ACTIVE' },
  { name: 'Pink Line', color: '#FF66B2', status: 'ACTIVE' },
  { name: 'Magenta Line', color: '#FF00FF', status: 'ACTIVE' },
  { name: 'Grey Line', color: '#999999', status: 'ACTIVE' },
  { name: 'Airport Exp.', color: '#FF9933', status: 'ACTIVE' },
  { name: 'Aqua Line', color: '#00CCCC', status: 'ACTIVE' }
];

export default function App() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [routeResult, setRouteResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeView, setActiveView] = useState('route'); // 'route' | 'map' | 'nearest' | 'fare' | 'crowd' | 'bus' | 'favorites' | 'history'
  
  // Navigation & Drawer states
  const [showFeaturesMenu, setShowFeaturesMenu] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('signup'); // 'signup' | 'login'
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [selectedMapLine, setSelectedMapLine] = useState(null);
  
  // Auth Form Inputs & User Session State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('');

  // Form input values inside Boarding Pass / Route Planner
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const [isPlanning, setIsPlanning] = useState(false);

  // Keep track of search history locally
  const [searchHistory, setSearchHistory] = useState([
    { from: 'Rajiv Chowk', to: 'HUDA City Centre', date: 'Today' },
    { from: 'AIIMS', to: 'Kashmere Gate', date: 'Yesterday' }
  ]);

  const handlePlan = async () => {
    if (!fromInput || !toInput) {
      setError('Select both stations');
      return;
    }
    if (fromInput === toInput) {
      setError('Select different stations');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await fetchRoute(fromInput, toInput);
      setRouteResult(data);
      setFrom(fromInput);
      setTo(toInput);
      // Append to local search history
      setSearchHistory(prev => [
        { from: fromInput, to: toInput, date: 'Just now' },
        ...prev.slice(0, 4)
      ]);
    } catch (err) {
      setError('No route found between these stations');
      setRouteResult(null);
    }
    setLoading(false);
  };

  const swapStations = () => {
    const temp = fromInput;
    setFromInput(toInput);
    setToInput(temp);
  };

  // Scroll helper
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    setIsLoggedIn(true);
    setUserEmail(emailInput);
    setUserName(authMode === 'signup' ? nameInput : emailInput.split('@')[0]);
    setShowAuthModal(false);
    // Reset form inputs
    setEmailInput('');
    setPasswordInput('');
    setNameInput('');
    // Open route planner by default on login
    setActiveView('route');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserEmail('');
    setUserName('');
    setRouteResult(null);
    setFromInput('');
    setToInput('');
  };

  // If logged in, show the split console view dashboard (Screen 1 & 2)
  if (isLoggedIn) {
    return (
      <div className="console-layout">
        {/* Left Sidebar */}
        <aside className="console-sidebar">
          <div className="console-sidebar-top">
            <div className="console-logo-section">
              <a href="/" className="logo-container" style={{ color: 'var(--white)' }}>
                <div className="logo-box" style={{ background: 'var(--white)', color: 'var(--bg-dark)' }}>🚇</div>
                <span className="logo-text">Commutify</span>
              </a>
              <span className="console-header-badge" style={{ color: 'var(--text-dim-light)', marginTop: '8px' }}>
                ⚙️ CONSOLE
              </span>
            </div>
            
            <ul className="console-menu-list">
              <li>
                <button 
                  className={`console-menu-item ${activeView === 'route' ? 'active' : ''}`}
                  onClick={() => setActiveView('route')}
                >
                  🧭 Route Planner
                </button>
              </li>
              <li>
                <button 
                  className={`console-menu-item ${activeView === 'map' ? 'active' : ''}`}
                  onClick={() => setActiveView('map')}
                >
                  🚇 Metro Map
                </button>
              </li>
              <li>
                <button 
                  className={`console-menu-item ${activeView === 'nearest' ? 'active' : ''}`}
                  onClick={() => setActiveView('nearest')}
                >
                  📍 Nearest
                </button>
              </li>
              <li>
                <button 
                  className={`console-menu-item ${activeView === 'fare' ? 'active' : ''}`}
                  onClick={() => setActiveView('fare')}
                >
                  💵 Fare
                </button>
              </li>
              <li>
                <button 
                  className={`console-menu-item ${activeView === 'crowd' ? 'active' : ''}`}
                  onClick={() => setActiveView('crowd')}
                >
                  👤 Crowd
                </button>
              </li>
              <li>
                <button 
                  className={`console-menu-item ${activeView === 'bus' ? 'active' : ''}`}
                  onClick={() => setActiveView('bus')}
                >
                  🚌 Bus Info
                </button>
              </li>
              <li>
                <button 
                  className={`console-menu-item ${activeView === 'favorites' ? 'active' : ''}`}
                  onClick={() => setActiveView('favorites')}
                >
                  ⭐ Favorites
                </button>
              </li>
              <li>
                <button 
                  className={`console-menu-item ${activeView === 'history' ? 'active' : ''}`}
                  onClick={() => setActiveView('history')}
                >
                  🕒 History
                </button>
              </li>
            </ul>
          </div>
          
          <div className="console-sidebar-bottom">
            <div className="console-user-info">
              <span>Signed in as</span>
              <div className="console-user-email">{userName || 'Commuter'}</div>
            </div>
            <button className="btn-console-logout" onClick={handleLogout}>
              <span>[→</span> Log out
            </button>
          </div>
        </aside>

        {/* Right Main Panel */}
        <main className="console-main-panel">
          {activeView === 'route' && (
            <div>
              <span className="console-header-badge">⚙️ CONSOLE</span>
              <h1 className="console-title">Route Planner</h1>
              <p className="console-subtitle">From station A to station B — with interchanges, fare, and time.</p>
              
              <div className="console-planner-box">
                <div className="console-planner-field">
                  <label>FROM</label>
                  <StationPicker
                    label={null}
                    value={fromInput}
                    onSelect={setFromInput}
                    placeholder="Origin station"
                  />
                </div>
                
                <button className="console-planner-swap" onClick={swapStations}>
                  ⇄
                </button>

                <div className="console-planner-field">
                  <label>TO</label>
                  <StationPicker
                    label={null}
                    value={toInput}
                    onSelect={setToInput}
                    placeholder="Destination station"
                  />
                </div>
              </div>

              {error && <div className="error-msg" style={{ marginBottom: '20px', color: 'red', fontSize: '13px' }}>{error}</div>}

              <button 
                className="btn-console-find" 
                onClick={handlePlan}
                disabled={loading || !fromInput || !toInput}
              >
                <span>⚏</span> {loading ? 'Finding route...' : 'Find route'}
              </button>

              {/* Show result underneath */}
              {routeResult && (
                <div style={{ marginTop: '40px', background: 'var(--white)', border: '1px solid var(--border)', borderRadius: '4px', padding: '30px' }}>
                  <RouteResult route={routeResult.route} comparison={routeResult.comparison} />
                </div>
              )}
            </div>
          )}

          {activeView === 'map' && (
            <div>
              <span className="console-header-badge">⚙️ CONSOLE</span>
              <h1 className="console-title">Metro Map &amp; Network</h1>
              <p className="console-subtitle">Click any line to see all stations with Google Maps links.</p>
              <div className="features-content-wrapper" style={{ padding: 0 }}>
                <MetroMap initialLine={selectedMapLine} />
              </div>
            </div>
          )}

          {activeView === 'nearest' && (
            <div>
              <span className="console-header-badge">⚙️ CONSOLE</span>
              <h1 className="console-title">Nearest Stations & Hotspots</h1>
              <p className="console-subtitle">Identify proximity and common transit lost hotspots.</p>
              <LostFound />
            </div>
          )}

          {activeView === 'fare' && (
            <div>
              <span className="console-header-badge">⚙️ CONSOLE</span>
              <h1 className="console-title">Fare Calculator</h1>
              <p className="console-subtitle">Estimate fares, smart card savings, and discount slabs.</p>
              <FarePredictor />
            </div>
          )}

          {activeView === 'crowd' && (
            <div>
              <span className="console-header-badge">⚙️ CONSOLE</span>
              <h1 className="console-title">Crowd Predictor</h1>
              <p className="console-subtitle">Average station peak rush hours and commute suggestions.</p>
              <CrowdPredictor />
            </div>
          )}

          {activeView === 'bus' && (
            <div>
              <span className="console-header-badge">⚙️ CONSOLE</span>
              <h1 className="console-title">Bus Info</h1>
              <p className="console-subtitle">Search DTC bus routes, stops, and arrival predictions.</p>
              <BusCommute />
            </div>
          )}

          {activeView === 'favorites' && (
            <div>
              <span className="console-header-badge">⚙️ CONSOLE</span>
              <h1 className="console-title">Favorites</h1>
              <p className="console-subtitle">Your bookmarked stations and routes for quick planning.</p>
              <div className="features-content-wrapper" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
                ⭐️ You haven't added any favorite stations yet. Click "Star" next to any station to bookmark it.
              </div>
            </div>
          )}

          {activeView === 'history' && (
            <div>
              <span className="console-header-badge">⚙️ CONSOLE</span>
              <h1 className="console-title">Commute History</h1>
              <p className="console-subtitle">Your recently planned route calculations and searches.</p>
              <div className="features-content-wrapper" style={{ padding: '30px' }}>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {searchHistory.map((item, idx) => (
                    <li key={idx} style={{ padding: '12px', border: '1px solid var(--grey-light)', borderRadius: '4px', background: 'var(--grey-bg)', display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
                      <span>📍 {item.from} → {item.to}</span>
                      <span style={{ color: 'var(--text-dim)' }}>{item.date}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </main>

        {/* AI Assistant Chatbot widget */}
        <Chatbot isOpen={chatbotOpen} setIsOpen={setChatbotOpen} />
      </div>
    );
  }

  // Else, show normal public homepage landing screen (for guest users)
  return (
    <div className="app-container">
      {/* Header / Navbar */}
      <header className="app-navbar">
        <div className="nav-left">
          <a href="/" className="logo-container">
            <div className="logo-box">🚇</div>
            <span className="logo-text">Commutify</span>
          </a>
          <span className="badge-location">DELHI · IN</span>
        </div>
        <nav className="nav-right">
          <button 
            className={`nav-link ${showFeaturesMenu ? 'active' : ''}`} 
            onClick={() => setShowFeaturesMenu(!showFeaturesMenu)}
          >
            Features
          </button>
          <button className="nav-link" onClick={() => scrollToSection('network-lines')}>
            Lines
          </button>
          <button className="nav-link" onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}>
            Log in
          </button>
          <button className="btn-get-started" onClick={() => { setAuthMode('signup'); setShowAuthModal(true); }}>
            Get Started ↗
          </button>
        </nav>
      </header>

      {/* Sliding Ticker */}
      <section className="ticker-banner">
        <div className="ticker-wrap">
          <div className="ticker-item">
            <span className="ticker-bullet">●</span> OPERATIONAL 06:00 - 23:00
          </div>
          <div className="ticker-item">
            <span className="ticker-bullet">●</span> 288 STATIONS - 10 LINES - 350+ KM NETWORK
          </div>
          <div className="ticker-item">
            <span className="ticker-bullet">●</span> SMART CARD SAVES 10%
          </div>
          <div className="ticker-item">
            <span className="ticker-bullet">●</span> AI COMMUTE ASSISTANT NOW ONLINE
          </div>
          <div className="ticker-item">
            <span className="ticker-bullet">●</span> LIVE - DELHI METRO
          </div>
          {/* Duplicate for infinite animation */}
          <div className="ticker-item">
            <span className="ticker-bullet">●</span> OPERATIONAL 06:00 - 23:00
          </div>
          <div className="ticker-item">
            <span className="ticker-bullet">●</span> 288 STATIONS - 10 LINES - 350+ KM NETWORK
          </div>
          <div className="ticker-item">
            <span className="ticker-bullet">●</span> SMART CARD SAVES 10%
          </div>
          <div className="ticker-item">
            <span className="ticker-bullet">●</span> AI COMMUTE ASSISTANT NOW ONLINE
          </div>
          <div className="ticker-item">
            <span className="ticker-bullet">●</span> LIVE - DELHI METRO
          </div>
        </div>
      </section>

      {/* Features Dropdown Menu */}
      {showFeaturesMenu && (
        <section className="features-drawer">
          <div className="features-grid">
            <div 
              className={`feature-card-nav ${activeView === 'route' ? 'active' : ''}`}
              onClick={() => { setActiveView('route'); setShowFeaturesMenu(false); scrollToSection('features-section'); }}
            >
              <h3>Crowd Predictor</h3>
              <p>24-hour rush forecast per station. Skip the 9am crush.</p>
            </div>
            <div 
              className={`feature-card-nav ${activeView === 'bus' ? 'active' : ''}`}
              onClick={() => { setActiveView('bus'); setShowFeaturesMenu(false); scrollToSection('features-section'); }}
            >
              <h3>DTC Bus Info</h3>
              <p>Popular routes with stops — combine metro + bus for last mile.</p>
            </div>
            <div 
              className={`feature-card-nav ${activeView === 'fare' ? 'active' : ''}`}
              onClick={() => { setActiveView('fare'); setShowFeaturesMenu(false); scrollToSection('features-section'); }}
            >
              <h3>Fare Predictor</h3>
              <p>Predict ticket costs, plan smart card or off-peak savings.</p>
            </div>
            <div 
              className={`feature-card-nav ${activeView === 'lost' ? 'active' : ''}`}
              onClick={() => { setActiveView('lost'); setShowFeaturesMenu(false); scrollToSection('features-section'); }}
            >
              <h3>Lost & Found</h3>
              <p>Search over 13,000 lost items database or report yours.</p>
            </div>
          </div>
        </section>
      )}

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-left">
          <div className="hero-version">
            <span>⚙️</span> VER 1.0 · DELHI NCR COVERAGE
          </div>
          <h1 className="hero-title">
            Delhi Metro,<br />
            <span className="serif-italic">solved</span> for
            <span className="highlight-box">commuters.</span>
          </h1>
          <p className="hero-desc">
            Plan station-to-station journeys, calculate fares, find your nearest station, dodge rush hour crowds, and ask an AI trainee on Delhi transit — all in one place.
          </p>
          <div className="hero-buttons">
            <button className="btn-primary" onClick={() => { setIsPlanning(true); setError(''); }}>
              Plan a journey ↗
            </button>
            <button className="btn-secondary" onClick={() => { setActiveView('route'); scrollToSection('features-section'); }}>
              Explore features
            </button>
          </div>
          
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">288</span>
              <span className="stat-label-mono">STATIONS</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">10</span>
              <span className="stat-label-mono">LINES</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">₹10–60</span>
              <span className="stat-label-mono">FARE RANGE</span>
            </div>
          </div>
        </div>

        {/* Boarding Pass / Journey Planner Right Column */}
        <div className="hero-right">
          <div className="boarding-pass-wrapper">
            <div className="boarding-pass-card">
              <span className="badge-sample">SAMPLE</span>
              
              {isPlanning ? (
                /* Planning Mode inputs form */
                <div className="planner-form">
                  <h3 className="planner-form-title">Journey Planner</h3>
                  
                  <div className="planner-inputs-row">
                    <div className="planner-input-group" style={{ flex: 1 }}>
                      <label>From</label>
                      <StationPicker
                        label=""
                        value={fromInput}
                        onSelect={setFromInput}
                        placeholder="Origin station"
                      />
                    </div>
                    
                    <button className="planner-swap-btn" onClick={swapStations} title="Swap stations">
                      ⇅
                    </button>

                    <div className="planner-input-group" style={{ flex: 1 }}>
                      <label>To</label>
                      <StationPicker
                        label=""
                        value={toInput}
                        onSelect={setToInput}
                        placeholder="Destination station"
                      />
                    </div>
                  </div>

                  {error && <div className="error-msg" style={{ margin: '8px 0', color: 'red', fontSize: '12px' }}>{error}</div>}

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      className="btn-planner-find" 
                      onClick={handlePlan}
                      disabled={loading || !fromInput || !toInput}
                      style={{ flex: 2 }}
                    >
                      {loading ? 'Searching...' : 'Find Route'}
                    </button>
                    <button 
                      className="btn-planner-find" 
                      onClick={() => setIsPlanning(false)}
                      style={{ flex: 1, background: 'none', color: 'var(--text)', borderColor: 'var(--border)' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Ticket Display Mode */
                <>
                  <div className="pass-meta-row">
                    <span className="pass-title-mono">DMRC · BOARDING PASS</span>
                    <span className="pass-id-mono">CMFT-3545</span>
                  </div>
                  
                  <div className="pass-stations-row">
                    <div className="pass-station-col">
                      <span className="pass-label-mono">FROM</span>
                      <span className="pass-station-name">{routeResult ? from : 'Rajiv Chowk'}</span>
                      <span className="pass-station-sub-mono">Yellow · Blue</span>
                    </div>
                    
                    <div className="pass-arrow-icon">→</div>
                    
                    <div className="pass-station-col right">
                      <span className="pass-label-mono">TO</span>
                      <span className="pass-station-name">{routeResult ? to : 'HUDA City'}</span>
                      <span className="pass-station-sub-mono">Yellow Line</span>
                    </div>
                  </div>
                  
                  <div className="pass-stats-grid">
                    <div className="pass-stat-col">
                      <span className="pass-stat-value">₹{routeResult ? routeResult.route.fare : '50'}</span>
                      <span className="pass-stat-label-mono">FARE</span>
                    </div>
                    <div className="pass-stat-col">
                      <span className="pass-stat-value">{routeResult ? Math.round(routeResult.route.totalTime) : '42'} min</span>
                      <span className="pass-stat-label-mono">TIME</span>
                    </div>
                    <div className="pass-stat-col">
                      <span className="pass-stat-value">{routeResult ? routeResult.route.interchanges : '0'}</span>
                      <span className="pass-stat-label-mono">CHANGE</span>
                    </div>
                  </div>
                  
                  <div className="pass-color-strip">
                    <div className="pass-color-bar" style={{ background: '#FF3333' }}></div>
                    <div className="pass-color-bar" style={{ background: '#FFD700' }}></div>
                    <div className="pass-color-bar" style={{ background: '#0066CC' }}></div>
                    <div className="pass-color-bar" style={{ background: '#33AA33' }}></div>
                    <div className="pass-color-bar" style={{ background: '#9933CC' }}></div>
                    <div className="pass-color-bar" style={{ background: '#FF66B2' }}></div>
                    <div className="pass-color-bar" style={{ background: '#FF00FF' }}></div>
                    <div className="pass-color-bar" style={{ background: '#999999' }}></div>
                    <div className="pass-color-bar" style={{ background: '#FF9933' }}></div>
                    <div className="pass-color-bar" style={{ background: '#00CCCC' }}></div>
                  </div>

                  {!routeResult && (
                    <button 
                      className="btn-primary" 
                      onClick={() => setIsPlanning(true)} 
                      style={{ marginTop: '20px', width: '100%', justifyContent: 'center', fontSize: '13px', padding: '10px' }}
                    >
                      Click to Plan a journey
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Render detailed Metro Route path if computed */}
      {routeResult && !isPlanning && (
        <section className="features-main-section" style={{ paddingBottom: '40px' }}>
          <div className="features-content-wrapper">
            <div className="tool-header-row">
              <div className="tool-header-left">
                <span className="tool-header-icon">🗺️</span>
                <span className="tool-header-title">Computed Commute Route</span>
              </div>
              <span className="tool-header-stats-mono">Fastest Track Selected</span>
            </div>
            <div className="planner-detail-card">
              <RouteResult route={routeResult.route} comparison={routeResult.comparison} />
              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <button 
                  className="btn-secondary" 
                  onClick={() => { setIsPlanning(true); setFromInput(from); setToInput(to); }}
                >
                  Adjust Stations
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Features Tabs & Details Dashboard */}
      <section id="features-section" className="features-main-section">
        {/* Navigation tabs for features */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
          <button 
            className={`nav-link ${activeView === 'route' ? 'active' : ''}`}
            onClick={() => setActiveView('route')}
            style={{ fontSize: '15px', fontWeight: '800', borderBottom: activeView === 'route' ? '3px solid var(--border)' : 'none', borderRadius: 0 }}
          >
            🗺️ Metro Planner
          </button>
          <button 
            className={`nav-link ${activeView === 'bus' ? 'active' : ''}`}
            onClick={() => setActiveView('bus')}
            style={{ fontSize: '15px', fontWeight: '800', borderBottom: activeView === 'bus' ? '3px solid var(--border)' : 'none', borderRadius: 0 }}
          >
            🚌 DTC Bus Info
          </button>
          <button 
            className={`nav-link ${activeView === 'fare' ? 'active' : ''}`}
            onClick={() => setActiveView('fare')}
            style={{ fontSize: '15px', fontWeight: '800', borderBottom: activeView === 'fare' ? '3px solid var(--border)' : 'none', borderRadius: 0 }}
          >
            💰 Fare Calculator
          </button>
          <button 
            className={`nav-link ${activeView === 'lost' ? 'active' : ''}`}
            onClick={() => setActiveView('lost')}
            style={{ fontSize: '15px', fontWeight: '800', borderBottom: activeView === 'lost' ? '3px solid var(--border)' : 'none', borderRadius: 0 }}
          >
            🔎 Lost & Found
          </button>
        </div>

        <div className="features-content-wrapper">
          {activeView === 'route' && (
            <div>
              <div className="tool-header-row">
                <div className="tool-header-left">
                  <span className="tool-header-icon">🚇</span>
                  <span className="tool-header-title">Delhi Metro Commute Planner</span>
                </div>
                <span className="tool-header-stats-mono">Real-Time Routing & Connections</span>
              </div>
              <div className="planner-detail-card">
                <p style={{ marginBottom: '20px', color: 'var(--text-dim)' }}>
                  Use the Boarding Pass calculator in the Hero section above to find routes, or view transit options.
                </p>
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <button className="btn-primary" onClick={() => { setIsPlanning(true); scrollToSection('app-navbar'); }}>
                    Open Route Planner Form ↗
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeView === 'lost' && <LostFound />}
          {activeView === 'bus' && <BusCommute />}
          {activeView === 'fare' && <FarePredictor />}
        </div>
      </section>

      {/* Network Lines Grid Section */}
      <section id="network-lines" className="network-section">
        <span className="network-badge-mono">§ 03 — NETWORK</span>
        <h2 className="network-title">Ten lines. One city.</h2>
        
        <div className="network-grid">
          {METRO_LINES.map((line, idx) => (
            <div
              key={idx}
              className="line-card"
              onClick={() => {
                setSelectedMapLine(line.name.replace(' Exp.', ' line'));
                setActiveView('map');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={{ cursor: 'pointer' }}
            >
              <div className="line-color-bar" style={{ background: line.color }} />
              <div className="line-card-info">
                <span className="line-card-name">{line.name}</span>
                <span className="line-card-status active">{line.status}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Bottom Banner */}
      <section className="cta-banner">
        <div className="cta-container">
          <div className="cta-left">
            <span className="cta-badge-mono">⚙️ READY WHEN YOU ARE</span>
            <h2 className="cta-title">
              Board smarter.<br />
              <span className="serif-italic">Travel</span> lighter.
            </h2>
          </div>
          <div className="cta-right">
            <button className="btn-primary" onClick={() => { setAuthMode('signup'); setShowAuthModal(true); }}>
              Create free account ↗
            </button>
            <span className="cta-sub-mono">NO CREDIT CARD · DELHI NCR</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="app-footer-custom">
        <div className="footer-logo-row">
          <div className="footer-logo-icon">🚇</div>
          <span>Commutify © 2026</span>
        </div>
        <span className="footer-text-mono">DATA BASED ON PUBLIC DMRC NETWORK · NOT AFFILIATED WITH DMRC</span>
      </footer>

      {/* AI Assistant Chatbot widget */}
      <Chatbot isOpen={chatbotOpen} setIsOpen={setChatbotOpen} />

      {/* Authentication screen modal overlay split view */}
      {showAuthModal && (
        <div className="auth-overlay">
          <div className="auth-split-container">
            {/* Left dark panel */}
            <div className="auth-left-dark">
              <button className="btn-auth-back" onClick={() => setShowAuthModal(false)}>
                ← Back to home
              </button>
              
              <div className="auth-left-content">
                <span className="auth-badge-mono" style={{ color: 'var(--yellow-accent)' }}>★ COMMUTIFY CONSOLE</span>
                <h2 className="auth-left-title">
                  The Delhi Metro,<br />
                  <span className="serif-italic">at your</span> fingertips.
                </h2>
                <p className="auth-left-desc">
                  Sign in to save routes, track your trip history and let our AI plan the smartest commute for your day.
                </p>
              </div>

              <div className="auth-left-strip">
                {METRO_LINES.map((l, i) => (
                  <div key={i} style={{ flex: 1, background: l.color, height: '100%' }} />
                ))}
              </div>
            </div>

            {/* Right light panel */}
            <div className="auth-right-light">
              <span className="auth-badge-mono">⚙️ {authMode === 'signup' ? 'NEW COMMUTER' : 'RETURNING COMMUTER'}</span>
              <h2 className="auth-right-title">
                {authMode === 'signup' ? 'Create account' : 'Sign in'}
              </h2>

              <form className="auth-form" onSubmit={handleAuthSubmit}>
                {authMode === 'signup' && (
                  <div className="auth-field">
                    <label>Name</label>
                    <input 
                      type="text" 
                      placeholder="John Doe" 
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      required 
                    />
                  </div>
                )}
                
                <div className="auth-field">
                  <label>Email</label>
                  <input 
                    type="email" 
                    placeholder="john@example.com" 
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    required 
                  />
                </div>

                <div className="auth-field">
                  <label>Password</label>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    required 
                  />
                </div>

                <button type="submit" className="btn-auth-submit">
                  {authMode === 'signup' ? 'Create account' : 'Sign in'}
                </button>
              </form>

              <div className="auth-switch-link">
                {authMode === 'signup' ? (
                  <>
                    Already have an account? 
                    <button onClick={() => setAuthMode('login')}>Log in</button>
                  </>
                ) : (
                  <>
                    Don't have an account? 
                    <button onClick={() => setAuthMode('signup')}>Sign up</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
