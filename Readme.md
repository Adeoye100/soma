# Exam Face Verification API

Base URL:
http://127.0.0.1:8000

## Endpoints

### Register Face
POST /register-face

Form data:
- student_id
- image

### Verify Face
POST /verify-face

Form data:
- student_id
- image

### Monitor Exam
POST /monitor

Form data:
- student_id
- image

The frontend should call /monitor every 5 seconds during the exam.

If action is "continue", exam continues.
If action is "auto_submit", frontend should submit the exam automatically.