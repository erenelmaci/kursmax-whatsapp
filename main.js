const { app, BrowserWindow, Menu, ipcMain } = require("electron")
const path = require("path")
require("dotenv").config()

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

// Test için sabit telefon numarası
// ⚠️ KENDİ NUMARANIZI BURAYA YAZIN! (90 ile başlayacak şekilde)
// Örnek: +905551234567
const TEST_PHONE_NUMBER = "+905519716365" // Bu numarayı kendi numaranızla değiştirin

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
  mainWindow.once("ready-to-show", () => {
    mainWindow.show()
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
  createWindow()

  // F12 ile DevTools açma kısayolu
  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (input.key === "F12") {
      mainWindow.webContents.toggleDevTools()
      event.preventDefault()
    }
  })

  // Puppeteer başlat
  try {
    await initializePuppeteer()
    console.log("Puppeteer başlatıldı")
  } catch (error) {
    console.error("Puppeteer başlatılamadı:", error.message)
  }
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

// Puppeteer başlatma
async function initializePuppeteer() {
  try {
    if (!puppeteer) {
      console.log("Puppeteer bulunamadı, test modunda çalışıyor...")
      whatsappStatus = "connected" // Test modunda bağlı olarak ayarla
      return
    }

    console.log("Puppeteer başlatılıyor...")

    browser = await puppeteer.launch({
      headless: false, // Görünür modda çalıştır
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
      ],
    })

    console.log("Browser başlatıldı, sayfa oluşturuluyor...")
    page = await browser.newPage()

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

    // WhatsApp durumunu kontrol et
    checkWhatsAppStatus()
  } catch (error) {
    console.error("Puppeteer başlatma hatası:", error)
    console.log("Test modunda devam ediliyor...")
    whatsappStatus = "connected" // Test modunda bağlı olarak ayarla
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

    // XPath ve text-based selector'lar ile daha güvenilir kontrol
    const status = await page.evaluate(() => {
      console.log("WhatsApp durumu kontrol ediliyor...")

      // QR kod var mı kontrol et - canvas elementi
      const qrCanvas = document.querySelector("canvas")
      if (qrCanvas) {
        console.log("QR kod bulundu")
        return "qr_required"
      }

      // Giriş yapılmış mı kontrol et - XPath ile
      const xpathSelectors = [
        "//div[contains(@class, 'app')]//div[contains(@class, 'chat')]",
        "//div[contains(@class, 'app')]//div[contains(@class, 'side')]",
        "//div[contains(@class, 'app')]//div[contains(@class, 'main')]",
        "//div[contains(@class, 'app')]//div[contains(@class, 'conversation')]",
        "//div[contains(@class, 'app')]//div[contains(@class, 'list')]",
      ]

      for (const xpath of xpathSelectors) {
        const result = document.evaluate(
          xpath,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        )
        if (result.singleNodeValue) {
          console.log(`Giriş yapılmış - XPath bulundu: ${xpath}`)
          return "connected"
        }
      }

      // Text-based kontrol - sayfa içeriğinde WhatsApp kelimeleri ara
      const bodyText = document.body.innerText.toLowerCase()
      const whatsappKeywords = [
        "whatsapp",
        "sohbet",
        "chat",
        "mesaj",
        "message",
      ]

      if (bodyText.includes("whatsapp web") || bodyText.includes("qr")) {
        console.log("WhatsApp Web sayfası yüklendi")

        // QR kod var mı text ile kontrol et
        if (bodyText.includes("qr") || bodyText.includes("kodu")) {
          return "qr_required"
        }

        // Giriş yapılmış mı text ile kontrol et
        if (
          bodyText.includes("sohbet") ||
          bodyText.includes("chat") ||
          bodyText.includes("mesaj")
        ) {
          console.log("Giriş yapılmış - text kontrolü")
          return "connected"
        }
      }

      return "disconnected"
    })

    whatsappStatus = status
    console.log("WhatsApp durumu:", status)
  } catch (error) {
    console.error("WhatsApp durum kontrolü hatası:", error)
    whatsappStatus = "disconnected"
  }
}

// IPC olayları
ipcMain.handle("whatsapp-status", async () => {
  return { status: whatsappStatus }
})

