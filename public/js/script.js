const fileId = "https://ramspeechtest.vercel.app/"; // ไฟล์ต้องเป็น Public
const apiKey = "AIzaSyBxfc4DKunSNuWQ8KwNcID8mcADK7udhPI";
const fileUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?key=${apiKey}&alt=media`;

fetch(fileUrl)
  .then(response => response.blob()) // ใช้ blob() ถ้าเป็นไฟล์รูป/เสียง
  .then(blob => {
    const url = URL.createObjectURL(blob);
    console.log("File URL:", url);
  })
  .catch(error => console.error("Error:", error));
  
window.location.href = authUrl;
// ฟังก์ชันเพื่อแสดง modal
function showModal() {
    document.getElementById('modal').classList.remove('hidden');
}

// ฟังก์ชันเพื่อปิด modal
function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

// ฟังก์ชันเพื่อเพิ่มปุ่มใหม่
function addButton() {
    const userInput = document.getElementById('buttonText').value.trim();

    if (userInput) {
        // สร้างปุ่มใหม่
        const newButton = document.createElement('button');
        newButton.textContent = userInput;
        newButton.classList.add('bg-blue-500', 'text-white', 'px-6', 'py-3', 'rounded', 'text-sm', 'sm:text-base', 'md:text-lg');
        newButton.onclick = function() {
            speakText(userInput);
        };

        // หาตำแหน่งของ button-container
        const container = document.getElementById('button-container');

        // เพิ่มปุ่มใหม่เข้าไปใน container
        container.appendChild(newButton);

        // ปิด modal
        closeModal();

        // ล้างค่าในฟอร์ม
        document.getElementById('buttonText').value = '';

        // เพิ่มปุ่มนี้ไปยัง Firestore
        addButtonToFirestore(userInput);
    } else {
        alert("กรุณากรอกข้อความก่อน!");
    }
}

// ฟังก์ชันสำหรับพูดข้อความ
function speakText(text) {
    if (typeof responsiveVoice !== "undefined") {
        responsiveVoice.speak(text, "Thai Male");
    } else {
        alert("ResponsiveVoice not loaded properly.");
    }
}

// ฟังก์ชันเพิ่มปุ่มไปยัง Firestore
function addButtonToFirestore(text) {
    db.collection("buttons").add({
        text: text,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(function(docRef) {
        console.log("Document written with ID: ", docRef.id);
    })
    .catch(function(error) {
        console.error("Error adding document: ", error);
    });
}

// ดึงข้อมูลปุ่มจาก Firestore และแสดงบนหน้า
function getButtonsFromFirestore() {
    db.collection("buttons")
        .orderBy("timestamp", "desc")
        .get()
        .then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                displayButton(doc.data().text);
            });
        })
        .catch((error) => {
            console.error("Error getting documents: ", error);
        });
}

// แสดงปุ่มที่ดึงมาจาก Firestore
function displayButton(text) {
    const buttonContainer = document.getElementById("button-container");
    const button = document.createElement("button");
    button.textContent = text;
    button.classList.add("bg-blue-500", "text-white", "px-6", "py-3", "rounded", "text-sm", "sm:text-base", "md:text-lg");
    button.onclick = function() {
        speakText(text);
    };
    buttonContainer.appendChild(button);
}

// เมื่อหน้าโหลดจะดึงปุ่มจาก Firestore
window.onload = function() {
    // ดีเลย์เล็กน้อยเพื่อให้แน่ใจว่า Firebase โหลดเสร็จแล้ว
    setTimeout(getButtonsFromFirestore, 500);
};


