/* ============================================
   APP.JS — Main application logic v2
   Navigation, scroll effects, stats counter,
   scroll-to-top, patient info, toast system,
   emergency modal, enhanced interactions
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

    // ---------- Initialize modules ----------
    Upload.init();
    Chat.init();

    // ---------- Navbar scroll effect ----------
    const navbar = document.getElementById('navbar');
    const scrollTopBtn = document.getElementById('scrollTopBtn');

    window.addEventListener('scroll', () => {
        // Navbar shrink
        if (window.scrollY > 60) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        // Scroll-to-top visibility
        if (scrollTopBtn) {
            if (window.scrollY > 400) {
                scrollTopBtn.classList.add('visible');
            } else {
                scrollTopBtn.classList.remove('visible');
            }
        }
    });

    // Scroll-to-top click
    if (scrollTopBtn) {
        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // ---------- Mobile menu ----------
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navLinks = document.getElementById('navLinks');

    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('open');
            const spans = mobileMenuBtn.querySelectorAll('span');
            if (navLinks.classList.contains('open')) {
                spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
                spans[1].style.opacity = '0';
                spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
            } else {
                spans[0].style.transform = '';
                spans[1].style.opacity = '1';
                spans[2].style.transform = '';
            }
        });

        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('open');
                const spans = mobileMenuBtn.querySelectorAll('span');
                spans[0].style.transform = '';
                spans[1].style.opacity = '1';
                spans[2].style.transform = '';
            });
        });
    }

    // ---------- Smooth scroll ----------
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(anchor.getAttribute('href'));
            if (target) {
                const offset = navbar.offsetHeight + 20;
                const top = target.getBoundingClientRect().top + window.scrollY - offset;
                window.scrollTo({ top, behavior: 'smooth' });
            }
        });
    });

    // ---------- Section reveal ----------
    const revealElements = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

    revealElements.forEach(el => revealObserver.observe(el));

    // ---------- Stats counter animation ----------
    const statNumbers = document.querySelectorAll('.stat-number');
    let statsAnimated = false;

    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !statsAnimated) {
                statsAnimated = true;
                animateCounters();
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    const heroStats = document.querySelector('.hero-stats');
    if (heroStats) statsObserver.observe(heroStats);

    function animateCounters() {
        statNumbers.forEach(num => {
            const target = parseInt(num.dataset.target) || 0;
            const duration = 2000;
            const startTime = performance.now();

            function updateCount(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                // Ease-out curve
                const easeOut = 1 - Math.pow(1 - progress, 3);
                const current = Math.floor(easeOut * target);
                num.textContent = current.toLocaleString('tr-TR');

                if (progress < 1) {
                    requestAnimationFrame(updateCount);
                } else {
                    num.textContent = target.toLocaleString('tr-TR');
                }
            }

            requestAnimationFrame(updateCount);
        });
    }

    // ---------- Anamnesis badges ----------
    const anamnesisGrid = document.getElementById('anamnesisGrid');
    if (anamnesisGrid) {
        anamnesisGrid.addEventListener('click', (e) => {
            const badge = e.target.closest('.badge');
            if (!badge) return;

            badge.classList.toggle('active');

            const activeConditions = [];
            anamnesisGrid.querySelectorAll('.badge.active').forEach(b => {
                activeConditions.push(b.dataset.condition);
            });
            Chat.setActiveConditions(activeConditions);

            // Show toast
            if (badge.classList.contains('active')) {
                showToast(`✅ ${badge.textContent.trim()} eklendi`, 'success');
            }
        });
    }

    // ---------- Patient info ----------
    const patientAge = document.getElementById('patientAge');
    const patientGender = document.getElementById('patientGender');

    function updatePatientInfo() {
        const age = patientAge ? parseInt(patientAge.value) || null : null;
        const gender = patientGender ? patientGender.value || null : null;
        Chat.setPatientInfo(age, gender);
    }

    if (patientAge) patientAge.addEventListener('change', updatePatientInfo);
    if (patientGender) patientGender.addEventListener('change', updatePatientInfo);

    // ---------- Epidemiological alert ----------
    const epiAlerts = {
        0: { title: 'Ocak — Grip Sezonu', desc: 'Grip vakaları zirve noktasında. Ateş, öksürük ve kas ağrısı belirtilerinizi bildirin.' },
        1: { title: 'Şubat — Grip Sezonu', desc: 'Soğuk algınlığı ve grip vakaları mevsim normallerinin üzerinde. Ateş ve öksürük belirtilerinizi mutlaka bildirin.' },
        2: { title: 'Mart — Bahar Alerjileri Başlangıcı', desc: 'Polen seviyeleri yükselmeye başlıyor. Alerjik rinit ve göz belirtilerine dikkat edin.' },
        3: { title: 'Nisan — Polen Alerjisi Dönemi', desc: 'Çimen ve ağaç polenleri yüksek seviyede. Hapşırma, burun akıntısı ve göz kaşıntısı yaygın.' },
        4: { title: 'Mayıs — Böcek Isırıkları Dönemi', desc: 'Kene ve böcek ısırıkları artış gösteriyor. Açık alanda vakit geçirirken dikkatli olun.' },
        5: { title: 'Haziran — Güneş ve Sıcak Uyarısı', desc: 'Güneş yanığı ve sıcak çarpması riski artıyor. Cilt korumanıza özen gösterin.' },
        6: { title: 'Temmuz — Sıcak Dalgası', desc: 'Aşırı sıcaklar sağlığınızı etkileyebilir. Bol sıvı tüketimi ve güneşten korunma önemli.' },
        7: { title: 'Ağustos — Su Kaynaklı Hastalıklar', desc: 'Havuz ve deniz suyu enfeksiyonlarına dikkat. Kulak ve göz enfeksiyonları yaygın.' },
        8: { title: 'Eylül — Okul Başlangıcı Enfeksiyonları', desc: 'Çocuklarda üst solunum yolu enfeksiyonları artış gösteriyor.' },
        9: { title: 'Ekim — Sonbahar Alerjileri', desc: 'Küf sporları ve mevsim değişikliği alerjik belirtileri tetikleyebilir.' },
        10: { title: 'Kasım — Soğuk Algınlığı Mevsimi', desc: 'Soğuk algınlığı vakaları artmaya başlıyor. Hijyen kurallarına dikkat edin.' },
        11: { title: 'Aralık — Kış Hastalıkları', desc: 'Grip ve soğuk algınlığı vakaları yoğun. El yıkama ve maske kullanımı önerilir.' }
    };

    const currentMonth = new Date().getMonth();
    const epiAlertEl = document.getElementById('epiAlert');
    if (epiAlertEl && epiAlerts[currentMonth]) {
        const alertData = epiAlerts[currentMonth];
        // Keep dismiss button
        const dismissBtn = epiAlertEl.querySelector('.epi-dismiss');
        epiAlertEl.innerHTML = `
        <span class="alert-icon">⚠️</span>
        <div>
            <strong>${alertData.title}</strong><br>
            ${alertData.desc}
        </div>
        <button class="epi-dismiss" id="epiDismiss" aria-label="Kapat">✕</button>`;
    }

    // Dismiss epi alert
    document.addEventListener('click', (e) => {
        if (e.target.id === 'epiDismiss' || e.target.closest('#epiDismiss')) {
            const alert = document.getElementById('epiAlert');
            if (alert) alert.classList.add('dismissed');
        }
    });

    // ---------- Emergency modal ----------
    const emergencyModal = document.getElementById('emergencyModal');
    const emergencyClose = document.getElementById('emergencyClose');

    if (emergencyClose && emergencyModal) {
        emergencyClose.addEventListener('click', () => {
            emergencyModal.classList.remove('active');
        });

        emergencyModal.addEventListener('click', (e) => {
            if (e.target === emergencyModal) {
                emergencyModal.classList.remove('active');
            }
        });
    }

    // Close modal with Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && emergencyModal?.classList.contains('active')) {
            emergencyModal.classList.remove('active');
        }
    });

    // ---------- Hero particles ----------
    const hero = document.getElementById('hero');
    if (hero) {
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            const size = 2 + Math.random() * 5;
            particle.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                background: var(--accent);
                border-radius: 50%;
                opacity: ${0.08 + Math.random() * 0.15};
                top: ${Math.random() * 100}%;
                left: ${Math.random() * 100}%;
                pointer-events: none;
                animation: floatParticle ${10 + Math.random() * 15}s ease-in-out infinite;
                animation-delay: ${Math.random() * 8}s;
            `;
            hero.appendChild(particle);
        }

        const style = document.createElement('style');
        const r1 = Math.random(), r2 = Math.random(), r3 = Math.random(), r4 = Math.random();
        style.textContent = `
            @keyframes floatParticle {
                0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.08; }
                25% { transform: translate(${20 + r1 * 40}px, -${20 + r2 * 50}px) scale(1.3); opacity: 0.2; }
                50% { transform: translate(-${15 + r3 * 30}px, ${15 + r4 * 35}px) scale(0.7); opacity: 0.1; }
                75% { transform: translate(${10 + r1 * 20}px, ${5 + r2 * 20}px) scale(1.1); opacity: 0.15; }
            }
        `;
        document.head.appendChild(style);
    }

    // ---------- Service Worker registration (PWA) ----------
    if ('serviceWorker' in navigator) {
        // In production, register a service worker for offline support
        // navigator.serviceWorker.register('/sw.js');
    }

});

// ---------- Global Toast System ----------
function showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}
