const TRAIT_NAMES = {
  thesis: "Thesis, Focus, and Purpose",
  reasoning: "Reasoning and Support",
  organization: "Organization",
  citation: "Signal Phrasing and MLA Citation",
  voice: "Voice & Style",
  conventions: "Writing Conventions and MLA Page Layout"
};

let currentSessionId = null;

// --- Tabs ---
const tabButtons = document.querySelectorAll(".tab-btn");
tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".tab-panel").forEach((panel) => {
      panel.classList.toggle("hidden", panel.dataset.tabPanel !== btn.dataset.tab);
    });
  });
});

const fileInput = document.getElementById("essayFile");
fileInput.addEventListener("change", () => {
  const fileNameEl = document.getElementById("fileName");
  fileNameEl.textContent = fileInput.files[0] ? `Selected: ${fileInput.files[0].name}` : "";
});

// --- Analyze ---
const analyzeBtn = document.getElementById("analyzeBtn");
const intakeError = document.getElementById("intakeError");
const intakeStatus = document.getElementById("intakeStatus");

analyzeBtn.addEventListener("click", async () => {
  intakeError.classList.add("hidden");
  const courseLevel = document.getElementById("courseLevel").value;
  const activeTab = document.querySelector(".tab-btn.active").dataset.tab;

  const formData = new FormData();
  formData.append("courseLevel", courseLevel);

  if (activeTab === "upload") {
    if (!fileInput.files[0]) {
      showIntakeError("Choose a .txt or .docx file first.");
      return;
    }
    formData.append("file", fileInput.files[0]);
  } else {
    const text = document.getElementById("essayText").value.trim();
    if (!text) {
      showIntakeError("Paste your essay text first.");
      return;
    }
    formData.append("text", text);
  }

  analyzeBtn.disabled = true;
  intakeStatus.classList.remove("hidden");

  try {
    const res = await fetch("/api/analyze", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Analysis failed.");

    currentSessionId = data.sessionId;
    renderResults(data.analysis, data.truncated);
    document.getElementById("results").classList.remove("hidden");
    document.getElementById("chat").classList.remove("hidden");
    resetChatLog(data.analysis);
    document.getElementById("results").scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    showIntakeError(err.message);
  } finally {
    analyzeBtn.disabled = false;
    intakeStatus.classList.add("hidden");
  }
});

function showIntakeError(msg) {
  intakeError.textContent = msg;
  intakeError.classList.remove("hidden");
}

function renderResults(analysis, truncated) {
  document.getElementById("truncatedNotice").classList.toggle("hidden", !truncated);
  document.getElementById("overallImpression").textContent = analysis.overallImpression;

  const traitList = document.getElementById("traitList");
  traitList.innerHTML = "";
  (analysis.traits || []).forEach((trait) => {
    const card = document.createElement("div");
    card.className = "trait-card";
    card.innerHTML = `
      <div class="trait-card-header">
        <h4>${escapeHtml(TRAIT_NAMES[trait.key] || trait.key)}</h4>
        <span class="level-badge level-${trait.levelEstimate}">${escapeHtml(trait.levelEstimate)}</span>
      </div>
      <h5>Strengths</h5>
      <ul>${(trait.strengths || []).map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>
      <h5>Growth areas</h5>
      <ul>${(trait.growthAreas || []).map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>
      <h5>Think about</h5>
      <ul>${(trait.coachingQuestions || []).map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>
    `;
    traitList.appendChild(card);
  });

  const cr = analysis.citationReview || {};
  document.getElementById("citationSummary").textContent =
    cr.summary || (cr.noSourcesDetected ? "No cited sources were detected in this draft." : "");
  const issuesEl = document.getElementById("citationIssues");
  issuesEl.innerHTML = "";
  (cr.issues || []).forEach((issue) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="loc">${escapeHtml(issue.location)}</div>
      <div class="issue">${escapeHtml(issue.issue)}</div>
      <div class="question">${escapeHtml(issue.question)}</div>
    `;
    issuesEl.appendChild(li);
  });

  const stepsEl = document.getElementById("nextSteps");
  stepsEl.innerHTML = "";
  (analysis.nextSteps || []).forEach((step) => {
    const li = document.createElement("li");
    li.textContent = step;
    stepsEl.appendChild(li);
  });
}

// --- Chat ---
const chatLog = document.getElementById("chatLog");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatError = document.getElementById("chatError");

function resetChatLog(analysis) {
  chatLog.innerHTML = "";
  const intro = `Here's my initial rubric-based analysis:\n\nOverall: ${analysis.overallImpression}\n\nPriority next steps:\n${(analysis.nextSteps || [])
    .map((s, i) => `${i + 1}. ${s}`)
    .join("\n")}`;
  appendChatMessage("assistant", intro);
}

function appendChatMessage(role, text) {
  const div = document.createElement("div");
  div.className = `chat-msg ${role}`;
  div.textContent = text;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  chatError.classList.add("hidden");
  const message = chatInput.value.trim();
  if (!message || !currentSessionId) return;

  appendChatMessage("user", message);
  chatInput.value = "";
  const sendBtn = chatForm.querySelector("button");
  sendBtn.disabled = true;

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: currentSessionId, message })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Message failed.");
    appendChatMessage("assistant", data.reply);
  } catch (err) {
    chatError.textContent = err.message;
    chatError.classList.remove("hidden");
  } finally {
    sendBtn.disabled = false;
  }
});

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}
