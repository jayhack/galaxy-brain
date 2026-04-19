"use strict";

const log = document.getElementById("log");
const form = document.getElementById("composer");
const input = document.getElementById("input");
const sendBtn = document.getElementById("send");
const resetBtn = document.getElementById("reset");
const statusEl = document.getElementById("status");
const modelEl = document.getElementById("model");
const workdirEl = document.getElementById("workdir");

let ws = null;
let currentAgentBubble = null; // active streaming text bubble for the current turn
let currentAgentMsg = null;    // the agent .msg container (so we can append tool calls)
let toolBlocks = new Map();    // tool_use_id -> { root, summaryEl, statusEl, inputEl }
let busy = false;

function addSystemMessage(text) {
  const msg = document.createElement("div");
  msg.className = "msg system";
  msg.innerHTML = `<div class="who">system</div><div class="bubble"></div>`;
  msg.querySelector(".bubble").textContent = text;
  log.appendChild(msg);
  scrollToBottom();
}

function addUserMessage(text) {
  const msg = document.createElement("div");
  msg.className = "msg user";
  msg.innerHTML = `<div class="who">you</div><div class="bubble"></div>`;
  msg.querySelector(".bubble").textContent = text;
  log.appendChild(msg);
  scrollToBottom();
}

function startAgentMessage() {
  const msg = document.createElement("div");
  msg.className = "msg agent";
  msg.innerHTML = `<div class="who">ez-claw</div>`;
  log.appendChild(msg);
  currentAgentMsg = msg;
  currentAgentBubble = null;
  scrollToBottom();
}

function ensureAgentTextBubble() {
  if (currentAgentMsg && !currentAgentBubble) {
    const bubble = document.createElement("div");
    bubble.className = "bubble cursor-blink";
    currentAgentMsg.appendChild(bubble);
    currentAgentBubble = bubble;
  }
  return currentAgentBubble;
}

function appendAgentText(delta) {
  const bubble = ensureAgentTextBubble();
  bubble.classList.add("cursor-blink");
  bubble.textContent += delta;
  scrollToBottom();
}

function endAgentTextBubble() {
  if (currentAgentBubble) {
    currentAgentBubble.classList.remove("cursor-blink");
    currentAgentBubble = null;
  }
}

function makeToolBlock(id, name) {
  if (!currentAgentMsg) startAgentMessage();
  endAgentTextBubble();

  const root = document.createElement("div");
  root.className = "tool running";
  root.innerHTML = `
    <div class="tool-head">
      <div class="tool-icon">⚙</div>
      <div class="tool-name">${escapeHtml(name)}</div>
      <div class="tool-summary"></div>
      <div class="tool-status">running</div>
    </div>
    <div class="tool-body">
      <h5>input</h5>
      <pre class="tool-input">…</pre>
      <h5>output</h5>
      <pre class="tool-output">(waiting)</pre>
    </div>
  `;
  const head = root.querySelector(".tool-head");
  head.addEventListener("click", () => root.classList.toggle("open"));

  currentAgentMsg.appendChild(root);
  toolBlocks.set(id, {
    root,
    summaryEl: root.querySelector(".tool-summary"),
    statusEl: root.querySelector(".tool-status"),
    inputEl: root.querySelector(".tool-input"),
    outputEl: root.querySelector(".tool-output"),
  });
  scrollToBottom();
}

function setToolInput(id, name, input) {
  const t = toolBlocks.get(id);
  if (!t) return;
  t.inputEl.textContent = JSON.stringify(input, null, 2);
  t.summaryEl.textContent = summarizeToolInput(name, input);
}

function summarizeToolInput(name, input) {
  if (!input || typeof input !== "object") return "";
  switch (name) {
    case "bash":
      return input.command || "";
    case "read_file":
    case "write_file":
    case "edit_file":
    case "list_dir":
      return input.path || "";
    default:
      return "";
  }
}

function setToolResult(id, isError, content) {
  const t = toolBlocks.get(id);
  if (!t) return;
  t.outputEl.textContent = content || "(no output)";
  t.root.classList.remove("running");
  t.root.classList.add(isError ? "error" : "done");
  t.statusEl.textContent = isError ? "error" : "done";
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function scrollToBottom() {
  log.scrollTop = log.scrollHeight;
}

function setBusy(b) {
  busy = b;
  sendBtn.disabled = b;
  if (b) {
    statusEl.className = "pill status-thinking";
    statusEl.textContent = "thinking…";
  } else if (ws && ws.readyState === WebSocket.OPEN) {
    statusEl.className = "pill status-connected";
    statusEl.textContent = "connected";
  }
}

function connect() {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${proto}//${location.host}/ws`);

  ws.onopen = () => {
    statusEl.className = "pill status-connected";
    statusEl.textContent = "connected";
  };

  ws.onclose = () => {
    statusEl.className = "pill status-disconnected";
    statusEl.textContent = "disconnected";
    setTimeout(connect, 1500);
  };

  ws.onerror = () => {
    statusEl.className = "pill status-disconnected";
    statusEl.textContent = "error";
  };

  ws.onmessage = (ev) => {
    let msg;
    try {
      msg = JSON.parse(ev.data);
    } catch {
      return;
    }
    handleEvent(msg);
  };
}

function handleEvent(ev) {
  switch (ev.type) {
    case "hello":
      modelEl.textContent = `model: ${ev.model}`;
      workdirEl.textContent = `workdir: ${ev.workdir}`;
      break;
    case "turn_start":
      startAgentMessage();
      setBusy(true);
      break;
    case "text_delta":
      appendAgentText(ev.text);
      break;
    case "text_end":
      endAgentTextBubble();
      break;
    case "tool_call_start":
      makeToolBlock(ev.id, ev.name);
      break;
    case "tool_call_input":
      setToolInput(ev.id, ev.name, ev.input);
      break;
    case "tool_result":
      setToolResult(ev.id, ev.is_error, ev.content);
      break;
    case "turn_done":
      endAgentTextBubble();
      setBusy(false);
      if (ev.note) addSystemMessage(ev.note);
      break;
    case "reset_ack":
      log.innerHTML = "";
      addSystemMessage("conversation cleared");
      break;
    case "error":
      endAgentTextBubble();
      addSystemMessage(`error: ${ev.message}`);
      setBusy(false);
      break;
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (busy) return;
  const text = input.value.trim();
  if (!text || !ws || ws.readyState !== WebSocket.OPEN) return;
  addUserMessage(text);
  input.value = "";
  ws.send(JSON.stringify({ type: "user_message", text }));
});

input.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
    e.preventDefault();
    form.requestSubmit();
  }
});

resetBtn.addEventListener("click", () => {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type: "reset" }));
});

connect();
