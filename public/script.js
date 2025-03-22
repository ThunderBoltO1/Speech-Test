// OAuth2
const CLIENT_ID = '271962080875-dr9uild15rad3n86816nmfq5ms7mj95o.apps.googleusercontent.com';
const REDIRECT_URI = 'https://speech-test-nine.vercel.app';
const sheetId = "1YY1a1drCnfXrSNWrGBgrMaMlFQK5rzBOEoeMhW9MYm8";
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
const API_KEY = 'AIzaSyCugN1kot7Nij2PWhKsP08I6yeHNgsYrQI';

let accessToken = '';  
let tokenExpiry = null; // เพิ่มการเก็บเวลาหมดอายุ token
let buttonsByCategory = {};
let currentCategory = "ทั่วไป";  
let selectedWords = [];  

// ฟังก์ชันเปิดโมดัลเพิ่มคำ
function openModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.classList.remove('hidden');
    } else {
        showError("ไม่พบ modal ใน HTML");
    }
}

// ฟังก์ชันปิดโมดัลเพิ่มคำ
function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

// ตรวจสอบ Token และโหลดข้อมูล
function checkAuthAndLoadData() {
    // ตรวจสอบว่า token ยังไม่หมดอายุ
    if (!accessToken || (tokenExpiry && new Date() > tokenExpiry)) {
        showError("Token หมดอายุหรือไม่มี โปรดยืนยันตัวตนใหม่");
        authenticate();
        return;
    }
    loadWordsForMixing();
}

// แสดงข้อความผิดพลาด
function showError(message) {
    console.error(message);
    // สร้าง toast notification หรือแสดง error message ที่เป็นมิตรกับผู้ใช้
    const errorElement = document.createElement("div");
    errorElement.className = "fixed top-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg";
    errorElement.textContent = message;
    document.body.appendChild(errorElement);
    
    // ให้ข้อความหายไปหลังจาก 5 วินาที
    setTimeout(() => {
        errorElement.remove();
    }, 5000);
}

