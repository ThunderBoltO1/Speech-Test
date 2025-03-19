// OAuth2
const CLIENT_ID = '271962080875-khc6aslq3phrnm9cqgguk37j0funtr7f.apps.googleusercontent.com';
const REDIRECT_URI = process.env.REDIRECT_URI || 'https://ramspeechtest.vercel.app';
const sheetId = "1YY1a1drCnfXrSNWrGBgrMaMlFQK5rzBOEoeMhW9MYm8";
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
const API_KEY = 'AIzaSyCugN1kot7Nij2PWhKsP08I6yeHNgsYrQI';
require('dotenv').config();

// ตัวแปร global เพื่อเก็บข้อมูลปุ่มตามหมวดหมู่
let buttonsByCategory = {};

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
        console.log("Access Token:", accessToken); // Debug: ตรวจสอบ access_token
        loadButtonsFromSheet(accessToken);
    } else {
        console.error('Authorization failed: No access token found');
        alert("การยืนยันตัวตนล้มเหลว กรุณาลองอีกครั้ง");
        authenticate(); // เริ่มกระบวนการ OAuth2 ใหม่
    }
}

// ฟังก์ชันที่ใช้ในการเพิ่มข้อมูลใน Google Sheets
function addDataToSheet(accessToken, category, text) {
    // เลือก sheet ตามหมวดหมู่
    const sheetName = category === "ทั่วไป" ? "common" : "need";
    const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}:append?valueInputOption=RAW&key=${API_KEY}`;

    const data = {
        values: [
            [text]  // เพิ่มข้อมูลลงในแถวใหม่
        ]
    };

    return fetch(sheetUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }
        return response.json();
    })
    .then(data => {
        console.log("Data added to Google Sheets:", data);
        
    })
    .catch(error => {
        console.error("Error adding data to Google Sheets:", error);
        alert("เกิดข้อผิดพลาดในการเพิ่มข้อมูล");
    });
}

// ฟังก์ชันสำหรับเพิ่มปุ่มใหม่
function addButton() {
    const userInput = document.getElementById('buttonText').value.trim();
    if (!userInput) {
        alert("กรุณากรอกข้อความก่อน!");
        return;
    }

    const activeNavLink = document.querySelector('.nav-link.active');
if (!activeNavLink) {
    console.warn("No active nav link found, setting default category to 'ทั่วไป'");
    alert("ไม่พบหมวดหมู่ที่เลือก กำหนดเป็น 'ทั่วไป'");
    loadButtons("ทั่วไป"); // โหลดปุ่ม "ทั่วไป" เป็นค่าเริ่มต้น
    return;
}

    const category = activeNavLink.textContent; // หมวดหมู่ที่เลือก
    const accessToken = new URLSearchParams(window.location.hash.substring(1)).get('access_token');
    if (accessToken) {
        addDataToSheet(accessToken, category, userInput)
            .then(() => {
                // เพิ่มปุ่มใหม่ในหมวดหมู่ที่เลือก
                if (!buttonsByCategory[category]) {
                    buttonsByCategory[category] = [];
                }
                buttonsByCategory[category].push(userInput);
                loadButtons(category); // โหลดปุ่มใหม่
                document.getElementById('buttonText').value = ''; // ล้างช่องกรอกข้อความ
                closeModal(); // ปิด Modal
            })
            .catch(error => {
                console.error("Error adding button:", error);
                alert("เกิดข้อผิดพลาดในการเพิ่มปุ่ม");
            });
    } else {
        console.error("Access token not found");
        authenticate(); // เริ่มกระบวนการ OAuth2 ใหม่
    }
}       {
        authenticate();
    }

// ฟังก์ชันสำหรับโหลดปุ่มจาก Google Sheets
function loadButtonsFromSheet(accessToken) {
    // โหลดข้อมูลจาก common (ทั่วไป) และ need (ความต้องการ)
    const commonUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/common?key=${API_KEY}`;
    const needUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/need?key=${API_KEY}`;

    // โหลดข้อมูลจาก common
    fetch(commonUrl, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${accessToken}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Failed to load common sheet: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        buttonsByCategory["ทั่วไป"] = data.values?.map(row => row[0]) || [];
        // โหลดข้อมูลจาก need
        return fetch(needUrl, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${accessToken}`
            }
        });
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Failed to load need sheet: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        buttonsByCategory["ความต้องการ"] = data.values?.map(row => row[0]) || [];
        // โหลดปุ่มหมวดหมู่ "ทั่วไป" เป็นค่าเริ่มต้น
        loadButtons("ทั่วไป");
    })
    .catch(error => {
        console.error("Error loading buttons from Google Sheets:", error);
        alert("ไม่สามารถโหลดข้อมูลจาก Google Sheets ได้: " + error.message);
    });
}

// ฟังก์ชันแสดงปุ่มตามหมวดหมู่
function loadButtons(category) {
    const container = document.getElementById('button-container');
    container.innerHTML = ""; // ล้างปุ่มเก่าทั้งหมด

    // แสดงปุ่มตามหมวดหมู่ที่เลือก
    if (buttonsByCategory[category]) {
        buttonsByCategory[category].forEach(text => {
            const button = document.createElement('button');
            button.textContent = text;
            button.classList.add(
                'bg-blue-500', 'text-white', 'px-6', 'py-3', 'rounded', 
                'text-sm', 'sm:text-base', 'md:text-lg', 'hover:bg-blue-600', 
                'transition-all', 'duration-300', 'focus:outline-none'
            );
            button.onclick = () => speakText(text);
            container.appendChild(button);
        });
    }

    // เปลี่ยนสีพื้นหลังของ Nav Link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active', 'bg-blue-500', 'text-white');
        link.classList.add('text-gray-700', 'hover:bg-blue-500', 'hover:text-white');
    });
    const activeNav = document.getElementById(`nav-${category === "ทั่วไป" ? "common" : category === "ความต้องการ" ? "need" : "fav"}`);
    activeNav.classList.add('active', 'bg-blue-500', 'text-white');
    activeNav.classList.remove('text-gray-700', 'hover:bg-blue-500', 'hover:text-white');
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
    
    // ตั้งค่า active ให้ปุ่ม "ทั่วไป" ตั้งแต่แรก
    document.getElementById('nav-common').classList.add('active', 'bg-blue-500', 'text-white');
};