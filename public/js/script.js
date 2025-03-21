// OAuth2
const CLIENT_ID = '271962080875-khc6aslq3phrnm9cqgguk37j0funtr7f.apps.googleusercontent.com';
const REDIRECT_URI = 'https://ramspeechtest.vercel.app';
const sheetId = "1YY1a1drCnfXrSNWrGBgrMaMlFQK5rzBOEoeMhW9MYm8";
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
const API_KEY = 'AIzaSyCugN1kot7Nij2PWhKsP08I6yeHNgsYrQI';

let accessToken = '';  // Store access token
let buttonsByCategory = {};
let currentCategory = "ทั่วไป";  // Default category
let selectedWords = [];  // Array to hold selected words for mixing

// ฟังก์ชันพูดคำที่ผสม
function speakMixedWord(text) {
    if (responsiveVoice) {
        responsiveVoice.speak(text, "Thai Male");
    } else {
        alert("ไม่พบ ResponsiveVoice API");
    }
}

// ฟังก์ชันเปลี่ยนหมวดหมู่
function setCategory(category) {
    currentCategory = category;
    loadWordsForMixing();
    changeBackgroundColor(category);
}

// ฟังก์ชันเปลี่ยนสีพื้นหลังตามหมวดหมู่
function changeBackgroundColor(category) {
    const body = document.body;
    switch (category) {
        case "ทั่วไป":
            body.style.backgroundColor = "#f0f4f8";
            break;
        case "ความต้องการ":
            body.style.backgroundColor = "#fffbf0";
            break;
        case "คลัง":
            body.style.backgroundColor = "#f0f8f0";
            break;
        default:
            body.style.backgroundColor = "#ffffff";
            break;
    }
}

// ฟังก์ชันดึงข้อมูลจาก Google Sheets และแสดงเป็นปุ่ม
function loadWordsForMixing() {
    const wordButtonsContainer = document.getElementById('word-buttons-container');
    if (!wordButtonsContainer) {
        console.error('ไม่พบ container สำหรับปุ่มคำ!');
        return;
    }

    // ล้างปุ่มเก่าก่อนโหลดใหม่
    wordButtonsContainer.innerHTML = '';

    // เลือก sheet ตามหมวดหมู่
    const categorySheet = currentCategory === "ทั่วไป" ? "common" :
                          currentCategory === "ความต้องการ" ? "need" :
                          currentCategory === "คลัง" ? "storage" : "common";

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${categorySheet}?key=${API_KEY}`;
    
    fetch(url, {
        method: "GET",
        headers: { "Authorization": `Bearer ${accessToken}` }
    })
    .then(response => response.json())
    .then(data => {
        const words = data.values?.map(row => row[0]) || [];
        buttonsByCategory[currentCategory] = words;

        if (words.length > 0) {
            words.forEach(word => {
                let button = document.createElement("button");
                button.className = "px-4 py-2 bg-blue-500 text-white rounded-lg transition-all duration-300 hover:bg-blue-600 m-1";
                button.innerText = word;
                button.onclick = () => selectWordForMixing(word);
                wordButtonsContainer.appendChild(button);
            });
        } else {
            console.log(`ไม่พบคำในหมวดหมู่ ${currentCategory}`);
        }
    })
    .catch(error => {
        console.error("ไม่สามารถโหลดข้อมูลจาก Google Sheets:", error);
        alert("ไม่สามารถโหลดข้อมูลจาก Google Sheets ได้");
    });
}

// ฟังก์ชันเลือกคำ
function selectWordForMixing(word) {
    if (selectedWords.includes(word)) {
        selectedWords = selectedWords.filter(w => w !== word);
    } else {
        selectedWords.push(word);
    }

    console.log("คำที่เลือก:", selectedWords);
}

// ฟังก์ชันผสมคำ
function mixWords() {
    if (selectedWords.length < 2) {
        alert("กรุณาเลือกคำอย่างน้อย 2 คำ");
        return;
    }

    const mixedWord = selectedWords.join(" ");

    // แสดงคำที่ผสม
    document.getElementById('mix-result').innerHTML = `
        <h1 class="text-2xl font-bold mt-4">${mixedWord}</h1>
        <button onclick="speakMixedWord('${mixedWord}')" class="mt-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-300">พูด</button>
    `;

    // บันทึกคำผสมไปยัง Google Sheets
    const categorySheet = currentCategory === "คลัง" ? "storage" :
                          currentCategory === "ความต้องการ" ? "need" : "storage";

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${categorySheet}!A:A:append?valueInputOption=RAW&key=${API_KEY}`;
    
    fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            values: [[mixedWord]]
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

    closeMixModal();
}

// ฟังก์ชันปิดโมดัล
function closeMixModal() {
    document.getElementById('mix-modal').classList.add('hidden');
}