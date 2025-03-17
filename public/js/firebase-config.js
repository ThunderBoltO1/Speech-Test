// firebase-config.js
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore"; // นำเข้าฟังก์ชันที่ใช้

// ใส่ข้อมูลคีย์ของโปรเจค Firebase ของคุณที่นี่
const firebaseConfig = {
    apiKey: "AIzaSyARNZnEEdWI8fkkzxK6ZsLAAMLKsMRcBao",
    authDomain: "ramspeechtest.firebaseapp.com",
    projectId: "ramspeechtest",
    storageBucket: "ramspeechtest.firebasestorage.app",
    messagingSenderId: "271962080875",
    appId: "1:271962080875:web:5e06af487e59a80bc3d32e",
    measurementId: "G-MX7BFVHMTE"
};

// เริ่มต้นการใช้งาน Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Export ฟังก์ชันที่ใช้ในส่วนอื่นๆ ของโปรเจค
export { db, collection, addDoc, getDocs };