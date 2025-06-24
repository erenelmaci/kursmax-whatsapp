const { ipcRenderer } = require("electron")
const QRCode = require("qrcode")

// Global değişkenler
let whatsappStatus = "connecting"
let selectedStudents = []

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

  // Test modunda WhatsApp'ı bağlı olarak ayarla
  updateWhatsAppStatus("connected")

  // Test verilerini yükle ve tabloyu göster
  renderClassSelect(window.students)
  renderStudentTable(window.students)

  // Sınıf select'i değişince tabloyu filtrele
  document.addEventListener("change", function (e) {
    if (e.target && e.target.id === "class-select") {
      renderStudentTable(window.students, e.target.value)
    }
  })

  // Periyodik WhatsApp durum kontrolü (5 saniyede bir)
  setInterval(() => {
    if (whatsappStatus !== "connected") {
      checkPuppeteerWhatsAppStatus()
    }
  }, 5000)
})

// Uygulama başlatma
function initializeApp() {
  console.log("KursMax WhatsApp Mesaj Sistemi başlatılıyor...")

  // WhatsApp durumunu güncelle
  updateWhatsAppStatus("disconnected")

  // Sistem durumunu güncelle
  updateSystemStatus()

  // Kurumları yükle
  loadInstitutions()
}

// Event listener'ları ayarla
function setupEventListeners() {
  // Kurum seçimi
  const institutionSelect = document.getElementById("institution-select")
  if (institutionSelect) {
    institutionSelect.addEventListener("change", handleInstitutionChange)
  }

  // Sınıf seçimi (ana sınıf select'i)
  const classSelect = document.getElementById("class-select")
  if (classSelect) {
    classSelect.addEventListener("change", handleClassChange)
  }

  // Mesaj gönderme
  const sendMessagesBtn = document.getElementById("send-messages")
  if (sendMessagesBtn) {
    sendMessagesBtn.addEventListener("click", handleSendMessages)
  }

  // Mesaj türü değişikliği
  const messageTypeSelect = document.getElementById("message-type")
  if (messageTypeSelect) {
    messageTypeSelect.addEventListener("change", handleMessageTypeChange)
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
}

// Puppeteer durum dinleyicisi
function setupPuppeteerListener() {
  ipcRenderer.on("whatsapp-status-update", (event, data) => {
    updateWhatsAppStatus(data.status)
    updateSystemStatus()
  })
}

// Sistem durumunu güncelle
function updateSystemStatus() {
  const now = new Date().toLocaleTimeString("tr-TR")
  document.getElementById("last-update").textContent = now

  // Veritabanı durumu (test modunda)
  const dbStatus = document.getElementById("db-status")
  dbStatus.textContent = "Test Modu"
  dbStatus.className = "badge bg-info"

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
  const statusElement = document.getElementById("whatsapp-status")

  // Eğer whatsapp-status elementi yoksa, sadece sistem durumunu güncelle
  if (!statusElement) {
    updateSystemStatus()
    updateSendButtonState() // Buton durumunu güncelle
    return
  }

  switch (status) {
    case "connected":
      statusElement.textContent = "Bağlandı"
      statusElement.className = "badge bg-success"
      break
    case "connecting":
      statusElement.textContent = "Bağlanıyor..."
      statusElement.className = "badge bg-warning"
      break
    case "qr_required":
      statusElement.textContent = "QR Kod Gerekli"
      statusElement.className = "badge bg-info"
      break
    case "disconnected":
      statusElement.textContent = "Bağlantı Yok"
      statusElement.className = "badge bg-danger"
      break
    case "error":
      statusElement.textContent = "Hata"
      statusElement.className = "badge bg-danger"
      break
  }

  console.log("WhatsApp durumu güncellendi:", status)

  // Sistem durumunu güncelle
  updateSystemStatus()

  // Buton durumunu güncelle
  updateSendButtonState()
}

// Kurumları yükle
async function loadInstitutions() {
  try {
    // Test verilerini kullan
    const institutions = TEST_INSTITUTIONS

    const select = document.getElementById("institution-select")
    select.innerHTML = '<option value="">Kurum Seçin...</option>'

    institutions.forEach((institution) => {
      const option = document.createElement("option")
      option.value = institution.id
      option.textContent = institution.name
      select.appendChild(option)
    })
  } catch (error) {
    console.error("Kurumlar yüklenemedi:", error)
  }
}

// Kurum değişikliği
async function handleInstitutionChange(event) {
  const institutionId = event.target.value
  const classSelect = document.getElementById("class-select")

  if (institutionId) {
    try {
      // Test sınıflarını kullan
      const classes = TEST_CLASSES

      classSelect.innerHTML = '<option value="">Sınıf Seçin...</option>'
      classSelect.disabled = false // Sınıf select'ini aktif et

      classes.forEach((classItem) => {
        const option = document.createElement("option")
        option.value = classItem.id
        option.textContent = classItem.name
        classSelect.appendChild(option)
      })
    } catch (error) {
      console.error("Sınıflar yüklenemedi:", error)
    }
  } else {
    classSelect.innerHTML = '<option value="">Önce kurum seçin...</option>'
    classSelect.disabled = true // Sınıf select'ini devre dışı bırak
    document.getElementById("student-list").innerHTML =
      '<small class="text-muted">Önce sınıf seçin...</small>'
  }
}

// Sınıf değişikliği
async function handleClassChange(event) {
  const classId = event.target.value

  if (classId) {
    try {
      // Test öğrencilerini kullan
      const students = TEST_STUDENTS
      displayStudents(students)
    } catch (error) {
      console.error("Öğrenciler yüklenemedi:", error)
    }
  } else {
    document.getElementById("student-list").innerHTML =
      '<small class="text-muted">Önce sınıf seçin...</small>'
  }
}

// Öğrencileri göster
function displayStudents(students) {
  const container = document.getElementById("student-list")
  container.innerHTML = ""

  students.forEach((student) => {
    const div = document.createElement("div")
    div.className = "student-item"
    div.innerHTML = `
            <div class="form-check">
                <input class="form-check-input" type="checkbox" value="${student.id}" id="student-${student.id}">
                <label class="form-check-label" for="student-${student.id}">
                    ${student.name} - ${student.phone}
                </label>
            </div>
        `
    container.appendChild(div)
  })

  // Checkbox event listener'ları
  container.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener("change", updateSelectedStudents)
  })
}

