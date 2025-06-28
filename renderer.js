const { ipcRenderer } = require("electron")
const QRCode = require("qrcode")

// Global değişkenler
let whatsappStatus = "connecting"
let selectedStudents = []
let currentData = [] // Mevcut veri listesi
let isLoggedIn = false

// Otomatik mesaj şablonları için değişkenler
let preparedMessages = []
let currentStudents = []
let isMessagesPrepared = false // Mesajların hazırlanıp hazırlanmadığını takip etmek için

// Test öğrenci verisi (gerçek veritabanı olmadan test için)
const TEST_STUDENTS = [
  { id: 1, name: "Ahmet Yılmaz", phone: "+905519716365" },
  { id: 2, name: "Ayşe Demir", phone: "+905519716365" },
  { id: 3, name: "Mehmet Kaya", phone: "+905519716365" },
  { id: 4, name: "Fatma Özkan", phone: "+905519716365" },
  { id: 5, name: "Ali Çelik", phone: "+905519716365" },
]

// Test sınıf verisi
const TEST_CLASSES = [
  { id: 1, name: "9-A Sınıfı" },
  { id: 2, name: "9-B Sınıfı" },
  { id: 3, name: "10-A Sınıfı" },
  { id: 4, name: "10-B Sınıfı" },
]

// Test kurum verisi
const TEST_INSTITUTIONS = [
  { id: 1, name: "Test Lisesi" },
  { id: 2, name: "Örnek Koleji" },
]

// Mock veriyi yükle
const { students, TEST_PHONE } = require("./mockData.js")

// DOM yüklendiğinde çalışacak fonksiyonlar
document.addEventListener("DOMContentLoaded", async function () {
  console.log("DOM yüklendi, uygulama başlatılıyor...")

  initializeApp()
  setupEventListeners()
  setupPuppeteerListener()
  updateSystemStatus()

  // Kaydedilmiş giriş bilgilerini kontrol et
  const savedKurumkod = localStorage.getItem("kursmax_kurumkod")
  const savedKullanici = localStorage.getItem("kursmax_kullanici")
  const savedParola = localStorage.getItem("kursmax_parola")

  if (savedKurumkod && savedKullanici && savedParola) {
    // Form alanlarını doldur
    const kurumkodElement = document.getElementById("kurumkod")
    const kullaniciElement = document.getElementById("kullanici")
    const parolaElement = document.getElementById("parola")
    const rememberMeElement = document.getElementById("rememberMe")

    if (kurumkodElement && kullaniciElement && parolaElement) {
      kurumkodElement.value = savedKurumkod
      kullaniciElement.value = savedKullanici
      parolaElement.value = savedParola
      if (rememberMeElement) {
        rememberMeElement.checked = true
      }

      // Otomatik login yap
      try {
        console.log("Kaydedilmiş bilgilerle otomatik login yapılıyor...")
        const result = await ipcRenderer.invoke("kursmax-login", {
          kurumkod: savedKurumkod,
          kullanici: savedKullanici,
          parola: savedParola,
        })

        if (result.success) {
          console.log("Otomatik login başarılı!")
          isLoggedIn = true

          // Ana uygulamayı göster
          const mainApp = document.getElementById("mainApp")
          if (mainApp) {
            mainApp.style.display = "block"
            mainApp.style.filter = "none"
            mainApp.style.pointerEvents = "auto"
          }

          // Login modalını kapat
          const loginModalElement = document.getElementById("loginModal")
          let loginModal = bootstrap.Modal.getInstance(loginModalElement)
          if (!loginModal) {
            loginModal = new bootstrap.Modal(loginModalElement)
          }
          loginModal.hide()

          // Modal backdrop'ları temizle
          document.body.classList.remove("modal-open")
          const modalBackdrops = document.querySelectorAll(".modal-backdrop")
          modalBackdrops.forEach((el) => el.parentNode.removeChild(el))

          // Login durumunu güncelle
          updateLoginStatus()
          updateSystemStatus()
        } else {
          console.log("Otomatik login başarısız, modal açık kalacak")
          showLoginModal()
        }
      } catch (error) {
        console.error("Otomatik login hatası:", error)
        showLoginModal()
      }
    } else {
      showLoginModal()
    }
  } else {
    // Kaydedilmiş bilgi yoksa login modalını göster
    showLoginModal()
  }

  // Periyodik WhatsApp durum kontrolü (5 saniyede bir)
  setInterval(() => {
    if (whatsappStatus !== "connected") {
      checkPuppeteerWhatsAppStatus()
    }
  }, 5000)

  updateSelectedRecipients()
})

// Uygulama başlatma
function initializeApp() {
  console.log("KursMax WhatsApp Mesaj Sistemi başlatılıyor...")

  // Uygulama başlarken WhatsApp durumunu backend'den kontrol et
  ipcRenderer
    .invoke("check-whatsapp-status")
    .then((result) => {
      if (result && result.status) {
        updateWhatsAppStatus(result.status)
      } else {
        updateWhatsAppStatus("disconnected")
      }
    })
    .catch(() => {
      updateWhatsAppStatus("disconnected")
    })

  // WhatsApp durumunu periyodik olarak kontrol et (5 saniyede bir)
  setInterval(async () => {
    try {
      const result = await ipcRenderer.invoke("check-whatsapp-status")
      if (result && result.status) {
        updateWhatsAppStatus(result.status)
      }
    } catch (error) {
      console.error("WhatsApp durum kontrolü hatası:", error)
    }
  }, 5000)

  // Sistem durumunu güncelle
  updateSystemStatus()
}

