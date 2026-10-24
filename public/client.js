// Shared by tv.html and play.html: one WebSocket that reconnects.
export function connect({ onOpen, onMessage }) {
  let ws;
  const open = () => {
    ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);
    ws.onopen = () => onOpen(send);
    ws.onmessage = (e) => onMessage(JSON.parse(e.data), send);
    ws.onclose = () => setTimeout(open, 1000);
  };
  const send = (msg) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(msg));
  open();
  return send;
}

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const pad = (n) => String(n).padStart(6, "0").replace(/\B(?=(\d{3})+$)/g, ",");

export const SCENES = {
  "sudo-hero": "/design/assets/scene-sudo-hero.png",
  "wifi-wizards": "/design/assets/scene-wifi-wizards.png",
  "honkers-hackers": "/design/assets/scene-honkers-hackers.png",
  "skognet-syndicate": "/design/assets/scene-skognet-syndicate.webp",
};

export const BRANDS = {
  "sudo-hero": ["SUDO HERO", "RISE OF THE ROOT USER"],
  "wifi-wizards": ["WIFI WIZARDS", "SIGNAL SORCERY"],
  "honkers-hackers": ["HONKERS<br />&amp; HACKERS", "OPERATION SKOGAI"],
  "skognet-syndicate": ["SKOG-NET<br />SYNDICATE", "CITY-FOREST LINK"],
};

export const icon = (id, size = "") =>
  `<svg class="sk-icon ${size}" aria-hidden="true"><use href="/design/assets/icons.svg#sk-${id}"></use></svg>`;

// Rank by share of the quest's max XP: one glyph plus modifier.
export const rank = (xp, max) => {
  const r = max ? xp / max : 0;
  return r >= 1 ? "S+" : r >= 0.75 ? "A" : r >= 0.5 ? "B" : r > 0 ? "C" : "D";
};

export const meter = (filled, total) =>
  `<span class="sk-meter">${Array.from({ length: total }, (_, i) => `<i${i < filled ? "" : ' class="empty"'}></i>`).join("")}</span>`;
