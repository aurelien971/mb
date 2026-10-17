#!/usr/bin/env python3
"""Download every product image from a Shopify products export CSV.

Usage:  python3 download_images.py products_export.csv [output_dir]

Creates one folder per product (named after its handle) with the images
numbered in their Shopify order: 01.jpg, 02.jpg, ...
Variant images are included. Re-running skips files already downloaded.
"""
import csv
import os
import sys
import urllib.parse
import urllib.request

def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    csv_path = sys.argv[1]
    out_dir = sys.argv[2] if len(sys.argv) > 2 else "product-images"

    # handle -> list of (position, url), deduplicated
    images = {}
    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            handle = (row.get("Handle") or "").strip()
            if not handle:
                continue
            seen = images.setdefault(handle, [])
            for col, pos_col in (("Image Src", "Image Position"), ("Variant Image", None)):
                url = (row.get(col) or "").strip()
                if not url or any(u == url for _, u in seen):
                    continue
                pos = (row.get(pos_col) or "").strip() if pos_col else ""
                seen.append((int(pos) if pos.isdigit() else 10_000 + len(seen), url))

    total = sum(len(v) for v in images.values())
    print(f"{len(images)} products, {total} images -> {out_dir}/")
    done = failed = 0
    for handle, items in images.items():
        folder = os.path.join(out_dir, handle)
        os.makedirs(folder, exist_ok=True)
        for i, (_, url) in enumerate(sorted(items), start=1):
            ext = os.path.splitext(urllib.parse.urlparse(url).path)[1] or ".jpg"
            dest = os.path.join(folder, f"{i:02d}{ext}")
            if os.path.exists(dest):
                done += 1
                continue
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=60) as r, open(dest, "wb") as out:
                    out.write(r.read())
                done += 1
                print(f"  {handle}/{i:02d}{ext}")
            except Exception as e:
                failed += 1
                print(f"  FAILED {handle} #{i}: {e}")
    print(f"Done: {done} saved, {failed} failed.")

if __name__ == "__main__":
    main()
