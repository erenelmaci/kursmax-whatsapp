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

        // GitHub Actions'da cache konumunu da kopyala
        const homeDir = os.homedir()
        const possibleCachePaths = [
          path.join(homeDir, ".cache", "puppeteer"),
          path.join(homeDir, "AppData", "Local", "puppeteer"),
          path.join(homeDir, "Library", "Caches", "puppeteer"),
          path.join(process.env.RUNNER_TEMP || "", "puppeteer"),
          path.join(
            process.env.GITHUB_WORKSPACE || "",
            "node_modules",
            "puppeteer",
            ".cache"
          ),
        ]

        console.log("🔍 Cache konumları aranıyor...")
        for (const cachePath of possibleCachePaths) {
          if (fs.existsSync(cachePath)) {
            console.log(`📂 Cache bulundu: ${cachePath}`)
            try {
              // Cache'i kopyala
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

              copyRecursive(cachePath, path.join(puppeteerPath, ".cache"))
              console.log("✅ Cache başarıyla kopyalandı")
              break
            } catch (error) {
              console.log(`⚠️ Cache kopyalama hatası: ${error.message}`)
            }
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

    // Klasör içeriklerini listele
    console.log("📋 Klasör içerikleri:")
    if (fs.existsSync(localChromiumPath)) {
      const localChromiumContents = fs.readdirSync(localChromiumPath, {
        withFileTypes: true,
      })
      console.log(`   .local-chromium: ${localChromiumContents.length} öğe`)
      localChromiumContents.forEach((item) => {
        console.log(
          `     - ${item.name} (${item.isDirectory() ? "klasör" : "dosya"})`
        )
      })
    }

    if (fs.existsSync(cachePath)) {
      const cacheContents = fs.readdirSync(cachePath, { withFileTypes: true })
      console.log(`   .cache: ${cacheContents.length} öğe`)
      cacheContents.forEach((item) => {
        console.log(
          `     - ${item.name} (${item.isDirectory() ? "klasör" : "dosya"})`
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
