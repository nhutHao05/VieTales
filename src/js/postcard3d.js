/* ============================================
   Mô hình bưu thiếp 3D — Three.js
   ============================================
   Một tấm bưu thiếp dày, xoay được bằng chuột, tự xoay khi rảnh.
   Mặt trước dán ảnh postcard thật, mặt sau là nền giấy có tem.

   Khác với thẻ lật CSS ở chỗ: đây là vật thể 3D thật — có bề dày,
   bắt sáng theo góc nhìn, và xoay tự do theo mọi hướng.
   ============================================ */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/* Mỗi tấm bưu thiếp có hai mặt thật do người dùng thiết kế:
   mặt trước là ảnh di tích, mặt sau là lời kể kèm logo và mã QR. */
const CARDS = [
  { front: '/images/den-hung-card.webp', back: '/images/den-hung-back.webp', label: 'Đền Thờ Vua Hùng' },
  { front: '/images/nam-nha-card.webp', back: '/images/nam-nha-back.webp', label: 'Nam Nhã Phật Đường' },
  { front: '/images/bui-huu-nghia-card.webp', back: '/images/bui-huu-nghia-back.webp', label: 'Bùi Hữu Nghĩa' },
];

const CARD_W = 6;
const CARD_H = 4;
const CARD_D = 0.09;

/* Mặt sau dùng ảnh thiết kế thật của người dùng, không vẽ lại bằng canvas.
   Nền giấy cho lúc chưa tải xong để mặt sau không bao giờ trắng trơn. */
