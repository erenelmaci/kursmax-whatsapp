# Windows Sorun Giderme Rehberi

## 🪟 Windows'ta Chrome Açılmaması Sorunu

### Sorun 1: Chrome Browser Açılmıyor

**Çözüm:**

1. **Google Chrome'u yükleyin:**

   - https://www.google.com/chrome/ adresinden Chrome'u indirin
   - Kurulumu tamamlayın

2. **Chrome'u varsayılan tarayıcı yapın:**

   - Windows Ayarlar > Uygulamalar > Varsayılan uygulamalar
   - Web tarayıcısı > Google Chrome seçin

3. **Chrome'u manuel olarak çalıştırın:**
   - Chrome'u açın
   - https://web.whatsapp.com adresine gidin
   - QR kodu tarayın

### Sorun 2: Puppeteer Frame Hataları

**Çözüm:**

1. **Uygulamayı yönetici olarak çalıştırın:**

   - Setup dosyasına sağ tıklayın
   - "Yönetici olarak çalıştır" seçin

2. **Windows Defender'da izin verin:**

   - Windows Güvenlik > Virüs ve tehdit koruması
   - "Virüs ve tehdit koruması ayarları" > "Ayarları yönet"
   - "Dışlamalar ekle veya kaldır" > "Dışlama ekle"
   - Uygulama klasörünü ekleyin

3. **Antivirüs programını geçici olarak devre dışı bırakın**

### Sorun 3: "Attempted to use detached Frame" Hatası

**Çözüm:**

1. **Uygulamayı yeniden başlatın**
2. **Chrome'u kapatıp yeniden açın**
3. **Windows'u yeniden başlatın**

### Sorun 4: DLL Hatası

**Çözüm:**

1. **Visual C++ Redistributable yükleyin:**

   - https://aka.ms/vs/17/release/vc_redist.x64.exe
   - https://aka.ms/vs/17/release/vc_redist.x86.exe

2. **Windows güncellemelerini kontrol edin:**
   - Windows Update > Güncellemeleri kontrol et

### Sorun 5: "Windows Defender SmartScreen" Uyarısı

**Çözüm:**

1. **"Daha fazla bilgi" tıklayın**
2. **"Yine de çalıştır" seçin**
3. **Bu normal bir durumdur (code signing yok)**

## 🔧 Manuel Chrome Kurulumu

### Adım 1: Chrome'u İndirin

```bash
# Chrome'u indirin
https://www.google.com/chrome/
```

### Adım 2: Kurulumu Tamamlayın

- İndirilen dosyayı çalıştırın
- Kurulumu tamamlayın
- Chrome'u açın

### Adım 3: WhatsApp Web'e Gidin

- Chrome'da https://web.whatsapp.com adresine gidin
- QR kodu telefonunuzla tarayın

### Adım 4: Uygulamayı Yeniden Başlatın

- KursMax WhatsApp uygulamasını kapatın
- Yeniden açın

## 📋 Sistem Gereksinimleri

### Minimum Gereksinimler:

- **Windows 10/11 (64-bit)**
- **4GB RAM**
- **500MB disk alanı**
- **İnternet bağlantısı**
- **Google Chrome (önerilen)**

### Önerilen Gereksinimler:

- **Windows 11 (64-bit)**
- **8GB RAM**
- **1GB disk alanı**
- **Hızlı internet bağlantısı**
- **Google Chrome (güncel)**

## 🚀 Performans İpuçları

### 1. Chrome Optimizasyonu:

- Chrome'da `chrome://settings/performance` adresine gidin
- "Bellek tasarrufu" açın
- "Arka planda çalışan siteleri kapat" açın

### 2. Windows Optimizasyonu:

- Gereksiz uygulamaları kapatın
- Disk temizliği yapın
- Windows güncellemelerini yükleyin

### 3. Antivirüs Ayarları:

- KursMax WhatsApp'ı güvenilir uygulamalar listesine ekleyin
- Gerçek zamanlı korumayı geçici olarak kapatın

## 📞 Destek

### Sorun devam ederse:

1. **Log dosyalarını kontrol edin:**

   - `%APPDATA%\KursMax WhatsApp\logs\`

2. **Sistem bilgilerini toplayın:**

   - Windows sürümü
   - RAM miktarı
   - Chrome sürümü
   - Hata mesajları

3. **Destek ekibiyle iletişime geçin:**
   - Hata mesajlarını paylaşın
   - Sistem bilgilerini gönderin

---

**Not:** Bu sorunlar genellikle Windows güvenlik ayarları ve Chrome kurulumu ile ilgilidir. Yukarıdaki adımları takip ederek çözülebilir.
