const { app, BrowserWindow, Menu, ipcMain, dialog } = require("electron")
const path = require("path")
require("dotenv").config()
const { autoUpdater } = require("electron-updater")

// Geliştirme modu kontrolü (production'da false olacak)
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged

// Puppeteer'ı güvenli şekilde yükle
let puppeteer = null
try {
  puppeteer = require("puppeteer")
  console.log("Puppeteer başarıyla yüklendi")
} catch (error) {
  console.error("Puppeteer yüklenemedi:", error.message)
  console.log("Uygulama test modunda çalışacak")
}

// Geliştirme modunda otomatik yenileme
if (isDev) {
  try {
    require("electron-reload")(__dirname)
  } catch (error) {
    console.log("electron-reload bulunamadı (production modu)")
  }
}

let mainWindow
let browser = null
let page = null
let whatsappStatus = "disconnected"

// Güncelleme durumu
let updateAvailable = false
let updateDownloaded = false
let updateInfo = null

// Güncelleme ayarları
autoUpdater.autoDownload = true // Otomatik indirme aktif
autoUpdater.autoInstallOnAppQuit = true

// Mac için güncelleme sistemi aktif
if (process.platform === "darwin") {
  console.log("Mac'te güncelleme sistemi aktif")
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  // Mac için özel ayarlar
  autoUpdater.allowDowngrade = false
  autoUpdater.allowPrerelease = false
  // Mac için DMG formatını kabul et
  autoUpdater.setFeedURL({
    provider: "github",
    owner: "erenelmaci",
    repo: "kursmax-whatsapp",
    private: false,
    releaseType: "release",
  })
}

// Geliştirme modunda güncelleme kontrolünü zorla
if (isDev) {
  autoUpdater.forceDevUpdateConfig = true
}

// Güncelleme event listener'ları
autoUpdater.on("checking-for-update", () => {
  console.log("Güncelleme kontrol ediliyor...")
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update-status", { status: "checking" })
  }
})

autoUpdater.on("update-available", (info) => {
  console.log("Güncelleme mevcut:", info)
  updateAvailable = true
  updateInfo = info
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update-status", {
      status: "available",
      info: info,
    })
  }
})

autoUpdater.on("update-not-available", (info) => {
  console.log("Güncelleme yok:", info)
  updateAvailable = false
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update-status", {
      status: "not-available",
      info: info,
    })
  }
})

autoUpdater.on("error", (err) => {
  console.log("Güncelleme hatası:", err)
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update-status", {
      status: "error",
      error: err.message,
    })
  }
})

autoUpdater.on("download-progress", (progressObj) => {
  console.log("İndirme ilerlemesi:", progressObj)
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update-progress", progressObj)
  }
})

autoUpdater.on("update-downloaded", (info) => {
  console.log("Güncelleme indirildi:", info)
  updateDownloaded = true
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update-status", {
      status: "downloaded",
      info: info,
    })
  }
})

// Güncelleme kurulumu başladığında uygulamayı kapat
autoUpdater.on("before-quit-for-update", () => {
  console.log("Güncelleme kurulumu başlıyor, uygulama kapatılıyor...")
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close()
  }
  app.quit()
})

// Güncelleme kontrol fonksiyonu
function checkForUpdates() {
  console.log("Güncelleme kontrol ediliyor...")
  autoUpdater.checkForUpdates()
}

// Güncelleme indirme fonksiyonu
function downloadUpdate() {
  console.log("Güncelleme indiriliyor...")
  autoUpdater.downloadUpdate()
}

// Güncelleme kurma fonksiyonu
function installUpdate() {
  console.log("Güncelleme kuruluyor...")

  // Önce pencereyi kapat
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close()
  }

  // Sonra güncellemeyi kur
  autoUpdater.quitAndInstall()
}

// KursMax API Bilgileri
let kursmaxCredentials = {
  kurumkod: "",
  kullanici: "",
  parola: "",
  isLoggedIn: false,
}

// Test için sabit telefon numarası
// ⚠️ KENDİ NUMARANIZI BURAYA YAZIN! (90 ile başlayacak şekilde)
// Örnek: +905551234567
const TEST_PHONE_NUMBER = "+905519716365" // Bu numarayı kendi numaranızla değiştirin

// KursMax API Endpoint'leri
const KURSMAX_API = {
  LOGIN: "https://www.kursmax.com/kurumlar/rapor/wagiris.aspx",
  VERSION: "https://www.kursmax.com/kurumlar/rapor/wa_version.aspx",
  OGRENCI_LIST: "https://www.kursmax.com/kurumlar/rapor/walist_ogrenci.aspx",
  DEVAM_LIST: "https://www.kursmax.com/kurumlar/rapor/wagunlukdevam.aspx",
  VADE_LIST: "https://www.kursmax.com/kurumlar/rapor/wavade.aspx",
  SINAV_LIST: "https://www.kursmax.com/kurumlar/rapor/wasinavlist.aspx",
  SINAV_OGR_LIST: "https://www.kursmax.com/kurumlar/rapor/wasinavogrlist.aspx",
  ODEME_LIST: "https://www.kursmax.com/kurumlar/rapor/waodeme.aspx",
  ONKAYIT_LIST: "https://www.kursmax.com/kurumlar/rapor/walist_onkayit.aspx",
  ARSIV_LIST: "https://www.kursmax.com/kurumlar/rapor/walist_arsiv.aspx",
  // Öğrenci portal endpoint'leri
  OGRENCI_KARNE_TYT: "https://www.kursmax.com/ogrenci/rapor/wakarne_tyt.aspx",
  OGRENCI_KARNE_AYT: "https://www.kursmax.com/ogrenci/rapor/wakarne_ayt.aspx",
  OGRENCI_KARNE_LGS: "https://www.kursmax.com/ogrenci/rapor/wakarne_lgs.aspx",
  OGRENCI_KARNE_ODS: "https://www.kursmax.com/ogrenci/rapor/wakarne_ods.aspx",
  OGRENCI_PROGRAM: "https://www.kursmax.com/ogrenci/rapor/waprogram.aspx",
}

