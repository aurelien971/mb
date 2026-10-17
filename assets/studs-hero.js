// Gold 3D studs for the home hero.
// Placement copies the original hero video exactly: in its 1920×1080 frame the two
// discs are 118px wide, centred at x 872 / 1050, y 539, and the video fills the
// screen like CSS object-fit: cover. Spin matches the video too: clockwise, 5s a turn.
// Scrolling through the section flips both studs vertically twice before the page moves on.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const FRAME = { w: 1920, h: 1080, r: 59, cy: 539, cx: [872, 1050] };
const SPIN_PER_SEC = (Math.PI * 2) / 5;   // one clockwise turn every 5s
const FLIPS = 2;

// part dimensions from the spec sheet (mm)
const R = 13.5 / 2, BASE_H = 4, TOTAL_H = 8, HOLE_R = 1.2, HOLE_DEPTH = 3, CH = 0.18;

function brushedTexture() {
  const c = document.createElement("canvas");
  c.width = 16; c.height = 1024;
  const g = c.getContext("2d");
  for (let y = 0; y < c.height; y++) {
    const v = 150 + Math.random() * 70 + Math.sin(y * 0.07) * 10;
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(0, y, c.width, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function makeStud(brass, holeMat) {
  // one lathe per face keeps the edges crisp
  const face = (points, mat = brass, steps = 24) => {
    const pts = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = new THREE.Vector2(...points[i]), b = new THREE.Vector2(...points[i + 1]);
      for (let s = 0; s < steps; s++) pts.push(a.clone().lerp(b, s / steps));
    }
    pts.push(new THREE.Vector2(...points.at(-1)));
    const geo = new THREE.LatheGeometry(pts, 192);
    geo.computeTangents();
    const m = new THREE.Mesh(geo, mat);
    m.position.y = -TOTAL_H / 2;      // rotate around the middle of the part
    return m;
  };
  const g = new THREE.Group();
  g.add(face([[HOLE_R, 0], [R - CH, 0]]));
  g.add(face([[R - CH, 0], [R, CH]], brass, 4));
  g.add(face([[R, CH], [R, BASE_H - CH]]));
  g.add(face([[R, BASE_H - CH], [R - CH * 0.6, BASE_H]], brass, 4));
  g.add(face([[R - CH * 0.6, BASE_H], [0.0001, TOTAL_H]], brass, 48));
  g.add(face([[HOLE_R, HOLE_DEPTH], [HOLE_R, 0]], holeMat, 8));
  g.add(face([[0.0001, HOLE_DEPTH], [HOLE_R, HOLE_DEPTH]], holeMat, 4));
  return g;
}

export function mountStudsHero(section) {
  const stage = section.querySelector(".stage");
  const canvas = stage.querySelector("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;

  // orthographic camera in screen pixels, so sizes match the video exactly
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 4000);
  camera.position.z = 2000;

  const streaks = brushedTexture();
  const brass = new THREE.MeshPhysicalMaterial({
    color: 0xd9ad55, metalness: 1, roughness: 0.32, roughnessMap: streaks,
    anisotropy: 0.75, clearcoat: 0.15, clearcoatRoughness: 0.35,
  });
  const holeMat = brass.clone();
  holeMat.color = new THREE.Color(0x6e5320);
  holeMat.roughness = 0.5;

  // flip (outer) → spin (inner): the spin always runs around the stud's own axis
  const studs = FRAME.cx.map(() => {
    const flip = new THREE.Group(), spin = makeStud(brass, holeMat);
    flip.add(spin);
    scene.add(flip);
    return { flip, spin };
  });

  function layout() {
    const W = stage.clientWidth, H = stage.clientHeight;
    renderer.setSize(W, H, false);
    Object.assign(camera, { left: -W / 2, right: W / 2, top: H / 2, bottom: -H / 2 });
    camera.updateProjectionMatrix();
    // same maths as object-fit: cover
    const s = Math.max(W / FRAME.w, H / FRAME.h);
    const ox = (W - FRAME.w * s) / 2, oy = (H - FRAME.h * s) / 2;
    const k = (FRAME.r * s) / R;   // pixels per mm
    studs.forEach(({ flip }, i) => {
      flip.scale.setScalar(k);
      flip.position.set(ox + FRAME.cx[i] * s - W / 2, H / 2 - (oy + FRAME.cy * s), 0);
    });
  }

  let flipTarget = 0, flipNow = 0;
  function readScroll() {
    const r = section.getBoundingClientRect();
    const travel = section.offsetHeight - stage.offsetHeight;
    flipTarget = travel > 0 ? THREE.MathUtils.clamp(-r.top / travel, 0, 1) : 0;
  }

  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const clock = new THREE.Clock();
  let spin = 0, raf = 0;
  function frame() {
    spin += clock.getDelta() * SPIN_PER_SEC;
    flipNow += (flipTarget - flipNow) * 0.1;
    const flipAngle = ease(flipNow) * FLIPS * Math.PI * 2;
    studs.forEach(({ flip, spin: s }) => {
      flip.rotation.x = Math.PI / 2 + flipAngle;   // tip faces the camera, then tumbles vertically
      s.rotation.y = -spin;                         // clockwise as seen from the front
    });
    // turn the lighting with the studs so the highlight sweeps clockwise like the video
    scene.environmentRotation.set(0, 0, -spin);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  addEventListener("resize", layout);
  addEventListener("scroll", readScroll, { passive: true });
  layout(); readScroll(); frame();

  return function destroy() {
    cancelAnimationFrame(raf);
    removeEventListener("resize", layout);
    removeEventListener("scroll", readScroll);
    renderer.dispose();
    pmrem.dispose();
  };
}
