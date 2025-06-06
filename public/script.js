// Configuration
const CLIENT_ID = '271962080875-dr9uild15rad3n86816nmfq5ms7mj95o.apps.googleusercontent.com';
const REDIRECT_URI = 'https://speech-test-nine.vercel.app';
const SPREADSHEET_ID = '1XuZ7o1fcZ6Y01buC6J9Aep_tU7H9XFLt8ZUVPPrp340';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
const CATEGORY_SHEETS = {
    'ทั่วไป': 'common',
    'ความต้องการ': 'demand',
    'คลัง': 'storage',
};

// State
let accessToken = null;
let tokenExpiry = null; 
let currentCategory = 'ทั่วไป';
let selectedWords = [];
let isSelectMode = false;

// เพิ่มตัวแปรสำหรับเลือกเครื่อง
let selectedDevice = 1; // 1 = เครื่องนี้, 2 = อีกเครื่อง

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
    document.getElementById('btn-delete').addEventListener('click', deleteSelectedWord);

    const cancelMixButton = document.getElementById('btn-cancel-mix');
    if (cancelMixButton) {
        cancelMixButton.addEventListener('click', cancelMixingMode);
    }

    const cancelDeleteButton = document.getElementById('btn-cancel-delete');
    if (cancelDeleteButton) {
        cancelDeleteButton.addEventListener('click', cancelDeleteMode);
    }

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

// Data Functions
async function loadInitialData() {
    try {
        // รีเซ็ต mixResult เมื่อโหลดหน้าใหม่
        updateMixResult('');
        selectedWords = [];
        await loadCategoryData();
    } catch (error) {
        showError('ไม่สามารถโหลดข้อมูลเริ่มต้นได้');
    }
}

async function loadCategoryData() {
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
        const filteredWords = data.values ? data.values[0].filter(word => word && word.trim() !== '') : [];
        renderButtons(filteredWords);
    } catch (error) {
        console.error('Error loading category data:', error);
        showError('ไม่สามารถโหลดข้อมูลได้: ' + error.message);
        renderButtons([]); // Render an empty state if the sheet is empty or an error occurs
    }
}

function renderButtons(words = []) {
    if (elements.buttonContainer) {
        elements.buttonContainer.className = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 p-2 md:p-4';
        elements.buttonContainer.innerHTML = words.map(word => `
            <button class="word-button text-center 
                bg-gradient-to-br from-blue-500 to-blue-600
                hover:from-blue-600 hover:to-blue-700
                text-white text-2xl sm:text-3xl md:text-4xl 
                px-4 sm:px-5 md:px-6 
                py-6 sm:py-8 md:py-10 
                rounded-xl m-1 sm:m-2 
                transition-all duration-300 ease-in-out
                transform hover:scale-105 hover:shadow-lg
                active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-300/50
                ${isSelectMode ? 'cursor-pointer' : ''}"
                data-word="${word}" 
                draggable="true">
                ${word}
                ${isSelectMode ? `<span class="selection-indicator ml-2 text-green-500 transform transition-all duration-300">${selectedWords.includes(word) ? '✔️' : ''}</span>` : ''}
            </button>
        `).join('');

        // เพิ่ม event listeners หลังจากสร้าง DOM elements
        document.querySelectorAll('.word-button').forEach(button => {
            button.addEventListener('click', () => {
                const word = button.getAttribute('data-word');
                if (isSelectMode) {
                    toggleWordSelection(word);
                } else {
                    speakText(word);
                }
            });
        });

        initializeDragAndDrop();
    }
}