// Login modal'ını göster
function showLoginModal() {
  const loginModal = new bootstrap.Modal(document.getElementById("loginModal"))
  loginModal.show()

  // Modal açıldığında blur efekti ekle
  document.body.classList.add("modal-open")
  const mainApp = document.getElementById("mainApp")
  if (mainApp) {
    mainApp.style.filter = "blur(8px)"
    mainApp.style.pointerEvents = "none"
  }
}

// Event listener'ları ayarla
function setupEventListeners() {
  // Login butonu
  const loginBtn = document.getElementById("loginBtn")
  if (loginBtn) {
    loginBtn.addEventListener("click", handleLogin)
  }

  // Logout butonu
  const logoutBtn = document.getElementById("logoutBtn")
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout)
  }

  // Parola göster/gizle
  const togglePassword = document.getElementById("togglePassword")
  if (togglePassword) {
    togglePassword.addEventListener("click", togglePasswordVisibility)
  }

  // Veri getir butonu
  const getDataBtn = document.getElementById("getDataBtn")
  if (getDataBtn) {
    getDataBtn.addEventListener("click", handleGetData)
  }

  // Mesaj türü seçimi değişikliği
  const messageTypeSelect = document.getElementById("message-type-select")
  if (messageTypeSelect) {
    messageTypeSelect.addEventListener("change", handleMessageTypeChange)
  }

  // Mesaj gönderme
  const sendMessagesBtn = document.getElementById("sendMessage")
  if (sendMessagesBtn) {
    sendMessagesBtn.addEventListener("click", handleSendMessages)
  }

  // Test handler'ı çağır
  const testHandlerBtn = document.getElementById("test-handler")
  if (testHandlerBtn) {
    testHandlerBtn.addEventListener("click", handleTestHandler)
  }

  // Mesaj tipi değiştiğinde arayüzü güncelle
  const messageTypeElement = document.getElementById("messageType")
  if (messageTypeElement) {
    messageTypeElement.addEventListener("change", function () {
      const messageType = this.value
      const examInfoSection = document.getElementById("examInfoSection")
      const customMessageSection = document.getElementById(
        "customMessageSection"
      )
      const customMessageElement = document.getElementById("customMessage")

      // Sınav karnesi seçildiğinde sınav bilgilerini göster
      if (messageType === "exam_card") {
        if (examInfoSection) examInfoSection.style.display = "block"
        if (customMessageSection) customMessageSection.style.display = "none"
        if (customMessageElement) customMessageElement.disabled = true
      } else if (messageType === "custom") {
        if (examInfoSection) examInfoSection.style.display = "none"
        if (customMessageSection) customMessageSection.style.display = "block"
        if (customMessageElement) customMessageElement.disabled = false
      } else {
        if (examInfoSection) examInfoSection.style.display = "none"
        if (customMessageSection) customMessageSection.style.display = "none"
        if (customMessageElement) customMessageElement.disabled = true
      }
    })
  }

  // Özel mesaj karakter sayacı
  const customMessageElement = document.getElementById("customMessage")
  if (customMessageElement) {
    customMessageElement.addEventListener("input", function () {
      const maxLength = 500
      const currentLength = this.value.length
      const remaining = maxLength - currentLength
      const charCountElement = document.getElementById("charCount")
      if (charCountElement) {
        charCountElement.textContent = remaining
        if (remaining < 50) {
          charCountElement.style.color = "red"
        } else if (remaining < 100) {
          charCountElement.style.color = "orange"
        } else {
          charCountElement.style.color = "inherit"
        }
      }
    })
  }

  // Hazırlanan mesajları gönder
  const sendPreparedMessagesElement = document.getElementById(
    "sendPreparedMessages"
  )
  if (sendPreparedMessagesElement) {
    sendPreparedMessagesElement.addEventListener("click", async function () {
      if (!preparedMessages || preparedMessages.length === 0) {
        showError("Gönderilecek mesaj bulunamadı")
        return
      }

      try {
        showSuccess("Mesajlar gönderiliyor...")
        let successCount = 0
        let failedCount = 0
        const failedMessages = []

        for (const message of preparedMessages) {
          try {
            const result = await ipcRenderer.invoke("send-whatsapp-message", {
              phoneNumber: message.phone,
              message: message.message,
            })

            if (result.success) {
              successCount++
              console.log(`✅ ${message.name} - Mesaj gönderildi`)
            } else {
              failedCount++
              failedMessages.push({
                name: message.name,
                phone: message.phone,
                error: result.message,
              })
              console.log(
                `❌ ${message.name} - Mesaj gönderilemedi: ${result.message}`
              )
            }

            // Her mesaj arasında kısa bekleme
            await new Promise((resolve) => setTimeout(resolve, 1000))
          } catch (error) {
            failedCount++
            failedMessages.push({
              name: message.name,
              phone: message.phone,
              error: error.message,
            })
            console.log(`❌ ${message.name} - Hata: ${error.message}`)
          }
        }

        // Sonuçları göster
        if (successCount > 0) {
          showSuccess(`${successCount} mesaj başarıyla gönderildi`)
        }

        if (failedCount > 0) {
          showError(`${failedCount} mesaj gönderilemedi`)
          renderFailedMessages(failedMessages)
        }

        // Hazırlanan mesajları temizle
        preparedMessages = []
        document.getElementById("messagesRow").style.display = "none"
        document.getElementById("preparedMessagesList").innerHTML = ""
        document.getElementById("messageCount").textContent = "0"
      } catch (error) {
        showError("Mesaj gönderme sırasında hata oluştu: " + error.message)
      }
    })
  }

  // Mesajları hazırla
  const prepareMessagesElement = document.getElementById("prepareMessages")
  if (prepareMessagesElement) {
    prepareMessagesElement.addEventListener("click", async function () {
      // Eğer mesajlar zaten hazırlanmışsa, silme işlemi yap
      if (isMessagesPrepared) {
        clearPreparedMessages()
        return
      }

      try {
        const messageTypeElement = document.getElementById("messageType")
        // Checkbox ile birden fazla hedef kitle seçimi
        const targetAudienceElements = document.querySelectorAll(
          'input[name="targetAudience"]:checked'
        )
        const targetAudiences = Array.from(targetAudienceElements).map(
          (el) => el.value
        )

        if (!messageTypeElement || targetAudiences.length === 0) {
          showError("Mesaj tipi veya hedef kitle seçilmemiş")
          return
        }

        const messageType = messageTypeElement.value

        // Seçili öğrencileri al
        const selectedStudents = getSelectedStudents()

        if (selectedStudents.length === 0) {
          showError("Lütfen en az bir öğrenci seçin")
          return
        }

        // Mesaj tipine göre ek bilgileri al
        let examInfo = {}
        let customMessage = ""

        if (messageType === "exam_card") {
          const examNameElement = document.getElementById("examName")
          const examNoElement = document.getElementById("examNo")
          const examTypeElement = document.getElementById("examType")

          if (!examNameElement || !examNoElement) {
            showError("Sınav bilgileri eksik")
            return
          }

          const examName = examNameElement.value
          const examNo = examNoElement.value
          const examType = examTypeElement ? examTypeElement.value : "TYT"

          if (!examName || !examNo) {
            showError("Sınav adı ve numarası gereklidir")
            return
          }

          examInfo = {
            examName: examName,
            examNo: examNo,
            type: examType,
          }
        } else if (messageType === "custom") {
          const customMessageElement = document.getElementById("customMessage")
          if (!customMessageElement) {
            showError("Özel mesaj alanı bulunamadı")
            return
          }

          customMessage = customMessageElement.value

          if (!customMessage.trim()) {
            showError("Özel mesaj gereklidir")
            return
          }
        }

        // Backend'e mesaj hazırlama isteği gönder
        const result = await ipcRenderer.invoke("create-auto-messages", {
          messageType: messageType,
          targetAudience: targetAudiences, // Dizi olarak gönder
          students: selectedStudents,
          customMessage: customMessage,
          examInfo: examInfo,
        })

        if (result.success) {
          preparedMessages = result.messages
          currentStudents = selectedStudents
          isMessagesPrepared = true // Mesajların hazırlandığını işaretle

          // Buton metnini değiştir
          updatePrepareButtonText()

          // Paneli göstermek için
          document.getElementById("messagesRow").style.display = "block"
          displayPreparedMessages()
          showSuccess(`${result.count} adet mesaj hazırlandı`)
        } else {
          showError("Mesaj hazırlama hatası: " + result.message)
        }
      } catch (error) {
        showError("Mesaj hazırlama sırasında hata oluştu: " + error.message)
      }
    })
  }

  // Hazırlanan mesajları göster
  function displayPreparedMessages() {
    const messagesListElement = document.getElementById("preparedMessagesList")
    const messageCountElement = document.getElementById("messageCount")
    const messagesRowElement = document.getElementById("messagesRow")

    if (!messagesListElement || !messageCountElement || !messagesRowElement) {
      console.error("Mesaj gösterme elementleri bulunamadı")
      return
    }

    if (!preparedMessages || preparedMessages.length === 0) {
      messagesRowElement.style.display = "none"
      return
    }

    // Mesaj listesini oluştur
    let html = ""
    preparedMessages.forEach((message) => {
      const shortMessage =
        message.message.length > 50
          ? message.message.substring(0, 50) + "..."
          : message.message

      html += `
        <tr>
          <td>${message.recipientName || message.name}</td>
          <td>${message.phone}</td>
          <td title="${message.message}">${shortMessage}</td>
        </tr>
      `
    })

    messagesListElement.innerHTML = html
    messageCountElement.textContent = preparedMessages.length

    // Paneli göster
    messagesRowElement.style.display = "block"
  }

  // Hazırlanan mesajları sil
  function clearPreparedMessages() {
    preparedMessages = []
    currentStudents = []
    isMessagesPrepared = false

    // Buton metnini güncelle
    updatePrepareButtonText()

    // Paneli gizle
    const messagesRowElement = document.getElementById("messagesRow")
    if (messagesRowElement) {
      messagesRowElement.style.display = "none"
    }

    // Mesaj listesini temizle
    const messagesListElement = document.getElementById("preparedMessagesList")
    if (messagesListElement) {
      messagesListElement.innerHTML = ""
    }

    // Mesaj sayısını sıfırla
    const messageCountElement = document.getElementById("messageCount")
    if (messageCountElement) {
      messageCountElement.textContent = "0"
    }

    showSuccess("Hazırlanan mesajlar silindi")
  }

  // Hazırla butonunun metnini güncelle
  function updatePrepareButtonText() {
    const prepareMessagesElement = document.getElementById("prepareMessages")
    if (prepareMessagesElement) {
      if (isMessagesPrepared) {
        prepareMessagesElement.innerHTML =
          '<i class="fas fa-trash"></i> Hazırlanan Mesajları Sil'
        prepareMessagesElement.className = "btn btn-danger"
      } else {
        prepareMessagesElement.innerHTML =
          '<i class="fas fa-cogs"></i> Mesajları Hazırla'
        prepareMessagesElement.className = "btn btn-primary"
      }
    }
  }

  const refreshWhatsAppBtn = document.getElementById("refresh-whatsapp")
  if (refreshWhatsAppBtn) {
    refreshWhatsAppBtn.addEventListener("click", handleRefreshWhatsApp)
  }

  // Debug butonları
  const checkWhatsAppBtn = document.getElementById("check-whatsapp")
  if (checkWhatsAppBtn) {
    checkWhatsAppBtn.addEventListener("click", handleCheckWhatsApp)
  }

  // Modal blur efekti
  const loginModal = document.getElementById("loginModal")
  if (loginModal) {
    loginModal.addEventListener("show.bs.modal", function () {
      document.body.classList.add("modal-open")
    })

    loginModal.addEventListener("hidden.bs.modal", function () {
      document.body.classList.remove("modal-open")
    })
  }
}

