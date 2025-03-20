// OAuth2
const CLIENT_ID = '271962080875-khc6aslq3phrnm9cqgguk37j0funtr7f.apps.googleusercontent.com';
const REDIRECT_URI = 'https://ramspeechtest.vercel.app';
const sheetId = "1YY1a1drCnfXrSNWrGBgrMaMlFQK5rzBOEoeMhW9MYm8";
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
const API_KEY = 'AIzaSyCugN1kot7Nij2PWhKsP08I6yeHNgsYrQI';

// ตัวแปร global
let buttonsByCategory = {};

// ฟังก์ชันเปิด Modal ผสมคำ
function openMixModal() {
    const allWords = [];
    for (const category in buttonsByCategory) {
        if (buttonsByCategory[category]) {
            allWords.push(...buttonsByCategory[category]);
        }
    }
    
    const word1Select = document.getElementById('word1');
    const word2Select = document.getElementById('word2');
    word1Select.innerHTML = '<option value="">เลือกคำ</option>';
    word2Select.innerHTML = '<option value="">เลือกคำ</option>';
    
    allWords.forEach(word => {
        const option1 = document.createElement('option');
        option1.value = word;
        option1.textContent = word;
        word1Select.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = word;
        option2.textContent = word;
        word2Select.appendChild(option2);
    });

    document.getElementById('mix-modal').classList.remove('hidden');
}

// ฟังก์ชันปิด Modal ผสมคำ
function closeMixModal() {
    document.getElementById('mix-modal').classList.add('hidden');
}

// ฟังก์ชันผสมคำ
function mixWords() {
    const word1 = document.getElementById('word1').value;
    const word2 = document.getElementById('word2').value;
    
    if (!word1 || !word2) {
        alert("กรุณาเลือกคำทั้งสองคำ");
        return;
    }
    
    const mixedWord = word1 + " " + word2;

    // แสดงผลลัพธ์ใน h1 และปุ่มพูด
    document.getElementById('mix-result').innerHTML = `
        <h1 class="text-2xl font-bold mt-4">${mixedWord}</h1>
        <button onclick="speakMixedWord('${mixedWord}')" class="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">พูด</button>
    `;

    closeMixModal();
}

// ฟังก์ชันพูดคำที่ผสม
function speakMixedWord(text) {
    if (window.responsiveVoice) {
        window.responsiveVoice.speak(text, "Thai Female");
    } else {
        alert("ไม่พบ ResponsiveVoice API");
    }
}

// ฟังก์ชันโหลดคำจาก Google Sheets
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
        return fetch(needUrl, {
            method: "GET",
            headers: { "Authorization": `Bearer ${accessToken}` }
        });
    })
    .then(response => response.json())
    .then(data => {
        buttonsByCategory["ความต้องการ"] = data.values?.map(row => row[0]) || [];
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