// 3D turntable for a garment, built from its product photos.
// The front photo's cut-out is puffed into a rounded shell; front and back halves meet
// at the outline. The back photo (optional) is lined up to the front outline and
// mirrored, so it reads correctly when the shirt turns round.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const GRID = 260;           // mesh resolution across the width
const DEPTH = 0.16;         // puff, relative to the garment's width
const SPIN = 0.45;          // radians per second when idle

const loadImage = async src => { const i = new Image(); i.src = src; await i.decode(); return i; };

// transparent background in the product photos; "not white" as a fallback
const isGarment = (d, i) => d[i + 3] > 128 && Math.min(d[i], d[i + 1], d[i + 2]) < 225;

function pixels(img, w, h) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0, w, h);
  return g.getImageData(0, 0, w, h).data;
}
function maskFrom(img, w, h) {
  const d = pixels(img, w, h), m = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) m[i] = isGarment(d, i * 4) ? 1 : 0;
  return m;
}
function bbox(img) {
  const w = 280, h = Math.round(280 * img.naturalHeight / img.naturalWidth), d = pixels(img, w, h);
  let x0 = w, x1 = 0, y0 = h, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (isGarment(d, (y * w + x) * 4)) {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  // as fractions of the image, so it works at any resolution
  return { x: x0 / w, y: y0 / h, w: (x1 - x0 + 1) / w, h: (y1 - y0 + 1) / h };
}

function distanceField(m, w, h) {
  const INF = 1e9, d = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) d[i] = m[i] ? INF : 0;
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[y * w + x]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (!d[i]) continue;
    d[i] = Math.min(d[i], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.414, at(x + 1, y - 1) + 1.414);
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x; if (!d[i]) continue;
    d[i] = Math.min(d[i], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.414, at(x - 1, y + 1) + 1.414);
  }
  return d;
}
function blur(a, w, h, r) {
  const tmp = new Float32Array(a.length), out = new Float32Array(a.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0, n = 0; for (let k = -r; k <= r; k++) { const xx = x + k; if (xx >= 0 && xx < w) { s += a[y * w + xx]; n++; } }
    tmp[y * w + x] = s / n;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0, n = 0; for (let k = -r; k <= r; k++) { const yy = y + k; if (yy >= 0 && yy < h) { s += tmp[yy * w + x]; n++; } }
    out[y * w + x] = s / n;
  }
  return out;
}

// draw the back photo so its outline sits on the front's outline, mirrored left↔right
function alignedBack(front, back) {
  const fb = bbox(front), bb = bbox(back);
  const c = document.createElement("canvas"); c.width = front.naturalWidth; c.height = front.naturalHeight;
  const g = c.getContext("2d");
  const W = c.width, H = c.height;
  g.translate(W, 0); g.scale(-1, 1);                    // mirror
  const dx = (1 - fb.x - fb.w) * W, dy = fb.y * H;      // front bbox, in mirrored space
  const sx = (fb.w * W) / (bb.w * back.naturalWidth), sy = (fb.h * H) / (bb.h * back.naturalHeight);
  g.drawImage(back, dx - bb.x * back.naturalWidth * sx, dy - bb.y * back.naturalHeight * sy,
    back.naturalWidth * sx, back.naturalHeight * sy);
  return c;
}

export async function mountGarment(container, { front: frontSrc, back: backSrc, background = null, drag = "any" } = {}) {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "display:block;width:100%;height:100%;cursor:grab";
  // drag: "any" = the canvas owns every gesture; "page" = touch swipes still scroll the page/gallery
  canvas.style.touchAction = drag === "page" ? "pan-x pan-y" : "none";
  container.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: background == null });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  if (background != null) renderer.setClearColor(background);
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(2, 3, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 0.8); rim.position.set(-3, 1, -3); scene.add(rim);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);

  const [front, back] = await Promise.all([loadImage(frontSrc), backSrc ? loadImage(backSrc) : null]);
  const aspect = front.naturalHeight / front.naturalWidth;
  const gw = GRID, gh = Math.round(GRID * aspect);
  const mask = maskFrom(front, gw, gh);
  const dist = distanceField(mask, gw, gh);
  let dmax = 0; for (const v of dist) dmax = Math.max(dmax, v);
  const raw = new Float32Array(gw * gh);
  for (let i = 0; i < gw * gh; i++) { const t = Math.min(1, Math.max(0, dist[i] - 1) / (dmax * 0.6)); raw[i] = Math.sqrt(t * (2 - t)); }
  // smooth, then pin the outermost ring to 0 so the two halves meet exactly
  const height = blur(raw, gw, gh, 1).map((v, i) => (mask[i] && dist[i] > 1.5 ? v : 0));

  function shell() {
    const geo = new THREE.PlaneGeometry(1, aspect, gw - 1, gh - 1);
    const pos = geo.attributes.position;
    for (let v = 0; v < gw * gh; v++) pos.setZ(v, height[v] * DEPTH);
    const idx = geo.index.array, keep = [];
    for (let t = 0; t < idx.length; t += 3)
      if (mask[idx[t]] && mask[idx[t + 1]] && mask[idx[t + 2]]) keep.push(idx[t], idx[t + 1], idx[t + 2]);
    geo.setIndex(keep);
    geo.computeVertexNormals();
    return geo;
  }
  const texture = src => { const t = new THREE.Texture(src); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.needsUpdate = true; return t; };
  const fabric = { roughness: 0.92, metalness: 0, side: THREE.DoubleSide };
  const geo = shell();
  const frontMesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: texture(front), ...fabric }));
  const backMesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    map: texture(back ? alignedBack(front, back) : front), color: back ? 0xffffff : 0xdddddd, ...fabric,
  }));
  backMesh.scale.z = -1;     // mirrored to the other side; the negative scale also turns its faces round
  const garment = new THREE.Group(); garment.add(frontMesh, backMesh); scene.add(garment);

  // soft floor shadow
  const sc = document.createElement("canvas"); sc.width = sc.height = 128;
  { const g = sc.getContext("2d"), r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, "rgba(0,0,0,.2)"); r.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = r; g.fillRect(0, 0, 128, 128); }
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.35), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -aspect / 2 - 0.04; scene.add(shadow);

  // turntable: idle spin, drag to turn, eases back into the spin
  let angle = 0, vel = SPIN, dragging = false, lastX = 0, frozen = false;
  canvas.addEventListener("pointerdown", e => { dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = "grabbing"; });
  canvas.addEventListener("pointermove", e => { if (!dragging) return; const dx = e.clientX - lastX; lastX = e.clientX; angle += dx * 0.01; vel = dx * 0.6; });
  const up = () => { dragging = false; canvas.style.cursor = "grab"; };
  canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const fit = (aspect * 0.5 + 0.12) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.position.set(0, 0.05, Math.max(fit, (fit * 0.85) / camera.aspect));
    camera.lookAt(0, -0.02, 0);
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(container); resize();

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!dragging && !frozen) { vel += (SPIN - vel) * dt * 1.5; angle += vel * dt; }
    garment.rotation.y = angle;
    garment.position.y = Math.sin(clock.elapsedTime * 1.2) * 0.008;
    renderer.render(scene, camera);
  });

  return {
    setAngle(a) { angle = a; vel = 0; frozen = true; },   // for stills and screenshots
    play() { frozen = false; },
    destroy() { renderer.setAnimationLoop(null); ro.disconnect(); renderer.dispose(); pmrem.dispose(); canvas.remove(); },
  };
}
