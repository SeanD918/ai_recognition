from fastapi import FastAPI, File, UploadFile
import shutil
import os
import sys

# Add src to python path
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), "src"))
from predict import predict_image

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Add CORS middleware to allow requests from your React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def health_check():
    return {"status": "AI Server is Online", "model": "ResNet18"}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    # Create temp directory
    temp_dir = "temp"
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir)
        
    path = os.path.join(temp_dir, f"temp_{file.filename}")

    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        result, confidence = predict_image(path)
    finally:
        # Clean up
        if os.path.exists(path):
            os.remove(path)

    return {
        "prediction": result,
        "confidence": round(confidence * 100, 2)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
