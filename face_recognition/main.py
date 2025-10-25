import cv2
import numpy as np
import uuid
import pickle
import os
from insightface.app import FaceAnalysis

# -----------------------------
# Config
# -----------------------------
PROVIDERS = ['CPUExecutionProvider']   # change to ['CUDAExecutionProvider'] if CUDA works for you
MODEL_NAME = 'buffalo_l'
THRESHOLD = 0.65                       # cosine similarity; try 0.55–0.75 depending on your camera/lighting
DETECTION_CONFIDENCE = 0.4
MAX_EMBS_PER_PERSON = 10
DB_PATH = "faces_db.pkl"

# Behavior toggles
AUTO_ADD_ENABLED = True                # True => will add after several frames of "Unknown"
AUTO_ADD_AFTER = 8                     # frames the same unknown must persist before adding
ASK_NAME_ON_AUTO_ADD = True            # prompt for name instead of default Person_X
ONLY_CLOSEST_FACE = True               # process only the largest face in the frame

# -----------------------------
# Init model
# -----------------------------
app = FaceAnalysis(name=MODEL_NAME, providers=PROVIDERS)
app.prepare(ctx_id=-1 if PROVIDERS == ['CPUExecutionProvider'] else 0, det_size=(640, 640))

# -----------------------------
# Helpers
# -----------------------------
def l2_normalize(v, eps=1e-12):
    n = np.linalg.norm(v)
    return v if n < eps else v / n

def cosine_similarity(a, b):
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

def new_person_id():
    return str(uuid.uuid4())[:8]

# -----------------------------
# DB: {pid: {"name": str, "embs": [np.ndarray], "avg": np.ndarray}}
# -----------------------------
db = {}
name_to_id = {}

def save_db(path=DB_PATH):
    safe = {}
    for pid, info in db.items():
        safe[pid] = {
            "name": info["name"],
            "embs": [e.astype(np.float32) for e in info["embs"]],
            "avg": info["avg"].astype(np.float32)
        }
    with open(path, "wb") as f:
        pickle.dump(safe, f)
    print(f"[DB] Saved to {path} (people: {len(db)})")

def load_db(path=DB_PATH):
    global db, name_to_id
    if not os.path.exists(path):
        print("[DB] No existing DB; starting fresh.")
        return
    with open(path, "rb") as f:
        data = pickle.load(f)
    db = {}
    name_to_id = {}
    for pid, info in data.items():
        embs = [np.array(e, dtype=np.float32) for e in info["embs"]]
        avg = np.array(info["avg"], dtype=np.float32)
        db[pid] = {"name": info["name"], "embs": embs, "avg": avg}
        name_to_id[info["name"]] = pid
    print(f"[DB] Loaded {len(db)} people from {path}")

def add_embedding_to_person(pid, emb):
    info = db[pid]
    info["embs"].append(emb)
    if len(info["embs"]) > MAX_EMBS_PER_PERSON:
        info["embs"] = info["embs"][-MAX_EMBS_PER_PERSON:]
    info["avg"] = l2_normalize(np.mean(np.stack(info["embs"], axis=0), axis=0))

def create_person(name, emb):
    pid = new_person_id()
    db[pid] = {"name": name, "embs": [emb], "avg": l2_normalize(emb)}
    name_to_id[name] = pid
    print(f"[DB] Created '{name}' (id={pid}).")
    save_db()
    return pid

def find_best_match(emb):
    best_pid, best_sim = None, -1.0
    for pid, info in db.items():
        sim = cosine_similarity(emb, info["avg"])
        if sim > best_sim:
            best_pid, best_sim = pid, sim
    if best_sim >= THRESHOLD:
        return best_pid, best_sim
    return None, best_sim

# -----------------------------
# Main
# -----------------------------
load_db()

cap = cv2.VideoCapture(0)
if not cap.isOpened():
    raise RuntimeError("Could not open webcam (index 0).")

print("Controls: 'q' quit | 'a' add/name the current unknown face")
unknown_counter = 0
last_unknown_emb = None

try:
    while True:
        ok, frame = cap.read()
        if not ok:
            break

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        faces = app.get(rgb)

        if len(faces) == 0:
            cv2.imshow("InsightFace Webcam", frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
            continue

        # choose only the closest face if requested
        if ONLY_CLOSEST_FACE:
            faces = [max(faces, key=lambda f: (f.bbox[2]-f.bbox[0])*(f.bbox[3]-f.bbox[1]))]

        # we process the single chosen face
        face = faces[0]
        conf = float(getattr(face, "det_score", 1.0))
        if conf < DETECTION_CONFIDENCE:
            cv2.imshow("InsightFace Webcam", frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
            continue

        emb = l2_normalize(np.array(face.embedding, dtype=np.float32))
        pid, sim = find_best_match(emb)
        l, t, r, b = [int(x) for x in face.bbox]

        if pid is not None:
            # recognized -> update with new embedding (helps adaptation)
            add_embedding_to_person(pid, emb)
            name = db[pid]["name"]
            label = f"{name}  sim:{sim:.2f}"
            color = (0, 200, 0)
            last_unknown_emb = None
            unknown_counter = 0
        else:
            # unknown
            label = f"Unknown  sim:{sim:.2f}"
            color = (0, 0, 255)
            last_unknown_emb = emb

            if AUTO_ADD_ENABLED:
                unknown_counter += 1
                if unknown_counter >= AUTO_ADD_AFTER:
                    if ASK_NAME_ON_AUTO_ADD:
                        typed = input("New face detected. Enter name (or leave empty for default): ").strip()
                        person_name = typed if typed else f"Person_{len(db)+1}"
                    else:
                        person_name = f"Person_{len(db)+1}"
                    create_person(person_name, emb)
                    label = f"{person_name} (added)"
                    color = (0, 120, 255)
                    unknown_counter = 0

        cv2.rectangle(frame, (l, t), (r, b), color, 2)
        cv2.putText(frame, label, (l, max(20, t - 10)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

        cv2.imshow("InsightFace Webcam (q quit, a add/name)", frame)
        key = cv2.waitKey(1) & 0xFF

        if key == ord('q'):
            break
        elif key == ord('a') and last_unknown_emb is not None:
            typed = input("Enter name for this person: ").strip()
            person_name = typed if typed else f"Person_{len(db)+1}"
            if person_name in name_to_id:
                add_embedding_to_person(name_to_id[person_name], last_unknown_emb)
                print(f"[DB] Added embedding to existing '{person_name}'.")
                save_db()
            else:
                create_person(person_name, last_unknown_emb)
            unknown_counter = 0

finally:
    cap.release()
    cv2.destroyAllWindows()
    print("\nFinal DB:")
    for pid, info in db.items():
        print(f"{pid}: {info['name']} (embs={len(info['embs'])})")
