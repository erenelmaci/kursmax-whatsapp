# Windows Build Talimatları

## 🪟 Windows için Build Alma

### Gereksinimler

- Windows 10/11 (64-bit)
- Node.js 16+
- npm veya yarn
- Git (opsiyonel)

### Adım Adım Windows Build

#### 1. Projeyi Windows Bilgisayara Kopyalayın

```bash
# Projeyi zip olarak indirin veya git clone yapın
git clone <repository-url>
cd kursmax-whatsapp
```

#### 2. Bağımlılıkları Yükleyin

```bash
npm install
```

#### 3. Windows Build Alın

```bash
# Sadece Windows için build
npm run build:win

# Veya tüm platformlar için
npm run build
```

#### 4. Build Çıktıları

Build tamamlandıktan sonra `dist/` klasöründe şu dosyalar oluşur:

- `KursMax WhatsApp Setup 1.0.0.exe` - **Ana Setup Dosyası**
- `win-unpacked/` - Kurulmamış versiyon
- `KursMax WhatsApp-1.0.0 Setup.exe` - NSIS installer

### Windows Setup Özellikleri

#### ✅ **Kurulum Özellikleri:**

- **Wizard Kurulum** - Adım adım kurulum rehberi
- **Desktop Shortcut** - Masaüstü kısayolu oluşturur
- **Start Menu** - Başlat menüsüne ekler
- **Uninstaller** - Kaldırma programı dahil
- **WhatsApp İkonu** - Gerçek WhatsApp ikonu

#### ✅ **Sistem Gereksinimleri:**

- Windows 10/11 (64-bit)
- 4GB RAM (minimum)
- 500MB disk alanı
- İnternet bağlantısı (WhatsApp Web için)

### Kurulum Adımları

#### 1. Setup Dosyasını Çalıştırın

- `KursMax WhatsApp Setup 1.0.0.exe` dosyasına çift tıklayın
- Windows Defender uyarısı gelebilir (güvenli)

#### 2. Kurulum Wizard'ını Takip Edin

- **Hoş Geldiniz** → İleri
- **Lisans Sözleşmesi** → Kabul ediyorum
- **Kurulum Konumu** → Varsayılan (önerilen)
- **Başlat Menüsü** → Varsayılan
- **Masaüstü Kısayolu** → İşaretli bırakın
- **Kurulum** → Başlat

#### 3. İlk Kullanım

- Uygulamayı başlatın
- WhatsApp Web QR kodunu tarayın
- `main.js` dosyasında test numarasını değiştirin

### Sorun Giderme

#### ❌ **"Windows Defender SmartScreen" Uyarısı**

- "Daha fazla bilgi" → "Yine de çalıştır"
- Bu normal bir durum (code signing yok)

#### ❌ **"DLL Hatası"**

- Visual C++ Redistributable yükleyin
- Windows güncellemelerini kontrol edin

#### ❌ **"Puppeteer Hatası"**

- Windows Defender'da uygulamaya izin verin
- Antivirüs programını geçici olarak devre dışı bırakın

### Geliştirici Notları

#### Build Konfigürasyonu

```json
"win": {
  "target": [
    {
      "target": "nsis",
      "arch": ["x64", "ia32"]
    }
  ],
  "icon": "assets/icon.ico",
  "requestedExecutionLevel": "asInvoker"
}
```

#### NSIS Ayarları

```json
"nsis": {
  "oneClick": false,
  "allowToChangeInstallationDirectory": true,
  "createDesktopShortcut": true,
  "createStartMenuShortcut": true
}
```

### Dağıtım

#### Setup Dosyası Paylaşımı

- `KursMax WhatsApp Setup 1.0.0.exe` dosyasını paylaşın
- Boyut: ~100MB (tüm bağımlılıklar dahil)
- Platform: Windows x64

#### Güvenlik

- Setup dosyası imzalanmamış (normal)
- Windows Defender uyarısı gelebilir
- Kullanıcılar "Yine de çalıştır" seçeneğini kullanmalı

---

**Not:** Windows build'i sadece Windows bilgisayarda alınabilir. macOS'ta Wine ile deneyebilirsiniz ama önerilmez.
