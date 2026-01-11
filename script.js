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
      return { img, images };
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
        albums.forEach(({ img, images }) => {
          const next = globalIndex % images.length;
          img.src = images[next];
        });
        albums.forEach(({ img }) => img.classList.remove('is-fading'));
      }, fadeDuration);
    }, displayDuration);
  }
}

// Mobile nav toggle
const siteNav = document.querySelector('.site-nav');
const menuToggle = document.querySelector('.menu-toggle');
if (siteNav && menuToggle) {
  menuToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });

  siteNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      siteNav.classList.remove('is-open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });

  document.addEventListener('click', event => {
    if (!siteNav.contains(event.target)) {
      siteNav.classList.remove('is-open');
      menuToggle.setAttribute('aria-expanded', 'false');
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
