# Otomatik Güncelleme Sistemi

## 🔄 Otomatik Güncelleme Özellikleri

### ✅ **Mevcut Özellikler:**

1. **Otomatik Güncelleme Kontrolü**

   - Uygulama başlatıldığında otomatik kontrol
   - 5 saniye sonra güncelleme kontrolü
   - Manuel güncelleme kontrolü butonu

2. **Güncelleme Bildirimleri**

   - Yeni güncelleme mevcut olduğunda dialog
   - İndirme ilerlemesi gösterimi
   - Kurulum onayı dialog'u

3. **Güvenli Güncelleme**
   - Otomatik indirme (kullanıcı onayı ile)
   - Otomatik kurulum (uygulama kapatıldığında)
   - Hata durumunda geri alma

### 🎯 **Güncelleme Süreci:**

#### **1. Güncelleme Kontrolü:**

- Uygulama başlatıldığında otomatik kontrol
- Manuel kontrol butonu ile anlık kontrol
- GitHub'dan sürüm bilgisi çekme

#### **2. Güncelleme Bildirimi:**

- Yeni sürüm varsa dialog gösterimi
- Sürüm bilgileri ve değişiklikler
- İndirme onayı

#### **3. Güncelleme İndirme:**

- İlerleme çubuğu ile görsel geri bildirim
- Arka planda indirme
- İndirme tamamlandığında bildirim

#### **4. Güncelleme Kurulumu:**

- Kurulum onayı dialog'u
- Uygulama kapatma ve yeniden başlatma
- Otomatik kurulum

## 🚀 Güncelleme Yayınlama

### **Yeni Sürüm Yayınlama Adımları:**

#### **1. Sürüm Numarasını Güncelle:**

```json
{
  "version": "1.0.2"
}
```

#### **2. Değişiklikleri Commit Et:**

```bash
git add .
git commit -m "v1.0.2: Yeni özellikler ve hata düzeltmeleri"
git tag v1.0.2
git push origin main
git push origin v1.0.2
```

#### **3. GitHub Release Oluştur:**

- GitHub'da "Releases" bölümüne git
- "Create a new release" tıklayın
- Tag: `v1.0.2`
- Title: `KursMax WhatsApp v1.0.2`
- Description: Değişiklik listesi

#### **4. Windows Build Al:**

```bash
npm run publish
```

#### **5. Release Dosyalarını Yükle:**

- `KursMax WhatsApp Setup 1.0.2.exe` dosyasını GitHub release'e yükle
- `latest.yml` dosyasını da yükle

## 📋 Güncelleme Konfigürasyonu

### **package.json Ayarları:**

```json
{
  "version": "1.0.2",
  "build": {
    "publish": [
      {
        "provider": "github",
        "owner": "kursmax",
        "repo": "kursmax-whatsapp"
      }
    ]
  }
}
```

### **GitHub Token Ayarları:**

```bash
# GitHub token'ı ayarla
export GH_TOKEN=your_github_token

# veya .env dosyasında
GH_TOKEN=your_github_token
```

## 🔧 Güncelleme Test Etme

### **Test Ortamı:**

1. **Geliştirme Modunda Test:**

   ```bash
   npm start
   ```

2. **Production Build Test:**

   ```bash
   npm run build:win
   ```

3. **Güncelleme Test:**
   - Eski sürümü kur
   - Yeni sürümü yayınla
   - Güncelleme kontrolünü test et

### **Test Senaryoları:**

- ✅ Güncelleme kontrolü
- ✅ Güncelleme indirme
- ✅ Güncelleme kurulumu
- ✅ Hata durumları
- ✅ İptal durumları

## 📊 Güncelleme İstatistikleri

### **Kullanıcı Deneyimi:**

- **Güncelleme Kontrolü:** 5 saniye
- **İndirme Süresi:** Dosya boyutuna göre
- **Kurulum Süresi:** 30-60 saniye
- **Toplam Süre:** 1-3 dakika

### **Güvenlik:**

- ✅ Code signing (gelecekte)
- ✅ Checksum doğrulama
- ✅ Güvenli indirme
- ✅ Hata kontrolü

## 🚨 Sorun Giderme

### **Güncelleme Çalışmıyorsa:**

#### **1. GitHub Token Kontrolü:**

```bash
# Token'ı kontrol et
echo $GH_TOKEN
```

#### **2. GitHub Release Kontrolü:**

- Release dosyaları yüklü mü?
- `latest.yml` dosyası var mı?
- Sürüm numarası doğru mu?

#### **3. Network Kontrolü:**

- İnternet bağlantısı var mı?
- GitHub erişilebilir mi?
- Firewall engellemesi var mı?

#### **4. Log Kontrolü:**

```bash
# Electron log'larını kontrol et
# Windows: %APPDATA%\KursMax WhatsApp\logs\
# macOS: ~/Library/Logs/KursMax WhatsApp/
```

## 📞 Destek

### **Güncelleme Sorunları İçin:**

1. **Log dosyalarını kontrol edin**
2. **GitHub release'lerini kontrol edin**
3. **Network bağlantısını test edin**
4. **Manuel güncelleme yapın**

### **Manuel Güncelleme:**

1. GitHub'dan en son release'i indirin
2. Eski uygulamayı kaldırın
3. Yeni setup'ı çalıştırın

---

**Not:** Otomatik güncelleme sistemi kullanıcıların her zaman en güncel sürümü kullanmasını sağlar. Güvenlik ve performans için düzenli güncellemeler önerilir.
