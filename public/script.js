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
let isMixMode = false; // เพิ่มตัวแปรสำหรับแยกโหมดผสมคำและลบคำ

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
    document.getElementById('btn-delete').addEventListener('click', toggleDeleteMode);
    
    // เพิ่ม event listener สำหรับปุ่มยกเลิกผสมคำและปุ่มพูดผสมคำ
    if (document.getElementById('btn-cancel-mix')) {
        document.getElementById('btn-cancel-mix').addEventListener('click', cancelMixingMode);
    }
    
    // เพิ่ม Event Listener สำหรับปุ่มพูดผสมคำ (จะสร้างภายหลัง)
    if (document.getElementById('btn-speak-mix')) {
        document.getElementById('btn-speak-mix').addEventListener('click', speakMixedWords);
    }
    
    handleAuthResponse();
    
    // สร้างปุ่มพูดผสมคำถ้ายังไม่มี
    createSpeakMixButton();
});

// สร้างปุ่มพูดผสมคำ
function createSpeakMixButton() {
    // ตรวจสอบว่ามีปุ่มนี้อยู่แล้วหรือไม่
    if (!document.getElementById('btn-speak-mix')) {
        const buttonContainer = document.querySelector('.button-group') || document.querySelector('.flex.justify-center');
        
        if (buttonContainer) {
            const speakMixButton = document.createElement('button');
            speakMixButton.id = 'btn-speak-mix';
            speakMixButton.className = 'bg-purple-500 text-white px-4 py-2 rounded mr-2 hidden'; // เริ่มต้นให้ซ่อนไว้
            speakMixButton.textContent = 'พูดผสมคำ';
            speakMixButton.addEventListener('click', speakMixedWords);
            
            // แทรกปุ่มไว้ก่อนปุ่มยกเลิกผสมคำ (ถ้ามี)
            const cancelMixButton = document.getElementById('btn-cancel-mix');
            if (cancelMixButton) {
                buttonContainer.insertBefore(speakMixButton, cancelMixButton);
            } else {
                buttonContainer.appendChild(speakMixButton);
            }
        }
    }
}

// ฟังก์ชันสำหรับพูดคำที่ผสมและบันทึกลงคลัง
function speakMixedWords() {
    const mixedText = selectedWords.join(' ');
    if (mixedText.trim()) {
        speakText(mixedText);
        saveToStorage(mixedText);
    } else {
        showError('ยังไม่ได้เลือกคำสำหรับผสม');
    }
}

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
        if (!data.values) {
            throw new Error('ไม่มีข้อมูลใน Google Sheets');
        }
        
        // กรองคำว่างออกก่อนแสดงผล
        const filteredWords = data.values[0].filter(word => word && word.trim() !== '');
        renderButtons(filteredWords);
    } catch (error) {
        console.error('Error loading category data:', error);
        showError('ไม่สามารถโหลดข้อมูลได้: ' + error.message);
    }
}

function renderButtons(words = []) {
    if (elements.buttonContainer) {
        // สร้าง HTML สำหรับปุ่มคำศัพท์
        elements.buttonContainer.innerHTML = words.map(word => `
            <button class="word-button flex-1 text-left bg-blue-500 text-white px-4 py-2 rounded-full m-2 hover:bg-blue-600 transition-all"
                    data-word="${word}">
                ${word}
                ${isSelectMode ? `<span class="selection-indicator ml-2">${selectedWords.includes(word) ? '✔️' : ''}</span>` : ''}
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
    }
}

// UI Functions
function setCategory(category) {
    currentCategory = category;
    // เคลียร์คำที่เลือกเมื่อเปลี่ยนหมวดหมู่ในโหมดปกติ
    if (!isSelectMode) {
        selectedWords = [];
        updateSelectionUI();
    }
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
    
    // อัปเดตเฉพาะสถานะการเลือกบนปุ่ม
    document.querySelectorAll('.word-button').forEach(button => {
        if (button.getAttribute('data-word') === word) {
            const indicator = button.querySelector('.selection-indicator');
            if (indicator) {
                indicator.textContent = selectedWords.includes(word) ? '✔️' : '';
            }
            button.classList.toggle('bg-green-500', selectedWords.includes(word)); // เปลี่ยนสีเป็นเขียว
        }
    });
}

function updateSelectionUI() {
    if (elements.selectedWordsContainer) {
        elements.selectedWordsContainer.innerHTML = selectedWords.map(word => `
            <span class="selected-word bg-green-500 text-white px-4 py-2 rounded-full inline-flex items-center m-1">
                ${word}
                <button class="ml-2 hover:text-gray-200" onclick="removeSelectedWord('${word}')">&times;</button>
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
            button.classList.remove('bg-green-500'); // ลบ class เพื่อเปลี่ยนสีกลับ
        }
    });
}

