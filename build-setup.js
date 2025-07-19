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

    // Puppeteer'ın Chromium'unu indir (sadece ilk kez)
    console.log("🌐 Puppeteer Chromium kontrol ediliyor...")

    try {
      const puppeteer = require("puppeteer")
      const executablePath = await puppeteer.executablePath()
      console.log("✅ Chromium hazır:", executablePath)
    } catch (error) {
      console.log("❌ Chromium indirme hatası:", error.message)
    }

    // Resources klasörü oluştur
    const resourcesPath = path.join(__dirname, "resources")
    const puppeteerResourcesPath = path.join(resourcesPath, "puppeteer")

    if (!fs.existsSync(resourcesPath)) {
      fs.mkdirSync(resourcesPath, { recursive: true })
    }

    if (!fs.existsSync(puppeteerResourcesPath)) {
      fs.mkdirSync(puppeteerResourcesPath, { recursive: true })
    }

    // Chromium cache kontrolü - sadece yoksa kopyala
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

    // Chromium boyut kontrolü
    let cacheSize = 0
    let targetSize = 0

    if (fs.existsSync(cacheChromiumPath)) {
      cacheSize = getDirectorySize(cacheChromiumPath)
      console.log(
        `📊 Cache Chromium boyutu: ${(cacheSize / 1024 / 1024).toFixed(2)} MB`
      )
    }

    if (fs.existsSync(targetChromiumPath)) {
      targetSize = getDirectorySize(targetChromiumPath)
      console.log(
        `📊 Target Chromium boyutu: ${(targetSize / 1024 / 1024).toFixed(2)} MB`
      )
    }

    // Sadece gerekiyorsa kopyala
    if (
      fs.existsSync(cacheChromiumPath) &&
      (!fs.existsSync(targetChromiumPath) || targetSize < cacheSize * 0.9) // %90'dan az ise yeniden kopyala
    ) {
      console.log("📦 Puppeteer Chromium resources klasörüne kopyalanıyor...")
      console.log("⏳ Bu işlem birkaç dakika sürebilir...")

      // Eski klasörü sil (eğer varsa)
      if (fs.existsSync(targetChromiumPath)) {
        console.log("🗑️ Eski Chromium klasörü siliniyor...")
        fs.rmSync(targetChromiumPath, { recursive: true, force: true })
      }

      // Cache klasöründen kopyala
      execSync(`cp -r "${cacheChromiumPath}" "${targetChromiumPath}"`, {
        stdio: "inherit",
      })
      console.log(
        "✅ Puppeteer Chromium cache'den resources klasörüne kopyalandı"
      )
    } else if (fs.existsSync(targetChromiumPath)) {
      console.log(
        "✅ Puppeteer Chromium zaten resources klasöründe mevcut ve güncel"
      )
    } else {
      console.log(
        "⚠️ Puppeteer Chromium bulunamadı, manuel indirme gerekebilir"
      )
    }

    // .cache klasörü kontrolü - sadece yoksa kopyala
    const puppeteerPath = path.join(__dirname, "node_modules", "puppeteer")
    const cachePath = path.join(puppeteerPath, ".cache")
    const targetCachePath = path.join(puppeteerResourcesPath, ".cache")

    if (fs.existsSync(cachePath) && !fs.existsSync(targetCachePath)) {
      console.log("📦 Puppeteer cache resources klasörüne kopyalanıyor...")

      // Klasörü kopyala
      execSync(`cp -r "${cachePath}" "${targetCachePath}"`, {
        stdio: "inherit",
      })
      console.log("✅ Puppeteer cache resources klasörüne kopyalandı")
    } else if (fs.existsSync(targetCachePath)) {
      console.log("✅ Puppeteer cache zaten resources klasöründe mevcut")
    }

    console.log("✅ Build hazırlığı tamamlandı!")
  } catch (error) {
    console.error("❌ Build hazırlığı hatası:", error.message)
    // Hata durumunda bile devam et
    console.log("⚠️ Hata olsa da build devam ediyor...")
  }
}

// Klasör boyutunu hesapla
function getDirectorySize(dirPath) {
  let totalSize = 0
  try {
    const items = fs.readdirSync(dirPath)
    for (const item of items) {
      const itemPath = path.join(dirPath, item)
      const stats = fs.statSync(itemPath)
      if (stats.isDirectory()) {
        totalSize += getDirectorySize(itemPath)
      } else {
        totalSize += stats.size
      }
    }
  } catch (error) {
    console.log(`Klasör boyutu hesaplanamadı: ${dirPath}`)
  }
  return totalSize
}

setupBuild()
