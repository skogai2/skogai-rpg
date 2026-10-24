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