// Seçili öğrencileri güncelle
function updateSelectedStudents() {
  selectedStudents = Array.from(
    document.querySelectorAll('#student-list input[type="checkbox"]:checked')
  ).map((cb) => cb.value)

  const sendButton = document.getElementById("send-messages")

  // Debug bilgisi
  console.log("Öğrenci seçimi güncellendi:")
  console.log("- Seçili öğrenci sayısı:", selectedStudents.length)
  console.log("- WhatsApp durumu:", whatsappStatus)
  console.log("- Seçili öğrenciler:", selectedStudents)

  // Buton durumunu kontrol et
  const isDisabled =
    selectedStudents.length === 0 || whatsappStatus !== "connected"
  sendButton.disabled = isDisabled

  console.log("- Gönder butonu aktif mi:", !isDisabled)

  // Buton metnini güncelle
  if (isDisabled) {
    if (selectedStudents.length === 0) {
      sendButton.title = "Lütfen en az bir öğrenci seçin"
    } else if (whatsappStatus !== "connected") {
      sendButton.title = "WhatsApp bağlantısı bekleniyor..."
    }
  } else {
    sendButton.title = `${selectedStudents.length} öğrenciye mesaj gönder`
  }
}

// Mesaj türü değişikliği
function handleMessageTypeChange(event) {
  const messageType = event.target.value
  const messageText = document.getElementById("message-text")

  console.log("Mesaj türü değiştirildi:", messageType)

  // Mesaj şablonları
  const templates = {
    devamsizlik:
      "Sayın veli, öğrencinizin bugün derse katılmadığını bildirmek isteriz.",
    odev: "Sayın veli, öğrencinizin ödevini teslim etmediğini hatırlatmak isteriz.",
    genel: "Sayın veli, önemli bir duyuru bulunmaktadır.",
    ozel: "",
  }

  const template = templates[messageType] || ""
  messageText.value = template

  console.log("Mesaj şablonu yüklendi:", template)
}

