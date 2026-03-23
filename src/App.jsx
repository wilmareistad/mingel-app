import { useState } from 'react'
import './App.css'

import { collection, addDoc } from "firebase/firestore";
import { db } from "./services/firebase";

function App() {

  const handleClick = async () => {
    await addDoc(collection(db, "test"), {
      name: "hello"
    });
    console.log("Data skickad!");
  };


return (
  <div>
    <h1>Test</h1>
    <button onClick={handleClick}>
      Testa Firebase
    </button>
  </div>
)
}

export default App