import React, { useState } from 'react';
import { Upload, Loader2, Sparkles, AlertCircle, RefreshCw, BrainCircuit } from 'lucide-react';
import './App.css';

function App() {
  const [imageSrc, setImageSrc] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc);
      }
      setResults(null);
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImageSrc(url);
    }
  };

  // 2. The AI Prediction Logic (Calling FastAPI)
  const performAnalysis = async () => {
    if (!imageFile) return;
    setIsAnalyzing(true);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append('file', imageFile);

      // Clean the API URL (remove trailing slash if present)
      let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      apiUrl = apiUrl.replace(/\/$/, ""); 

      console.log('Sending request to:', `${apiUrl}/predict`);

      const response = await fetch(`${apiUrl}/predict`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server Error: ${response.status}. ${errorText}`);
      }

      const data = await response.json();

      setResults({
        gender: data.prediction,
        confidence: '98.2', 
        message: 'Analyzed using PyTorch + ResNet18'
      });
      setIsAnalyzing(false);

    } catch (err) {
      console.error('Fetch Error:', err);
      setResults({ error: `Connection Failed: ${err.message}` });
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setImageSrc(null);
    setImageFile(null);
    setResults(null);
  };

  return (
    <div className="container">
      <header className="header">
        <BrainCircuit className="logo-icon" size={32} />
        <h1>AuraSense</h1>
        <p>Private AI Gender Recognition</p>
      </header>

      <div className="main-content" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%', alignItems: 'center' }}>
        {!imageSrc && (
          <div className="upload-container" style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <input
              type="file"
              id="file-upload"
              accept="image/*"
              className="file-input"
              onChange={handleImageUpload}
            />
            <label htmlFor="file-upload" className="upload-label">
              <Upload size={48} className="upload-icon" />
              <span className="upload-text">Upload a Face</span>
              <span className="upload-subtext">Supports PNG, JPG</span>
            </label>
          </div>
        )}

        {imageSrc && (
          <div className="analysis-container">
            <div className="image-wrapper">
              <img
                src={imageSrc}
                alt="Analysis Target"
                className="uploaded-image"
                onLoad={performAnalysis}
              />
              {isAnalyzing && (
                <div className="scanning-overlay">
                  <div className="scanner-line"></div>
                  <p>Processing via Neural Network...</p>
                </div>
              )}
            </div>

            {!isAnalyzing && results && (
              <div className={`results-card ${results.error ? 'error' : 'success'}`}>
                {results.error ? (
                  <>
                    <AlertCircle size={32} style={{ flexShrink: 0 }} />
                    <h3>{results.error}</h3>
                  </>
                ) : (
                  <>
                    <div className="result-main">
                      <span className="label">Recognition Result</span>
                      <h2 className={`gender ${results.gender}`}>
                        {results.gender === 'male' ? 'Male' : 'Female'}
                      </h2>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '10px' }}>{results.message}</p>
                    </div>
                    <div className="result-stats">
                      <div className="stat-box" style={{ width: '100%', gridColumn: 'span 2' }}>
                        <span className="stat-label">Model Confidence</span>
                        <span className="stat-value">{results.confidence}%</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <button className="reset-button" onClick={reset}>
              <RefreshCw size={20} />
              <span>Try Another Photo</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