// Manuel durum kontrolü
ipcMain.handle("check-whatsapp-manually", async () => {
  try {
    if (!page) {
      return { success: false, message: "Puppeteer sayfası bulunamadı" }
    }

    // Sayfanın screenshot'ını al
    const screenshot = await page.screenshot({ encoding: "base64" })

    // Sayfa HTML'ini al
    const html = await page.content()

    // Tüm elementleri detaylı analiz et
    const elements = await page.evaluate(() => {
      const allElements = document.querySelectorAll("*")
      const elementList = []

      for (let i = 0; i < Math.min(allElements.length, 100); i++) {
        const el = allElements[i]
        const rect = el.getBoundingClientRect()

        // Sadece görünür elementleri al
        if (rect.width > 0 && rect.height > 0) {
          elementList.push({
            tag: el.tagName,
            id: el.id,
            className: el.className,
            testId: el.getAttribute("data-testid"),
            text: el.textContent?.substring(0, 100),
            xpath: getXPath(el),
            visible: rect.width > 0 && rect.height > 0,
            // Özel selector'lar
            selectableText: el.classList.contains("selectable-text"),
            contentEditable: el.getAttribute("contenteditable"),
            dataTab: el.getAttribute("data-tab"),
            ariaLabel: el.getAttribute("aria-label"),
            title: el.getAttribute("title"),
          })
        }
      }

      // XPath hesaplama fonksiyonu
      function getXPath(element) {
        if (element.id !== "") {
          return `//*[@id="${element.id}"]`
        }
        if (element === document.body) {
          return "/html/body"
        }
        let ix = 0
        const siblings = element.parentNode.childNodes
        for (let i = 0; i < siblings.length; i++) {
          const sibling = siblings[i]
          if (sibling === element) {
            return (
              getXPath(element.parentNode) +
              "/" +
              element.tagName.toLowerCase() +
              "[" +
              (ix + 1) +
              "]"
            )
          }
          if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
            ix++
          }
        }
      }

      return elementList
    })

    // Sayfa metnini analiz et
    const textAnalysis = await page.evaluate(() => {
      const bodyText = document.body.innerText.toLowerCase()
      const keywords = {
        whatsapp: bodyText.includes("whatsapp"),
        qr: bodyText.includes("qr") || bodyText.includes("kodu"),
        chat: bodyText.includes("chat") || bodyText.includes("sohbet"),
        message: bodyText.includes("message") || bodyText.includes("mesaj"),
        send: bodyText.includes("send") || bodyText.includes("gönder"),
        loading:
          bodyText.includes("loading") || bodyText.includes("yükleniyor"),
      }

      return {
        keywords,
        fullText: bodyText.substring(0, 1000),
      }
    })

    // Özel WhatsApp elementlerini bul
    const whatsappElements = await page.evaluate(() => {
      const elements = {
        searchBox: null,
        messageBox: null,
        sendButton: null,
        chatList: null,
      }

      // Arama kutusu
      const searchSelectors = [
        ".selectable-text",
        '[data-testid="chat-list-search"]',
        '[contenteditable="true"][data-tab="3"]',
        'div[contenteditable="true"]',
      ]

      for (const selector of searchSelectors) {
        const el = document.querySelector(selector)
        if (el) {
          elements.searchBox = {
            selector: selector,
            className: el.className,
            testId: el.getAttribute("data-testid"),
            contentEditable: el.getAttribute("contenteditable"),
            dataTab: el.getAttribute("data-tab"),
          }
          break
        }
      }

      // Mesaj kutusu
      const messageSelectors = [
        '[data-testid="conversation-compose-box-input"]',
        'div[contenteditable="true"][data-tab="10"]',
        '[contenteditable="true"]',
      ]

      for (const selector of messageSelectors) {
        const el = document.querySelector(selector)
        if (el) {
          elements.messageBox = {
            selector: selector,
            className: el.className,
            testId: el.getAttribute("data-testid"),
            contentEditable: el.getAttribute("contenteditable"),
            dataTab: el.getAttribute("data-tab"),
          }
          break
        }
      }

      // Gönder butonu
      const sendSelectors = [
        '[data-testid="send"]',
        '[data-icon="send"]',
        'button[aria-label="Send"]',
      ]

      for (const selector of sendSelectors) {
        const el = document.querySelector(selector)
        if (el) {
          elements.sendButton = {
            selector: selector,
            className: el.className,
            testId: el.getAttribute("data-testid"),
            dataIcon: el.getAttribute("data-icon"),
            ariaLabel: el.getAttribute("aria-label"),
          }
          break
        }
      }

      // Chat listesi
      const chatSelectors = [
        '[data-testid="chat-list"]',
        '[data-testid="side"]',
        ".app",
      ]

      for (const selector of chatSelectors) {
        const el = document.querySelector(selector)
        if (el) {
          elements.chatList = {
            selector: selector,
            className: el.className,
            testId: el.getAttribute("data-testid"),
          }
          break
        }
      }

      return elements
    })

    return {
      success: true,
      status: whatsappStatus,
      screenshot: screenshot,
      html: html.substring(0, 3000), // İlk 3000 karakter
      elements: elements,
      textAnalysis: textAnalysis,
      whatsappElements: whatsappElements,
    }
  } catch (error) {
    return { success: false, message: error.message }
  }
})

// Sayfayı yenile
ipcMain.handle("refresh-whatsapp", async () => {
  try {
    if (!page) {
      throw new Error("Puppeteer sayfası bulunamadı")
    }

    await page.reload({ waitUntil: "networkidle2" })
    console.log("WhatsApp sayfası yenilendi")

    return { success: true, message: "Sayfa yenilendi" }
  } catch (error) {
    return { success: false, message: error.message }
  }
})

