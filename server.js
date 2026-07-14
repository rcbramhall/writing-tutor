require("dotenv").config();
const crypto = require("crypto");
const express = require("express");
const multer = require("multer");
const mammoth = require("mammoth");
const { v4: uuidv4 } = require("uuid");
const OpenAI = require("openai");
const path = require("path");
const { buildSystemPrompt, ANALYSIS_TOOL } = require("./rubric");

const PORT = process.env.PORT || 3000;
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const MAX_ESSAY_CHARS = 60000; // ~12k words, generous for a WR121/122 essay

if (!process.env.GROQ_API_KEY) {
  console.warn(
    "WARNING: GROQ_API_KEY is not set. Copy .env.example to .env and add your key before analyzing essays."
  );
}

if (!process.env.APP_PASSWORD) {
  console.warn(
    "WARNING: APP_PASSWORD is not set — the app is unauthenticated. Set APP_PASSWORD before deploying publicly."
  );
}

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1"
});

const app = express();

// Unauthenticated health check for Render (or any host) to poll — must stay
// reachable with no password, or the platform's health probe gets a 401 and
// never marks the service as live.
app.get("/healthz", (req, res) => res.status(200).send("ok"));

function requirePassword(req, res, next) {
  const configuredPassword = process.env.APP_PASSWORD;
  if (!configuredPassword) return next(); // no password set: open access (local dev default)

  const header = req.headers.authorization || "";
  const [scheme, encoded] = header.split(" ");
  if (scheme === "Basic" && encoded) {
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    const separatorIndex = decoded.indexOf(":");
    const suppliedPassword = separatorIndex === -1 ? "" : decoded.slice(separatorIndex + 1);
    const supplied = Buffer.from(suppliedPassword);
    const expected = Buffer.from(configuredPassword);
    if (supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected)) {
      return next();
    }
  }

  res.set("WWW-Authenticate", 'Basic realm="Writing Tutor"');
  res.status(401).send("Authentication required.");
}

app.use(requirePassword);
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// sessionId -> { courseLevel, essayContext, chatHistory: [{role, content}] }
const sessions = new Map();

const SANITIZE_SYSTEM_PROMPT = `You are a strict editor checking a writing tutor's reply before it reaches a student. The tutor must never hand the student a sentence, phrase, thesis statement, transition, or citation phrased so the student could copy it straight into their essay — including anything introduced with "for example," "such as," "you might say," "consider something like," or similar hedges.

Read the reply below. If it contains any such copy-pasteable text, rewrite the ENTIRE reply to remove it, replacing that content with a coaching question or a description of what's missing instead — keep everything else in the reply intact and keep the same voice. If the reply already contains no such content, return it completely unchanged.

Respond with ONLY the final reply text, nothing else — no preamble, no explanation of what you changed.`;

async function sanitizeReply(rawReply) {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: 1200,
      messages: [
        { role: "system", content: SANITIZE_SYSTEM_PROMPT },
        { role: "user", content: rawReply }
      ]
    });
    return response.choices[0].message.content || rawReply;
  } catch (err) {
    console.error("Error in sanitizeReply, falling back to raw reply:", err);
    return rawReply;
  }
}

async function extractTextFromFile(file) {
  const name = file.originalname.toLowerCase();
  if (name.endsWith(".docx")) {
    const { value } = await mammoth.extractRawText({ buffer: file.buffer });
    return value;
  }
  if (name.endsWith(".txt")) {
    return file.buffer.toString("utf8");
  }
  throw new Error("Unsupported file type. Please upload a .txt or .docx file.");
}

app.post("/api/analyze", upload.single("file"), async (req, res) => {
  try {
    const courseLevel = req.body.courseLevel === "WR122" ? "WR122" : "WR121";

    let essayText = "";
    if (req.file) {
      essayText = await extractTextFromFile(req.file);
    } else if (req.body.text) {
      essayText = req.body.text;
    }
    essayText = (essayText || "").trim();

    if (essayText.length < 200) {
      return res.status(400).json({
        error: "That doesn't look like a full essay yet (fewer than 200 characters). Paste or upload the full draft."
      });
    }

    let truncated = false;
    if (essayText.length > MAX_ESSAY_CHARS) {
      essayText = essayText.slice(0, MAX_ESSAY_CHARS);
      truncated = true;
    }

    const essayContext = `Here is the student's ${courseLevel} essay draft. Analyze it against the rubric.\n\n---ESSAY START---\n${essayText}\n---ESSAY END---`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: 4000,
      messages: [
        { role: "system", content: buildSystemPrompt(courseLevel) },
        { role: "user", content: essayContext }
      ],
      tools: [ANALYSIS_TOOL],
      tool_choice: { type: "function", function: { name: "submit_rubric_analysis" } }
    });

    const toolCall = response.choices[0].message.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("Model did not return a structured analysis.");
    }
    const analysis = JSON.parse(toolCall.function.arguments);

    const sessionId = uuidv4();
    const introSummary = `Here's my initial rubric-based analysis:\n\nOverall: ${analysis.overallImpression}\n\nPriority next steps:\n${(analysis.nextSteps || [])
      .map((s, i) => `${i + 1}. ${s}`)
      .join("\n")}`;

    sessions.set(sessionId, {
      courseLevel,
      essayContext,
      chatHistory: [{ role: "assistant", content: introSummary }]
    });

    res.json({ sessionId, analysis, truncated });
  } catch (err) {
    console.error("Error in /api/analyze:", err);
    res.status(500).json({ error: err.message || "Something went wrong analyzing the essay." });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    if (!sessionId || !message || !message.trim()) {
      return res.status(400).json({ error: "Missing sessionId or message." });
    }
    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found or expired. Please re-analyze your essay." });
    }

    const messages = [
      { role: "system", content: buildSystemPrompt(session.courseLevel) },
      { role: "user", content: session.essayContext },
      ...session.chatHistory,
      { role: "user", content: message.trim() }
    ];

    const response = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: 1200,
      messages
    });

    const rawReply =
      response.choices[0].message.content || "I couldn't generate a response — try rephrasing your question.";
    const reply = await sanitizeReply(rawReply);

    session.chatHistory.push({ role: "user", content: message.trim() });
    session.chatHistory.push({ role: "assistant", content: reply });

    res.json({ reply });
  } catch (err) {
    console.error("Error in /api/chat:", err);
    res.status(500).json({ error: err.message || "Something went wrong sending that message." });
  }
});

app.listen(PORT, () => {
  console.log(`Writing tutor running at http://localhost:${PORT}`);
});
