// 360° panorama viewer for the end of the home page.
// Layout measured on the live site: 700px dark (#111) viewer, round 36px +/− buttons
// bottom-right, a "drag to look around" pill bottom-centre that fades out.
// The photo is an equirectangular image at assets/360-panorama.jpg.
import * as THREE from "three";

const IMAGE = "assets/360-panorama.jpg";
const AUTO_SPIN = 0.04;          // radians per second while nobody is dragging
const FOV = { start: 75, min: 35, max: 95 };

export function mountPanorama(wrap) {
  const canvas = wrap.querySelector("canvas");
  const hint = wrap.querySelector(".pano-hint");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x111111);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV.start, 1, 1, 1100);

  // sphere seen from the inside
  const geo = new THREE.SphereGeometry(500, 60, 40);
  geo.scale(-1, 1, 1);
  const mat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  scene.add(new THREE.Mesh(geo, mat));
  new THREE.TextureLoader().load(IMAGE, tex => {
    tex.colorSpace = THREE.SRGBColorSpace;
    mat.map = tex; mat.color.set(0xffffff); mat.needsUpdate = true;
  }, undefined, () => { hint.textContent = "Add the panorama photo as assets/360-panorama.jpg"; hint.classList.add("on"); });

  // look direction
  let lon = 0, lat = 0, dragging = false, lastX = 0, lastY = 0, touched = false;

  function fadeHint() { if (!touched) { touched = true; hint.classList.remove("on"); } }
  setTimeout(() => hint.classList.add("on"), 400);
  setTimeout(fadeHint, 4500);

  canvas.addEventListener("pointerdown", e => {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId); fadeHint();
  });
  canvas.addEventListener("pointermove", e => {
    if (!dragging) return;
    const k = camera.fov / wrap.clientHeight;      // drag speed follows zoom
    lon -= (e.clientX - lastX) * k;
    lat = THREE.MathUtils.clamp(lat + (e.clientY - lastY) * k, -85, 85);
    lastX = e.clientX; lastY = e.clientY;
  });
  const stop = () => { dragging = false; };
  canvas.addEventListener("pointerup", stop);
  canvas.addEventListener("pointercancel", stop);

  const zoom = d => { camera.fov = THREE.MathUtils.clamp(camera.fov + d, FOV.min, FOV.max); camera.updateProjectionMatrix(); };
  canvas.addEventListener("wheel", e => { e.preventDefault(); zoom(e.deltaY * 0.05); fadeHint(); }, { passive: false });
  wrap.querySelector(".pano-in").onclick = () => zoom(-8);
  wrap.querySelector(".pano-out").onclick = () => zoom(8);

  function resize() {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize);
  resize();

  const clock = new THREE.Clock();
  const target = new THREE.Vector3();
  let raf = 0;
  function frame() {
    const dt = clock.getDelta();
    if (!dragging) lon += THREE.MathUtils.radToDeg(AUTO_SPIN) * dt;
    const phi = THREE.MathUtils.degToRad(90 - lat), theta = THREE.MathUtils.degToRad(lon);
    target.setFromSphericalCoords(1, phi, theta);
    camera.lookAt(target);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  frame();

  return function destroy() {
    cancelAnimationFrame(raf);
    removeEventListener("resize", resize);
    renderer.dispose();
  };
}
