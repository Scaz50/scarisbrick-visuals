const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'data');
const tagsDir = path.join(dataDir, 'tags');
const allTagsPath = path.join(tagsDir, 'all-tags.json');
const exifPath = path.join(dataDir, 'exif.json');
const captionsPath = path.join(dataDir, 'captions.json');
const galleryMetaPath = path.join(dataDir, 'gallery-meta.json');
const imagesIndexPath = path.join(dataDir, 'images.json');
const galleryTemplatePath = path.join(__dirname, 'templates', 'gallery.html');
const indexPath = path.join(root, 'index.html');

const GA_ID = 'G-WDYT5EG89R';

const readJson = (filePath, fallback) => {
  if (!fs.existsSync(filePath)) return fallback;
  const raw = fs.readFileSync(filePath, 'utf8');
  if (!raw.trim()) return fallback;
  return JSON.parse(raw);
};

const writeJson = (filePath, payload) => {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
};

const normalizeImagePath = value => {
  if (!value) return '';
  const normalized = decodeURIComponent(String(value)).replace(/\\/g, '/');
  const index = normalized.toLowerCase().lastIndexOf('/images/');
  const trimmed = index >= 0 ? normalized.slice(index + 1) : normalized.replace(/^\/+/, '');
  return trimmed.toLowerCase();
};

const encodePath = value =>
  value
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');

