//- One-time script to seed the database (can delete after you're done with it if you want to keep things tidy)

import admin from "firebase-admin";
import * as fs from "fs";

const serviceAccountPath = "./src/features/question/serviceAccountKey.json";
const questionsPath = "./src/features/question/questions.json";

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
const questions = JSON.parse(fs.readFileSync(questionsPath, "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function uploadQuestions() {
  try {
    console.log("Starting upload...");
    console.log(`Found ${Object.keys(questions).length} questions to upload`);
    
    const collection = db.collection("questions");

    for (const id in questions) {
      await collection.doc(id).set(questions[id]);
      console.log(`✓ Uploaded ${id}`);
    }

    console.log("✅ All questions uploaded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error uploading questions:", error);
    process.exit(1);
  }
}

uploadQuestions();