// UI Functions
// Update setCategory to highlight current category
function setCategory(category) {
    currentCategory = category;
    
    // Update category buttons UI
    document.querySelectorAll('.category-button').forEach(button => {
        const isSelected = button.dataset.category === category;
        
        // Remove all highlight classes first
        button.classList.remove(
            'bg-blue-100', 'bg-green-100', 'bg-purple-100',
            'bg-blue-500', 'bg-green-500', 'bg-purple-500',
            'text-blue-800', 'text-green-800', 'text-purple-800',
            'text-white', 'scale-105', 'shadow-lg', 'font-bold'
        );
        
        // Add appropriate classes based on category and selection state
        if (isSelected) {
            switch (category) {
                case 'ทั่วไป':
                    button.classList.add('bg-blue-500', 'text-white', 'scale-105', 'shadow-lg', 'font-bold');
                    break;
                case 'ความต้องการ':
                    button.classList.add('bg-green-500', 'text-white', 'scale-105', 'shadow-lg', 'font-bold');
                    break;
                case 'คลัง':
                    button.classList.add('bg-purple-500', 'text-white', 'scale-105', 'shadow-lg', 'font-bold');
                    break;
            }
        } else {
            // Default state colors
            switch (button.dataset.category) {
                case 'ทั่วไป':
                    button.classList.add('bg-blue-100', 'text-blue-800', 'hover:bg-blue-200');
                    break;
                case 'ความต้องการ':
                    button.classList.add('bg-green-100', 'text-green-800', 'hover:bg-green-200');
                    break;
                case 'คลัง':
                    button.classList.add('bg-purple-100', 'text-purple-800', 'hover:bg-purple-200');
                    break;
            }
        }
    });
    
    loadCategoryData();
}

// Modify toggleWordSelection to ensure words from different categories can be selected
function toggleWordSelection(word) {
    if (!isSelectMode) return;
    const index = selectedWords.indexOf(word);
    if (index > -1) {
        selectedWords.splice(index, 1);
    } else {
        selectedWords.push(word);
    }
    updateSelectionUI();
    updateMixResult(); // ให้แสดง selectedWords ใน mixResult ทันที
    // Update selection indicators across all categories
    document.querySelectorAll('.word-button').forEach(button => {
        const buttonWord = button.getAttribute('data-word');
        const indicator = button.querySelector('.selection-indicator');
        if (indicator) {
            indicator.textContent = selectedWords.includes(buttonWord) ? '✔️' : '';
        }
    });
}

function updateSelectionUI() {
    if (elements.selectedWordsContainer) {
        elements.selectedWordsContainer.className = 'mt-2 sm:mt-3 md:mt-4 flex flex-wrap gap-1 sm:gap-2 p-2 sm:p-3';
        elements.selectedWordsContainer.innerHTML = selectedWords.map(word => `
            <span class="selected-word 
                bg-gradient-to-r from-green-500 to-green-400
                text-white 
                text-base sm:text-lg md:text-xl 
                px-3 sm:px-4 
                py-1.5 sm:py-2 
                rounded-full 
                inline-flex items-center 
                m-0.5 sm:m-1
                shadow-md hover:shadow-lg transition-shadow">
                ${word}
                <button class="ml-2 hover:text-gray-200 transition-colors" onclick="removeSelectedWord('${word}')">&times;</button>
            </span>
        `).join('');
    }
}

// เพิ่มฟังก์ชันใหม่สำหรับลบคำจาก selected words
function removeSelectedWord(word) {
    const index = selectedWords.indexOf(word);
    if (index > -1) {
        selectedWords.splice(index, 1);
    }
    
    updateSelectionUI();
    updateMixResult();
    
    // อัปเดตเฉพาะสถานะการเลือกบนปุ่ม
    document.querySelectorAll('.word-button').forEach(button => {
        if (button.getAttribute('data-word') === word) {
            const indicator = button.querySelector('.selection-indicator');
            if (indicator) {
                indicator.textContent = '';
            }
        }
    });
}

