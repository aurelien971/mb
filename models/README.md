# 3D garment files: spec for the pattern maker

What we need for each garment so the website can show it in real-time 3D, close enough
to see the knit. Ottoman first (ribbed henley, 100% waffle cotton, rubber chest patch,
snap placket, back neck tab with two gold studs).

## Ask for

1. **A glTF Binary file (`.glb`)** exported from CLO3D or Marvelous Designer,
   one per garment, named after the product handle: `ottoman.glb`.
2. **The garment simulated and frozen on an invisible form** (no avatar in the file),
   hanging naturally, the way it looks in the product photos.
3. **Real fabric, not a stock material**: a scan of the actual waffle cotton
   (Vizoo, xTex or CLO's fabric scanning), so the ribs and waffle cells are in the textures.
4. **Textures, PBR metal/rough, embedded in the `.glb`**:
   - Base colour, Normal, Roughness, Ambient occlusion
   - **4096 × 4096** per material, plus the **tileable fabric swatch at 2048 × 2048**
     as separate files (`ottoman-fabric-color.png`, `-normal.png`, `-roughness.png`)
     so the site can show the knit up close.
5. **Trims as separate meshes and materials**: snap buttons, rubber chest patch,
   back neck tab, two gold studs (metallic). Name them, e.g. `trim_studs`, `trim_patch`.
6. **Fabric thickness on** (not single-sided planes), and the inside of the collar/hem visible.

## Export settings

| Setting | Value |
|---|---|
| Format | glTF 2.0 binary (`.glb`) |
| Units / scale | metres, real size |
| Orientation | Y up, front of the garment facing +Z, centred on the origin |
| Triangles | 150k–400k for the whole garment |
| UVs | per pattern piece, real-world scale, no overlaps |
| Compression | Draco or Meshopt on (we decode both) |
| File size | under 25 MB with textures |
| Optional | a `.usdz` copy for "view in your room" on iPhone |

## Checks before sending

- Open the `.glb` at https://gltf-viewer.donmccurdy.com and confirm it loads, faces forward,
  and the knit is visible when zoomed in.
- No avatar, no floor, no lights or cameras in the file.

## Where it goes

Drop the file at `models/<handle>.glb` (for example `models/ottoman.glb`), push,
and the product page shows the 3D viewer as the first gallery tile automatically.