const normalizeTagKey = value =>
  String(value)
    .trim()
    .replace(/^#+/, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();

const EXCLUDE_TAG = normalizeTagKey('Exclude');

const titleCaseWord = word => {
  if (!word) return '';
  if (word.length === 1) return word.toUpperCase();
  return `${word[0].toUpperCase()}${word.slice(1)}`;
};

const formatTagLabel = value => {
  const trimmed = String(value).trim().replace(/^#+/, '').replace(/\s+/g, ' ');
  if (!trimmed) return '';
  if (trimmed === trimmed.toLowerCase()) {
    return trimmed
      .split(' ')
      .map(word => word.split('-').map(titleCaseWord).join('-'))
      .join(' ');
  }
  return trimmed;
};

const slugify = value =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const escapeHtml = value =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const srcExists = value => {
  if (!value) return false;
  const decoded = decodeURIComponent(String(value)).replace(/\//g, path.sep);
  const filePath = path.join(root, decoded);
  return fs.existsSync(filePath);
};

const filenameKey = value => {
  if (!value) return '';
  const normalized = decodeURIComponent(String(value)).replace(/\\/g, '/');
  const parts = normalized.split('/');
  return (parts[parts.length - 1] || '').toLowerCase();
};

const dedupeByFilename = items => {
  const seen = new Set();
  const result = [];
  items.forEach(item => {
    const key = filenameKey(item.src || item.normalized);
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push(item);
  });
  return result;
};

const parseTagList = value => {
  if (!value) return [];
  return String(value)
    .split(/[,;\n]+/)
    .map(tag => tag.trim())
    .filter(Boolean);
};

const exifData = readJson(exifPath, []);
const captionsRaw = readJson(captionsPath, {});
const galleryMetaRaw = readJson(galleryMetaPath, {});
const galleryTemplate = fs.readFileSync(galleryTemplatePath, 'utf8');
const indexHtml = fs.readFileSync(indexPath, 'utf8');

const captionsByPath = {};
Object.keys(captionsRaw || {}).forEach(pageKey => {
  const pageEntries = captionsRaw[pageKey] || {};
  Object.keys(pageEntries).forEach(imagePath => {
    const normalized = normalizeImagePath(imagePath);
    if (normalized) captionsByPath[normalized] = pageEntries[imagePath];
  });
});

const tagLabelByKey = new Map();
const tagsByImage = new Map();
const slugToTagKey = new Map();
const tagOverrides = new Set();
const hasGlobalTags = fs.existsSync(allTagsPath);

const listTagFiles = () => {
  if (!fs.existsSync(tagsDir)) return [];
  return fs
    .readdirSync(tagsDir)
    .filter(file => file.toLowerCase().endsWith('.json') && file.toLowerCase() !== 'all-tags.json');
};

const tagFileToPage = fileName => {
  const base = fileName.replace(/^tags-/, '').replace(/\.json$/i, '');
  if (base.toLowerCase().endsWith('-html')) {
    return `${base.slice(0, -5)}.html`;
  }
  return base;
};

if (!hasGlobalTags) {
  listTagFiles().forEach(file => {
    const page = tagFileToPage(file);
    if (page) tagOverrides.add(page);
  });
}

const galleryMetaByKey = new Map();
Object.keys(galleryMetaRaw || {}).forEach(label => {
  const entry = galleryMetaRaw[label] || {};
  const key = normalizeTagKey(label);
  if (!key) return;
  galleryMetaByKey.set(key, { ...entry, title: entry.title || label });
  if (!tagLabelByKey.has(key)) {
    tagLabelByKey.set(key, formatTagLabel(entry.title || label));
  }
  if (entry.slug) {
    slugToTagKey.set(entry.slug, key);
  }
});
const allPhotosMeta = galleryMetaByKey.get(normalizeTagKey('All Photos')) || {};
const allPhotosTagKey = normalizeTagKey(allPhotosMeta.title || 'All Photos');
const defaultAllTagKey = normalizeTagKey('All');

const seedTagsFromGalleryFiles = () => {
  const galleryFiles = fs
    .readdirSync(root)
    .filter(file => file.toLowerCase().endsWith('-gallery.html'));
  galleryFiles.forEach(file => {
    if (hasGlobalTags) return;
    if (tagOverrides.has(file)) return;
    const slug = file.replace(/-gallery\.html$/i, '');
    let key = slugToTagKey.get(slug);
    let label = key ? tagLabelByKey.get(key) : '';
    const html = fs.readFileSync(path.join(root, file), 'utf8');

    if (!key) {
      const headingMatch = html.match(/<h2>([^<]+)<\/h2>/i);
      if (headingMatch) {
        const raw = headingMatch[1].replace(/\s+Gallery\s*$/i, '').trim();
        key = normalizeTagKey(raw);
        label = formatTagLabel(raw);
        if (key && label && !tagLabelByKey.has(key)) {
          tagLabelByKey.set(key, label);
        }
      }
    }

    if (!key) return;

    const imgMatches = Array.from(html.matchAll(/<img\s+[^>]*src="([^"]+)"/gi));
    imgMatches.forEach(match => {
      const src = match[1];
      const normalized = normalizeImagePath(src);
      if (!normalized) return;
      const current = tagsByImage.get(normalized) || new Set();
      current.add(key);
      tagsByImage.set(normalized, current);
    });
  });
};

if (hasGlobalTags) {
  const tagsPayload = readJson(allTagsPath, {});
  Object.keys(tagsPayload || {}).forEach(imagePath => {
    const rawTags = parseTagList(tagsPayload[imagePath]);
    const normalizedImage = normalizeImagePath(imagePath);
    if (!normalizedImage || rawTags.length === 0) return;
    const current = tagsByImage.get(normalizedImage) || new Set();
    rawTags.forEach(rawTag => {
      const key = normalizeTagKey(rawTag);
      if (!key) return;
      current.add(key);
      if (!tagLabelByKey.has(key)) {
        tagLabelByKey.set(key, formatTagLabel(rawTag));
      }
    });
    tagsByImage.set(normalizedImage, current);
  });
} else {
  seedTagsFromGalleryFiles();

  if (fs.existsSync(tagsDir)) {
    fs.readdirSync(tagsDir)
      .filter(file => file.toLowerCase().endsWith('.json'))
      .forEach(file => {
        const tagsPayload = readJson(path.join(tagsDir, file), {});
        Object.keys(tagsPayload || {}).forEach(imagePath => {
          const rawTags = parseTagList(tagsPayload[imagePath]);
          const normalizedImage = normalizeImagePath(imagePath);
          if (!normalizedImage || rawTags.length === 0) return;
          const current = tagsByImage.get(normalizedImage) || new Set();
          rawTags.forEach(rawTag => {
            const key = normalizeTagKey(rawTag);
            if (!key) return;
            current.add(key);
            if (!tagLabelByKey.has(key)) {
              tagLabelByKey.set(key, formatTagLabel(rawTag));
            }
          });
          tagsByImage.set(normalizedImage, current);
        });
      });
  }
}

const images = [];
const imagesByTag = new Map();

exifData.forEach(entry => {
  if (!entry || entry.Error || !entry.SourceFile) return;
  const source = String(entry.SourceFile).replace(/\\/g, '/');
  const index = source.toLowerCase().lastIndexOf('/images/');
  if (index === -1) return;
  const relative = source.slice(index + 1);
  const absolutePath = path.join(root, relative);
  if (!fs.existsSync(absolutePath)) return;
  const normalized = normalizeImagePath(relative);
  if (!normalized) return;
  const src = encodePath(relative);
  const tagKeys = Array.from(tagsByImage.get(normalized) || []);
  const tagLabels = tagKeys.map(key => tagLabelByKey.get(key) || key);
  const caption = captionsByPath[normalized] || '';

  const record = {
    src,
    normalized,
    caption,
    tags: tagLabels,
    tagKeys,
    date: entry.DateTimeOriginal || entry.CreateDate || '',
    camera: [entry.Make, entry.Model].filter(Boolean).join(' ').trim(),
    lens: entry.LensModel || entry.LensID || ''
  };

  images.push(record);

  tagKeys.forEach(key => {
    if (!imagesByTag.has(key)) {
      imagesByTag.set(key, []);
    }
    imagesByTag.get(key).push(record);
  });
});

const allPhotosKey = '__all__';
const allPhotosImages = images.filter(item => !item.tagKeys.includes(EXCLUDE_TAG));
imagesByTag.set(allPhotosKey, allPhotosImages);

writeJson(imagesIndexPath, images);

const tagEntries = Array.from(imagesByTag.keys())
  .filter(key => key !== EXCLUDE_TAG)
  .filter(key => key !== defaultAllTagKey)
  .filter(key => key === allPhotosKey || key !== allPhotosTagKey)
  .map(key => {
    const meta = key === allPhotosKey ? allPhotosMeta : galleryMetaByKey.get(key) || {};
    const label = meta.title || tagLabelByKey.get(key) || key;
    const slug = meta.slug || slugify(label);
    return {
      key,
      label,
      slug,
      description: meta.description || '',
      cover: meta.cover || '',
      order: Number.isFinite(meta.order) ? meta.order : 9999,
      hidden: Boolean(meta.hidden)
    };
  })
  .filter(entry => !entry.hidden)
  .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));

const exifByPath = new Map();
const getExifDimensions = exif => {
  if (!exif || typeof exif !== 'object') return null;
  const width = exif.ImageWidth || exif.ExifImageWidth || exif.SourceImageWidth;
  const height = exif.ImageHeight || exif.ExifImageHeight || exif.SourceImageHeight;
  if (!width || !height) return null;
  return { width, height };
};

exifData.forEach(entry => {
  if (!entry || !entry.SourceFile) return;
  const key = normalizeImagePath(entry.SourceFile);
  if (!key) return;
  exifByPath.set(key, entry);
});

const navItemsHtml = tagEntries
  .map(entry => `            <a href="${entry.slug}-gallery.html">${escapeHtml(entry.label)}</a>`)
  .join('\n\n');

const buildGalleryImages = (tag, items) =>
  dedupeByFilename(items)
    .map((item, index) => {
      const altText = item.caption ? item.caption : `${tag.label} ${index + 1}`;
      const fetchPriority = index < 8 ? ' fetchpriority="high"' : '';
      const exif = exifByPath.get(item.normalized);
      const dimensions = getExifDimensions(exif);
      const sizeAttrs = dimensions ? ` width="${dimensions.width}" height="${dimensions.height}"` : '';
      return `            <img src="${item.src}" alt="${escapeHtml(altText)}" loading="lazy" decoding="async"${fetchPriority}${sizeAttrs}>`;
    })
    .join('\n');

tagEntries.forEach(tag => {
  const items = imagesByTag.get(tag.key) || [];
  if (items.length === 0) return;
  const galleryHtml = galleryTemplate
    .replace(/{{GA_ID}}/g, GA_ID)
    .replace(/{{NAV_ITEMS}}/g, navItemsHtml)
    .replace(/{{GALLERY_TITLE}}/g, escapeHtml(tag.label))
    .replace(/{{GALLERY_HEADING}}/g, escapeHtml(`${tag.label} Gallery`))
    .replace(/{{GALLERY_IMAGES}}/g, buildGalleryImages(tag, items));
  fs.writeFileSync(path.join(root, `${tag.slug}-gallery.html`), galleryHtml, 'utf8');
});

const buildPortfolioCards = () =>
  tagEntries
    .map(tag => {
      const items = dedupeByFilename(imagesByTag.get(tag.key) || []);
      if (items.length === 0) return '';
      const cover = tag.cover && srcExists(tag.cover) ? tag.cover : items[0].src;
      const dataImages = items.map(item => item.src).join('|');
      const description = tag.description || `A selection from the ${tag.label} gallery.`;
      return [
        '            <article class="album-card">',
        `                <a class="album-link" href="${tag.slug}-gallery.html" data-images="${dataImages}">`,
        `                    <img src="${cover}" alt="${escapeHtml(tag.label)} preview">`,
        `                    <span class="album-title">${escapeHtml(tag.label)}</span>`,
        '                </a>',
        '                <div class="album-content">',
        `                    <p>${description}</p>`,
        '                </div>',
        '            </article>'
      ].join('\n');
    })
    .filter(Boolean)
    .join('\n');

const replaceSection = (html, startMarker, endMarker, content) => {
  const startIndex = html.indexOf(startMarker);
  const endIndex = html.indexOf(endMarker);
  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw new Error(`Marker not found: ${startMarker}`);
  }
  const before = html.slice(0, startIndex + startMarker.length);
  const after = html.slice(endIndex);
  return `${before}\n${content}\n${after}`;
};

let nextIndexHtml = replaceSection(
  indexHtml,
  '<!-- GALLERY_NAV_START -->',
  '<!-- GALLERY_NAV_END -->',
  navItemsHtml
);

nextIndexHtml = replaceSection(
  nextIndexHtml,
  '<!-- GALLERY_CARDS_START -->',
  '<!-- GALLERY_CARDS_END -->',
  buildPortfolioCards()
);

fs.writeFileSync(indexPath, nextIndexHtml, 'utf8');

console.log(`Wrote ${images.length} image records to ${imagesIndexPath}`);
console.log(`Generated ${tagEntries.length} gallery pages.`);