// Mesaj gönderme
async function handleSendMessages() {
  console.log("Mesaj gönderme başlatıldı...")
  console.log("Seçili öğrenciler:", selectedStudents)

  if (selectedStudents.length === 0) {
    showError("Lütfen en az bir öğrenci seçin.")
    return
  }

  if (whatsappStatus !== "connected") {
    showError("WhatsApp bağlantısı yok. Lütfen önce WhatsApp'a giriş yapın.")
    return
  }

  const message = document.getElementById("message-text").value
  if (!message.trim()) {
    showError("Lütfen bir mesaj yazın.")
    return
  }

  // Kime gönderilecek?
  const sendToStudent = document.getElementById("send-student").checked
  const sendToMother = document.getElementById("send-mother").checked
  const sendToFather = document.getElementById("send-father").checked
  if (!sendToStudent && !sendToMother && !sendToFather) {
    showError("En az bir alıcı seçmelisiniz.")
    return
  }

  // Test modunda window.students kullan
  const students = window.students || []
  console.log("Mevcut öğrenciler:", students)

  // Alıcıları oluştur
  const recipients = []
  selectedStudents.forEach((id) => {
    const student = students.find((s) => s.id == id)
    if (!student) {
      console.log(`Öğrenci bulunamadı: ${id}`)
      return
    }

    console.log(`Öğrenci bulundu:`, student)

    if (sendToStudent)
      recipients.push({
        type: "student",
        name: student.name,
        phone: student.phone,
        student,
      })
    if (sendToMother)
      recipients.push({
        type: "mother",
        name: student.mother.name,
        phone: student.mother.phone,
        student,
      })
    if (sendToFather)
      recipients.push({
        type: "father",
        name: student.father.name,
        phone: student.father.phone,
        student,
      })
  })

  console.log("Oluşturulan alıcılar:", recipients)

  if (recipients.length === 0) {
    showError("Hiçbir alıcı bulunamadı.")
    return
  }

  showLoading("Mesajlar gönderiliyor...")

  try {
    // Gerçek WhatsApp mesaj gönderme işlemi
    console.log("WhatsApp'a mesaj gönderiliyor...")
    console.log("Alıcılar:", recipients)
    console.log("Mesaj:", message)

    const result = await ipcRenderer.invoke("send-messages", {
      recipients,
      message,
    })

    console.log("Mesaj gönderme sonucu:", result)

    if (result.success) {
      showSuccess(`${result.sentCount} mesaj başarıyla gönderildi.`)
      // Gönderilemeyenleri göster
      renderFailedMessages(result.failed || [])
    } else {
      showError("Mesaj gönderme hatası: " + result.message)
      renderFailedMessages(result.failed || [])
    }
  } catch (error) {
    console.error("Mesaj gönderme hatası:", error)
    showError("Mesaj gönderme hatası: " + error.message)
  } finally {
    hideLoading()
  }
}

function renderFailedMessages(failedList) {
  const failedCard = document.querySelector(".card .card-header.bg-danger")
  if (!failedCard) {
    console.log("Gönderilemeyenler kartı bulunamadı")
    return
  }

  const card = failedCard.parentElement
  const ul = document.getElementById("failed-messages-list")

  if (!failedList || failedList.length === 0) {
    card.style.display = "none"
    if (ul) ul.innerHTML = ""
    return
  }

  card.style.display = "block"
  if (ul) {
    ul.innerHTML = ""
    failedList.forEach((item) => {
      ul.innerHTML += `<li class="list-group-item text-danger">
        <i class="fas fa-exclamation-triangle"></i>
        ${item.name} (${item.phone}) - ${
        item.type === "student"
          ? "Öğrenci"
          : item.type === "mother"
          ? "Anne"
          : "Baba"
      }
      </li>`
    })
  }
}

// Loading modal fonksiyonları
function showLoading(text) {
  document.getElementById("loading-text").textContent = text
  const modal = new bootstrap.Modal(document.getElementById("loadingModal"))
  modal.show()
}

function hideLoading() {
  try {
    const modalElement = document.getElementById("loadingModal")
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement)
      if (modal) {
        modal.hide()
      } else {
        // Eğer modal instance yoksa, yeni bir modal oluştur ve hemen kapat
        const newModal = new bootstrap.Modal(modalElement)
        newModal.hide()
      }
    }
  } catch (error) {
    console.error("Loading modal kapatılırken hata:", error)
    // Fallback: modal'ı manuel olarak gizle
    const modalElement = document.getElementById("loadingModal")
    if (modalElement) {
      modalElement.style.display = "none"
      modalElement.classList.remove("show")
      document.body.classList.remove("modal-open")
      const backdrop = document.querySelector(".modal-backdrop")
      if (backdrop) {
        backdrop.remove()
      }
    }
  }
}

