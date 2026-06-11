import os
import sys
import shutil
from fastapi import FastAPI, File, UploadFile, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool

app = FastAPI(title="AuraSense Unified AI Gateway")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Private Network Access (PNA) Header Injector for Vercel/Local cross-origin calls
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

# Lazy-loaded predictions from local submodules
from gender.predict import predict_image as gender_predict, load_model_if_needed as gender_load
from animal.predict import predict_image as animal_predict, load_model_if_needed as animal_load
from flower.predict import predict_image as flower_predict, load_model_if_needed as flower_load
from hand.predict import predict_hand, load_model_if_needed as hand_load

@app.get("/")
def health_check():
    return {
        "gateway": "online",
        "services": {
            "gender": "online",
            "animal": "online",
            "flower": "online",
            "hand": "online"
        }
    }

# Helper to save upload file temporarily
def save_temp_file(file: UploadFile):
    temp_dir = os.path.join(os.path.dirname(__file__), "temp")
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir)
    safe_filename = os.path.basename(file.filename)
    path = os.path.join(temp_dir, f"temp_{safe_filename}")
    file.file.seek(0)
    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return path

@app.post("/api/gender/predict")
async def api_gender_predict(file: UploadFile = File(...)):
    path = save_temp_file(file)
    try:
        gender_load()
        result, confidence = await run_in_threadpool(gender_predict, path)
        return {"prediction": result, "confidence": round(confidence * 100, 2)}
    except Exception as e:
        return {"error": str(e)}
    finally:
        if os.path.exists(path):
            os.remove(path)

@app.post("/api/animal/predict")
async def api_animal_predict(file: UploadFile = File(...)):
    path = save_temp_file(file)
    try:
        animal_load()
        prediction, confidence, raw_scores = await run_in_threadpool(animal_predict, path)
        return {
            "prediction": prediction,
            "confidence": round(confidence * 100, 2),
            "raw_scores": raw_scores
        }
    except Exception as e:
        return {"error": str(e)}
    finally:
        if os.path.exists(path):
            os.remove(path)

@app.post("/api/flower/predict")
async def api_flower_predict(file: UploadFile = File(...)):
    path = save_temp_file(file)
    try:
        flower_load()
        prediction, confidence, raw_scores = await run_in_threadpool(flower_predict, path)
        return {
            "prediction": prediction,
            "confidence": round(confidence * 100, 2),
            "raw_scores": raw_scores
        }
    except Exception as e:
        return {"error": str(e)}
    finally:
        if os.path.exists(path):
            os.remove(path)

@app.post("/api/hand/predict")
async def api_hand_predict(file: UploadFile = File(...)):
    path = save_temp_file(file)
    try:
        hand_load()
        count, confidence, info = await run_in_threadpool(predict_hand, path)
        if isinstance(info, dict) and "error" in info:
            return {"error": info["error"]}
        return {
            "prediction": str(count),
            "count": count,
            "confidence": round(confidence * 100, 2),
            "info": info
        }
    except Exception as e:
        return {"error": str(e)}
    finally:
        if os.path.exists(path):
            os.remove(path)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 3000))
    uvicorn.run(app, host="0.0.0.0", port=port)
