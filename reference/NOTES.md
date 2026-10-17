# Maxime Black: reference notes (captured 2026-10-17)

Reference only. The editable base comes from the Shopify theme export
(Online Store → Themes → Download theme file) and the products CSV export.

## Platform
- Shopify store, password-protected ("Early access login").
- Theme folder `t/13`, built on a Halo-style theme (`halo-*` scripts, `slider.js`, `theme.js`).
- Apps: Globo Smart Product Filters, one.store widget.
- Custom sections are suffixed `_maximeblack`; these are the friend's own additions.

## Home page sections (top to bottom, desktop ≈ 4800px tall)
| # | Section type | Notes |
|---|---|---|
| 1 | `video_block` | Full-screen hero: autoplaying MP4 of the two dithered spinning cones on off-white. Down-chevron at the bottom on phone. |
| 2 | `product_block` | "Recently added", 3-column grid (2 on phone): Ottoman, 2Z Pants, Teddy Jacket, Spectre Overshirt, Phantom Pants, Hooded Cardigan in Wool, Clone Pants, 2Z Top. All showing £0.00. |
| 3 | `video_block_maximeblack` | Full-width lifestyle video with "Shop all accessories" button. |
| 4 | `product_block` | "View all" product carousel with arrows. |
| 5 | `popup_maximeblack` | Popup, hidden by default. |
| 6 | `panaroma_section_maximeblack` | 360° panorama viewer, 700px tall (see below). |

Other pages: `/collections/all`, `/collections/ready-to-wear`, `/collections/accessories`,
`/collections/recently-added`, `/collections/all-available`, `/pages/information`, `/cart`.

## The "spinning" elements
1. **Hero cones:** a pre-rendered video (Shopify-hosted MP4), not live 3D.
   `cone-render.html` in this folder recreates this look live in Three.js, which
   makes it possible to swap the video for a real-time version later.
2. **Panorama:** Three.js r128 (cdnjs). An equirectangular image (`360-panorama.jpg`)
   mapped inside an inverted sphere; auto-rotates, drag to look, scroll or +/− to zoom.

## Look
- Font: SF Pro Display (300/400/500/700), Arial fallback. Small uppercase labels.
- Colours: text #232323 / #000, background off-white (~#f3f3f1 on hero, #f7f7f7),
  greys #cbcbcb and #3c3c3c, accent red #fc605b (sparingly).
- Header: "MAXIME BLACK" wordmark left (centred on phone), menu + cart icons right.

## Things worth raising with the friend
- Every product shows **£0.00**: prices are either unset or hidden on purpose for early access.
- Section is spelled `panaroma` (harmless, but worth knowing when searching the theme).
- Predictive-search links contain theme demo placeholders ("dempus", "magnis", "loremous saliduar").
