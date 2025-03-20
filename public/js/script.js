// OAuth2
const CLIENT_ID = '271962080875-khc6aslq3phrnm9cqgguk37j0funtr7f.apps.googleusercontent.com';
const REDIRECT_URI = 'https://ramspeechtest.vercel.app';
const sheetId = "1YY1a1drCnfXrSNWrGBgrMaMlFQK5rzBOEoeMhW9MYm8";
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
const API_KEY = 'AIzaSyCugN1kot7Nij2PWhKsP08I6yeHNgsYrQI';

let accessToken = '';  // Store access token

// Global variable
let buttonsByCategory = {};
let currentCategory = "ทั่วไป";  // Default category

// Function to speak mixed words
function speakMixedWord(text) {
    if (responsiveVoice) {
        responsiveVoice.speak(text, "Thai Male");
    } else {
        alert("ไม่พบ ResponsiveVoice API");
    }
}

// Function to open modal for adding a new word
function openModal() {
    document.getElementById('buttonText').value = '';
    document.getElementById('modal').classList.remove('hidden');
}

// Function to close modal
function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

// Function to open MixModal
function openMixModal() {
    document.getElementById('mix-modal').classList.remove('hidden');
    loadWordsForMixing();  // Load words from current category to buttons
}

// Function to close MixModal
function closeMixModal() {
    document.getElementById('mix-modal').classList.add('hidden');
}

function addButton() {
    const newButtonText = document.getElementById('buttonText').value.trim();
    if (newButtonText === "") {
        alert("กรุณากรอกข้อความ");
        return;
    }

    // เพิ่มคำใหม่ในหมวดหมู่ที่เลือก
    if (!buttonsByCategory[currentCategory]) {
        buttonsByCategory[currentCategory] = [];
    }
    buttonsByCategory[currentCategory].push(newButtonText);

    // อัปเดตปุ่มในหมวดหมู่ที่เลือก
    setCategory(currentCategory);

    // กำหนดชื่อ sheet ที่ต้องการเพิ่มคำใหม่ตามหมวดหมู่
    const categorySheet = currentCategory === "ทั่วไป" ? "common" : 
                          currentCategory === "ความต้องการ" ? "need" : 
                          currentCategory === "คลัง" ? "storage" : "common"; // เพิ่มหมวด "คลัง" 

    // API URL สำหรับการเพิ่มคำใน Google Sheets ตามหมวดหมู่ที่เลือก
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

    closeModal();
}

// Function to load buttons based on category
function loadButtons(category) {
    const buttonContainer = document.getElementById("button-container");
    buttonContainer.innerHTML = '';  // Clear previous buttons

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

// Function to speak selected text
function speakText(text) {
    if (responsiveVoice) {
        responsiveVoice.speak(text, "Thai Male");
    } else {
        alert("ไม่พบ ResponsiveVoice API");
    }
}

// Function to load buttons from Google Sheets
function loadButtonsFromSheet(accessToken) {
    const commonUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/common?key=${API_KEY}`;
    const needUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/need?key=${API_KEY}`;
    const storageUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/storage?key=${API_KEY}`;
    
    fetch(commonUrl, {
        method: "GET",
        headers: { "Authorization": `Bearer ${accessToken}` }
    })
    .then(response => response.json())
    .then(data => {
        buttonsByCategory["ทั่วไป"] = data.values?.map(row => row[0]) || [];
        loadButtons("ทั่วไป");
        return fetch(needUrl, {
            method: "GET",
            headers: { "Authorization": `Bearer ${accessToken}` }
        });
    })
    .then(response => response.json())
    .then(data => {
        buttonsByCategory["ความต้องการ"] = data.values?.map(row => row[0]) || [];
        loadButtons("ความต้องการ");
        return fetch(storageUrl, {
            method: "GET",
            headers: { "Authorization": `Bearer ${accessToken}` }
        });
    })
    .then(response => response.json())
    .then(data => {
        buttonsByCategory["คลัง"] = data.values?.map(row => row[0]) || [];
        loadButtons("คลัง");  // เรียกใช้ loadButtons สำหรับ "คลัง" หลังจากดึงข้อมูล
    })
    .catch(error => {
        console.error("Error loading buttons:", error);
        alert("ไม่สามารถโหลดข้อมูลจาก Google Sheets ได้");
    });
}

// Function to handle authentication
function authenticate() {
    const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=token&scope=${SCOPES}`;
    window.location.href = authUrl;
}

// Function to handle the authentication response
function handleAuthResponse() {
    const params = new URLSearchParams(window.location.hash.substring(1));
    accessToken = params.get('access_token');
    if (accessToken) {
        console.log("Access Token:", accessToken);
        loadButtonsFromSheet(accessToken);
    } else {
        alert("การยืนยันตัวตนล้มเหลว กรุณาลองใหม่");
        authenticate();
    }
}

// Function to initialize the page
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.hash.includes('access_token')) {
        handleAuthResponse();
    } else {
        authenticate();
    }

    if (accessToken) {
        loadButtonsFromSheet(accessToken);
    } else {
        console.log("กรุณายืนยันตัวตน");
    }
});

