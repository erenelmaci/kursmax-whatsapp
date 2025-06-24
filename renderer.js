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
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM yüklendi, uygulama başlatılıyor...")

  initializeApp()
  setupEventListeners()
  setupPuppeteerListener()
  updateSystemStatus()

  // Login durumunu kontrol et
  checkLoginStatus()

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

  // Login modal'ını göster
  showLoginModal()
}

// Login modal'ını göster
function showLoginModal() {
  const loginModal = new bootstrap.Modal(document.getElementById("loginModal"))
  loginModal.show()
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
  const sendMessagesBtn = document.getElementById("send-messages")
  if (sendMessagesBtn) {
    sendMessagesBtn.addEventListener("click", handleSendMessages)
  }

  // Debug butonları
  const checkWhatsAppBtn = document.getElementById("check-whatsapp")
  if (checkWhatsAppBtn) {
    checkWhatsAppBtn.addEventListener("click", handleCheckWhatsApp)
  }

  const refreshWhatsAppBtn = document.getElementById("refresh-whatsapp")
  if (refreshWhatsAppBtn) {
    refreshWhatsAppBtn.addEventListener("click", handleRefreshWhatsApp)
  }

  const restartWhatsAppBtn = document.getElementById("restart-whatsapp")
  if (restartWhatsAppBtn) {
    restartWhatsAppBtn.addEventListener("click", handleRestartWhatsApp)
  }

  // Test handler'ı çağır
  const testHandlerBtn = document.getElementById("test-handler")
  if (testHandlerBtn) {
    testHandlerBtn.addEventListener("click", handleTestHandler)
  }

  // Mesaj tipi değiştiğinde arayüzü güncelle
  document
    .getElementById("messageType")
    .addEventListener("change", function () {
      const messageType = this.value
      const examInfoSection = document.getElementById("examInfoSection")
      const customMessageSection = document.getElementById(
        "customMessageSection"
      )

      // Sınav karnesi seçildiğinde sınav bilgilerini göster
      if (messageType === "exam_card") {
        examInfoSection.style.display = "block"
        customMessageSection.style.display = "none"
      } else if (messageType === "custom") {
        examInfoSection.style.display = "none"
        customMessageSection.style.display = "block"
      } else {
        examInfoSection.style.display = "none"
        customMessageSection.style.display = "none"
      }
    })

  // Özel mesaj karakter sayısı kontrolü
  document
    .getElementById("customMessage")
    .addEventListener("input", function () {
      const maxLength = 500
      const currentLength = this.value.length
      const remaining = maxLength - currentLength

      document.getElementById("charCount").textContent = remaining

      if (remaining < 0) {
        document.getElementById("charCount").style.color = "red"
      } else {
        document.getElementById("charCount").style.color = "inherit"
      }
    })

  // Mesajları hazırla butonu
  document
    .getElementById("prepareMessages")
    .addEventListener("click", async function () {
      try {
        const messageType = document.getElementById("messageType").value
        const targetAudience = document.querySelector(
          'input[name="targetAudience"]:checked'
        ).value

        // Seçili öğrencileri al
        const selectedStudents = getSelectedStudents()

        if (selectedStudents.length === 0) {
          showAlert("Lütfen en az bir öğrenci seçin", "warning")
          return
        }

        // Mesaj tipine göre ek bilgileri al
        let examInfo = {}
        let customMessage = ""

        if (messageType === "exam_card") {
          const examName = document.getElementById("examName").value
          const examNo = document.getElementById("examNo").value
          const examType = document.getElementById("examType").value

          if (!examName || !examNo) {
            showAlert("Sınav adı ve numarası gereklidir", "warning")
            return
          }

          examInfo = {
            examName: examName,
            examNo: examNo,
            type: examType,
          }
        } else if (messageType === "custom") {
          customMessage = document.getElementById("customMessage").value

          if (!customMessage.trim()) {
            showAlert("Özel mesaj gereklidir", "warning")
            return
          }
        }

        // Backend'e mesaj hazırlama isteği gönder
        const result = await window.electronAPI.createAutoMessages({
          messageType: messageType,
          targetAudience: targetAudience,
          students: selectedStudents,
          customMessage: customMessage,
          examInfo: examInfo,
        })

        if (result.success) {
          preparedMessages = result.messages
          currentStudents = selectedStudents
          displayPreparedMessages()
          showAlert(`${result.count} adet mesaj hazırlandı`, "success")
        } else {
          showAlert("Mesaj hazırlama hatası: " + result.message, "error")
        }
      } catch (error) {
        console.error("Mesaj hazırlama hatası:", error)
        showAlert("Mesaj hazırlama sırasında hata oluştu", "error")
      }
    })

  // Hazırlanan mesajları göster
  function displayPreparedMessages() {
    const section = document.getElementById("preparedMessagesSection")
    const list = document.getElementById("preparedMessagesList")
    const count = document.getElementById("messageCount")

    if (preparedMessages.length === 0) {
      section.style.display = "none"
      return
    }

    // Mesaj listesini temizle
    list.innerHTML = ""

    // Her mesaj için tablo satırı oluştur
    preparedMessages.forEach((msg, index) => {
      const row = document.createElement("tr")
      row.innerHTML = `
        <td>${msg.recipientName}</td>
        <td>${msg.phone}</td>
        <td>
          <small class="text-muted">
            ${
              msg.message.length > 100
                ? msg.message.substring(0, 100) + "..."
                : msg.message
            }
          </small>
        </td>
      `
      list.appendChild(row)
    })

    count.textContent = preparedMessages.length
    section.style.display = "block"
  }

  // Hazırlanan mesajları gönder
  document
    .getElementById("sendPreparedMessages")
    .addEventListener("click", async function () {
      try {
        if (preparedMessages.length === 0) {
          showAlert("Gönderilecek mesaj yok", "warning")
          return
        }

        // WhatsApp bağlantısını kontrol et
        const statusResult = await window.electronAPI.checkWhatsAppStatus()
        if (statusResult.status !== "connected") {
          showAlert(
            "WhatsApp bağlantısı yok. Lütfen önce WhatsApp'a bağlanın.",
            "warning"
          )
          return
        }

        // Onay al
        const confirmed = confirm(
          `${preparedMessages.length} adet mesaj gönderilecek. Onaylıyor musunuz?`
        )
        if (!confirmed) return

        // Butonu devre dışı bırak
        this.disabled = true
        this.innerHTML =
          '<i class="fas fa-spinner fa-spin"></i> Gönderiliyor...'

        // Mesajları gönder
        const result = await window.electronAPI.sendMessages({
          recipients: preparedMessages,
          message: "", // Mesajlar zaten hazırlanmış durumda
        })

        if (result.success) {
          showAlert(
            `✅ ${result.sentCount}/${result.totalCount} mesaj başarıyla gönderildi`,
            "success"
          )

          // Başarısız mesajları göster
          if (result.failed.length > 0) {
            let failedMessage = "Başarısız mesajlar:\n"
            result.failed.forEach((fail) => {
              failedMessage += `- ${fail.name}: ${fail.error}\n`
            })
            alert(failedMessage)
          }

          // Mesaj listesini temizle
          preparedMessages = []
          displayPreparedMessages()
        } else {
          showAlert("Mesaj gönderme hatası: " + result.message, "error")
        }
      } catch (error) {
        console.error("Mesaj gönderme hatası:", error)
        showAlert("Mesaj gönderme sırasında hata oluştu", "error")
      } finally {
        // Butonu tekrar aktif et
        const button = document.getElementById("sendPreparedMessages")
        button.disabled = false
        button.innerHTML = '<i class="fas fa-paper-plane"></i> Tümünü Gönder'
      }
    })

  // Manuel mesaj gönderme (mevcut sistem)
  document
    .getElementById("sendMessage")
    .addEventListener("click", async function () {
      try {
        const message = document.getElementById("messageInput").value.trim()
        const selectedStudents = getSelectedStudents()

        if (!message) {
          showAlert("Lütfen bir mesaj yazın", "warning")
          return
        }

        if (selectedStudents.length === 0) {
          showAlert("Lütfen en az bir öğrenci seçin", "warning")
          return
        }

        // WhatsApp bağlantısını kontrol et
        const statusResult = await window.electronAPI.checkWhatsAppStatus()
        if (statusResult.status !== "connected") {
          showAlert(
            "WhatsApp bağlantısı yok. Lütfen önce WhatsApp'a bağlanın.",
            "warning"
          )
          return
        }

        // Alıcıları hazırla
        const recipients = []
        selectedStudents.forEach((student) => {
          // Seçili hedef kitleye göre telefon numarası seç
          const targetAudience = document.querySelector(
            'input[name="targetAudience"]:checked'
          ).value
          let phone = ""

          switch (targetAudience) {
            case "student":
              phone = student.ceptel || ""
              break
            case "mother":
              phone = student.annecep || ""
              break
            case "father":
              phone = student.babacep || ""
              break
          }

          if (phone && phone.trim().length === 10) {
            recipients.push({
              name: `${student.ad} ${student.soyad}`,
              phone: phone,
            })
          }
        })

        if (recipients.length === 0) {
          showAlert("Geçerli telefon numarası bulunamadı", "warning")
          return
        }

        // Onay al
        const confirmed = confirm(
          `${recipients.length} kişiye mesaj gönderilecek. Onaylıyor musunuz?`
        )
        if (!confirmed) return

        // Butonu devre dışı bırak
        this.disabled = true
        this.innerHTML =
          '<i class="fas fa-spinner fa-spin"></i> Gönderiliyor...'

        // Mesajı gönder
        const result = await window.electronAPI.sendMessages({
          recipients: recipients,
          message: message,
        })

        if (result.success) {
          showAlert(
            `✅ ${result.sentCount}/${result.totalCount} mesaj başarıyla gönderildi`,
            "success"
          )
          document.getElementById("messageInput").value = ""
        } else {
          showAlert("Mesaj gönderme hatası: " + result.message, "error")
        }
      } catch (error) {
        console.error("Mesaj gönderme hatası:", error)
        showAlert("Mesaj gönderme sırasında hata oluştu", "error")
      } finally {
        // Butonu tekrar aktif et
        const button = document.getElementById("sendMessage")
        button.disabled = false
        button.innerHTML = '<i class="fas fa-paper-plane"></i> Mesaj Gönder'
      }
    })
}

