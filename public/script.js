// Configuration
const CLIENT_ID = '271962080875-dr9uild15rad3n86816nmfq5ms7mj95o.apps.googleusercontent.com';
const REDIRECT_URI = 'https://speech-test-nine.vercel.app';
const SPREADSHEET_ID = '1XuZ7o1fcZ6Y01buC6J9Aep_tU7H9XFLt8ZUVPPrp340';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
const CATEGORY_SHEETS = {
    'ทั่วไป': 'Sheet1',
    'ความต้องการ': 'Sheet2',
    'คลัง': 'Sheet3'
};

// State
let accessToken = null;
let tokenExpiry = null;
let currentCategory = 'ทั่วไป';
let selectedWords = [];
let isMixingMode = false;

// DOM Elements
const elements = {
    modal: document.getElementById('modal'),
    buttonContainer: document.getElementById('button-container'),
    selectedWordsContainer: document.getElementById('selected-words-container'),
    mixResult: document.getElementById('mix-result'),
    newWordInput: document.getElementById('new-word-input')
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.category-button').forEach(button => {
        button.addEventListener('click', () => setCategory(button.dataset.category));
    });
    
    document.getElementById('btn-add').addEventListener('click', openModal);
    document.getElementById('btn-mix').addEventListener('click', toggleMixingMode);
    
    handleAuthResponse();
});

// Authentication Functions
function handleAuthResponse() {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    
    if (hashParams.has('access_token')) {
        processTokenResponse(hashParams);
    } else {
        checkLocalStorageToken();
    }
}

function processTokenResponse(params) {
    const storedState = localStorage.getItem('oauth_state');
    const state = params.get('state');
    
    if (state !== storedState) {
        showError('การตรวจสอบความปลอดภัยล้มเหลว');
        return;
    }
    
    accessToken = params.get('access_token');
    const expiresIn = parseInt(params.get('expires_in')) * 1000;
    tokenExpiry = Date.now() + expiresIn;
    
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('token_expiry', tokenExpiry);
    
    window.history.replaceState({}, document.title, window.location.pathname);
    loadInitialData();
}

function checkLocalStorageToken() {
    const token = localStorage.getItem('access_token');
    const expiry = localStorage.getItem('token_expiry');
    
    if (token && expiry && Date.now() < expiry) {
        accessToken = token;
        loadInitialData();
    } else {
        startOAuthFlow();
    }
}

function startOAuthFlow() {
    const state = Math.random().toString(36).substr(2);
    localStorage.setItem('oauth_state', state);
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/auth');
    authUrl.searchParams.set('client_id', CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'token');
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('state', state);
    
    window.location.href = authUrl;
}

// Data Functions
async function loadInitialData() {
    try {
        await loadCategoryData();
    } catch (error) {
        showError('ไม่สามารถโหลดข้อมูลเริ่มต้นได้');
    }
}

