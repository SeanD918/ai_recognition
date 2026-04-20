import React, { useState, useRef, useEffect } from 'react';
import { Upload, Loader2, Sparkles, AlertCircle, RefreshCw, Cpu } from 'lucide-react';
import './App.css';

function App() {
  const [imageSrc, setImageSrc] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  
  const imageRef = useRef();

  // Handle uploading the image from device
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

  // Called when the image successfully renders on screen
  const handleImageLoad = async () => {
    setIsAnalyzing(true);
    setResults(null);
    
    try {
      const img = imageRef.current;
      
      // TODO: Add your Custom AI Model logic here!
      // Example: const predictions = await myCustomModel.predict(img);
      
      // Simulating a scanning delay for effect before showing results
      setTimeout(() => {
        setResults({
          message: 'Ready for Custom AI Model! Replace this block in App.jsx with your TensorFlow.js logic.',
          // gender: 'female',
          // age: 24
        });
        setIsAnalyzing(false);
      }, 1500);

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

      {!imageSrc && (
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
                 <p>Scanning in progress...</p>
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
                    <span className="label">System Status</span>
                    <h2 className="gender" style={{fontSize: '1.2rem', margin: '15px 0', color: '#f8fafc', textShadow: 'none', background: 'none', webkitTextFillColor: 'initial'}}>
                       <Cpu size={24} style={{ marginRight: '8px', verticalAlign: 'middle', color: '#6366f1' }}/>
                       Awaiting Custom Code
                    </h2>
                    <p style={{fontSize: '0.9rem', color: '#94a3b8', lineHeight: '1.5'}}>{results.message}</p>
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
