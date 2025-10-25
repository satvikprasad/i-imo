# fr_cam_db.py
import argparse
import time
import pickle
from collections import defaultdict

import cv2
import numpy as np
import face_recognition

def parse_args():
    ap = argparse.ArgumentParser()
    ap.add_argument("--camera", type=int, default=0)
    ap.add_argument("--model", type=str, default="hog", choices=["hog", "cnn"],
                    help="face detector backend")
    ap.add_argument("--threshold", type=float, default=0.5,
                    help="max face distance to consider same person (typical 0.45–0.6)")
    ap.add_argument("--scale", type=float, default=0.25,
                    help="resize factor for speed (0.25 = quarter size)")
    ap.add_argument("--db", type=str, default=None,
                    help="optional path to load/save DB (pickle)")
    ap.add_argument("--mirror", action="store_true",
                    help="flip webcam horizontally")
    return ap.parse_args()

class FaceDB:
    """
    Simple in-memory DB:
      people: { pid: {'encodings': [128-d np arrays], 'seen': int, 'last': ts } }
    Matching: pick person with minimal distance across all encodings; accept if < threshold.
    """
    def __init__(self, threshold=0.5, data=None):
        self.threshold = threshold
        if data is None:
            self.people = {}
            self.next_pid = 0
        else:
            self.people = data["people"]
            self.next_pid = data["next_pid"]

    def match(self, enc):
        best_pid, best_dist = None, 1e9
        for pid, entry in self.people.items():
            # Compare to all stored encodings; use the minimum distance
            dists = face_recognition.face_distance(entry['encodings'], enc)
            if len(dists) == 0: 
                continue
            d = float(np.min(dists))
            if d < best_dist:
                best_dist, best_pid = d, pid
        if best_dist <= self.threshold:
            return best_pid, best_dist
        return None, best_dist

    def add_observation(self, pid, enc):
        self.people[pid]['encodings'].append(enc)
        self.people[pid]['seen'] += 1
        self.people[pid]['last'] = time.time()

    def register(self, enc):
        pid = self.next_pid
        self.next_pid += 1
        self.people[pid] = {
            'encodings': [enc],
            'seen': 1,
            'last': time.time(),
        }
        return pid

    def to_dict(self):
        return {"people": self.people, "next_pid": self.next_pid}

def main():
    args = parse_args()

    # Load DB if provided
    db = FaceDB(threshold=args.threshold)
    if args.db:
        try:
            with open(args.db, "rb") as f:
                data = pickle.load(f)
            db = FaceDB(threshold=args.threshold, data=data)
            print(f"[INFO] Loaded DB from {args.db} with {len(db.people)} people.")
        except Exception:
            print(f"[WARN] Could not load DB from {args.db}; starting fresh.")

    cap = cv2.VideoCapture(args.camera)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open camera index {args.camera}")
    print("Press 'q' to quit, 's' to print DB summary, 'w' to save DB (if --db provided).")

    font = cv2.FONT_HERSHEY_SIMPLEX
    frame_count = 0

    try:
        while True:
            ok, frame_bgr = cap.read()
            if not ok:
                break
            if args.mirror:
                frame_bgr = cv2.flip(frame_bgr, 1)

            # speed: optionally downscale
            small = cv2.resize(frame_bgr, (0, 0), fx=args.scale, fy=args.scale)
            rgb_small = small[:, :, ::-1]  # BGR -> RGB

            # detect + encode
            boxes = face_recognition.face_locations(rgb_small, model=args.model)
            encodings = face_recognition.face_encodings(rgb_small, boxes)

            # For each face
            for (top, right, bottom, left), enc in zip(boxes, encodings):
                # Match against DB
                pid, dist = db.match(enc)
                new_person = False
                if pid is None:
                    # Register immediately; next frames will match this person
                    pid = db.register(enc)
                    new_person = True
                else:
                    # Occasionally enrich encodings to improve robustness
                    if (db.people[pid]['seen'] % 5) == 0:
                        db.add_observation(pid, enc)
                    else:
                        db.people[pid]['seen'] += 1
                        db.people[pid]['last'] = time.time()

                # Scale boxes back to original frame size
                inv = 1.0 / args.scale
                t, r, b, l = int(top*inv), int(right*inv), int(bottom*inv), int(left*inv)

                color = (0, 200, 0) if not new_person else (0, 0, 255)
                label = f"ID {pid}" + ("" if not new_person else " (new)")
                if dist < 1e9:
                    label += f" d={dist:.2f}"

                cv2.rectangle(frame_bgr, (l, t), (r, b), color, 2)
                cv2.putText(frame_bgr, label, (l, max(20, t - 8)),
                            font, 0.6, (255, 255, 255), 2)

            # HUD
            cv2.putText(frame_bgr, f"DB size: {len(db.people)}", (10, 28),
                        font, 0.7, (255, 255, 255), 2)

            cv2.imshow("face_recognition DB (webcam)", frame_bgr)
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            if key == ord('s'):
                print("=== DB STATUS ===")
                for pid, e in db.people.items():
                    print(f"ID {pid:3d} | encodings {len(e['encodings'])} | seen {e['seen']:3d} | last {time.ctime(e['last'])}")
                print("=================")
            if key == ord('w') and args.db:
                try:
                    with open(args.db, "wb") as f:
                        pickle.dump(db.to_dict(), f)
                    print(f"[INFO] Saved DB to {args.db}")
                except Exception as ex:
                    print(f"[ERROR] Save failed: {ex}")

            frame_count += 1
    finally:
        cap.release()
        cv2.destroyAllWindows()
        # autosave on exit if path provided
        if args.db:
            try:
                with open(args.db, "wb") as f:
                    pickle.dump(db.to_dict(), f)
                print(f"[INFO] Saved DB to {args.db}")
            except Exception as ex:
                print(f"[ERROR] Final save failed: {ex}")

if __name__ == "__main__":
    main()