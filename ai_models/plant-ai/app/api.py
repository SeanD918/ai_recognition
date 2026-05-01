import sys
import os
import shutil
from fastapi import FastAPI, File, UploadFile, Response
from fastapi.middleware.cors import CORSMiddleware

# Path setup
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(BASE_DIR, "src"))

from predict import predict_image, load_model_if_needed, get_backend_name

app = FastAPI(title="Plant Recognition API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def health():
    return {"status": "Plant AI is Online", "backend": get_backend_name()}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    temp_dir = os.path.join(BASE_DIR, "temp")
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir)
        
    path = os.path.join(temp_dir, f"temp_{file.filename}")
    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        from fastapi.concurrency import run_in_threadpool
        prediction, confidence, raw_scores = await run_in_threadpool(predict_image, path)
    except Exception as e:
        return {"error": str(e)}
    finally:
        if os.path.exists(path):
            os.remove(path)

    return {
        "prediction": prediction,
        "confidence": round(confidence * 100, 2),
        "raw_scores": raw_scores,
        "backend": get_backend_name()
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8002))
    uvicorn.run(app, host="0.0.0.0", port=port)
