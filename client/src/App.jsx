import React, { useState, useRef, useEffect } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { Upload, Loader2, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import './App.css';

// Using jsdelivr to access the model weights directly from the @vladmandic/face-api package
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

function App() {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [modelError, setModelError] = useState('');
  const [imageSrc, setImageSrc] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  
  const imageRef = useRef();

  useEffect(() => {
    const loadModels = async () => {
      try {
        console.log('Loading AI models from:', MODEL_URL);
        
        // Ensure a valid target backend is initialized before loading models.
        // It tries WebGL first, then strictly falls back to CPU to prevent WASM file loading errors.
        try {
          await faceapi.tf.setBackend('webgl');
          await faceapi.tf.ready();
        } catch (e) {
          console.warn('WebGL is not supported. Falling back to CPU processing...');
          await faceapi.tf.setBackend('cpu');
          await faceapi.tf.ready();
        }

        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL)
        ]);
        console.log('Models loaded successfully');
        setIsModelLoaded(true);
      } catch (err) {
        console.error('Error loading AI models:', err);
        setModelError('Failed to load Neural Networks. Please check your internet connection or ad-blocker.');
      }
    };
    loadModels();
  }, []);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc);
      }
      setResults(null);
      const url = URL.createObjectURL(file);
      setImageSrc(url);
    }
  };

  const handleImageLoad = async () => {
    if (!isModelLoaded) return;
    setIsAnalyzing(true);
    setResults(null);
    
    try {
      const img = imageRef.current;
      
      // We use tinyFaceDetector for faster processing
      const detections = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
                                      .withAgeAndGender();
      
      if (detections) {
        // Add a slight delay to make the scanning animation visible (looks cooler!)
        setTimeout(() => {
          setResults({
            gender: detections.gender, // 'male' or 'female'
            genderProbability: detections.genderProbability,
            age: detections.age
          });
          setIsAnalyzing(false);
        }, 1500);
      } else {
        setTimeout(() => {
          setResults({ error: 'No face detected. Please ensure a face is clearly visible.' });
          setIsAnalyzing(false);
        }, 1000);
      }
    } catch (err) {
      console.error(err);
      setResults({ error: 'An error occurred during facial analysis.' });
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setImageSrc(null);
    setResults(null);
  };

  return (
    <div className="container">
      <header className="header">
        <Sparkles className="logo-icon" size={32} />
        <h1>AuraSense</h1>
        <p>Advanced AI Gender Classification</p>
      </header>

      {!isModelLoaded && !modelError && (
        <div className="loading-state">
          <Loader2 className="spinner" size={48} />
          <p>Initializing Neural Networks...</p>
        </div>
      )}

      {modelError && (
        <div className="error-state">
          <AlertCircle size={48} />
          <p>{modelError}</p>
        </div>
      )}

      {isModelLoaded && !imageSrc && (
        <div className="upload-container">
          <input
            type="file"
            id="file-upload"
            accept="image/*"
            className="file-input"
            onChange={handleImageUpload}
          />
          <label htmlFor="file-upload" className="upload-label">
            <Upload size={48} className="upload-icon" />
            <span className="upload-text">Upload a Photo</span>
            <span className="upload-subtext">or click to browse from your device</span>
          </label>
        </div>
      )}

      {imageSrc && (
        <div className="analysis-container">
          <div className="image-wrapper">
             <img 
               ref={imageRef} 
               src={imageSrc} 
               alt="Uploaded representation" 
               className="uploaded-image" 
               onLoad={handleImageLoad}
               crossOrigin="anonymous"
             />
             {isAnalyzing && (
               <div className="scanning-overlay">
                 <div className="scanner-line"></div>
                 <p>Analyzing facial features...</p>
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
                    <span className="label">AI Prediction</span>
                    <h2 className={`gender ${results.gender}`}>
                       {results.gender === 'male' ? 'Male' : 'Female'}
                    </h2>
                  </div>
                  <div className="result-stats">
                    <div className="stat-box">
                      <span className="stat-label">Confidence</span>
                      <span className="stat-value">{(results.genderProbability * 100).toFixed(1)}%</span>
                    </div>
                    <div className="stat-box">
                      <span className="stat-label">Est. Age</span>
                      <span className="stat-value">{Math.round(results.age)}</span>
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
  );
}

export default App;
