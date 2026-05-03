import React, { useState, useRef, useEffect } from 'react';
import { Upload, Loader2, Sparkles, AlertCircle, RefreshCw, BrainCircuit, Leaf, Hand, Settings, Lock } from 'lucide-react';
import HandAI from './components/HandAI';
import './App.css';

const STATUS_LABELS = { gender: 'Gender AI', animal: 'Animal AI', flower: 'Flower AI', hand: 'Hand AI' };

function App() {
  const [imageSrc,    setImageSrc]    = useState(null);
  const [imageFile,   setImageFile]   = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results,     setResults]     = useState(null);
  const [modelType,   setModelType]   = useState('gender');
  const [modelStatus, setModelStatus] = useState({ animal:'checking', gender:'checking', flower:'checking', hand:'checking' });
  const abortControllerRef = useRef(null);

  /* ── API Health Check ───────────────────────────────────────── */
  useEffect(() => {
    async function checkHealth() {
      const isProd = import.meta.env.PROD;
      const USE_GATEWAY  = import.meta.env.VITE_USE_GATEWAY ? import.meta.env.VITE_USE_GATEWAY === 'true' : isProd;
      const GATEWAY_URL  = (import.meta.env.VITE_GATEWAY_URL  || (isProd ? 'https://ai-recognition-gateway.onrender.com' : 'http://localhost:3000')).replace(/\/$/, '');
      const GENDER_API   = (import.meta.env.VITE_GENDER_API_URL || (isProd ? 'https://gender-ai-backend.onrender.com' : 'http://localhost:8000')).replace(/\/$/, '');
      const ANIMAL_API   = (import.meta.env.VITE_ANIMAL_API_URL || (isProd ? 'https://animal-ai-backend.onrender.com' : 'http://localhost:8001')).replace(/\/$/, '');
      const FLOWER_API   = (import.meta.env.VITE_FLOWER_API_URL || (isProd ? 'https://flower-ai-backend.onrender.com' : 'http://localhost:8002')).replace(/\/$/, '');
      const HAND_API     = (import.meta.env.VITE_HAND_API_URL   || (isProd ? 'https://hand-ai-backend.onrender.com' : 'http://localhost:8003')).replace(/\/$/, '');
      try {
        if (USE_GATEWAY) {
          const res = await fetch(`${GATEWAY_URL}/`, { method:'GET' });
          if (res.ok) { const d = await res.json(); if (d?.services) setModelStatus(d.services); }
        } else {
          const check = async (url, key) => {
            try { const r = await fetch(`${url}/`); if (r.ok) setModelStatus(p => ({ ...p, [key]:'online' })); else setModelStatus(p => ({ ...p, [key]:'offline' })); }
            catch { setModelStatus(p => ({ ...p, [key]:'offline' })); }
          };
          await Promise.all([check(GENDER_API,'gender'), check(ANIMAL_API,'animal'), check(FLOWER_API,'flower'), check(HAND_API,'hand')]);
        }
      } catch { setModelStatus({ gender:'offline', animal:'offline', flower:'offline', hand:'offline' }); }
    }
    
    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  /* ── Upload ─────────────────────────────────────────────────── */
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (imageSrc) URL.revokeObjectURL(imageSrc);
      setResults(null);
      setImageFile(file);
      setImageSrc(URL.createObjectURL(file));
    }
  };

  /* ── Analyse ────────────────────────────────────────────────── */
  const performAnalysis = async (file) => {
    if (isAnalyzing) return;
    abortControllerRef.current?.abort();
    setIsAnalyzing(true); setResults(null);
    try {
      const isProd = import.meta.env.PROD;
      const USE_GATEWAY  = import.meta.env.VITE_USE_GATEWAY ? import.meta.env.VITE_USE_GATEWAY === 'true' : isProd;
      const GATEWAY_URL  = (import.meta.env.VITE_GATEWAY_URL  || (isProd ? 'https://ai-recognition-gateway.onrender.com' : 'http://localhost:3000')).replace(/\/$/, '');
      const GENDER_API   = (import.meta.env.VITE_GENDER_API_URL || (isProd ? 'https://gender-ai-backend.onrender.com' : 'http://localhost:8000')).replace(/\/$/, '');
      const ANIMAL_API   = (import.meta.env.VITE_ANIMAL_API_URL || (isProd ? 'https://animal-ai-backend.onrender.com' : 'http://localhost:8001')).replace(/\/$/, '');
      const FLOWER_API   = (import.meta.env.VITE_FLOWER_API_URL || (isProd ? 'https://flower-ai-backend.onrender.com' : 'http://localhost:8002')).replace(/\/$/, '');
      const HAND_API     = (import.meta.env.VITE_HAND_API_URL   || (isProd ? 'https://hand-ai-backend.onrender.com' : 'http://localhost:8003')).replace(/\/$/, '');

      let apiUrl = USE_GATEWAY
        ? `${GATEWAY_URL}/api/${modelType}`
        : { gender: GENDER_API, animal: ANIMAL_API, flower: FLOWER_API, hand: HAND_API }[modelType];

      const formData = new FormData();
      formData.append('file', file, 'input.jpg');
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const tid = setTimeout(() => controller.abort('timeout'), 90000);

      const response = await fetch(`${apiUrl}/predict`, { method:'POST', body:formData, signal:controller.signal });
      clearTimeout(tid);
      if (!response.ok) throw new Error(`Server ${response.status}`);
      const data = await response.json();
      if (data.error) { setResults({ error: `Server Error: ${data.error}` }); setIsAnalyzing(false); return; }

      const pred = data.prediction || '';
      if (pred === 'Not a human' || pred.startsWith('Not an animal') || pred.includes('Human detected')) {
        setResults({ error: pred });
      } else {
        setResults({ prediction: pred, confidence: data.confidence,
          message: { gender:'ResNet18 + PyTorch Backend', animal:'Keras / PyTorch Backend', flower:'EfficientNet Backbone', hand:'MobileNetV2 ASL Model' }[modelType] });
      }
    } catch (err) {
      const isTimeout = err.name === 'AbortError' || err === 'timeout';
      setResults({ error: isTimeout ? 'Cold start – please wait a moment and try again.' : `Analysis failed: ${err.message}` });
    }
    setIsAnalyzing(false);
  };

  const reset = () => {
    abortControllerRef.current?.abort();
    setImageSrc(null); setImageFile(null); setResults(null); setIsAnalyzing(false);
  };

  const MODELS = [
    { key:'gender', label:'Gender AI', icon:<Sparkles size={32}/> },
    { key:'animal', label:'Animal AI', icon:<BrainCircuit size={32}/> },
    { key:'flower', label:'Flower AI', icon:<Leaf size={32}/> },
    { key:'hand',   label:'Hand AI',   icon:<Hand size={32}/> },
  ];

  const onlineCount = Object.values(modelStatus).filter(s => s === 'online').length;

  return (
    <div className="app-shell">

      {/* ── Fixed Navbar ─────────────────────────────────────── */}
      <nav className="top-nav">
        <div className="nav-brand">AuraSense</div>
        <div className="nav-links">
          {MODELS.map(m => (
            <button
              key={m.key}
              className={`nav-link${modelType === m.key ? ' active' : ''}`}
              onClick={() => { setModelType(m.key); reset(); }}
            >
              <span className={`nav-dot ${modelStatus[m.key]}`} />
              {m.label}
            </button>
          ))}
        </div>
        <div className="nav-right">
          <Settings size={18} className="nav-icon" />
          <div className="nav-avatar">{onlineCount}<span>/4</span></div>
        </div>
      </nav>

      {/* ── Main ─────────────────────────────────────────────── */}
      <main className="main-shell">
        {modelType === 'hand' ? (
          <HandAI onBack={() => { setModelType('gender'); reset(); }} />
        ) : (
          <div className="hero-layout">

            {/* Badge + heading */}
            <header className="hero-header">
              <div className="privacy-badge">
                <Lock size={10} />
                <span>Private Neural Instance</span>
              </div>
              <h1 className="hero-title">
                Initialize <span className="hero-accent">
                  { modelType === 'gender' ? 'Scan' : modelType === 'animal' ? 'Animal' : modelType === 'flower' ? 'Flower' : 'Hand' }
                </span>
              </h1>
              <p className="hero-sub">
                Secure biometric processing. Your data is processed locally and never stored.
              </p>
            </header>

            {/* 3-column grid */}
            <div className="hero-grid">

              {/* Left: Requirements */}
              <aside className="hero-aside left">
                <p className="aside-label">Integrity</p>
                <ul className="aside-list">
                  <li><span className="aside-dot active" />Optimal Lighting</li>
                  <li><span className="aside-dot active" />Sharp Focus</li>
                  <li><span className="aside-dot" />Full Edge Detection</li>
                </ul>
              </aside>

              {/* Center: Upload card */}
              <div className="upload-card glass">
                <div className="upload-card-scan" />

                {!imageSrc && (
                  <>
                    <input type="file" id="file-upload" accept="image/*" className="file-input" onChange={handleImageUpload} />
                    <label htmlFor="file-upload" className="upload-zone">
                      <div className="upload-icon-wrap">
                        <Upload size={28} />
                      </div>
                      <span className="upload-title">Secure Upload</span>
                      <span className="upload-hint">
                        Drag & drop or click to select a{' '}
                        {modelType === 'gender' ? 'face photo' : modelType === 'animal' ? 'photo of an animal' : 'flower photo'}
                      </span>
                      <div className="upload-actions">
                        <span className="btn-primary-sm">Select File</span>
                        <span className="btn-ghost-sm">PNG / JPG</span>
                      </div>
                    </label>
                  </>
                )}

                {imageSrc && (
                  <div className="analysis-view">
                    <div className="image-wrapper">
                      <img src={imageSrc} alt="Analysis target" className="uploaded-image" onLoad={() => performAnalysis(imageFile)} />
                      {isAnalyzing && (
                        <div className="scanning-overlay">
                          <div className="scanner-line" />
                          <Loader2 size={32} className="spinner" />
                          <p>Processing via Neural Network…</p>
                        </div>
                      )}
                    </div>

                    {!isAnalyzing && results && (
                      <div className={`results-card ${results.error ? 'error' : ''}`}>
                        {results.error ? (
                          <>
                            <AlertCircle size={28} style={{ flexShrink:0 }} />
                            <p>{results.error}</p>
                          </>
                        ) : (
                          <>
                            <div className="result-main">
                              <span className="label">Recognition Result</span>
                              <h2 className={`prediction ${results.prediction?.toLowerCase()}`}>
                                {results.prediction?.charAt(0).toUpperCase() + results.prediction?.slice(1)}
                              </h2>
                            </div>
                            <div className="confidence-container">
                              <div className="confidence-header">
                                <span>Model Confidence</span>
                                <span>{results.confidence}%</span>
                              </div>
                              <div className="confidence-bar-bg">
                                <div
                                  className={`confidence-bar-fill ${results.confidence > 80 ? 'high' : results.confidence > 50 ? 'medium' : 'low'}`}
                                  style={{ width:`${results.confidence}%` }}
                                />
                              </div>
                            </div>
                            <p className="result-message">{results.message}</p>
                            <div className="result-footer">
                              <div className="info-badge"><BrainCircuit size={13}/><span>Neural Net</span></div>
                              <div className="info-badge"><Sparkles size={13}/><span>AI Augmented</span></div>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    <button className="reset-button" onClick={reset}>
                      <RefreshCw size={16}/><span>Try Another</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Right: Neural State */}
              <aside className="hero-aside right">
                <p className="aside-label cyan">Neural State</p>
                {Object.entries(modelStatus).map(([key, status]) => (
                  <div className="neural-item" key={key}>
                    <div className="neural-row">
                      <span className="neural-name">{STATUS_LABELS[key]}</span>
                      <span className={`neural-status ${status}`}>{status}</span>
                    </div>
                    <div className="neural-track">
                      <div className={`neural-fill ${status}`} />
                    </div>
                  </div>
                ))}
                <p className="aside-note">Optimized for biometric standards.</p>
              </aside>
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="app-footer">
        <span>AES-256 Enabled</span>
        <div className="footer-links">
          <a href="#">Privacy Policy</a>
          <a href="#">Support</a>
        </div>
      </footer>
    </div>
  );
}

export default App;
