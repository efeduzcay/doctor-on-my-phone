#Cebimdeki Doktor 🩺

[![Turkish](https://img.shields.io/badge/Language-Turkish-red)](#)
[![Tech Stack](https://img.shields.io/badge/Tech-HTML%20%7C%20CSS%20%7C%20JS-blue)](#)
[![API](https://img.shields.io/badge/API-Google%20Gemini%20AI-orange)](#)
[![Status](https://img.shields.io/badge/Status-Active-brightgreen)](#)

Cebimdeki Doktor, kullanıcıların semptomlarını yazarak veya fotoğraf yükleyerek **yapay zeka destekli tıbbi triaj değerlendirmesi** alabildiği yenilikçi ve modern bir web asistanıdır. Google Gemini API gücüyle çalışır.

> **Uyarı:** Bu uygulama yalnızca bilgilendirme amaçlı ön değerlendirme sunar. Kesin tıbbi teşhis koymaz. Acil durumlarda derhal 112'yi arayınız veya en yakın sağlık kuruluşuna başvurunuz.

---

## ✨ Özellikler

- **🤖 Akıllı Triaj Analizi:** Semptomlarınıza dayanarak aciliyet seviyesi (Düşük, Orta, Yüksek) ve hangi polikliniğe gitmeniz gerektiği konusunda tavsiye verir.
- **🗣️ Sesli Giriş (Voice Input):** Web Speech API entegrasyonu sayesinde yaşlılar veya yazmakta zorlananlar için klavyeye ihtiyaç duymadan semptom anlatma kolaylığı.
- **📷 Görsel Yükleme:** Cilt lezyonu, kızarıklık gibi durumları yapay zekaya görsel olarak sunabilme.
- **📊 Analiz Geçmişi:** `localStorage` tabanlı geçmiş modülü sayesinde önceki değerlendirmelerinizi kaybetmeden cihazınızda görüntüleyebilirsiniz.
- **🗺️ Yakın Hastane Bulucu:** Acil bir durumda tek tıkla konumunuzu alarak yakınınızdaki hastaneleri ve eczaneleri Google Haritalar üzerinde açar.
- **🚦 Kırmızı Bayrak Tespiti:** Hayati tehlike arz edebilecek semptomlarda (örn. göğüs ağrısı) sistemi otomatik kilitler ve doğrudan 112 yönlendirmesi çıkartır.

---

## 🛠️ Teknolojiler

- **Frontend:** HTML5, Vanilla CSS3 (Modern UI, Glassmorphism, Dark/Light Mode Adaptasyonu)
- **Backend / Logic:** Vanilla JavaScript (ES6+)
- **Yapay Zeka:** Google Gemini API (`gemini-2.0-flash` ve `gemini-2.0-flash-lite`)
- **Web API'leri:** 
  - `SpeechRecognition API` (Sesli Giriş için)
  - `Geolocation API` (Hastane bulucu için)
  - `localStorage` (Veri kalıcılığı için)

---

## 🚀 Kurulum & Çalıştırma

Projeyi yerel ortamınızda çalıştırmak için aşağıdaki adımları izleyin. **Not:** *Sesli Giriş ve Konum özelliklerinin tarayıcı güvenlik politikalarına takılmaması için uygulamanın bir HTTP/HTTPS sunucusu üzerinden (örn. Live Server veya lokal node sunucusu) çalıştırılması zorunludur. Direkt dosyaya çift tıklayarak (`file:///`) tam verim alamazsınız.*

1. **Repoyu Klonlayın:**
   ```bash
   git clone https://github.com/USERNAME/doctor-on-my-phone.git
   cd doctor-on-my-phone
   ```

2. **Bir Yerel Sunucu Başlatın (Örnek: VS Code Live Server veya Python):**
   ```bash
   # Python 3 kullanıyorsanız
   python -m http.server 8000
   ```
   
3. **Tarayıcıda Açın:**
   `http://localhost:8000` adresine giderek uygulamayı kullanmaya başlayın.

## 🔑 API Key Bilgisi
Proje içerisinde hazır bir test Gemini API anahtarı bulunmaktadır (`js/gemini.js`). Ancak kendi anahtarınızı kullanmanız tavsiye edilir. Google AI Studio üzerinden ücretsiz bir anahtar alarak değiştirebilirsiniz.

---

## 📸 Ekran Görüntüleri
*(Proje çalıştırıldıktan sonra buraya tasarımın yüksek çözünürlüklü görüntülerini ekleyebilirsiniz)*

---

## 📜 Lisans & Sorumluluk Reddi
© 2026 Tüm hakları saklıdır. Bu projenin sunduğu triaj verileri **asla** profesyonel bir doktor muayenesinin yerine geçemez. Kullanımdan doğacak sonuçlardan geliştirici sorumlu tutulamaz.
