export const MAX_IMAGE_BYTES = 600 * 1024;
const MAX_MESSAGES = 30;
const MAX_MESSAGE_TEXT = 12_000;
const MAX_TOTAL_TEXT = 22_000;
const IMAGE_DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/i;

function validImageBytes(mimeType, bytes) {
  if (mimeType === "image/jpeg") {
    return bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (mimeType === "image/webp") {
    return bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  }
  return false;
}

export function validateImageDataUrl(value) {
  if (typeof value !== "string" || value.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 64) return false;
  const match = IMAGE_DATA_URL.exec(value);
  if (!match || match[2].length % 4 !== 0) return false;
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES || bytes.toString("base64") !== match[2]) return false;
  return validImageBytes(match[1].toLowerCase(), bytes);
}

export function getMessageText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter(part => part?.type === "text" && typeof part.text === "string")
    .map(part => part.text)
    .join("\n")
    .trim();
}

export function messageHasImage(content) {
  return Array.isArray(content) && content.some(part => part?.type === "image_url");
}

export function messagesHaveImage(messages) {
  return Array.isArray(messages) && messages.some(message => messageHasImage(message?.content));
}

export function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) return false;

  let totalText = 0;
  let totalImages = 0;

  for (const message of messages) {
    if (!message || !["user", "assistant"].includes(message.role)) return false;

    if (typeof message.content === "string") {
      if (!message.content.trim() || message.content.length > MAX_MESSAGE_TEXT) return false;
      totalText += message.content.length;
      continue;
    }

    if (message.role !== "user" || !Array.isArray(message.content) || message.content.length < 1 || message.content.length > 2) {
      return false;
    }

    let imageCount = 0;
    let textCount = 0;
    for (const part of message.content) {
      if (part?.type === "text" && typeof part.text === "string") {
        if (!part.text.trim() || part.text.length > MAX_MESSAGE_TEXT) return false;
        textCount += 1;
        totalText += part.text.length;
      } else if (part?.type === "image_url" && typeof part.image_url?.url === "string") {
        if (!validateImageDataUrl(part.image_url.url)) return false;
        imageCount += 1;
        totalImages += 1;
      } else {
        return false;
      }
    }

    if (imageCount !== 1 || textCount > 1 || totalImages > 1) return false;
  }

  return totalText <= MAX_TOTAL_TEXT;
}