// Login işlemi
async function handleLogin() {
  const kurumkod = document.getElementById("kurumkod").value.trim()
  const kullanici = document.getElementById("kullanici").value.trim()
  const parola = document.getElementById("parola").value.trim()

  if (!kurumkod || !kullanici || !parola) {
    showError("Lütfen tüm alanları doldurun!")
    return
  }

  try {
    const result = await ipcRenderer.invoke("kursmax-login", {
      kurumkod: kurumkod,
      kullanici: kullanici,
      parola: parola,
    })

    if (result.success) {
      isLoggedIn = true
      showSuccess("Giriş başarılı!")

      // Login modal'ını güvenli şekilde kapat
      const loginModalElement = document.getElementById("loginModal")
      let loginModal = bootstrap.Modal.getInstance(loginModalElement)
      if (!loginModal) {
        loginModal = new bootstrap.Modal(loginModalElement)
      }
      loginModal.hide()
      // Modal arka plan overlay'ini de kaldır
      document.body.classList.remove("modal-open")
      const modalBackdrops = document.querySelectorAll(".modal-backdrop")
      modalBackdrops.forEach((el) => el.parentNode.removeChild(el))

      // Ana uygulamayı göster
      document.getElementById("mainApp").style.display = "block"

      // Login durumunu güncelle
      updateLoginStatus()

      // Giriş bilgilerini kaydet
      if (document.getElementById("rememberMe").checked) {
        localStorage.setItem("kursmax_kurumkod", kurumkod)
        localStorage.setItem("kursmax_kullanici", kullanici)
        localStorage.setItem("kursmax_parola", parola)
      }
    } else {
      showError(result.message)
    }
  } catch (error) {
    showError("Giriş hatası: " + error.message)
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
        { key: "numara", title: "Numara" },
        { key: "ad", title: "Ad" },
        { key: "borc", title: "Borç" },
        { key: "gecikme", title: "Gecikme" },
        { key: "annecep", title: "Anne Cep" },
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
}

// Seçili öğrencileri güncelle
function updateSelectedStudents() {
  const checkboxes = document.querySelectorAll(".row-checkbox:checked")
  selectedStudents = []

  checkboxes.forEach((checkbox) => {
    const row = checkbox.closest("tr")
    const index = parseInt(row.dataset.index)
    if (currentData[index]) {
      selectedStudents.push(currentData[index])
    }
  })

  updateSendButtonState()
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
  if (selectedStudents.length === 0) {
    showError("Lütfen en az bir öğrenci seçin!")
    return
  }

  const message = document.getElementById("message-text").value.trim()
  if (!message) {
    showError("Lütfen mesaj yazın!")
    return
  }

  const sendStudent = document.getElementById("send-student").checked
  const sendMother = document.getElementById("send-mother").checked
  const sendFather = document.getElementById("send-father").checked

  if (!sendStudent && !sendMother && !sendFather) {
    showError("Lütfen en az bir alıcı seçin!")
    return
  }

  try {
    const recipients = []

    selectedStudents.forEach((student) => {
      if (sendStudent && student.ceptel) {
        recipients.push({
          name: `${student.ad} ${student.soyad}`,
          phone: student.ceptel,
        })
      }
      if (sendMother && student.annecep) {
        recipients.push({
          name: `${student.ad} ${student.soyad} (Anne)`,
          phone: student.annecep,
        })
      }
      if (sendFather && student.babacep) {
        recipients.push({
          name: `${student.ad} ${student.soyad} (Baba)`,
          phone: student.babacep,
        })
      }
    })

    const result = await ipcRenderer.invoke("send-messages", {
      recipients: recipients,
      message: message,
    })

    if (result.success) {
      showSuccess(`${result.sentCount} mesaj başarıyla gönderildi`)
      renderFailedMessages(result.failed)
    } else {
      showError(result.message)
      if (result.failed && result.failed.length > 0) {
        renderFailedMessages(result.failed)
      }
    }
  } catch (error) {
    showError("Mesaj gönderme hatası: " + error.message)
  }
}

// Gönderilemeyen mesajları göster
function renderFailedMessages(failedList) {
  const container = document.getElementById("failed-messages-list")

  if (!failedList || failedList.length === 0) {
    container.innerHTML =
      '<li class="list-group-item text-success">Tüm mesajlar başarıyla gönderildi</li>'
    return
  }

  let html = ""
  failedList.forEach((item) => {
    html += `<li class="list-group-item text-danger">${item.name} (${item.phone})</li>`
  })

  container.innerHTML = html
}

// Gönder butonunun durumunu güncelle
function updateSendButtonState() {
  const sendBtn = document.getElementById("send-messages")
  const messageText = document.getElementById("message-text").value.trim()

  const hasSelection = selectedStudents.length > 0
  const hasMessage = messageText.length > 0
  const hasRecipient =
    document.getElementById("send-student").checked ||
    document.getElementById("send-mother").checked ||
    document.getElementById("send-father").checked

  sendBtn.disabled = !(
    hasSelection &&
    hasMessage &&
    hasRecipient &&
    whatsappStatus === "connected"
  )
}

// Puppeteer durum dinleyicisi
function setupPuppeteerListener() {
  ipcRenderer.on("whatsapp-status-update", (event, data) => {
    updateWhatsAppStatus(data.status)
    updateSystemStatus()

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
  const now = new Date().toLocaleTimeString("tr-TR")
  document.getElementById("last-update").textContent = now

  // WhatsApp durumu
  const whatsappStatusSmall = document.getElementById("whatsapp-status-small")
  whatsappStatusSmall.textContent =
    whatsappStatus === "connected" ? "Bağlı" : "Bağlanıyor"
  whatsappStatusSmall.className =
    whatsappStatus === "connected" ? "badge bg-success" : "badge bg-warning"
}

// WhatsApp durumunu güncelle
function updateWhatsAppStatus(status) {
  whatsappStatus = status
  updateSystemStatus()
  updateSendButtonState()
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

// Test handler'ı çağır
async function handleTestHandler() {
  try {
    const result = await ipcRenderer.invoke("test-handler")
    if (result.success) {
      showSuccess("Test handler çalışıyor: " + result.message)
    } else {
      showError(result.message)
    }
  } catch (error) {
    showError("Test handler hatası: " + error.message)
  }
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

// WhatsApp bağlantısını yeniden başlat
async function handleRestartWhatsApp() {
  try {
    const result = await ipcRenderer.invoke("restart-whatsapp")
    if (result.success) {
      showSuccess("WhatsApp bağlantısı yeniden başlatıldı")
      // Durumu güncelle
      updateWhatsAppStatus(result.status)
    } else {
      showError(result.message)
    }
  } catch (error) {
    showError("WhatsApp yeniden başlatma hatası: " + error.message)
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
    // Doğru tablo selector'ını kullan
    const checkboxes = document.querySelectorAll(
      '#studentsTable tbody input[type="checkbox"]:checked'
    )

    checkboxes.forEach((checkbox) => {
      const row = checkbox.closest("tr")
      if (!row) return

      const cells = row.querySelectorAll("td")
      if (cells.length < 9) return // En az 9 hücre olmalı

      // Güvenli hücre erişimi
      const student = {
        numara: cells[1] ? cells[1].textContent.trim() : "",
        sinif: cells[2] ? cells[2].textContent.trim() : "",
        ad: cells[3] ? cells[3].textContent.trim() : "",
        soyad: cells[4] ? cells[4].textContent.trim() : "",
        ceptel: cells[5] ? cells[5].textContent.trim() : "",
        annecep: cells[6] ? cells[6].textContent.trim() : "",
        babacep: cells[7] ? cells[7].textContent.trim() : "",
        seviye: cells[8] ? cells[8].textContent.trim() : "",
        parola: cells[9] ? cells[9].textContent.trim() : "",
      }

      // Geçerli veri kontrolü
      if (student.ad && student.soyad) {
        selectedStudents.push(student)
      }
    })
  } catch (error) {
    console.error("getSelectedStudents hatası:", error)
  }

  return selectedStudents
}

// Seçili alıcıları göster
function updateSelectedRecipients() {
  const selectedStudents = getSelectedStudents()
  const container = document.getElementById("selectedRecipients")

  if (selectedStudents.length === 0) {
    container.innerHTML = '<small class="text-muted">Seçili alıcı yok</small>'
    return
  }

  const targetAudience = document.querySelector(
    'input[name="targetAudience"]:checked'
  ).value
  let audienceText = ""

  switch (targetAudience) {
    case "student":
      audienceText = "Öğrenci"
      break
    case "mother":
      audienceText = "Anne"
      break
    case "father":
      audienceText = "Baba"
      break
  }

  container.innerHTML = `
    <small class="text-success">${selectedStudents.length} öğrenci seçildi</small><br>
    <small class="text-muted">Hedef: ${audienceText} telefonları</small>
  `
}

// Öğrenci seçimi değiştiğinde alıcı listesini güncelle
document.addEventListener("change", function (e) {
  if (e.target.type === "checkbox" && e.target.closest("#studentsTable")) {
    updateSelectedRecipients()
  }

  if (e.target.name === "targetAudience") {
    updateSelectedRecipients()
  }
})
