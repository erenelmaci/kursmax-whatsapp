#!/usr/bin/env node

const fs = require("fs")
const { execSync } = require("child_process")

// Sürüm yayınlama script'i
async function release() {
  try {
    console.log("🚀 Sürüm yayınlama başlatılıyor...")

    // 1. Commit mesajını al
    const commitMessage = process.argv[2]
    if (!commitMessage) {
      console.error("❌ Commit mesajı belirtilmedi!")
      console.log('Kullanım: yarn release "Yeni özellik eklendi"')
      console.log('veya: npm run release "Bug düzeltmesi"')
      process.exit(1)
    }

    // 2. Mevcut version'u oku ve artır
    const packagePath = "./package.json"
    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"))
    const currentVersion = packageJson.version
    const versionParts = currentVersion.split(".")
    const patchVersion = parseInt(versionParts[2]) + 1
    const newVersion = `${versionParts[0]}.${versionParts[1]}.${patchVersion}`

    console.log(`📦 Mevcut sürüm: ${currentVersion}`)
    console.log(`📦 Yeni sürüm: ${newVersion}`)
    console.log(`💬 Commit mesajı: ${commitMessage}`)

    // 3. package.json'u güncelle
    console.log("📝 package.json güncelleniyor...")
    packageJson.version = newVersion
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2))

    // 4. Git işlemleri
    console.log("🔧 Git işlemleri yapılıyor...")
    execSync("git add .", { stdio: "inherit" })
    execSync(`git commit -m "v${newVersion}: ${commitMessage}"`, {
      stdio: "inherit",
    })
    execSync("git push origin main", { stdio: "inherit" })

    // 5. Tag oluştur
    console.log("🏷️ Tag oluşturuluyor...")
    execSync(`git tag v${newVersion}`, { stdio: "inherit" })
    execSync(`git push origin v${newVersion}`, { stdio: "inherit" })

    // 6. Build al
    console.log("🔨 Windows build alınıyor...")
    execSync("npm run build:win:clean", { stdio: "inherit" })

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
    console.log("")
    console.log("🎉 GitHub Actions otomatik olarak release oluşturacak!")
  } catch (error) {
    console.error("❌ Hata:", error.message)
    process.exit(1)
  }
}

release()
