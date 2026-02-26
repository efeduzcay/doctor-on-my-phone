/* ============================================
   UPLOAD.JS — Image upload, preview & comparison
   ============================================ */

const Upload = (() => {
  // State
  const state = {
    chatImages: [],       // Images queued for chat
    compareImg1: null,    // "Before" image
    compareImg2: null,    // "After" image
  };

  // DOM refs
  let uploadZone, imageInput, previewStrip;
  let compareInput1, compareInput2, comparisonSlider;

  /**
   * Initialize upload module
   */
  function init() {
    uploadZone = document.getElementById('uploadZone');
    imageInput = document.getElementById('imageInput');
    previewStrip = document.getElementById('imagePreviewStrip');
    compareInput1 = document.getElementById('compareImg1');
    compareInput2 = document.getElementById('compareImg2');
    comparisonSlider = document.getElementById('comparisonSlider');

    // Upload zone events
    if (uploadZone) {
      uploadZone.addEventListener('dragover', handleDragOver);
      uploadZone.addEventListener('dragleave', handleDragLeave);
      uploadZone.addEventListener('drop', handleDrop);
    }

    if (imageInput) {
      imageInput.addEventListener('change', handleFileSelect);
    }

    // Upload button in chat input
    const uploadBtn = document.getElementById('uploadBtn');
    if (uploadBtn) {
      uploadBtn.addEventListener('click', () => imageInput?.click());
    }

    // Comparison inputs
    if (compareInput1) {
      compareInput1.addEventListener('change', (e) => handleCompareUpload(e, 'before'));
    }
    if (compareInput2) {
      compareInput2.addEventListener('change', (e) => handleCompareUpload(e, 'after'));
    }
  }

  // ---------- Drag & Drop ----------
  function handleDragOver(e) {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  }

  function handleDragLeave(e) {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
  }

  function handleDrop(e) {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    processFiles(files);
  }

  // ---------- File selection ----------
  function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    processFiles(files);
    e.target.value = ''; // Reset so same file can be selected again
  }

  function processFiles(files) {
    files.forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        alert('Dosya boyutu 10MB\'dan büyük olamaz.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const imgData = {
          id: Date.now() + Math.random(),
          src: e.target.result,
          name: file.name
        };
        state.chatImages.push(imgData);
        renderPreviews();
      };
      reader.readAsDataURL(file);
    });
  }

  // ---------- Preview strip ----------
  function renderPreviews() {
    if (!previewStrip) return;
    previewStrip.innerHTML = '';

    state.chatImages.forEach((img) => {
      const thumb = document.createElement('div');
      thumb.className = 'preview-thumb';
      thumb.innerHTML = `
        <img src="${img.src}" alt="${img.name}">
        <div class="remove-btn" data-id="${img.id}">✕</div>
      `;
      thumb.querySelector('.remove-btn').addEventListener('click', () => {
        state.chatImages = state.chatImages.filter(i => i.id !== img.id);
        renderPreviews();
      });
      previewStrip.appendChild(thumb);
    });
  }

  // ---------- Comparison ----------
  function handleCompareUpload(e, slot) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (slot === 'before') {
        state.compareImg1 = ev.target.result;
      } else {
        state.compareImg2 = ev.target.result;
      }
      renderComparison();
    };
    reader.readAsDataURL(file);
  }

  function renderComparison() {
    if (!comparisonSlider) return;

    // If neither image, show placeholder
    if (!state.compareImg1 && !state.compareImg2) {
      comparisonSlider.innerHTML = `
        <div class="comparison-placeholder">
          <div class="comp-icon">🔍</div>
          <p>İki fotoğraf yükleyerek karşılaştırma yapabilirsiniz.</p>
        </div>
      `;
      return;
    }

    // Build comparison view
    comparisonSlider.innerHTML = '';
    comparisonSlider.style.position = 'relative';
    comparisonSlider.style.overflow = 'hidden';
    comparisonSlider.style.aspectRatio = '16/10';

    if (state.compareImg1 && state.compareImg2) {
      // Full comparison with slider
      const afterContainer = document.createElement('div');
      afterContainer.style.cssText = 'position:absolute;inset:0;';
      const afterImg = document.createElement('img');
      afterImg.src = state.compareImg2;
      afterImg.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      afterImg.alt = 'Sonraki';
      afterContainer.appendChild(afterImg);

      const beforeContainer = document.createElement('div');
      beforeContainer.style.cssText = 'position:absolute;inset:0;width:50%;overflow:hidden;border-right:3px solid var(--accent);z-index:2;';
      beforeContainer.id = 'beforeContainer';
      const beforeImg = document.createElement('img');
      beforeImg.src = state.compareImg1;
      beforeImg.style.cssText = `width:${comparisonSlider.offsetWidth}px;height:100%;object-fit:cover;`;
      beforeImg.alt = 'Önceki';
      beforeContainer.appendChild(beforeImg);

      // Labels
      const labelBefore = createLabel('Önceki', 'left');
      const labelAfter = createLabel('Sonraki', 'right');

      // Slider handle
      const handle = document.createElement('div');
      handle.style.cssText = `
        position:absolute;top:0;bottom:0;width:3px;background:var(--accent);z-index:3;
        left:50%;transform:translateX(-50%);cursor:ew-resize;
      `;
      const circle = document.createElement('div');
      circle.style.cssText = `
        position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
        width:36px;height:36px;background:var(--accent);border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:14px;color:#fff;
      `;
      circle.textContent = '⟷';
      handle.appendChild(circle);

      comparisonSlider.appendChild(afterContainer);
      comparisonSlider.appendChild(beforeContainer);
      comparisonSlider.appendChild(handle);
      comparisonSlider.appendChild(labelBefore);
      comparisonSlider.appendChild(labelAfter);

      // Slider interaction
      let isDragging = false;
      const startDrag = () => isDragging = true;
      const stopDrag = () => isDragging = false;
      const onDrag = (clientX) => {
        if (!isDragging) return;
        const rect = comparisonSlider.getBoundingClientRect();
        let x = clientX - rect.left;
        x = Math.max(0, Math.min(x, rect.width));
        const pct = (x / rect.width) * 100;
        beforeContainer.style.width = pct + '%';
        handle.style.left = pct + '%';
      };

      handle.addEventListener('mousedown', startDrag);
      handle.addEventListener('touchstart', startDrag, { passive: true });
      window.addEventListener('mousemove', (e) => onDrag(e.clientX));
      window.addEventListener('touchmove', (e) => onDrag(e.touches[0].clientX), { passive: true });
      window.addEventListener('mouseup', stopDrag);
      window.addEventListener('touchend', stopDrag);

    } else {
      // Only one image uploaded
      const singleSrc = state.compareImg1 || state.compareImg2;
      const label = state.compareImg1 ? 'Önceki' : 'Sonraki';
      const img = document.createElement('img');
      img.src = singleSrc;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      img.alt = label;
      comparisonSlider.appendChild(img);

      const tag = createLabel(label, 'left');
      comparisonSlider.appendChild(tag);

      const hint = document.createElement('div');
      hint.style.cssText = `
        position:absolute;bottom:12px;right:12px;
        background:rgba(0,0,0,0.7);color:var(--text-secondary);
        padding:6px 12px;border-radius:6px;font-size:12px;
      `;
      hint.textContent = state.compareImg1 ? 'Sonraki fotoğrafı da yükleyin' : 'Önceki fotoğrafı da yükleyin';
      comparisonSlider.appendChild(hint);
    }
  }

  function createLabel(text, side) {
    const label = document.createElement('div');
    label.style.cssText = `
      position:absolute;top:12px;${side}:12px;
      background:rgba(0,0,0,0.7);color:#fff;
      padding:4px 10px;border-radius:6px;font-size:12px;
      font-weight:600;z-index:4;
    `;
    label.textContent = text;
    return label;
  }

  // ---------- Public API ----------
  function getAndClearImages() {
    const imgs = [...state.chatImages];
    state.chatImages = [];
    renderPreviews();
    return imgs;
  }

  function hasImages() {
    return state.chatImages.length > 0;
  }

  return { init, getAndClearImages, hasImages };
})();