// Login işlemi
async function handleLogin() {
  try {
    const kurumkodElement = document.getElementById("kurumkod")
    const kullaniciElement = document.getElementById("kullanici")
    const parolaElement = document.getElementById("parola")
    const rememberMeElement = document.getElementById("rememberMe")

    if (!kurumkodElement || !kullaniciElement || !parolaElement) {
      showError("Form elemanları bulunamadı")
      return
    }

    const kurumkod = kurumkodElement.value.trim()
    const kullanici = kullaniciElement.value.trim()
    const parola = parolaElement.value.trim()
    const rememberMe = rememberMeElement ? rememberMeElement.checked : false

    if (!kurumkod || !kullanici || !parola) {
      showError("Lütfen tüm alanları doldurun")
      return
    }

    // Login butonunu devre dışı bırak
    const loginBtn = document.getElementById("loginBtn")
    if (loginBtn) {
      loginBtn.disabled = true
      loginBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Giriş Yapılıyor...'
    }

    // Backend'e login isteği gönder
    const result = await ipcRenderer.invoke("kursmax-login", {
      kurumkod: kurumkod,
      kullanici: kullanici,
      parola: parola,
    })

    if (result.success) {
      // Giriş bilgilerini hatırla
      if (rememberMe) {
        localStorage.setItem("kursmax_kurumkod", kurumkod)
        localStorage.setItem("kursmax_kullanici", kullanici)
        localStorage.setItem("kursmax_parola", parola)
      } else {
        localStorage.removeItem("kursmax_kurumkod")
        localStorage.removeItem("kursmax_kullanici")
        localStorage.removeItem("kursmax_parola")
      }

      isLoggedIn = true
      showSuccess("Giriş başarılı!")

      // Ana uygulamayı göster
      const mainApp = document.getElementById("mainApp")
      if (mainApp) {
        mainApp.style.display = "block"
        // Blur efektini kaldır
        mainApp.style.filter = "none"
        mainApp.style.pointerEvents = "auto"
      }

      // Login modalını kapat
      const loginModalElement = document.getElementById("loginModal")
      let loginModal = bootstrap.Modal.getInstance(loginModalElement)
      if (!loginModal) {
        loginModal = new bootstrap.Modal(loginModalElement)
      }
      loginModal.hide()

      // Modal backdrop'ları temizle
      document.body.classList.remove("modal-open")
      const modalBackdrops = document.querySelectorAll(".modal-backdrop")
      modalBackdrops.forEach((el) => el.parentNode.removeChild(el))

      // Login durumunu güncelle
      updateLoginStatus()

      // Sistem durumunu güncelle
      updateSystemStatus()
    } else {
      showError("Giriş başarısız: " + result.message)
    }
  } catch (error) {
    console.error("Login hatası:", error)
    showError("Giriş sırasında hata oluştu: " + error.message)
  } finally {
    // Login butonunu tekrar aktif et
    const loginBtn = document.getElementById("loginBtn")
    if (loginBtn) {
      loginBtn.disabled = false
      loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Giriş Yap'
    }
  }
}

