#!/usr/bin/env node

const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")

async function setupBuild() {
  try {
    console.log("🔧 Build hazırlığı başlatılıyor...")

    // Puppeteer'ı yükle (eğer yüklü değilse)
    console.log("📦 Puppeteer kontrol ediliyor...")
    try {
      require("puppeteer")
      console.log("✅ Puppeteer zaten yüklü")
    } catch (error) {
      console.log("📦 Puppeteer yükleniyor...")
      execSync("npm install puppeteer", { stdio: "inherit" })
    }

    // Puppeteer'ın Chromium'unu indir
    console.log("🌐 Puppeteer Chromium indiriliyor...")
    try {
      const puppeteer = require("puppeteer")
      const executablePath = await puppeteer.executablePath()
      console.log("✅ Chromium hazır:", executablePath)
    } catch (error) {
      console.log("⚠️ Chromium indirme hatası:", error.message)
    }

    // Gerekli klasörlerin varlığını kontrol et
    const puppeteerPath = path.join(__dirname, "node_modules", "puppeteer")
    const localChromiumPath = path.join(puppeteerPath, ".local-chromium")
    const cachePath = path.join(puppeteerPath, ".cache")

    console.log("📁 Klasör kontrolü:")
    console.log(`   Puppeteer: ${fs.existsSync(puppeteerPath) ? "✅" : "❌"}`)
    console.log(
      `   .local-chromium: ${fs.existsSync(localChromiumPath) ? "✅" : "❌"}`
    )
    console.log(`   .cache: ${fs.existsSync(cachePath) ? "✅" : "❌"}`)

    // Eğer klasörler yoksa oluştur
    if (!fs.existsSync(localChromiumPath)) {
      console.log("📁 .local-chromium klasörü oluşturuluyor...")
      fs.mkdirSync(localChromiumPath, { recursive: true })
    }

    if (!fs.existsSync(cachePath)) {
      console.log("📁 .cache klasörü oluşturuluyor...")
      fs.mkdirSync(cachePath, { recursive: true })
    }

    console.log("✅ Build hazırlığı tamamlandı!")
  } catch (error) {
    console.error("❌ Build hazırlığı hatası:", error.message)
    process.exit(1)
  }
}

setupBuild()