ipcMain.handle("get-institutions", async () => {
  // Test verisi döndür
  return [
    { id: 1, name: "Test Kurumu 1" },
    { id: 2, name: "Test Kurumu 2" },
  ]
})

ipcMain.handle("get-classes", async (event, institutionId) => {
  // Test verisi döndür
  return [
    { id: 1, name: "9-A Sınıfı" },
    { id: 2, name: "10-B Sınıfı" },
    { id: 3, name: "11-C Sınıfı" },
  ]
})

ipcMain.handle("get-students", async (event, classId) => {
  // Test verisi döndür - sabit numara ile
  return [
    { id: 1, name: "Test Öğrenci 1", phone: TEST_PHONE_NUMBER },
    { id: 2, name: "Test Öğrenci 2", phone: TEST_PHONE_NUMBER },
    { id: 3, name: "Test Öğrenci 3", phone: TEST_PHONE_NUMBER },
  ]
})

// IPC handler'ı güncelle - sadece Puppeteer kullan
ipcMain.handle("send-messages", async (event, data) => {
  try {
    const { recipients, message } = data
    if (whatsappStatus !== "connected") {
      throw new Error("WhatsApp bağlantısı yok")
    }
    console.log("Mesaj gönderiliyor:", { recipients, message })
    let sentCount = 0
    const failed = []
    for (const rec of recipients) {
      try {
        await sendWhatsAppMessage(rec.phone, message)
        sentCount++
      } catch (error) {
        failed.push(rec)
        console.error(
          `Alıcıya gönderilemedi: ${rec.name} (${rec.phone})`,
          error
        )
      }
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
    return {
      success: failed.length === 0,
      sentCount,
      failed,
      message:
        failed.length === 0
          ? "Tüm mesajlar başarıyla gönderildi"
          : "Bazı mesajlar gönderilemedi",
    }
  } catch (error) {
    console.error("Mesaj gönderme hatası:", error)
    return {
      success: false,
      sentCount: 0,
      failed: [],
      message: error.message,
    }
  }
})

// WhatsApp mesaj gönderme fonksiyonu (Puppeteer ile)
async function sendWhatsAppMessage(phoneNumber, message) {
  try {
    if (!page) throw new Error("Puppeteer sayfası bulunamadı")

    const formattedPhone = phoneNumber.replace(/^"+/, "").replace(/\s/g, "")
    const encodedMessage = encodeURIComponent(message)

    // 1. Doğrudan sohbet başlatan URL'ye git
    await page.goto(
      `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`,
      {
        waitUntil: "networkidle2",
        timeout: 30000,
      }
    )
    console.log("Sohbet sayfasına gidildi")

    // 2. Mesaj kutusunu bul
    const messageBoxSelectors = [
      '[data-testid="conversation-compose-box-input"]',
      'div[contenteditable="true"][data-tab="10"]',
      '[contenteditable="true"]',
      ".selectable-text.copyable-text",
    ]
    let messageBox = null
    for (const selector of messageBoxSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 7000 })
        messageBox = await page.$(selector)
        if (messageBox) {
          console.log("Mesaj kutusu bulundu:", selector)
          break
        }
      } catch (e) {
        console.log("Mesaj kutusu bulunamadı:", selector)
      }
    }
    if (!messageBox) throw new Error("Mesaj kutusu bulunamadı")

    // 3. Taslak varsa sil (Mac için Meta, Windows için Control)
    await messageBox.focus()
    await page.keyboard.down(process.platform === "darwin" ? "Meta" : "Control")
    await page.keyboard.press("KeyA")
    await page.keyboard.up(process.platform === "darwin" ? "Meta" : "Control")
    await page.keyboard.press("Backspace")
    await new Promise((resolve) => setTimeout(resolve, 300)) // Kısa bekle

    // 4. Mesajı yaz
    await messageBox.type(message, { delay: 10 })
    console.log("Mesaj yazıldı")

    // 5. Gönder butonunu bul ve tıkla
    const sendButtonSelectors = [
      '[data-testid="compose-btn-send"]',
      '[data-icon="send"]',
      'button[aria-label="Send"]',
      'button[title="Send"]',
      'span[data-icon="send"]',
      'footer button span[data-icon="send"]',
      'footer button[aria-label="Gönder"]',
      "footer button",
    ]
    let sendButton = null
    for (const selector of sendButtonSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 500 })
        sendButton = await page.$(selector)
        if (sendButton) {
          console.log("Gönder butonu bulundu:", selector)
          break
        }
      } catch (e) {
        // log yok, sessiz geç
      }
    }

    if (sendButton) {
      await sendButton.click()
      console.log("Mesaj gönderildi (buton ile)")
    } else {
      // Gönder butonu yoksa Enter ile gönder
      await messageBox.focus()
      await page.keyboard.press("Enter")
      console.log("Mesaj gönderildi (Enter ile)")
    }

    await new Promise((resolve) => setTimeout(resolve, 2000))
  } catch (error) {
    console.error(`❌ Mesaj gönderme hatası (${phoneNumber}):`, error.message)
    throw error
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