function updateMixResult(text = '') {
    if (elements.mixResult) {
        elements.mixResult.className = `bg-gradient-to-br from-blue-700 to-blue-800 
            text-white text-lg sm:text-xl md:text-2xl font-bold 
            px-3 sm:px-4 md:px-6 
            py-3 sm:py-4 md:py-8 
            rounded-xl mx-2 shadow-lg 
            w-full md:w-auto text-center 
            transition-all duration-300 transform hover:shadow-xl
            min-h-[60px] sm:min-h-[80px] md:min-h-[100px]
            flex items-center justify-center`;
        if (text) {
            elements.mixResult.textContent = text;
        } else if (selectedWords.length > 0) {
            elements.mixResult.textContent = selectedWords.join(' ');
        } else {
            elements.mixResult.textContent = 'ยังไม่ได้เลือกข้อความ';
        }
    }
}

// Helper function to detect language (Thai or English)
function detectLanguage(text) {
    // Check for Thai characters
    const thaiRegex = /[\u0E00-\u0E7F]/;
    return thaiRegex.test(text) ? 'th' : 'en';
}

// Speech Functions
function initializeVoice() {
    if (typeof responsiveVoice === 'undefined') {
        console.error('ResponsiveVoice failed to load');
        return false;
    }
    try {
        // ตั้งค่าเสียงเริ่มต้นเป็นผู้ชาย
        responsiveVoice.setDefaultVoice("Thai Male");
        responsiveVoice.setDefaultRate(0.9);
        responsiveVoice.setDefaultPitch(1.1);
        responsiveVoice.setDefaultVolume(1);

        // เตรียม voice cache
        window._voices = {
            thai: { name: "Thai Male", loaded: false },
            english: { name: "US English Male", loaded: false }
        };

        // preload voices
        responsiveVoice.speak("", "Thai Male", { volume: 0, onend: () => window._voices.thai.loaded = true });
        responsiveVoice.speak("", "US English Male", { volume: 0, onend: () => window._voices.english.loaded = true });

        return true;
    } catch (error) {
        console.error('Voice initialization failed:', error);
        return false;
    }
}

// --- Firebase Realtime Database Setup ---
// เพิ่ม <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script> และ
// <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js"></script> ใน index.html ด้วย

// กำหนดค่า Firebase (เปลี่ยนค่าตามโปรเจกต์ของคุณ)
const firebaseConfig = {
  apiKey: "AIzaSyB8r6w1u8jc5c38SZ79GgwOiWol2kKdcl4",
  authDomain: "speech-ram.firebaseapp.com",
  databaseURL: "https://speech-ram-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "speech-ram",
  storageBucket: "speech-ram.firebasestorage.app",
  messagingSenderId: "102365767024",
  appId: "1:102365767024:web:37cbf37f56433238a3dbb5",
  measurementId: "G-3G8KZ0GK1L"
};

// เริ่มต้น Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ฟังก์ชันส่งข้อความพูดไปยัง Firebase
function sendSpeakMessage(text) {
    // ใช้ timestamp เป็น key เพื่อป้องกันชนกัน
    const msgRef = db.ref('speakMessages').push();
    msgRef.set({
        text,
        timestamp: Date.now()
    });
}

// ฟังก์ชันรับข้อความพูดจาก Firebase (พูดทุกข้อความใหม่ที่เข้ามา)
function listenSpeakMessages() {
    let lastTimestamp = 0;
    db.ref('speakMessages').on('child_added', (snapshot) => {
        const data = snapshot.val();
        // ไม่ต้องเช็ค selectedDevice แล้ว
        if (data && data.timestamp > lastTimestamp) {
            lastTimestamp = data.timestamp;
            speakText(data.text, true); // true = ข้ามการส่งซ้ำ
        }
    });
}
listenSpeakMessages();

