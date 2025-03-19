// OAuth2
const CLIENT_ID = '271962080875-khc6aslq3phrnm9cqgguk37j0funtr7f.apps.googleusercontent.com';
const REDIRECT_URI = 'https://ramspeechtest.vercel.app';
const sheetId = "1YY1a1drCnfXrSNWrGBgrMaMlFQK5rzBOEoeMhW9MYm8";
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
const API_KEY = 'AIzaSyCugN1kot7Nij2PWhKsP08I6yeHNgsYrQI';

// ตัวแปร global เพื่อเก็บข้อมูลปุ่มตามหมวดหมู่
let buttonsByCategory = {}; 

function authenticate() {
    const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=token&scope=${SCOPES}`;
    window.location.href = authUrl;
}

function handleAuthResponse() {
    const params = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = params.get('access_token');
    if (accessToken) {
        console.log("Access Token:", accessToken);
        loadButtonsFromSheet(accessToken);
    } else {
        console.error('Authorization failed: No access token found');
        alert("การยืนยันตัวตนล้มเหลว กรุณาลองอีกครั้ง");
        authenticate();
    }
}

function addDataToSheet(accessToken, category, text) {
    const sheetName = category === "ทั่วไป" ? "common" : "need";
    const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}:append?valueInputOption=RAW&key=${API_KEY}`;

    const data = { values: [[text]] };

    return fetch(sheetUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) throw new Error("Network response was not ok");
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

function addButton() {
    const userInput = document.getElementById('buttonText').value.trim();
    if (!userInput) {
        alert("กรุณากรอกข้อความก่อน!");
        return;
    }

    const activeNavLink = document.querySelector('.nav-link.active');
    if (!activeNavLink) {
        alert("ไม่พบหมวดหมู่ที่เลือก กำหนดเป็น 'ทั่วไป'");
        loadButtons("ทั่วไป");
        return;
    }

    const category = activeNavLink.textContent;
    const accessToken = new URLSearchParams(window.location.hash.substring(1)).get('access_token');
    if (accessToken) {
        addDataToSheet(accessToken, category, userInput)
            .then(() => {
                if (!buttonsByCategory[category]) {
                    buttonsByCategory[category] = [];
                }
                buttonsByCategory[category].push(userInput);
                loadButtons(category);
                document.getElementById('buttonText').value = '';
                closeModal();
            })
            .catch(error => {
                console.error("Error adding button:", error);
                alert("เกิดข้อผิดพลาดในการเพิ่มปุ่ม");
            });
    } else {
        console.error("Access token not found");
        authenticate();
    }
}

function loadButtonsFromSheet(accessToken) {
    const commonUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/common?key=${API_KEY}`;
    const needUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/need?key=${API_KEY}`;

    Promise.all([
        fetch(commonUrl, { headers: { "Authorization": `Bearer ${accessToken}` } }).then(res => res.json()),
        fetch(needUrl, { headers: { "Authorization": `Bearer ${accessToken}` } }).then(res => res.json())
    ])
    .then(([commonData, needData]) => {
        buttonsByCategory["ทั่วไป"] = commonData.values?.map(row => row[0]) || [];
        buttonsByCategory["ความต้องการ"] = needData.values?.map(row => row[0]) || [];
        loadButtons("ทั่วไป");
    })
    .catch(error => {
        console.error("Error loading buttons from Google Sheets:", error);
        alert("ไม่สามารถโหลดข้อมูลจาก Google Sheets ได้: " + error.message);
    });
}

function loadButtons(category) {
    const container = document.getElementById('button-container');
    container.innerHTML = "";

    if (buttonsByCategory[category] && buttonsByCategory[category].length > 0) {
        buttonsByCategory[category].forEach(text => {
            const button = document.createElement('button');
            button.textContent = text;
            button.classList.add('bg-blue-500', 'text-white', 'px-6', 'py-3', 'rounded', 'text-sm', 'sm:text-base', 'md:text-lg', 'hover:bg-blue-600', 'transition-all', 'duration-300', 'focus:outline-none');
            button.onclick = () => speakText(text);
            container.appendChild(button);
        });
    } else {
        container.innerHTML = "<p>ไม่มีปุ่มในหมวดหมู่นี้</p>";
    }
}

function showModal() { document.getElementById('modal').classList.remove('hidden'); }
function closeModal() { document.getElementById('modal').classList.add('hidden'); }
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
    document.getElementById('nav-common').classList.add('active', 'bg-blue-500', 'text-white');
};