async function loadCategoryData() {
    const sheetName = CATEGORY_SHEETS[currentCategory];
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}?majorDimension=COLUMNS`;
    
    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    const data = await response.json();
    renderButtons(data.values?.[0] || []);
}

function renderButtons(words = []) {
    elements.buttonContainer.innerHTML = words.map(word => `
        <button class="word-button ${isMixingMode ? 'cursor-pointer' : 'cursor-default'} 
                bg-blue-500 text-white px-4 py-2 rounded m-2 hover:bg-blue-600 transition-all"
                data-word="${word}"
                onclick="${isMixingMode ? `toggleWordSelection('${word}')` : `speakText('${word}')`}">
            ${word}
        </button>
    `).join('');
}

// UI Functions
function setCategory(category) {
    currentCategory = category;
    selectedWords = [];
    updateSelectionUI();
    loadCategoryData();
}

function toggleWordSelection(word) {
    if (!isMixingMode) return; // ทำงานเฉพาะในโหมดผสมคำ
    
    const index = selectedWords.indexOf(word);
    
    if (index > -1) {
        selectedWords.splice(index, 1);
    } else {
        selectedWords.push(word);
    }
    
    updateSelectionUI();
}

function updateSelectionUI() {
    elements.selectedWordsContainer.innerHTML = selectedWords.map(word => `
        <span class="selected-word bg-green-500 text-white px-2 py-1 rounded m-1">
            ${word}
            <button class="ml-2 hover:text-gray-200" onclick="toggleWordSelection('${word}')">&times;</button>
        </span>
    `).join('');
}

// Speech Functions
function speakText(text) {
    responsiveVoice.speak(text, "Thai Female", {
        onstart: () => highlightSpeakingButton(text),
        onend: () => removeSpeakingHighlight()
    });
}

function highlightSpeakingButton(text) {
    document.querySelectorAll('.word-button').forEach(button => {
        if (button.dataset.word === text) {
            button.classList.add('ring-4', 'ring-blue-300');
        }
    });
}

function removeSpeakingHighlight() {
    document.querySelectorAll('.word-button').forEach(button => {
        button.classList.remove('ring-4', 'ring-blue-300');
    });
}

// Modal Functions
function openModal() {
    elements.modal.classList.remove('hidden');
}

function closeModal() {
    elements.modal.classList.add('hidden');
    elements.newWordInput.value = '';
}

function toggleMixingMode() {
    isMixingMode = !isMixingMode;
    updateMixingUI();
    
    if (!isMixingMode) {
        // เคลียร์คำที่เลือกเมื่อออกจากโหมดผสมคำ
        selectedWords = [];
        updateSelectionUI();
    }
}

function updateMixingUI() {
    // อัปเดตสถานะปุ่มหมวดหมู่
    document.querySelectorAll('.category-button').forEach(button => {
        button.disabled = isMixingMode;
    });
    
    // อัปเดตปุ่มผสมคำ
    const mixButton = document.getElementById('btn-mix');
    if (isMixingMode) {
        mixButton.textContent = 'บันทึกคำผสม';
        mixButton.classList.remove('bg-purple-500');
        mixButton.classList.add('bg-green-500');
    } else {
        mixButton.textContent = 'ผสมคำ';
        mixButton.classList.remove('bg-green-500');
        mixButton.classList.add('bg-purple-500');
    }
}

// Error Handling
function showError(message) {
    const errorToast = document.createElement('div');
    errorToast.className = 'fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg';
    errorToast.textContent = message;
    
    document.body.appendChild(errorToast);
    
    setTimeout(() => {
        errorToast.remove();
    }, 5000);
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Initialize
if (typeof responsiveVoice !== 'undefined') {
    responsiveVoice.setDefaultVoice("Thai Female");
}

// เพิ่มฟังก์ชันที่ขาดหายไป
async function saveMixedWords() {
    if (selectedWords.length === 0) {
        showError('กรุณาเลือกคำอย่างน้อย 1 คำ');
        return;
    }

    const sentence = selectedWords.join(' ');
    elements.mixResult.textContent = sentence;
    speakText(sentence);

    // บันทึกคำผสมลงใน Sheet3 (หมวดคลัง)
    try {
        await addWordToSheet(sentence, 'คลัง');
        showToast('บันทึกคำผสมสำเร็จในหมวดคลัง!');
        toggleMixingMode(); // ปิดโหมดผสมคำ
        setCategory('คลัง'); // โหลดข้อมูลหมวด "คลัง" ใหม่
    } catch (error) {
        showError('เกิดข้อผิดพลาดในการบันทึกคำผสม');
        console.error(error);
    }
}

async function addWordToSheet(word, category) {
    const sheetName = CATEGORY_SHEETS[category];
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!A:A:append?valueInputOption=USER_ENTERED`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            values: [[word]]
        })
    });
    
    if (!response.ok) {
        throw new Error('ไม่สามารถบันทึกข้อมูลได้');
    }
}