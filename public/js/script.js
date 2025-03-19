// OAuth2
const CLIENT_ID = '271962080875-khc6aslq3phrnm9cqgguk37j0funtr7f.apps.googleusercontent.com';
const REDIRECT_URI = 'https://ramspeechtest.vercel.app';
const sheetId = "1YY1a1drCnfXrSNWrGBgrMaMlFQK5rzBOEoeMhW9MYm8";
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
const API_KEY = 'AIzaSyCugN1kot7Nij2PWhKsP08I6yeHNgsYrQI';

// ตัวแปร global เพื่อเก็บข้อมูลปุ่มตามหมวดหมู่
let buttonsByCategory = {};

// ฟังก์ชันที่ใช้ในการเริ่มต้น OAuth2 Flow
function authenticate() {
    const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=${encodeURIComponent(SCOPES)}`;
    window.location.href = authUrl;
}

// เมื่อได้รับ access_token จากการยืนยันตัวตน
function handleAuthResponse() {
    const params = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = params.get('access_token');
    if (accessToken) {
        console.log("Access Token:", accessToken);
        loadButtonsFromSheet(accessToken);
    } else {
        console.error('Authorization failed: No access token found');
        alert("การยืนยันตัวตนล้มเหลว กรุณาลองอีกครั้ง");
        authenticate();
    }
}

// ฟังก์ชันสำหรับโหลดปุ่มจาก Google Sheets
function loadButtonsFromSheet(accessToken) {
    const categories = { "ทั่วไป": "common", "ความต้องการ": "need" };
    let promises = Object.entries(categories).map(([key, sheetName]) => {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}?key=${API_KEY}`;
        return fetch(url, {
            method: "GET",
            headers: { "Authorization": `Bearer ${accessToken}` }
        })
        .then(response => response.json())
        .then(data => {
            buttonsByCategory[key] = data.values?.map(row => row[0]) || [];
        })
        .catch(error => console.error(`Error loading ${sheetName} sheet:`, error));
    });

    Promise.all(promises).then(() => loadButtons("ทั่วไป"));
}

// ฟังก์ชันแสดงปุ่มตามหมวดหมู่
function loadButtons(category) {
    const container = document.getElementById('button-container');
    container.innerHTML = "";
    
    if (buttonsByCategory[category]?.length) {
        buttonsByCategory[category].forEach(text => {
            const button = document.createElement('button');
            button.textContent = text;
            button.className = 'bg-blue-500 text-white px-6 py-3 rounded text-sm hover:bg-blue-600 transition-all duration-300';
            button.onclick = () => speakText(text);
            container.appendChild(button);
        });
    } else {
        container.innerHTML = "<p>ไม่มีปุ่มในหมวดหมู่นี้</p>";
    }

    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active', 'bg-blue-500', 'text-white'));
    document.getElementById(`nav-${category === "ทั่วไป" ? "common" : "need"}`).classList.add('active', 'bg-blue-500', 'text-white');
}

// ฟังก์ชันสำหรับพูดข้อความ
function speakText(text) {
    if (typeof responsiveVoice !== "undefined" && responsiveVoice.voiceSupport()) {
        responsiveVoice.speak(text, "Thai Male");
    } else {
        alert("ResponsiveVoice not loaded properly.");
    }
}

window.onload = function() {
    if (window.location.hash) {
        handleAuthResponse();
    } else {
        authenticate();
    }
    document.getElementById('nav-common').classList.add('active', 'bg-blue-500', 'text-white');
};