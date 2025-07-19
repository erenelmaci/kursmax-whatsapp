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

      // Sadece gerekli dosyaları kopyala (optimize edilmiş)
      await copyOptimizedChromium(cacheChromiumPath, targetChromiumPath)
      console.log("✅ Puppeteer Chromium optimize edilmiş şekilde kopyalandı")
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

// Optimize edilmiş Chromium kopyalama
async function copyOptimizedChromium(sourcePath, targetPath) {
  console.log("🔧 Chromium optimize ediliyor...")

  // Platform'a göre optimize et
  const platform = process.platform
  const arch = process.arch

  if (platform === "darwin") {
    // Mac için optimize et
    await copyMacChromium(sourcePath, targetPath)
  } else if (platform === "win32") {
    // Windows için optimize et
    await copyWindowsChromium(sourcePath, targetPath)
  } else if (platform === "linux") {
    // Linux için optimize et
    await copyLinuxChromium(sourcePath, targetPath)
  }
}

// Mac Chromium kopyalama (optimize edilmiş)
async function copyMacChromium(sourcePath, targetPath) {
  console.log("🍎 Mac Chromium optimize ediliyor...")

  // Önce tüm klasörü kopyala
  execSync(`cp -r "${sourcePath}" "${targetPath}"`, {
    stdio: "inherit",
  })

  // Gereksiz dosyaları sil
  const chromeFolders = fs.readdirSync(targetPath)

  for (const folder of chromeFolders) {
    const folderPath = path.join(targetPath, folder)
    const chromePath = path.join(folderPath, "chrome-mac-arm64")

    if (fs.existsSync(chromePath)) {
      // Sadece gerekli dosyaları tut
      const keepFiles = ["Google Chrome for Testing.app", "ABOUT"]

      const chromeContents = fs.readdirSync(chromePath)

      for (const item of chromeContents) {
        if (!keepFiles.includes(item)) {
          const itemPath = path.join(chromePath, item)
          if (fs.existsSync(itemPath)) {
            fs.rmSync(itemPath, { recursive: true, force: true })
            console.log(`🗑️ Silindi: ${item}`)
          }
        }
      }
    }
  }

  console.log("✅ Mac Chromium optimize edildi")
}

// Windows Chromium kopyalama (optimize edilmiş)
async function copyWindowsChromium(sourcePath, targetPath) {
  console.log("🪟 Windows Chromium optimize ediliyor...")

  // Önce tüm klasörü kopyala
  execSync(`cp -r "${sourcePath}" "${targetPath}"`, {
    stdio: "inherit",
  })

  // Gereksiz dosyaları sil
  const chromeFolders = fs.readdirSync(targetPath)

  for (const folder of chromeFolders) {
    const folderPath = path.join(targetPath, folder)
    const chromePath = path.join(folderPath, "chrome-win64")

    if (fs.existsSync(chromePath)) {
      // Sadece gerekli dosyaları tut
      const keepFiles = [
        "chrome.exe",
        "chrome_100_percent.pak",
        "chrome_200_percent.pak",
        "resources.pak",
        "icudtl.dat",
        "v8_context_snapshot.bin",
      ]

      const chromeContents = fs.readdirSync(chromePath)

      for (const item of chromeContents) {
        if (!keepFiles.includes(item)) {
          const itemPath = path.join(chromePath, item)
          if (fs.existsSync(itemPath)) {
            fs.rmSync(itemPath, { recursive: true, force: true })
            console.log(`🗑️ Silindi: ${item}`)
          }
        }
      }
    }
  }

  console.log("✅ Windows Chromium optimize edildi")
}

// Linux Chromium kopyalama (optimize edilmiş)
async function copyLinuxChromium(sourcePath, targetPath) {
  console.log("🐧 Linux Chromium optimize ediliyor...")

  // Önce tüm klasörü kopyala
  execSync(`cp -r "${sourcePath}" "${targetPath}"`, {
    stdio: "inherit",
  })

  // Gereksiz dosyaları sil
  const chromeFolders = fs.readdirSync(targetPath)

  for (const folder of chromeFolders) {
    const folderPath = path.join(targetPath, folder)
    const chromePath = path.join(folderPath, "chrome-linux")

    if (fs.existsSync(chromePath)) {
      // Sadece gerekli dosyaları tut
      const keepFiles = [
        "chrome",
        "chrome_100_percent.pak",
        "chrome_200_percent.pak",
        "resources.pak",
        "icudtl.dat",
        "v8_context_snapshot.bin",
      ]

      const chromeContents = fs.readdirSync(chromePath)

      for (const item of chromeContents) {
        if (!keepFiles.includes(item)) {
          const itemPath = path.join(chromePath, item)
          if (fs.existsSync(itemPath)) {
            fs.rmSync(itemPath, { recursive: true, force: true })
            console.log(`🗑️ Silindi: ${item}`)
          }
        }
      }
    }
  }

  console.log("✅ Linux Chromium optimize edildi")
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
