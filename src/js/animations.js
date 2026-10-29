/* ============================================
   Scroll Animations - Intersection Observer
   ============================================ */

export function initScrollAnimations() {
  const revealElements = document.querySelectorAll(
    '.reveal, .reveal-left, .reveal-right, .reveal-scale'
  );

  if (!revealElements.length) return;

  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -80px 0px',
    threshold: 0.1,
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        // Once revealed, stop observing
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  revealElements.forEach((el) => {
    observer.observe(el);
  });
}

/* === 3D tilt cho card địa điểm ===
   CSS 3D thuần: JS chỉ ghi các biến --rx/--ry/--shine/--sh-* , CSS dựng transform
   và box-shadow. Nhờ vậy không có layout thrashing — chỉ composite.

   Con trỏ được làm mượt bằng nội suy (lerp) trong vòng lặp rAF, nên card
   "đuổi theo" chuột có quán tính thay vì giật cứng theo từng sự kiện.

   Chỉ chạy khi thiết bị có chuột thật (hover: hover) — trên cảm ứng không có
   con trỏ nên hiệu ứng sẽ đứng yên và chỉ tốn listener. */
export function initCardTilt() {
  const cards = document.querySelectorAll('.location-card');
  if (!cards.length) return;

  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!canHover || reduceMotion) return;

  const MAX_TILT = 9;      // độ nghiêng tối đa ở mép card
  const LIFT = -10;        // nhấc lên khi hover
  const EASE = 0.12;       // hệ số nội suy: nhỏ = mượt và trễ hơn
  const SHADOW_BLUR = 46;  // bóng nhoè nhất khi card nhấc cao nhất

  cards.forEach((card) => {
    // Biến --sh-* phải nằm trên CHÍNH .location-card vì box-shadow ở đó.
    // Biến --rx/--ry/--shine thì ở lớp trong — vẫn thấy được vì kế thừa xuống.
    const inner = card.querySelector('.location-card-3d');
    if (!inner) return;

    let raf = null;
    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;
    let hovered = false;

    const apply = () => {
      const ry = curX * 2 * MAX_TILT;
      const rx = -curY * 2 * MAX_TILT;
      // bóng đổ ngược hướng nghiêng -> card như được nâng khỏi mặt phẳng
      const shX = -curX * 26;
      const shY = 6 - curY * 14;
      const blur = SHADOW_BLUR - (Math.abs(curX) + Math.abs(curY)) * 16;
      const shine = 60 + curX * 110;

      inner.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
      inner.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
      inner.style.setProperty('--shine', `${shine.toFixed(1)}%`);
      card.style.setProperty('--sh-x', `${shX.toFixed(1)}px`);
      card.style.setProperty('--sh-y', `${shY.toFixed(1)}px`);
      card.style.setProperty('--sh-blur', `${blur.toFixed(0)}px`);
    };

    const tick = () => {
      curX += (targetX - curX) * EASE;
      curY += (targetY - curY) * EASE;

      const settled =
        Math.abs(targetX - curX) < 0.0004 && Math.abs(targetY - curY) < 0.0004;

      if (settled) {
        curX = targetX;
        curY = targetY;
      }

      apply();

      if (settled && !hovered) {
        // đã về đúng vị trí nghỉ -> dừng vòng lặp, không tốn CPU khi rảnh
        raf = null;
        inner.classList.remove('is-tilting');
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (raf === null) raf = requestAnimationFrame(tick);
    };

    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      targetX = (e.clientX - r.left) / r.width - 0.5;
      targetY = (e.clientY - r.top) / r.height - 0.5;
      inner.classList.add('is-tilting');
      start();
    });

    card.addEventListener('pointerenter', () => {
      hovered = true;
      card.style.setProperty('--ty', `${LIFT}px`);
    });

    card.addEventListener('pointerleave', () => {
      hovered = false;
      targetX = 0;
      targetY = 0;
      card.style.setProperty('--ty', '0px');
      // để transition CSS lo phần trả về, đồng thời dừng vòng lặp rAF
      inner.classList.remove('is-tilting');
      inner.style.setProperty('--rx', '0deg');
      inner.style.setProperty('--ry', '0deg');
      inner.style.setProperty('--shine', '-130%');
      card.style.setProperty('--sh-x', '0px');
      card.style.setProperty('--sh-y', '6px');
      card.style.setProperty('--sh-blur', `${SHADOW_BLUR}px`);
      curX = 0;
      curY = 0;
      if (raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    });
  });
}

/* === Parallax on scroll (subtle) === */
export function initParallax() {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const heroContent = hero.querySelector('.hero-content');
  const particles = hero.querySelectorAll('.particle');

  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        const heroHeight = hero.offsetHeight;

        if (scrollY < heroHeight) {
          const progress = scrollY / heroHeight;

          if (heroContent) {
            heroContent.style.transform = `translateY(${scrollY * 0.3}px)`;
            heroContent.style.opacity = 1 - progress * 0.8;
          }

          particles.forEach((particle, i) => {
            const speed = 0.1 + i * 0.05;
            particle.style.transform = `translateY(${scrollY * speed}px)`;
          });
        }

        ticking = false;
      });
      ticking = true;
    }
  });
}
