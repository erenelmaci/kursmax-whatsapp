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
    let executablePath = null
    try {
      const puppeteer = require("puppeteer")
      executablePath = await puppeteer.executablePath()
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

    // GitHub Actions için özel işlem
    if (process.env.GITHUB_ACTIONS) {
      console.log("🔄 GitHub Actions ortamı tespit edildi")

      if (executablePath) {
        // Chromium'un bulunduğu dizini bul
        const chromiumDir = path.dirname(executablePath)
        const platform = process.platform
        const arch = process.arch

        console.log(`📂 Chromium dizini: ${chromiumDir}`)
        console.log(`🖥️  Platform: ${platform}, Arch: ${arch}`)

        // Platform'a göre hedef klasör oluştur
        let targetDir = ""
        if (platform === "win32") {
          targetDir = path.join(localChromiumPath, "chrome-win64")
        } else if (platform === "darwin") {
          targetDir = path.join(localChromiumPath, "chrome-mac-arm64")
        } else {
          targetDir = path.join(localChromiumPath, "chrome-linux")
        }

        // Chromium'u kopyala
        if (fs.existsSync(chromiumDir) && !fs.existsSync(targetDir)) {
          console.log(
            `📋 Chromium kopyalanıyor: ${chromiumDir} -> ${targetDir}`
          )
          try {
            // Recursive copy
            const copyRecursive = (src, dest) => {
              if (fs.lstatSync(src).isDirectory()) {
                if (!fs.existsSync(dest)) {
                  fs.mkdirSync(dest, { recursive: true })
                }
                fs.readdirSync(src).forEach((file) => {
                  copyRecursive(path.join(src, file), path.join(dest, file))
                })
              } else {
                fs.copyFileSync(src, dest)
              }
            }

            copyRecursive(chromiumDir, targetDir)
            console.log("✅ Chromium başarıyla kopyalandı")
          } catch (error) {
            console.log("⚠️ Chromium kopyalama hatası:", error.message)
          }
        }
      }
    }

    // Dummy dosyalar oluştur (eğer klasörler boşsa)
    const dummyFiles = [
      path.join(localChromiumPath, ".gitkeep"),
      path.join(cachePath, ".gitkeep"),
    ]

    dummyFiles.forEach((file) => {
      if (!fs.existsSync(file)) {
        try {
          fs.writeFileSync(file, "# Bu dosya build sırasında oluşturuldu")
          console.log(`📄 Dummy dosya oluşturuldu: ${file}`)
        } catch (error) {
          console.log(`⚠️ Dummy dosya oluşturulamadı: ${file}`)
        }
      }
    })

    console.log("✅ Build hazırlığı tamamlandı!")
  } catch (error) {
    console.error("❌ Build hazırlığı hatası:", error.message)
    // Hata durumunda bile devam et
    console.log("⚠️ Hata olsa da build devam ediyor...")
  }
}

setupBuild()
