/* ============================================
   GEMINI.JS — Gemini API integration module
   Handles API calls to Google Gemini for
   real medical triage AI responses.
   Includes retry logic & rate-limit handling.
   ============================================ */

const Gemini = (() => {

    let API_KEY = localStorage.getItem('cebimdeki_doktor_api_key') || '';

    if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
        API_KEY = prompt("Lütfen Google Gemini API anahtarınızı girin (Sadece tarayıcınızda kalacaktır):") || '';
        if (API_KEY) {
            localStorage.setItem('cebimdeki_doktor_api_key', API_KEY);
        }
    }

    // Models to try in order (cheaper fallback first for rate limits)
    const MODELS = [
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite'
    ];

    function getAPIUrl(model) {
        return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
    }

    // System prompt
    const SYSTEM_PROMPT = `Sen "Cebimdeki Doktor" adlı bir yapay zeka tıbbi triaj asistanısın. Görevin YALNIZCA kullanıcının anlattığı sağlık belirtilerine göre bir ön değerlendirme yapmak ve doğru bölüme yönlendirmektir.

KURALLAR:
1. Her zaman Türkçe yanıt ver.
2. Tıbbi teşhis KOYMA, sadece ön değerlendirme ve yönlendirme yap.
3. Her yanıtının sonunda mutlaka "Bu bir yapay zeka değerlendirmesidir, kesin teşhis için doktora başvurun" uyarısı olmalı.
4. Hayati tehlike belirtileri varsa (göğüs ağrısı, nefes darlığı, bilinç kaybı, inme belirtileri) derhal 112 acil servisi aramalarını söyle.
5. Cevaplarında samimi ve profesyonel bir dil kullan.
6. **ÇOK ÖNEMLİ — KONU SINIRLAMASI:** Sadece ve SADECE tıp, sağlık, hastalık, belirti, ilaç, beslenme/diyet (sağlıkla ilgili), egzersiz (sağlıkla ilgili), ilk yardım konularında yanıt ver. Bunların dışındaki HER konuyu (matematik, kodlama, tarih, siyaset, eğlence, yemek tarifi, genel bilgi, teknoloji, spor sonuçları, hava durumu, vb.) KESİNLİKLE REDDET. Konu dışı sorulara asla cevap verme, bunun yerine "rejection" tipi yanıt döndür.

YANITLARIN FORMATI:
Yanıtını kesinlikle aşağıdaki JSON formatında ver. Başka hiçbir metin ekleme, sadece JSON döndür:

KONU DIŞI SORULARDA:
{
  "type": "rejection",
  "message": "Üzgünüm, ben yalnızca sağlık ve tıbbi konularda yardımcı olabilen bir asistanım. 🩺 Lütfen sağlıkla ilgili bir soru sorun veya belirtilerinizi anlatın."
}

TIBBI SORULARDA (İlk mesaj — ek sorular):
{
  "type": "clarifying",
  "message": "Ek soru metni"
}

TIBBI SORULARDA (İkinci mesaj — tam değerlendirme):
{
  "type": "triage",
  "triage": {
    "severity": "low" veya "moderate" veya "high",
    "severityLabel": "Düşük" veya "Orta" veya "Yüksek",
    "department": "Önerilen bölüm adı",
    "departmentIcon": "uygun emoji",
    "analysis": "Detaylı analiz metni",
    "advice": ["Tavsiye 1", "Tavsiye 2", "Tavsiye 3", "Tavsiye 4", "Tavsiye 5"],
    "redFlag": "Kırmızı bayrak uyarısı varsa metin, yoksa null"
  }
}

İLK MESAJDA: Kullanıcı belirtilerini anlattığında, önce "type": "clarifying" olarak 2-3 ek soru sor (süre, şiddet, eşlik eden belirtiler).
İKİNCİ MESAJDA: Kullanıcı ek bilgi verdikten sonra "type": "triage" olarak tam değerlendirme yap.

HASTA BİLGİLERİ: Kullanıcının mesajında [HASTA BİLGİSİ: ...] şeklinde yaş, cinsiyet ve kronik durumlar bulunabilir. Bu bilgileri değerlendirmende dikkate al.

GÖRSEL ANALIZ: Eğer görsel yüklendiyse, görseli analiz edip cilt/vücut durumu hakkında yorum yap.`;

    let conversationHistory = [];

    /**
     * Send a message with retry logic
     */
    async function sendMessage(userMessage, patientContext = {}, images = []) {
        // Build context
        let contextStr = '';
        if (patientContext.age || patientContext.gender || patientContext.conditions?.length) {
            contextStr = '\n\n[HASTA BİLGİSİ: ';
            if (patientContext.age) contextStr += `Yaş: ${patientContext.age}, `;
            if (patientContext.gender) {
                const genderMap = { male: 'Erkek', female: 'Kadın', other: 'Diğer' };
                contextStr += `Cinsiyet: ${genderMap[patientContext.gender] || patientContext.gender}, `;
            }
            if (patientContext.conditions?.length) {
                const condNames = {
                    diabetes: 'Diyabet', hypertension: 'Hipertansiyon', asthma: 'Astım',
                    heart: 'Kalp Hastalığı', allergy: 'Alerji', thyroid: 'Tiroid',
                    kidney: 'Böbrek Hastalığı', cancer: 'Kanser',
                    pregnancy: 'Hamilelik', smoking: 'Sigara Kullanıcısı'
                };
                const names = patientContext.conditions.map(c => condNames[c] || c);
                contextStr += `Kronik Durumlar: ${names.join(', ')}`;
            }
            contextStr += ']';
        }

        const fullMessage = userMessage + contextStr;

        // Add to history
        conversationHistory.push({
            role: 'user',
            parts: buildParts(fullMessage, images)
        });

        // Try each model with retries
        let lastError = null;

        for (const model of MODELS) {
            for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                    const result = await callAPI(model, attempt);
                    return result;
                } catch (error) {
                    lastError = error;
                    console.warn(`Model ${model}, attempt ${attempt} failed:`, error.message);

                    // If rate limited, wait before retry
                    if (error.status === 429 && attempt < 2) {
                        const waitTime = error.retryAfter || 5;
                        console.log(`Rate limited. Waiting ${waitTime}s before retry...`);
                        await sleep(waitTime * 1000);
                    }
                }
            }
        }

        // All attempts failed — remove user message from history
        conversationHistory.pop();
        throw lastError || new Error('Tüm API denemeleri başarısız oldu');
    }

    /**
     * Make the actual API call
     */
    async function callAPI(model, attempt) {
        const requestBody = {
            system_instruction: {
                parts: [{ text: SYSTEM_PROMPT }]
            },
            contents: conversationHistory,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1024,
                responseMimeType: 'application/json'
            }
        };

        const response = await fetch(getAPIUrl(model), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const error = new Error(
                response.status === 429
                    ? 'API kota limiti aşıldı. Biraz bekleyip tekrar deneyin.'
                    : `API Hatası ${response.status}: ${errorData.error?.message || response.statusText}`
            );
            error.status = response.status;

            // Extract retry delay
            if (errorData.error?.details) {
                const retryInfo = errorData.error.details.find(d => d['@type']?.includes('RetryInfo'));
                if (retryInfo?.retryDelay) {
                    error.retryAfter = parseInt(retryInfo.retryDelay) || 5;
                }
            }

            throw error;
        }

        const data = await response.json();
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!aiText) {
            throw new Error('API boş yanıt döndü');
        }

        // Add to history
        conversationHistory.push({
            role: 'model',
            parts: [{ text: aiText }]
        });

        return JSON.parse(aiText);
    }

    function buildParts(text, images = []) {
        const parts = [{ text }];
        images.forEach(img => {
            const base64Match = img.src.match(/^data:image\/(.*?);base64,(.*)$/);
            if (base64Match) {
                parts.push({
                    inline_data: {
                        mime_type: `image/${base64Match[1]}`,
                        data: base64Match[2]
                    }
                });
            }
        });
        return parts;
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function resetHistory() {
        conversationHistory = [];
    }

    function isConfigured() {
        return API_KEY && API_KEY.length > 0 && API_KEY !== 'YOUR_API_KEY_HERE';
    }

    return { sendMessage, resetHistory, isConfigured };
})();
