const { createCanvas, loadImage } = require("canvas");

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text).split(" ");
  const lines = [];
  let line = "";

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const width = ctx.measureText(testLine).width;

    if (width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  }

  if (line) lines.push(line);
  return lines;
}

function clipText(text, maxChars) {
  if (!text) return "";
  return text.length > maxChars ? `${text.slice(0, maxChars - 3)}...` : text;
}

async function safeLoadImage(url) {
  if (!url) return null;
  try {
    return await loadImage(url);
  } catch {
    return null;
  }
}

async function gerarBannerMensagem(data) {
  const width = 1280;
  const height = 720;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, width, height);

  const bg = await safeLoadImage(data.banner);
  if (bg) {
    ctx.drawImage(bg, 0, 0, width, height);
  }

  const overlay = ctx.createLinearGradient(0, 0, width, height);
  overlay.addColorStop(0, "rgba(0,0,0,0.82)");
  overlay.addColorStop(0.45, "rgba(0,0,0,0.45)");
  overlay.addColorStop(1, "rgba(0,0,0,0.88)");
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  roundRect(ctx, 55, 55, width - 110, height - 110, 28);
  ctx.clip();

  const glass = ctx.createLinearGradient(55, 55, width - 55, height - 55);
  glass.addColorStop(0, "rgba(255,255,255,0.08)");
  glass.addColorStop(1, "rgba(255,255,255,0.03)");
  ctx.fillStyle = glass;
  ctx.fillRect(55, 55, width - 110, height - 110);
  ctx.restore();

  ctx.strokeStyle = data.cor || "#5865F2";
  ctx.lineWidth = 5;
  roundRect(ctx, 55, 55, width - 110, height - 110, 28);
  ctx.stroke();

  const accent = data.cor || "#5865F2";

  ctx.fillStyle = accent;
  roundRect(ctx, 90, 85, 220, 48, 22);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px Sans";
  ctx.fillText(String(data.template || "mensagem").toUpperCase(), 120, 116);

  const thumb = await safeLoadImage(data.thumbnail);
  if (thumb) {
    const thumbSize = 160;
    const tx = width - 245;
    const ty = 105;

    ctx.save();
    roundRect(ctx, tx, ty, thumbSize, thumbSize, 26);
    ctx.clip();
    ctx.drawImage(thumb, tx, ty, thumbSize, thumbSize);
    ctx.restore();

    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 3;
    roundRect(ctx, tx, ty, thumbSize, thumbSize, 26);
    ctx.stroke();
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 62px Sans";

  const titleLines = wrapText(ctx, clipText(data.titulo || "Sem título", 120), 800).slice(0, 2);
  let y = 215;

  for (const line of titleLines) {
    ctx.fillText(line, 90, y);
    y += 72;
  }

  if (data.subtitulo) {
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.font = "30px Sans";

    const subtitleLines = wrapText(ctx, clipText(data.subtitulo, 160), 800).slice(0, 2);
    for (const line of subtitleLines) {
      ctx.fillText(line, 90, y);
      y += 42;
    }

    y += 12;
  }

  if (data.texto) {
    ctx.fillStyle = "rgba(255,255,255,0.76)";
    ctx.font = "26px Sans";

    const textLines = wrapText(ctx, clipText(data.texto, 420), 800).slice(0, 7);
    for (const line of textLines) {
      ctx.fillText(line, 90, y);
      y += 38;
    }
  }

  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "24px Sans";
  ctx.fillText(data.footer || "Sistema de Mensagens 2.1", 90, 625);

  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(width - 110, height - 95, 14, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toBuffer("image/png");
}

module.exports = {
  gerarBannerMensagem
};