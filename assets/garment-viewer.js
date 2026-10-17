// Real-time 3D viewer for a garment exported from CLO3D / Marvelous Designer (.glb).
// Behaves like the gold studs on the home page: turns clockwise on its own, and scrolling
// past it turns it further (two full turns by default). Drag to turn it by hand,
// scroll-wheel / pinch to zoom in close enough to see the knit.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const SPIN_PER_SEC = (Math.PI * 2) / 12;   // one slow clockwise turn every 12s
const DRACO = "https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/libs/draco/gltf/";

export async function mountGarmentViewer(container, { src, scrollTurns = 2, onProgress } = {}) {
  const canvas = document.createElement("canvas");
  // touch: page and gallery still scroll; desktop: drag turns, wheel zooms
  canvas.style.cssText = "display:block;width:100%;height:100%;cursor:grab;touch-action:pan-x pan-y";
  container.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;   // same studio look as the studs
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  const key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(1.5, 2.5, 3); scene.add(key);

  const camera = new THREE.PerspectiveCamera(24, 1, 0.01, 50);

  // ---- load the garment ----
  const draco = new DRACOLoader().setDecoderPath(DRACO);
  const loader = new GLTFLoader().setDRACOLoader(draco).setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(src, e => e.total && onProgress?.(e.loaded / e.total));
  const model = gltf.scene;
  model.traverse(o => {
    if (!o.isMesh) return;
    for (const m of [].concat(o.material)) {
      // fabric is seen from both sides at the collar, cuffs and hem
      m.side = THREE.DoubleSide;
      for (const t of [m.map, m.normalMap, m.roughnessMap, m.aoMap]) if (t) t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    }
  });

  // centre it on its own axis and remember its size for framing
  const box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3()), centre = box.getCenter(new THREE.Vector3());
  model.position.sub(centre);
  const turntable = new THREE.Group(); turntable.add(model); scene.add(turntable);

  // soft contact shadow, like the studs' side views
  const sc = document.createElement("canvas"); sc.width = sc.height = 128;
  { const g = sc.getContext("2d"), r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, "rgba(0,0,0,.22)"); r.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = r; g.fillRect(0, 0, 128, 128); }
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(size.x * 1.2, size.z * 2 + size.x * 0.3),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -size.y / 2 - size.y * 0.02; scene.add(shadow);

  // ---- framing and zoom ----
  const radius = Math.max(size.x, size.y) * 0.5;
  let zoom = 1;                                        // 1 = whole garment; up to 8 = knit close-up
  function frame() {
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const fitDist = Math.max(radius / t, radius / (t * camera.aspect)) * 1.12;
    camera.position.set(0, size.y * 0.04, fitDist / zoom);
    camera.lookAt(0, 0, 0);
    camera.near = Math.max(0.001, (fitDist / zoom) * 0.05);
    camera.updateProjectionMatrix();
  }
  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; frame();
  }
  const ro = new ResizeObserver(resize); ro.observe(container); resize();

  // ---- interaction: idle clockwise spin + scroll turns + drag ----
  let spin = 0, dragAngle = 0, dragging = false, lastX = 0, scrollAngle = 0, scrollNow = 0;
  canvas.addEventListener("pointerdown", e => { dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = "grabbing"; });
  canvas.addEventListener("pointermove", e => { if (dragging) { dragAngle += (e.clientX - lastX) * 0.01; lastX = e.clientX; } });
  const up = () => { dragging = false; canvas.style.cursor = "grab"; };
  canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
  canvas.addEventListener("wheel", e => { e.preventDefault(); zoom = THREE.MathUtils.clamp(zoom * Math.exp(-e.deltaY * 0.0015), 1, 8); frame(); }, { passive: false });

  function readScroll() {
    // 0 when the viewer enters the bottom of the screen, 1 when it leaves the top
    const r = container.getBoundingClientRect();
    const p = THREE.MathUtils.clamp((innerHeight - r.top) / (innerHeight + r.height), 0, 1);
    scrollAngle = -p * scrollTurns * Math.PI * 2;      // clockwise, like the idle spin
  }
  addEventListener("scroll", readScroll, { passive: true }); readScroll();

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!dragging) spin -= SPIN_PER_SEC * dt;            // negative = clockwise seen from above
    scrollNow += (scrollAngle - scrollNow) * 0.08;      // glide after the wheel stops, like the studs
    turntable.rotation.y = spin + scrollNow + dragAngle;
    renderer.render(scene, camera);
  });

  return {
    setAngle(a) { spin = a; scrollNow = scrollAngle = 0; dragAngle = 0; },
    setZoom(z) { zoom = z; frame(); },
    destroy() {
      renderer.setAnimationLoop(null); ro.disconnect(); removeEventListener("scroll", readScroll);
      renderer.dispose(); pmrem.dispose(); draco.dispose(); canvas.remove();
    },
  };
}
