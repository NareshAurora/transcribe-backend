const express = require("express");
const multer = require("multer");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 3000;

// Google Generative AI configuration
const apiKey = process.env.GEMINI_API_KEY || "AIzaSyAwVSl8sS2U5GkIlhDj4YpivE_mZqyblZw";
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

// Setup CORS
app.use(cors());

// Setup rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests, please try again later.",
});
app.use(limiter);

// Multer setup for file uploads
const upload = multer({ dest: "uploads/" });

// Public API endpoint for audio transcription
app.post("/upload", upload.single("audio"), async (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    // Read file as base64
    const fileData = fs.readFileSync(file.path, { encoding: 'base64' });

    // Start chat session for transcription
    const chat = model.startChat();
    
    const result = await chat.sendMessage([
      {
        inlineData: {
          data: fileData,
          mimeType: "audio/mpeg"
        }
      },
      {
        text: "Generate audio diarization, including transcriptions and speaker information for each transcription. Organize the transcription by the time they happened."
      }
    ]);

    res.json({ transcription: result.response.text() });
  } catch (error) {
    console.error("Error processing file:", error);
    res.status(500).json({ error: "Failed to process the file" });
  } finally {
    // Clean up uploaded file
    fs.unlink(file.path, (err) => {
      if (err) console.error("Failed to delete uploaded file:", err);
    });
  }
});

app.get("/", (req, res) => {
  res.send("Welcome to the Gemini AI Audio Transcription API");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
