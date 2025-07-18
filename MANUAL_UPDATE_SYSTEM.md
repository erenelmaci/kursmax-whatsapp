# Manuel Güncelleme Sistemi

## 🔄 Manuel Güncelleme Nasıl Çalışır?

### **Sistem Özellikleri:**

1. **Sunucudan Güncelleme Kontrolü**
2. **Manuel İndirme ve Kurulum**
3. **Sürüm Kontrolü**
4. **Güvenli Kurulum**

## 🎯 **Güncelleme Süreci:**

### **1. Güncelleme Kontrolü:**

```javascript
// Sunucudan sürüm bilgisi çek
const response = await fetch("https://your-server.com/version.json")
const serverVersion = await response.json()

// Mevcut sürüm ile karşılaştır
if (serverVersion.version > currentVersion) {
  // Güncelleme mevcut
  showUpdateDialog(serverVersion)
}
```

### **2. Güncelleme İndirme:**

```javascript
// Setup dosyasını indir
const downloadUrl = `https://your-server.com/downloads/KursMax-WhatsApp-Setup-${serverVersion.version}.exe`
// İndirme işlemi
```

### **3. Kurulum:**

```javascript
// İndirilen dosyayı çalıştır
const { exec } = require("child_process")
exec(`"${downloadPath}" /SILENT`)
```

## 📋 **Sunucu Gereksinimleri:**

### **1. Version JSON Dosyası:**

```json
{
  "version": "1.0.2",
  "downloadUrl": "https://your-server.com/downloads/KursMax-WhatsApp-Setup-1.0.2.exe",
  "changelog": [
    "Performans iyileştirmeleri",
    "Hata düzeltmeleri",
    "Yeni özellikler"
  ],
  "releaseDate": "2024-01-15",
  "fileSize": "147MB"
}
```

### **2. Dosya Yapısı:**

```
your-server.com/
├── version.json
└── downloads/
    ├── KursMax-WhatsApp-Setup-1.0.1.exe
    ├── KursMax-WhatsApp-Setup-1.0.2.exe
    └── KursMax-WhatsApp-Setup-1.0.3.exe
```

## 🔧 **Manuel Güncelleme Sistemi Kurulumu:**

### **1. Sunucu Ayarları:**

- Web sunucusu (Apache/Nginx)
- HTTPS sertifikası
- Dosya yükleme alanı

### **2. Version Endpoint:**

```php
// version.php
<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$version = [
    "version" => "1.0.2",
    "downloadUrl" => "https://your-server.com/downloads/KursMax-WhatsApp-Setup-1.0.2.exe",
    "changelog" => [
        "Performans iyileştirmeleri",
        "Hata düzeltmeleri",
        "Yeni özellikler"
    ],
    "releaseDate" => "2024-01-15",
    "fileSize" => "147MB"
];

echo json_encode($version);
?>
```

### **3. Download Endpoint:**

```php
// download.php
<?php
$version = $_GET['version'] ?? '1.0.1';
$file = "downloads/KursMax-WhatsApp-Setup-{$version}.exe";

if (file_exists($file)) {
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="' . basename($file) . '"');
    header('Content-Length: ' . filesize($file));
    readfile($file);
} else {
    http_response_code(404);
    echo "Dosya bulunamadı";
}
?>
```

## 🚀 **Yeni Sürüm Yayınlama:**

### **1. Setup Dosyasını Yükle:**

- `KursMax WhatsApp Setup 1.0.2.exe` dosyasını sunucuya yükle
- `downloads/` klasörüne koy

### **2. Version JSON'u Güncelle:**

```json
{
  "version": "1.0.2",
  "downloadUrl": "https://your-server.com/downloads/KursMax-WhatsApp-Setup-1.0.2.exe",
  "changelog": [
    "Yeni özellikler eklendi",
    "Performans iyileştirmeleri",
    "Hata düzeltmeleri"
  ],
  "releaseDate": "2024-01-15",
  "fileSize": "147MB"
}
```

### **3. Test Et:**

- Eski sürümü kur
- Güncelleme kontrolünü test et
- İndirme ve kurulumu test et

## 📊 **Avantajları:**

### **✅ Manuel Sistem:**

- ✅ Kendi sunucunuzda kontrol
- ✅ Özel domain kullanımı
- ✅ Tam kontrol
- ✅ Özel güvenlik

### **✅ GitHub Sistemi:**

- ✅ Ücretsiz
- ✅ Otomatik
- ✅ Güvenilir
- ✅ Kolay yönetim

## 🎯 **Önerim:**

**GitHub kullanmanızı öneriyorum** çünkü:

1. **Ücretsiz**
2. **Güvenilir**
3. **Otomatik**
4. **Kolay yönetim**

### **GitHub Kurulumu:**

1. GitHub'da repository oluşturun
2. Projeyi yükleyin
3. İlk release'i oluşturun
4. Token ayarlayın

Hangi sistemi tercih edersiniz?
