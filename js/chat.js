/* ============================================
   CHAT.JS — Chat interaction engine v3
   Powered by Gemini API with fallback to
   simulated responses
   ============================================ */

const Chat = (() => {

    // DOM refs
    let messagesContainer, chatInput, sendBtn, voiceBtn, historyBtn, historyModal, historyCloseBtn, historyList, clearHistoryBtn;

    // State
    const activeConditions = new Set();
    let patientAge = null;
    let patientGender = null;
    let analysisCount = 0;
    let isProcessing = false;
    const HISTORY_KEY = 'cebimdeki_doktor_history';

    // ---------- Init ----------
    function init() {
        messagesContainer = document.getElementById('chatMessages');
        chatInput = document.getElementById('chatInput');
        sendBtn = document.getElementById('sendBtn');
        voiceBtn = document.getElementById('voiceBtn');
        historyBtn = document.getElementById('historyBtn');
        historyModal = document.getElementById('historyModal');
        historyCloseBtn = document.getElementById('historyCloseBtn');
        historyList = document.getElementById('historyList');
        clearHistoryBtn = document.getElementById('clearHistoryBtn');

        if (sendBtn) sendBtn.addEventListener('click', handleSend);
        if (voiceBtn) voiceBtn.addEventListener('click', toggleVoiceRecord);
        if (historyBtn) historyBtn.addEventListener('click', openHistory);
        if (historyCloseBtn) historyCloseBtn.addEventListener('click', closeHistory);
        if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', clearHistory);

        if (chatInput) {
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                }
            });
            chatInput.addEventListener('input', () => {
                chatInput.style.height = 'auto';
                chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
            });
        }

        // Quick symptom pills
        const quickSymptoms = document.getElementById('quickSymptoms');
        if (quickSymptoms) {
            quickSymptoms.addEventListener('click', (e) => {
                const pill = e.target.closest('.quick-pill');
                if (!pill) return;
                if (chatInput) chatInput.value = pill.dataset.symptom;
                handleSend();
            });
        }

        // Clear chat
        const clearChatBtn = document.getElementById('clearChatBtn');
        if (clearChatBtn) clearChatBtn.addEventListener('click', clearChat);
    }

    // ---------- Voice Recognition ----------
    let recognition = null;
    let isRecording = false;

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = 'tr-TR';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (chatInput) {
                chatInput.value = (chatInput.value + ' ' + transcript).trim();
                chatInput.style.height = 'auto';
                chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
            }
            stopVoiceRecord();
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            stopVoiceRecord();
            if (typeof showToast === 'function') {
                showToast('❌ Ses dinleme hatası: ' + event.error, 'error');
            }
        };

        recognition.onend = () => {
            stopVoiceRecord();
        };
    }

    function toggleVoiceRecord() {
        if (!recognition) {
            if (typeof showToast === 'function') showToast('Tarayıcınız sesli girişi desteklemiyor.', 'error');
            return;
        }
        if (isRecording) {
            recognition.stop();
            stopVoiceRecord();
        } else {
            isRecording = true;
            if (voiceBtn) voiceBtn.classList.add('recording');
            recognition.start();
            if (typeof showToast === 'function') showToast('🎤 Dinleniyor...', 'info');
        }
    }

    function stopVoiceRecord() {
        isRecording = false;
        if (voiceBtn) voiceBtn.classList.remove('recording');
    }

    // ---------- Public API ----------
    function setActiveConditions(conditions) {
        activeConditions.clear();
        conditions.forEach(c => activeConditions.add(c));
    }

    function setPatientInfo(age, gender) {
        patientAge = age;
        patientGender = gender;
    }

    // ---------- Handle send ----------
    function handleSend() {
        if (isProcessing) return;

        const text = chatInput?.value.trim() || '';
        const images = Upload.getAndClearImages();

        if (!text && images.length === 0) return;

        addUserMessage(text, images);
        chatInput.value = '';
        chatInput.style.height = 'auto';

        isProcessing = true;
        showTyping();

        // Use Gemini API
        processWithGemini(text, images);
    }

    // ---------- Gemini API integration ----------
    async function processWithGemini(text, images) {
        const patientContext = {
            age: patientAge,
            gender: patientGender,
            conditions: Array.from(activeConditions)
        };

        try {
            const response = await Gemini.sendMessage(text, patientContext, images);
            removeTyping();

            if (response.type === 'clarifying') {
                addAIMessage(response.message);
            } else if (response.type === 'rejection') {
                addAIMessage(response.message);
            } else if (response.type === 'triage') {
                renderTriageResult(text, response.triage, images.length > 0);
            } else {
                // Fallback: if response doesn't match expected format, show as text
                addAIMessage(response.message || JSON.stringify(response));
            }

        } catch (error) {
            removeTyping();
            console.error('Gemini API failed:', error);

            let errorMsg;
            if (error.status === 429) {
                errorMsg = `⏳ API günlük kullanım limiti aşıldı. Ücretsiz plan dakikada belirli sayıda istek kabul eder.\n\n<strong>Çözüm:</strong> Birkaç dakika bekleyip tekrar deneyin veya <a href="https://ai.google.dev/pricing" target="_blank" style="color:var(--accent-light);">Google AI Studio</a>'dan planınızı yükseltin.`;
            } else {
                errorMsg = `⚠️ AI servisi şu anda yanıt veremedi.\n\n<em style="font-size:0.75rem;color:var(--text-muted);">Hata: ${escapeHTML(error.message)}</em>`;
            }
            addAIMessage(errorMsg, true);
        }

        isProcessing = false;
    }

    // ---------- Render triage result from Gemini ----------
    function renderTriageResult(prompt, triage, hasImages) {
        if (!triage) return;

        analysisCount++;
        saveToHistory(prompt, triage);

        // Red flag HTML
        let redFlagHTML = '';
        if (triage.redFlag) {
            redFlagHTML = `
            <div class="red-flag">
                <span class="flag-icon">🚩</span>
                <p>${triage.redFlag}</p>
            </div>`;
        }

        // Emergency button for high severity
        let emergencyBtnHTML = '';
        if (triage.severity === 'high') {
            emergencyBtnHTML = `
            <button class="emergency-btn-inline" onclick="document.getElementById('emergencyModal').classList.add('active')">
                🚨 112 Acil Servis'i Ara
            </button>`;
        }

        // Advice list
        const adviceList = (triage.advice || []).map(a => `<li>${a}</li>`).join('');

        const triageHTML = `
        Analiz sonuçlarınız hazır:

        <div class="triage-card">
            <div class="triage-header">
                <span>🔬 Triaj Değerlendirmesi</span>
                <span class="severity-badge ${triage.severity}">
                    ${triage.severity === 'low' ? '🟢' : triage.severity === 'moderate' ? '🟡' : '🔴'}
                    ${triage.severityLabel} Aciliyet
                </span>
            </div>

            ${redFlagHTML}
            ${emergencyBtnHTML}

            <div class="triage-section">
                <h5>🔍 Analiz</h5>
                <p>${triage.analysis}</p>
            </div>

            <div class="triage-section">
                <h5>${triage.departmentIcon || '🏥'} Önerilen Bölüm</h5>
                <div class="department-tag">
                    ${triage.departmentIcon || '🏥'} ${triage.department}
                </div>
            </div>

            <div class="triage-section">
                <h5>💡 Tavsiyeler</h5>
                <ul>${adviceList}</ul>
            </div>

            <div style="margin-top: var(--space-md); border-top: 1px solid var(--border); padding-top: var(--space-md);">
                <button class="btn btn-secondary" onclick="window.findNearestHospitals()" style="width: 100%; border-color: var(--accent); background: rgba(20, 184, 166, 0.05); color: var(--text-primary);">
                    📍 Yakın Hastane / Eczane Bul
                </button>
            </div>

            <div class="disclaimer">
                ⚕️ Bu bir yapay zeka tarafından oluşturulan değerlendirmedir, yalnızca bilgilendirme amaçlıdır ve resmi
                bir tıbbi teşhis niteliği taşımaz. Sağlık endişeleriniz için derhal nitelikli bir sağlık uzmanına danışın.
            </div>
        </div>`;

        addAIMessage(triageHTML, true);

        if (typeof showToast === 'function') {
            showToast(`✅ Analiz #${analysisCount} tamamlandı`, 'success');
        }

        // Trigger emergency modal for high severity
        if (triage.severity === 'high') {
            setTimeout(() => {
                const modal = document.getElementById('emergencyModal');
                if (modal) modal.classList.add('active');
            }, 500);
        }
    }

    // ---------- Clear chat ----------
    function clearChat() {
        if (!messagesContainer) return;

        // Reset Gemini conversation history
        if (typeof Gemini !== 'undefined') {
            Gemini.resetHistory();
        }

        messagesContainer.innerHTML = `
        <div class="message ai">
            <div class="msg-avatar">🤖</div>
            <div class="bubble">
                Sohbet temizlendi. 🧹 Yeni bir analiz başlatmak için belirtilerinizi yazabilirsiniz.
            </div>
        </div>`;

        isProcessing = false;

        if (typeof showToast === 'function') {
            showToast('🧹 Sohbet temizlendi', 'success');
        }
    }

    // ---------- History Management ----------
    function saveToHistory(prompt, triage) {
        try {
            const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
            history.unshift({
                date: new Date().toISOString(),
                prompt: prompt,
                triage: triage
            });
            if (history.length > 20) history.pop();
            localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        } catch (e) {
            console.error("Geçmiş kaydedilemedi", e);
        }
    }

    function openHistory() {
        if (!historyModal || !historyList) return;

        const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');

        if (history.length === 0) {
            historyList.innerHTML = '<div style="text-align:center; color: var(--text-muted); padding: 2rem 0;">Henüz bir analiz geçmişiniz bulunmuyor.</div>';
        } else {
            historyList.innerHTML = history.map((item) => {
                const dateObj = new Date(item.date);
                const dateStr = dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                return `
                <div class="history-item">
                    <div class="history-item-header">
                        <span>🗓️ ${dateStr}</span>
                        <span class="severity-badge ${item.triage.severity}" style="font-size:0.7rem; padding:2px 6px;">${item.triage.severityLabel} Aciliyet</span>
                    </div>
                    <div class="history-item-title">${item.triage.departmentIcon || '🏥'} ${item.triage.department}</div>
                    <div class="history-item-desc" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${item.prompt.replace(/"/g, '&quot;')}">
                        <strong>Semptom:</strong> ${escapeHTML(item.prompt)}
                    </div>
                </div>`;
            }).join('');
        }

        historyModal.classList.add('active');
    }

    function closeHistory() {
        if (historyModal) historyModal.classList.remove('active');
    }

    function clearHistory() {
        if (confirm('Geçmiş analizleri silmek istediğinize emin misiniz?')) {
            localStorage.removeItem(HISTORY_KEY);
            openHistory(); // Refresh view
            if (typeof showToast === 'function') showToast('Geçmiş temizlendi', 'success');
        }
    }

    // ---------- Hospital Finder ----------
    window.findNearestHospitals = function () {
        if ("geolocation" in navigator) {
            if (typeof showToast === 'function') showToast('📍 Harita açılıyor...', 'info');
            navigator.geolocation.getCurrentPosition((position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                // Opens google maps search for "hastaneler" around user's location
                window.open(`https://www.google.com/maps/search/hastaneler+veya+eczane/@${lat},${lon},14z`, '_blank');
            }, (error) => {
                console.error("Geolocation error:", error);
                window.open('https://www.google.com/maps/search/hastaneler+ve+eczaneler', '_blank');
            });
        } else {
            window.open('https://www.google.com/maps/search/hastaneler+ve+eczaneler', '_blank');
        }
    };

    // ---------- Message rendering ----------
    function addUserMessage(text, images = []) {
        const msg = document.createElement('div');
        msg.className = 'message user';

        let content = '';
        if (images.length > 0) {
            content += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">';
            images.forEach(img => {
                content += `<img src="${img.src}" alt="Yüklenen görsel" style="width:80px;height:80px;object-fit:cover;border-radius:8px;">`;
            });
            content += '</div>';
        }
        if (text) content += escapeHTML(text);

        msg.innerHTML = `
                <div class="msg-avatar">👤</div>
                <div class="bubble">${content}</div>`;

        messagesContainer.appendChild(msg);
        scrollToBottom();
    }

    function addAIMessage(content, isHTML = false) {
        const msg = document.createElement('div');
        msg.className = 'message ai';

        msg.innerHTML = `
                <div class="msg-avatar">🤖</div>
                <div class="bubble">${isHTML ? content : escapeHTML(content).replace(/\n/g, '<br>')}</div>`;

        messagesContainer.appendChild(msg);
        scrollToBottom();
    }

    function showTyping() {
        const typing = document.createElement('div');
        typing.className = 'message ai';
        typing.id = 'typingIndicator';
        typing.innerHTML = `
                <div class="msg-avatar">🤖</div>
                <div class="bubble">
                    <div class="typing-indicator">
                        <span></span><span></span><span></span>
                    </div>
                </div>`;
        messagesContainer.appendChild(typing);
        scrollToBottom();
    }

    function removeTyping() {
        const el = document.getElementById('typingIndicator');
        if (el) el.remove();
    }

    function scrollToBottom() {
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    return { init, setActiveConditions, setPatientInfo, clearChat };
})();
