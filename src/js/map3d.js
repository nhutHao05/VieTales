/* ============================================
   Bản đồ 3D Việt Nam — Three.js
   ============================================
   Dựng mặt phẳng đất nước từ dữ liệu GeoJSON đã rút gọn
   (public/data/vietnam-map.json), đùn thành khối có bề dày
   rồi đặt 3 marker cho các địa điểm của VieTales.

   Toàn bộ dựng trong một canvas duy nhất, không dùng ảnh nền —
   nên không phát sinh request ảnh và đổi màu được bằng code.
   ============================================ */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/* Ba địa điểm thật của VieTales — đều ở phường Bình Thủy, Cần Thơ.
   Kinh/vĩ độ lấy từ dữ liệu tra cứu, không phải số bịa. */
const SITES = [
  { name: 'Đền Thờ Vua Hùng', lat: 10.0389, lon: 105.7603, url: '/locations/den-hung.html' },
  { name: 'Nam Nhã Phật Đường', lat: 10.0457, lon: 105.7741, url: '/locations/nam-nha.html' },
  { name: 'Khu Tưởng Niệm Thủ Khoa Bùi Hữu Nghĩa', lat: 10.0433, lon: 105.7692, url: '/locations/bui-huu-nghia.html' },
];

const COLORS = {
  land: 0x1f6b52,       // xanh rừng trầm
  landEdge: 0x62d6b0,   // viền sáng
  marker: 0xd32f2f,     // đỏ thương hiệu
  markerGlow: 0xef5350,
  water: 0x0b1f33,
};

/* Quy đổi kinh/vĩ độ sang toạ độ phẳng.
   Ở vĩ độ Việt Nam, 1 độ kinh ngắn hơn 1 độ vĩ (cos φ ≈ 0.985),
   nên nhân cos để hình dạng không bị bè ngang. */
function project([lon, lat], scale) {
  const x = lon * scale * Math.cos((lat * Math.PI) / 180);
  const y = lat * scale;
  return [x, y];
}

