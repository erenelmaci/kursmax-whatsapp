# GitHub Kurulum Rehberi - Adım Adım

## 🚀 GitHub Repository Kurulumu

### **Adım 1: GitHub'da Repository Oluşturun**

#### **1.1 GitHub'a Giriş Yapın**

- https://github.com adresine gidin
- GitHub hesabınızla giriş yapın

#### **1.2 Yeni Repository Oluşturun**

1. Sağ üst köşedeki **"+"** butonuna tıklayın
2. **"New repository"** seçin
3. Repository ayarları:
   - **Repository name:** `kursmax-whatsapp`
   - **Description:** `KursMax WhatsApp Otomatik Mesaj Gönderme Sistemi`
   - **Visibility:** Private (önerilen)
   - **Initialize this repository with:** Hiçbirini seçmeyin
4. **"Create repository"** butonuna tıklayın

### **Adım 2: Projeyi GitHub'a Yükleyin**

#### **2.1 Git Repository'sini Başlatın**

```bash
# Proje klasörüne gidin
cd /Users/erenelmaci/Desktop/dev/kmx-wp/kursmax-whatsapp

# Git repository'sini başlatın
git init

# Tüm dosyaları ekleyin
git add .

# İlk commit'i yapın
git commit -m "İlk sürüm: v1.0.1"

# GitHub repository'sini remote olarak ekleyin
git remote add origin https://github.com/KULLANICI_ADINIZ/kursmax-whatsapp.git

# Main branch'i oluşturun
git branch -M main

# GitHub'a push edin
git push -u origin main
```

#### **2.2 .gitignore Dosyasını Kontrol Edin**

```bash
# .gitignore dosyasının içeriği:
node_modules/
dist/
.DS_Store
*.log
.env
```

### **Adım 3: GitHub Token Oluşturun**

#### **3.1 Personal Access Token Oluşturun**

1. GitHub'da **Settings** > **Developer settings** > **Personal access tokens** > **Tokens (classic)**
2. **"Generate new token"** > **"Generate new token (classic)"**
3. Token ayarları:
   - **Note:** `KursMax WhatsApp Auto Updater`
   - **Expiration:** 90 days (önerilen)
   - **Scopes:** `repo` (tam repository erişimi)
4. **"Generate token"** butonuna tıklayın
5. **Token'ı kopyalayın ve güvenli bir yere kaydedin**

#### **3.2 Token'ı Sistemde Ayarlayın**

```bash
# macOS/Linux için:
export GH_TOKEN=your_github_token_here

# Windows için:
set GH_TOKEN=your_github_token_here

# veya .env dosyasına ekleyin:
echo "GH_TOKEN=your_github_token_here" >> .env
```

### **Adım 4: İlk Release Oluşturun**

#### **4.1 Tag Oluşturun**

```bash
# Tag oluşturun
git tag v1.0.1

# Tag'i GitHub'a push edin
git push origin v1.0.1
```

#### **4.2 GitHub Release Oluşturun**

1. GitHub repository sayfasında **"Releases"** bölümüne gidin
2. **"Create a new release"** butonuna tıklayın
3. Release ayarları:

   - **Tag version:** `v1.0.1`
   - **Release title:** `KursMax WhatsApp v1.0.1`
   - **Description:**

     ```
     ## İlk Sürüm

     ### Özellikler:
     - WhatsApp Web entegrasyonu
     - Otomatik mesaj gönderme
     - KursMax API entegrasyonu
     - Windows setup
     - Otomatik güncelleme sistemi

     ### Teknik Detaylar:
     - Electron v28.0.0
     - Puppeteer v24.10.2
     - Windows x64/x86 desteği
     ```

4. **"Publish release"** butonuna tıklayın

### **Adım 5: Setup Dosyasını Yükleyin**

#### **5.1 Windows Build Alın**

```bash
# Windows build alın
npm run build:win
```

#### **5.2 Release'e Dosya Yükleyin**

1. GitHub release sayfasında **"Assets"** bölümüne gidin
2. **"Add assets"** > **"Upload files"**
3. Şu dosyaları yükleyin:
   - `dist/KursMax WhatsApp Setup 1.0.1.exe`
   - `dist/latest.yml`

### **Adım 6: Güncelleme Sistemini Test Edin**

#### **6.1 Test Uygulaması Kurun**

1. Eski sürümü kaldırın (varsa)
2. `KursMax WhatsApp Setup 1.0.1.exe` dosyasını çalıştırın
3. Kurulumu tamamlayın

#### **6.2 Güncelleme Testi**

1. Yeni sürüm için `package.json`'da versiyonu güncelleyin:
   ```json
   {
     "version": "1.0.2"
   }
   ```
2. Yeni build alın ve release oluşturun
3. Eski sürümde güncelleme kontrolünü test edin

## 🔧 Yeni Sürüm Yayınlama Süreci

### **1. Sürüm Numarasını Güncelleyin**

```bash
# package.json'da versiyonu güncelleyin
# "version": "1.0.2"
```

### **2. Değişiklikleri Commit Edin**

```bash
git add .
git commit -m "v1.0.2: Yeni özellikler ve hata düzeltmeleri"
git push origin main
```

### **3. Tag Oluşturun**

```bash
git tag v1.0.2
git push origin v1.0.2
```

### **4. Build Alın**

```bash
npm run build:win
```

### **5. GitHub Release Oluşturun**

1. GitHub'da **"Releases"** > **"Create a new release"**
2. Tag: `v1.0.2`
3. Title: `KursMax WhatsApp v1.0.2`
4. Setup dosyasını yükleyin

## 📋 Kontrol Listesi

### **✅ Kurulum Tamamlandı mı?**

- [ ] GitHub repository oluşturuldu
- [ ] Proje GitHub'a yüklendi
- [ ] GitHub token oluşturuldu
- [ ] Token sistemde ayarlandı
- [ ] İlk release oluşturuldu
- [ ] Setup dosyası yüklendi
- [ ] Güncelleme sistemi test edildi

### **✅ Yeni Sürüm Yayınlama**

- [ ] Sürüm numarası güncellendi
- [ ] Değişiklikler commit edildi
- [ ] Tag oluşturuldu
- [ ] Build alındı
- [ ] Release oluşturuldu
- [ ] Dosyalar yüklendi

## 🚨 Sorun Giderme

### **Token Hatası:**

```bash
# Token'ı kontrol edin
echo $GH_TOKEN

# Token'ı yeniden ayarlayın
export GH_TOKEN=your_new_token
```

### **Repository Hatası:**

```bash
# Remote URL'i kontrol edin
git remote -v

# URL'i düzeltin
git remote set-url origin https://github.com/KULLANICI_ADINIZ/kursmax-whatsapp.git
```

### **Build Hatası:**

```bash
# Node modules'u yeniden yükleyin
rm -rf node_modules
npm install

# Build'i tekrar deneyin
npm run build:win
```

---

**Not:** Bu adımları takip ederek GitHub tabanlı otomatik güncelleme sistemini kurabilirsiniz. Her adımı sırayla takip edin ve sorun yaşarsanız geri dönün.
