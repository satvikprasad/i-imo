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

    def create_person(self, emb: np.ndarray, label: str, image_bytes: bytes, thumb_b64: Optional[str]) -> dict:
        """
        POST JSON to Convex:
        {
          "emb": [float...],
          "label": "name",
          "image": "<base64>",
          "thumbnail": "<base64>"   # face crop (optional)
        }
        """
        image_b64 = base64.b64encode(image_bytes).decode("utf-8")
        payload = {
            "emb": np.asarray(emb, np.float32).tolist(),
            "label": label,
            "image": image_b64,
            "thumbnail": thumb_b64,
        }

        req = urllib.request.Request(self.create_url, method="POST")
        req.add_header("Content-Type", "application/json")
        if self.auth_header:
            req.add_header("Authorization", self.auth_header)

        with urllib.request.urlopen(req, data=json.dumps(payload).encode("utf-8")) as resp:
            response = json.loads(resp.read().decode("utf-8"))
            # You returned the whole response in your version; keep that behavior
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

def clamp(val: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, val))

def face_thumb_b64_from_bgr(bgr: np.ndarray, bbox_np: np.ndarray, max_side: int = 160, jpeg_quality: int = 85, expand: float = 0.2) -> str:
    """
    Create a base64 JPEG thumbnail (face crop) from BGR image and bbox.
    - Expands bbox by `expand` (e.g., 0.2 = 20%)
    - Keeps aspect ratio, scales so max(H, W) = max_side (if larger)
    - Returns base64 string (no data URL prefix)
    """
    H, W = bgr.shape[:2]
    x1, y1, x2, y2 = [float(v) for v in bbox_np]

    # Expand bbox by given percentage
    w = x2 - x1
    h = y2 - y1
    pad_x = w * expand / 2
    pad_y = h * expand / 2
    x1 -= pad_x
    x2 += pad_x
    y1 -= pad_y
    y2 += pad_y

    # Clamp bbox inside image
    x1 = max(0, int(round(x1)))
    y1 = max(0, int(round(y1)))
    x2 = min(W, int(round(x2)))
    y2 = min(H, int(round(y2)))

    # Fallback if invalid box
    if x2 <= x1 or y2 <= y1:
        crop_rgb = bgr[:, :, ::-1]
    else:
        crop_bgr = bgr[y1:y2, x1:x2]
        crop_rgb = crop_bgr[:, :, ::-1]  # convert to RGB

    pil_img = Image.fromarray(crop_rgb)
    w, h = pil_img.size
    scale = min(1.0, max_side / float(max(w, h))) if max(w, h) > 0 else 1.0
    if scale < 1.0:
        pil_img = pil_img.resize((int(round(w * scale)), int(round(h * scale))), Image.LANCZOS)

    buf = io.BytesIO()
    pil_img.save(buf, format="JPEG", quality=jpeg_quality, optimize=True)
    thumb_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    return thumb_b64


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
        base_url="https://stoic-cat-389.convex.site",
        create_path="/upload",          # your JSON POST endpoint
        get_all_path="/getEmbeddings",  # your GET endpoint returning [[...], ...]
        auth_header=None,
    )
    print("✅ InsightFace and Convex client initialized")
    yield
    print("🛑 Shutting down")


app = FastAPI(title="Face Upsert (single image: output.jpg)", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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


# 2) Detect: compare output.jpg to Convex embeddings, upsert if new (send thumb too)
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
    if all_embs:
        embs = np.vstack([unit_norm(np.array(e, dtype=np.float32)) for e in all_embs])
        sims = embs @ emb_new
        best_sim = float(np.max(sims))
        matched = best_sim >= thr

    if matched:
        return {"created": False}

    # Not matched → upsert (create) new person WITH THUMBNAIL
    thumb_b64 = face_thumb_b64_from_bgr(bgr, face.bbox, max_side=160, jpeg_quality=85)
    resp = db.create_person(emb=emb_new, label=payload.name, image_bytes=image_bytes, thumb_b64=thumb_b64)
    return {"created": True, "response": resp}


if __name__ == "__main__":
    # Simple direct launch (no --reload here; use `uvicorn app:app --reload` for hot reload)
    uvicorn.run(app, host="0.0.0.0", port=8000)
