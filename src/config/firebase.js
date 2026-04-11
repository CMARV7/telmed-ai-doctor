import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  projectId: "your-project-id-here",
  appId: "your-app-id-here"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);