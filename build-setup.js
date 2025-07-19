#!/usr/bin/env node

const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")
const os = require("os")

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
      console.log("❌ Chromium indirme hatası:", error.message)
    }

    // Puppeteer klasörlerini kontrol et
    const puppeteerPath = path.join(__dirname, "node_modules", "puppeteer")
    const localChromiumPath = path.join(puppeteerPath, ".local-chromium")
    const cachePath = path.join(puppeteerPath, ".cache")

    console.log("📁 Klasör kontrolü:")
    console.log(`   Puppeteer: ${fs.existsSync(puppeteerPath) ? "✅" : "❌"}`)
    console.log(
      `   .local-chromium: ${fs.existsSync(localChromiumPath) ? "✅" : "❌"}`
    )
    console.log(`   .cache: ${fs.existsSync(cachePath) ? "✅" : "❌"}`)

    // Klasör içeriklerini listele
    console.log("�� Klasör içerikleri:")
    if (fs.existsSync(localChromiumPath)) {
      const localChromiumContents = fs.readdirSync(localChromiumPath)
      console.log(`   .local-chromium: ${localChromiumContents.length} öğe`)
      localChromiumContents.forEach((item) => {
        const itemPath = path.join(localChromiumPath, item)
        const stats = fs.statSync(itemPath)
        console.log(
          `     - ${item} (${stats.isDirectory() ? "klasör" : "dosya"})`
        )
      })
    }

    if (fs.existsSync(cachePath)) {
      const cacheContents = fs.readdirSync(cachePath)
      console.log(`   .cache: ${cacheContents.length} öğe`)
      cacheContents.forEach((item) => {
        const itemPath = path.join(cachePath, item)
        const stats = fs.statSync(itemPath)
        console.log(
          `     - ${item} (${stats.isDirectory() ? "klasör" : "dosya"})`
        )
      })
    }

    // Dist klasörünü temizle (eğer varsa)
    const distPath = path.join(__dirname, "dist")
    if (fs.existsSync(distPath)) {
      console.log("🧹 Dist klasörü temizleniyor...")
      try {
        fs.rmSync(distPath, { recursive: true, force: true })
        console.log("✅ Dist klasörü temizlendi")
      } catch (error) {
        console.log("⚠️ Dist klasörü temizlenemedi:", error.message)
      }
    }

    console.log("✅ Build hazırlığı tamamlandı!")
  } catch (error) {
    console.error("❌ Build hazırlığı hatası:", error.message)
    // Hata durumunda bile devam et
    console.log("⚠️ Hata olsa da build devam ediyor...")
  }
}

setupBuild()
