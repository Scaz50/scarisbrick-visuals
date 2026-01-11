// Album preview rotator (home page)
const albumLinks = Array.from(document.querySelectorAll('.album-link'));
if (albumLinks.length > 0) {
  const albums = albumLinks
    .map(link => {
      const img = link.querySelector('img');
      const images = (link.dataset.images || '')
        .split('|')
        .map(src => src.trim())
        .filter(Boolean);
      if (!img || images.length < 2) return null;
      const loaded = new Set();
      images.forEach(src => {
        const preload = new Image();
        preload.onload = () => loaded.add(src);
        preload.src = src;
      });
      return { img, images, loaded };
    })
    .filter(Boolean);

  if (albums.length > 0) {
    const displayDuration = 8000;
    const fadeDuration = 2000;
    let globalIndex = 0;

    setInterval(() => {
      globalIndex += 1;
      albums.forEach(({ img }) => img.classList.add('is-fading'));

      setTimeout(() => {
        albums.forEach(({ img, images, loaded }) => {
          const next = globalIndex % images.length;
          const src = images[next];
          if (loaded.has(src)) {
            img.src = src;
          }
        });
        albums.forEach(({ img }) => img.classList.remove('is-fading'));
      }, fadeDuration);
    }, displayDuration);
  }
}

// Mobile portfolio overlay
const dropdownToggle = document.querySelector('.has-dropdown > a');
const dropdownLinks = Array.from(document.querySelectorAll('.dropdown a'));
if (dropdownToggle && dropdownLinks.length > 0) {
  const overlay = document.createElement('div');
  overlay.className = 'portfolio-overlay';
  overlay.innerHTML = `
    <div class="portfolio-panel" role="dialog" aria-modal="true" aria-label="Portfolio">
      <button class="portfolio-close" type="button" aria-label="Close">×</button>
      <h3>Portfolio</h3>
      <div class="portfolio-list"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const list = overlay.querySelector('.portfolio-list');
  dropdownLinks.forEach(link => {
    const clone = link.cloneNode(true);
    clone.addEventListener('click', () => {
      overlay.classList.remove('is-open');
    });
    list.appendChild(clone);
  });

  const closeBtn = overlay.querySelector('.portfolio-close');
  const closeOverlay = () => overlay.classList.remove('is-open');
  closeBtn.addEventListener('click', closeOverlay);
  overlay.addEventListener('click', event => {
    if (event.target === overlay) {
      closeOverlay();
    }
  });

  dropdownToggle.addEventListener('click', event => {
    if (window.matchMedia('(max-width: 900px)').matches) {
      event.preventDefault();
      overlay.classList.add('is-open');
    }
  });
}

// Gallery lightbox
const galleryImages = Array.from(document.querySelectorAll('.grid img'));
if (galleryImages.length > 0) {
  const lightbox = document.createElement('div');
  lightbox.className = 'lightbox';
  lightbox.setAttribute('aria-hidden', 'true');
  lightbox.innerHTML = `
    <button class="lightbox-close" aria-label="Close">X</button>
    <button class="lightbox-prev" aria-label="Previous">&lt;</button>
    <img src="" alt="Gallery image" />
    <button class="lightbox-next" aria-label="Next">&gt;</button>
  `;
  document.body.appendChild(lightbox);

  const lightboxImg = lightbox.querySelector('img');
  const closeBtn = lightbox.querySelector('.lightbox-close');
  const prevBtn = lightbox.querySelector('.lightbox-prev');
  const nextBtn = lightbox.querySelector('.lightbox-next');
  let currentIndex = 0;

  function openLightbox(index) {
    currentIndex = index;
    const target = galleryImages[currentIndex];
    const fullSrc = target.getAttribute('data-full') || target.getAttribute('src');
    const alt = target.getAttribute('alt') || 'Gallery image';
    lightboxImg.setAttribute('src', fullSrc);
    lightboxImg.setAttribute('alt', alt);
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
  }

  function closeLightbox() {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
  }

  function stepLightbox(delta) {
    currentIndex = (currentIndex + delta + galleryImages.length) % galleryImages.length;
    const target = galleryImages[currentIndex];
    const fullSrc = target.getAttribute('data-full') || target.getAttribute('src');
    const alt = target.getAttribute('alt') || 'Gallery image';
    lightboxImg.setAttribute('src', fullSrc);
    lightboxImg.setAttribute('alt', alt);
  }

  galleryImages.forEach((img, index) => {
    img.addEventListener('click', () => openLightbox(index));
  });

  closeBtn.addEventListener('click', closeLightbox);
  prevBtn.addEventListener('click', () => stepLightbox(-1));
  nextBtn.addEventListener('click', () => stepLightbox(1));

  lightbox.addEventListener('click', event => {
    if (event.target === lightbox) {
      closeLightbox();
    }
  });

  document.addEventListener('keydown', event => {
    if (!lightbox.classList.contains('is-open')) return;
    if (event.key === 'Escape') closeLightbox();
    if (event.key === 'ArrowLeft') stepLightbox(-1);
    if (event.key === 'ArrowRight') stepLightbox(1);
  });
}
