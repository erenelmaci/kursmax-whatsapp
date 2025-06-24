# KursMax WhatsApp - Otomatik Mesaj Sistemi

WhatsApp üzerinden öğrenci ve velilere otomatik mesaj gönderme sistemi.

## 🚀 Özellikler

- ✅ **Otomatik WhatsApp Mesaj Gönderme** - Puppeteer ile gerçek WhatsApp Web entegrasyonu
- ✅ **Toplu Mesaj Gönderme** - Birden fazla öğrenciye aynı anda mesaj gönderme
- ✅ **Veli Bilgilendirme** - Öğrenci, anne ve babaya ayrı ayrı mesaj gönderme
- ✅ **Mesaj Şablonları** - Devamsızlık, ödev hatırlatması, genel duyuru şablonları
- ✅ **Sınıf Filtreleme** - Sınıfa göre öğrenci filtreleme
- ✅ **Gerçek Zamanlı Durum** - WhatsApp bağlantı durumu takibi
- ✅ **Hata Raporlama** - Gönderilemeyen mesajların listesi

## 📦 Kurulum

### Gereksinimler

- Node.js 16+
- npm veya yarn
- macOS, Windows veya Linux

### Geliştirme Modu

```bash
# Bağımlılıkları yükle
npm install

# Uygulamayı başlat
npm start
```

### Production Build

```bash
# Uygulamayı build et
npm run build

# Build dosyaları dist/ klasöründe oluşur
```

## 🎯 Kullanım

### 1. İlk Kurulum

1. Uygulamayı başlatın
2. WhatsApp Web QR kodunu telefonunuzdan tarayın
3. `main.js` dosyasında `TEST_PHONE_NUMBER` değişkenini kendi numaranızla değiştirin

### 2. Mesaj Gönderme

1. **Öğrenci Seçimi:** Tablodan öğrenci(ler) seçin
2. **Alıcı Seçimi:** Öğrenci/Anne/Baba checkbox'larını işaretleyin
3. **Mesaj Türü:** Dropdown'dan mesaj türü seçin
4. **Mesaj Yazma:** Mesaj metnini düzenleyin
5. **Gönder:** "X Öğrenciye Mesaj Gönder" butonuna tıklayın

### 3. Mesaj Şablonları

- **Devamsızlık Bildirimi:** Öğrencinin derse katılmadığını bildirir
- **Ödev Hatırlatması:** Ödev teslimini hatırlatır
- **Genel Duyuru:** Genel duyurular için
- **Özel Mesaj:** Kendi mesajınızı yazın

## 🔧 Konfigürasyon

### Test Numarası Değiştirme

`main.js` dosyasında:

```javascript
const TEST_PHONE_NUMBER = "+905551234567" // Kendi numaranızı yazın
```

### Veritabanı Bağlantısı

Gerçek veritabanı kullanmak için `mockData.js` dosyasını güncelleyin.

## 📱 Platform Desteği

- **macOS:** DMG dosyası (90MB)
- **Windows:** NSIS installer
- **Linux:** AppImage

## 🛠️ Teknik Detaylar

### Kullanılan Teknolojiler

- **Electron:** Desktop uygulama framework'ü
- **Puppeteer:** WhatsApp Web otomasyonu
- **Bootstrap:** UI framework
- **Node.js:** Backend runtime

### Dosya Yapısı

```
kursmax-whatsapp/
├── main.js              # Electron ana süreç
├── renderer.js          # Renderer süreç (UI)
├── index.html           # Ana sayfa
├── mockData.js          # Test verileri
├── styles.css           # CSS stilleri
├── assets/              # İkonlar
│   ├── icon.png         # PNG ikon
│   ├── icon.icns        # macOS ikon
│   └── icon.ico         # Windows ikon
└── dist/                # Build çıktıları
```

## 🔒 Güvenlik

- WhatsApp Web oturumu yerel olarak saklanır
- Telefon numaraları şifrelenmez (test modu)
- Gerçek kullanımda veritabanı şifreleme önerilir

## 🐛 Sorun Giderme

### WhatsApp Bağlantı Sorunu

1. QR kodu yeniden tarayın
2. WhatsApp Web'de oturum açık olduğundan emin olun
3. İnternet bağlantınızı kontrol edin

### Mesaj Gönderme Hatası

1. Test numarasını kontrol edin
2. WhatsApp Web durumunu kontrol edin
3. Console log'larını inceleyin (F12)

## 📄 Lisans

ISC License

## 👨‍💻 Geliştirici

KursMax - Eğitim Teknolojileri

---

**Not:** Bu uygulama test modunda çalışmaktadır. Gerçek kullanım için veritabanı entegrasyonu ve güvenlik önlemleri eklenmelidir.
