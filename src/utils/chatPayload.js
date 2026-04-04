export function encodeChatPayload(payload) {
  return JSON.stringify({ __gfmsChat: true, ...payload });
}

export function decodeChatPayload(raw) {
  if (!raw) return { type: "text", text: "" };
  if (typeof raw === "object" && raw.__gfmsChat) return raw;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.__gfmsChat) return parsed;
  } catch {}
  return { type: "text", text: String(raw) };
}

export function previewTextFromPayload(payload) {
  const p = decodeChatPayload(payload);
  if (p.type === "image") return p.text || "[Ảnh]";
  if (p.type === "file") return p.fileName ? `[File] ${p.fileName}` : "[File đính kèm]";
  if (p.type === "audio") return "[Ghi âm]";
  if (p.type === "location") return p.text || "[Vị trí]";
  return p.text || "";
}
