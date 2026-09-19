/* ============================================
   Main Entry Point - VieTales
   ============================================ */



// Import modules
import { initNavigation } from './navigation.js';
import { initScrollAnimations, initParallax } from './animations.js';

// === Location Data ===
const locations = [
  {
    name: 'Vịnh Hạ Long',
    region: 'Quảng Ninh',
    description: 'Di sản thiên nhiên thế giới UNESCO với hàng nghìn hòn đảo đá vôi hùng vĩ, gắn liền với truyền thuyết Rồng phun ngọc.',
    image: '/images/halong-bay.jpg',
    status: 'available',
  },
  {
    name: 'Phố Cổ Hội An',
    region: 'Quảng Nam',
    description: 'Đô thị cổ với đèn lồng lung linh bên sông Thu Bồn, nơi giao thoa văn hóa Đông - Tây qua nhiều thế kỷ.',
    image: '/images/hoi-an.jpg',
    status: 'available',
  },
  {
    name: 'Văn Miếu Quốc Tử Giám',
    region: 'Hà Nội',
    description: 'Trường đại học đầu tiên của Việt Nam, biểu tượng cho truyền thống hiếu học ngàn năm văn hiến.',
    image: '/images/van-mieu.jpg',
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
    <div class="location-card reveal-scale delay-${i + 1}" id="location-${i}">
      <img class="location-card-image" src="${loc.image}" alt="${loc.name}" loading="lazy" />
      <div class="location-card-overlay">
        <div class="location-card-content">
          <span class="badge badge-gold">${loc.region}</span>
          <h3>${loc.name}</h3>
          <p>${loc.description}</p>
        </div>
      </div>
      ${loc.status === 'coming-soon' ? '<span class="badge badge-red location-badge">Sắp Ra Mắt</span>' : ''}
    </div>
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
