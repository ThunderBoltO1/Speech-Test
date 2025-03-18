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
    const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=token&scope=${SCOPES}`;
    window.location.href = authUrl;
}

// เมื่อได้รับ access_token จากการยืนยันตัวตน
function handleAuthResponse() {
    const params = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = params.get('access_token');
    if (accessToken) {
        loadButtonsFromSheet(accessToken);
    } else {
        console.error('Authorization failed');
        alert("การยืนยันตัวตนล้มเหลว กรุณาลองอีกครั้ง");
        authenticate(); // เริ่มกระบวนการ OAuth2 ใหม่
    }
}

// ฟังก์ชันที่ใช้ในการเพิ่มข้อมูลใน Google Sheets
function addDataToSheet(accessToken, category, text) {
    const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${category}:append?valueInputOption=RAW&key=${API_KEY}`;

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
        alert("เพิ่มข้อมูลสำเร็จ!");
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

    const category = document.getElementById('category-select').value;
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
            });
    } else {
        authenticate();
    }
}

// ฟังก์ชันสำหรับโหลดปุ่มจาก Google Sheets
function loadButtonsFromSheet(accessToken) {
    const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1?key=${API_KEY}`;

    fetch(sheetUrl, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${accessToken}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error("Failed to fetch data from Google Sheets");
        }
        return response.json();
    })
    .then(data => {
        const rows = data.values || [];
        buttonsByCategory = {};

        // จัดกลุ่มข้อมูลปุ่มตามหมวดหมู่
        rows.forEach(row => {
            const [category, text] = row;
            if (!buttonsByCategory[category]) {
                buttonsByCategory[category] = [];
            }
            buttonsByCategory[category].push(text);
        });

        // โหลดปุ่มหมวดหมู่ "ทั่วไป" เป็นค่าเริ่มต้น
        loadButtons("ทั่วไป");

        // เมื่อผู้ใช้เปลี่ยนหมวดหมู่
        document.getElementById('category-select').addEventListener('change', (event) => {
            loadButtons(event.target.value);
        });
    })
    .catch(error => {
        console.error("Error loading buttons from Google Sheets:", error);
        alert("ไม่สามารถโหลดข้อมูลจาก Google Sheets ได้");
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
            button.classList.add('bg-blue-500', 'text-white', 'px-6', 'py-3', 'rounded', 'text-sm', 'sm:text-base', 'md:text-lg');
            button.onclick = () => speakText(text);
            container.appendChild(button);
        });
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
    if (typeof responsiveVoice !== "undefined" && responsiveVoice.voiceSupport()) {
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