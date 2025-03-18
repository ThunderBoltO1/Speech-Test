const CLIENT_ID = '271962080875-khc6aslq3phrnm9cqgguk37j0funtr7f.apps.googleusercontent.com';
const REDIRECT_URI = 'https://ramspeechtest.vercel.app';
const sheetId = "1YY1a1drCnfXrSNWrGBgrMaMlFQK5rzBOEoeMhW9MYm8";
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
const API_KEY = 'AIzaSyCugN1kot7Nij2PWhKsP08I6yeHNgsYrQI';

function authenticate() {
    const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${SCOPES}&access_type=offline&prompt=consent`;
    window.location.href = authUrl;
}

async function handleAuthResponse() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
        // ส่ง Authorization Code ไปยังเซิร์ฟเวอร์เพื่อขอ Access Token
        const response = await fetch('/get-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code })
        });
        const data = await response.json();
        if (data.access_token) {
            loadButtonsFromSheet(data.access_token);
        } else {
            console.error('Failed to get access token');
            authenticate();
        }
    } else {
        authenticate();
    }
}

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
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        const buttons = data.values || [];
        const container = document.getElementById('button-container');
        container.innerHTML = '';
        buttons.forEach(buttonData => {
            const newButton = document.createElement('button');
            newButton.textContent = buttonData[0];
            newButton.classList.add('bg-blue-500', 'text-white', 'px-6', 'py-3', 'rounded', 'text-sm', 'sm:text-base', 'md:text-lg');
            newButton.onclick = function() {
                speakText(buttonData[0]);
            };
            container.appendChild(newButton);
        });
    })
    .catch(error => {
        console.error("Error loading buttons from Google Sheets:", error);
        alert("ไม่สามารถโหลดข้อมูลจาก Google Sheets ได้: " + error.message);
    });
}

window.onload = function() {
    handleAuthResponse();
};