// Logout işlemi
function handleLogout() {
  isLoggedIn = false
  currentData = []

  // Ana uygulamayı gizle
  document.getElementById("mainApp").style.display = "none"

  // Login modal'ını göster
  showLoginModal()

  // Form alanlarını temizle
  document.getElementById("kurumkod").value = ""
  document.getElementById("kullanici").value = ""
  document.getElementById("parola").value = ""

  // Kaydedilmiş bilgileri temizle
  localStorage.removeItem("kursmax_kurumkod")
  localStorage.removeItem("kursmax_kullanici")
  localStorage.removeItem("kursmax_parola")

  updateLoginStatus()
}

// Login durumunu kontrol et
async function checkLoginStatus() {
  try {
    const status = await ipcRenderer.invoke("check-login-status")
    if (status.isLoggedIn) {
      isLoggedIn = true
      document.getElementById("mainApp").style.display = "block"
      updateLoginStatus()

      // Kaydedilmiş bilgileri yükle
      const savedKurumkod = localStorage.getItem("kursmax_kurumkod")
      const savedKullanici = localStorage.getItem("kursmax_kullanici")
      const savedParola = localStorage.getItem("kursmax_parola")

      if (savedKurumkod && savedKullanici && savedParola) {
        document.getElementById("kurumkod").value = savedKurumkod
        document.getElementById("kullanici").value = savedKullanici
        document.getElementById("parola").value = savedParola
        document.getElementById("rememberMe").checked = true
      }
    }
  } catch (error) {
    console.error("Login durumu kontrol hatası:", error)
  }
}

