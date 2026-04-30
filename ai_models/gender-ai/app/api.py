import os
import sys
import shutil
from fastapi import FastAPI, File, UploadFile, Response
from fastapi.middleware.cors import CORSMiddleware

# Add src to python path robustly
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(BASE_DIR, "src"))

from predict import predict_image, load_model_if_needed

app = FastAPI(title="Gender Recognition API")

# Custom CORS + Private Network Access Middleware
@app.middleware("http")
async def cors_and_pna_middleware(request, call_next):
    origin = request.headers.get("Origin", "*")
    
    # Handle preflight (OPTIONS) requests
    if request.method == "OPTIONS":
        response = Response()
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS, PUT, DELETE"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Private-Network"] = "true"
        response.headers["Access-Control-Max-Age"] = "86400"
        return response
    
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS, PUT, DELETE"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

@app.get("/")
async def health_check():
    return {"status": "Gender AI Server is Online", "model": "ResNet18"}

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
        # Run synchronous prediction in a threadpool to avoid blocking
        from fastapi.concurrency import run_in_threadpool
        result, confidence = await run_in_threadpool(predict_image, path)
    except Exception as e:
        print(f"API Prediction Error: {e}")
        result, confidence = "System error during analysis", 0.0
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
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

