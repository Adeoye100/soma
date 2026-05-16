from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import csv
import os
from datetime import datetime

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {
        "status": "ok",
        "service": "soma-proctoring"
    }

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "soma-proctoring"
    }

@app.post("/monitor")
async def monitor_exam(
    student_id: str = Form(...),
    image: UploadFile = File(...)
):
    """Placeholder monitor endpoint - face_recognition disabled"""
    await image.read()  # Consume the file
    
    return {
        "status": "normal",
        "action": "continue",
        "reason": "Student focused (face_recognition disabled for testing)"
    }

@app.post("/register-face")
async def register_face(
    student_id: str = Form(...),
    image: UploadFile = File(...)
):
    """Placeholder register endpoint"""
    await image.read()
    
    return {
        "status": "success",
        "message": "Face registered (testing mode)",
        "student_id": student_id
    }

@app.post("/verify-face")
async def verify_face(
    student_id: str = Form(...),
    image: UploadFile = File(...)
):
    """Placeholder verify endpoint"""
    await image.read()
    
    return {
        "status": "verified",
        "message": "Face verified (testing mode)",
        "student_id": student_id
    }

@app.get("/logs")
def get_logs():
    file_name = "proctoring_logs.csv"
    
    if not os.path.exists(file_name):
        return {
            "status": "success",
            "logs": []
        }
    
    logs = []
    with open(file_name, mode="r") as file:
        reader = csv.DictReader(file)
        for row in reader:
            logs.append(row)
    
    return {
        "status": "success",
        "logs": logs
    }

@app.delete("/logs")
def clear_logs():
    file_name = "proctoring_logs.csv"
    
    if os.path.exists(file_name):
        os.remove(file_name)
    
    return {
        "status": "success",
        "message": "Logs cleared successfully"
    }
