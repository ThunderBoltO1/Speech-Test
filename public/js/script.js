const CLIENT_ID = '271962080875-khc6aslq3phrnm9cqgguk37j0funtr7f.apps.googleusercontent.com';
const REDIRECT_URI = 'https://ramspeechtest.vercel.app';
const sheetId = "1YY1a1drCnfXrSNWrGBgrMaMlFQK5rzBOEoeMhW9MYm8"; 
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
const API_KEY = 'AIzaSyCugN1kot7Nij2PWhKsP08I6yeHNgsYrQI';  // แทนที่ด้วย API Key ของคุณ

// ฟังก์ชันที่ใช้ในการเริ่มต้น OAuth2 Flow
function authenticate() {
    const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=token&scope=${SCOPES}`;
    window.location.href = authUrl;
}

// เมื่อได้รับ access_token จากการยืนยันตัวตน
function handleAuthResponse() {
    const params = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = params.get('access_token');
    if (accessToken) {
        // เรียกใช้ฟังก์ชันตรวจสอบข้อมูล
        checkDataExistsAndAdd(accessToken);
    } else {
        console.error('Authorization failed');
    }
}

// ฟังก์ชันเช็คข้อมูลใน Google Sheets และเพิ่มข้อมูลถ้าไม่มี
function checkDataExistsAndAdd(accessToken) {
    const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1?key=${API_KEY}`;

    fetch(sheetUrl, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${accessToken}`
        }
    })
    .then(response => response.json())
    .then(data => {
        const existingData = data.values || [];
        const newText = 'Your data to append'; // ข้อความที่คุณจะเพิ่ม
        const isExisting = existingData.some(row => row[0] === newText);

        if (!isExisting) {
            // ถ้าไม่มีข้อมูลนี้ในแผ่นงาน, ให้เพิ่มข้อมูลใหม่
            addDataToSheet(accessToken, newText);
        } else {
            console.log("ข้อมูลนี้มีอยู่แล้วใน Google Sheets");
        }
    })
    .catch(error => console.error("Error checking existing data:", error));
}

// ฟังก์ชันที่ใช้ในการเพิ่มข้อมูลใน Google Sheets
function addDataToSheet(accessToken, text) {
    const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1:append?valueInputOption=RAW&key=${API_KEY}`;

    const data = {
        values: [
            [text]  // เพิ่มข้อมูลลงในแถวใหม่
        ]
    };

    fetch(sheetUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        console.log("Data added to Google Sheets:", data);
    })
    .catch(error => console.error("Error adding data to Google Sheets:", error));
}

// ฟังก์ชันสำหรับเพิ่มปุ่มใหม่
function addButton() {
    const userInput = document.getElementById('buttonText').value.trim();

    if (userInput) {
        // สร้างปุ่มใหม่
        const newButton = document.createElement('button');
        newButton.textContent = userInput;
        newButton.classList.add('bg-blue-500', 'text-white', 'px-6', 'py-3', 'rounded', 'text-sm', 'sm:text-base', 'md:text-lg');
        newButton.onclick = function() {
            speakText(userInput);
        };

        // หาตำแหน่งของ button-container
        const container = document.getElementById('button-container');

        // เพิ่มปุ่มใหม่เข้าไปใน container
        container.appendChild(newButton);

        // ปิด modal
        closeModal();

        // ล้างค่าในฟอร์ม
        document.getElementById('buttonText').value = '';

        // เช็คว่า access_token มีอยู่หรือไม่
        const accessToken = sessionStorage.getItem('access_token');
        if (accessToken) {
            // ถ้ามี access_token ให้เพิ่มข้อมูลลงใน Google Sheets
            addDataToSheet(accessToken, userInput);
        } else {
            // ถ้าไม่มี access_token ให้เริ่มต้น OAuth2 Flow
            authenticate();
        }
    } else {
        alert("กรุณากรอกข้อความก่อน!");
    }
}

// ฟังก์ชันแสดง modal
function showModal() {
    document.getElementById('modal').classList.remove('hidden');
}

// ฟังก์ชันปิด modal
function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

// ฟังก์ชันสำหรับพูดข้อความ
function speakText(text) {
    if (typeof responsiveVoice !== "undefined") {
        responsiveVoice.speak(text, "Thai Male");
    } else {
        alert("ResponsiveVoice not loaded properly.");
    }
}

// เรียกใช้ handleAuthResponse เมื่อโหลดหน้าจอ
window.onload = function() {
    if (window.location.hash) {
        handleAuthResponse();
    }
};