// ฟังก์ชันเพื่อแสดง modal
function showModal() {
    document.getElementById('modal').classList.remove('hidden');
}

// ฟังก์ชันเพื่อปิด modal
function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

// ฟังก์ชันเพิ่มปุ่มใหม่
async function addButton() {
    const userInput = document.getElementById('buttonText').value.trim();

    if (userInput) {
        // เพิ่มปุ่มไปที่ Firestore
        await addButtonToFirestore(userInput);

        // ล้างค่าใน input และปิด modal
        document.getElementById('buttonText').value = '';
        closeModal();
    } else {
        alert("กรุณากรอกข้อความก่อน!");
    }
}

// ฟังก์ชันเพิ่มปุ่มไปยัง Firestore
async function addButtonToFirestore(text) {
    try {
        const docRef = await addDoc(collection(db, "buttons"), {
            text: text,
        });
        console.log("Document written with ID: ", docRef.id);
        // เรียกฟังก์ชันนี้เพื่อดึงข้อมูลหลังจากเพิ่มปุ่มใหม่
        getButtonsFromFirestore();
    } catch (e) {
        console.error("Error adding document: ", e);
    }
}

// ฟังก์ชันดึงข้อมูลจาก Firestore และแสดงปุ่ม
async function getButtonsFromFirestore() {
    const querySnapshot = await getDocs(collection(db, "buttons"));
    querySnapshot.forEach((doc) => {
        console.log(doc.id, " => ", doc.data());
        displayButtons(doc.data().text); // แสดงข้อมูลในหน้าเว็บ
    });
}

// ฟังก์ชันเพื่อแสดงปุ่ม
function displayButtons(text) {
    const buttonContainer = document.getElementById("button-container");
    const button = document.createElement("button");
    button.textContent = text;
    button.classList.add("bg-blue-500", "text-white", "px-6", "py-3", "rounded", "text-sm", "mb-2");
    button.onclick = function() {
        speakText(text);
    };
    buttonContainer.appendChild(button);
}

// ฟังก์ชันสำหรับพูดข้อความ
function speakText(text) {
    if (typeof responsiveVoice !== "undefined") {
        responsiveVoice.speak(text, "Thai Male");
    } else {
        alert("ResponsiveVoice not loaded properly.");
    }
}

// เรียกฟังก์ชันนี้เมื่อหน้าเว็บโหลด
window.onload = getButtonsFromFirestore;