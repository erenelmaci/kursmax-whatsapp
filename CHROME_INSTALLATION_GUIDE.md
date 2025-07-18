# Chrome Kurulum Rehberi - Windows

## 🪟 Google Chrome Kurulumu

### Chrome Yüklü Değilse Ne Olur?

Eğer Google Chrome yüklü değilse, uygulama şu şekilde çalışır:

1. **Puppeteer'ın kendi Chrome'u kullanılır** (dahili)
2. **Performans düşük olabilir**
3. **Bazı özellikler çalışmayabilir**
4. **Uyarı mesajı gösterilir**

### ✅ Önerilen: Google Chrome Yükleyin

#### Adım 1: Chrome'u İndirin

- **Resmi Site:** https://www.google.com/chrome/
- **Alternatif:** https://chrome.google.com/

#### Adım 2: Kurulumu Tamamlayın

1. İndirilen dosyayı çalıştırın
2. "Kurulumu tamamla" butonuna tıklayın
3. Kurulum tamamlanana kadar bekleyin

#### Adım 3: Chrome'u Varsayılan Yapın

1. Chrome'u açın
2. Ayarlar > Varsayılan tarayıcı
3. "Varsayılan yap" butonuna tıklayın

#### Adım 4: Uygulamayı Yeniden Başlatın

1. KursMax WhatsApp'ı kapatın
2. Yeniden açın
3. Chrome otomatik olarak bulunacak

### 🔧 Manuel Chrome Kontrolü

#### Chrome Yüklü mü Kontrol Edin:

```cmd
# Komut satırında:
"C:\Program Files\Google\Chrome\Application\chrome.exe" --version
```

#### Chrome'u Yeniden Yükleyin:

1. **Denetim Masası** > **Programlar ve Özellikler**
2. **Google Chrome**'u bulun
3. **Kaldır** > **Yeniden yükle**

### 🚨 Sorun Giderme

#### Sorun 1: Chrome Yüklenmiyor

**Çözüm:**

1. Windows güncellemelerini kontrol edin
2. Antivirüs programını geçici olarak kapatın
3. Yönetici olarak çalıştırın

#### Sorun 2: Chrome Açılmıyor

**Çözüm:**

1. Chrome'u güvenli modda açın
2. Chrome'u sıfırlayın: `chrome://settings/reset`
3. Chrome'u yeniden yükleyin

#### Sorun 3: Uygulama Chrome'u Bulamıyor

**Çözüm:**

1. Chrome'u manuel olarak açın
2. Uygulamayı yeniden başlatın
3. Windows'u yeniden başlatın

### 📋 Chrome Gereksinimleri

#### Minimum Gereksinimler:

- **Windows 7/8/10/11**
- **512MB RAM**
- **350MB disk alanı**
- **İnternet bağlantısı**

#### Önerilen Gereksinimler:

- **Windows 10/11**
- **4GB RAM**
- **1GB disk alanı**
- **Hızlı internet bağlantısı**

### 🎯 Chrome Avantajları

#### Puppeteer'ın Chrome'u vs Google Chrome:

| Özellik           | Puppeteer Chrome | Google Chrome |
| ----------------- | ---------------- | ------------- |
| **Performans**    | Düşük            | Yüksek        |
| **Güncellemeler** | Manuel           | Otomatik      |
| **Güvenlik**      | Temel            | Gelişmiş      |
| **Uyumluluk**     | Sınırlı          | Tam           |
| **Bellek**        | Yüksek           | Optimize      |

### 🔄 Chrome Güncelleme

#### Otomatik Güncelleme:

1. Chrome'u açın
2. Ayarlar > Gelişmiş > Sistem
3. "Otomatik güncellemeleri etkinleştir"

#### Manuel Güncelleme:

1. Chrome'u açın
2. Üç nokta > Yardım > Google Chrome Hakkında
3. Güncelleme varsa "Yeniden başlat" tıklayın

### 📞 Destek

#### Chrome Sorunları İçin:

1. **Chrome Yardım:** https://support.google.com/chrome/
2. **Chrome Topluluk:** https://support.google.com/chrome/community
3. **Chrome Canary:** https://www.google.com/chrome/canary/

#### KursMax WhatsApp Sorunları İçin:

- Hata mesajlarını kaydedin
- Sistem bilgilerini toplayın
- Destek ekibiyle iletişime geçin

---

**Not:** Google Chrome yüklü olması en iyi performansı sağlar. Puppeteer'ın kendi Chrome'u da çalışır ama daha yavaş olabilir.
