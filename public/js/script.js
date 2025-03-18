// OAuth2
const CLIENT_ID = '271962080875-khc6aslq3phrnm9cqgguk37j0funtr7f.apps.googleusercontent.com';
const REDIRECT_URI = 'https://ramspeechtest.vercel.app';
const sheetId = "1YY1a1drCnfXrSNWrGBgrMaMlFQK5rzBOEoeMhW9MYm8";
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
const API_KEY = 'AIzaSyCugN1kot7Nij2PWhKsP08I6yeHNgsYrQI';

// ตัวแปร global เพื่อตรวจสอบว่าปุ่มถูกโหลดแล้วหรือไม่
let buttonsLoaded = false;

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
        // เรียกใช้ฟังก์ชันเพื่อโหลดปุ่มจาก Google Sheets
        loadButtonsFromSheet(accessToken);
    } else {
        console.error('Authorization failed');
    }
}

// ฟังก์ชันที่ใช้ในการเพิ่มข้อมูลใน Google Sheets
function addDataToSheet(accessToken, text) {
    const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1:append?valueInputOption=RAW&key=${API_KEY}`;

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
        // เรียกใช้ฟังก์ชันที่ใช้ในการดึง access_token
        const accessToken = new URLSearchParams(window.location.hash.substring(1)).get('access_token');
        if (accessToken) {
            // ถ้ามี access_token ให้เพิ่มข้อมูลลงใน Google Sheets
            addDataToSheet(accessToken, userInput)
                .then(() => {
                    // เพิ่มปุ่มใหม่โดยไม่ต้องโหลดปุ่มทั้งหมดใหม่
                    const container = document.getElementById('button-container');
                    const newButton = document.createElement('button');
                    newButton.textContent = userInput;
                    newButton.classList.add('bg-blue-500', 'text-white', 'px-6', 'py-3', 'rounded', 'text-sm', 'sm:text-base', 'md:text-lg');
                    newButton.onclick = function() {
                        speakText(userInput);
                    };
                    container.appendChild(newButton);
                });
        } else {
            // ถ้าไม่มี access_token ให้เริ่มต้น OAuth2 Flow
            authenticate();
        }

        // ปิด modal และล้างค่าในฟอร์ม
        closeModal();
        document.getElementById('buttonText').value = '';
    } else {
        alert("กรุณากรอกข้อความก่อน!");
    }
}

// ฟังก์ชันสำหรับโหลดปุ่มจาก Google Sheets
function loadButtonsFromSheet(accessToken) {
    if (buttonsLoaded) {
        return; // ถ้าปุ่มถูกโหลดแล้ว ไม่ต้องทำอะไรเพิ่ม
    }

    const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1?key=${API_KEY}`;

    fetch(sheetUrl, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${accessToken}`
        }
    })
    .then(response => response.json())
    .then(data => {
        const buttons = data.values || [];
        const container = document.getElementById('button-container');
        
        // เพิ่มปุ่มที่ดึงมาจาก Google Sheets ลงใน container
        buttons.forEach(buttonData => {
            const newButton = document.createElement('button');
            newButton.textContent = buttonData[0];  
            newButton.classList.add('bg-blue-500', 'text-white', 'px-6', 'py-3', 'rounded', 'text-sm', 'sm:text-base', 'md:text-lg');
            newButton.onclick = function() {
                speakText(buttonData[0]);
            };
            container.appendChild(newButton);
        });

        buttonsLoaded = true; // ตั้งค่าสถานะว่าปุ่มถูกโหลดแล้ว
    })
    .catch(error => {
        console.error("Error loading buttons from Google Sheets:", error);
    });
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

// เรียกใช้ handleAuthResponse เมื่อโหลดหน้า
window.onload = function() {
    if (window.location.hash) {
        handleAuthResponse(); // เรียก handleAuthResponse เพื่อดึง access_token และโหลดปุ่ม
    } else {
        authenticate();  // ถ้าไม่มี access_token ใน URL ให้เริ่ม OAuth2 Flow
    }
};