// --- speakText Firebase ---
function speakText(text, skipSend = false) {
    try {
        // ป้องกันการพูดซ้ำสำหรับภาษาอังกฤษ (เฉพาะรอบที่ส่งมาจาก Firebase)
        if (!skipSend && selectedDevice === 2) {
            sendSpeakMessage(text);
            showToast('ข้อความถูกส่งแล้ว');
            // ถ้าเป็นภาษาอังกฤษ ให้ return ไม่พูดเอง (พูดเฉพาะรอบที่รับจาก Firebase)
            if (!isThaiText(text)) {
                updateMixResult(text); // อัปเดต mixResult แม้จะไม่พูดเอง
                return;
            }
        }
        // ทุกเครื่องพูดเองเสมอ (ภาษาไทยพูดได้ทั้งสองรอบ, ภาษาอังกฤษพูดเฉพาะรอบเดียว)
        if (responsiveVoice) {
            highlightSpeakingButton(text);
            const isThai = isThaiText(text);
            const voice = isThai ? 'Thai Male' : 'UK English Male';
            responsiveVoice.speak(text, voice, {
                onend: removeSpeakingHighlight,
                onerror: (error) => {
                    console.error('Speech error:', error);
                    removeSpeakingHighlight();
                },
                rate: 1.0,
                pitch: 1.0,
                volume: 1.0
            });
        } else {
            console.warn('ResponsiveVoice not available');
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = isThaiText(text) ? 'th-TH' : 'en-US';
                utterance.onend = removeSpeakingHighlight;
                speechSynthesis.speak(utterance);
            }
        }
        updateMixResult(text); // อัปเดต mixResult ทุกครั้งที่พูด
    } catch (error) {
        console.error('Error in speakText:', error);
        showError('Error speaking text');
    }
}

function isThaiText(text) {
    return /[\u0E00-\u0E7F]/.test(text);
}

