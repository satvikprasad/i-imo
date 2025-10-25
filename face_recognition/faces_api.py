# faces_api.py
import os
import uuid
import pickle
import threading
from typing import Optional

import cv2
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel
from insightface.app import FaceAnalysis
import uvicorn

# -----------------------------
# Config
# -----------------------------
PROVIDERS = ['CPUExecutionProvider']     # switch to ['CUDAExecutionProvider'] if you have CUDA
MODEL_NAME = 'buffalo_l'
THRESHOLD = 0.65
DETECTION_CONFIDENCE = 0.4
MAX_EMBS_PER_PERSON = 10
DB_PATH = "faces_db.pkl"
ONLY_CLOSEST_FACE = True
CAM_INDEX = 0

# -----------------------------
# Globals (state)
# -----------------------------
app = FastAPI(title="Face DB API", version="1.0")
_face_app = None                       # InsightFace model (init on startup)
_db = {}                               # {pid: {"name": str, "embs": [ndarray], "avg": ndarray}}
_name_to_id = {}                       # {name: pid}
_last_unknown_emb: Optional[np.ndarray] = None
_lock = threading.RLock()
_stop_event = threading.Event()

# -----------------------------
# Utility functions
# -----------------------------
def _l2(v, eps=1e-12):
    n = np.linalg.norm(v)
    return v if n < eps else v / n

def _cos(a, b):
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

def _new_id():
    return str(uuid.uuid4())[:8]

def _save_db(path=DB_PATH):
    with _lock:
        safe = {
            pid: {
                "name": info["name"],
                "embs": [e.astype(np.float32) for e in info["embs"]],
                "avg": info["avg"].astype(np.float32),
            } for pid, info in _db.items()
        }
    with open(path, "wb") as f:
        pickle.dump(safe, f)
    print(f"[DB] Saved {len(safe)} people -> {path}")

def _load_db(path=DB_PATH):
    if not os.path.exists(path):
        print("[DB] No existing DB; starting fresh.")
        return
    with open(path, "rb") as f:
        data = pickle.load(f)
    with _lock:
        _db.clear()
        _name_to_id.clear()
        for pid, info in data.items():
            embs = [np.array(e, dtype=np.float32) for e in info["embs"]]
            avg = np.array(info["avg"], dtype=np.float32)
            _db[pid] = {"name": info["name"], "embs": embs, "avg": avg}
            _name_to_id[info["name"]] = pid
    print(f"[DB] Loaded {len(_db)} people")

def _add_emb(pid, emb):
    with _lock:
        info = _db[pid]
        info["embs"].append(emb)
        if len(info["embs"]) > MAX_EMBS_PER_PERSON:
            info["embs"] = info["embs"][-MAX_EMBS_PER_PERSON:]
        info["avg"] = _l2(np.mean(np.stack(info["embs"], axis=0), axis=0))

def _create_person(name, emb):
    with _lock:
        pid = _new_id()
        _db[pid] = {"name": name, "embs": [emb], "avg": _l2(emb)}
        _name_to_id[name] = pid
    print(f"[DB] Created '{name}' id={pid}")
    _save_db()
    return pid

def _best_match(emb):
    best_pid, best_sim = None, -1.0
    with _lock:
        for pid, info in _db.items():
            sim = _cos(emb, info["avg"])
            if sim > best_sim:
                best_pid, best_sim = pid, sim
    return (best_pid, best_sim) if best_sim >= THRESHOLD else (None, best_sim)

# -----------------------------
# Camera loop (background)
# -----------------------------
def _largest(face):
    l, t, r, b = face.bbox
    return (r - l) * (b - t)

