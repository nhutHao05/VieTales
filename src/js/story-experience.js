import { storyAssets } from './story-assets.js';

// Only the supplied GLB is enabled; all other items remain 2D references.
const items = storyAssets[document.body.dataset.story];
const stage = document.querySelector('.artifact-stage');
const image = stage?.querySelector('.artifact-fallback');
const picker = [...document.querySelectorAll('[data-artifact]')];
const status = document.querySelector('.artifact-status');
let active = 0, scale = 1, x = 0, y = 0, drag = null;
let display=null, loadVersion=0, spinning=false, loading=false;
const modelButton=document.querySelector('[data-action="display-model"]');
const slug=document.body.dataset.story;
const modelIndex=slug==='den-hung'?1:-1;
const modelTitle='Trống đồng Đông Sơn';
const updateStatus=()=>{status.textContent=display?modelTitle+' · Kéo xoay 360° · Cuộn để phóng':items[active].label+' · Ảnh 2D';};
function closeDisplay(){
 loadVersion++;display?.dispose();display=null;
 stage.classList.remove('has-display');
 modelButton?.setAttribute('aria-pressed','false');
 document.querySelectorAll('[data-action="display-back"],[data-action="display-front"],[data-action="display-side"]').forEach(b=>b.hidden=true);
 spinning=false;document.querySelector('[data-action="display-rotate"]')?.setAttribute('aria-pressed','false');
 document.querySelector('[data-action="display-rotate"]')?.setAttribute('hidden','');
 stage.removeAttribute('data-model-name');
 if(modelButton)modelButton.textContent='Xem trống đồng 3D';
 status.textContent=items[active].label+' · Ảnh 2D';
}
async function toggleDisplay(){
 if(display){closeDisplay();return;}
 reset();
 if(loading||active!==modelIndex||modelIndex<0)return;
 const version=++loadVersion;
 loading=true;modelButton.disabled=true;
 status.textContent='Đang mở mô hình…';
 try{
  const create=(await import('./glb-display3d.js')).createGLBDisplay;
  if(version!==loadVersion)return;
  const next=await create(stage);
  if(version!==loadVersion){next.dispose();return;}
  display=next;stage.classList.add('has-display');
  modelButton.setAttribute('aria-pressed','true');
  document.querySelectorAll('[data-action="display-back"],[data-action="display-front"],[data-action="display-side"]').forEach(b=>b.hidden=false);
  stage.dataset.modelName=modelTitle;
  modelButton.textContent='Xem ảnh 2D';
  document.querySelector('[data-action="display-rotate"]').hidden=false;
  updateStatus();
 }catch(e){if(version===loadVersion){console.warn('Không tải được GLB:',e);status.textContent='Không tải được 3D · Vẫn xem được ảnh nhóm';}}
 finally{loading=false;modelButton.disabled=false;
  if(version!==loadVersion&&active===modelIndex&&!display&&!document.hidden)toggleDisplay();
 }
}

function paint() {
  const limitX = stage.clientWidth * (scale - 1) / 2;
  const limitY = stage.clientHeight * (scale - 1) / 2;
  x = Math.max(-limitX, Math.min(limitX, x));
  y = Math.max(-limitY, Math.min(limitY, y));
  image.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  stage.classList.toggle('is-zoomed', scale > 1);
}
function reset() { scale = 1; x = y = 0; paint(); }
function zoom(factor) { scale = Math.max(1, Math.min(4, scale * factor)); paint(); }
function select(i) {
  if (!items?.[i]) return;
  closeDisplay();
  active = i;
  if(modelButton)modelButton.hidden=i!==modelIndex;
  image.src = items[i].src;
  image.alt = items[i].label;
  picker.forEach((b,n) => b.setAttribute('aria-pressed', String(n === i)));
  document.querySelector('.artifact-caption').textContent = items[i].caption;
  status.textContent = items[i].label + ' · Ảnh 2D';
  reset();
  if(i===modelIndex)toggleDisplay();
}
if (items && stage && image) {
  // Keep reading and keyboard order aligned: story first, images below.
  const panel=stage.closest('.artifact-panel');
  panel.parentElement.append(panel);
  stage.classList.add('is-photo');
  image.draggable = false;
  picker.forEach(b => b.addEventListener('click', () => select(Number(b.dataset.artifact))));
  document.querySelectorAll('[data-look]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();select(Number(a.dataset.look));
    stage.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
    stage.focus({preventScroll:true});
  }));
  document.querySelector('.artifact-toolbar').addEventListener('click', e => {
    const action = e.target.closest('button')?.dataset.action;
    if (action === 'display-model') toggleDisplay();
    if (action === 'display-rotate' && display) { spinning=!spinning;display.animate(spinning);e.target.closest('button').setAttribute('aria-pressed',String(spinning)); }
    if (['display-back','display-front','display-side','reset'].includes(action)) {spinning=false;display?.animate(false);document.querySelector('[data-action="display-rotate"]')?.setAttribute('aria-pressed','false');}
    if (action === 'display-back') { display?.view(Math.PI); status.textContent='Trống đồng · Mặt sau'; }
    if (action === 'display-front') { display?.view(0); updateStatus(); }
    if (action === 'display-side') { display?.view(Math.PI/2); status.textContent='Trống đồng · Mặt bên'; }
    if (action === 'zoom-in') display?display.zoom(.85):zoom(1.3);
    if (action === 'zoom-out') display?display.zoom(1.18):zoom(1/1.3);
    if (action === 'reset') { reset();display?.reset(); }
  });
  stage.addEventListener('keydown', e => {
    if (!['ArrowLeft','ArrowRight','+','=','-','Home'].includes(e.key)) return;
    e.preventDefault();
    if (e.key === 'ArrowLeft') display?display.turn?.(-.15):select((active + items.length - 1) % items.length);
    if (e.key === 'ArrowRight') display?display.turn?.(.15):select((active + 1) % items.length);
    if (e.key === '+' || e.key === '=') display?display.zoom(.85):zoom(1.3);
    if (e.key === '-') display?display.zoom(1.18):zoom(1/1.3);
    if (e.key === 'Home') { reset();display?.reset();spinning=false;document.querySelector('[data-action="display-rotate"]')?.setAttribute('aria-pressed','false'); }
  });
  stage.addEventListener('pointerdown', e => {
    if (display || scale <= 1 || e.button !== 0) return;
    drag = { id:e.pointerId, x:e.clientX-x, y:e.clientY-y };
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', e => {
    if (!drag || drag.id !== e.pointerId) return;
    x=e.clientX-drag.x; y=e.clientY-drag.y; paint();
  });
  const release = () => { drag=null; };
  stage.addEventListener('pointerup',release);
  stage.addEventListener('pointercancel',release);
  stage.addEventListener('lostpointercapture',release);
  window.addEventListener('resize',paint);
  window.addEventListener('pagehide',closeDisplay);
  select(modelIndex>=0?modelIndex:0);
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  motion.addEventListener('change',()=>{if(motion.matches){spinning=false;display?.animate(false);document.querySelector('[data-action="display-rotate"]')?.setAttribute('aria-pressed','false');}});

}
