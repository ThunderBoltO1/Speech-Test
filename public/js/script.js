// OAuth2
const CLIENT_ID = '271962080875-khc6aslq3phrnm9cqgguk37j0funtr7f.apps.googleusercontent.com';
const REDIRECT_URI = 'https://ramspeechtest.vercel.app';
const sheetId = "1YY1a1drCnfXrSNWrGBgrMaMlFQK5rzBOEoeMhW9MYm8";
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
const API_KEY = 'AIzaSyCugN1kot7Nij2PWhKsP08I6yeHNgsYrQI';

let accessToken = '';  // Store access token

// Global variable
let buttonsByCategory = {};
let currentCategory = "ทั่วไป";  // Default category
let selectedWords = [];  // Array to hold selected words for mixing

// Function to speak mixed words
function speakMixedWord(text) {
    if (responsiveVoice) {
        responsiveVoice.speak(text, "Thai Male");
    } else {
        alert("ไม่พบ ResponsiveVoice API");
    }
}

// Function to open modal for adding a new word
function openModal() {
    document.getElementById('buttonText').value = '';
    document.getElementById('modal').classList.remove('hidden');
}

// Function to close modal
function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

function addButton() {
    const newButtonText = document.getElementById('buttonText').value.trim();
    if (newButtonText === "") {
        alert("กรุณากรอกข้อความ");
        return;
    }

    // Add the new word to the selected category
    if (!buttonsByCategory[currentCategory]) {
        buttonsByCategory[currentCategory] = [];
    }
    buttonsByCategory[currentCategory].push(newButtonText);

    // Update the button list
    setCategory(currentCategory);

    // Determine the sheet name based on the selected category
    const categorySheet = currentCategory === "ทั่วไป" ? "common" :
                          currentCategory === "ความต้องการ" ? "need" :
                          currentCategory === "คลัง" ? "storage" : "common";

    // API URL for adding a new word to Google Sheets based on the category
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${categorySheet}!A:A:append?valueInputOption=RAW&key=${API_KEY}`;
    
    fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            values: [[newButtonText]]  // Send the new word as an array
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log("คำใหม่ถูกเพิ่มแล้ว:", data);
    })
    .catch(error => {
        console.error("ไม่สามารถเพิ่มคำไปยัง Google Sheets:", error);
        alert("ไม่สามารถเพิ่มคำไปยัง Google Sheets ได้");
    });

    closeModal();
}

// Function to load words for mixing from the selected category
function loadWordsForMixing() {
    const wordButtonsContainer = document.getElementById('word-buttons-container');
    if (!wordButtonsContainer) {
        console.error('word-buttons-container not found!');
        return;
    }

    // Clear any previous buttons before adding new ones
    wordButtonsContainer.innerHTML = '';

    // Fetch words for the current category from Google Sheets
    const categorySheet = currentCategory === "ทั่วไป" ? "common" :
                          currentCategory === "ความต้องการ" ? "need" :
                          currentCategory === "คลัง" ? "storage" : "common";

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${categorySheet}?key=${API_KEY}`;
    
    fetch(url, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
        }
    })
    .then(response => response.json())
    .then(data => {
        const categoryWords = data.values?.map(row => row[0]) || [];

        if (categoryWords.length > 0) {
            categoryWords.forEach(function(word) {
                let button = document.createElement("button");
                button.className = "px-4 py-2 bg-blue-500 text-white rounded-lg transition-all duration-300 hover:bg-blue-600";
                button.innerText = word;
                button.onclick = () => selectWordForMixing(word);  // Use this function for word selection
                wordButtonsContainer.appendChild(button);
            });
        } else {
            console.log(`ไม่พบคำในหมวดหมู่ ${currentCategory}`);
        }
    })
    .catch(error => {
        console.error("ไม่สามารถดึงข้อมูลจาก Google Sheets:", error);
        alert("ไม่สามารถดึงข้อมูลจาก Google Sheets ได้");
    });
}

// Function for selecting words for mixing
function selectWordForMixing(word) {
    if (selectedWords.includes(word)) {
        selectedWords = selectedWords.filter(w => w !== word); // Remove word if already selected
    } else {
        selectedWords.push(word); // Add word to selectedWords array
    }

    console.log("Selected Words:", selectedWords);
}

// Function to mix selected words
function mixWords() {
    if (selectedWords.length < 2) {
        alert("กรุณาเลือกคำอย่างน้อย 2 คำ");
        return;
    }

    const mixedWord = selectedWords.join(" ");

    // Display the mixed words
    document.getElementById('mix-result').innerHTML = `
        <h1 class="text-2xl font-bold mt-4">${mixedWord}</h1>
        <button onclick="speakMixedWord('${mixedWord}')" class="mt-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-300">พูด</button>
    `;

    // Send the mixed words to Google Sheets (based on the selected category)
    const categorySheet = currentCategory === "คลัง" ? "storage" : currentCategory === "ความต้องการ" ? "need" : "storage"; 

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${categorySheet}!A:A:append?valueInputOption=RAW&key=${API_KEY}`;
    
    fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            values: [[mixedWord]]  // Send the mixed word as an array
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log("คำผสมถูกเพิ่มแล้ว:", data);
    })
    .catch(error => {
        console.error("ไม่สามารถเพิ่มคำผสมไปยัง Google Sheets:", error);
        alert("ไม่สามารถเพิ่มคำผสมไปยัง Google Sheets ได้");
    });

    closeMixModal();  // Close the modal after mixing words
}

// Function to close the mix words modal
function closeMixModal() {
    document.getElementById('mix-modal').classList.add('hidden');
}

// Function to handle category change and update the background color
function setCategory(category) {
    currentCategory = category;
    loadWordsForMixing();
    changeBackgroundColor(category);
}

// Function to change background color based on category
function changeBackgroundColor(category) {
    const body = document.body;
    switch (category) {
        case "ทั่วไป":
            body.style.backgroundColor = "#f0f4f8"; // Light blue for "ทั่วไป"
            break;
        case "ความต้องการ":
            body.style.backgroundColor = "#fffbf0"; // Light yellow for "ความต้องการ"
            break;
        case "คลัง":
            body.style.backgroundColor = "#f0f8f0"; // Light green for "คลัง"
            break;
        default:
            body.style.backgroundColor = "#ffffff"; // White background as default
            break;
    }
}