// Login durumunu güncelle
function updateLoginStatus() {
  const loginStatus = document.getElementById("loginStatus")
  const kursmaxStatus = document.getElementById("kursmax-status")

  if (isLoggedIn) {
    loginStatus.textContent = "Giriş Yapıldı"
    loginStatus.className = "badge bg-success"
    kursmaxStatus.textContent = "Bağlı"
    kursmaxStatus.className = "badge bg-success"
  } else {
    loginStatus.textContent = "Giriş Yapılmadı"
    loginStatus.className = "badge bg-warning"
    kursmaxStatus.textContent = "Bağlanıyor"
    kursmaxStatus.className = "badge bg-warning"
  }
}

// Parola göster/gizle
function togglePasswordVisibility() {
  const parolaInput = document.getElementById("parola")
  const toggleBtn = document.getElementById("togglePassword")
  const icon = toggleBtn.querySelector("i")

  if (parolaInput.type === "password") {
    parolaInput.type = "text"
    icon.className = "fas fa-eye-slash"
  } else {
    parolaInput.type = "password"
    icon.className = "fas fa-eye"
  }
}

// Veri getirme işlemi
async function handleGetData() {
  if (!isLoggedIn) {
    showError("Önce giriş yapmalısınız!")
    return
  }

  // Element kontrolü ekle
  const messageTypeSelect = document.getElementById("message-type-select")
  const tarihInput = document.getElementById("tarih-input")

  if (!messageTypeSelect) {
    showError("Mesaj türü seçimi bulunamadı!")
    return
  }

  try {
    let result = null
    const messageType = messageTypeSelect.value

    switch (messageType) {
      case "ogrenci":
        result = await ipcRenderer.invoke("get-ogrenci-list")
        break
      case "devam":
        result = await ipcRenderer.invoke("get-devam-list")
        break
      case "vade":
        result = await ipcRenderer.invoke("get-vade-list")
        break
      case "sinav":
        result = await ipcRenderer.invoke("get-sinav-list")
        break
      case "odeme":
        const tarih =
          tarihInput && tarihInput.value
            ? tarihInput.value
            : new Date().toISOString().split("T")[0]
        result = await ipcRenderer.invoke("get-odeme-list", tarih)
        break
      case "onkayit":
        result = await ipcRenderer.invoke("get-onkayit-list")
        break
      case "arsiv":
        result = await ipcRenderer.invoke("get-arsiv-list")
        break
      default:
        result = await ipcRenderer.invoke("get-ogrenci-list")
    }

    if (result.success) {
      // Veriyi işle ve tabloyu güncelle
      processData(result, messageType)
      showSuccess(
        `${
          result.students
            ? result.students.length
            : result.devamList
            ? result.devamList.length
            : result.vadeList
            ? result.vadeList.length
            : result.sinavList
            ? result.sinavList.length
            : result.odemeList
            ? result.odemeList.length
            : result.onkayitList
            ? result.onkayitList.length
            : result.arsivList
            ? result.arsivList.length
            : 0
        } kayıt getirildi`
      )
    } else {
      showError(result.message)
    }
  } catch (error) {
    console.error("Veri getirme hatası detayı:", error)
    showError("Veri getirme hatası: " + error.message)
  }
}

