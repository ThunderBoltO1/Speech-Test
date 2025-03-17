// ฟังก์ชันที่เรียกเมื่อหน้าเว็บโหลด
window.onload = function() {
    // ตรวจสอบว่า responsiveVoice โหลดแล้ว
    if (typeof responsiveVoice !== "undefined") {
        console.log("ResponsiveVoice loaded successfully.");
    } else {
        console.error("ResponsiveVoice failed to load.");
    }

    // ดึงข้อมูลปุ่มจาก Firebase เมื่อหน้าโหลด
    getButtonsFromFirestore();
};

// ฟังก์ชันเพื่อพูดข้อความ
function speakText(text) {
    if (typeof responsiveVoice !== "undefined") {
        responsiveVoice.speak(text, "Thai Male");
    } else {
        alert("ResponsiveVoice not loaded properly.");
    }
}

// ฟังก์ชันเพื่อแสดง modal
function showModal() {
    document.getElementById('modal').classList.remove('hidden');
}

// ฟังก์ชันเพื่อปิด modal
function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

// ฟังก์ชันเพื่อเพิ่มปุ่มใหม่
function addButton() {
    const userInput = document.getElementById('buttonText').value.trim();

    if (userInput) {
        // สร้างปุ่มใหม่
        const newButton = document.createElement('button');
        newButton.textContent = userInput;
        newButton.classList.add('bg-purple-500', 'text-white', 'px-6', 'py-3', 'rounded', 'text-sm', 'sm:text-base', 'md:text-lg');
        newButton.onclick = function() {
            speakText(userInput);
        };

        // หาตำแหน่งของ button-container
        const container = document.getElementById('button-container');

        // เพิ่มปุ่มใหม่เข้าไปใน container
        container.appendChild(newButton);

        // เพิ่มปุ่มใหม่ไปยัง Firestore
        addButtonToFirestore(userInput);

        // ปิด modal
        closeModal();
    } else {
        alert("กรุณากรอกข้อความก่อน!");
    }
}

// ฟังก์ชันเพิ่มปุ่มไปยัง Firestore
async function addButtonToFirestore(text) {
    try {
        const docRef = await addDoc(collection(db, "buttons"), {
            text: text,
        });
        console.log("Document written with ID: ", docRef.id);
    } catch (e) {
        console.error("Error adding document: ", e);
    }
}

// ฟังก์ชันดึงข้อมูลจาก Firestore และแสดงบนหน้าเว็บ
async function getButtonsFromFirestore() {
    const querySnapshot = await getDocs(collection(db, "buttons"));
    querySnapshot.forEach((doc) => {
        console.log(doc.id, " => ", doc.data());
        displayButtons(doc.data().text); // แสดงข้อมูลในหน้าเว็บ
    });
}

function displayButtons(text) {
    const buttonContainer = document.getElementById("button-container");
    const button = document.createElement("button");
    button.textContent = text;
    button.classList.add("bg-blue-500", "text-white", "px-6", "py-3", "rounded", "text-sm", "mb-2");
    button.onclick = function() {
        speakText(text);
    };
    buttonContainer.appendChild(button);
}

// ฟังก์ชันสำหรับการโหลด Firebase
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore";

// Firebase config
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