// Bildirim fonksiyonları
function showSuccess(message) {
  console.log("✅ Başarılı:", message)

  // Bootstrap alert kullan
  const alertDiv = document.createElement("div")
  alertDiv.className =
    "alert alert-success alert-dismissible fade show position-fixed"
  alertDiv.style.cssText =
    "top: 20px; right: 20px; z-index: 9999; min-width: 300px;"
  alertDiv.innerHTML = `
    <i class="fas fa-check-circle"></i> ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `

  document.body.appendChild(alertDiv)

  // 5 saniye sonra otomatik kaldır
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.remove()
    }
  }, 5000)
}

function showError(message) {
  console.log("❌ Hata:", message)

  // Bootstrap alert kullan
  const alertDiv = document.createElement("div")
  alertDiv.className =
    "alert alert-danger alert-dismissible fade show position-fixed"
  alertDiv.style.cssText =
    "top: 20px; right: 20px; z-index: 9999; min-width: 300px;"
  alertDiv.innerHTML = `
    <i class="fas fa-exclamation-triangle"></i> ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `

  document.body.appendChild(alertDiv)

  // 8 saniye sonra otomatik kaldır
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.remove()
    }
  }, 8000)
}

// Debug fonksiyonları
async function handleCheckWhatsApp() {
  try {
    showLoading("WhatsApp durumu kontrol ediliyor...")

    // Test modunda kısa bir bekleme ekle
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Test modunda başarılı sonuç döndür
    const result = {
      success: true,
      status: "connected",
      message: "Test modu - WhatsApp bağlı",
    }

    if (result.success) {
      console.log("WhatsApp Durumu:", result.status)
      console.log("Test Modu - WhatsApp bağlı olarak ayarlandı")

      // WhatsApp durumunu güncelle
      updateWhatsAppStatus(result.status)

      // Buton durumunu güncelle
      updateSendButtonState()

      showSuccess(`WhatsApp Durumu: ${result.status}`)
    } else {
      showError("Kontrol hatası: " + result.message)
      updateWhatsAppStatus("disconnected")
    }
  } catch (error) {
    console.error("WhatsApp kontrol hatası:", error)
    showError("Kontrol hatası: " + error.message)
    updateWhatsAppStatus("disconnected")
  } finally {
    // Loading modal'ını kapat
    setTimeout(() => {
      hideLoading()
    }, 500)
  }
}

async function handleRefreshWhatsApp() {
  try {
    showLoading("WhatsApp sayfası yenileniyor...")

    const result = await ipcRenderer.invoke("refresh-whatsapp")

    if (result.success) {
      showSuccess("Sayfa yenilendi")
    } else {
      showError("Yenileme hatası: " + result.message)
    }
  } catch (error) {
    showError("Yenileme hatası: " + error.message)
  } finally {
    hideLoading()
  }
}

// Öğrencileri yükle (test modu)
async function loadStudents(classId) {
  // Bu fonksiyonun içeriği test için oluşturulmuştur. Gerçek veritabanı için uygun değildir.
  // Gerçek uygulamada bu fonksiyonun içeriği değiştirilmelidir.
  return TEST_STUDENTS.filter((student) => student.classId === classId)
}

// Puppeteer WhatsApp durumunu kontrol et
async function checkPuppeteerWhatsAppStatus() {
  try {
    console.log("Puppeteer WhatsApp durumu kontrol ediliyor...")

    // Puppeteer durumunu kontrol et
    const result = await ipcRenderer.invoke("check-whatsapp-manually")

    if (result.success) {
      console.log("Puppeteer WhatsApp Durumu:", result.status)
      updateWhatsAppStatus(result.status)
    } else {
      console.log("Puppeteer durum kontrolü başarısız:", result.message)
      updateWhatsAppStatus("disconnected")
    }
  } catch (error) {
    console.error("Puppeteer durum kontrolü hatası:", error)
    updateWhatsAppStatus("disconnected")
  }
}

// Sınıf select'i oluştur ve tabloyu filtrele
function renderClassSelect(students) {
  const container = document.getElementById("class-select-container")
  if (!container) return

  // Öğrencilerden benzersiz sınıfları al
  const uniqueClasses = Array.from(new Set(students.map((s) => s.class))).sort()

  let html = `<div class="mb-2">
    <label class="form-label small">Sınıf Filtresi:</label>
    <select id="class-filter-select" class="form-select form-select-sm w-auto d-inline-block">
      <option value="">Tüm Sınıflar</option>`

  uniqueClasses.forEach((cls) => {
    html += `<option value="${cls}">${cls}</option>`
  })

  html += `</select></div>`
  container.innerHTML = html

  // Filtreleme event listener'ı ekle
  const filterSelect = document.getElementById("class-filter-select")
  if (filterSelect) {
    filterSelect.addEventListener("change", function () {
      renderStudentTable(students, this.value)
    })
  }
}

