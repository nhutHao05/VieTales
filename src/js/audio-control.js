/* Shared YouTube music control with a speaker-only interface.
   Audible autoplay remains subject to the browser's autoplay policy. */
const VIDEO_ID = 'BjE9A9hOQvk';
const KEY = 'vietales:youtube-music:v1';
let apiPromise;

function loadAPI() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    const timer = setTimeout(() => reject(new Error('YouTube API timeout')), 20000);
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timer);
      resolve(window.YT);
      if (typeof previous === 'function') previous();
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = () => { clearTimeout(timer); reject(new Error('YouTube API unavailable')); };
    document.head.appendChild(script);
  }).catch(error => { apiPromise = null; throw error; });
  return apiPromise;
}

export function initBackgroundAudio() {
  if (document.getElementById('audio-toggle')) return;
  let desired = true;
  try { desired = sessionStorage.getItem(KEY) !== 'off'; } catch {}
  let player, ready = false, playing = false, failed = false, loading = false;

  const panel = document.createElement('section');
  panel.className = 'music-panel';
  panel.setAttribute('aria-hidden', 'true');
  panel.inert = true;
  panel.innerHTML = `
    <div class="music-panel-heading"><span>Nhạc nền · VieTales</span>
      <a href="https://www.youtube.com/watch?v=${VIDEO_ID}" target="_blank" rel="noopener noreferrer">YouTube ↗</a></div>
    <div id="music-youtube-player"></div>
    <p class="music-status" role="status">Đang kết nối YouTube…</p>`;
  const status = panel.querySelector('.music-status');
  const button = document.createElement('button');
  button.id = 'audio-toggle';
  button.type = 'button';
  button.className = 'audio-toggle is-ready';
  button.setAttribute('aria-controls', 'music-youtube-player');
  button.innerHTML = `<span class="audio-toggle-ring" aria-hidden="true"></span>
    <svg class="audio-icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path d="M4 12h5l6-5v18l-6-5H4z" fill="currentColor"/>
      <g class="music-waves" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
        <path d="M19 12a6 6 0 0 1 0 8M23 9a10 10 0 0 1 0 14"/></g>
      <path class="music-cross" d="m20 13 7 6m0-6-7 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`;
  document.body.append(panel, button);
  panel.hidden = !desired;

  function remember() {
    try { sessionStorage.setItem(KEY, desired ? 'on' : 'off'); } catch {}
  }
  function render() {
    button.classList.toggle('is-playing', playing);
    button.setAttribute('aria-pressed', String(playing));
    const label = playing ? 'Tắt nhạc nền' : 'Bật nhạc nền';
    button.setAttribute('aria-label', label);
    button.title = label;
  }
  function play() {
    if (!ready || failed || !desired) return;
    panel.hidden = false;
    player.unMute();
    player.setVolume(50);
    player.playVideo();
    status.textContent = 'Đang chờ phát · Nếu chưa có tiếng, bấm Play trong video.';
  }
  async function start() {
    if (loading || ready) return;
    loading = true;
    failed = false;
    panel.hidden = false;
    status.textContent = 'Đang kết nối YouTube…';
    try {
      const YT = await loadAPI();
      player = new YT.Player('music-youtube-player', {
        width: 280, height: 200, videoId: VIDEO_ID,
        playerVars: {
          autoplay: desired ? 1 : 0, controls: 1, playsinline: 1,
          loop: 1, playlist: VIDEO_ID, origin: location.origin, rel: 0
        },
        events: {
          onReady(event) {
            player = event.target;
            ready = true;
            loading = false;
            player.getIframe().setAttribute('title', 'Nhạc Epic Không Lời – Tự Hào Việt Nam');
            player.getIframe().setAttribute('tabindex', '-1');
            if (desired) play();
            else { player.pauseVideo(); panel.hidden = true; }
          },
          onStateChange(event) {
            if (event.data === YT.PlayerState.PLAYING) {
              if (!desired) { event.target.pauseVideo(); return; }
              playing = true;
              remember();
              status.textContent = 'Đang phát · Bấm nút loa để tắt.';
            } else {
              const wasPlaying = playing;
              playing = false;
              if (event.data === YT.PlayerState.PAUSED && wasPlaying && desired) {
                desired = false;
                remember();
                status.textContent = 'Đã tạm dừng · Bấm nút loa để phát lại.';
              }
            }
            render();
          },
          onAutoplayBlocked() {
            playing = false;
            status.textContent = 'Chạm trang hoặc bấm Play trong video để nghe nhạc.';
            render();
          },
          onError(event) {
            failed = true;
            loading = false;
            playing = false;
            status.textContent = 'YouTube không phát được video (mã ' + event.data + '). Thử mở link YouTube phía trên.';
            render();
          }
        }
      });
    } catch (error) {
      loading = false;
      failed = true;
      status.textContent = 'Không kết nối được YouTube. Bấm loa để thử lại hoặc mở link phía trên.';
      console.warn('[VieTales] YouTube:', error);
    }
  }
  button.addEventListener('click', () => {
    if (playing || (loading && desired)) {
      desired = false;
      remember();
      player?.pauseVideo?.();
      playing = false;
      panel.hidden = true;
      render();
    } else {
      desired = true;
      remember();
      panel.hidden = false;
      if (!ready) start();
      else if (failed) {
        failed = false;
        player.loadVideoById(VIDEO_ID);
        play();
      } else play();
    }
  });
  // Skip our controls so the first speaker click cannot both wake and stop music.
  function wake(event) {
    if (!event.isTrusted || button.contains(event.target) || panel.contains(event.target)) return;
    if (event.type === 'keydown' && (event.repeat || event.ctrlKey || event.altKey || event.metaKey)) return;
    if (desired && ready && !playing && !failed) play();
  }
  document.addEventListener('click', wake);
  document.addEventListener('touchend', wake, { passive: true });
  document.addEventListener('keydown', wake);
  render();
  if (desired) start();
}