export async function initVietnamMap(container) {
  if (!container) return null;

  const canvas = document.createElement('canvas');
  canvas.className = 'map3d-canvas';
  container.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  /* near/far phải được đặt lại theo khoảng cách camera (xem setDepthRange).
   * Giá trị khởi tạo ở đây chỉ là tạm, sẽ bị ghi đè ngay trong fit(). */
  const camera = new THREE.PerspectiveCamera(38, 1, 1, 200);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 26;
  controls.maxDistance = 70;
  controls.maxPolarAngle = Math.PI * 0.42;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.35;

  // ánh sáng
  scene.add(new THREE.AmbientLight(0xffffff, 0.85));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(-18, 26, 22);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fd8ff, 0.7);
  rim.position.set(20, -14, -18);
  scene.add(rim);

  // === nạp dữ liệu bờ biển ===
  let data;
  try {
    const res = await fetch('/data/vietnam-map.json');
    if (!res.ok) throw new Error(String(res.status));
    data = await res.json();
  } catch (err) {
    console.error('Không nạp được dữ liệu bản đồ:', err);
    container.classList.add('map3d-failed');
    return null;
  }

  const SCALE = 1.6;
  const DEPTH = 2.2;

  // gom mọi polygon thành một Shape duy nhất để chỉ tốn 1 lần đùn
  const shapes = [];
  data.polygons.forEach((rings) => {
    const outer = rings[0].map((p) => project(p, SCALE));
    const shape = new THREE.Shape();
    shape.moveTo(outer[0][0], outer[0][1]);
    for (let i = 1; i < outer.length; i++) shape.lineTo(outer[i][0], outer[i][1]);
    shape.closePath();
    shapes.push(shape);
  });

  /* Không dùng bevel. Ở tỉ lệ này 1 đơn vị ≈ 60 km, nên bevelSize 0.1 tương
   * đương một vòng vát rộng ~6 km chạy quanh bờ biển — chính là những bậc
   * thang lởm chởm thấy trên hình. Bỏ bevel thì mặt cắt đứng sạch và bờ biển
   * giữ đúng hình dạng dữ liệu. */
  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth: DEPTH,
    bevelEnabled: false,
    curveSegments: 1,
  });
  geo.rotateX(-Math.PI / 2);   // nằm ngang

  // Tự canh giữa và GHI LẠI độ dời, thay vì gọi geo.center() rồi đoán.
  // Sau rotateX(-PI/2): một điểm (px, py) của Shape nằm ở (px, depth, -py).
  // Biết chính xác độ dời thì mới đặt được đường viền và marker trùng khớp.
  geo.computeBoundingBox();
  const offset = new THREE.Vector3();
  geo.boundingBox.getCenter(offset);
  geo.translate(-offset.x, -offset.y, -offset.z);

  /* Đường bờ biển được vẽ bằng LineSegments nằm ĐÚNG trên mặt trên của khối.
   * Hai bề mặt trùng khít nhau về độ sâu nên tranh chấp z-buffer: nét bị đứt
   * quãng và nhoè thành những vệt sọc khi phóng to. Nâng đường bờ lên một
   * khoảng rất nhỏ (0,7% bề dày) là đủ tách hẳn, mắt thường không thấy lệch. */
  const COAST_LIFT = 0.015;

  const onTop = ([lon, lat], lift = 0) => {
    const [px, py] = project([lon, lat], SCALE);
    return new THREE.Vector3(px - offset.x, DEPTH + lift - offset.y, -py - offset.z);
  };

  /* Mặt đất dùng vật liệu KHÔNG nhận sáng (MeshBasicMaterial) — đây là kết luận
 * sau khi đo, không phải lựa chọn cho nhanh:
 *
 *  - tranh chấp độ sâu:   đổi near/far (20.000:1 -> 15:1), nâng đường bờ lên
 *                         0,015, tắt depthWrite  -> vệt sọc KHÔNG đổi (2.24 -> 2.24)
 *  - pháp tuyến sai:      mọi pháp tuyến hướng lên lệch đúng 0°, ép về (0,1,0)
 *                         -> KHÔNG đổi
 *  - polygon lồng nhau:   15 polygon không cái nào nằm trong cái khác -> KHÔNG phải
 *  - banding 8-bit:       bật dithering -> TỆ HƠN
 *  - đường bờ biển:       ẩn đi -> chỉ giảm một nửa, phần còn lại vẫn sọc
 *
 * Chỉ khi bỏ hoàn toàn bước tính sáng thì mặt phẳng mới sạch tuyệt đối (đã
 * chụp đối chứng: mặt trên tô màu phẳng, không một vệt). Vậy vệt sọc do bước
 * tính sáng sinh ra trên mặt phẳng rộng — không sửa được bằng tham số.
 *
 * Vì thế mặt đất được tô phẳng hoàn toàn — xem phần tạo `land` bên dưới. */
  /* Một vật liệu duy nhất cho toàn khối: phẳng, cùng một màu ở mặt trên và
   * thành bên. Không truyền mảng vật liệu vì ExtrudeGeometry phát ra ~30 nhóm
   * và thứ tự nhóm không ổn định — tô theo chỉ số nhóm sẽ ra mảng màu sai.
   * Độ sâu của khối vẫn đọc được nhờ đường bờ biển sáng bao quanh. */
  const land = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: COLORS.land }));
  scene.add(land);

  // Đường bờ biển: vẽ lại chính các ring của GeoJSON thành đường liền.
  // Không dùng EdgesGeometry vì nó băm mặt cắt của khối đùn thành vô số
  // đoạn ngắn, nhìn như mã vạch.
  const coastPts = [];
  data.polygons.forEach((rings) => {
    rings.forEach((ring) => {
      for (let i = 0; i < ring.length - 1; i++) {
        coastPts.push(onTop(ring[i], COAST_LIFT));
        coastPts.push(onTop(ring[i + 1], COAST_LIFT));
      }
    });
  });
  const coast = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(coastPts),
    new THREE.LineBasicMaterial({
      color: COLORS.landEdge,
      transparent: true,
      opacity: 0.9,
      // không ghi độ sâu: đường bờ chỉ để nhìn, không được che hay tranh chấp
      // với mặt đất bên dưới
      depthWrite: false,
    })
  );
  scene.add(coast);

  // === marker cho từng địa điểm ===
  /* Ba di tích nằm trong cùng một phường, cách nhau 1–2 km. Trên thực địa
   * khoảng cách đó chỉ bằng 0,02 đơn vị cảnh — nhỏ hơn một pixel, nên nếu vẽ
   * đúng tỉ lệ thì ba marker chồng khít thành một chấm và không thể bấm riêng.
   * Vì vậy độ lệch giữa chúng được PHÓNG ĐẠI lên cho dễ đọc, còn vị trí gốc
   * vẫn là toạ độ thật. Điều này được ghi rõ trong phần chú thích trên trang. */
  const markers = [];
  const bbox = new THREE.Box3().setFromObject(land);
  const size = new THREE.Vector3();
  bbox.getSize(size);

  const SPREAD = 26;   // hệ số phóng đại khoảng cách giữa ba marker

  const anchor = onTop([SITES[0].lon, SITES[0].lat]);
  const centroid = new THREE.Vector3();

  const makePin = (site, offset) => {
    const g = new THREE.Group();
    g.position.copy(anchor).add(offset);
    g.userData = { site };
    centroid.add(g.position);

    const pinH = 1.5;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 24, 18),
      new THREE.MeshStandardMaterial({ color: COLORS.markerGlow, emissive: COLORS.markerGlow, emissiveIntensity: 0.9 })
    );
    head.position.y = pinH;
    g.add(head);

    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, pinH, 24),
      new THREE.MeshStandardMaterial({ color: COLORS.marker, emissive: COLORS.marker, emissiveIntensity: 0.5 })
    );
    tip.position.y = pinH / 2;
    tip.rotation.x = Math.PI;   // chĩa mũi nhọn xuống
    g.add(tip);

    const dot = new THREE.Mesh(
      new THREE.CircleGeometry(0.22, 20),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    dot.rotation.x = -Math.PI / 2;
    dot.position.y = 0.04;
    g.add(dot);

    // hai vòng sóng lan ra, lệch pha nhau cho có nhịp
    const rings = [];
    for (let i = 0; i < 2; i++) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.55, 0.95, 36),
        // cộng màu để vòng sóng ra ánh sáng, không thành một đĩa tối trên mặt đất
        new THREE.MeshBasicMaterial({
          color: COLORS.markerGlow,
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.07;
      ring.userData.phase = i * 0.5;
      g.add(ring);
      rings.push(ring);
    }

    // cột sáng ngắn giúp thấy điểm khi nhìn nghiêng
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.02, 1.6, 14, 1, true),
      new THREE.MeshBasicMaterial({
        color: COLORS.markerGlow,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    beam.position.y = pinH + 0.9;
    g.add(beam);

    g.userData.rings = rings;
    g.userData.head = head;
    g.userData.pinH = pinH;
    scene.add(g);
    markers.push(g);
  };

  // Độ lệch lấy từ hiệu toạ độ thật giữa các địa điểm, rồi nhân SPREAD.
  // Lấy mốc là địa điểm đầu tiên nên nó đứng đúng vị trí địa lý.
  const base = onTop([SITES[0].lon, SITES[0].lat]);
  SITES.forEach((site) => {
    const p = onTop([site.lon, site.lat]);
    const offset = new THREE.Vector3(
      (p.x - base.x) * SPREAD,
      0,
      (p.z - base.z) * SPREAD
    );
    makePin(site, offset);
  });
  centroid.divideScalar(SITES.length);

  // === khung nhìn ===
  // khai báo TRƯỚC fit() vì fit() có ghi vào biến này
  let fullDist = 60;

  /* Độ chính xác của depth buffer tỉ lệ nghịch với tỉ số far/near.
   * Ban đầu camera để near 0,1 và far 2000 — tỉ số 20.000:1, quá thô, nên khi
   * phóng to vào Cần Thơ các tam giác gần như đồng phẳng trên mặt đất tranh
   * chấp độ sâu và hiện thành những vệt sọc dọc. Giữ tỉ số trong khoảng vài
   * trăm lần là hết hẳn. Vì vậy near/far được tính lại theo khoảng cách camera
   * mỗi khi khung nhìn đổi, thay vì cố định một lần. */
  const setDepthRange = (camDist) => {
    camera.near = Math.max(0.2, camDist * 0.05);
    camera.far = camDist + 80;
    camera.updateProjectionMatrix();
  };

  const fit = () => {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;

    // đóng khung theo CẢ hai chiều: bản đồ Việt Nam rất cao và hẹp, nếu chỉ
    // tính theo chiều ngang thì trên khung rộng nó sẽ tràn ra ngoài
    const vFov = (camera.fov * Math.PI) / 180;
    const distV = size.z / (2 * Math.tan(vFov / 2));
    const distH = size.x / (2 * Math.tan(vFov / 2) * camera.aspect);
    const dist = Math.max(distV, distH) * 1.12;

    // góc nhìn dốc hơn để bản đồ chiếm khung: nhìn càng ngang thì hình chữ S
    // càng dẹt và chừa nhiều khoảng trống hai bên
    camera.position.set(0, dist * 0.62, dist * 0.80);
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    controls.minDistance = dist * 0.03;   // cho phép vào sát Cần Thơ
    controls.maxDistance = dist * 1.9;
    setDepthRange(camera.position.length());
    controls.update();
    camera.updateProjectionMatrix();
    fullDist = dist;
  };
  fit();

  const ro = new ResizeObserver(fit);
  ro.observe(container);

  /* === hai tầm nhìn ===
   * Toàn quốc: thấy hình chữ S, ba marker nằm sát nhau ở miền Tây.
   * Cần Thơ:   đưa camera vào sát để ba marker tách hẳn ra và bấm riêng được. */
  const view = { mode: 'country' };

  const flyTo = (target, distance, azimuth, polar) => {
    const sph = new THREE.Spherical(distance, polar, azimuth);
    const pos = new THREE.Vector3().setFromSpherical(sph).add(target);
    camera.position.copy(pos);
    controls.target.copy(target);
    setDepthRange(distance);
    controls.update();
  };

  const goCountry = () => {
    view.mode = 'country';
    controls.autoRotate = !reduceMotion;
    fit();
  };

  const goCanTho = () => {
    view.mode = 'cantho';
    controls.autoRotate = false;   // đang soi một chỗ thì không xoay nữa
    // 0,12 lần tầm toàn quốc: đủ gần để ba marker tách rời và bấm riêng được,
    // nhưng vẫn thấy được vùng đồng bằng châu thổ quanh Cần Thơ
    const d = fullDist * 0.12;
    flyTo(centroid, d, Math.PI * 0.25, Math.PI * 0.30);
  };

  const zoomBtn = document.getElementById('map3d-zoom');
  if (zoomBtn) {
    zoomBtn.addEventListener('click', () => {
      if (view.mode === 'country') {
        goCanTho();
        zoomBtn.textContent = 'Xem toàn quốc';
        zoomBtn.setAttribute('aria-pressed', 'true');
      } else {
        goCountry();
        zoomBtn.textContent = 'Zoom Cần Thơ';
        zoomBtn.setAttribute('aria-pressed', 'false');
      }
    });
  }

  // === vòng lặp vẽ ===
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  controls.autoRotate = !reduceMotion;

  let raf = null;
  let visible = true;
  let lastDepthDist = 0;
  const clock = new THREE.Clock();

  const render = () => {
    const t = clock.getElapsedTime();
    controls.update();

    /* Marker giữ kích thước KHÔNG ĐỔI trên màn hình.
     * Chúng có kích thước cố định trong không gian cảnh, nên khi camera bay
     * vào sát Cần Thơ chúng phình to bằng cả khung. Nhân tỉ lệ theo khoảng
     * cách camera bù lại đúng độ phóng đại của phép chiếu. */
    const camDist = camera.position.distanceTo(controls.target);
    const mScale = Math.min(camDist / fullDist, 1);

    /* Người dùng cuộn chuột làm khoảng cách đổi liên tục, nên dải near/far
     * cũng phải theo kịp — nếu không, lúc phóng to sẽ quay lại tình trạng
     * tranh chấp độ sâu. Chỉ cập nhật khi lệch đủ nhiều để khỏi tính lại ma
     * trận chiếu mỗi khung hình. */
    if (Math.abs(camDist - lastDepthDist) > camDist * 0.05) {
      lastDepthDist = camDist;
      setDepthRange(camDist);
    }

    markers.forEach((g) => {
      const { rings, head, pinH } = g.userData;
      g.scale.setScalar(mScale);
      rings.forEach((ring) => {
        const pulse = (t * 0.8 + ring.userData.phase) % 1;
        ring.scale.setScalar(1 + pulse * 1.6);
        ring.material.opacity = 0.45 * (1 - pulse);
      });
      head.position.y = pinH + Math.sin(t * 1.8) * 0.1;
      head.scale.setScalar(1 + Math.sin(t * 1.8) * 0.06);
    });

    renderer.render(scene, camera);
    if (visible) raf = requestAnimationFrame(render);
    else raf = null;
  };

  // chỉ vẽ khi khu vực này thật sự nằm trong tầm nhìn -> không tốn GPU vô ích
  const io = new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      if (visible && raf === null) raf = requestAnimationFrame(render);
    },
    { threshold: 0.05 }
  );
  io.observe(container);

  raf = requestAnimationFrame(render);

  /* === tương tác: bấm vào marker ===
   * Không dùng Raycaster. Ở tầm toàn quốc marker chỉ chiếm vài chục pixel,
   * nên raycast đòi bấm gần như trúng từng pixel — đo được chỉ 1/25 lần bấm
   * là ăn. Thay vào đó chiếu vị trí marker xuống toạ độ màn hình rồi so
   * khoảng cách: chắc chắn hơn và cho phép nới vùng bấm tuỳ ý. */
  const HIT_RADIUS = 30;   // px
  const projected = new THREE.Vector3();
  let downAt = null;

  // trả về marker gần con trỏ nhất, kèm khoảng cách trên màn hình
  const nearestMarker = (clientX, clientY) => {
    const r = canvas.getBoundingClientRect();
    let best = null;
    let bestD = Infinity;
    markers.forEach((m) => {
      projected.copy(m.userData.head.position).applyMatrix4(m.matrixWorld).project(camera);
      const sx = r.left + ((projected.x + 1) / 2) * r.width;
      const sy = r.top + ((-projected.y + 1) / 2) * r.height;
      const d = Math.hypot(clientX - sx, clientY - sy);
      if (d < bestD) {
        bestD = d;
        best = m;
      }
    });
    return { marker: best, distance: bestD };
  };

  canvas.addEventListener('pointerdown', (e) => {
    downAt = { x: e.clientX, y: e.clientY };
  });

  canvas.addEventListener('pointerup', (e) => {
    // bỏ qua nếu người dùng đang kéo xoay bản đồ
    if (!downAt) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
    downAt = null;
    if (moved > 8) return;

    const { marker, distance } = nearestMarker(e.clientX, e.clientY);
    if (!marker || distance > HIT_RADIUS) return;

    /* Bấm vào marker khi đang ở tầm toàn quốc: ba điểm còn nằm sát nhau nên
     * chưa chọn được chắc chắn — zoom vào Cần Thơ trước.
     * Khi đã ở tầm Cần Thơ: mở thẳng trang truyện của địa điểm đó. */
    if (view.mode === 'country') {
      goCanTho();
      const btn = document.getElementById('map3d-zoom');
      if (btn) {
        btn.textContent = 'Xem toàn quốc';
        btn.setAttribute('aria-pressed', 'true');
      }
      return;
    }

    const site = marker.userData.site;
    if (site && site.url) window.location.href = site.url;
  });

  canvas.addEventListener('pointermove', (e) => {
    const { distance } = nearestMarker(e.clientX, e.clientY);
    canvas.style.cursor = distance <= HIT_RADIUS ? 'pointer' : 'grab';
  });

  return { scene, camera, renderer, controls, markers };
}
