import sys
import os

# TensorFlow Memory Optimization for Render Free Tier
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
os.environ['TF_FORCE_GPU_ALLOW_GROWTH'] = 'true'

import shutil
from fastapi import FastAPI, File, UploadFile, Response
from fastapi.middleware.cors import CORSMiddleware

# Add src to python path robustly
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(BASE_DIR, "src"))

from predict import predict_image, load_model_if_needed, get_backend_name

app = FastAPI(title="Animal Recognition API")

# 1. Official CORS Middleware (Standard Compliance)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins including Vercel
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Private Network Access (PNA) Header Injector
@app.middleware("http")
async def add_pna_header(request, call_next):
    # Handle preflight (OPTIONS)
    if request.method == "OPTIONS":
        response = Response()
        response.headers["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
        response.headers["Access-Control-Allow-Private-Network"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        return response
        
    response = await call_next(request)
    response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response

@app.get("/")
async def health_check():
    return {
        "status": "Animal AI Server is Online",
        "model": "EfficientNet-B0",
        "fallback_active": True
    }

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    # Create temp directory in project root
    temp_dir = os.path.join(BASE_DIR, "temp")
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir)
        
    # Sanitize filename
    safe_filename = os.path.basename(file.filename)
    path = os.path.join(temp_dir, f"temp_{safe_filename}")

    # Use seek(0) just in case
    file.file.seek(0)
    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # Load model in main thread to avoid threadpool deadlocks with TensorFlow
        load_model_if_needed()
        
        # Run synchronous prediction in a threadpool to avoid blocking
        from fastapi.concurrency import run_in_threadpool
        prediction, confidence, raw_scores = await run_in_threadpool(predict_image, path)
    except Exception as e:
        print(f"API Prediction Error: {e}")
        return {"error": f"Prediction failed: {str(e)}"}
    finally:
        # Clean up
        if os.path.exists(path):
            try:
                os.remove(path)
            except:
                pass

    return {
        "prediction": prediction,
        "confidence": round(confidence * 100, 2),
        "raw_scores": raw_scores,
        "backend": get_backend_name()
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)