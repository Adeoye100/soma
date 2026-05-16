from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
from datetime import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
)

@app.post("/api/proctoring/analyze-frame")
async def analyze_frame(file: UploadFile = File(...)):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.3, 5, minSize=(30, 30))
    
    violations = []
    if len(faces) == 0:
        violations.append("NO_FACE")
    elif len(faces) > 1:
        violations.append("MULTIPLE_FACES")
    
    return {
        "success": True,
        "face_detected": len(faces) > 0,
        "face_count": len(faces),
        "violations": violations,
        "timestamp": datetime.now().isoformat(),
        "integrity_score": 100 - (len(violations) * 10)
    }

@app.get("/health")
async def health():
    return {"status": "ok", "service": "soma-proctoring"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
