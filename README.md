# Tagged Galleries Workflow

This branch uses a generator to rebuild gallery pages and the homepage
portfolio from a single source of truth.

## Current Behavior

If `data/tags/` has no tag JSON files, the generator seeds tags from the
existing `*-gallery.html` pages. This is the safest starting point while
you transition to explicit tags.

## Run The Generator

```bash
node scripts/build-galleries.js
```

This will:
- Regenerate gallery pages using `scripts/templates/gallery.html`
- Update the homepage nav + portfolio sections in `index.html`
- Write `data/images.json` (image index used for future automation)

## When You Start Tagging

1) Add categories in the in-browser tag editor.
2) Download the `all-tags.json` file.
3) Save it into `data/tags/` (or use the watcher below).
4) Re-run the generator.

If `data/tags/all-tags.json` exists, it becomes the single source of truth and
the per-gallery tag files are ignored.

## Direct save to repo (local server)

If you want the in-browser editor to write straight to the repo files, run the
local caption server and use the "Save to repo" button in the editor.

```bash
node scripts/caption-server.js
```

This writes:
- `data/captions.json`
- `data/tags/all-tags.json`

## Excluding images from All Photos

Add the tag `Exclude` to any image you want omitted from the All Photos gallery.

## Optional: Auto-move tag JSON files

This watcher moves `tags-*.json` and `all-tags.json` from Downloads into `data/tags/`.

```powershell
./scripts/watch-tags.ps1
```

To auto-run the build after each move:

```powershell
./scripts/watch-tags.ps1 -RunBuild
```

## One-shot helper

This helper moves any tag downloads into `data/tags/` (including `all-tags*.json`)
and optionally runs the build.

```powershell
./scripts/tag-workflow.ps1 -RunBuild
```

## Import helper

This helper scans `images/`, ensures every image exists in `data/tags/all-tags.json`
with a default `All` tag, refreshes `data/exif.json`, and optionally runs the build.

```powershell
./scripts/import-images.ps1 -RunBuild
```

## Flatten images

This one-shot script moves all images into the top-level `images/` folder and
updates `data/tags/all-tags.json` and `data/captions.json` to match. It can also
refresh EXIF data and rebuild galleries.

```powershell
./scripts/flatten-images.ps1 -RunExif -RunBuild
```

To preview without moving files:

```powershell
./scripts/flatten-images.ps1 -DryRun
```
