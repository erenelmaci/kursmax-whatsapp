const { app } = require("electron")
const { autoUpdater } = require("electron-updater")

// Test için güncelleme ayarları
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

// Güncelleme event listener'ları
autoUpdater.on("checking-for-update", () => {
  console.log("🔍 Güncelleme kontrol ediliyor...")
})

autoUpdater.on("update-available", (info) => {
  console.log("✅ Güncelleme mevcut:", info)
})

autoUpdater.on("update-not-available", (info) => {
  console.log("❌ Güncelleme yok:", info)
})

autoUpdater.on("error", (err) => {
  console.log("❌ Güncelleme hatası:", err)
})

autoUpdater.on("download-progress", (progressObj) => {
  console.log("📥 İndirme ilerlemesi:", progressObj)
})

autoUpdater.on("update-downloaded", (info) => {
  console.log("✅ Güncelleme indirildi:", info)
})

// Test fonksiyonu
async function testUpdates() {
  console.log("🚀 Güncelleme testi başlatılıyor...")

  try {
    await autoUpdater.checkForUpdates()
    console.log("✅ Güncelleme kontrolü tamamlandı")
  } catch (error) {
    console.error("❌ Güncelleme kontrolü hatası:", error)
  }
}

// Test başlat
testUpdates()