// Veriyi işle ve tabloyu güncelle
function processData(result, messageType) {
  let data = []
  let columns = []

  switch (messageType) {
    case "ogrenci":
      data = result.students || []
      columns = [
        { key: "numara", title: "Numara" },
        { key: "sinif", title: "Sınıf" },
        { key: "ad", title: "Ad" },
        { key: "soyad", title: "Soyad" },
        { key: "ceptel", title: "Öğrenci Cep" },
        { key: "annecep", title: "Anne Cep" },
        { key: "babacep", title: "Baba Cep" },
        { key: "seviye", title: "Seviye" },
        { key: "parola", title: "Parola" },
      ]
      break
    case "devam":
      data = result.devamList || []
      columns = [
        { key: "numara", title: "Numara" },
        { key: "ad", title: "Ad" },
        { key: "soyad", title: "Soyad" },
        { key: "ders", title: "Ders" },
        { key: "ceptel", title: "Öğrenci Cep" },
        { key: "annecep", title: "Anne Cep" },
      ]
      break
    case "vade":
      data = result.vadeList || []
      columns = [
        { key: "ad", title: "Ad" },
        { key: "borc", title: "Borç" },
        { key: "gecikme", title: "Gecikme" },
        { key: "annecep", title: "Anne Cep Tel." },
        { key: "babacep", title: "Baba Cep Tel." },
      ]
      break
    case "sinav":
      data = result.sinavList || []
      columns = [
        { key: "sinavno", title: "Sınav No" },
        { key: "tur", title: "Tür" },
        { key: "seviye", title: "Seviye" },
        { key: "sinavad", title: "Sınav Adı" },
        { key: "tarih", title: "Tarih" },
        { key: "ceptel", title: "Öğrenci Cep" },
        { key: "annecep", title: "Anne Cep" },
        { key: "parola", title: "Parola" },
      ]
      break
    case "odeme":
      data = result.odemeList || []
      columns = [
        { key: "ad", title: "Ad" },
        { key: "tahsilat", title: "Tahsilat" },
        { key: "kalanvade", title: "Kalan Vade" },
        { key: "kalanborc", title: "Kalan Borç" },
        { key: "sonrakiodeme", title: "Sonraki Ödeme" },
        { key: "annecep", title: "Anne Cep" },
        { key: "babacep", title: "Baba Cep" },
      ]
      break
    case "onkayit":
      data = result.onkayitList || []
      columns = [
        { key: "numara", title: "Numara" },
        { key: "ad", title: "Ad" },
        { key: "soyad", title: "Soyad" },
        { key: "ceptel", title: "Öğrenci Cep" },
        { key: "annecep", title: "Anne Cep" },
        { key: "babacep", title: "Baba Cep" },
        { key: "seviye", title: "Seviye" },
      ]
      break
    case "arsiv":
      data = result.arsivList || []
      columns = [
        { key: "numara", title: "Numara" },
        { key: "ad", title: "Ad" },
        { key: "soyad", title: "Soyad" },
        { key: "ceptel", title: "Öğrenci Cep" },
        { key: "annecep", title: "Anne Cep" },
        { key: "babacep", title: "Baba Cep" },
        { key: "seviye", title: "Seviye" },
        { key: "tarih", title: "Tarih" },
      ]
      break
  }

  currentData = data
  renderDataTable(data, columns)
  updateSelectedStudents()
}

// Veri tablosunu oluştur
function renderDataTable(data, columns) {
  const container = document.getElementById("student-table-container")

  if (data.length === 0) {
    container.innerHTML = '<div class="alert alert-info">Veri bulunamadı</div>'
    return
  }

  let html = `
    <div class="table-responsive">
      <table id="studentsTable" class="table table-sm table-striped table-hover">
        <thead class="table-dark">
          <tr>
            <th><input type="checkbox" id="selectAll"></th>
  `

  columns.forEach((col) => {
    html += `<th>${col.title}</th>`
  })

  html += `
          </tr>
        </thead>
        <tbody>
  `

  data.forEach((item, index) => {
    html += `<tr data-index="${index}">`
    html += `<td><input type="checkbox" class="row-checkbox"></td>`

    columns.forEach((col) => {
      html += `<td>${item[col.key] || ""}</td>`
    })

    html += `</tr>`
  })

  html += `
        </tbody>
      </table>
    </div>
  `

  container.innerHTML = html

  // Event listener'ları ekle
  setupTableEventListeners()
}

// Tablo event listener'larını ayarla
function setupTableEventListeners() {
  try {
    // Tümünü seç checkbox'ı
    const selectAll = document.getElementById("selectAll")
    if (selectAll) {
      selectAll.addEventListener("change", function () {
        const checkboxes = document.querySelectorAll(".row-checkbox")
        checkboxes.forEach((checkbox) => {
          checkbox.checked = this.checked
        })
        updateSelectedStudents()
      })
    }

    // Satır checkbox'ları
    const rowCheckboxes = document.querySelectorAll(".row-checkbox")
    rowCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", updateSelectedStudents)
    })
  } catch (error) {
    console.error("setupTableEventListeners hatası:", error)
  }
}

