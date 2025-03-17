// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyARNZnEEdWI8fkkzxK6ZsLAAMLKsMRcBao",
    authDomain: "ramspeechtest.firebaseapp.com",
    projectId: "ramspeechtest",
    storageBucket: "ramspeechtest.firebasestorage.app",
    messagingSenderId: "271962080875",
    appId: "1:271962080875:web:5e06af487e59a80bc3d32e",
    measurementId: "G-MX7BFVHMTE"
  };
  
  // เริ่มต้นการใช้งาน Firebase
  const app = firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore(); 
  
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
          text: text
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
      db.collection("buttons").get().then((querySnapshot) => {
          querySnapshot.forEach((doc) => {
              displayButton(doc.data().text);
          });
      });
  }
  
  // แสดงปุ่มที่ดึงมาจาก Firestore
  function displayButton(text) {
      const buttonContainer = document.getElementById("button-container");
      const button = document.createElement("button");
      button.textContent = text;
      button.classList.add("bg-blue-500", "text-white", "px-6", "py-3", "rounded", "text-sm", "mb-2");
      button.onclick = function() {
          speakText(text);
      };
      buttonContainer.appendChild(button);
  }
  
  // เมื่อหน้าโหลดจะดึงปุ่มจาก Firestore
  window.onload = getButtonsFromFirestore;