// HTML Agility Pack benzeri işlevsellik için cheerio kullan
const cheerio = require("cheerio")
const axios = require("axios")

function createWindow() {
  // Ana pencere oluştur
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false,
    },
    icon: isDev
      ? path.join(__dirname, "assets/icon.png")
      : path.join(process.resourcesPath, "assets/icon.png"),
    show: false,
  })

  // HTML dosyasını yükle
  mainWindow.loadFile("index.html")

  // Pencere hazır olduğunda göster
  mainWindow.once("ready-to-show", async () => {
    mainWindow.show()

    // F12 ile DevTools açma kısayolu
    mainWindow.webContents.on("before-input-event", (event, input) => {
      if (input.key === "F12") {
        mainWindow.webContents.toggleDevTools()
        event.preventDefault()
      }
    })

    // Puppeteer login sonrası başlatılacak, şimdi başlatma
    console.log("Uygulama hazır, login sonrası WhatsApp başlatılacak")
  })

  // Geliştirici araçlarını aç (geliştirme modunda)
  if (isDev) {
    // DevTools'u otomatik açma - sadece manuel olarak açılabilir
    // mainWindow.webContents.openDevTools();
  }

  // Pencere kapatıldığında
  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

// Uygulama hazır olduğunda pencere oluştur
app.whenReady().then(async () => {
  // Geliştirme modunda değilse güncelleme kontrolü yap
  if (!isDev) {
    console.log("Güncelleme kontrol ediliyor...")
    try {
      // Güncelleme kontrolü tamamlanana kadar bekle
      await new Promise((resolve) => {
        let updateChecked = false

        autoUpdater.on("update-not-available", () => {
          if (!updateChecked) {
            updateChecked = true
            console.log("Güncelleme yok, uygulama başlatılıyor...")
            resolve()
          }
        })

        autoUpdater.on("update-available", (info) => {
          if (!updateChecked) {
            updateChecked = true
            console.log("Güncelleme mevcut:", info)
            // Güncelleme varsa dialog göster
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send("update-status", {
                status: "available",
                info: info,
              })
            }
            resolve()
          }
        })

        autoUpdater.on("error", (err) => {
          if (!updateChecked) {
            updateChecked = true
            console.log("Güncelleme kontrolü hatası:", err)
            resolve()
          }
        })

        // 10 saniye timeout
        setTimeout(() => {
          if (!updateChecked) {
            updateChecked = true
            console.log("Güncelleme kontrolü timeout, uygulama başlatılıyor...")
            resolve()
          }
        }, 10000)

        // Güncelleme kontrolünü başlat
        autoUpdater.checkForUpdates()
      })
    } catch (error) {
      console.log("Güncelleme kontrolü hatası:", error)
    }
  } else {
    console.log("Geliştirme modunda güncelleme kontrolü devre dışı")
  }

  // Güncelleme kontrolü tamamlandıktan sonra uygulamayı başlat
  createWindow()
})

// Tüm pencereler kapatıldığında uygulamayı kapat
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// KursMax Login Fonksiyonu
async function kursmaxLogin(kurumkod, kullanici, parola) {
  try {
    console.log("KursMax'e giriş yapılıyor...")

    // Platform tespiti ve log
    const platform = process.platform
    const platformName =
      platform === "darwin"
        ? "macOS"
        : platform === "win32"
        ? "Windows"
        : platform === "linux"
        ? "Linux"
        : platform
    console.log(`🖥️  Sistem: ${platformName} (${platform})`)
    console.log(`📱 Electron sürümü: ${process.versions.electron}`)
    console.log(`🔧 Node.js sürümü: ${process.versions.node}`)

    const url = `${KURSMAX_API.LOGIN}?q0=${encodeURIComponent(
      kurumkod
    )}&q1=${encodeURIComponent(kullanici)}&q3=${encodeURIComponent(parola)}`

    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    })

    const $ = cheerio.load(response.data)
    let loginResult = "0"

    // Tablo içindeki ilk hücreyi kontrol et (C# projesindeki gibi)
    $("table tr").each((index, row) => {
      const cells = $(row).find("td")
      if (cells.length > 0) {
        loginResult = $(cells[0]).text().trim()
        return false // döngüyü durdur
      }
    })

    if (loginResult !== "0") {
      kursmaxCredentials = {
        kurumkod: kurumkod,
        kullanici: kullanici,
        parola: parola,
        isLoggedIn: true,
      }
      console.log("KursMax girişi başarılı")
      return { success: true, message: "Giriş başarılı" }
    } else {
      console.log("KursMax girişi başarısız")
      return { success: false, message: "Giriş bilgileri hatalı" }
    }
  } catch (error) {
    console.error("KursMax login hatası:", error.message)
    return { success: false, message: "Bağlantı hatası: " + error.message }
  }
}

// KursMax API'den veri çekme fonksiyonu
async function fetchKursmaxData(endpoint, params = {}) {
  try {
    if (!kursmaxCredentials.isLoggedIn) {
      throw new Error("KursMax'e giriş yapılmamış")
    }

    const url = `${endpoint}?q0=${encodeURIComponent(
      kursmaxCredentials.kurumkod
    )}&q1=${encodeURIComponent(
      kursmaxCredentials.kullanici
    )}&q3=${encodeURIComponent(kursmaxCredentials.parola)}`

    // Ek parametreleri ekle
    Object.keys(params).forEach((key) => {
      url += `&${key}=${encodeURIComponent(params[key])}`
    })

    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    })

    return { success: true, data: response.data }
  } catch (error) {
    console.error("KursMax veri çekme hatası:", error.message)
    return { success: false, message: error.message }
  }
}

