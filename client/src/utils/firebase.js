// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyDGbKDSIM6Oiclv4Bztb_BDekPc2AYnkn4',
  authDomain: 'hourglass-ef3ca.firebaseapp.com',
  projectId: 'hourglass-ef3ca',
  storageBucket: 'hourglass-ef3ca.firebasestorage.app',
  messagingSenderId: '740669618647',
  appId: '1:740669618647:web:87238cd0dfad4dbfd27392',
  measurementId: 'G-TV5MCLZW5Z',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);
export const db = getFirestore(app);

if (import.meta.env.MODE === 'development') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099');
  connectFirestoreEmulator(db, 'http://127.0.0.1:8080');
}
