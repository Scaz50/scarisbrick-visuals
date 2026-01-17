function initExifFilters(data) {
  const gallery = document.querySelector('.gallery');
  const portfolio = document.querySelector('#portfolio');
  const portfolioGrid = portfolio ? portfolio.querySelector('.portfolio-sections') : null;
  const grid = gallery ? gallery.querySelector('.grid') : null;
  if ((gallery && !grid) || (!gallery && !portfolioGrid)) return;
  const isPortfolio = Boolean(portfolioGrid && !gallery);
  let allCaptionsByKey = window.allGalleryCaptionsByKey || {};

  const normalizePath = value => {
    if (!value) return '';
    const normalized = decodeURIComponent(String(value)).replace(/\\/g, '/');
    const imagesIndex = normalized.toLowerCase().lastIndexOf('/images/');
    if (imagesIndex >= 0) {
      return normalized.slice(imagesIndex + 1).toLowerCase();
    }
    return normalized.replace(/^\/+/, '').toLowerCase();
  };

  const exifByPath = new Map();
  data.forEach(entry => {
    if (!entry || !entry.SourceFile) return;
    const key = normalizePath(entry.SourceFile);
    if (key) {
      exifByPath.set(key, entry);
    }
  });

  const buildImageItem = img => {
    const src = img.getAttribute('src') || '';
    const key = normalizePath(src);
    const exif = exifByPath.get(key) || null;
    const target = img.closest('.gallery-item') || img;
    return { target, exifEntries: exif ? [exif] : [] };
  };

  const buildAlbumItem = card => {
    const link = card.querySelector('.album-link');
    const img = card.querySelector('img');
    const images = (link && link.dataset.images ? link.dataset.images : img ? img.getAttribute('src') : '')
      .split('|')
      .map(src => src.trim())
      .filter(Boolean);
    const exifEntries = images
      .map(src => exifByPath.get(normalizePath(src)))
      .filter(Boolean);
    return { target: card, exifEntries };
  };

  const items = gallery
    ? Array.from(grid.querySelectorAll('img')).map(buildImageItem)
    : Array.from(portfolioGrid.querySelectorAll('.album-card')).map(buildAlbumItem);

  const applyCaptionsFromData = captionsData => {
    if (!captionsData || typeof captionsData !== 'object') return;
    const nextCaptions = {};
    Object.keys(captionsData).forEach(pageKey => {
      const entries = captionsData[pageKey];
      if (!entries || typeof entries !== 'object') return;
      Object.keys(entries).forEach(pathKey => {
        const key = normalizePath(pathKey);
        if (key) {
          nextCaptions[key] = entries[pathKey];
        }
      });
    });
    allCaptionsByKey = nextCaptions;
    window.allGalleryCaptionsByKey = nextCaptions;
  };

  const portfolioImages = isPortfolio
    ? (() => {
        const imageMap = new Map();
        Array.from(portfolioGrid.querySelectorAll('.album-link')).forEach(link => {
          const fallback = link.querySelector('img');
          const images = (link.dataset.images || (fallback ? fallback.getAttribute('src') : ''))
            .split('|')
            .map(src => src.trim())
            .filter(Boolean);
          images.forEach(src => {
            const key = normalizePath(src);
            if (!key || imageMap.has(key)) return;
            imageMap.set(key, { src, exif: exifByPath.get(key) || null });
          });
        });
        return Array.from(imageMap.values());
      })()
    : [];

  const cameraValues = new Set();
  const lensValues = new Set();
  items.forEach(({ exifEntries }) => {
    exifEntries.forEach(exif => {
      const camera = [exif.Make, exif.Model].filter(Boolean).join(' ');
      if (camera) cameraValues.add(camera);
      const lens = exif.LensModel || exif.LensID;
      if (lens) lensValues.add(lens);
    });
  });

  const filters = document.createElement('div');
  filters.className = 'exif-filters';
  filters.innerHTML = `
    <div class="exif-filters-header">
      <h3>Filter portfolio by Lens</h3>
      <button type="button" class="exif-reset">Reset filters</button>
    </div>
    <div class="exif-filters-grid">
      <label class="exif-lens-filter">
        <div class="exif-lens-buttons" role="group" aria-label="Lens"></div>
        <input type="hidden" name="lens" value="">
      </label>
    </div>
  `;

  const filterToggle = document.createElement('button');
  filterToggle.type = 'button';
  filterToggle.className = 'exif-filters-toggle';
  const setFilterToggleLabel = () => {
    const isVisible = document.body.classList.contains('show-exif-filters');
    filterToggle.textContent = isVisible ? 'Hide lens filters' : 'Show lens filters';
  };
  setFilterToggleLabel();
  filterToggle.addEventListener('click', () => {
    document.body.classList.toggle('show-exif-filters');
    setFilterToggleLabel();
  });

  const heading = gallery ? gallery.querySelector('h2') : portfolio.querySelector('h2');
  if (heading) {
    heading.insertAdjacentElement('afterend', filterToggle);
    filterToggle.insertAdjacentElement('afterend', filters);
  } else {
    (gallery || portfolio).prepend(filters);
    filters.insertAdjacentElement('beforebegin', filterToggle);
  }

  const summary = document.createElement('p');
  summary.className = 'exif-summary';
  summary.innerHTML = `Showing <span class="exif-visible-count">${items.length}</span> of ${items.length}`;
  const summaryTarget = gallery ? grid : portfolioGrid;
  summaryTarget.insertAdjacentElement('beforebegin', summary);

  let matches = null;
  let matchesGrid = null;
  let matchesEmpty = null;
  if (isPortfolio) {
    matches = document.createElement('div');
    matches.className = 'exif-matches';
    matches.innerHTML = `
      <p class="exif-matches-empty">Select filters to preview matching images.</p>
      <div class="exif-matches-grid"></div>
    `;
    summary.insertAdjacentElement('afterend', matches);
    matchesGrid = matches.querySelector('.exif-matches-grid');
    matchesEmpty = matches.querySelector('.exif-matches-empty');
  }

  const lensGroups = new Map([
    ['Mavic2Pro 28mm', ['28.0 mm f/2.8', '28.0 mm f/2.8-11.0']]
  ]);
  const lensLabels = new Map([
    ['NIKKOR Z 14-24mm f/2.8 S', 'Z 14-24mm f/2.8 S'],
    ['NIKKOR Z 24-70mm f/2.8 S', 'Z 24-70mm f/2.8 S'],
    ['NIKKOR Z 70-200mm f/2.8 VR S', 'Z 70-200mm f/2.8 VR S'],
    ['NIKKOR Z 85mm f/1.8 S', 'Z 85mm f/1.8 S'],
    ['NIKKOR Z 100-400mm f/4.5-5.6 VR S', 'Z 100-400mm f/4.5-5.6 VR S'],
    ['NIKKOR Z 180-600mm f/5.6-6.3 VR', 'Z 180-600mm f/5.6-6.3 VR']
  ]);
  const lensOrder = [
    'NIKKOR Z 14-24mm f/2.8 S',
    'NIKKOR Z 24-70mm f/2.8 S',
    'NIKKOR Z 70-200mm f/2.8 VR S',
    'NIKKOR Z 85mm f/1.8 S',
    'NIKKOR Z 100-400mm f/4.5-5.6 VR S',
    'NIKKOR Z 180-600mm f/5.6-6.3 VR'
  ];
  const lensButtons = filters.querySelector('.exif-lens-buttons');
  const lensInput = filters.querySelector('[name="lens"]');
  const groupedLensValues = new Set(Array.from(lensGroups.values()).flat());
  const lensesToRender = [
    ...Array.from(lensGroups.keys()).filter(label => lensGroups.get(label).some(value => lensValues.has(value))),
    ...lensOrder.filter(value => lensValues.has(value)),
    ...Array.from(lensValues)
      .filter(value => !groupedLensValues.has(value) && !lensOrder.includes(value))
      .sort()
  ];

  lensesToRender.forEach(value => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'exif-lens-button';
    button.dataset.value = value;
    button.textContent = lensLabels.get(value) || value;
    button.setAttribute('aria-pressed', 'false');
    lensButtons.appendChild(button);
  });

  const inputs = Array.from(filters.querySelectorAll('input, select'));
  const toNumber = value => {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const isFilterActive = values =>
    Object.values(values).some(value => value !== null && value !== '');

  const applyFilters = () => {
    const values = {
      lens: lensInput ? lensInput.value : ''
    };

    const active = isFilterActive(values);
    let visible = 0;

    const matchesExif = exif => {
      const lens = exif.LensModel || exif.LensID || '';

      if (values.lens) {
        const group = lensGroups.get(values.lens);
        if (group) {
          if (!group.includes(lens)) return false;
        } else if (lens !== values.lens) {
          return false;
        }
      }
      return true;
    };

    let matchImages = [];
    if (isPortfolio && active) {
      matchImages = portfolioImages.filter(item => item.exif && matchesExif(item.exif));
    }

    const hidePortfolioTiles = isPortfolio && active;
    items.forEach(({ target, exifEntries }) => {
      let match = true;
      if (active) {
        match = exifEntries.length > 0 && exifEntries.some(matchesExif);
      }

      if (hidePortfolioTiles) {
        target.style.display = 'none';
      } else {
        target.style.display = match ? '' : 'none';
        if (match) visible += 1;
      }
    });

    if (isPortfolio && matches && matchesGrid && matchesEmpty) {
      matchesGrid.textContent = '';
      if (!active) {
        matchesEmpty.textContent = 'Select filters to preview matching images.';
        matchesEmpty.style.display = '';
        matchesGrid.style.display = 'none';
      } else if (matchImages.length === 0) {
        matchesEmpty.textContent = 'No images match these filters.';
        matchesEmpty.style.display = '';
        matchesGrid.style.display = 'none';
      } else {
        matchesEmpty.style.display = 'none';
        matchesGrid.style.display = 'grid';
        matchImages.forEach(({ src }) => {
          const img = document.createElement('img');
          img.src = src;
          img.alt = 'Filtered image';
          const captionsByKey = window.galleryCaptionsByKey || allCaptionsByKey;
          const captionKey = normalizePath(src);
          if (captionsByKey[captionKey]) {
            img.dataset.caption = captionsByKey[captionKey];
          }
          matchesGrid.appendChild(img);
        });
      }

      const shownImages = active ? matchImages.length : portfolioImages.length;
      summary.innerHTML = `Showing <span class="exif-visible-count">${shownImages}</span> of ${portfolioImages.length} images`;
    } else {
      summary.innerHTML = `Showing <span class="exif-visible-count">${visible}</span> of ${items.length}`;
    }
  };

  inputs.forEach(input => {
    input.addEventListener('input', applyFilters);
    input.addEventListener('change', applyFilters);
  });

  fetch('data/captions.json', { cache: 'no-store' })
    .then(response => (response.ok ? response.json() : null))
    .then(captionsData => {
      if (captionsData) {
        applyCaptionsFromData(captionsData);
        applyFilters();
      }
    })
    .catch(() => {});

  const setActiveLens = value => {
    if (!lensInput || !lensButtons) return;
    lensInput.value = value || '';
    Array.from(lensButtons.querySelectorAll('button')).forEach(button => {
      const isActive = button.dataset.value === lensInput.value;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  };

  if (lensButtons) {
    lensButtons.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button || !lensButtons.contains(button)) return;
      const nextValue = button.dataset.value;
      const shouldClear = lensInput && lensInput.value === nextValue;
      setActiveLens(shouldClear ? '' : nextValue);
      applyFilters();
    });
  }

  filters.querySelector('.exif-reset').addEventListener('click', () => {
    inputs.forEach(input => {
      if (input.tagName === 'SELECT') {
        input.value = '';
      } else {
        input.value = '';
      }
    });
    setActiveLens('');
    applyFilters();
  });

  setActiveLens('');
  applyFilters();
};

