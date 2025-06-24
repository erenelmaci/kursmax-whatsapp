const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("electronAPI", {
  // Mevcut handler'lar
  testHandler: () => ipcRenderer.invoke("test-handler"),
  kursmaxLogin: (credentials) =>
    ipcRenderer.invoke("kursmax-login", credentials),
  checkLoginStatus: () => ipcRenderer.invoke("check-login-status"),
  checkWhatsAppStatus: () => ipcRenderer.invoke("check-whatsapp-status"),
  restartWhatsApp: () => ipcRenderer.invoke("restart-whatsapp"),
  refreshWhatsApp: () => ipcRenderer.invoke("refresh-whatsapp"),
  getOgrenciList: () => ipcRenderer.invoke("get-ogrenci-list"),
  getDevamList: () => ipcRenderer.invoke("get-devam-list"),
  getVadeList: () => ipcRenderer.invoke("get-vade-list"),
  getSinavList: () => ipcRenderer.invoke("get-sinav-list"),
  getOdemeList: (tarih) => ipcRenderer.invoke("get-odeme-list", tarih),
  getOnkayitList: () => ipcRenderer.invoke("get-onkayit-list"),
  getArsivList: () => ipcRenderer.invoke("get-arsiv-list"),
  sendMessages: (data) => ipcRenderer.invoke("send-messages", data),

  // Yeni otomatik mesaj handler'ı
  createAutoMessages: (data) =>
    ipcRenderer.invoke("create-auto-messages", data),

  // WhatsApp durum güncellemeleri
  onWhatsAppStatusUpdate: (callback) => {
    ipcRenderer.on("whatsapp-status-update", (event, data) => callback(data))
  },
})
