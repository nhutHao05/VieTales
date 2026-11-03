export function initAtlasMode() {
  const atlas = document.querySelector('.atlas');
  if (!atlas) return;
  const flat = document.getElementById('heritage-map');
  const spatial = document.getElementById('atlas-3d');
  const stage = document.getElementById('map3d-stage');
  const status = spatial.querySelector('[role="status"]');
  const regionControls = document.getElementById('atlas-region-controls');
  let loading;
  let ready = false;
  async function load() {
    if (ready) return;
    if (loading) return loading;
    status.textContent = 'Đang mở bản đồ 3D…';
    loading = (async () => {
      try {
        const { initVietnamMap } = await import('./map3d.js');
        const map = await initVietnamMap(stage);
        if (!map) throw new Error('Map unavailable');
        ready = true;
        status.textContent = 'Kéo để xoay · Cuộn hoặc chụm để phóng';
      } catch (error) {
        status.textContent = 'Không mở được 3D trên thiết bị này. Chọn Bản đồ 2D để tiếp tục.';
        console.warn('VieTales 3D map:', error);
      }
    })();
    return loading;
  }
  atlas.querySelectorAll('[data-map-mode]').forEach(button => {
    button.addEventListener('click',() => {
      const is3D = button.dataset.mapMode === '3d';
      flat.hidden = is3D;
      spatial.hidden = !is3D;
      regionControls.hidden = is3D;
      atlas.querySelectorAll('[data-map-mode]').forEach(b => b.setAttribute('aria-pressed',String(b === button)));
      if (is3D) load();
    });
  });
}