// Seçili öğrencileri güncelle
function updateSelectedStudents() {
  try {
    const checkboxes = document.querySelectorAll(".row-checkbox:checked")
    selectedStudents = []

    checkboxes.forEach((checkbox) => {
      const row = checkbox.closest("tr")
      if (!row) return

      const index = parseInt(row.dataset.index)
      if (!isNaN(index) && currentData[index]) {
        selectedStudents.push(currentData[index])
      }
    })

    updateSendButtonState()
  } catch (error) {
    console.error("updateSelectedStudents hatası:", error)
    selectedStudents = []
  }
}

// Mesaj türü değişikliği
function handleMessageTypeChange(event) {
  const messageType = event.target.value
  const tarihInput = document.getElementById("tarih-input")

  // Tarih input kontrolü
  if (!tarihInput) {
    console.warn("Tarih input elementi bulunamadı")
    return
  }

  // Tahsilat listesi için tarih alanını göster/gizle
  if (messageType === "odeme") {
    tarihInput.style.display = "block"
    tarihInput.value = new Date().toISOString().split("T")[0]
  } else {
    tarihInput.style.display = "none"
  }
}

// Mesaj gönderme işlemi
async function handleSendMessages() {
  try {
    if (!preparedMessages || preparedMessages.length === 0) {
      showError("Gönderilecek mesaj bulunamadı")
      return
    }

    // Gönder butonunu devre dışı bırak
    const sendButton = document.getElementById("sendPreparedMessages")
    if (sendButton) {
      sendButton.disabled = true
      sendButton.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Gönderiliyor...'
    }

    const failedMessages = []
    let successCount = 0

    // Her mesajı sırayla gönder
    for (let i = 0; i < preparedMessages.length; i++) {
      const message = preparedMessages[i]

      try {
        console.log(`Mesaj gönderiliyor: ${i + 1}/${preparedMessages.length}`)

        const result = await ipcRenderer.invoke("send-whatsapp-message", {
          phoneNumber: message.phone,
          message: message.message,
        })

        if (result.success) {
          successCount++
          console.log(`✅ Mesaj gönderildi: ${message.phone}`)
        } else {
          failedMessages.push({
            phone: message.phone,
            name: message.recipientName || message.name,
            error: result.message,
          })
          console.log(
            `❌ Mesaj gönderilemedi: ${message.phone} - ${result.message}`
          )
        }

        // Mesajlar arası kısa bekleme (WhatsApp'ın robot algılamasını önlemek için)
        if (i < preparedMessages.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000))
        }
      } catch (error) {
        failedMessages.push({
          phone: message.phone,
          name: message.recipientName || message.name,
          error: error.message,
        })
        console.error(
          `❌ Mesaj gönderme hatası: ${message.phone} - ${error.message}`
        )
      }
    }

    // Gönder butonunu tekrar aktif et
    if (sendButton) {
      sendButton.disabled = false
      sendButton.innerHTML = '<i class="fas fa-paper-plane"></i> Tümünü Gönder'
    }

    // Sonuçları göster
    if (successCount > 0) {
      showSuccess(`${successCount} mesaj başarıyla gönderildi`)
    }

    if (failedMessages.length > 0) {
      renderFailedMessages(failedMessages)
      showError(`${failedMessages.length} mesaj gönderilemedi`)
    }

    // Mesajlar gönderildikten sonra hazırlanan mesajları temizle
    if (successCount > 0) {
      clearPreparedMessages()
    }
  } catch (error) {
    console.error("Mesaj gönderme hatası:", error)
    showError("Mesaj gönderme sırasında hata oluştu: " + error.message)

    // Hata durumunda da gönder butonunu tekrar aktif et
    const sendButton = document.getElementById("sendPreparedMessages")
    if (sendButton) {
      sendButton.disabled = false
      sendButton.innerHTML = '<i class="fas fa-paper-plane"></i> Tümünü Gönder'
    }
  }
}

// Gönderilemeyen mesajları göster
function renderFailedMessages(failedList) {
  const container = document.getElementById("failed-messages-list")

  // Container kontrolü
  if (!container) {
    console.warn("failed-messages-list container bulunamadı")
    return
  }

  if (!failedList || failedList.length === 0) {
    container.innerHTML =
      '<li class="list-group-item text-success">Tüm mesajlar başarıyla gönderildi</li>'
    return
  }

  let html = ""
  failedList.forEach((item) => {
    const name = item.name || "Bilinmeyen"
    const phone = item.phone || "Telefon yok"
    html += `<li class="list-group-item text-danger">${name} (${phone})</li>`
  })

  container.innerHTML = html
}