// Uygulama kapatılırken temizlik
app.on("before-quit", async () => {
  if (browser) {
    try {
      await browser.close()
      console.log("Puppeteer browser kapatıldı")
    } catch (error) {
      console.error("Browser kapatılırken hata:", error)
    }
  }
})

// ===== IPC HANDLERS - Tüm handler'lar burada tanımlanır =====

// KursMax Login
ipcMain.handle("kursmax-login", async (event, credentials) => {
  const result = await kursmaxLogin(
    credentials.kurumkod,
    credentials.kullanici,
    credentials.parola
  )
  return result
})

// Login durumu kontrol
ipcMain.handle("check-login-status", async (event) => {
  return {
    isLoggedIn: kursmaxCredentials.isLoggedIn,
    kurumkod: kursmaxCredentials.kurumkod,
    kullanici: kursmaxCredentials.kullanici,
  }
})

// WhatsApp durum kontrolü
ipcMain.handle("check-whatsapp-status", async (event) => {
  try {
    if (!puppeteer || !page) {
      return {
        success: true,
        status: "disconnected",
        message: "Puppeteer bulunamadı",
      }
    }

    await checkWhatsAppStatus()

    return {
      success: true,
      status: whatsappStatus,
      message: `WhatsApp durumu: ${whatsappStatus}`,
    }
  } catch (error) {
    console.error("WhatsApp durum kontrolü hatası:", error)
    return {
      success: false,
      status: "error",
      message: error.message,
    }
  }
})

// WhatsApp sayfasını yenile
ipcMain.handle("refresh-whatsapp", async (event) => {
  try {
    if (!page) {
      return { success: false, message: "WhatsApp sayfası bulunamadı" }
    }

    console.log("WhatsApp sayfası yenileniyor...")
    await page.reload({ waitUntil: "networkidle2" })

    setTimeout(async () => {
      await checkWhatsAppStatus()
    }, 2000)

    return { success: true, message: "WhatsApp sayfası yenilendi" }
  } catch (error) {
    console.error("WhatsApp sayfası yenileme hatası:", error)
    return { success: false, message: error.message }
  }
})

// Öğrenci Listesi
ipcMain.handle("get-ogrenci-list", async (event) => {
  const result = await fetchKursmaxData(KURSMAX_API.OGRENCI_LIST)
  if (result.success) {
    const $ = cheerio.load(result.data)
    const students = []

    $("table tr").each((index, row) => {
      const cells = $(row).find("td")
      if (cells.length >= 8) {
        const student = {
          numara: $(cells[0]).text().trim(),
          sinif: $(cells[1]).text().trim(),
          ad: $(cells[2]).text().trim(),
          soyad: $(cells[3]).text().trim(),
          ceptel: $(cells[4]).text().trim(),
          annecep: $(cells[5]).text().trim(),
          babacep: $(cells[6]).text().trim(),
          seviye: $(cells[7]).text().trim(),
          parola: cells.length > 8 ? $(cells[8]).text().trim() : "",
        }
        if (student.numara && student.ad) {
          students.push(student)
        }
      }
    })

    return { success: true, students: students }
  }
  return result
})

// Devamsızlık Listesi
ipcMain.handle("get-devam-list", async (event) => {
  const result = await fetchKursmaxData(KURSMAX_API.DEVAM_LIST)
  if (result.success) {
    const $ = cheerio.load(result.data)
    const devamList = []

    $("table tr").each((index, row) => {
      const cells = $(row).find("td")
      if (cells.length >= 6) {
        const devam = {
          numara: $(cells[0]).text().trim(),
          ad: $(cells[1]).text().trim(),
          soyad: $(cells[2]).text().trim(),
          ders: $(cells[3]).text().trim(),
          ceptel: $(cells[4]).text().trim(),
          annecep: $(cells[5]).text().trim(),
        }
        if (devam.numara && devam.ad) {
          devamList.push(devam)
        }
      }
    })

    return { success: true, devamList: devamList }
  }
  return result
})

// Vade Listesi
ipcMain.handle("get-vade-list", async (event) => {
  const result = await fetchKursmaxData(KURSMAX_API.VADE_LIST)
  console.log(result)
  if (result.success) {
    const $ = cheerio.load(result.data)
    const vadeList = []

    $("table tr").each((index, row) => {
      const cells = $(row).find("td")
      if (cells.length >= 4) {
        const vade = {
          ad: $(cells[0]).text().trim(),
          borc: $(cells[1]).text().trim(),
          gecikme: $(cells[2]).text().trim(),
          annecep: $(cells[3]).text().trim(),
          babacep: cells.length > 4 ? $(cells[4]).text().trim() : "",
        }
        if (vade.ad && vade.borc) {
          vadeList.push(vade)
        }
      }
    })

    return { success: true, vadeList: vadeList }
  }
  return result
})

// Sınav Listesi
ipcMain.handle("get-sinav-list", async (event) => {
  const result = await fetchKursmaxData(KURSMAX_API.SINAV_LIST)
  if (result.success) {
    const $ = cheerio.load(result.data)
    const sinavList = []

    $("table tr").each((index, row) => {
      const cells = $(row).find("td")
      if (cells.length >= 8) {
        const sinav = {
          sinavno: $(cells[0]).text().trim(),
          tur: $(cells[1]).text().trim(),
          seviye: $(cells[2]).text().trim(),
          sinavad: $(cells[3]).text().trim(),
          tarih: $(cells[4]).text().trim(),
          ceptel: cells.length > 5 ? $(cells[5]).text().trim() : "",
          annecep: cells.length > 6 ? $(cells[6]).text().trim() : "",
          parola: cells.length > 7 ? $(cells[7]).text().trim() : "",
        }
        if (sinav.sinavno && sinav.tur) {
          sinavList.push(sinav)
        }
      }
    })

    return { success: true, sinavList: sinavList }
  }
  return result
})

