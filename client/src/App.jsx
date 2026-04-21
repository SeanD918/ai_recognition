import React, { useState, useRef, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import { Upload, Loader2, Sparkles, AlertCircle, RefreshCw, BrainCircuit } from 'lucide-react';
import './App.css';

function App() {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [modelError, setModelError] = useState('');
  const [imageSrc, setImageSrc] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  
  const imageRef = useRef();
  const modelRef = useRef();

  // 1. Load your CUSTOM trained AI brain
  useEffect(() => {
    const loadCustomModel = async () => {
      try {
        console.log('Loading Custom CelebA Neural Network...');
        // Standard Vite way to reference the public folder
        const modelPath = `${window.location.origin}/models/model.json`;
        const model = await tf.loadLayersModel(modelPath);
        modelRef.current = model;
        console.log('Custom Model Ready!');
        setIsModelLoaded(true);
      } catch (err) {
        console.error('Error loading custom model:', err);
        setModelError(`Debug Error: ${err.message || String(err)}`);
      }
    };
    loadCustomModel();
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

  // 2. The AI Prediction Logic
  const handleImageLoad = async () => {
    if (!isModelLoaded || !modelRef.current) return;
    setIsAnalyzing(true);
    setResults(null);
    
    try {
      const img = imageRef.current;
      const model = modelRef.current;

      // Wrap in tf.tidy to prevent memory leaks in the browser
      const predictionData = tf.tidy(() => {
        // A. Convert image to math Tensors
        let tensor = tf.browser.fromPixels(img);
        
        // B. Resize to 64x64 (Exactly what we used in Colab!)
        tensor = tf.image.resizeBilinear(tensor, [64, 64]);
        
        // C. Normalize (0-255 to 0.0-1.0) and Expand Dims for the model
        tensor = tensor.div(255.0).expandDims(0);
        
        // D. Predict!
        return model.predict(tensor);
      });

      const probability = predictionData.dataSync()[0];
      predictionData.dispose(); // Manual cleanup for the result

      // From your CelebA Colab script: 0 = Male, 1 = Female
      const gender = probability > 0.5 ? 'female' : 'male';
      const confidence = gender === 'female' ? probability : (1 - probability);

      // Animation delay for the "Wow" effect
      setTimeout(() => {
        setResults({
          gender: gender,
          confidence: (confidence * 100).toFixed(1),
          message: 'Analyzed using YOUR Custom CelebA Model'
        });
        setIsAnalyzing(false);
      }, 1500);

    } catch (err) {
      console.error(err);
      setResults({ error: 'Failed to process image with the custom model.' });
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
        <BrainCircuit className="logo-icon" size={32} />
        <h1>AuraSense Custom</h1>
        <p>Private AI Gender Classification</p>
      </header>

      {!isModelLoaded && !modelError && (
        <div className="loading-state">
          <Loader2 className="spinner" size={48} />
          <p>Waking up your Neural Network...</p>
        </div>
      )}

      {modelError && (
        <div className="error-state">
          <AlertCircle size={48} />
          <p>{modelError}</p>
        </div>
      )}

      {isModelLoaded && !imageSrc && (
        <div className="upload-container" style={{animation: 'fadeIn 0.5s ease-out'}}>
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
            <span className="upload-subtext">AI will use your CelebA Brain profile</span>
          </label>
        </div>
      )}

      {imageSrc && (
        <div className="analysis-container">
          <div className="image-wrapper">
             <img 
               ref={imageRef} 
               src={imageSrc} 
               alt="Analysis Target" 
               className="uploaded-image" 
               onLoad={handleImageLoad}
               crossOrigin="anonymous"
             />
             {isAnalyzing && (
               <div className="scanning-overlay">
                 <div className="scanner-line"></div>
                 <p>Deploying Custom Neural Network...</p>
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
                    <span className="label">Custom Prediction</span>
                    <h2 className={`gender ${results.gender}`}>
                       {results.gender === 'male' ? 'Male' : 'Female'}
                    </h2>
                    <p style={{fontSize: '0.8rem', color: '#94a3b8', marginTop: '10px'}}>{results.message}</p>
                  </div>
                  <div className="result-stats">
                    <div className="stat-box" style={{width: '100%', gridColumn: 'span 2'}}>
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
  );
}

export default App;