function highlightSpeakingButton(text) {
    document.querySelectorAll('.word-button').forEach(button => {
        if (button.getAttribute('data-word') === text) {
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

async function toggleMixingMode() {
    const cancelMixButton = document.getElementById('btn-cancel-mix');
    let mixedText = '';

    if (isSelectMode) {
        mixedText = selectedWords.join(' ');
        if (mixedText.trim()) {
            try {
                // Save mixed text to the storage sheet first
                await saveMixedTextToStorage(mixedText);
                showToast('บันทึกคำผสมสำเร็จ!');
                
                // Speak the mixed text after saving
                speakText(mixedText);
                
                // Update the mix result display
                updateMixResult(mixedText);
            } catch (error) {
                console.error('Error saving mixed text:', error);
                showError('เกิดข้อผิดพลาดในการบันทึกคำผสม: ' + error.message);
            }
        }
        
        // Clear selection after speaking
        selectedWords = [];
        updateSelectionUI();
    }

    isSelectMode = !isSelectMode;
    updateMixingUI();

    // Show or hide the cancel mix button
    if (isSelectMode) {
        cancelMixButton.classList.remove('hidden');
    } else {
        cancelMixButton.classList.add('hidden');
    }

    // Only reload category data if we're exiting mix mode
    if (!isSelectMode) {
        loadCategoryData();
    }
}

async function saveMixedTextToStorage(mixedText) {
    const sheetName = CATEGORY_SHEETS['คลัง']; // Use the 'storage' sheet
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!A:A:append?valueInputOption=USER_ENTERED`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            values: [[mixedText]]
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

function cancelMixingMode() {
    isSelectMode = false;
    selectedWords = [];
    updateSelectionUI();
    updateMixResult();
    updateMixingUI();

    // Hide the cancel mix button
    document.getElementById('btn-cancel-mix').classList.add('hidden');
}

// Modify updateMixingUI to handle the cancel mix button
function updateMixingUI() {
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

    document.querySelectorAll('.category-button').forEach(button => {
        button.disabled = false;
        button.classList.remove('opacity-50');
    });
}

// Error Handling
function showError(message) {
    const errorToast = document.createElement('div');
    errorToast.className = `fixed bottom-4 right-4 
        bg-gradient-to-r from-red-500 to-red-400
        text-white px-6 py-3 rounded-xl shadow-lg z-50
        opacity-0 transition-all duration-300 ease-in-out
        border-l-4 border-red-600`;
    errorToast.textContent = message;
    
    document.body.appendChild(errorToast);
    
    // Trigger animation
    setTimeout(() => errorToast.classList.add('opacity-100'), 10);
    
    setTimeout(() => {
        errorToast.classList.remove('opacity-100');
        setTimeout(() => errorToast.remove(), 300);
    }, 5000);
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 left-1/2 transform -translate-x-1/2 
        bg-gradient-to-r from-green-500 to-green-400 
        text-white px-6 py-3 rounded-xl shadow-lg z-50
        opacity-0 transition-all duration-300 ease-in-out`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('opacity-100'), 10);
    
    setTimeout(() => {
        toast.classList.remove('opacity-100');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}


function preloadVoices() {
    // Preload Thai voice
    responsiveVoice.speak("", "Thai Male", { 
        volume: 0,
        onend: () => window._voices.thai.loaded = true 
    });
    
    // Preload English voice
    responsiveVoice.speak("", "US English Male", { 
        volume: 0,
        onend: () => window._voices.english.loaded = true 
    });
}

// Initialize voice on page load
document.addEventListener('DOMContentLoaded', () => {
    const voiceInitialized = initializeVoice();
    if (!voiceInitialized) {
        console.warn('Voice functionality may be limited due to initialization issues');
    }
});

// Add New Word
async function addNewWord() {
    const newWord = elements.newWordInput.value.trim();
    
    if (!newWord) {
        showError('กรุณากรอกคำศัพท์');
        return;
    }

    // รวบรวมคำศัพท์ทั้งหมดจากปุ่มที่แสดงอยู่
    const words = Array.from(document.querySelectorAll('.word-button'))
                      .map(button => button.getAttribute('data-word'));
    
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

// Delete Selected Words
function toggleDeleteMode() {
    isSelectMode = !isSelectMode;

    // Update the delete button text and style
    const deleteButton = document.getElementById('btn-delete');
    const cancelDeleteButton = document.getElementById('btn-cancel-delete');

    if (isSelectMode) {
        deleteButton.textContent = 'ยืนยันลบ';
        deleteButton.classList.remove('bg-red-500');
        deleteButton.classList.add('bg-yellow-500');
        cancelDeleteButton.classList.remove('hidden'); // Show cancel delete button
    } else {
        deleteButton.textContent = 'ลบ';
        deleteButton.classList.remove('bg-yellow-500');
        deleteButton.classList.add('bg-red-500');
        cancelDeleteButton.classList.add('hidden'); // Hide cancel delete button
        selectedWords = []; // Clear selected words when exiting delete mode
        updateSelectionUI();
        updateMixResult();
    }

    // Reload category data to show or hide selection indicators
    loadCategoryData();
}

// Add a function to handle canceling delete mode
function cancelDeleteMode() {
    if (isSelectMode) {
        toggleDeleteMode(); // Exit delete mode
    }
}

// Add event listener for the cancel delete button
document.getElementById('btn-cancel-delete').addEventListener('click', cancelDeleteMode);

async function deleteSelectedWord() {
    if (!isSelectMode) {
        toggleDeleteMode(); // Enter select mode if not already in it
        return;
    }

    // Confirm deletion
    if (selectedWords.length === 0) {
        showError('ไม่มีคำที่เลือกไว้');
        return;
    }

    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบคำที่เลือกทั้งหมด?`)) {
        return;
    }

    try {
        // Delete selected words from Google Sheets
        for (const word of selectedWords) {
            await deleteWordFromSheet(word, currentCategory);
        }

        // Clear selected words
        selectedWords = [];

        // Exit delete mode
        toggleDeleteMode();

        // Reload data and update UI
        loadCategoryData();
        showToast('ลบคำที่เลือกสำเร็จ!');
    } catch (error) {
        showError('เกิดข้อผิดพลาดในการลบคำ: ' + error.message);
        console.error('Error deleting words:', error);
    }
}

async function deleteWordFromSheet(word, category) {
    const sheetName = CATEGORY_SHEETS[category];
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`;

    // Fetch the row index of the word to delete
    const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}?majorDimension=ROWS`;
    const getResponse = await fetch(getUrl, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (!getResponse.ok) {
        throw new Error(`ไม่สามารถดึงข้อมูลได้: ${getResponse.statusText}`);
    }

    const data = await getResponse.json();
    const rowIndex = data.values.findIndex(row => row.includes(word));

    if (rowIndex === -1) {
        throw new Error(`ไม่พบคำที่ต้องการลบ: ${word}`);
    }

    // Prepare the batchUpdate request to delete the row
    const requestBody = {
        requests: [
            {
                deleteDimension: {
                    range: {
                        sheetId: await getSheetId(sheetName),
                        dimension: "ROWS",
                        startIndex: rowIndex,
                        endIndex: rowIndex + 1
                    }
                }
            }
        ]
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        if (response.status === 401) {
            showError('การยืนยันตัวตนล้มเหลว กรุณาล็อกอินใหม่');
            authenticate();
            return;
        }
        throw new Error(`ไม่สามารถลบข้อมูลได้: ${response.statusText}`);
    }
}

async function getSheetId(sheetName) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`;
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (!response.ok) {
        throw new Error(`ไม่สามารถดึงข้อมูล Sheet ID ได้: ${response.statusText}`);
    }

    const data = await response.json();
    const sheet = data.sheets.find(sheet => sheet.properties.title === sheetName);

    if (!sheet) {
        throw new Error(`ไม่พบ Sheet: ${sheetName}`);
    }

    return sheet.properties.sheetId;
}

// Replace the old drag and drop implementation with this improved version
function initializeDragAndDrop() {
    const container = elements.buttonContainer;
    let draggedElement = null;

    container.addEventListener('dragstart', (e) => {
        if (!e.target.classList.contains('word-button')) return;
        draggedElement = e.target;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', e.target.getAttribute('data-word'));
    });

    container.addEventListener('dragend', (e) => {
        if (!e.target.classList.contains('word-button')) return;
        e.target.classList.remove('dragging');
        draggedElement = null;
        saveWordOrder();
    });

    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!draggedElement) return;

        const targetButton = e.target.closest('.word-button');
        if (!targetButton || targetButton === draggedElement) return;

        const boundingRect = targetButton.getBoundingClientRect();
        const isAfter = e.clientY > boundingRect.top + boundingRect.height / 2;

        if (isAfter) {
            targetButton.parentNode.insertBefore(draggedElement, targetButton.nextSibling);
        } else {
            targetButton.parentNode.insertBefore(draggedElement, targetButton);
        }
    });
}

// Add new function to save word order
async function saveWordOrder() {
    const words = Array.from(elements.buttonContainer.querySelectorAll('.word-button'))
        .map(button => button.getAttribute('data-word'));

    const sheetName = CATEGORY_SHEETS[currentCategory];
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!A1:A${words.length}?valueInputOption=RAW`;

    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                range: `${sheetName}!A1:A${words.length}`,
                majorDimension: "ROWS",
                values: words.map(word => [word])
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || response.statusText);
        }

        // แสดง toast เมื่อบันทึกสำเร็จ
        showToast('บันทึกลำดับคำสำเร็จ');
    } catch (error) {
        console.error('Error saving word order:', error);
        showError('ไม่สามารถบันทึกลำดับคำได้: ' + error.message);
    }
}

// Update the CSS for better drag and drop visual feedback
const dragDropStyles = `
    .word-button {
        cursor: grab;
        touch-action: none;
        user-select: none;
    }
    .word-button:active {
        cursor: grabbing;
    }
    .word-button.dragging {
        opacity: 0.7;
        cursor: grabbing;
        background-color: #2563eb;
        transform: scale(1.02);
        z-index: 1000;
    }
`;

// Remove existing style element if it exists
const existingStyle = document.querySelector('style[data-dragdrop-styles]');
if (existingStyle) {
    existingStyle.remove();
}

// Add new style element
const styleElement = document.createElement('style');
styleElement.setAttribute('data-dragdrop-styles', '');
styleElement.textContent = dragDropStyles;
document.head.appendChild(styleElement);

// UI สำหรับเลือกเครื่อง (Floating, modern style, responsive)
function renderDeviceSelector() {
    if (document.getElementById('device-1-btn')) return;
    const container = document.createElement('div');
    container.id = 'device-selector-floating';
    container.className = `fixed top-2 sm:top-3 md:top-4 right-2 sm:right-3 md:right-4 
        z-50 flex gap-2 sm:gap-3 items-center 
        p-2 sm:p-3 
        bg-gradient-to-br from-blue-400 via-white to-green-300 
        rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl md:shadow-2xl 
        border border-blue-200 backdrop-blur-md 
        transition-all duration-300
        scale-90 sm:scale-95 md:scale-100`;
    container.innerHTML = `
        <span class="hidden md:inline text-sm sm:text-base font-semibold text-gray-700 mr-2 drop-shadow">เลือกเครื่องสนทนา:</span>
        <button id="device-1-btn" class="px-3 sm:px-4 md:px-5 
            py-1.5 sm:py-2 
            rounded-full transition-all duration-150 
            focus:outline-none focus:ring-2 focus:ring-blue-400 
            text-sm sm:text-base md:text-lg 
            shadow-md border-2 
            ${selectedDevice === 1 ? 'font-bold ring-2 ring-blue-400 bg-gradient-to-r from-blue-500 to-blue-400 text-white border-blue-500 scale-105' : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-100'}">
            เครื่องผู้พูด
        </button>
        <button id="device-2-btn" class="px-3 sm:px-4 md:px-5 
            py-1.5 sm:py-2 
            rounded-full transition-all duration-150 
            focus:outline-none focus:ring-2 focus:ring-green-400 
            text-sm sm:text-base md:text-lg 
            shadow-md border-2 
            ${selectedDevice === 2 ? 'font-bold ring-2 ring-green-400 bg-gradient-to-r from-green-500 to-green-400 text-white border-green-500 scale-105' : 'bg-white text-green-700 border-green-300 hover:bg-green-100'}">
            คู่สนทนา
        </button>
    `;
    document.body.appendChild(container);

    document.getElementById('device-1-btn').onclick = () => {
        selectedDevice = 1;
        updateDeviceSelectorUI();
    };
    document.getElementById('device-2-btn').onclick = () => {
        selectedDevice = 2;
        updateDeviceSelectorUI();
    };
}

function updateDeviceSelectorUI() {
    const btn1 = document.getElementById('device-1-btn');
    const btn2 = document.getElementById('device-2-btn');
    if (!btn1 || !btn2) return;
    btn1.className = `px-3 sm:px-4 md:px-5 
        py-1.5 sm:py-2 
        rounded-full transition-all duration-150 
        focus:outline-none focus:ring-2 focus:ring-blue-400 
        text-sm sm:text-base md:text-lg 
        shadow-md border-2 
        ${selectedDevice === 1 ? 'font-bold ring-2 ring-blue-400 bg-gradient-to-r from-blue-500 to-blue-400 text-white border-blue-500 scale-105' : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-100'}`;
    btn2.className = `px-3 sm:px-4 md:px-5 
        py-1.5 sm:py-2 
        rounded-full transition-all duration-150 
        focus:outline-none focus:ring-2 focus:ring-green-400 
        text-sm sm:text-base md:text-lg 
        shadow-md border-2 
        ${selectedDevice === 2 ? 'font-bold ring-2 ring-green-400 bg-gradient-to-r from-green-500 to-green-400 text-white border-green-500 scale-105' : 'bg-white text-green-700 border-green-300 hover:bg-green-100'}`;
}

// เรียก renderDeviceSelector เมื่อโหลดหน้า
document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...
    renderDeviceSelector();
    // ...existing code...
});