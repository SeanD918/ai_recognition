import sys
import os
import shutil
from fastapi import FastAPI, File, UploadFile, Response
from fastapi.middleware.cors import CORSMiddleware

# Add src to python path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(BASE_DIR, "src"))

from predict import predict_hand, load_model_if_needed, get_backend_name

app = FastAPI(title="Hand Finger Detection API")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Private Network Access (PNA) Header Injector
@app.middleware("http")
async def add_pna_header(request, call_next):
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
        "status": "Hand AI Server is Online",
        "model": "MediaPipe Hands",
        "features": ["Finger Counting"]
    }

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    temp_dir = os.path.join(BASE_DIR, "temp")
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir)
        
    safe_filename = os.path.basename(file.filename)
    path = os.path.join(temp_dir, f"temp_{safe_filename}")

    file.file.seek(0)
    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        load_model_if_needed()
        from fastapi.concurrency import run_in_threadpool
        count, confidence, info = await run_in_threadpool(predict_hand, path)
    except Exception as e:
        print(f"API Prediction Error: {e}")
        return {"error": f"Prediction failed: {str(e)}"}
    finally:
        if os.path.exists(path):
            try:
                os.remove(path)
            except:
                pass

    backend_name = get_backend_name()
    
    return {
        "prediction": str(count),
        "count": count,
        "confidence": round(confidence * 100, 2),
        "backend": backend_name,
        "info": info
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8003))
    uvicorn.run(app, host="0.0.0.0", port=port)
