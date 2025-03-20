// OAuth2
const CLIENT_ID = '271962080875-khc6aslq3phrnm9cqgguk37j0funtr7f.apps.googleusercontent.com';
const REDIRECT_URI = 'https://ramspeechtest.vercel.app';
const sheetId = "1YY1a1drCnfXrSNWrGBgrMaMlFQK5rzBOEoeMhW9MYm8";
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
const API_KEY = 'AIzaSyCugN1kot7Nij2PWhKsP08I6yeHNgsYrQI';

let accessToken = '';  // ตัวแปรสำหรับเก็บ access token

let selectedWords = [];

// ฟังก์ชันพูดคำที่ผสม
function speakMixedWord(text) {
    if (window.responsiveVoice) {
        window.responsiveVoice.speak(text, "Thai Male");
    } else {
        alert("ไม่พบ ResponsiveVoice API");
    }
}

// ตัวแปร global
let buttonsByCategory = {};
let currentCategory = "ทั่วไป";  // เก็บหมวดหมู่ที่เลือกในขณะนี้

// ฟังก์ชันเปิด Modal เพิ่มคำ
function openModal() {
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
    const categorySheet = currentCategory === "ทั่วไป" ? "common" : (currentCategory === "ความต้องการ" ? "need" : "storage");
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

// ฟังก์ชันโหลดคำจาก Google Sheets
function loadButtons(category) {
    const buttonContainer = document.getElementById("button-container");
    buttonContainer.innerHTML = '';  // เคลียร์ปุ่มเดิม

    const categoryButtons = buttonsByCategory[category];
    if (categoryButtons && categoryButtons.length > 0) {
        categoryButtons.forEach(function(word) {
            let button = document.createElement("button");
            button.className = "px-4 py-2 bg-blue-500 text-white rounded-lg transition-all duration-300 hover:bg-blue-600 m-2";
            button.innerText = word;
            button.onclick = () => selectWord(word);
            buttonContainer.appendChild(button);
        });
    } else {
        console.log(`ไม่พบคำในหมวดหมู่ ${category}`);
    }
}

// ฟังก์ชันเลือกคำ
function selectWord(word) {
    if (!selectedWords.includes(word)) {
        if (selectedWords.length < 6) {  // จำกัดให้เลือกได้แค่ 6 คำ
            selectedWords.push(word);
            updateSelectedWords();
        } else {
            alert("คุณสามารถเลือกได้สูงสุด 6 คำ");
        }
    } else {
        alert("คุณเลือกคำนี้แล้ว");
    }
}

// ฟังก์ชันอัปเดตการแสดงคำที่เลือก
function updateSelectedWords() {
    const selectedWordsContainer = document.getElementById("selected-words");
    selectedWordsContainer.innerHTML = "";  // เคลียร์การแสดงผลเก่า

    selectedWords.forEach(word => {
        const wordElement = document.createElement("span");
        wordElement.className = "px-2 py-1 bg-gray-300 text-black rounded-lg m-1";
        wordElement.innerText = word;
        selectedWordsContainer.appendChild(wordElement);
    });
}

// ฟังก์ชันบันทึกคำที่ผสมลงใน Google Sheet
function saveMixedWordToSheet(mixedWord) {
    const storageUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/storage!A:A:append?valueInputOption=RAW&key=${API_KEY}`;

    fetch(storageUrl, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            values: [[mixedWord]]  // ส่งคำที่ผสมในรูปแบบ array
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log("คำที่ผสมถูกบันทึกแล้ว:", data);

        // อัปเดตข้อมูลในหมวดหมู่ "storage"
        if (!buttonsByCategory["storage"]) {
            buttonsByCategory["storage"] = [];
        }
        buttonsByCategory["storage"].push(mixedWord);

        // โหลดปุ่มหมวดหมู่ "storage" ใหม่
        loadButtons("storage");
    })
    .catch(error => {
        console.error("ไม่สามารถบันทึกคำที่ผสม:", error);
        alert("ไม่สามารถบันทึกคำที่ผสมได้");
    });
}

// ฟังก์ชันผสมคำ
function mixWords() {
    if (selectedWords.length < 2) {
        alert("กรุณาเลือกคำอย่างน้อย 2 คำเพื่อผสม");
        return;
    }

    const mixedWord = selectedWords.join(" ");  // ผสมคำทั้งหมดที่เลือก

    // แสดงผลคำที่ผสมในหน้าเว็บ พร้อมปุ่ม "พูด"
    document.getElementById('mix-result').innerHTML = `
        <h1 class="text-2xl font-bold mt-4">${mixedWord}</h1>
        <button onclick="speakMixedWord('${mixedWord}')" class="mt-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">พูด</button>
    `;

    // บันทึกคำที่ผสมลงใน Google Sheet
    saveMixedWordToSheet(mixedWord);

    // เคลียร์คำที่เลือก
    selectedWords = [];
    updateSelectedWords();

    closeMixModal();  // ปิด Modal ผสมคำ
}

// ฟังก์ชันโหลดคำจาก Google Sheets (ปรับให้ใช้ access token)
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
        buttonsByCategory["storage"] = data.values?.map(row => row[0]) || [];
        loadButtons("storage");
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

    document.getElementById('mix-modal').classList.remove('hidden');
}

// ฟังก์ชันปิด Modal ผสมคำ
function closeMixModal() {
    document.getElementById('mix-modal').classList.add('hidden');
}