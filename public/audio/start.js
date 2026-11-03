/* Run in <head>, before styles and page modules. Autoplay policy still applies. */
(() => {
  if (document.getElementById('site-audio')) return;
  const key = 'vietales:native-music:v1';
  const enabled = () => {
    try { return sessionStorage.getItem(key) !== 'off'; } catch { return true; }
  };
  const audio = document.createElement('audio');
  audio.id = 'site-audio';
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = 0.35;
  audio.setAttribute('playsinline', '');
  document.head.appendChild(audio);
  let time = 0;
  try { time = Number(sessionStorage.getItem(key + ':time')) || 0; } catch {}
  audio.addEventListener('loadedmetadata', () => {
    if (time > 0 && Number.isFinite(audio.duration)) audio.currentTime = time % audio.duration;
  }, { once: true });
  function play() {
    if (enabled() && audio.paused) audio.play().catch(() => {});
  }
  function wake(event) {
    if (!event.isTrusted || event.target?.closest?.('#audio-toggle')) return;
    if (event.type === 'keydown' && (event.repeat || event.ctrlKey || event.metaKey || event.altKey)) return;
    play();
  }
  const events = ['click', 'touchend', 'keydown'];
  events.forEach(type => document.addEventListener(type, wake, { passive: true }));
  window.__vietalesEarlyAudioCleanup = () => {
    events.forEach(type => document.removeEventListener(type, wake));
    delete window.__vietalesEarlyAudioCleanup;
  };
  audio.src = '/audio/guzheng-city.mp3';
  play();
})();