// Ödeme Listesi
ipcMain.handle("get-odeme-list", async (event, tarih) => {
  const result = await fetchKursmaxData(KURSMAX_API.ODEME_LIST, { trh: tarih })
  if (result.success) {
    const $ = cheerio.load(result.data)
    const odemeList = []

    $("table tr").each((index, row) => {
      const cells = $(row).find("td")
      if (cells.length >= 7) {
        const odeme = {
          ad: $(cells[0]).text().trim(),
          tahsilat: $(cells[1]).text().trim(),
          kalanvade: $(cells[2]).text().trim(),
          kalanborc: $(cells[3]).text().trim(),
          sonrakiodeme: $(cells[4]).text().trim(),
          annecep: cells.length > 5 ? $(cells[5]).text().trim() : "",
          babacep: cells.length > 6 ? $(cells[6]).text().trim() : "",
        }
        if (odeme.ad && odeme.tahsilat) {
          odemeList.push(odeme)
        }
      }
    })

    return { success: true, odemeList: odemeList }
  }
  return result
})

// Ön Kayıt Listesi
ipcMain.handle("get-onkayit-list", async (event) => {
  const result = await fetchKursmaxData(KURSMAX_API.ONKAYIT_LIST)
  if (result.success) {
    const $ = cheerio.load(result.data)
    const onkayitList = []

    $("table tr").each((index, row) => {
      const cells = $(row).find("td")
      if (cells.length >= 7) {
        const onkayit = {
          numara: $(cells[0]).text().trim(),
          ad: $(cells[1]).text().trim(),
          soyad: $(cells[2]).text().trim(),
          ceptel: $(cells[3]).text().trim(),
          annecep: $(cells[4]).text().trim(),
          babacep: $(cells[5]).text().trim(),
          seviye: $(cells[6]).text().trim(),
        }
        if (onkayit.numara && onkayit.ad) {
          onkayitList.push(onkayit)
        }
      }
    })

    return { success: true, onkayitList: onkayitList }
  }
  return result
})

// Arşiv Listesi
ipcMain.handle("get-arsiv-list", async (event) => {
  const result = await fetchKursmaxData(KURSMAX_API.ARSIV_LIST)
  if (result.success) {
    const $ = cheerio.load(result.data)
    const arsivList = []

    $("table tr").each((index, row) => {
      const cells = $(row).find("td")
      if (cells.length >= 8) {
        const arsiv = {
          numara: $(cells[0]).text().trim(),
          ad: $(cells[1]).text().trim(),
          soyad: $(cells[2]).text().trim(),
          ceptel: $(cells[3]).text().trim(),
          annecep: $(cells[4]).text().trim(),
          babacep: $(cells[5]).text().trim(),
          seviye: $(cells[6]).text().trim(),
          tarih: $(cells[7]).text().trim(),
        }
        if (arsiv.numara && arsiv.ad) {
          arsivList.push(arsiv)
        }
      }
    })

    return { success: true, arsivList: arsivList }
  }
  return result
})

// Test verileri
ipcMain.handle("get-institutions", async () => {
  return [
    { id: 1, name: "Test Kurumu 1" },
    { id: 2, name: "Test Kurumu 2" },
  ]
})

ipcMain.handle("get-classes", async (event, institutionId) => {
  return [
    { id: 1, name: "9-A Sınıfı" },
    { id: 2, name: "10-B Sınıfı" },
    { id: 3, name: "11-C Sınıfı" },
  ]
})

ipcMain.handle("get-students", async (event, classId) => {
  return [
    { id: 1, name: "Test Öğrenci 1", phone: TEST_PHONE_NUMBER },
    { id: 2, name: "Test Öğrenci 2", phone: TEST_PHONE_NUMBER },
    { id: 3, name: "Test Öğrenci 3", phone: TEST_PHONE_NUMBER },
  ]
})

// Mesaj gönderme
ipcMain.handle("send-messages", async (event, data) => {
  try {
    const { recipients, message } = data

    console.log("🚀 Mesaj gönderme işlemi başlatılıyor...")
    console.log("Alıcı sayısı:", recipients.length)
    console.log("Mesaj:", message.substring(0, 50) + "...")

    if (whatsappStatus !== "connected") {
      throw new Error("WhatsApp bağlantısı yok - Durum: " + whatsappStatus)
    }

    if (!page) {
      throw new Error("WhatsApp sayfası bulunamadı")
    }

    let sentCount = 0
    const failed = []
    const successful = []

    for (let i = 0; i < recipients.length; i++) {
      const rec = recipients[i]
      console.log(
        `\n📤 ${i + 1}/${recipients.length} - ${rec.name} (${rec.phone})`
      )

      try {
        const result = await sendWhatsAppMessage(rec.phone, message)
        if (result === true) {
          sentCount++
          successful.push(rec)
          console.log(`✅ ${rec.name} - Mesaj gönderildi`)
        } else {
          failed.push({ ...rec, error: "Gönderim başarısız" })
          console.log(`❌ ${rec.name} - Gönderim başarısız`)
        }
      } catch (error) {
        failed.push({ ...rec, error: error.message })
        console.error(`❌ ${rec.name} (${rec.phone}) - Hata:`, error.message)
      }

      // Mesajlar arası bekleme (spam koruması)
      if (i < recipients.length - 1) {
        console.log("⏳ Sonraki mesaj için bekleniyor...")
        await new Promise((resolve) => setTimeout(resolve, 3000))
      }
    }

    const result = {
      success: failed.length === 0,
      sentCount,
      failed,
      successful,
      totalCount: recipients.length,
      message:
        failed.length === 0
          ? `✅ Tüm mesajlar başarıyla gönderildi (${sentCount}/${recipients.length})`
          : `⚠️ ${sentCount}/${recipients.length} mesaj gönderildi, ${failed.length} başarısız`,
    }

    console.log("\n📊 Mesaj gönderme özeti:")
    console.log(`✅ Başarılı: ${sentCount}`)
    console.log(`❌ Başarısız: ${failed.length}`)
    console.log(`📱 Toplam: ${recipients.length}`)

    return result
  } catch (error) {
    console.error("💥 Mesaj gönderme genel hatası:", error)
    return {
      success: false,
      sentCount: 0,
      failed: recipients || [],
      successful: [],
      totalCount: recipients ? recipients.length : 0,
      message: "Genel hata: " + error.message,
    }
  }
})

