// Firebase import
import { db, collection, addDoc, getDocs } from './firebase-config'; // ต้องให้แน่ใจว่าได้ทำการ import ฟังก์ชันเหล่านี้จาก firebase-config.js

// ฟังก์ชันเพื่อตรวจสอบว่า responsiveVoice โหลดแล้ว
window.onload = function() {
    if (typeof responsiveVoice !== "undefined") {
        console.log("ResponsiveVoice loaded successfully.");
    } else {
        console.error("ResponsiveVoice failed to load.");
    }

    // ดึงข้อมูลจาก Firestore เมื่อหน้าเว็บโหลด
    getButtonsFromFirestore();
};

// ฟังก์ชันสำหรับพูดข้อความ
function speakText(text) {
    if (typeof responsiveVoice !== "undefined") {
        responsiveVoice.speak(text, "Thai Male");
    } else {
        alert("ResponsiveVoice not loaded properly.");
    }
}

function showModal() {
    document.getElementById('modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

function addButton() {
    const userInput = document.getElementById('buttonText').value.trim();

    if (userInput) {
        // เพิ่มปุ่มใหม่ไปยัง Firestore
        addButtonToFirestore(userInput);
        closeModal();
    } else {
        alert("กรุณากรอกข้อความก่อน!");
    }
}

// ฟังก์ชันเพื่อเพิ่มปุ่มไปยัง Firestore
async function addButtonToFirestore(text) {
    try {
        const docRef = await addDoc(collection(db, "buttons"), {
            text: text,
        });
        console.log("Document written with ID: ", docRef.id);
        // หลังจากเพิ่มข้อมูลแล้ว เรียกฟังก์ชันเพื่อดึงข้อมูลทั้งหมดอีกครั้ง
        getButtonsFromFirestore();
    } catch (e) {
        console.error("Error adding document: ", e);
    }
}

// ฟังก์ชันดึงข้อมูลจาก Firestore และแสดงบนหน้าเว็บ
async function getButtonsFromFirestore() {
    try {
        const querySnapshot = await getDocs(collection(db, "buttons"));
        const buttonContainer = document.getElementById("button-container");
        buttonContainer.innerHTML = ""; // ล้างปุ่มเดิม

        querySnapshot.forEach((doc) => {
            console.log(doc.id, " => ", doc.data());
            displayButtons(doc.data().text); // แสดงข้อมูลในหน้าเว็บ
        });
    } catch (error) {
        console.error("Error getting documents: ", error);
    }
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