function authenticate() {
    // ใช้ 'code' แทน 'token' เพื่อใช้ Authorization Code flow
    // สร้าง PKCE challenge (ถ้าจำเป็น)
    const state = Math.random().toString(36).substring(2);
    localStorage.setItem('oauth_state', state);
    
    const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(SCOPES)}&state=${state}&access_type=offline&prompt=consent`;
    window.location.href = authUrl;
}

// ฟังก์ชันแลกรับ token ด้วย authorization code
function exchangeCodeForToken(code) {
    // นี่ควรจะทำที่ backend เพื่อปกป้อง client_secret
    // แต่สำหรับตัวอย่างนี้ จะจำลองผ่าน proxy API
    const tokenUrl = 'https://your-backend-endpoint/exchange-token'; // ควรสร้าง backend endpoint
    
    fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code, redirect_uri: REDIRECT_URI })
    })
    .then(response => response.json())
    .then(data => {
        if (data.access_token) {
            accessToken = data.access_token;
            // คำนวณเวลาหมดอายุจาก expires_in (จำนวนวินาที)
            tokenExpiry = new Date(new Date().getTime() + data.expires_in * 1000);
            localStorage.setItem('access_token', accessToken);
            localStorage.setItem('token_expiry', tokenExpiry.toISOString());
            
            console.log("ได้รับ Access Token แล้ว");
            checkAuthAndLoadData();
        } else {
            showError("การรับ Access Token ล้มเหลว");
        }
    })
    .catch(error => {
        showError("เกิดข้อผิดพลาดในการแลก Token: " + error.message);
    });
}

// ฟังก์ชันจัดการ URL parameters หลังจาก redirect กลับมา
function handleAuthResponse() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const storedState = localStorage.getItem('oauth_state');
    
    // ลบ state จาก localStorage
    localStorage.removeItem('oauth_state');
    
    // ตรวจสอบ state เพื่อป้องกัน CSRF
    if (state !== storedState) {
        showError("การตรวจสอบ State ล้มเหลว กรุณาลองใหม่");
        authenticate();
        return;
    }
    
    if (code) {
        exchangeCodeForToken(code);
    } else if (window.location.hash.includes('access_token')) {
        // สำหรับ backward compatibility กับ Implicit flow เดิม
        const params = new URLSearchParams(window.location.hash.substring(1));
        accessToken = params.get('access_token');
        const expiresIn = params.get('expires_in');
        
        if (accessToken) {
            tokenExpiry = new Date(new Date().getTime() + expiresIn * 1000);
            localStorage.setItem('access_token', accessToken);
            localStorage.setItem('token_expiry', tokenExpiry.toISOString());
            checkAuthAndLoadData();
        } else {
            showError("การยืนยันตัวตนล้มเหลว กรุณาลองใหม่");
            authenticate();
        }
    } else {
        // ตรวจสอบว่ามี token ที่บันทึกไว้ใน localStorage หรือไม่
        const storedToken = localStorage.getItem('access_token');
        const storedExpiry = localStorage.getItem('token_expiry');
        
        if (storedToken && storedExpiry && new Date(storedExpiry) > new Date()) {
            accessToken = storedToken;
            tokenExpiry = new Date(storedExpiry);
            checkAuthAndLoadData();
        } else {
            authenticate();
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    handleAuthResponse();
    
    // เพิ่ม event listeners สำหรับปุ่มหมวดหมู่
    document.querySelectorAll('.category-button').forEach(button => {
        button.addEventListener('click', function() {
            setCategory(this.dataset.category);
        });
    });
});

// ฟังก์ชันตั้งค่าหมวดหมู่
function setCategory(category) {
    currentCategory = category;
    // ล้างคำที่เลือกเมื่อเปลี่ยนหมวดหมู่
    selectedWords = [];
    updateSelectedWordsDisplay();
    
    // อัปเดต UI แสดงหมวดหมู่ที่เลือก
    document.querySelectorAll('.category-button').forEach(button => {
        if (button.dataset.category === category) {
            button.classList.add('bg-blue-700');
            button.classList.remove('bg-blue-500');
        } else {
            button.classList.remove('bg-blue-700');
            button.classList.add('bg-blue-500');
        }
    });
    
    loadWordsForMixing();
}

// ฟังก์ชันโหลดข้อมูลจาก Google Sheets
function loadWordsForMixing() {
    if (!accessToken || (tokenExpiry && new Date() > tokenExpiry)) {
        showError("Token หมดอายุหรือไม่มี โปรดยืนยันตัวตนใหม่");
        authenticate();
        return;
    }

    const wordButtonsContainer = document.getElementById('word-buttons-container');
    if (!wordButtonsContainer) {
        showError('ไม่พบ container สำหรับปุ่มคำ!');
        return;
    }

    // แสดง loading indicator
    wordButtonsContainer.innerHTML = '<div class="text-center w-full py-4">กำลังโหลด...</div>';

    const categorySheet = currentCategory === "ทั่วไป" ? "common" :
                          currentCategory === "ความต้องการ" ? "need" :
                          currentCategory === "คลัง" ? "storage" : "common";

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${categorySheet}?key=${API_KEY}`;
    
    fetch(url, {
        method: "GET",
        headers: { "Authorization": `Bearer ${accessToken}` }
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) {
                showError("Token หมดอายุ! โปรดยืนยันตัวตนใหม่");
                authenticate();
                return null;
            }
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (!data) return; // กรณีที่มีการ redirect ไปแล้ว
        
        if (!data.values) {
            showError("ไม่มีข้อมูลที่ได้รับจาก Google Sheets");
            wordButtonsContainer.innerHTML = '<div class="text-center w-full py-4 text-red-500">ไม่พบข้อมูล</div>';
            return;
        }
        
        wordButtonsContainer.innerHTML = '';
        
        const words = data.values.map(row => row[0]).filter(word => word && word.trim() !== "");
        buttonsByCategory[currentCategory] = words;

        if (words.length === 0) {
            wordButtonsContainer.innerHTML = '<div class="text-center w-full py-4">ไม่มีคำในหมวดหมู่นี้</div>';
            return;
        }

        words.forEach(word => {
            let button = document.createElement("button");
            const isSelected = selectedWords.includes(word);
            button.className = `px-4 py-2 ${isSelected ? 'bg-green-500' : 'bg-blue-500'} text-white rounded-lg transition-all duration-300 hover:bg-blue-600 m-1`;
            button.innerText = word;
            button.onclick = () => selectWordForMixing(word);
            wordButtonsContainer.appendChild(button);
        });
    })
    .catch(error => {
        showError("ไม่สามารถโหลดข้อมูลจาก Google Sheets: " + error.message);
        wordButtonsContainer.innerHTML = '<div class="text-center w-full py-4 text-red-500">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
    });
}

