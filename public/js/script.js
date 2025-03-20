// OAuth2
const CLIENT_ID = '271962080875-khc6aslq3phrnm9cqgguk37j0funtr7f.apps.googleusercontent.com';
const REDIRECT_URI = 'https://ramspeechtest.vercel.app';
const sheetId = "1YY1a1drCnfXrSNWrGBgrMaMlFQK5rzBOEoeMhW9MYm8";
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
const API_KEY = 'AIzaSyCugN1kot7Nij2PWhKsP08I6yeHNgsYrQI';

let accessToken = '';  // ตัวแปรสำหรับเก็บ access token

// ฟังก์ชันพูดคำที่ผสม
function speakMixedWord(text) {
    if (responsiveVoice) {
        responsiveVoice.speak(text, "Thai Male");
    } else {
        alert("ไม่พบ ResponsiveVoice API");
    }
}

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

    // ส่งคำใหม่ไปยัง Google Sheets
    const categorySheet = currentCategory === "ทั่วไป" ? "common" : "need";  // เลือก sheet ตามหมวดหมู่
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${categorySheet}!A:A:append?valueInputOption=RAW&key=${API_KEY}`;
    
    fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            values: [[newButtonText]]  // ส่งคำใหม่ในรูปแบบ array
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log("คำใหม่ถูกเพิ่มแล้ว:", data);
    })
    .catch(error => {
        console.error("ไม่สามารถเพิ่มคำไปยัง Google Sheets:", error);
        alert("ไม่สามารถเพิ่มคำไปยัง Google Sheets ได้");
    });

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
    accessToken = params.get('access_token');  // เก็บ access token ที่ได้รับ
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

    // ตรวจสอบว่ามี accessToken หรือไม่
    if (accessToken) {
        loadButtonsFromSheet(accessToken);
    } else {
        alert("กรุณายืนยันตัวตน");
    }
});

// ฟังก์ชันสำหรับเลือกหมวดหมู่
function setCategory(category) {
    currentCategory = category;
    loadButtons(category);
}

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
    const word3Select = document.getElementById('word3');
    const word4Select = document.getElementById('word4');
    const word5Select = document.getElementById('word5');
    const word6Select = document.getElementById('word6');

    word1Select.innerHTML = '<option value="">เลือกคำ</option>';
    word2Select.innerHTML = '<option value="">เลือกคำ</option>';
    word3Select.innerHTML = '<option value="">เลือกคำ</option>';
    word4Select.innerHTML = '<option value="">เลือกคำ</option>';
    word5Select.innerHTML = '<option value="">เลือกคำ</option>';
    word6Select.innerHTML = '<option value="">เลือกคำ</option>';
    
    allWords.forEach(word => {
        const option1 = document.createElement('option');
        option1.value = word;
        option1.textContent = word;
        word1Select.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = word;
        option2.textContent = word;
        word2Select.appendChild(option2);

        const option3 = document.createElement('option');
        option3.value = word;
        option3.textContent = word;
        word3Select.appendChild(option3);

        const option4 = document.createElement('option');
        option4.value = word;
        option4.textContent = word;
        word4Select.appendChild(option4);

        const option5 = document.createElement('option');
        option5.value = word;
        option5.textContent = word;
        word5Select.appendChild(option5);

        const option6 = document.createElement('option');
        option6.value = word;
        option6.textContent = word;
        word6Select.appendChild(option6);
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
    const word3 = document.getElementById('word3').value;
    const word4 = document.getElementById('word4').value;
    const word5 = document.getElementById('word5').value;
    const word6 = document.getElementById('word6').value;
    
    if (!word1 || !word2) {
        alert("กรุณาเลือกคำทั้งสองคำ");
        return;
    }
    
    const mixedWord = word1 + " " + word2 + " " + word3 + " " + word4 + " " + word5 + " " + word6;

    // Show Mix Word
    document.getElementById('mix-result').innerHTML = `
        <h1 class="text-2xl font-bold mt-4">${mixedWord}</h1>
        <button onclick="speakMixedWord('${mixedWord}')" class="mt-2 px-4 py-2 bg-green-500 text-white rounded-lg hover-bg-green-300">พูด</button>
    `;

    closeMixModal();
}