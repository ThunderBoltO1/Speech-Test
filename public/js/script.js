// OAuth2
const CLIENT_ID = '271962080875-khc6aslq3phrnm9cqgguk37j0funtr7f.apps.googleusercontent.com';
const REDIRECT_URI = 'https://ramspeechtest.vercel.app';
const sheetId = "1YY1a1drCnfXrSNWrGBgrMaMlFQK5rzBOEoeMhW9MYm8";
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
const API_KEY = 'AIzaSyCugN1kot7Nij2PWhKsP08I6yeHNgsYrQI';

// ตัวแปร global
let buttonsByCategory = {};
let currentCategory = "ทั่วไป";  // เก็บหมวดหมู่ที่เลือกในขณะนี้

// ฟังก์ชันเปิด Modal เพิ่มคำ
function openModal() {
    // ตั้งค่า input เป็นค่าว่าง
    document.getElementById('buttonText').value = '';
    document.getElementById('modal').classList.remove('hidden');
}

// ฟังก์ชันปิด Modal เพิ่มคำ
function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

// ฟังก์ชันเพิ่มคำใหม่ในหมวดหมู่ที่เลือก
function addButton() {
    const newButtonText = document.getElementById('buttonText').value.trim();
    if (newButtonText === "") {
        alert("กรุณากรอกข้อความ");
        return;
    }

    // เพิ่มคำในหมวดหมู่ที่เลือก
    if (!buttonsByCategory[currentCategory]) {
        buttonsByCategory[currentCategory] = [];
    }
    buttonsByCategory[currentCategory].push(newButtonText);

    // แสดงปุ่มใหม่ในหมวดหมู่ที่เลือก
    loadButtons(currentCategory);

    // ปิด Modal
    closeModal();
}

// ฟังก์ชันโหลดคำจาก Google Sheets
function loadButtons(category) {
    const buttonContainer = document.getElementById("button-container");
    buttonContainer.innerHTML = '';  // เคลียร์ปุ่มเดิม

    const categoryButtons = buttonsByCategory[category];
    if (categoryButtons && categoryButtons.length > 0) {
        categoryButtons.forEach(function(word) {
            let button = document.createElement("button");
            button.className = "px-4 py-2 bg-blue-500 text-white rounded-lg transition-all duration-300 hover:bg-blue-600";
            button.innerText = word;
            button.onclick = () => speakText(word);
            buttonContainer.appendChild(button);
        });
    } else {
        console.log(`ไม่พบคำในหมวดหมู่ ${category}`);
    }
}

// ฟังก์ชันพูดข้อความ
function speakText(text) {
    if (responsiveVoice) {
        responsiveVoice.speak(text, "Thai Male");
    } else {
        alert("ไม่พบ ResponsiveVoice API");
    }
}

// ฟังก์ชันโหลดคำจาก Google Sheets (ปรับให้ใช้ access token)
function loadButtonsFromSheet(accessToken) {
    const commonUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/common?key=${API_KEY}`;
    const needUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/need?key=${API_KEY}`;

    fetch(commonUrl, {
        method: "GET",
        headers: { "Authorization": `Bearer ${accessToken}` }
    })
    .then(response => response.json())
    .then(data => {
        buttonsByCategory["ทั่วไป"] = data.values?.map(row => row[0]) || [];
        // เรียกใช้ฟังก์ชัน loadButtons สำหรับหมวดหมู่ทั่วไป
        loadButtons("ทั่วไป");
        return fetch(needUrl, {
            method: "GET",
            headers: { "Authorization": `Bearer ${accessToken}` }
        });
    })
    .then(response => response.json())
    .then(data => {
        buttonsByCategory["ความต้องการ"] = data.values?.map(row => row[0]) || [];
        // เรียกใช้ฟังก์ชัน loadButtons สำหรับหมวดหมู่ความต้องการ
        loadButtons("ความต้องการ");
    })
    .catch(error => {
        console.error("Error loading buttons:", error);
        alert("ไม่สามารถโหลดข้อมูลจาก Google Sheets ได้");
    });
}

// ฟังก์ชันตรวจสอบการ Login
function authenticate() {
    const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=token&scope=${SCOPES}`;
    window.location.href = authUrl;
}

// ฟังก์ชันจัดการ Token
function handleAuthResponse() {
    const params = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = params.get('access_token');
    if (accessToken) {
        console.log("Access Token:", accessToken);
        loadButtonsFromSheet(accessToken);
    } else {
        alert("การยืนยันตัวตนล้มเหลว กรุณาลองใหม่");
        authenticate();
    }
}

// โหลดข้อมูลเมื่อเริ่มหน้าเว็บ
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.hash.includes('access_token')) {
        handleAuthResponse();
    } else {
        authenticate();
    }
});

// ฟังก์ชันสำหรับเลือกหมวดหมู่
function setCategory(category) {
    currentCategory = category;
    loadButtons(category);
}
