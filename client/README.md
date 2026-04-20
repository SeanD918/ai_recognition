# AuraSense 🌌
### Advanced AI Gender & Age Recognition

A modern, high-performance web application that uses Neural Networks to classify gender and estimate age directly in the browser.

## ✨ Features
- **Client-Side AI**: Powered by `face-api.js` (TensorFlow.js).
- **Privacy First**: Images are processed locally and never uploaded to a server.
- **Smart Fallback**: Automatically switches between GPU (WebGL) and CPU processing for high compatibility.
- **Modern UI**: Sleek dark-themed interface with scanning animations.

## 🚀 Quick Start

1. **Clone the repo**:
   ```bash
   git clone https://github.com/SeanD918/ai_recognition.git
   ```

2. **Install & Run**:
   ```bash
   cd client
   npm install
   npm run dev
   ```

## 🛠️ Deployment (Vercel)
The project is configured for Vercel. 
Simply link your GitHub repo and add the following Environment Variable:
- `VITE_MODEL_URL`: `https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/`

## 📜 Technology Stack
- **React.js**
- **Vite**
- **face-api.js** (based on TensorFlow.js)
- **Lucide Icons**