def camera_loop():
    global _last_unknown_emb
    cap = cv2.VideoCapture(CAM_INDEX)
    if not cap.isOpened():
        print(f"[Camera] Cannot open device {CAM_INDEX}")
        return

    print("[Camera] Started. Press Ctrl+C to stop the server (this closes camera too).")
    try:
        while not _stop_event.is_set():
            ok, frame = cap.read()
            if not ok:
                continue

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            faces = _face_app.get(rgb) if _face_app is not None else []

            if not faces:
                _last_unknown_emb = None
                cv2.imshow("Face Recognition", frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    _stop_event.set()
                continue

            if ONLY_CLOSEST_FACE:
                faces = [max(faces, key=_largest)]

            face = faces[0]
            conf = float(getattr(face, "det_score", 1.0))
            if conf < DETECTION_CONFIDENCE:
                _last_unknown_emb = None
                cv2.imshow("Face Recognition", frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    _stop_event.set()
                continue

            emb = _l2(np.array(face.embedding, dtype=np.float32))
            pid, sim = _best_match(emb)
            l, t, r, b = map(int, face.bbox)

            if pid is None:
                _last_unknown_emb = emb
                print(_last_unknown_emb)
                label, color = f"Unknown  sim:{sim:.2f}", (0, 0, 255)
            else:
                _last_unknown_emb = None
                with _lock:
                    name = _db[pid]["name"]
                label, color = f"{name}  sim:{sim:.2f}", (0, 200, 0)

            cv2.rectangle(frame, (l, t), (r, b), color, 2)
            cv2.putText(frame, label, (l, max(20, t - 10)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
            cv2.imshow("Face Recognition", frame)

            if cv2.waitKey(1) & 0xFF == ord('q'):
                _stop_event.set()
    finally:
        cap.release()
        cv2.destroyAllWindows()
        print("[Camera] Stopped.")

# -----------------------------
# FastAPI models & endpoints
# -----------------------------
class CreateReq(BaseModel):
    name: Optional[str] = None
    allow_if_recognized: bool = False

@app.get("/ping")
def ping():
    return {"ok": True, "msg": "pong"}

@app.get("/status")
def status():
    with _lock:
        count = len(_db)
    return {
        "ok": True,
        "people": count,
        "unknown_available": _last_unknown_emb is not None
    }

@app.post("/create")
def create(req: CreateReq):
    global _last_unknown_emb
    print(_last_unknown_emb)

    emb = _last_unknown_emb
    if emb is None:
        return {"ok": False, "pid": None, "msg": "No unknown embedding available."}

    if not req.allow_if_recognized:
        pid, sim = _best_match(emb)
        if pid is not None:
            with _lock:
                name_found = _db[pid]["name"]
            return {"ok": True, "pid": pid,
                    "msg": f"Similar to existing '{name_found}' (sim={sim:.2f}); not creating."}

    name = req.name
    if name is None:
        with _lock:
            name = f"Person_{len(_db)+1}"

    with _lock:
        if name in _name_to_id:
            pid = _name_to_id[name]
            _add_emb(pid, emb)
            _save_db()
            return {"ok": True, "pid": pid, "msg": f"Added embedding to existing '{name}'."}

    pid = _create_person(name, emb)
    return {"ok": True, "pid": pid, "msg": f"Created '{name}'."}

# -----------------------------
# Startup / Shutdown
# -----------------------------
@app.on_event("startup")
def _startup():
    global _face_app
    print("[Startup] Initializing model and DB...")
    _face_app = FaceAnalysis(name=MODEL_NAME, providers=PROVIDERS)
    _face_app.prepare(ctx_id=-1 if PROVIDERS == ['CPUExecutionProvider'] else 0, det_size=(640, 640))
    _load_db()
    t = threading.Thread(target=camera_loop, daemon=True)
    t.start()

@app.on_event("shutdown")
def _shutdown():
    print("[Shutdown] Stopping camera loop...")
    _stop_event.set()

# -----------------------------
# Entrypoint
# -----------------------------
if __name__ == "__main__":
    # start API in a thread
    import uvicorn, threading
    def serve():
        uvicorn.run("faces_api:app", host="127.0.0.1", port=8000, reload=False)
    api_t = threading.Thread(target=serve, daemon=True)
    api_t.start()

    # run camera loop in main thread (safe for imshow)
    SHOW_PREVIEW = True
    # init model/db here since we're not relying on FastAPI startup
    _face_app = FaceAnalysis(name=MODEL_NAME, providers=PROVIDERS)
    _face_app.prepare(ctx_id=-1 if PROVIDERS == ['CPUExecutionProvider'] else 0, det_size=(640, 640))
    _load_db()
    camera_loop()