/* ============================================
   Main Entry Point - VieTales
   ============================================ */



// Import modules
import { initNavigation } from './navigation.js';
import { initScrollAnimations, initParallax } from './animations.js';

// === Location Data ===
const locations = [
  {
    name: 'Đền Thờ Vua Hùng',
    region: 'Bình Thủy, Cần Thơ',
    description: 'Công trình thờ tự các Vua Hùng lớn nhất miền Tây, kiến trúc mang hình bản đồ Việt Nam với 18 cánh cung tượng trưng 18 đời vua.',
    image: '/images/den-hung-card.webp',
    url: '/locations/den-hung.html',
    status: 'available',
  },
  {
    name: 'Nam Nhã Phật Đường',
    region: 'Bình Thủy, Cần Thơ',
    description: 'Ngôi chùa cổ bên sông Bình Thủy, từng là cơ sở của phong trào yêu nước đầu thế kỷ XX, di tích lịch sử cấp quốc gia.',
    image: '/images/nam-nha-card.webp',
    url: '/locations/nam-nha.html',
    status: 'available',
  },
  {
    name: 'Khu Tưởng Niệm Thủ Khoa Bùi Hữu Nghĩa',
    region: 'Bình Thủy, Cần Thơ',
    description: 'Nơi yên nghỉ của Thủ khoa Bùi Hữu Nghĩa (1807–1872) — nhà thơ, nhà soạn tuồng, một trong "tứ kiệt" đất Nam Bộ.',
    image: '/images/bui-huu-nghia-card.webp',
    url: '/locations/bui-huu-nghia.html',
    status: 'available',
  },
];

// === Initialize App ===
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initScrollAnimations();
  initParallax();
  initLocationCards();
  initTypingEffect();
  initCounterAnimation();

  console.log('🇻🇳 VieTales - Kể Chuyện Việt Nam Qua Từng Tấm Bưu Thiếp');
});

/* === Location Cards === */
function initLocationCards() {
  const grid = document.getElementById('locations-grid');
  if (!grid) return;

  grid.innerHTML = locations
    .map(
      (loc, i) => `
    <a href="${loc.url}" class="location-card reveal-scale delay-${i + 1}" id="location-${i}">
      <div class="location-card-media">
        <img class="location-card-image" src="${loc.image}" alt="${loc.name}" width="900" height="600" loading="lazy" decoding="async" />
        ${loc.status === 'coming-soon' ? '<span class="badge badge-red location-badge">Sắp Ra Mắt</span>' : ''}
      </div>
      <div class="location-card-body">
        <span class="badge badge-gold">${loc.region}</span>
        <h3>${loc.name}</h3>
        <p>${loc.description}</p>
      </div>
    </a>
  `
    )
    .join('');

  // Re-init scroll animations for new elements
  initScrollAnimations();
}

/* === Typing Effect === */
function initTypingEffect() {
  const typingEl = document.querySelector('[data-typing]');
  if (!typingEl) return;

  const words = JSON.parse(typingEl.dataset.typing);
  let wordIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let typeSpeed = 100;

  function type() {
    const currentWord = words[wordIndex];

    if (isDeleting) {
      typingEl.textContent = currentWord.substring(0, charIndex - 1);
      charIndex--;
      typeSpeed = 50;
    } else {
      typingEl.textContent = currentWord.substring(0, charIndex + 1);
      charIndex++;
      typeSpeed = 100;
    }

    if (!isDeleting && charIndex === currentWord.length) {
      typeSpeed = 2000; // Pause at end of word
      isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      wordIndex = (wordIndex + 1) % words.length;
      typeSpeed = 500;
    }

    setTimeout(type, typeSpeed);
  }

  // Start after a delay
  setTimeout(type, 1500);
}

/* === Counter Animation === */
function initCounterAnimation() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.dataset.count, 10);
          const suffix = el.dataset.suffix || '';
          const duration = 2000;
          const startTime = performance.now();

          function updateCounter(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease-out cubic
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(easeOut * target);

            el.textContent = current + suffix;

            if (progress < 1) {
              requestAnimationFrame(updateCounter);
            }
          }

          requestAnimationFrame(updateCounter);
          observer.unobserve(el);
        }
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach((counter) => observer.observe(counter));
}
