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
    console.log("📁 Klasör içerikleri:")
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

    // Production build için Puppeteer Chromium'u resources klasörüne kopyala
    console.log("📦 Production build için Puppeteer Chromium hazırlanıyor...")

    // Resources klasörü oluştur
    const resourcesPath = path.join(__dirname, "resources")
    const puppeteerResourcesPath = path.join(resourcesPath, "puppeteer")

    if (!fs.existsSync(resourcesPath)) {
      fs.mkdirSync(resourcesPath, { recursive: true })
    }

    if (!fs.existsSync(puppeteerResourcesPath)) {
      fs.mkdirSync(puppeteerResourcesPath, { recursive: true })
    }

    // Chromium'u cache klasöründen kopyala (eğer resources'da yoksa)
    const cacheChromiumPath = path.join(
      os.homedir(),
      ".cache",
      "puppeteer",
      "chrome"
    )
    const targetChromiumPath = path.join(
      puppeteerResourcesPath,
      ".local-chromium"
    )

    if (
      fs.existsSync(cacheChromiumPath) &&
      !fs.existsSync(targetChromiumPath)
    ) {
      console.log("📦 Puppeteer Chromium resources klasörüne kopyalanıyor...")

      // Cache klasöründen kopyala
      execSync(`cp -r "${cacheChromiumPath}" "${targetChromiumPath}"`, {
        stdio: "inherit",
      })
      console.log(
        "✅ Puppeteer Chromium cache'den resources klasörüne kopyalandı"
      )
    } else if (fs.existsSync(targetChromiumPath)) {
      console.log("✅ Puppeteer Chromium zaten resources klasöründe mevcut")
    } else {
      console.log(
        "⚠️ Puppeteer Chromium bulunamadı, manuel indirme gerekebilir"
      )
    }

    // .cache klasörünü kopyala (eğer yoksa)
    if (fs.existsSync(cachePath)) {
      const targetCachePath = path.join(puppeteerResourcesPath, ".cache")

      if (!fs.existsSync(targetCachePath)) {
        // Klasörü kopyala
        execSync(`cp -r "${cachePath}" "${targetCachePath}"`, {
          stdio: "inherit",
        })
        console.log("✅ Puppeteer cache resources klasörüne kopyalandı")
      } else {
        console.log("✅ Puppeteer cache zaten resources klasöründe mevcut")
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
