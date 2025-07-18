#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

// Dist klasörünü temizle
function cleanDist() {
  const distPath = "./dist"

  if (!fs.existsSync(distPath)) {
    console.log("📁 Dist klasörü yok, oluşturuluyor...")
    fs.mkdirSync(distPath)
    return
  }

  console.log("🧹 Dist klasörü temizleniyor...")

  const files = fs.readdirSync(distPath)

  files.forEach((file) => {
    const filePath = path.join(distPath, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      // Klasörleri sil
      if (
        file.startsWith("win-") ||
        file.startsWith("mac-") ||
        file.startsWith("linux-")
      ) {
        console.log(`🗑️  Klasör siliniyor: ${file}`)
        fs.rmSync(filePath, { recursive: true, force: true })
      }
    } else {
      // Dosyaları sil
      if (
        file.endsWith(".exe") ||
        file.endsWith(".dmg") ||
        file.endsWith(".blockmap") ||
        file.endsWith(".yml") ||
        file.startsWith("builder-")
      ) {
        console.log(`🗑️  Dosya siliniyor: ${file}`)
        fs.unlinkSync(filePath)
      }
    }
  })

  console.log("✅ Dist klasörü temizlendi!")
}

// Script çalıştır
cleanDist()
