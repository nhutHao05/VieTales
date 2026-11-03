/* ============================================
   Điểm nạp nhạc nền cho các trang truyện (/locations/*)
   ============================================
   Trang chủ đi qua src/js/main.js nên nhạc được khởi tạo ở đó.
   Các trang truyện chỉ nạp story-experience.js, vì vậy file này
   đứng riêng để mọi trang đều có nút loa giống nhau.
   ============================================ */

import { initBackgroundAudio } from './audio-control.js';

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBackgroundAudio, { once: true });
} else {
  initBackgroundAudio();
}