function makePaperFallback() {
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 8;
  const g = c.getContext('2d');
  g.fillStyle = '#E8E2D4';
  g.fillRect(0, 0, 8, 8);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function initPostcard3D(container) {
  if (!container) return null;

  const canvas = document.createElement('canvas');
  canvas.className = 'postcard3d-canvas';
  container.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0, 13);

  // Cho tấm thẻ tự xoay tròn quanh trục dọc thay vì xoay camera.
  // Xoay vật thể giữ nguyên góc nhìn nên thấy rõ bề dày và hai mặt của thẻ;
  // còn xoay camera quanh một tấm phẳng thì phần lớn thời gian chỉ thấy
  // đúng một mặt, trông vẫn phẳng.
  const pivot = new THREE.Group();
  scene.add(pivot);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.rotateSpeed = 0.6;
  /* Quay được TRỌN 360° quanh trục dọc.
   * Trước đây có minAzimuthAngle/maxAzimuthAngle chặn ở ±0,45π (tức ±81°, tổng
   * 162°) nên không thể quay hết một vòng; và mỗi lần kéo chạm mốc thì camera
   * dừng phựt lại, gây cảm giác giật cục. Bỏ hai dòng đó là hết cả hai vấn đề. */
  controls.minPolarAngle = Math.PI * 0.08;
  controls.maxPolarAngle = Math.PI * 0.92;
  controls.autoRotate = false;

  scene.add(new THREE.AmbientLight(0xffffff, 1.5));
  const l1 = new THREE.DirectionalLight(0xffffff, 2.1);
  l1.position.set(5, 7, 9);
  scene.add(l1);
  const l2 = new THREE.DirectionalLight(0xffd9b0, 0.9);
  l2.position.set(-7, -3, 5);
  scene.add(l2);
  const l3 = new THREE.DirectionalLight(0x9fd8ff, 0.6);
  l3.position.set(0, 4, -9);
  scene.add(l3);

  // === tấm bưu thiếp ===
  const group = new THREE.Group();
  pivot.add(group);

  const loader = new THREE.TextureLoader();

  const frontMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.05 });
  const backMat = new THREE.MeshStandardMaterial({ map: makePaperFallback(), roughness: 0.85, metalness: 0.0 });
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0xf2ece0, roughness: 0.9 });

  // BoxGeometry: +x, -x, +y, -y, +z (mặt trước), -z (mặt sau)
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(CARD_W, CARD_H, CARD_D),
    [edgeMat, edgeMat, edgeMat, edgeMat, frontMat, backMat]
  );
  group.add(box);

  // viền mảnh quanh mặt trước cho sắc nét
  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(CARD_W, CARD_H, CARD_D)),
    new THREE.LineBasicMaterial({ color: 0x3a2e22, transparent: true, opacity: 0.35 })
  );
  group.add(outline);

  // === nạp ảnh postcard (cả hai mặt) ===
  let index = 0;
  const fronts = [];
  const backs = [];

  const applyTexture = (i) => {
    const f = fronts[i];
    const b = backs[i];
    if (f) {
      f.colorSpace = THREE.SRGBColorSpace;
      f.anisotropy = 8;
      frontMat.map = f;
      frontMat.needsUpdate = true;
    }
    if (b) {
      b.colorSpace = THREE.SRGBColorSpace;
      b.anisotropy = 8;
      backMat.map = b;
      backMat.needsUpdate = true;
    }
  };

  CARDS.forEach((c, i) => {
    loader.load(
      c.front,
      (tex) => {
        fronts[i] = tex;
        if (i === 0) applyTexture(0);
      },
      undefined,
      () => console.warn('Không nạp được mặt trước bưu thiếp:', c.front)
    );
    loader.load(
      c.back,
      (tex) => {
        backs[i] = tex;
        if (i === 0) applyTexture(0);
      },
      undefined,
      () => console.warn('Không nạp được mặt sau bưu thiếp:', c.back)
    );
  });

  // tự đổi sang tấm kế tiếp.
  // 15 giây mỗi tấm: đủ lâu để đọc hết lời kể ở mặt sau trước khi đổi.
  const SWAP_MS = 15000;
  let timer = null;
  const startCycle = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    timer = setInterval(() => {
      index = (index + 1) % CARDS.length;
      applyTexture(index);
    }, SWAP_MS);
  };
  startCycle();

  // === khung nhìn ===
  const fit = () => {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;

    /* Đóng khung theo chiều rộng và chiều cao riêng, KHÔNG theo đường chéo.
     * Thẻ chỉ xoay quanh trục dọc, nên bề ngang lớn nhất vẫn là CARD_W và
     * bề cao luôn là CARD_H — dùng đường chéo sẽ thừa gần 40% khung và làm
     * tấm thẻ hiện ra nhỏ xíu. */
    const vFov = (camera.fov * Math.PI) / 180;
    const needW = CARD_W * 1.14;
    const needH = CARD_H * 1.55;
    const distV = needH / (2 * Math.tan(vFov / 2));
    const distH = needW / (2 * Math.tan(vFov / 2) * camera.aspect);
    camera.position.set(0, 0, Math.max(distV, distH));
    camera.updateProjectionMatrix();
    controls.update();
  };
  fit();

  const ro = new ResizeObserver(fit);
  ro.observe(container);

  // === vòng lặp ===
  let raf = null;
  let visible = true;
  let idleTimer = null;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let spin = !reduceMotion;

  /* Tính theo thời gian thực (giây) chứ không theo số khung hình.
   * Trước đây cộng 0,0055 rad MỖI KHUNG HÌNH, nên máy 144Hz quay nhanh gấp
   * 2,4 lần máy 60Hz và tốc độ giật cục khi khung hình dao động. 0,33 rad/giây
   * giữ đúng tốc độ cũ trên màn hình 60Hz nhưng đều nhau trên mọi thiết bị. */
  let lastT = performance.now();

  const render = () => {
    const now = performance.now();
    // chặn trần 0,1s để không nhảy một bước dài sau khi chuyển tab quay lại
    const dt = Math.min((now - lastT) / 1000, 0.1);
    lastT = now;

    if (spin) pivot.rotation.y += 0.33 * dt;
    controls.update();
    renderer.render(scene, camera);
    raf = visible ? requestAnimationFrame(render) : null;
  };

  // tạm dừng tự xoay khi người dùng đang kéo, rồi cho chạy lại sau đó
  canvas.addEventListener('pointerdown', () => {
    spin = false;
  });
  canvas.addEventListener('pointerup', () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (!reduceMotion) spin = true;
    }, 2800);
  });
  canvas.addEventListener('pointerleave', () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (!reduceMotion) spin = true;
    }, 2800);
  });

  const io = new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      if (visible && raf === null) raf = requestAnimationFrame(render);
    },
    { threshold: 0.05 }
  );
  io.observe(container);

  raf = requestAnimationFrame(render);

  return { scene, camera, renderer, controls, dispose: () => clearInterval(timer) };
}
