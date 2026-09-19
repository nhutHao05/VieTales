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
