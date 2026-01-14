document.addEventListener("DOMContentLoaded", async () => {
  const filtersContainer =
    document.getElementById("filters") || document.createElement("div");
  if (!filtersContainer.id) {
    filtersContainer.id = "filters";
    const gallery = document.querySelector(".gallery");
    if (gallery) {
      gallery.insertBefore(filtersContainer, gallery.firstChild.nextSibling);
    }
  }

  const grid = document.querySelector(".grid");
  const images = Array.from(document.querySelectorAll(".grid img"));

  const showUnavailable = () => {
    filtersContainer.innerHTML =
      "<p class=\"filters-unavailable\">Filters unavailable</p>";
  };

  let metadata = [];
  try {
    const response = await fetch("/assets/data/metadata.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Metadata fetch failed");
    metadata = await response.json();
  } catch (error) {
    showUnavailable();
    return;
  }

  const inferGallery = () => {
    const bodyGallery = document.body.dataset.gallery;
    if (bodyGallery) return bodyGallery;
    const firstImg = document.querySelector(".grid img");
    if (!firstImg) return null;
    const pathname = new URL(firstImg.src, window.location.href).pathname;
    const parts = pathname.split("/").filter(Boolean);
    const imagesIndex = parts.indexOf("images");
    if (imagesIndex !== -1 && parts[imagesIndex + 1]) {
      return decodeURIComponent(parts[imagesIndex + 1]);
    }
    return null;
  };

  const galleryName = inferGallery();
  if (!galleryName) {
    showUnavailable();
    return;
  }

  const galleryItems = metadata.filter(item => item.gallery === galleryName);
  if (galleryItems.length === 0) {
    showUnavailable();
    return;
  }

  const normalizeSrc = value =>
  decodeURIComponent(new URL(value, window.location.origin).pathname.replace(/\\/g, "/"));
  const metaBySrc = new Map(
    galleryItems.map(item => [normalizeSrc(item.src), item])
  );
  const imgBySrc = new Map(
    images.map(img => [
      normalizeSrc(new URL(img.src, window.location.href).pathname),
      img,
    ])
  );

  const uniqueValues = (items, key) =>
    Array.from(
      new Set(
        items
          .map(item => item[key])
          .filter(value => value !== null && value !== undefined && value !== "")
      )
    ).sort((a, b) => a.toString().localeCompare(b.toString()));

  const cameras = uniqueValues(galleryItems, "camera");
  const lenses = uniqueValues(galleryItems, "lens");

  filtersContainer.innerHTML = `
    <div class="filters-bar">
      <label>
        Camera
        <select id="filter-camera">
          <option value="all">All</option>
          ${cameras.map(camera => `<option value="${camera}">${camera}</option>`).join("")}
        </select>
      </label>
      <label>
        Lens
        <select id="filter-lens">
          <option value="all">All</option>
          ${lenses.map(lens => `<option value="${lens}">${lens}</option>`).join("")}
        </select>
      </label>
      <label>
        Focal length
        <div class="range-inputs">
          <input id="filter-focal-min" type="number" inputmode="numeric" placeholder="Min">
          <input id="filter-focal-max" type="number" inputmode="numeric" placeholder="Max">
        </div>
      </label>
      <label>
        Sort
        <select id="filter-sort">
          <option value="date-desc">Date (newest)</option>
          <option value="date-asc">Date (oldest)</option>
          <option value="focal-asc">Focal length (low-high)</option>
          <option value="focal-desc">Focal length (high-low)</option>
          <option value="iso-asc">ISO (low-high)</option>
        </select>
      </label>
      <button id="filter-reset" type="button">Reset</button>
    </div>
  `;

  const cameraSelect = document.getElementById("filter-camera");
  const lensSelect = document.getElementById("filter-lens");
  const focalMinInput = document.getElementById("filter-focal-min");
  const focalMaxInput = document.getElementById("filter-focal-max");
  const sortSelect = document.getElementById("filter-sort");
  const resetButton = document.getElementById("filter-reset");

  const parseNumber = value => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const compareNumber = (a, b, direction = 1) => {
    if (a === null && b === null) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    return (a - b) * direction;
  };

  const sortItems = items => {
    const mode = sortSelect.value;
    const sorted = [...items];
    sorted.sort((left, right) => {
      switch (mode) {
        case "date-asc":
          return (left.dateTaken || "").localeCompare(right.dateTaken || "");
        case "date-desc":
          return (right.dateTaken || "").localeCompare(left.dateTaken || "");
        case "focal-asc":
          return compareNumber(left.focalLength, right.focalLength, 1);
        case "focal-desc":
          return compareNumber(left.focalLength, right.focalLength, -1);
        case "iso-asc":
          return compareNumber(left.iso, right.iso, 1);
        default:
          return 0;
      }
    });
    return sorted;
  };

  const applyFilters = () => {
    const cameraValue = cameraSelect.value;
    const lensValue = lensSelect.value;
    const focalMin = parseNumber(focalMinInput.value);
    const focalMax = parseNumber(focalMaxInput.value);

    let filtered = galleryItems.filter(item => {
      if (cameraValue !== "all" && item.camera !== cameraValue) return false;
      if (lensValue !== "all" && item.lens !== lensValue) return false;
      if (focalMin !== null && (item.focalLength === null || item.focalLength < focalMin)) {
        return false;
      }
      if (focalMax !== null && (item.focalLength === null || item.focalLength > focalMax)) {
        return false;
      }
      return true;
    });

    filtered = sortItems(filtered);

    const visibleSrcs = new Set(filtered.map(item => normalizeSrc(item.src)));

    images.forEach(img => {
  const src = normalizeSrc(img.src);
  img.style.display = visibleSrcs.has(src) ? "" : "none";
});


    if (grid) {
      filtered.forEach(item => {
        const img = imgBySrc.get(normalizeSrc(item.src));
        if (img) grid.appendChild(img);
      });
    }
  };

  const debounce = (fn, delay = 150) => {
    let timer = null;
    return () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(fn, delay);
    };
  };

  const debouncedApply = debounce(applyFilters);

  [cameraSelect, lensSelect, sortSelect].forEach(control =>
    control.addEventListener("change", debouncedApply)
  );
  [focalMinInput, focalMaxInput].forEach(control =>
    control.addEventListener("input", debouncedApply)
  );
  resetButton.addEventListener("click", () => {
    cameraSelect.value = "all";
    lensSelect.value = "all";
    focalMinInput.value = "";
    focalMaxInput.value = "";
    sortSelect.value = "date-desc";
    applyFilters();
  });

  applyFilters();
});