// Otomatik mesaj şablonları oluşturma
ipcMain.handle("create-auto-messages", async (event, data) => {
  try {
    const {
      messageType,
      targetAudience,
      students,
      customMessage = "",
      examInfo = {},
      paymentDate = new Date().toLocaleDateString("tr-TR"),
    } = data

    console.log("📝 Otomatik mesaj şablonları oluşturuluyor...")
    console.log("Mesaj tipi:", messageType)
    console.log("Hedef kitle:", targetAudience)
    console.log("Öğrenci sayısı:", students.length)
    if (students && students.length > 0) {
      console.log("İlk öğrenci objesi ve field'ları:", students[0])
      console.log("Tüm field isimleri:", Object.keys(students[0]))
    }

    const messages = []

    for (const student of students) {
      // Birden fazla hedef kitle için döngü
      const audiences = Array.isArray(targetAudience)
        ? targetAudience
        : [targetAudience]
      for (const audience of audiences) {
        let phone = ""
        let recipientName = ""
        switch (audience) {
          case "student":
            phone = student.ceptel || ""
            recipientName = `${student.ad} ${student.soyad} - Öğrenci Cep Tel`
            break
          case "mother":
            phone = student.annecep || ""
            recipientName = `${student.ad} ${student.soyad} - Anne Cep Tel`
            break
          case "father":
            phone = student.babacep || ""
            recipientName = `${student.ad} ${student.soyad} - Baba Cep Tel`
            break
          default:
            continue
        }
        if (!phone || phone.trim().length !== 10) {
          console.log(
            `⚠️ ${student.ad} ${student.soyad} - Geçersiz telefon: ${phone}`
          )
          continue
        }
        let message = ""
        switch (messageType) {
          case "custom":
            message = customMessage
            break
          case "absence":
            message = `Değerli Velimiz , Öğrenciniz : ${student.ad} ${
              student.soyad
            }, ${
              student.ders || "ders"
            } Dersine Bu Saat İtibariyle Katılmamıştır. Bilgilerinize Sunulur.`
            break
          case "overdue":
            message = `Değerli Velimiz , Öğrenciniz : ${
              student.ad
            } için Toplam : ${student.borc || "0"} TL. Vadesi Ortalama : ${
              student.gecikme || "0"
            } Gün Gecikmiş Ödemeniz Bulunmaktadır. Bilgilerinize Sunulur.`
            break
          case "exam_card":
            const examType = examInfo.type || "TYT"
            let karneUrl = ""
            switch (examType) {
              case "TYT":
                karneUrl = `${KURSMAX_API.OGRENCI_KARNE_TYT}?kod=${kursmaxCredentials.kurumkod}&sno=${examInfo.examNo}&ogno=${student.numara}&pno=${student.parola}&svy=${student.seviye}`
                break
              case "AYT":
                karneUrl = `${KURSMAX_API.OGRENCI_KARNE_AYT}?kod=${kursmaxCredentials.kurumkod}&sno=${examInfo.examNo}&ogno=${student.numara}&pno=${student.parola}&svy=${student.seviye}`
                break
              case "LGS":
                karneUrl = `${KURSMAX_API.OGRENCI_KARNE_LGS}?kod=${kursmaxCredentials.kurumkod}&sno=${examInfo.examNo}&ogno=${student.numara}&pno=${student.parola}&svy=${student.seviye}`
                break
              case "ODS":
                karneUrl = `${KURSMAX_API.OGRENCI_KARNE_ODS}?kod=${kursmaxCredentials.kurumkod}&sno=${examInfo.examNo}&ogno=${student.numara}&pno=${student.parola}&svy=${student.seviye}`
                break
            }
            message = `${
              examInfo.examName || "Deneme"
            } sınav karneniz için verilen bağlantıya tıklayın ${karneUrl}`
            break
          case "login_info":
            message = `Merhabalar, Öğrencimizin devamsızlık , ders programı ve tüm sınav sonuçlarına erişim için kursmax.com öğrenci takip panelinize girişte kullanacağınız Öğrenci Numaranız: ${student.numara} ve Parolanız : ${student.parola}`
            break
          case "schedule":
            const programUrl = `${KURSMAX_API.OGRENCI_PROGRAM}?kod=${kursmaxCredentials.kurumkod}&ogno=${student.numara}`
            message = `Merhabalar, Öğrencinizin Haftalık Ders Programını Öğrenmek İçin Verilen Bağlantıya Tıklayın : ${programUrl}`
            break
          case "payment":
            const kalanBorc = student.kalanborc || "0"
            const vadeGecen = student.gecikme || "0"
            const sonrakiOdeme = student.sonrakiodeme || "0"
            message = `Değerli velimiz, ${paymentDate} tarihinde işlenen ${
              student.tahsilat || "0"
            } TL. ödemeniz için teşekkür ederiz. Toplam kalan borcunuz ${kalanBorc} TL dir.`
            if (parseFloat(kalanBorc) > 0) {
              message += ` Bugün itibari ile vadesi geçen borcunuz ${vadeGecen} TL dir.`
              if (parseFloat(sonrakiOdeme) > 0) {
                message += ` Bir sonraki taksit ödemeniz ${
                  student.sonrakiodemeTarih || ""
                } tarihinde ${sonrakiOdeme} TL dir.`
              }
            }
            break
          default:
            console.log(`⚠️ Bilinmeyen mesaj tipi: ${messageType}`)
            continue
        }
        messages.push({
          name: `${student.ad} ${student.soyad}`,
          phone: phone,
          message: message,
          recipientName: recipientName,
        })
        console.log(
          `✅ ${student.ad} ${student.soyad} - ${audience} için mesaj hazırlandı`
        )
      }
    }

    console.log(`📊 Toplam ${messages.length} mesaj hazırlandı`)

    return {
      success: true,
      messages: messages,
      count: messages.length,
      message: `${messages.length} adet otomatik mesaj hazırlandı`,
    }
  } catch (error) {
    console.error("💥 Otomatik mesaj oluşturma hatası:", error)
    return {
      success: false,
      messages: [],
      count: 0,
      message: "Hata: " + error.message,
    }
  }
})