// Öğrenci tablosunu büyük panelde göster (sınıf filtresiyle)
function renderStudentTable(students, classFilter = "") {
  const container = document.getElementById("student-table-container")
  if (!container) return

  let filtered = students
  if (classFilter) {
    filtered = students.filter((s) => s.class === classFilter)
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="alert alert-info">
        <i class="fas fa-info-circle"></i> 
        ${
          classFilter
            ? `${classFilter} sınıfında öğrenci bulunamadı.`
            : "Öğrenci bulunamadı."
        }
      </div>`
    return
  }

  let html = `<div class="table-responsive">
    <table class="table table-bordered table-hover align-middle table-sm">
      <thead class="table-light">
        <tr>
          <th width="50">
            <input type="checkbox" id="select-all-students" class="form-check-input">
          </th>
          <th>Öğrenci</th>
          <th>Sınıf</th>
          <th>Telefon</th>
          <th>Anne</th>
          <th>Anne Tel</th>
          <th>Baba</th>
          <th>Baba Tel</th>
        </tr>
      </thead>
      <tbody>`

  filtered.forEach((student) => {
    html += `<tr>
      <td><input type="checkbox" class="student-row-checkbox form-check-input" data-id="${student.id}"></td>
      <td><strong>${student.name}</strong></td>
      <td><span class="badge bg-primary">${student.class}</span></td>
      <td><code>${student.phone}</code></td>
      <td>${student.mother.name}</td>
      <td><code>${student.mother.phone}</code></td>
      <td>${student.father.name}</td>
      <td><code>${student.father.phone}</code></td>
    </tr>`
  })

  html += `</tbody></table>
    <div class="mt-2">
      <small class="text-muted">
        <i class="fas fa-info-circle"></i> 
        ${filtered.length} öğrenci gösteriliyor
        ${classFilter ? `(${classFilter} sınıfı)` : "(tüm sınıflar)"}
      </small>
    </div>
  </div>`

  container.innerHTML = html

  // Checkbox eventleri
  container.querySelectorAll(".student-row-checkbox").forEach((cb) => {
    cb.addEventListener("change", updateSelectedStudentsFromTable)
  })

  // Tümünü seç/kaldır
  const selectAllCheckbox = document.getElementById("select-all-students")
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener("change", function () {
      const checkboxes = container.querySelectorAll(".student-row-checkbox")
      checkboxes.forEach((cb) => (cb.checked = this.checked))
      updateSelectedStudentsFromTable()
    })
  }
}

function updateSelectedStudentsFromTable() {
  selectedStudents = Array.from(
    document.querySelectorAll(".student-row-checkbox:checked")
  ).map((cb) => cb.getAttribute("data-id"))

  console.log("Seçili öğrenciler güncellendi:", selectedStudents)

  // Seçili öğrenci sayısını göster
  const sendButton = document.getElementById("send-messages")
  if (sendButton) {
    if (selectedStudents.length > 0) {
      sendButton.innerHTML = `<i class="fas fa-paper-plane"></i> ${selectedStudents.length} Öğrenciye Mesaj Gönder`
    } else {
      sendButton.innerHTML = `<i class="fas fa-paper-plane"></i> Mesajları Gönder`
    }
  }

  // Buton durumunu güncelle
  updateSendButtonState()
}

function updateSendButtonState() {
  const sendButton = document.getElementById("send-messages")
  if (!sendButton) return

  // Test modunda WhatsApp durumunu "connected" olarak kabul et
  const isWhatsAppConnected =
    whatsappStatus === "connected" || whatsappStatus === "connecting"
  const isDisabled = selectedStudents.length === 0 || !isWhatsAppConnected

  sendButton.disabled = isDisabled

  // Buton metnini güncelle
  if (selectedStudents.length > 0) {
    sendButton.innerHTML = `<i class="fas fa-paper-plane"></i> ${selectedStudents.length} Öğrenciye Mesaj Gönder`
  } else {
    sendButton.innerHTML = `<i class="fas fa-paper-plane"></i> Mesajları Gönder`
  }

  // Debug bilgisi
  console.log("Gönder butonu durumu güncellendi:")
  console.log("- Seçili öğrenci sayısı:", selectedStudents.length)
  console.log("- WhatsApp durumu:", whatsappStatus)
  console.log("- WhatsApp bağlı mı:", isWhatsAppConnected)
  console.log("- Buton aktif mi:", !isDisabled)
}