// Gönder butonunun durumunu güncelle
function updateSendButtonState() {
  const sendBtn = document.getElementById("sendPreparedMessages")
  const messageTypeElement = document.getElementById("messageType")
  const customMessageElement = document.getElementById("customMessage")

  // Element kontrolü
  if (!sendBtn) return

  let messageText = ""
  if (
    messageTypeElement &&
    messageTypeElement.value === "custom" &&
    customMessageElement
  ) {
    messageText = customMessageElement.value.trim()
  }

  const hasSelection = selectedStudents.length > 0
  const hasMessage = messageText.length > 0
  const hasPreparedMessages = preparedMessages.length > 0

  // Güvenli alıcı kontrolü - targetAudience radio button'larını kullan
  const targetAudienceElement = document.querySelector(
    'input[name="targetAudience"]:checked'
  )
  const hasRecipient = targetAudienceElement !== null

  // Eğer hazırlanmış mesajlar varsa, onları göster
  if (hasPreparedMessages) {
    sendBtn.disabled = !(hasPreparedMessages && whatsappStatus === "connected")
  } else {
    // Eğer hazırlanmış mesaj yoksa, mesaj hazırlama koşullarını kontrol et
    sendBtn.disabled = !(
      hasSelection &&
      hasMessage &&
      hasRecipient &&
      whatsappStatus === "connected"
    )
  }
}

// Puppeteer durum dinleyicisi
function setupPuppeteerListener() {
  ipcRenderer.on("whatsapp-status-update", (event, data) => {
    updateWhatsAppStatus(data.status)
    updateSystemStatus()

    // WhatsApp numarasını güncelle
    if (data.number !== undefined) {
      updateWhatsAppNumber(data.number)
    }

    // Eğer mesaj varsa göster
    if (data.message) {
      if (data.status === "disconnected") {
        showError(data.message)
      } else {
        showSuccess(data.message)
      }
    }
  })
}

// Sistem durumunu güncelle
function updateSystemStatus() {
  const lastUpdateElement = document.getElementById("last-update")
  const whatsappStatusSmall = document.getElementById("whatsapp-status-small")

  if (lastUpdateElement) {
    const now = new Date().toLocaleTimeString("tr-TR")
    lastUpdateElement.textContent = now
  }

  // WhatsApp durumu
  if (whatsappStatusSmall) {
    whatsappStatusSmall.textContent =
      whatsappStatus === "connected" ? "Bağlı" : "Bağlanıyor"
    whatsappStatusSmall.className =
      whatsappStatus === "connected" ? "badge bg-success" : "badge bg-warning"
  }
}

// WhatsApp durumunu güncelle
function updateWhatsAppStatus(status) {
  whatsappStatus = status
  updateSystemStatus()
  updateSendButtonState()
}

// WhatsApp numarasını güncelle
function updateWhatsAppNumber(number) {
  const numberElement = document.getElementById("whatsapp-number")
  if (numberElement) {
    if (number) {
      numberElement.textContent = number
      numberElement.className = "text-success small"
    } else {
      numberElement.textContent = "Bağlanıyor..."
      numberElement.className = "text-muted small"
    }
  }
}

// Başarı mesajı göster
function showSuccess(message) {
  // Basit alert yerine daha güzel bir bildirim sistemi kullanılabilir
  alert("✅ " + message)
}

// Hata mesajı göster
function showError(message) {
  // Basit alert yerine daha güzel bir bildirim sistemi kullanılabilir
  alert("❌ " + message)
}

// WhatsApp durum kontrolü
async function handleCheckWhatsApp() {
  try {
    const result = await ipcRenderer.invoke("check-whatsapp-status")
    if (result.success) {
      showSuccess("WhatsApp durumu: " + result.status)
    } else {
      showError(result.message)
    }
  } catch (error) {
    showError("WhatsApp durum kontrolü hatası: " + error.message)
  }
}

// WhatsApp sayfasını yenile
async function handleRefreshWhatsApp() {
  try {
    const result = await ipcRenderer.invoke("refresh-whatsapp")
    if (result.success) {
      showSuccess("WhatsApp sayfası yenilendi")
    } else {
      showError(result.message)
    }
  } catch (error) {
    showError("WhatsApp yenileme hatası: " + error.message)
  }
}

// Puppeteer WhatsApp durumunu kontrol et
async function checkPuppeteerWhatsAppStatus() {
  try {
    const result = await ipcRenderer.invoke("check-whatsapp-status")
    if (result.success) {
      updateWhatsAppStatus(result.status)
    }
  } catch (error) {
    console.error("WhatsApp durum kontrolü hatası:", error)
  }
}

// Seçili öğrencileri al
function getSelectedStudents() {
  const selectedStudents = []

  try {
    const checkboxes = document.querySelectorAll(
      '#studentsTable tbody input[type="checkbox"]:checked'
    )

    checkboxes.forEach((checkbox) => {
      const row = checkbox.closest("tr")
      if (!row) return

      const index = parseInt(row.dataset.index)
      if (!isNaN(index) && currentData[index]) {
        // Tüm tablo tipleri için columns sırasına göre veri çek
        selectedStudents.push(currentData[index])
      }
    })
  } catch (error) {
    console.error("getSelectedStudents hatası:", error)
  }

  return selectedStudents
}

// Öğrenci seçimi değiştiğinde buton durumunu güncelle
document.addEventListener("change", function (e) {
  try {
    if (e.target.type === "checkbox" && e.target.closest("#studentsTable")) {
      updateSelectedStudents()
      updateSendButtonState()
    }

    if (e.target.name === "targetAudience") {
      updateSendButtonState()
    }
  } catch (error) {
    console.error("Change event listener hatası:", error)
  }
})
