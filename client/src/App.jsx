import React, { useState, useRef, useEffect } from 'react';
import { Upload, Loader2, Sparkles, AlertCircle, RefreshCw, BrainCircuit } from 'lucide-react';
import * as tf from '@tensorflow/tfjs';
import './App.css';

function App() {
  const [imageSrc, setImageSrc] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [modelType, setModelType] = useState('gender'); // 'gender' or 'animal'
  const [animalModel, setAnimalModel] = useState(null);
  const [animalClasses, setAnimalClasses] = useState([]);
  const [modelStatus, setModelStatus] = useState({
    animal: 'loading', // 'loading', 'ready', 'error'
    gender: 'checking' // 'checking', 'online', 'offline'
  });
  const abortControllerRef = useRef(null);

  // Load & Check APIs
  useEffect(() => {
    async function init() {
      const USE_GATEWAY = import.meta.env.VITE_USE_GATEWAY === 'true';
      const GATEWAY_URL = (import.meta.env.VITE_GATEWAY_URL || 'http://localhost:3000').replace(/\/$/, "");
      const GENDER_API = (import.meta.env.VITE_GENDER_API_URL || 'http://localhost:8000').replace(/\/$/, "");
      const ANIMAL_API = (import.meta.env.VITE_ANIMAL_API_URL || 'http://localhost:8001').replace(/\/$/, "");

      try {
        if (USE_GATEWAY) {
          const res = await fetch(`${GATEWAY_URL}/`, { method: 'GET' });
          if (res.ok) setModelStatus({ gender: 'online', animal: 'online' });
        } else {
          // Check individual APIs
          const gRes = await fetch(`${GENDER_API}/`, { method: 'GET' });
          if (gRes.ok) setModelStatus(prev => ({ ...prev, gender: 'online' }));
          
          const aRes = await fetch(`${ANIMAL_API}/`, { method: 'GET' });
          if (aRes.ok) setModelStatus(prev => ({ ...prev, animal: 'online' }));
        }
      } catch (err) {
        console.warn('API Check Failed:', err);
        setModelStatus({ gender: 'offline', animal: 'offline' });
      }
    }
    init();
  }, []);

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

  // 2. The AI Prediction Logic
  const performAnalysis = async (imageFile) => {
    if (isAnalyzing) return;
    
    // Abort any existing analysis
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setIsAnalyzing(true);
    setResults(null);

    try {
      const isAnimalFallback = modelType === 'animal';
      
      // 1. Resize Image on Client (Better for Render Free Tier)
        const resizedImage = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = () => reject(new Error("Failed to read image file"));
          reader.readAsDataURL(imageFile);
          reader.onload = (e) => {
            const img = new Image();
            img.onerror = () => reject(new Error("Failed to load image into memory"));
            img.src = e.target.result;
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = 224;
              canvas.height = 224;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, 224, 224);
              canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error("Failed to create image blob"));
              }, 'image/jpeg', 0.8);
            };
          };
        });

        const formData = new FormData();
        formData.append('file', resizedImage, 'input.jpg');

        // Target URLs: Support independent endpoints for production
        const USE_GATEWAY = import.meta.env.VITE_USE_GATEWAY === 'true';
        const GATEWAY_URL = (import.meta.env.VITE_GATEWAY_URL || 'http://localhost:3000').replace(/\/$/, "");
        const GENDER_API = (import.meta.env.VITE_GENDER_API_URL || 'http://localhost:8000').replace(/\/$/, "");
        const ANIMAL_API = (import.meta.env.VITE_ANIMAL_API_URL || 'http://localhost:8001').replace(/\/$/, "");
        
        let apiUrl = "";
        if (USE_GATEWAY) {
          apiUrl = isAnimalFallback ? `${GATEWAY_URL}/api/animal` : `${GATEWAY_URL}/api/gender`;
        } else {
          apiUrl = isAnimalFallback ? ANIMAL_API : GENDER_API;
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;
        const timeoutId = setTimeout(() => controller.abort('timeout'), 90000);

        const response = await fetch(`${apiUrl}/predict`, {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Server Error: ${response.status}. ${errorText}`);
        }

        const data = await response.json();

        if (data.prediction === 'Not a human') {
          setResults({ 
            error: 'No human face detected! The Gender AI only processes pictures of people. Please try again with a clear face photo.' 
          });
        } else if (data.prediction.startsWith('Not an animal')) {
          setResults({ 
            error: 'No animal detected! This model is specifically designed for animal recognition. Please upload a clear photo of an animal.' 
          });
        } else if (data.prediction.includes('Human detected')) {
          setResults({ error: data.prediction });
        } else {
          setResults({
            prediction: data.prediction,
            confidence: data.confidence, 
            message: isAnimalFallback 
              ? 'Analyzed using Keras / PyTorch Backend' 
              : 'Analyzed using PyTorch + ResNet18 (Gender)'
          });
        }
      setIsAnalyzing(false);
    } catch (err) {
      console.error('Analysis Error:', err);
      const isTimeout = err.name === 'AbortError' || err === 'timeout' || (err.reason === 'timeout');
      const message = isTimeout
        ? 'AI is taking too long to wake up. This usually happens during a "cold start". Please wait a few seconds and try again!'
        : `Analysis Failed: ${err.message}`;
      
      setResults({ error: message });
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setImageSrc(null);
    setImageFile(null);
    setResults(null);
    setIsAnalyzing(false);
  };

  return (
    <div className="container">
      <header className="header">
        <BrainCircuit className="logo-icon" size={32} />
        <h1>AuraSense</h1>
        <p>Private AI Recognition Suite</p>
        
        <div className="model-grid">
          <div 
            className={`model-card ${modelType === 'gender' ? 'active' : ''}`}
            onClick={() => { setModelType('gender'); reset(); }}
          >
            <div className="card-icon">
              <Sparkles size={40} />
            </div>
            <div className="card-info">
              <h3>Gender AI</h3>
            </div>
          </div>

          <div 
            className={`model-card ${modelType === 'animal' ? 'active' : ''}`}
            onClick={() => { setModelType('animal'); reset(); }}
          >
            <div className="card-icon">
              <BrainCircuit size={40} />
            </div>
            <div className="card-info">
              <h3>Animal AI</h3>
            </div>
          </div>
        </div>

        <div className="status-bar">
          <div className={`status-item ${modelStatus.gender}`}>
            <span className="dot"></span>
            Gender AI: {modelStatus.gender.toUpperCase()}
          </div>
          <div className={`status-item ${modelStatus.animal}`}>
            <span className="dot"></span>
            Animal AI: {modelStatus.animal.toUpperCase()}
          </div>
        </div>
      </header>

      <div className="main-content">
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
              <span className="upload-text">Upload {modelType === 'gender' ? 'a Face' : 'an Animal'}</span>
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
                onLoad={() => performAnalysis(imageFile)}
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
                      <h2 className={`prediction ${results.prediction}`}>
                        {results.prediction.charAt(0).toUpperCase() + results.prediction.slice(1)}
                      </h2>
                      <div className="confidence-container">
                        <div className="confidence-header">
                          <span>Model Confidence</span>
                          <span>{results.confidence}%</span>
                        </div>
                        <div className="confidence-bar-bg">
                          <div 
                            className={`confidence-bar-fill ${results.confidence > 80 ? 'high' : results.confidence > 50 ? 'medium' : 'low'}`}
                            style={{ width: `${results.confidence}%` }}
                          ></div>
                        </div>
                      </div>
                      <p className="result-message">{results.message}</p>
                    </div>
                    <div className="result-footer">
                      <div className="info-badge">
                        <BrainCircuit size={14} />
                        <span>ResNet18 / EfficientNet</span>
                      </div>
                      <div className="info-badge">
                        <Sparkles size={14} />
                        <span>AI Augmented</span>
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