// Puppeteer başlatma
async function initializePuppeteer() {
  try {
    if (!puppeteer) {
      console.log("Puppeteer bulunamadı, test modunda çalışıyor...")
      whatsappStatus = "connected" // Test modunda bağlı olarak ayarla
      return
    }

    console.log("Puppeteer başlatılıyor...")

    // Geliştirme modunda Puppeteer'ı görünür modda başlat
    if (isDev) {
      console.log("Geliştirme modunda Puppeteer başlatılıyor...")

      // Geliştirme modunda Chrome'u görünür yap
      const devLaunchOptions = {
        headless: false, // Geliştirme modunda görünür
        defaultViewport: null,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--window-size=1200,800",
        ],
      }

      browser = await puppeteer.launch(devLaunchOptions)
      console.log("Geliştirme modunda browser başlatıldı")
      page = await browser.newPage()

      // WhatsApp Web'e git
      console.log("WhatsApp Web'e gidiliyor...")
      await page.goto("https://web.whatsapp.com", {
        waitUntil: "networkidle2",
        timeout: 30000,
      })

      console.log("WhatsApp Web yüklendi")
      whatsappStatus = "connected"
      return
    }

    // Production için özel ayarlar
    const launchOptions = {
      headless: isDev ? false : true, // Geliştirme modunda görünür, production'da gizli
      defaultViewport: null, // Tam ekran
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
        "--window-size=1200,800",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
        "--disable-extensions",
        "--disable-plugins",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-features=TranslateUI",
        "--disable-ipc-flooding-protection",
      ],
    }

    // Puppeteer'ın kendi Chrome'unu kullan
    console.log("Puppeteer'ın kendi Chrome'u kullanılıyor...")

    // Executable path'i ayarla
    if (app.isPackaged) {
      // Production'da Puppeteer'ın Chromium'unu kullan
      const puppeteerPath = path.join(
        process.resourcesPath,
        "puppeteer",
        ".local-chromium"
      )
      const chromePath = path.join(
        puppeteerPath,
        "chrome-mac-arm64",
        "Google Chrome for Testing.app",
        "Contents",
        "MacOS",
        "Google Chrome for Testing"
      )

      if (require("fs").existsSync(chromePath)) {
        launchOptions.executablePath = chromePath
        console.log("Puppeteer Chromium bulundu:", chromePath)
      } else {
        console.log("Puppeteer Chromium bulunamadı, varsayılan kullanılıyor")
      }
    }

    // Kullanıcıya bilgi ver
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("chrome-not-found", {
        message:
          "Puppeteer'ın kendi Chrome'u kullanılıyor. Daha iyi performans için Google Chrome'u yükleyebilirsiniz.",
        recommendation: "https://www.google.com/chrome/",
      })
    }

    browser = await puppeteer.launch(launchOptions)

    console.log("Browser başlatıldı, sayfa oluşturuluyor...")
    page = await browser.newPage()

    // Sayfa kapatıldığında frame hatalarını önle
    page.on("close", () => {
      console.log("Sayfa kapatıldı")
      page = null
    })

    page.on("error", (error) => {
      console.log("Sayfa hatası:", error.message)
      page = null
    })

    // Sayfa yüklendiğinde log
    page.on("load", () => {
      console.log("WhatsApp Web sayfası yüklendi")
    })

    // WhatsApp Web'e git
    console.log("WhatsApp Web'e gidiliyor...")
    await page.goto("https://web.whatsapp.com", {
      waitUntil: "networkidle2",
      timeout: 30000,
    })

    console.log("WhatsApp Web yüklendi, durum kontrolü başlatılıyor...")

    // İlk WhatsApp durumunu kontrol et
    await checkWhatsAppStatus()

    // WhatsApp durumunu periyodik olarak kontrol et (3 saniyede bir)
    setInterval(async () => {
      try {
        await checkWhatsAppStatus()
      } catch (error) {
        console.error("Periyodik WhatsApp durum kontrolü hatası:", error)
      }
    }, 3000)
  } catch (error) {
    console.error("Puppeteer başlatma hatası:", error)
    console.log("Test modunda devam ediliyor...")
    whatsappStatus = "connected" // Test modunda bağlı olarak ayarla

    // Kullanıcıya hata bilgisi ver
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("puppeteer-error", {
        message: "Chrome başlatılamadı. Lütfen Google Chrome'u yükleyin.",
        recommendation: "https://www.google.com/chrome/",
      })
    }
  }
}

