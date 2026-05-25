#!/usr/bin/env node

/**
 * Genera los iconos PWA (192x192 y 512x512) con el logo "SE" en estilo ciberpunk
 * Ejecutar: node scripts/generate-pwa-icons.js
 */

const sharp = require("sharp");
const { mkdir } = require("fs/promises");
const path = require("path");

const publicDir = path.join(__dirname, "../public");

async function createSVGIcon(size) {
  const fontSize = Math.round(size * 0.5);
  const strokeWidth = Math.round(size * 0.04);

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><rect width="${size}" height="${size}" fill="#07070d"/><circle cx="${size / 2}" cy="${size / 2}" r="${Math.round(size * 0.35)}" fill="none" stroke="#a855f7" stroke-width="${strokeWidth}"/><text x="${size / 2}" y="${Math.round(size / 2 + fontSize / 3)}" font-family="monospace" font-size="${fontSize}" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">SE</text><line x1="${Math.round(size * 0.15)}" y1="${size / 2}" x2="${Math.round(size * 0.85)}" y2="${size / 2}" stroke="#a855f7" stroke-width="${Math.round(strokeWidth * 0.5)}" opacity="0.3"/></svg>`;
}

async function generateIcons() {
  try {
    await mkdir(publicDir, { recursive: true });

    console.log("🎨 Generando iconos PWA...");

    // Generar icono de 192x192
    const svg192 = await createSVGIcon(192);
    await sharp(Buffer.from(svg192))
      .png()
      .toFile(path.join(publicDir, "icon-192.png"));
    console.log("✓ Creado: icon-192.png");

    // Generar icono de 512x512
    const svg512 = await createSVGIcon(512);
    await sharp(Buffer.from(svg512))
      .png()
      .toFile(path.join(publicDir, "icon-512.png"));
    console.log("✓ Creado: icon-512.png");

    console.log("\n✅ Iconos PWA generados exitosamente!");
  } catch (error) {
    console.error("❌ Error generando iconos:", error);
    process.exit(1);
  }
}

generateIcons();
