const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const INPUT_FOLDER = path.join(__dirname, "../audits-input");

// your existing API endpoint
const API_URL = "https://learncomms-backend.onrender.com/api/qa-audit-audio";

async function processFiles() {
  const files = fs.readdirSync(INPUT_FOLDER);

  for (const file of files) {
    if (!file.endsWith(".mp3")) continue;

    const filePath = path.join(INPUT_FOLDER, file);
    console.log("Processing:", file);

    try {
      const formData = new FormData();
      formData.append("mode", "call");
      formData.append("audio", fs.createReadStream(filePath));

      const res = await axios.post(API_URL, formData, {
        headers: formData.getHeaders(),
      });

      console.log("✅ Done:", file);
      console.log("Score:", res.data.finalScore);

    } catch (err) {
      console.error("❌ Failed:", file, err.message);
    }
  }
}

processFiles();