function updateMixResult(text = '') {
    if (elements.mixResult) {
        elements.mixResult.textContent = text || selectedWords.join(' ') || 'ยังไม่ได้เลือกคำ';
    }
}

// Speech Functions
function speakText(text) {
    if (typeof responsiveVoice !== 'undefined') {
        // Split long text into smaller chunks (sentences)
        const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
        let index = 0;

        const speakNextSentence = () => {
            if (index < sentences.length) {
                const sentence = sentences[index].trim();
                responsiveVoice.speak(sentence, "Thai Female", {
                    onstart: () => {
                        console.log('เริ่มพูด:', sentence);
                        highlightSpeakingButton(sentence);
                    },
                    onend: () => {
                        console.log('พูดเสร็จสิ้น:', sentence);
                        removeSpeakingHighlight();
                        index++;
                        speakNextSentence(); // Speak the next sentence
                    },
                    onerror: (error) => {
                        console.error('เกิดข้อผิดพลาดในการพูด:', error);
                        showError('ไม่สามารถพูดข้อความได้: ' + (error.error || 'unknown error'));
                        removeSpeakingHighlight();
                    }
                });
            } else {
                console.log('พูดข้อความทั้งหมดเสร็จสิ้น');
            }
        };

        speakNextSentence(); // Start speaking the first sentence
    } else {
        console.error('ResponsiveVoice.js ไม่พร้อมใช้งาน');
        showError('ไม่สามารถพูดข้อความได้');
    }
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

// ปรับปรุง toggleMixingMode เพื่อเปิดโหมดผสมคำ
function toggleMixingMode() {
    // ถ้าอยู่ในโหมดลบคำ ให้ออกจากโหมดลบคำก่อน
    if (isSelectMode && !isMixMode) {
        isSelectMode = false;
    }
    
    // สลับสถานะโหมดผสมคำ
    isMixMode = !isMixMode;
    isSelectMode = isMixMode; // ใช้ isSelectMode เพื่อความเข้ากันได้กับโค้ดเดิม
    
    // รีเซ็ตคำที่เลือกเมื่อเข้า/ออกโหมดผสมคำ
    selectedWords = [];
    updateSelectionUI();
    updateMixResult();
    
    // อัปเดต UI ตามโหมดใหม่
    updateMixingUI();
    
    // โหลดข้อมูลตามโหมด
    if (isMixMode) {
        loadAllCategoriesData();
    } else {
        loadCategoryData();
    }
}

// ฟังก์ชันสำหรับโหมดลบคำ
function toggleDeleteMode() {
    // ถ้าอยู่ในโหมดผสมคำ ให้ออกจากโหมดผสมคำก่อน
    if (isSelectMode && isMixMode) {
        isMixMode = false;
    }
    
    // สลับสถานะโหมดลบคำ
    isSelectMode = !isSelectMode;
    
    if (isSelectMode) {
        // เข้าสู่โหมดลบคำ
        selectedWords = [];
        updateSelectionUI();
        updateMixResult();
    } else {
        // ออกจากโหมดลบคำ
        if (selectedWords.length > 0) {
            // ถามยืนยันก่อนลบ
            if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบคำที่เลือกทั้งหมด ${selectedWords.length} คำออกจากหมวดหมู่ "${currentCategory}"?`)) {
                deleteSelectedWords();
            } else {
                // ยกเลิกการลบและออกจากโหมด
                selectedWords = [];
                updateSelectionUI();
                updateMixResult();
            }
        }
    }
    
    // อัปเดต UI ตามโหมดใหม่
    updateDeleteModeUI();
}

// ฟังก์ชันแยกสำหรับอัปเดต UI ในโหมดลบคำ
function updateDeleteModeUI() {
    const deleteButton = document.getElementById('btn-delete');
    const mixButton = document.getElementById('btn-mix');
    
    if (!deleteButton || !mixButton) return;
    
    if (isSelectMode && !isMixMode) {
        // โหมดลบคำ
        deleteButton.textContent = 'ลบคำที่เลือก';
        deleteButton.classList.add('bg-red-500');
        deleteButton.classList.remove('bg-yellow-500');
        mixButton.classList.add('opacity-50');
        mixButton.disabled = true;
    } else {
        // โหมดปกติ
        deleteButton.textContent = 'ลบคำ';
        deleteButton.classList.remove('bg-red-500');
        deleteButton.classList.add('bg-yellow-500');
        mixButton.classList.remove('opacity-50');
        mixButton.disabled = false;
    }
    
    // ปิดการใช้งานปุ่มหมวดหมู่เมื่ออยู่ในโหมดลบคำ
    document.querySelectorAll('.category-button').forEach(button => {
        button.disabled = isSelectMode && !isMixMode;
        if (isSelectMode && !isMixMode) {
            button.classList.add('opacity-50');
        } else {
            button.classList.remove('opacity-50');
        }
    });
}

// ฟังก์ชันใหม่สำหรับโหลดข้อมูลจากทุกหมวดหมู่
async function loadAllCategoriesData() {
    try {
        const allWords = [];
        for (const category in CATEGORY_SHEETS) {
            const sheetName = CATEGORY_SHEETS[category];
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}?majorDimension=COLUMNS`;

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
            if (data.values) {
                const filteredWords = data.values[0].filter(word => word && word.trim() !== '');
                allWords.push(...filteredWords);
            }
        }
        renderButtons([...new Set(allWords)]); // กำจัดคำซ้ำ
    } catch (error) {
        console.error('Error loading all categories data:', error);
        showError('ไม่สามารถโหลดข้อมูลจากทุกหมวดหมู่ได้: ' + error.message);
    }
}

// ปรับปรุงฟังก์ชันบันทึกลงคลัง
async function saveToStorage(mixedText) {
    try {
        // ตรวจสอบว่ามีคำอยู่แล้วหรือไม่
        const storageSheet = CATEGORY_SHEETS['คลัง'];
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${storageSheet}?majorDimension=COLUMNS`;
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        const existingWords = data.values && data.values[0] ? data.values[0] : [];
        
        // ถ้าคำผสมนี้มีอยู่แล้ว ไม่ต้องบันทึกซ้ำ
        if (existingWords.includes(mixedText)) {
            console.log('คำผสมนี้มีอยู่ใน "คลัง" แล้ว');
            showToast('คำผสมนี้มีอยู่ในคลังแล้ว');
            return;
        }
        
        // บันทึกคำผสมลงใน Sheet3 (คลัง)
        await addWordToSheet(mixedText, 'คลัง');
        showToast('บันทึกคำผสมลงในคลังสำเร็จ!');
        
    } catch (error) {
        console.error('Error saving mixed word to storage:', error);
        showError('ไม่สามารถบันทึกคำผสมลงในคลัง: ' + error.message);
    }
}

// ปรับปรุง updateMixingUI สำหรับโหมดผสมคำ
function updateMixingUI() {
    const mixButton = document.getElementById('btn-mix');
    const speakMixButton = document.getElementById('btn-speak-mix');
    const cancelMixButton = document.getElementById('btn-cancel-mix');
    const deleteButton = document.getElementById('btn-delete');

    if (!mixButton || !deleteButton) {
        console.error('Missing required DOM elements for updateMixingUI');
        return;
    }

    // สร้างปุ่มที่ยังไม่มี
    if (!speakMixButton) createSpeakMixButton();
    
    if (isMixMode) {
        // เข้าสู่โหมดผสมคำ
        mixButton.classList.add('hidden'); // ซ่อนปุ่มเข้าโหมดผสมคำ
        
        // แสดงปุ่มพูดผสมคำ
        if (document.getElementById('btn-speak-mix')) {
            document.getElementById('btn-speak-mix').classList.remove('hidden');
        }
        
        // แสดงปุ่มยกเลิกผสมคำ
        if (cancelMixButton) cancelMixButton.classList.remove('hidden');
        
        // ปิดการใช้งานปุ่มลบคำ
        deleteButton.classList.add('opacity-50');
        deleteButton.disabled = true;
    } else {
        // ออกจากโหมดผสมคำ
        mixButton.classList.remove('hidden'); // แสดงปุ่มเข้าโหมดผสมคำ
        
        // ซ่อนปุ่มพูดผสมคำ
        if (document.getElementById('btn-speak-mix')) {
            document.getElementById('btn-speak-mix').classList.add('hidden');
        }
        
        // ซ่อนปุ่มยกเลิกผสมคำ
        if (cancelMixButton) cancelMixButton.classList.add('hidden');
        
        // เปิดการใช้งานปุ่มลบคำ
        deleteButton.classList.remove('opacity-50');
        deleteButton.disabled = false;
    }

    // ปิดการใช้งานปุ่มหมวดหมู่เมื่ออยู่ในโหมดผสมคำ
    document.querySelectorAll('.category-button').forEach(button => {
        button.disabled = isMixMode;
        if (isMixMode) {
            button.classList.add('opacity-50');
        } else {
            button.classList.remove('opacity-50');
        }
    });
}

// ฟังก์ชันสำหรับยกเลิกโหมดผสมคำ
function cancelMixingMode() {
    isSelectMode = false;
    isMixMode = false;
    selectedWords = [];
    updateSelectionUI();
    updateMixResult();
    updateMixingUI();
    loadCategoryData(); // โหลดข้อมูลหมวดหมู่ปัจจุบันใหม่
}

// Error Handling
function showError(message) {
    const errorToast = document.createElement('div');
    errorToast.className = 'fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50';
    errorToast.textContent = message;
    
    document.body.appendChild(errorToast);
    
    setTimeout(() => {
        errorToast.remove();
    }, 5000);
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
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

// ปรับปรุงฟังก์ชัน deleteSelectedWords
async function deleteSelectedWords() {
    if (selectedWords.length === 0) {
        showError('ไม่มีคำที่เลือกไว้');
        return;
    }
    
    try {
        // สร้าง Array ของ Promise สำหรับการลบคำแต่ละคำ
        const deletePromises = selectedWords.map(word => deleteWordFromSheet(word, currentCategory));
        
        // รอให้ทุก Promise เสร็จสิ้น
        await Promise.all(deletePromises);
        
        showToast(`ลบคำศัพท์ ${selectedWords.length} คำออกจากหมวดหมู่เรียบร้อยแล้ว`);
        
        // เคลียร์คำที่เลือกและออกจากโหมดลบคำ
        selectedWords = [];
        isSelectMode = false;
        updateSelectionUI();
        updateMixResult('');
        updateDeleteModeUI();
        
        // โหลดข้อมูลใหม่
        loadCategoryData();
    } catch (error) {
        console.error('Error deleting selected words:', error);
        showError('เกิดข้อผิดพลาดในการลบคำที่เลือก: ' + error.message);
    }
}

// เพิ่มฟังก์ชันลบคำออกจาก Google Sheet
async function deleteWordFromSheet(word, category) {
    // ดึงชื่อชีทตามหมวดหมู่
    const sheetName = CATEGORY_SHEETS[category];
    
    try {
        // 1. ดึงข้อมูลทั้งหมดจากชีทปัจจุบัน
        const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}?majorDimension=COLUMNS`;
        const getResponse = await fetch(getUrl, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (!getResponse.ok) {
            throw new Error(`ไม่สามารถดึงข้อมูลชีทได้: ${getResponse.statusText}`);
        }
        
        const data = await getResponse.json();
        if (!data.values || !data.values[0]) {
            throw new Error('ไม่พบข้อมูลในชีท');
        }
        
        // 2. สร้างรายการคำใหม่โดยไม่รวมคำที่ต้องการลบ
        const words = data.values[0];
        const updatedWords = words.filter(item => item !== word);
        
        // 3. อัปเดตชีทด้วยข้อมูลใหม่
        const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!A:A?valueInputOption=USER_ENTERED`;
        const updateResponse = await fetch(updateUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                range: `${sheetName}!A:A`,
                majorDimension: 'COLUMNS',
                values: [updatedWords]
            })
        });
        
        if (!updateResponse.ok) {
            throw new Error(`ไม่สามารถอัปเดตชีทได้: ${updateResponse.statusText}`);
        }
        
        return true;
    } catch (error) {
        console.error(`Error deleting word '${word}' from category '${category}':`, error);
        throw error;
    }
}