# KursMax WhatsApp - Otomatik Mesaj Sistemi

WhatsApp üzerinden öğrenci ve velilere otomatik mesaj gönderme sistemi. KursMax eğitim yönetim sistemi ile tam entegrasyon.

## 🚀 Özellikler

- ✅ **KursMax API Entegrasyonu** - Gerçek KursMax veritabanından veri çekme
- ✅ **Güvenli Login Sistemi** - KursMax hesap bilgileri ile giriş
- ✅ **Otomatik WhatsApp Mesaj Gönderme** - Puppeteer ile gerçek WhatsApp Web entegrasyonu
- ✅ **Toplu Mesaj Gönderme** - Birden fazla öğrenciye aynı anda mesaj gönderme
- ✅ **Veli Bilgilendirme** - Öğrenci, anne ve babaya ayrı ayrı mesaj gönderme
- ✅ **Mesaj Şablonları** - Devamsızlık, ödev hatırlatması, genel duyuru şablonları
- ✅ **Sınıf Filtreleme** - Sınıfa göre öğrenci filtreleme
- ✅ **Gerçek Zamanlı Durum** - WhatsApp bağlantı durumu takibi
- ✅ **Hata Raporlama** - Gönderilemeyen mesajların listesi

## 📋 Desteklenen Veri Türleri

### KursMax API Endpoint'leri:

- **Öğrenci Listesi** - Aktif öğrenciler
- **Devamsızlık Listesi** - Günlük devamsızlık raporu
- **Vadesi Geçen Ödemeler** - Borç takibi
- **Sınav Listesi** - Sınav sonuçları ve karneler
- **Giriş Bilgileri** - Öğrenci portal erişim bilgileri
- **Ders Programı** - Haftalık ders programları
- **Tahsilat Listesi** - Ödeme takibi
- **Ön Kayıt Listesi** - Yeni kayıtlar
- **Arşiv Listesi** - Mezun öğrenciler

## 📦 Kurulum

### Gereksinimler

- Node.js 16+
- npm veya yarn
- macOS, Windows veya Linux
- KursMax hesap bilgileri

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
2. KursMax giriş bilgilerinizi girin:
   - **Kurum Kodu**: KursMax kurum kodunuz
   - **Kullanıcı Adı**: KursMax kullanıcı adınız
   - **Parola**: KursMax parolanız
3. "Giriş Yap" butonuna tıklayın
4. WhatsApp Web QR kodunu telefonunuzdan tarayın
5. `main.js` dosyasında `TEST_PHONE_NUMBER` değişkenini kendi numaranızla değiştirin

### 2. Veri Getirme

1. **Mesaj Türü Seçimi:** Dropdown'dan veri türünü seçin
2. **Tarih Seçimi:** Tahsilat listesi için tarih seçin (opsiyonel)
3. **Veri Getir:** "Veri Getir" butonuna tıklayın
4. **Filtreleme:** Tablodan istediğiniz kayıtları seçin

### 3. Mesaj Gönderme

1. **Alıcı Seçimi:** Öğrenci/Anne/Baba checkbox'larını işaretleyin
2. **Mesaj Türü:** Dropdown'dan mesaj türü seçin
3. **Mesaj Yazma:** Mesaj metnini düzenleyin
4. **Gönder:** "Mesajları Gönder" butonuna tıklayın

### 4. Mesaj Şablonları

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

### KursMax API Endpoint'leri

Tüm endpoint'ler `main.js` dosyasında tanımlıdır:

```javascript
const KURSMAX_API = {
  LOGIN: "https://www.kursmax.com/kurumlar/rapor/wagiris.aspx",
  OGRENCI_LIST: "https://www.kursmax.com/kurumlar/rapor/walist_ogrenci.aspx",
  DEVAM_LIST: "https://www.kursmax.com/kurumlar/rapor/wagunlukdevam.aspx",
  // ... diğer endpoint'ler
}
```

## 📱 Platform Desteği

- **macOS:** DMG dosyası (90MB)
- **Windows:** NSIS installer
- **Linux:** AppImage

## 🛠️ Teknik Detaylar

### Kullanılan Teknolojiler

- **Electron:** Desktop uygulama framework'ü
- **Puppeteer:** WhatsApp Web otomasyonu
- **Axios:** HTTP istekleri için
- **Cheerio:** HTML parsing için
- **Bootstrap:** UI framework
- **Node.js:** Backend runtime

### Dosya Yapısı

```
kursmax-whatsapp/
├── main.js              # Electron ana süreç (API entegrasyonu)
├── renderer.js          # Renderer süreç (UI mantığı)
├── index.html           # Ana sayfa (Login + UI)
├── mockData.js          # Test verileri
├── styles.css           # CSS stilleri
├── package.json         # Bağımlılıklar
├── assets/              # İkonlar
│   ├── icon.png         # PNG ikon
│   ├── icon.icns        # macOS ikon
│   └── icon.ico         # Windows ikon
└── dist/                # Build çıktıları
```

### API Entegrasyonu

#### Login Sistemi

```javascript
// KursMax login
const result = await ipcRenderer.invoke("kursmax-login", {
  kurumkod: "12345",
  kullanici: "admin",
  parola: "password",
})
```

#### Veri Çekme

```javascript
// Öğrenci listesi
const students = await ipcRenderer.invoke("get-ogrenci-list")

// Devamsızlık listesi
const devamList = await ipcRenderer.invoke("get-devam-list")

// Vadesi geçen ödemeler
const vadeList = await ipcRenderer.invoke("get-vade-list")
```

## 🔒 Güvenlik

- KursMax giriş bilgileri yerel olarak şifrelenmez (geliştirme önerilir)
- WhatsApp Web oturumu yerel olarak saklanır
- API istekleri HTTPS üzerinden yapılır
- Giriş bilgileri "Beni hatırla" seçeneği ile saklanabilir

## 🐛 Sorun Giderme

### KursMax Giriş Sorunu

1. Kurum kodunu kontrol edin
2. Kullanıcı adı ve parolayı doğrulayın
3. İnternet bağlantınızı kontrol edin
4. KursMax hesabınızın aktif olduğundan emin olun

### WhatsApp Bağlantı Sorunu

1. QR kodu yeniden tarayın
2. WhatsApp Web'de oturum açık olduğundan emin olun
3. İnternet bağlantınızı kontrol edin

### Mesaj Gönderme Hatası

1. Test numarasını kontrol edin
2. WhatsApp Web durumunu kontrol edin
3. Console log'larını inceleyin (F12)

### Veri Getirme Hatası

1. KursMax giriş durumunu kontrol edin
2. İnternet bağlantınızı kontrol edin
3. KursMax servislerinin çalıştığından emin olun

## 📄 Lisans

ISC License

## 👨‍💻 Geliştirici

KursMax - Eğitim Teknolojileri

---

**Not:** Bu uygulama KursMax eğitim yönetim sistemi ile tam entegre çalışmaktadır. Gerçek veriler için geçerli KursMax hesap bilgileri gereklidir.
