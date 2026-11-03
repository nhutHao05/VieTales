/* Native audio: play() is called synchronously inside user gestures for mobile.
   Browser/OS background suspension cannot be overridden. */
const KEY = 'vietales:native-music:v1';
export function initBackgroundAudio() {
  if (document.getElementById('audio-toggle')) return;
  let desired = true;
  let savedTime = 0;
  try {
    desired = sessionStorage.getItem(KEY) !== 'off';
    savedTime = Number(sessionStorage.getItem(KEY + ':time')) || 0;
  } catch {}
  const audio = document.createElement('audio');
  audio.id = 'site-audio';
  audio.src = '/audio/guzheng-city.mp3';
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = 0.35;
  audio.setAttribute('playsinline', '');
  const button = document.createElement('button');
  button.id = 'audio-toggle';
  button.type = 'button';
  button.className = 'audio-toggle is-ready';
  button.setAttribute('aria-controls', audio.id);
  button.innerHTML = `<span class="audio-toggle-ring" aria-hidden="true"></span>
    <svg class="audio-icon" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M4 12h5l6-5v18l-6-5H4z" fill="currentColor"/>
      <g class="music-waves" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
        <path d="M19 12a6 6 0 0 1 0 8M23 9a10 10 0 0 1 0 14"/></g>
      <path class="music-cross" d="m20 13 7 6m0-6-7 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg><span class="audio-tip" role="status"></span>`;
  document.body.append(audio, button);
  const tip = button.querySelector('.audio-tip');
  let timer;
  let request = 0;
  let pending = false;
  function message(text) {
    clearTimeout(timer);
    tip.textContent = text;
    if (text) timer = setTimeout(() => { tip.textContent = ''; }, 5000);
  }
  function remember() {
    try { sessionStorage.setItem(KEY, desired ? 'on' : 'off'); } catch {}
  }
  function render() {
    const playing = !audio.paused && !audio.ended && audio.readyState >= 2;
    button.classList.toggle('is-playing', playing);
    button.setAttribute('aria-pressed', String(playing));
    const label = playing || pending ? 'Tắt nhạc nền' : 'Bật nhạc nền';
    button.setAttribute('aria-label', label);
    button.title = label;
  }
  function stop() {
    desired = false;
    pending = false;
    ++request;
    remember();
    audio.pause();
    message('');
    render();
  }
  function play() {
    if (!desired || pending) return;
    const token = ++request;
    pending = true;
    // Do not await loading, fetch, or a timer before this call.
    const promise = audio.play();
    render();
    promise.then(() => {
      if (token !== request || !desired) return;
      pending = false;
      message('');
      render();
    }).catch(error => {
      if (token !== request) return;
      pending = false;
      if (error.name !== 'NotAllowedError' && error.name !== 'AbortError') {
        message('Không tải được nhạc. Bấm loa để thử lại.');
      }
      render();
    });
  }
  audio.addEventListener('loadedmetadata', () => {
    if (Number.isFinite(audio.duration) && savedTime > 0) {
      audio.currentTime = savedTime % audio.duration;
      savedTime = 0;
    }
  }, { once: true });
  for (const event of ['playing', 'pause', 'waiting', 'ended']) {
    audio.addEventListener(event, render);
  }
  audio.addEventListener('error', () => {
    pending = false;
    message('Không tải được nhạc. Bấm loa để thử lại.');
    render();
  });
  button.addEventListener('click', () => {
    if (!audio.paused || pending) stop();
    else {
      desired = true;
      remember();
      if (audio.error) audio.load();
      play();
    }
  });
  function wake(event) {
    if (!event.isTrusted || button.contains(event.target)) return;
    if (event.type === 'keydown' && (event.repeat || event.ctrlKey || event.metaKey || event.altKey)) return;
    if (desired && audio.paused) play();
  }
  document.addEventListener('click', wake);
  document.addEventListener('touchend', wake, { passive: true });
  document.addEventListener('keydown', wake);
  function resume() {
    if (document.visibilityState === 'visible' && desired && audio.paused) play();
  }
  document.addEventListener('visibilitychange', resume);
  window.addEventListener('pageshow', resume);
  window.addEventListener('pagehide', () => {
    try { sessionStorage.setItem(KEY + ':time', String(audio.currentTime)); } catch {}
  });
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Nhạc nền', album: 'VieTales'
      });
      navigator.mediaSession.setActionHandler('play', () => { desired = true; remember(); play(); });
      navigator.mediaSession.setActionHandler('pause', stop);
    } catch {}
  }
  render();
  if (desired) play();
}
