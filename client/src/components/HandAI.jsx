import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera as CameraIcon, XCircle, Plus, Trash2 } from 'lucide-react';

const HAND_API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const PREDICT_INTERVAL_MS = 1000; // Faster interval for responsive auto-add
const SEND_SIZE = 224;            // Match model input size

const HandAI = ({ onBack }) => {
  const videoRef      = useRef(null);
  const overlayRef    = useRef(null); // visible canvas: video + skeleton
  const captureRef    = useRef(null); // hidden canvas: snapshot for API
  const cameraRef     = useRef(null); // MediaPipe Camera instance
  const intervalRef   = useRef(null);
  const isPredicting  = useRef(false);
  const handDetected  = useRef(false);
  const lastLandmarks = useRef(null);
  const currentGesture = useRef(null); // { letter, count, maxConfidence, imageSrc }

  const [result,        setResult]        = useState('–');
  const [displayResult, setDisplayResult] = useState('–');
  const [confidence,    setConfidence]    = useState(null);
  const [sentence,      setSentence]      = useState('');
  const [isReady,       setIsReady]       = useState(false);
  const [handPresent,   setHandPresent]   = useState(false);
  const [isLoading,     setIsLoading]     = useState(false);
  const [error,         setError]         = useState(null);
  const [mpReady,       setMpReady]       = useState(false);
  const [autoAdded,     setAutoAdded]     = useState(false); // flash indicator
  const [lastSnapshot,  setLastSnapshot]  = useState(null);  // { image: dataURL, letter: string }

  // ── Check MediaPipe is loaded ─────────────────────────────────────────────
  useEffect(() => {
    const check = setInterval(() => {
      if (window.Hands && window.Camera && window.drawConnectors) {
        setMpReady(true);
        clearInterval(check);
      }
    }, 100);
    return () => clearInterval(check);
  }, []);

  // ── Start MediaPipe hand tracking ─────────────────────────────────────────
  useEffect(() => {
    if (!mpReady) return;
    const video   = videoRef.current;
    const overlay = overlayRef.current;
    if (!video || !overlay) return;

    const { Hands, Camera, drawConnectors, drawLandmarks, HAND_CONNECTIONS } = window;

    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.5,
    });

    hands.onResults((results) => {
      const ctx = overlay.getContext('2d');
      overlay.width  = video.videoWidth  || 640;
      overlay.height = video.videoHeight || 480;

      // Draw video frame normally (no mirror)
      ctx.drawImage(results.image, 0, 0, overlay.width, overlay.height);

      const detected = !!(results.multiHandLandmarks && results.multiHandLandmarks.length > 0);
      handDetected.current = detected;
      setHandPresent(detected);

      if (detected) {
        lastLandmarks.current = results.multiHandLandmarks[0];
        for (const landmarks of results.multiHandLandmarks) {
          drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
            color: '#6366f1',
            lineWidth: 3,
          });
          drawLandmarks(ctx, landmarks, {
            color: '#ffffff',
            fillColor: '#6366f1',
            lineWidth: 1,
            radius: 5,
          });
        }
      }
    });

    const camera = new Camera(video, {
      onFrame: async () => {
        await hands.send({ image: video });
      },
      width: 640,
      height: 480,
    });

    camera.start().then(() => setIsReady(true));
    cameraRef.current = camera;

    return () => {
      camera.stop();
      hands.close();
    };
  }, [mpReady]);

  const commitGesture = useCallback((gesture) => {
    setSentence((s) => {
      if (gesture.letter === 'SPACE') return s + ' ';
      if (gesture.letter === 'DEL')   return s.slice(0, -1);
      return s + gesture.letter;
    });
    setAutoAdded(true);
    setTimeout(() => setAutoAdded(false), 600);
    
    if (gesture.imageSrc) {
      setLastSnapshot({
        image: gesture.imageSrc,
        letter: gesture.letter
      });
    }
  }, []);

  // ── Backend prediction ────────────────────────────────────────────────────
  const captureAndPredict = useCallback(async () => {
    if (isPredicting.current) return;
    const video   = videoRef.current;
    const canvas  = captureRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    // Only run prediction if a hand is visible
    if (!handDetected.current) {
      setResult('NOTHING');
      setDisplayResult('–');
      return;
    }

    const ctx = canvas.getContext('2d');
    canvas.width  = SEND_SIZE;
    canvas.height = SEND_SIZE;
    
    // Prevent aspect-ratio squishing and background noise by dynamically 
    // cropping the video to the hand's bounding box.
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    
    let sx = 0, sy = 0, sSize = Math.min(vw, vh);

    if (lastLandmarks.current) {
      let minX = 1, minY = 1, maxX = 0, maxY = 0;
      for (const lm of lastLandmarks.current) {
        if (lm.x < minX) minX = lm.x;
        if (lm.y < minY) minY = lm.y;
        if (lm.x > maxX) maxX = lm.x;
        if (lm.y > maxY) maxY = lm.y;
      }
      
      // Add 40% padding around the hand for context
      const w = maxX - minX;
      const h = maxY - minY;
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const size = Math.max(w, h) * 1.4; 
      
      const pixelCx = cx * vw;
      const pixelCy = cy * vh;
      const pixelSize = size * Math.max(vw, vh);
      
      sx = Math.max(0, pixelCx - pixelSize / 2);
      sy = Math.max(0, pixelCy - pixelSize / 2);
      sSize = Math.min(pixelSize, vw - sx, vh - sy);
    } else {
      // Fallback to center crop
      sx = (vw - sSize) / 2;
      sy = (vh - sSize) / 2;
    }
    
    ctx.drawImage(video, sx, sy, sSize, sSize, 0, 0, SEND_SIZE, SEND_SIZE);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      isPredicting.current = true;
      setIsLoading(true);
      try {
        const form = new FormData();
        form.append('file', blob, 'frame.jpg');
        const res = await fetch(`${HAND_API}/api/hand/predict`, {
          method: 'POST',
          body: form,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (data.error) {
          setError(data.error);
        } else {
          setError(null);
          let pred = data.prediction ?? 'NOTHING';
          const conf = data.confidence ?? null;
          
          if (conf !== null && conf < 60.0) {
            pred = 'NOTHING';
          }

          setResult(pred);
          setDisplayResult(
            pred === 'NOTHING' ? '–' :
            pred === 'SPACE'   ? '␣' :
            pred === 'DEL'     ? '⌫' : pred
          );
          setConfidence(data.confidence ?? null);

          // ── Gesture Tracking & Auto-Add Logic ───────────────────────
          const MIN_STABLE_FRAMES = 3; // Must be held for 3 seconds

          if (pred !== 'NOTHING' && pred !== '–') {
            if (currentGesture.current && currentGesture.current.letter === pred) {
              currentGesture.current.count += 1;
              if (conf > currentGesture.current.maxConfidence) {
                currentGesture.current.maxConfidence = conf;
                if (overlayRef.current) {
                  currentGesture.current.imageSrc = overlayRef.current.toDataURL('image/jpeg', 0.8);
                }
              }
            } else {
              // Sign changed. Commit the old one if it was held long enough
              if (currentGesture.current && currentGesture.current.count >= MIN_STABLE_FRAMES) {
                commitGesture(currentGesture.current);
              }
              // Start tracking the new sign
              currentGesture.current = {
                letter: pred,
                count: 1,
                maxConfidence: conf,
                imageSrc: overlayRef.current ? overlayRef.current.toDataURL('image/jpeg', 0.8) : null
              };
            }
          } else {
            // Nothing detected or under confidence. Commit old sign if valid.
            if (currentGesture.current && currentGesture.current.count >= MIN_STABLE_FRAMES) {
              commitGesture(currentGesture.current);
            }
            currentGesture.current = null;
          }
        }
      } catch (err) {
        setError('Prediction failed: ' + err.message);
      } finally {
        isPredicting.current = false;
        setIsLoading(false);
      }
    }, 'image/jpeg', 0.8);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    intervalRef.current = setInterval(captureAndPredict, PREDICT_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [isReady, captureAndPredict]);

  // ── Sentence builder actions ───────────────────────────────────────────────
  const handleAdd = () => {
    if (!result || result === '–' || result === 'NOTHING') return;
    if (result === 'SPACE')   setSentence((s) => s + ' ');
    else if (result === 'DEL') setSentence((s) => s.slice(0, -1));
    else                       setSentence((s) => s + result);
    
    if (overlayRef.current) {
      setLastSnapshot({
        image: overlayRef.current.toDataURL('image/jpeg', 0.8),
        letter: result
      });
    }
  };

  const chipColor = (r) =>
    r === 'NOTHING' ? { bg: 'rgba(107,114,128,0.2)', fg: '#9ca3af' } :
    r === 'SPACE'   ? { bg: 'rgba(99,102,241,0.2)',  fg: '#818cf8' } :
    r === 'DEL'     ? { bg: 'rgba(239,68,68,0.2)',   fg: '#f87171' } :
                      { bg: 'rgba(110,231,183,0.2)', fg: '#6ee7b7' };

  const chip = chipColor(result);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="hand-ai-container" style={{ animation: 'fadeIn 0.5s ease-out' }}>

      {/* Header */}
      <div className="hand-ai-header">
        <button className="back-button" onClick={onBack}>
          <XCircle size={24} />
          <span>Close Hand AI</span>
        </button>
        <div className="count-display">
          <span className="count-label">ASL Prediction</span>
          <h2 className="count-number">
            {isLoading ? '…' : displayResult}
          </h2>
          {result !== '–' && result !== 'NOTHING' && !isLoading && (
            <span style={{
              fontSize: '0.7rem', padding: '2px 10px',
              borderRadius: 999,
              background: chip.bg, color: chip.fg,
            }}>
              {result === 'SPACE' ? 'Space' : result === 'DEL' ? 'Delete' : `Letter ${result}`}
            </span>
          )}
          {confidence !== null && !isLoading && result !== 'NOTHING' && (
            <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>
              {confidence.toFixed(1)}% confidence
            </span>
          )}
        </div>
      </div>

      {/* Status bar */}
      {error && (
        <div style={{
          textAlign: 'center', fontSize: '0.75rem', padding: '0.3rem 1rem',
          color: '#f87171', background: 'rgba(239,68,68,0.1)',
        }}>
          {error}
        </div>
      )}

      {/* Camera + skeleton overlay */}
      <div className="camera-wrapper" style={{ position: 'relative' }}>
        {/* Hidden raw video — fed to MediaPipe */}
        <video ref={videoRef} style={{ display: 'none' }} />

        {/* Visible overlay canvas with hand skeleton */}
        <canvas
          ref={overlayRef}
          width={640}
          height={480}
          className="hand-canvas"
          style={{ display: 'block' }}
        />

        {/* Hidden capture canvas for API snapshots */}
        <canvas ref={captureRef} style={{ display: 'none' }} />

        {!isReady && (
          <div className="camera-loading">
            <CameraIcon className="animate-pulse" size={48} />
            <p>{mpReady ? 'Starting camera…' : 'Loading MediaPipe…'}</p>
          </div>
        )}

        {/* Hand presence indicator */}
        {isReady && (
          <div style={{
            position: 'absolute', top: 10, left: 10,
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(0,0,0,0.55)', borderRadius: 999,
            padding: '3px 10px', fontSize: '0.72rem', color: '#fff',
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: handPresent ? '#6ee7b7' : '#f87171',
              display: 'inline-block',
              boxShadow: handPresent ? '0 0 6px #6ee7b7' : 'none',
            }} />
            {handPresent ? 'Hand detected' : 'No hand detected'}
          </div>
        )}

        {/* Scanning badge */}
        {isReady && isLoading && (
          <div style={{
            position: 'absolute', top: 10, right: 10,
            background: 'rgba(99,102,241,0.85)',
            color: '#fff', fontSize: '0.7rem',
            padding: '3px 10px', borderRadius: 999,
          }}>
            Scanning…
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="hand-instructions">
        <p>Show an ASL sign — hand skeleton tracks in real time, prediction updates every 1s.</p>
      </div>

      {/* Sentence builder */}
      <div className="asl-sentence-builder">
        <h3 className="builder-title">ASL Sentence Builder</h3>
        <div className="sentence-box" style={{
          transition: 'box-shadow 0.2s, border-color 0.2s',
          boxShadow: autoAdded ? '0 0 0 2px #6ee7b7' : undefined,
          borderColor: autoAdded ? '#6ee7b7' : undefined,
        }}>
          {sentence || (
            <span className="placeholder">
              Hold a sign steady, then drop your hand to add it...
            </span>
          )}
        </div>
        <div className="sentence-controls">
          <button
            className="control-btn add"
            onClick={handleAdd}
            disabled={!result || result === '–' || result === 'NOTHING'}
          >
            <Plus size={16} />
            {result === 'SPACE' ? 'Add Space' : result === 'DEL' ? 'Delete Last' : `Add "${displayResult}"`}
          </button>
          <button className="control-btn space" onClick={() => setSentence((s) => s + ' ')}>
            ␣ Space
          </button>
          <button className="control-btn clear" onClick={() => setSentence('')}>
            <Trash2 size={16} />
            Clear
          </button>
        </div>
      </div>

      {/* Snapshot Display */}
      {lastSnapshot && (
        <div className="snapshot-container" style={{ marginTop: '1rem', textAlign: 'center' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#cbd5e1' }}>Last Captured Sign</h4>
          <div style={{ position: 'relative', display: 'inline-block', borderRadius: '8px', overflow: 'hidden', border: '2px solid #6366f1' }}>
            <img src={lastSnapshot.image} alt="Captured Sign" style={{ width: '200px', display: 'block' }} />
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'rgba(0,0,0,0.7)', color: '#6ee7b7',
              padding: '4px', fontWeight: 'bold', fontSize: '1.2rem'
            }}>
              {lastSnapshot.letter === 'SPACE' ? 'Space' : lastSnapshot.letter === 'DEL' ? 'Delete' : lastSnapshot.letter}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HandAI;
