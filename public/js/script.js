const CLIENT_ID = '271962080875-khc6aslq3phrnm9cqgguk37j0funtr7f.apps.googleusercontent.com';
const REDIRECT_URI = 'https://ramspeechtest.vercel.app';
const sheetId = "1YY1a1drCnfXrSNWrGBgrMaMlFQK5rzBOEoeMhW9MYm8";
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
const API_KEY = 'AIzaSyCugN1kot7Nij2PWhKsP08I6yeHNgsYrQI';

let buttonsLoaded = false;

function authenticate() {
    const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=token&scope=${SCOPES}`;
    window.location.href = authUrl;
}

function handleAuthResponse() {
    const params = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = params.get('access_token');
    if (accessToken) {
        loadButtonsFromSheet(accessToken);
    } else {
        console.error('Authorization failed');
        alert("การยืนยันตัวตนล้มเหลว กรุณาลองอีกครั้ง");
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
        buttonsLoaded = true;
    })
    .catch(error => {
        console.error("Error loading buttons from Google Sheets:", error);
        alert("ไม่สามารถโหลดข้อมูลจาก Google Sheets ได้: " + error.message);
    });
}

window.onload = function() {
    if (window.location.hash) {
        handleAuthResponse();
    } else {
        authenticate();
    }
};