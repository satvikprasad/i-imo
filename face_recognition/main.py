# app.py
import base64
import io
import json
import os
import urllib.request
from contextlib import asynccontextmanager
from typing import List, Optional

import numpy as np
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException
import uvicorn
from pydantic import BaseModel
from PIL import Image
from insightface.app import FaceAnalysis


# -----------------------------
# Config
# -----------------------------
THRESHOLD = 0.65
MODEL_NAME = "buffalo_l"
PROVIDERS = ["CPUExecutionProvider"]   # or ["CUDAExecutionProvider"]
IMAGE_PATH = "output.jpg"              # always overwritten
ONLY_CLOSEST_FACE = True


class ConvexClient:
    def __init__(self, base_url, create_path, get_all_path, auth_header=None):
        self.base_url = base_url.rstrip("/")
        self.create_url = self.base_url + create_path
        self.get_all_url = self.base_url + get_all_path
        self.auth_header = auth_header

    def get_all_embeddings(self) -> List[List[float]]:
        # Uses GET
        req = urllib.request.Request(self.get_all_url, method="GET")
        if self.auth_header:
            req.add_header("Authorization", self.auth_header)
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def create_person(self, emb: np.ndarray, label: str, image_bytes: bytes) -> str:
        # Encode image to base64 string
        image_b64 = base64.b64encode(image_bytes).decode("utf-8")

        payload = {
            "emb": np.asarray(emb, np.float32).tolist(),
            "label": label,
            "image": image_b64,
        }

        req = urllib.request.Request(self.create_url, method="POST")
        req.add_header("Content-Type", "application/json")

        with urllib.request.urlopen(req, data=json.dumps(payload).encode("utf-8")) as resp:
            response = json.loads(resp.read().decode("utf-8"))
            print(response)
            return response

# -----------------------------
# Helpers
# -----------------------------
def read_image_bytes_to_bgr(image_bytes: bytes) -> np.ndarray:
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return np.array(img)[:, :, ::-1]  # RGB → BGR

def unit_norm(v: np.ndarray) -> np.ndarray:
    v = v.astype(np.float32)
    n = np.linalg.norm(v)
    return v / n if n else v

def best_face_index(faces) -> int:
    best, best_key = -1, (-1.0, -1.0)
    for i, f in enumerate(faces):
        score = float(getattr(f, "det_score", 0.0))
        x1, y1, x2, y2 = f.bbox.astype(int)
        area = float(max(0, x2 - x1) * max(0, y2 - y1))
        key = (score, area)
        if key > best_key:
            best, best_key = i, key
    return best


# -----------------------------
# FastAPI app with lifespan
# -----------------------------
class ImageModel(BaseModel):
    image: str  # data URL (e.g. "data:image/jpeg;base64,...")

class DetectModel(BaseModel):
    name: str
    threshold: Optional[float] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ---- Startup ----
    global insight, db
    insight = FaceAnalysis(name=MODEL_NAME, providers=PROVIDERS)
    insight.prepare(ctx_id=-1)

    db = ConvexClient(
        base_url="https://giant-dalmatian-627.convex.site",
        create_path="/upload",
        get_all_path="/getEmbeddings",
        auth_header=None,
    )
    print("✅ InsightFace and Convex client initialized")
    yield
    print("🛑 Shutting down")


app = FastAPI(title="Face Upsert (single image: output.jpg)", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,  # Allow cookies to be sent with cross-origin requests
    allow_methods=["*"],     # Allow all standard HTTP methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],     # Allow all headers
)


# 1) Save the last photo as output.jpg
@app.post("/upload/")
async def upload_image(img: ImageModel):
    try:
        _, encoded = img.image.split(",", 1)
        binary_data = base64.b64decode(encoded)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image data")

    with open(IMAGE_PATH, "wb") as f:
        f.write(binary_data)

    return {"success": True, "message": "Saved to output.jpg"}


# 2) Detect: compare output.jpg to Convex embeddings, upsert if new
@app.post("/detect/")
async def detect_and_upsert(payload: DetectModel):
    if not os.path.exists(IMAGE_PATH):
        raise HTTPException(status_code=404, detail="No image uploaded yet")

    with open(IMAGE_PATH, "rb") as f:
        image_bytes = f.read()
        
    bgr = read_image_bytes_to_bgr(image_bytes)
    faces = insight.get(bgr)
    if not faces:
        return {"status": "no_face", "threshold": THRESHOLD}

    face = faces[best_face_index(faces) if ONLY_CLOSEST_FACE else 0]
    emb_new = unit_norm(face.embedding)

    # Pull all embeddings (plain list of lists) from Convex
    all_embs: List[List[float]] = db.get_all_embeddings()
    thr = payload.threshold if payload.threshold is not None else THRESHOLD
    
    matched = False
    best_sim: Optional[float] = None

    if all_embs:
        embs = np.vstack([unit_norm(np.array(e, dtype=np.float32)) for e in all_embs])
        sims = embs @ emb_new
        best_sim = float(np.max(sims))
        matched = best_sim >= thr

    if matched:
        return {
            "created": False
        }

    # Not matched → upsert (create) new person
    db.create_person(emb=emb_new, label=payload.name, image_bytes=image_bytes)
    return {
        "created": True
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
    