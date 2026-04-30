import os
import sys
import shutil
from fastapi import FastAPI, File, UploadFile, Response
from fastapi.middleware.cors import CORSMiddleware

# Add src to python path robustly
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(BASE_DIR, "src"))

from predict import predict_image, load_model_if_needed

app = FastAPI(title="Animal Recognition API")

# Custom CORS + Private Network Access Middleware
@app.middleware("http")
async def cors_and_pna_middleware(request, call_next):
    # Handle preflight (OPTIONS) requests
    if request.method == "OPTIONS":
        response = Response()
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Allow-Private-Network"] = "true"
        return response
    
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
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
        result, confidence = await run_in_threadpool(predict_image, path)
    except Exception as e:
        print(f"API Prediction Error: {e}")
        result, confidence = "Error in prediction", 0.0
    finally:
        # Clean up
        if os.path.exists(path):
            try:
                os.remove(path)
            except:
                pass

    return {
        "prediction": result,
        "confidence": round(confidence * 100, 2)
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)