// Load EXIF data for future filtering.
fetch('data/exif.json')
  .then(response => {
    if (!response.ok) {
      throw new Error(`Failed to load EXIF data: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    window.exifData = data;
    initExifFilters(data);
  })
  .catch(error => {
    console.warn(error.message);
  });

const initGalleryCaptions = async () => {
  const gallery = document.querySelector('.gallery');
  const grid = gallery ? gallery.querySelector('.grid') : null;
  if (!gallery || !grid) return;

  const pageName = window.location.pathname.split('/').pop() || 'gallery';
  const pageKey = pageName.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
  const storageKey = `galleryCaptions:${pageKey}`;
  const normalizeSrc = value => {
    if (!value) return '';
    const normalized = decodeURIComponent(String(value)).replace(/\\/g, '/');
    const imagesIndex = normalized.toLowerCase().lastIndexOf('/images/');
    if (imagesIndex >= 0) {
      return normalized.slice(imagesIndex + 1).toLowerCase();
    }
    return normalized.replace(/^\/+/, '').toLowerCase();
  };

  let sharedCaptions = {};
  try {
    const response = await fetch('data/captions.json', { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      if (data && typeof data === 'object') {
        if (data[pageName] && typeof data[pageName] === 'object') {
          sharedCaptions = data[pageName];
        } else {
          sharedCaptions = data;
        }
      }
    }
  } catch (error) {
    sharedCaptions = {};
  }

  let localCaptions = {};
  try {
    localCaptions = JSON.parse(localStorage.getItem(storageKey)) || {};
  } catch (error) {
    localCaptions = {};
  }
  let captions = { ...sharedCaptions, ...localCaptions };
  window.galleryCaptionsByKey = captions;

  const toolbar = document.createElement('div');
  toolbar.className = 'caption-editor';
  toolbar.innerHTML = `
    <div class="caption-editor-info">
      <strong>Captions</strong>
      <span class="caption-status">Shared captions loaded. Edits save locally.</span>
    </div>
    <div class="caption-editor-actions">
      <button type="button" class="caption-toggle">Edit captions</button>
      <button type="button" class="caption-export">Download captions</button>
      <button type="button" class="caption-clear">Clear local edits</button>
    </div>
  `;
  const editorToggle = document.createElement('button');
  editorToggle.type = 'button';
  editorToggle.className = 'caption-editor-toggle';
  const setEditorToggleLabel = () => {
    const isVisible = document.body.classList.contains('show-caption-editor');
    editorToggle.textContent = isVisible ? 'Hide caption tools' : 'Show caption tools';
  };
  setEditorToggleLabel();
  editorToggle.addEventListener('click', () => {
    document.body.classList.toggle('show-caption-editor');
    setEditorToggleLabel();
  });
  grid.insertAdjacentElement('beforebegin', editorToggle);
  editorToggle.insertAdjacentElement('afterend', toolbar);

  const captionEntries = [];
  const updateEmptyState = caption => {
    const empty = !caption.textContent.trim();
    caption.classList.toggle('is-empty', empty);
  };

  const images = Array.from(grid.querySelectorAll('img'));
  images.forEach(img => {
    const existingFigure = img.closest('figure.gallery-item');
    if (existingFigure) return;

    const figure = document.createElement('figure');
    figure.className = 'gallery-item';
    const key = normalizeSrc(img.getAttribute('src'));
    figure.dataset.captionKey = key;

    const caption = document.createElement('figcaption');
    caption.className = 'gallery-caption';
    caption.textContent = captions[key] || '';
    updateEmptyState(caption);
    img.dataset.caption = caption.textContent;

    img.parentNode.insertBefore(figure, img);
    figure.appendChild(img);
    figure.appendChild(caption);
    captionEntries.push({ caption, key, img });
  });

  const saveCaptions = () => {
    localStorage.setItem(storageKey, JSON.stringify(localCaptions));
  };

  let isEditing = false;
  const toggleButton = toolbar.querySelector('.caption-toggle');
  const exportButton = toolbar.querySelector('.caption-export');
  const clearButton = toolbar.querySelector('.caption-clear');
  const status = toolbar.querySelector('.caption-status');

  const updateEditingState = nextState => {
    isEditing = nextState;
    gallery.classList.toggle('caption-editing', isEditing);
    toggleButton.textContent = isEditing ? 'Done editing' : 'Edit captions';
    captionEntries.forEach(({ caption }) => {
      caption.setAttribute('contenteditable', isEditing ? 'true' : 'false');
      caption.setAttribute('role', 'textbox');
      caption.setAttribute('aria-label', 'Caption');
      updateEmptyState(caption);
    });
  };

  captionEntries.forEach(({ caption, key, img }) => {
    caption.addEventListener('input', () => {
      const value = caption.textContent.trim();
      if (value) {
        localCaptions[key] = value;
      } else {
        delete localCaptions[key];
      }
      captions = { ...sharedCaptions, ...localCaptions };
      window.galleryCaptionsByKey = captions;
      if (img) {
        img.dataset.caption = value;
      }
      updateEmptyState(caption);
      saveCaptions();
      status.textContent = 'Saved locally. Download to publish.';
    });
  });

  toggleButton.addEventListener('click', () => {
    updateEditingState(!isEditing);
  });

  exportButton.addEventListener('click', () => {
    const data = JSON.stringify(captions, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `captions-${pageKey}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });

  clearButton.addEventListener('click', () => {
    if (!window.confirm('Clear local caption edits for this gallery?')) return;
    localCaptions = {};
    captions = { ...sharedCaptions };
    window.galleryCaptionsByKey = captions;
    captionEntries.forEach(({ caption, img }) => {
      caption.textContent = '';
      updateEmptyState(caption);
      if (img) {
        img.dataset.caption = '';
      }
    });
    saveCaptions();
    status.textContent = 'Local edits cleared.';
  });

  updateEditingState(false);
};

initGalleryCaptions();

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
      let frame = link.querySelector('.album-image-frame');
      let currentImg = img;
      let nextImg = link.querySelector('img.is-next');
      if (!frame) {
        frame = document.createElement('span');
        frame.className = 'album-image-frame';
        currentImg.classList.add('album-image', 'is-current');
        currentImg.parentNode.insertBefore(frame, currentImg);
        frame.appendChild(currentImg);
        nextImg = currentImg.cloneNode(false);
        nextImg.classList.add('album-image', 'is-next');
        frame.appendChild(nextImg);
      } else {
        currentImg.classList.add('album-image', 'is-current');
        if (nextImg) nextImg.classList.add('album-image', 'is-next');
      }
      const loaded = new Set();
      images.forEach(src => {
        const preload = new Image();
        preload.onload = () => loaded.add(src);
        preload.src = src;
      });
      return { frame, currentImg, nextImg, images, loaded };
    })
    .filter(Boolean);

  if (albums.length > 0) {
    const displayDuration = 6400;
    const slideDuration = 600;
    let globalIndex = 0;

    const ensureLoaded = (src, loaded) =>
      new Promise(resolve => {
        if (loaded.has(src)) {
          resolve(true);
          return;
        }
        const preload = new Image();
        preload.onload = () => {
          loaded.add(src);
          resolve(true);
        };
        preload.onerror = () => resolve(false);
        preload.src = src;
      });

    const ensureDecoded = img =>
      new Promise(resolve => {
        if (!img) {
          resolve();
          return;
        }
        if (img.decode) {
          img.decode().then(resolve).catch(resolve);
          return;
        }
        if (img.complete) {
          resolve();
          return;
        }
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });

    const advanceAlbums = async () => {
      globalIndex += 1;
      const nextBatch = albums.map(album => {
        const next = globalIndex % album.images.length;
        return { album, src: album.images[next] };
      });

      await Promise.all(
        nextBatch.map(({ album, src }) => ensureLoaded(src, album.loaded))
      );

      nextBatch.forEach(({ album, src }) => {
        if (album.nextImg) album.nextImg.src = src;
      });
      await Promise.all(nextBatch.map(({ album }) => ensureDecoded(album.nextImg)));
      albums.forEach(({ frame }) => frame.classList.add('is-sliding'));
      setTimeout(() => {
        nextBatch.forEach(({ album }) => {
          if (!album.currentImg || !album.nextImg) return;
          album.currentImg.classList.remove('is-current');
          album.currentImg.classList.add('is-next');
          album.nextImg.classList.remove('is-next');
          album.nextImg.classList.add('is-current');
          [album.currentImg, album.nextImg] = [album.nextImg, album.currentImg];
        });
        albums.forEach(({ frame }) => {
          frame.classList.add('is-resetting');
          frame.classList.remove('is-sliding');
          void frame.offsetWidth;
          frame.classList.remove('is-resetting');
        });
      }, slideDuration);
    };

    const scheduleNext = async () => {
      await new Promise(resolve => setTimeout(resolve, displayDuration));
      await advanceAlbums();
      scheduleNext();
    };

    scheduleNext();
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
const hasLightboxTargets = Boolean(document.querySelector('.grid') || document.querySelector('.album-card'));
if (hasLightboxTargets) {
  const lightbox = document.createElement('div');
  lightbox.className = 'lightbox';
  lightbox.setAttribute('aria-hidden', 'true');
  lightbox.innerHTML = `
    <button class="lightbox-close" aria-label="Close">X</button>
    <button class="lightbox-prev" aria-label="Previous">&lt;</button>
    <img src="" alt="Gallery image" />
    <div class="lightbox-caption" aria-live="polite"></div>
    <button class="lightbox-next" aria-label="Next">&gt;</button>
  `;
  document.body.appendChild(lightbox);

  const lightboxImg = lightbox.querySelector('img');
  const lightboxCaption = lightbox.querySelector('.lightbox-caption');
  const closeBtn = lightbox.querySelector('.lightbox-close');
  const prevBtn = lightbox.querySelector('.lightbox-prev');
  const nextBtn = lightbox.querySelector('.lightbox-next');
  let currentIndex = 0;
  let galleryImages = [];

  const getLightboxImages = () =>
    Array.from(document.querySelectorAll('.grid img, .exif-matches-grid img'));

  const normalizeCaptionKey = value => {
    if (!value) return '';
    const normalized = decodeURIComponent(String(value)).replace(/\\/g, '/');
    const imagesIndex = normalized.toLowerCase().lastIndexOf('/images/');
    if (imagesIndex >= 0) {
      return normalized.slice(imagesIndex + 1).toLowerCase();
    }
    return normalized.replace(/^\/+/, '').toLowerCase();
  };

  const getCaptionForImage = target => {
    if (!target) return '';
    const datasetCaption = target.getAttribute('data-caption') || '';
    if (datasetCaption.trim()) return datasetCaption.trim();
    const figure = target.closest('figure');
    if (figure) {
      const figcaption = figure.querySelector('.gallery-caption');
      if (figcaption && figcaption.textContent.trim()) {
        return figcaption.textContent.trim();
      }
    }
    const captionsByKey = window.galleryCaptionsByKey || window.allGalleryCaptionsByKey || {};
    const fullSrc = target.getAttribute('data-full') || target.getAttribute('src');
    const key = normalizeCaptionKey(fullSrc);
    return captionsByKey[key] || '';
  };

  const setLightboxCaption = target => {
    if (!lightboxCaption) return;
    const caption = getCaptionForImage(target);
    lightboxCaption.textContent = caption;
    lightboxCaption.classList.toggle('is-empty', !caption);
  };

  function openLightbox(index, images) {
    galleryImages = images || getLightboxImages();
    if (galleryImages.length === 0) return;
    currentIndex = index;
    const target = galleryImages[currentIndex];
    const fullSrc = target.getAttribute('data-full') || target.getAttribute('src');
    const alt = target.getAttribute('alt') || 'Gallery image';
    lightboxImg.setAttribute('src', fullSrc);
    lightboxImg.setAttribute('alt', alt);
    setLightboxCaption(target);
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
    if (galleryImages.length === 0) return;
    currentIndex = (currentIndex + delta + galleryImages.length) % galleryImages.length;
    const target = galleryImages[currentIndex];
    const fullSrc = target.getAttribute('data-full') || target.getAttribute('src');
    const alt = target.getAttribute('alt') || 'Gallery image';
    lightboxImg.setAttribute('src', fullSrc);
    lightboxImg.setAttribute('alt', alt);
    setLightboxCaption(target);
  }

  document.addEventListener('click', event => {
    const target = event.target.closest('.grid img, .exif-matches-grid img');
    if (!target) return;
    const images = getLightboxImages();
    const index = images.indexOf(target);
    if (index === -1) return;
    openLightbox(index, images);
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
