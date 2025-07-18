#!/usr/bin/env node

const fs = require("fs")
const { execSync } = require("child_process")

// Sürüm yayınlama script'i
async function release() {
  try {
    console.log("🚀 Sürüm yayınlama başlatılıyor...")

    // 1. Yeni sürüm numarasını al
    const newVersion = process.argv[2]
    if (!newVersion) {
      console.error("❌ Sürüm numarası belirtilmedi!")
      console.log("Kullanım: node release.js 1.0.2")
      process.exit(1)
    }

    console.log(`📦 Sürüm: ${newVersion}`)

    // 2. package.json'u güncelle
    console.log("📝 package.json güncelleniyor...")
    const packagePath = "./package.json"
    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"))
    packageJson.version = newVersion
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2))

    // 3. Git işlemleri
    console.log("🔧 Git işlemleri yapılıyor...")
    execSync("git add .", { stdio: "inherit" })
    execSync(`git commit -m "v${newVersion}: Yeni sürüm"`, { stdio: "inherit" })
    execSync("git push origin main", { stdio: "inherit" })

    // 4. Tag oluştur
    console.log("🏷️ Tag oluşturuluyor...")
    execSync(`git tag v${newVersion}`, { stdio: "inherit" })
    execSync(`git push origin v${newVersion}`, { stdio: "inherit" })

    // 5. Build al
    console.log("🔨 Windows build alınıyor...")
    execSync("npm run build:win", { stdio: "inherit" })

    console.log("✅ Sürüm yayınlama tamamlandı!")
    console.log("")
    console.log("📋 Yapmanız gerekenler:")
    console.log(`1. GitHub'da "Releases" bölümüne gidin`)
    console.log(`2. "Create new release" tıklayın`)
    console.log(`3. Tag: v${newVersion}`)
    console.log(`4. Title: KursMax WhatsApp v${newVersion}`)
    console.log(
      `5. dist/KursMax WhatsApp Setup ${newVersion}.exe dosyasını yükleyin`
    )
    console.log(`6. dist/latest.yml dosyasını da yükleyin`)
    console.log(`7. "Publish release" tıklayın`)
  } catch (error) {
    console.error("❌ Hata:", error.message)
    process.exit(1)
  }
}

release()