// WhatsApp durumunu kontrol et
async function checkWhatsAppStatus() {
  try {
    if (!puppeteer || !page) {
      console.log("Puppeteer bulunamadı, test modunda çalışıyor...")
      whatsappStatus = "connected"
      return
    }

    // Sayfa hala açık mı kontrol et
    if (page.isClosed()) {
      console.log("Sayfa kapatılmış, durum kontrolü atlanıyor...")
      whatsappStatus = "disconnected"
      return
    }

    // Frame'in hala geçerli olup olmadığını kontrol et
    try {
      await page.evaluate(() => {
        // Basit bir test - eğer bu çalışırsa frame geçerli
        return document.readyState
      })
    } catch (frameError) {
      console.log("Frame hatası, sayfa yeniden yükleniyor...")
      try {
        await page.reload({ waitUntil: "networkidle2", timeout: 30000 })
        await new Promise((resolve) => setTimeout(resolve, 2000))
      } catch (reloadError) {
        console.error("Sayfa yeniden yükleme hatası:", reloadError)
        whatsappStatus = "disconnected"
        return
      }
    }

    // Daha sağlam WhatsApp durum kontrolü
    const result = await page.evaluate(() => {
      // 1. QR kod kontrolü
      const qrCanvas = document.querySelector("canvas")
      if (qrCanvas) return { status: "qr_required", number: null }

      // 2. Sohbet/mesaj/chat anahtar kelimeleri ve ana elementler
      const appDiv = document.querySelector('div[data-testid="app"]')
      const chatList = document.querySelector('div[data-testid="chat-list"]')
      const messageBox = document.querySelector(
        'div[data-testid="conversation-compose-box-input"]'
      )
      const conversationHeader = document.querySelector(
        'div[data-testid="conversation-header"]'
      )
      const bodyText = document.body.innerText.toLowerCase()

      if (
        appDiv ||
        chatList ||
        messageBox ||
        conversationHeader ||
        bodyText.includes("sohbet") ||
        bodyText.includes("mesaj") ||
        bodyText.includes("chat")
      ) {
        return { status: "connected", number: null }
      }

      // 3. Yükleniyor kontrolü
      const loadingElements = document.querySelectorAll(
        '.loading, .spinner, [data-testid="loading"]'
      )
      if (loadingElements.length > 0) {
        return { status: "loading", number: null }
      }

      // 4. QR kod metni kontrolü
      if (
        bodyText.includes("qr") ||
        bodyText.includes("kodu") ||
        bodyText.includes("telefon")
      ) {
        return { status: "qr_required", number: null }
      }

      return { status: "disconnected", number: null }
    })

    const status = result.status
    const whatsappNumber = result.number

    whatsappStatus = status
    // Durumu renderer'a bildir
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("whatsapp-status-update", {
        status: status,
        number: whatsappNumber,
      })
    }
  } catch (error) {
    console.error("WhatsApp durum kontrolü hatası:", error)
    whatsappStatus = "disconnected"
  }
}

