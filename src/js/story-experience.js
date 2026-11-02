// Visuals are static chapter content. Only the supplied GLB is enhanced to 3D.
for (const stage of document.querySelectorAll('[data-inline-model]')) {
  const status = stage.querySelector('[role="status"]');
  let viewer = null;
  let loading = false;
  let destroyed = false;

  async function start() {
    if (viewer || loading || destroyed) return;
    loading = true;
    status.textContent = 'Đang tải trống đồng…';
    try {
      const { createGLBDisplay } = await import('./glb-display3d.js');
      if (destroyed) return;
      const next = await createGLBDisplay(stage);
      if (destroyed) { next.dispose(); return; }
      viewer = next;
      stage.classList.add('has-display');
      status.textContent = 'Trống đồng Đông Sơn 3D';
    } catch (error) {
      if (!destroyed) {
        stage.classList.add('model-failed');
        status.textContent = 'Không tải được 3D · Hiển thị ảnh trống đồng';
        console.warn('Không tải được trống đồng:', error);
      }
    } finally {
      loading = false;
    }
  }

  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) {
      observer.disconnect();
      start();
    }
  }, { rootMargin: '200px' });
  observer.observe(stage);

  stage.addEventListener('keydown', event => {
    if (!viewer || !['ArrowLeft', 'ArrowRight', '+', '=', '-', 'Home'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'ArrowLeft') viewer.turn(-.15);
    if (event.key === 'ArrowRight') viewer.turn(.15);
    if (event.key === '+' || event.key === '=') viewer.zoom(.85);
    if (event.key === '-') viewer.zoom(1.18);
    if (event.key === 'Home') viewer.reset();
  });

  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    destroyed = true;
    observer.disconnect();
    viewer?.dispose();
    viewer = null;
  });
}
