import React, { useRef, useEffect, useState } from 'react';
import { Hands } from '@mediapipe/hands';
import * as cam from '@mediapipe/camera_utils';
import * as draw from '@mediapipe/drawing_utils';
import { Hand, Camera, XCircle } from 'lucide-react';

const HandAI = ({ onBack }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [fingerCount, setFingerCount] = useState(0);
  const [isCameraReady, setIsCameraReady] = useState(false);

  useEffect(() => {
    const hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults((results) => {
      const canvasCtx = canvasRef.current.getContext('2d');
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      // Draw video frame manually to maintain sync or just draw landmarks
      if (results.multiHandLandmarks) {
        for (const landmarks of results.multiHandLandmarks) {
          draw.drawConnectors(canvasCtx, landmarks, Hands.HAND_CONNECTIONS, {
            color: '#6366f1',
            lineWidth: 5,
          });
          draw.drawLandmarks(canvasCtx, landmarks, {
            color: '#ffffff',
            lineWidth: 2,
            radius: 4,
          });

          // Logic to count fingers
          let count = 0;
          
          // Finger tips: 8, 12, 16, 20
          // Knuckles: 5, 9, 13, 17
          const fingerTips = [8, 12, 16, 20];
          const knuckles = [5, 9, 13, 17];

          // 4 Fingers
          for (let i = 0; i < 4; i++) {
            if (landmarks[fingerTips[i]].y < landmarks[knuckles[i]].y) {
              count++;
            }
          }

          // Thumb (Special logic - horizontal distance for simplicity)
          // Compare thumb tip (4) to thumb base (2)
          const thumbTip = landmarks[4];
          const thumbBase = landmarks[2];
          const thumbMCP = landmarks[3];
          
          // Simple thumb check: is tip further out than base? 
          // This depends on left/right hand, but we'll use a simpler vertical/horizontal check
          if (Math.abs(thumbTip.x - landmarks[9].x) > Math.abs(thumbMCP.x - landmarks[9].x)) {
            count++;
          }

          setFingerCount(count);
        }
      } else {
        setFingerCount(0);
      }
      canvasCtx.restore();
    });

    if (videoRef.current) {
      const camera = new cam.Camera(videoRef.current, {
        onFrame: async () => {
          await hands.send({ image: videoRef.current });
        },
        width: 640,
        height: 480,
      });
      camera.start();
      setIsCameraReady(true);
    }

    return () => {
      hands.close();
    };
  }, []);

  return (
    <div className="hand-ai-container" style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div className="hand-ai-header">
        <button className="back-button" onClick={onBack}>
          <XCircle size={24} />
          <span>Close Hand AI</span>
        </button>
        <div className="count-display">
          <span className="count-label">Fingers Detected</span>
          <h2 className="count-number">{fingerCount}</h2>
        </div>
      </div>

      <div className="camera-wrapper">
        <video ref={videoRef} className="hidden-video" style={{ display: 'none' }} />
        <canvas ref={canvasRef} width={640} height={480} className="hand-canvas" />
        {!isCameraReady && (
          <div className="camera-loading">
            <Camera className="animate-pulse" size={48} />
            <p>Initializing Camera...</p>
          </div>
        )}
      </div>

      <div className="hand-instructions">
        <p>Show your hand to the camera to count fingers!</p>
      </div>
    </div>
  );
};

export default HandAI;