// ฟังก์ชันเลือกคำ
function selectWordForMixing(word) {
    const index = selectedWords.indexOf(word);
    
    if (index !== -1) {
        selectedWords.splice(index, 1);
    } else {
        selectedWords.push(word);
    }
    
    // อัปเดตการแสดงผลปุ่ม
    const buttons = document.querySelectorAll('#word-buttons-container button');
    buttons.forEach(button => {
        if (button.innerText === word) {
            if (selectedWords.includes(word)) {
                button.classList.remove('bg-blue-500');
                button.classList.add('bg-green-500');
            } else {
                button.classList.remove('bg-green-500');
                button.classList.add('bg-blue-500');
            }
        }
    });
    
    updateSelectedWordsDisplay();
}

// ฟังก์ชันอัปเดตการแสดงผลคำที่เลือก
function updateSelectedWordsDisplay() {
    const selectedWordsContainer = document.getElementById('selected-words-container');
    if (selectedWordsContainer) {
        if (selectedWords.length > 0) {
            selectedWordsContainer.innerHTML = selectedWords.map(word => 
                `<span class="inline-block bg-green-500 text-white px-3 py-1 rounded-full m-1">${word} <button class="ml-1 text-white font-bold" onclick="removeSelectedWord('${word}')">×</button></span>`
            ).join('');
        } else {
            selectedWordsContainer.innerHTML = '<span class="text-gray-500">ยังไม่ได้เลือกคำ</span>';
        }
    }
}

// ฟังก์ชันลบคำที่เลือก
function removeSelectedWord(word) {
    const index = selectedWords.indexOf(word);
    if (index !== -1) {
        selectedWords.splice(index, 1);
        updateSelectedWordsDisplay();
        
        // อัปเดตสถานะปุ่มด้วย
        const buttons = document.querySelectorAll('#word-buttons-container button');
        buttons.forEach(button => {
            if (button.innerText === word) {
                button.classList.remove('bg-green-500');
                button.classList.add('bg-blue-500');
            }
        });
    }
}

// ฟังก์ชันเปิดโมดัลผสมคำ
function openMixModal() {
    const modal = document.getElementById('mix-modal');
    if (modal) {
        modal.classList.remove('hidden');
        
        // ล้างการเลือกคำเมื่อเปิดโมดัลใหม่
        selectedWords = [];
        updateSelectedWordsDisplay();
        
        // ไม่จำเป็นต้องเรียก loadWordsForMixing ใหม่ เพราะจะถูกเรียกเมื่อเปลี่ยนหมวดหมู่อยู่แล้ว
        // แต่ทำการเรียกเพื่อโหลดข้อมูลเริ่มต้น
        loadWordsForMixing();
    } else {
        showError("ไม่พบ mix-modal ใน HTML");
    }
}

// ฟังก์ชันปิดโมดัล
function closeMixModal() {
    document.getElementById('mix-modal').classList.add('hidden');
    // เคลียร์คำที่เลือกเมื่อปิดโมดัล
    selectedWords = [];
}

// ฟังก์ชันสำหรับการประมวลผลคำที่เลือกและส่งออก
function processSelectedWords() {
    if (selectedWords.length === 0) {
        showError("กรุณาเลือกคำอย่างน้อย 1 คำ");
        return;
    }
    
    // ตัวอย่างการประมวลผล - ส่งออกคำที่เลือก
    const output = selectedWords.join(' ');
    
    // แสดงผลลัพธ์
    const resultContainer = document.getElementById('result-container');
    if (resultContainer) {
        resultContainer.textContent = output;
        resultContainer.classList.remove('hidden');
    }
    
    // ปิดโมดัลหลังประมวลผล
    closeMixModal();
}