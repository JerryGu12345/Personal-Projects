// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const AWS = require("aws-sdk");
const { OpenAI } = require("openai");

const app = express();
app.use(cors());
app.use(express.json());

const polly = new AWS.Polly({
  region: "us-east-1",
  accessKeyId: process.env.AWS_KEY,
  secretAccessKey: process.env.AWS_SECRET
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/polly", async (req, res) => {
  const { text } = req.body;

  const params = {
    Text: text,
    OutputFormat: "mp3",
    VoiceId: "Matthew"
  };

  const audio = await polly.synthesizeSpeech(params).promise();
  const base64 = audio.AudioStream.toString("base64");
  const audioUrl = `data:audio/mp3;base64,${base64}`;
  res.json({ audioUrl });
});

app.post("/openai", async (req, res) => {
  const { prompt } = req.body;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }]
  });

  const value = completion.choices[0].message.content.trim();
  res.json({ value });
});

const mongoose = require("mongoose");

mongoose.connect("mongodb://localhost:27017/test", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected"))
.catch(err => console.error("MongoDB connection error:", err));

const callLogSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  name: { type: String, required: true },
  company: { type: String, required: true },
  reason: { type: String, required: true },
  summary: { type: String, required: true },
  timestamp: { type: Number, default: Date.now },
});

const CallLog = mongoose.model("CallLog", callLogSchema);

app.post("/mongo", async (req, res) => {
  try {
    const { phone, name, company, reason, summary } = req.body;
    const newCall = new CallLog({ phone, name, company, reason, summary });
    await newCall.save();
    res.status(201).json({ message: "Call log saved successfully." });
  } catch (error) {
    res.status(500).json({ error: "Failed to save call log." });
  }
});

app.get("/mongo", async (req, res) => {
  try {
    const callLogs = await CallLog.find();
    res.status(200).json(callLogs);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve call logs." });
  }
});

const path = require("path");

app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