// WhatsApp mesaj gönderme fonksiyonu (C# projesindeki mantıkla)
async function sendWhatsAppMessage(phoneNumber, message) {
  try {
    if (!page) throw new Error("Puppeteer sayfası bulunamadı")

    // Sayfa hala açık mı kontrol et
    if (page.isClosed()) {
      throw new Error("WhatsApp sayfası kapatılmış")
    }

    // Frame'in hala geçerli olup olmadığını kontrol et
    try {
      await page.evaluate(() => {
        return document.readyState
      })
    } catch (frameError) {
      console.log("Frame hatası, sayfa yeniden yükleniyor...")
      try {
        await page.reload({ waitUntil: "networkidle2", timeout: 30000 })
        await new Promise((resolve) => setTimeout(resolve, 2000))
      } catch (reloadError) {
        throw new Error("WhatsApp sayfası yeniden yüklenemedi")
      }
    }

    const formattedPhone = phoneNumber.replace(/^"+/, "").replace(/\s/g, "")
    console.log(`📱 ${phoneNumber} numarasına mesaj gönderiliyor...`)

    // C# projesindeki gibi WhatsApp Web'e git
    await page.goto("https://web.whatsapp.com/", {
      waitUntil: "networkidle2",
      timeout: 30000,
    })
    console.log("WhatsApp Web açıldı")

    // Sayfanın yüklenmesini bekle
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // C# projesindeki gibi numara arama kutusu seçicileri
    const phoneInputSelectors = [
      '[data-testid="chat-list-search"]',
      'div[contenteditable="true"][data-tab="3"]',
      'input[placeholder*="Ara"]',
      'input[placeholder*="Search"]',
      'div[contenteditable="true"]',
      ".selectable-text.copyable-text",
      '[data-testid="conversation-search"]',
    ]

    // 1. Numara arama kutusunu bul
    let phoneInput = null
    for (const selector of phoneInputSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 })
        phoneInput = await page.$(selector)
        if (phoneInput) {
          console.log("Numara arama kutusu bulundu:", selector)
          break
        }
      } catch (e) {
        console.log("Numara arama kutusu bulunamadı:", selector)
      }
    }

    if (!phoneInput) {
      throw new Error("Numara arama kutusu bulunamadı")
    }

    // 2. C# projesindeki gibi önce Escape bas, sonra numara yaz, sonra Enter
    console.log("Numara yazılıyor:", formattedPhone)
    await phoneInput.focus()
    await page.keyboard.press("Escape")
    await new Promise((resolve) => setTimeout(resolve, 500))
    await phoneInput.type(formattedPhone, { delay: 100 })
    await new Promise((resolve) => setTimeout(resolve, 1000))
    await page.keyboard.press("Enter")
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // 3. Eğer numara bulunamadıysa, yeni sohbet başlat (C# projesindeki gibi)
    try {
      // "Bulunamadı" mesajını kontrol et
      const notFoundSelectors = [
        '[data-testid="no-chats-found"]',
        'div[data-testid="no-chats-found"]',
        ".no-chats-found",
        'div:contains("Bulunamadı")',
        'div:contains("Not found")',
      ]

      let notFound = false
      for (const selector of notFoundSelectors) {
        try {
          const element = await page.$(selector)
          if (element) {
            notFound = true
            console.log("Numara bulunamadı, yeni sohbet başlatılıyor...")
            break
          }
        } catch (e) {
          // Sessiz geç
        }
      }

      if (notFound) {
        // Yeni sohbet butonunu bul ve tıkla
        const newChatSelectors = [
          '[data-testid="new-chat"]',
          'div[data-testid="new-chat"]',
          'button[aria-label="New chat"]',
          'button[title="New chat"]',
          'span[data-icon="new-chat"]',
          'div[data-icon="new-chat"]',
        ]

        let newChatButton = null
        for (const selector of newChatSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 3000 })
            newChatButton = await page.$(selector)
            if (newChatButton) {
              console.log("Yeni sohbet butonu bulundu:", selector)
              break
            }
          } catch (e) {
            console.log("Yeni sohbet butonu bulunamadı:", selector)
          }
        }

        if (newChatButton) {
          await newChatButton.click()
          await new Promise((resolve) => setTimeout(resolve, 2000))

          // Yeni sohbet arama kutusunu bul
          const newChatInputSelectors = [
            '[data-testid="chat-list-search"]',
            'div[contenteditable="true"][data-tab="3"]',
            'input[placeholder*="Ara"]',
            'input[placeholder*="Search"]',
            'div[contenteditable="true"]',
          ]

          let newChatInput = null
          for (const selector of newChatInputSelectors) {
            try {
              await page.waitForSelector(selector, { timeout: 3000 })
              newChatInput = await page.$(selector)
              if (newChatInput) {
                console.log("Yeni sohbet arama kutusu bulundu:", selector)
                break
              }
            } catch (e) {
              console.log("Yeni sohbet arama kutusu bulunamadı:", selector)
            }
          }

          if (newChatInput) {
            // C# projesindeki gibi önce temizle, sonra numara yaz, sonra Enter
            await newChatInput.focus()
            await newChatInput.type("", { delay: 100 })
            await new Promise((resolve) => setTimeout(resolve, 500))
            await newChatInput.type(formattedPhone, { delay: 100 })
            await new Promise((resolve) => setTimeout(resolve, 1000))
            await page.keyboard.press("Enter")
            await new Promise((resolve) => setTimeout(resolve, 2000))
          }
        }
      }
    } catch (e) {
      console.log("Numara bulunamadı kontrolü başarısız, devam ediliyor...")
    }

    // 4. Mesaj kutusunu bul (C# projesindeki gibi)
    const messageBoxSelectors = [
      '[data-testid="conversation-compose-box-input"]',
      'div[contenteditable="true"][data-tab="10"]',
      '[contenteditable="true"]',
      ".selectable-text.copyable-text",
      'div[contenteditable="true"][data-tab="6"]',
    ]

    let messageBox = null
    for (const selector of messageBoxSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 })
        messageBox = await page.$(selector)
        if (messageBox) {
          console.log("Mesaj kutusu bulundu:", selector)
          break
        }
      } catch (e) {
        console.log("Mesaj kutusu bulunamadı:", selector)
      }
    }

    if (!messageBox) {
      throw new Error(
        "Mesaj kutusu bulunamadı - WhatsApp Web'e giriş yapılmamış olabilir"
      )
    }

    // 5. C# projesindeki gibi mesajı yaz
    console.log("Mesaj yazılıyor:", message)
    await messageBox.focus()
    await new Promise((resolve) => setTimeout(resolve, 500))
    await messageBox.type(message, { delay: 50 })
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // 6. C# projesindeki gibi Enter ile gönder
    console.log("Enter ile gönderiliyor...")
    await page.keyboard.press("Enter")
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // 7. Mesajın gönderildiğini kontrol et (C# projesindeki gibi)
    const finalText = await page.evaluate(
      (selector) => {
        const element = document.querySelector(selector)
        return element ? element.textContent || element.innerText : ""
      },
      messageBoxSelectors.find((selector) => {
        try {
          return document.querySelector(selector)
        } catch {
          return false
        }
      })
    )

    console.log("Gönderim sonrası mesaj kutusu:", finalText)

    // Mesaj kutusu boşsa başarılı
    if (
      finalText.trim() === "" ||
      !finalText.includes(message.substring(0, 10))
    ) {
      console.log("✅ Mesaj başarıyla gönderildi")

      // C# projesindeki gibi Escape ile mesaj kutusundan çık
      await page.keyboard.press("Escape")
      await new Promise((resolve) => setTimeout(resolve, 500))

      // C# projesindeki gibi Escape ile numara arama kutusundan çık
      await page.keyboard.press("Escape")
      await new Promise((resolve) => setTimeout(resolve, 500))

      return true
    } else {
      throw new Error("Mesaj gönderilemedi - mesaj kutusu hala dolu")
    }
  } catch (error) {
    console.error(`❌ Mesaj gönderme hatası (${phoneNumber}):`, error.message)
    throw error
  }
}

// Güncelleme IPC handler'ları
ipcMain.handle("check-for-updates", () => {
  checkForUpdates()
  return { success: true }
})

ipcMain.handle("download-update", () => {
  downloadUpdate()
  return { success: true }
})

ipcMain.handle("install-update", () => {
  installUpdate()
  return { success: true }
})

ipcMain.handle("get-update-status", () => {
  return {
    updateAvailable,
    updateDownloaded,
    updateInfo,
  }
})

ipcMain.handle("get-app-version", () => {
  return app.getVersion()
})

// Login sonrası WhatsApp başlatma
ipcMain.handle("start-whatsapp", async () => {
  try {
    console.log("Login sonrası WhatsApp başlatılıyor...")
    await initializePuppeteer()
    return { success: true, message: "WhatsApp başlatıldı" }
  } catch (error) {
    console.error("WhatsApp başlatma hatası:", error)
    return { success: false, message: error.message }
  }
})

console.log("Tüm IPC handler'lar kaydedildi")

ipcMain.handle(
  "send-whatsapp-message",
  async (event, { phoneNumber, message }) => {
    try {
      const result = await sendWhatsAppMessage(phoneNumber, message)
      return {
        success: result === true,
        message: result === true ? "Mesaj gönderildi" : "Mesaj gönderilemedi",
      }
    } catch (error) {
      return { success: false, message: error.message }
    }
  }
)
