import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB5nFLw3nYuawEZ3bgS3I5KukVS2MSD5hE",
  authDomain: "soma-a6525.firebaseapp.com",
  projectId: "soma-a6525",
  storageBucket: "soma-a6525.firebasestorage.app",
  messagingSenderId: "408589892477",
  appId: "1:408589892477:web:5b9b532fd269e472366a14",
  measurementId: "G-QZMWB8PXBZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const analytics = getAnalytics(app);

export const db = getFirestore(app);
export { app, auth, analytics };