// ฟังก์ชันสำหรับเลือกหมวดหมู่และเปลี่ยนสีพื้นหลัง
function setCategory(category) {
    currentCategory = category;
    loadButtons(category);
    changeBackgroundColor(category);
}

// ฟังก์ชันการเปลี่ยนสีพื้นหลังตามหมวดหมู่
function changeBackgroundColor(category) {
    const body = document.body;
    switch (category) {
        case "ทั่วไป":
            body.style.backgroundColor = "#f0f4f8"; // Light blue for "ทั่วไป"
            break;
        case "ความต้องการ":
            body.style.backgroundColor = "#fffbf0"; // Light yellow for "ความต้องการ"
            break;
        case "คลัง":
            body.style.backgroundColor = "#f0f8f0"; // Light green for "คลัง"
            break;
        default:
            body.style.backgroundColor = "#ffffff"; // White background as default
            break;
    }
}

// ฟังก์ชันการผสมคำ
let selectedWords = [];
function mixWords() {
    if (selectedWords.length < 2) {
        alert("กรุณาเลือกคำอย่างน้อย 2 คำ");
        return;
    }
    
    const mixedWord = selectedWords.join(" ");  // รวมคำที่เลือก

    // แสดงผลลัพธ์ที่ผสม
    document.getElementById('mix-result').innerHTML = `
        <h1 class="text-2xl font-bold mt-4">${mixedWord}</h1>
        <button onclick="speakMixedWord('${mixedWord}')" class="mt-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-300">พูด</button>
    `;

    // เลือก sheet ตามหมวดหมู่ที่ผู้ใช้เลือก
    const categorySheet = currentCategory === "คลัง" ? "storage" : currentCategory === "ความต้องการ" ? "need" : "common"; 

    // ส่งคำผสมไปยัง Google Sheets (ตามหมวดหมู่ที่ผู้ใช้เลือก)
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${categorySheet}!A:A:append?valueInputOption=RAW&key=${API_KEY}`;
    
    fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            values: [[mixedWord]]  // ส่งคำผสมในรูปแบบ array
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log("คำผสมถูกเพิ่มแล้ว:", data);
    })
    .catch(error => {
        console.error("ไม่สามารถเพิ่มคำผสมไปยัง Google Sheets:", error);
        alert("ไม่สามารถเพิ่มคำผสมไปยัง Google Sheets ได้");
    });

    // ปิดโมดัลหลังจากผสมคำเสร็จ
    closeMixModal();  // ปิดโมดัลโดยอัตโนมัติ
}

// ฟังก์ชันโหลดคำสำหรับผสมจาก Google Sheets
function loadWordsForMixing() {
    const wordButtonsContainer = document.getElementById('word-buttons');
    wordButtonsContainer.innerHTML = ''; // ล้างปุ่มเก่า

    // ดึงข้อมูลจากหมวดหมู่ที่เลือกในปัจจุบัน
    const categoryWords = buttonsByCategory[currentCategory];

    if (categoryWords && categoryWords.length > 0) {
        categoryWords.forEach(function(word) {
            let button = document.createElement("button");
            button.className = "px-4 py-2 bg-blue-500 text-white rounded-lg transition-all duration-300 hover:bg-blue-600";
            button.innerText = word;
            button.onclick = () => selectWordForMixing(word);
            wordButtonsContainer.appendChild(button);
        });
    } else {
        console.log(`ไม่พบคำในหมวดหมู่ ${currentCategory}`);
    }
}

// ฟังก์ชันเลือกคำสำหรับการผสม
function selectWordForMixing(word) {
    if (selectedWords.includes(word)) {
        selectedWords = selectedWords.filter(w => w !== word); // Remove word if already selected
    } else {
        selectedWords.push(word); // Add word to selectedWords array
    }

    // Update UI to show selected words
    console.log("Selected Words:", selectedWords);
}