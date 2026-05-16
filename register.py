import face_recognition
import os
import pickle

faces_folder = "registered_faces"

known_encodings = []
known_names = []

for filename in os.listdir(faces_folder):

    if filename.endswith((".jpg", ".jpeg", ".png")):

        image_path = os.path.join(faces_folder, filename)

        image = face_recognition.load_image_file(image_path)

        encodings = face_recognition.face_encodings(image)

        if len(encodings) > 0:

            known_encodings.append(encodings[0])

            known_names.append(os.path.splitext(filename)[0])

            print(f"Registered: {filename}")

        else:
            print(f"No face found in {filename}")

data = {
    "encodings": known_encodings,
    "names": known_names
}

with open("encodings.pkl", "wb") as file:
    pickle.dump(data, file)

print("Face registration completed.")