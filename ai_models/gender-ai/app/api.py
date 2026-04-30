import os
import sys
import shutil
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware

# Add src to python path robustly
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(BASE_DIR, "src"))

from predict import predict_image

app = FastAPI(title="Gender Recognition API")

# Add CORS middleware to allow requests from your React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.middleware("http")
async def add_pna_header(request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Private-Network"] = "true"
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

