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
let isSelectMode = false;

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
    document.getElementById('btn-save-mix').addEventListener('click', saveMixedWords);
    document.getElementById('btn-delete').addEventListener('click', deleteSelectedWord);
    
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
        authenticate();
    }
}

function authenticate() {
    const state = Math.random().toString(36).substring(2);
    localStorage.setItem('oauth_state', state);
    
    const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=${encodeURIComponent(SCOPES)}&state=${state}`;
    window.location.href = authUrl;
}

async function refreshToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
        authenticate(); // ถ้าไม่มี Refresh Token ให้ยืนยันตัวตนใหม่
        return;
    }

    const url = `https://oauth2.googleapis.com/token?client_id=${CLIENT_ID}&client_secret=YOUR_CLIENT_SECRET&refresh_token=${refreshToken}&grant_type=refresh_token`;
    
    try {
        const response = await fetch(url, { method: 'POST' });
        const data = await response.json();
        
        if (data.access_token) {
            accessToken = data.access_token;
            const expiresIn = parseInt(data.expires_in) * 1000;
            tokenExpiry = Date.now() + expiresIn;
            
            localStorage.setItem('access_token', accessToken);
            localStorage.setItem('token_expiry', tokenExpiry);
        } else {
            authenticate(); // ถ้าไม่สามารถรีเฟรช Token ได้ ให้ยืนยันตัวตนใหม่
        }
    } catch (error) {
        console.error('Error refreshing token:', error);
        authenticate(); // ถ้าเกิดข้อผิดพลาด ให้ยืนยันตัวตนใหม่
    }
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
    if (!accessToken || Date.now() >= tokenExpiry) {
        await refreshToken(); // ถ้า Token หมดอายุ ให้รีเฟรช Token
    }

    const sheetName = CATEGORY_SHEETS[currentCategory];
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}?majorDimension=COLUMNS`;
    
    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                showError('การยืนยันตัวตนล้มเหลว กรุณาล็อกอินใหม่');
                authenticate();
                return;
            }
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data.values) {
            throw new Error('ไม่มีข้อมูลใน Google Sheets');
        }
        
        renderButtons(data.values[0]);
    } catch (error) {
        console.error('Error loading category data:', error);
        showError('ไม่สามารถโหลดข้อมูลได้: ' + error.message);
    }
}

function renderButtons(words = []) {
    if (elements.buttonContainer) {
        elements.buttonContainer.innerHTML = words.map(word => `
            <button class="word-button flex-1 text-left bg-blue-500 text-white px-4 py-2 rounded m-2 hover:bg-blue-600 transition-all"
                    onclick="${isSelectMode ? `toggleWordSelection('${word}')` : `speakText('${word}')`}">
                ${word}
                ${isSelectMode ? `<span class="ml-2">${selectedWords.includes(word) ? '✔️' : ''}</span>` : ''}
            </button>
        `).join('');
    }
}

// UI Functions
function setCategory(category) {
    currentCategory = category;
    selectedWords = [];
    updateSelectionUI();
    loadCategoryData();
}

function toggleWordSelection(word) {
    if (!isSelectMode) return;
    
    const index = selectedWords.indexOf(word);
    
    if (index > -1) {
        selectedWords.splice(index, 1);
    } else {
        selectedWords.push(word);
    }
    
    updateSelectionUI();
    updateMixResult();
}

function updateSelectionUI() {
    if (elements.selectedWordsContainer) {
        elements.selectedWordsContainer.innerHTML = selectedWords.map(word => `
            <span class="selected-word bg-green-500 text-white px-2 py-1 rounded m-1">
                ${word}
                <button class="ml-2 hover:text-gray-200" onclick="toggleWordSelection('${word}')">&times;</button>
            </span>
        `).join('');
    }
}

function updateMixResult(text = '') {
    if (elements.mixResult) {
        elements.mixResult.textContent = text || selectedWords.join(' ') || 'ยังไม่ได้เลือกคำ';
    }
}

// Speech Functions
function speakText(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'th-TH'; // ตั้งค่าภาษาเป็นไทย
        window.speechSynthesis.speak(utterance);

        // แสดงข้อความที่พูดบน mix-result
        updateMixResult(text);
    } else {
        showError('เบราว์เซอร์ของคุณไม่รองรับการแปลงข้อความเป็นเสียง');
    }
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
    isSelectMode = !isSelectMode;
    updateMixingUI();
    
    if (!isSelectMode) {
        const mixedText = selectedWords.join(' ');
        speakText(mixedText);
        selectedWords = [];
        updateSelectionUI();
        updateMixResult();
    }

    // อัปเดตปุ่มคำศัพท์
    loadCategoryData();
}

function updateMixingUI() {
    document.querySelectorAll('.category-button').forEach(button => {
        button.disabled = isSelectMode;
    });
    
    const mixButton = document.getElementById('btn-mix');
    if (isSelectMode) {
        mixButton.textContent = 'พูดคำผสม';
        mixButton.classList.remove('bg-purple-500');
        mixButton.classList.add('bg-green-500');
    } else {
        mixButton.textContent = 'ผสมคำ';
        mixButton.classList.remove('bg-green-500');
        mixButton.classList.add('bg-purple-500');
    }

    const deleteButton = document.getElementById('btn-delete');
    if (isSelectMode) {
        deleteButton.textContent = 'ลบคำที่เลือก';
        deleteButton.classList.remove('bg-red-500');
        deleteButton.classList.add('bg-yellow-500');
    } else {
        deleteButton.textContent = 'ลบ';
        deleteButton.classList.remove('bg-yellow-500');
        deleteButton.classList.add('bg-red-500');
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

// Add New Word
async function addNewWord() {
    const newWord = elements.newWordInput.value.trim();
    
    if (!newWord) {
        showError('กรุณากรอกคำศัพท์');
        return;
    }

    const words = Array.from(document.querySelectorAll('.word-button'))
                      .map(button => button.textContent.trim());
    
    if (words.includes(newWord)) {
        showError('คำนี้มีอยู่แล้วในระบบ');
        return;
    }

    try {
        await addWordToSheet(newWord, currentCategory);
        showToast('เพิ่มคำศัพท์สำเร็จ!');
        closeModal();
        loadCategoryData();
    } catch (error) {
        showError('เกิดข้อผิดพลาดในการบันทึกคำใหม่: ' + error.message);
        console.error('Error adding new word:', error);
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
        if (response.status === 401) {
            showError('การยืนยันตัวตนล้มเหลว กรุณาล็อกอินใหม่');
            authenticate();
            return;
        }
        throw new Error(`ไม่สามารถบันทึกข้อมูลได้: ${response.statusText}`);
    }
}

// Save Mixed Words
async function saveMixedWords() {
    if (selectedWords.length === 0) {
        showError('ไม่มีคำที่เลือกไว้');
        return;
    }

    const mixedText = selectedWords.join(' ');
    try {
        await addWordToSheet(mixedText, 'คลัง'); // บันทึกคำผสมลงใน Sheet3
        showToast('บันทึกคำผสมสำเร็จ!');
        selectedWords = []; // เคลียร์คำที่เลือก
        updateSelectionUI();
        updateMixResult();
    } catch (error) {
        showError('เกิดข้อผิดพลาดในการบันทึกคำผสม: ' + error.message);
        console.error('Error saving mixed words:', error);
    }
}

// Delete Selected Words
function deleteSelectedWord() {
    if (selectedWords.length === 0) {
        showError('ไม่มีคำที่เลือกไว้');
        return;
    }

    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบคำที่เลือกทั้งหมด?`)) {
        return;
    }

    selectedWords = [];
    updateSelectionUI();
    updateMixResult();
    showToast('ลบคำที่เลือกสำเร็จ!');
}