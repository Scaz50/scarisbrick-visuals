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

// Nav underline hover
const navBar = document.querySelector('nav');
if (navBar) {
  const navLinks = Array.from(navBar.querySelectorAll('a')).filter(
    link => !link.closest('.dropdown')
  );
  let activeLink = null;

  const updateUnderline = link => {
    const navRect = navBar.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    navBar.style.setProperty('--underline-left', `${linkRect.left - navRect.left}px`);
    navBar.style.setProperty('--underline-width', `${linkRect.width}px`);
    navBar.classList.add('is-underline');
  };

  const clearUnderline = () => {
    if (activeLink) {
      updateUnderline(activeLink);
      return;
    }
    navBar.classList.remove('is-underline');
    navBar.style.setProperty('--underline-width', '0px');
  };

  const setActiveFromLocation = () => {
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    if (currentPath.endsWith('-gallery.html')) {
      const portfolioLink = navLinks.find(link => {
        const href = link.getAttribute('href') || '';
        return href === 'index.html#portfolio' || href === '#portfolio';
      });
      if (portfolioLink) {
        activeLink = portfolioLink;
        updateUnderline(portfolioLink);
        return;
      }
    }
    const match = navLinks.find(link => {
      const href = link.getAttribute('href') || '';
      return href === currentPath || (currentPath === 'index.html' && href === 'index.html');
    });
    if (match) {
      activeLink = match;
      updateUnderline(match);
    }
  };

  const setActiveFromScroll = () => {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    if (path !== 'index.html') return;
    const sections = ['portfolio', 'about']
      .map(id => document.getElementById(id))
      .filter(Boolean);
    let current = 'home';
    const marker = navBar.offsetHeight + 20;
    sections.forEach(section => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= marker && rect.bottom > marker) {
        current = section.id;
      }
    });
    const scrollBottom = window.scrollY + window.innerHeight;
    const docHeight = document.documentElement.scrollHeight;
    if (docHeight - scrollBottom < 80) {
      current = 'about';
    }
    let target = null;
    if (current === 'home') {
      target = navLinks.find(link => link.getAttribute('href') === 'index.html');
    } else {
      target = navLinks.find(link => {
        const href = link.getAttribute('href') || '';
        return href === `#${current}` || href === `index.html#${current}`;
      });
    }
    if (target) {
      activeLink = target;
      updateUnderline(target);
    }
  };

  navLinks.forEach(link => {
    link.addEventListener('mouseenter', () => {
      activeLink = link;
      updateUnderline(link);
    });
    link.addEventListener('focus', () => {
      activeLink = link;
      updateUnderline(link);
    });
  });

  navBar.addEventListener('mouseleave', clearUnderline);
  navBar.addEventListener('focusout', event => {
    if (!navBar.contains(event.relatedTarget)) {
      clearUnderline();
    }
  });

  window.addEventListener('resize', () => {
    if (activeLink) updateUnderline(activeLink);
  });

  setActiveFromLocation();
  window.addEventListener('scroll', setActiveFromScroll, { passive: true });
}

// Mobile scroll reveal for portfolio tiles
const revealCards = Array.from(document.querySelectorAll('.album-card'));
if (revealCards.length > 0 && window.matchMedia('(max-width: 900px)').matches) {
  revealCards.forEach(card => card.classList.add('reveal'));
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );
  revealCards.forEach(card => observer.observe(card));
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

  let touchStartX = 0;
  let touchStartY = 0;
  let touchCurrentX = 0;
  let touchCurrentY = 0;
  let touchActive = false;

  function onTouchStart(event) {
    if (!lightbox.classList.contains('is-open')) return;
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchCurrentX = touchStartX;
    touchCurrentY = touchStartY;
    touchActive = true;
    lightboxImg.style.transition = 'none';
  }

  function onTouchMove(event) {
    if (!touchActive || !lightbox.classList.contains('is-open')) return;
    const touch = event.touches[0];
    touchCurrentX = touch.clientX;
    touchCurrentY = touch.clientY;
    const deltaX = touchCurrentX - touchStartX;
    const deltaY = touchCurrentY - touchStartY;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      lightboxImg.style.transform = `translateX(${deltaX}px)`;
    }
  }

  function onTouchEnd(event) {
    if (!touchActive || !lightbox.classList.contains('is-open')) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    touchActive = false;
    lightboxImg.style.transition = '';
    lightboxImg.style.transform = '';

    if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 40) {
      if (deltaX > 0) {
        stepLightbox(-1);
      } else {
        stepLightbox(1);
      }
    } else if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) {
      stepLightbox(1);
    }
  }

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

  lightboxImg.addEventListener('touchstart', onTouchStart, { passive: true });
  lightboxImg.addEventListener('touchmove', onTouchMove, { passive: true });
  lightboxImg.addEventListener('touchend', onTouchEnd);
}
