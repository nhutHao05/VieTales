/* Illustrated atlas. Geographic outlines use the bundled public-domain data.
   Site pins and island insets are schematic, not navigation coordinates. */
const NS = 'http://www.w3.org/2000/svg';
const sites = [
  ['Đền Thờ Vua Hùng', '/locations/den-hung.html', 105.7603, 10.0389],
  ['Chùa Nam Nhã', '/locations/nam-nha.html', 105.7741, 10.0457],
  ['Khu Tưởng Niệm Bùi Hữu Nghĩa', '/locations/bui-huu-nghia.html', 105.7692, 10.0433],
];
const project = ([lon, lat]) => [(lon - 98) * 38, (25 - lat) * 40];
function path(polygons) {
  return polygons.map(rings => rings.map(ring => ring.map((p,i) => {
    const [x,y] = project(p); return (i ? 'L' : 'M') + x.toFixed(2) + ',' + y.toFixed(2);
  }).join('') + 'Z').join('')).join('');
}
export async function initHeritageMap(container) {
  if (container.querySelector('svg')) return;
  const responses = await Promise.all(['/data/vietnam-map.json','/data/map-neighbors.json','/data/vietnam-provinces.json'].map(url => fetch(url)));
  if (responses.some(r => !r.ok)) throw new Error('Map data unavailable');
  const [vietnam, neighbors, provinces] = await Promise.all(responses.map(r => r.json()));
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox','0 0 800 760');
  svg.setAttribute('role','group');
  svg.setAttribute('aria-label','Bản đồ chuyện Việt — chọn Cần Thơ để khám phá ba di tích');
  svg.innerHTML = `<defs>
    <pattern id="atlas-waves" width="78" height="65" patternUnits="userSpaceOnUse"><path d="M12 34q6-7 12 0t12 0" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.5"/></pattern>
    <linearGradient id="atlas-water" x2=".3" y2="1"><stop stop-color="#dceee6"/><stop offset="1" stop-color="#9bcac5"/></linearGradient>
    <filter id="pin-shadow" x="-60%" y="-40%" width="220%" height="200%"><feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#3a574b" flood-opacity=".2"/></filter>
  </defs><rect width="800" height="760" fill="url(#atlas-water)"/><rect width="800" height="760" fill="url(#atlas-waves)"/>
  <g class="atlas-geography"></g>
  <g class="atlas-country-labels" fill="#917654" font-size="12" letter-spacing="3" font-weight="600">
    <text x="300" y="38">TRUNG QUỐC</text><text x="155" y="290">LÀO</text><text x="115" y="515">CAMPUCHIA</text>
    <text x="480" y="410" fill="#39796f" font-size="20" letter-spacing="5">BIỂN ĐÔNG</text>
  </g>
  <g class="atlas-islands" fill="#386e60" text-anchor="middle">
    <text x="616" y="245" font-size="13" font-weight="700">QUẦN ĐẢO HOÀNG SA</text>
    <rect x="554" y="260" width="124" height="92" rx="18" fill="#eaf3dc" fill-opacity=".45" stroke="#fffaf0" stroke-width="2" stroke-dasharray="5 5"/>
    <path d="M585 292l4-3 3 5-5 2zm44 24l4-3 2 5-4 2zm-24-32 3-2 3 4-4 2zm46 14 3-2 2 4-4 2z" fill="#fffaf0" stroke="#5b9d8f"/>
    <text x="616" y="478" font-size="13" font-weight="700">QUẦN ĐẢO TRƯỜNG SA</text>
    <rect x="545" y="493" width="142" height="164" rx="20" fill="#eaf3dc" fill-opacity=".45" stroke="#fffaf0" stroke-width="2" stroke-dasharray="5 5"/>
    <path d="M579 526l4-3 3 5-5 2zm44 24l4-3 2 5-4 2zm-24 35 3-2 3 4-4 2zm46 14 3-2 2 4-4 2zm-61 28 4-3 3 5-5 2zm64-95 3-2 3 4-4 2z" fill="#fffaf0" stroke="#5b9d8f"/>
    <text x="616" y="678" font-size="10" letter-spacing=".5">Sơ đồ quần đảo · không theo tỉ lệ</text>
  </g>
  <g class="atlas-country-pin" role="button" tabindex="0" aria-label="Khám phá ba điểm dừng tại Cần Thơ" transform="translate(294.98 598.3)">
    <rect x="-23" y="-27" width="46" height="50" rx="3" fill="#fff8e8" stroke="#b43c31" stroke-width="1.5"/>
    <image href="/images/nam-nha-card.webp" x="-19" y="-23" width="38" height="40" preserveAspectRatio="xMidYMid slice"/>
    <rect x="-46" y="33" width="92" height="28" rx="14" fill="#fff8e8"/><text y="51" text-anchor="middle" fill="#694d38" font-size="13" font-weight="600">Cần Thơ</text>
  </g>
  <g class="atlas-detail-pins"></g>
  <g class="atlas-compass" transform="translate(735 65)" fill="none" stroke="#598578"><path d="M0-18V18M-12 0h24"/><path d="m0-18-4 9h8Z" fill="#b43c31" stroke="none"/><text y="-26" text-anchor="middle" fill="#598578" stroke="none" font-size="11">B</text></g>`;
  const geography = svg.querySelector('.atlas-geography');
  for (const feature of neighbors.features) {
    const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    const el = document.createElementNS(NS,'path');
    el.setAttribute('d',path(polygons)); el.setAttribute('class','atlas-neighbor'); geography.append(el);
  }
  const land = document.createElementNS(NS,'path');
  land.setAttribute('d',path(vietnam.polygons)); land.setAttribute('class','atlas-land'); geography.append(land);
  const boundaries = document.createElementNS(NS,'g');
  boundaries.setAttribute('class','atlas-provinces');
  geography.append(boundaries);
  // Use the largest polygon for each label, so offshore islands do not pull
  // the province name out to sea. Label positions are editorial, not capitals.
  const area = ring => Math.abs(ring.reduce((sum,p,i) => {
    const q=ring[(i+1)%ring.length]; return sum+p[0]*q[1]-q[0]*p[1];
  },0));
  const anchors = provinces.provinces.map(province => {
    const ring = [...province.polygons].sort((a,b)=>area(b)-area(a))[0];
    let crossSum=0, cx=0, cy=0;
    ring.forEach((p,i) => { const q=ring[(i+1)%ring.length]; const c=p[0]*q[1]-q[0]*p[1]; crossSum+=c; cx+=(p[0]+q[0])*c; cy+=(p[1]+q[1])*c; });
    const center = crossSum ? [cx/(3*crossSum),cy/(3*crossSum)] : ring[0];
    const [x,y]=project(center);
    const shape=document.createElementNS(NS,'path');
    shape.setAttribute('d',path(province.polygons.map(r=>[r])));
    shape.setAttribute('class','atlas-province');
    const title=document.createElementNS(NS,'title');title.textContent=province.name;shape.append(title);
    boundaries.append(shape);
    return {name:province.name,ax:x,ay:y,x,y};
  });
  const labels=document.createElementNS(NS,'g');
  labels.setAttribute('class','atlas-province-labels');
  svg.querySelector('.atlas-country-pin').before(labels);
  function drawProvinceLabels(detail) {
    labels.replaceChildren();
    const size=detail ? 4 : 9;
    const items=anchors.filter(p=>!detail || (p.ax>195 && p.ax<405 && p.ay>510 && p.ay<700)).map(p=>({...p,w:p.name.length*size*.53+5,h:size+3}));
    // Separate dense northern labels while keeping short leader lines to land.
    for(let pass=0;pass<100;pass++) {
      for(let i=0;i<items.length;i++) for(let j=i+1;j<items.length;j++) {
        const a=items[i],b=items[j],dx=a.x-b.x,dy=a.y-b.y;
        const overlapX=(a.w+b.w)/2-Math.abs(dx),overlapY=(a.h+b.h)/2-Math.abs(dy);
        if(overlapX>0 && overlapY>0) {
          if(overlapX<overlapY) { const shift=overlapX/2+.2; a.x+=(dx>=0?shift:-shift); b.x-=(dx>=0?shift:-shift); }
          else { const shift=overlapY/2+.2; a.y+=(dy>=0?shift:-shift); b.y-=(dy>=0?shift:-shift); }
        }
      }
    }
    items.forEach(p=>{
      if(Math.hypot(p.x-p.ax,p.y-p.ay)>size) {
        const line=document.createElementNS(NS,'path');line.setAttribute('d',`M${p.ax},${p.ay}L${p.x},${p.y}`);line.setAttribute('class','atlas-label-leader');labels.append(line);
      }
      const text=document.createElementNS(NS,'text');text.textContent=p.name;
      text.setAttribute('x',p.x);text.setAttribute('y',p.y);
      text.style.fontSize=size+'px';text.style.strokeWidth=(detail?1:2.2)+'px';
      labels.append(text);
    });
  }
  const pins = svg.querySelector('.atlas-detail-pins');
  const canTho = provinces.provinces.find(p => p.name === 'Cần Thơ');
  const outlines = canTho.polygons.map(ring => ring.map(project));
  function insideCanTho(x,y) {
    return outlines.some(ring => {
      let inside = false;
      for (let i=0,j=ring.length-1;i<ring.length;j=i++) {
        const [ax,ay]=ring[i], [bx,by]=ring[j];
        if ((ay>y)!==(by>y) && x<(bx-ax)*(y-ay)/(by-ay)+ax) inside=!inside;
      }
      return inside;
    });
  }
  const placedDots = [];
  sites.forEach(([name,url,lon,lat],i) => {
    const [geoX,geoY] = project([lon,lat]);
    // Separate display dots, but keep the whole dot inside Can Tho.
    const [ox,oy] = [[-3,0],[0,-3],[3,0]][i];
    const candidates = [];
    for(let dx=-12;dx<=12;dx+=.5) for(let dy=-12;dy<=12;dy+=.5) {
      const x=geoX+dx,y=geoY+dy;
      if ([[0,0],[-1,0],[1,0],[0,-1],[0,1]].every(([a,b])=>insideCanTho(x+a,y+b))
          && placedDots.every(p=>Math.hypot(x-p.x,y-p.y)>=2.8)) {
        candidates.push({x,y,score:Math.hypot(dx-ox,dy-oy)});
      }
    }
    candidates.sort((a,b)=>a.score-b.score);
    if (!candidates.length) throw new Error('Cannot place dot inside Can Tho');
    const {x,y} = candidates[0];
    placedDots.push({x,y});
    const link = document.createElementNS(NS,'a');
    link.setAttribute('href',url); link.setAttribute('aria-label',name);
    const [dx,dy] = [[-23,-15],[0,-32],[23,-15]][i];
    const image = ['/images/den-hung-card.webp','/images/nam-nha-card.webp','/images/story/bui-huu-nghia-cong-photo.webp'][i];
    link.innerHTML = `<path d="M${x} ${y}L${geoX+dx} ${geoY+dy}" fill="none" stroke="#925a42" stroke-width=".7" vector-effect="non-scaling-stroke"/><circle cx="${x}" cy="${y}" r=".8" fill="#b43c31"/><g transform="translate(${geoX+dx} ${geoY+dy})"><rect class="atlas-photo-frame" x="-8" y="-9" width="16" height="18" rx=".8" fill="#fffaf0" stroke="#b4936d" stroke-width=".5"/><image href="${image}" x="-7" y="-8" width="14" height="14" preserveAspectRatio="xMidYMid slice"/></g>`;
    const title = document.createElementNS(NS,'title'); title.textContent = name; link.prepend(title); pins.append(link);
  });
  container.append(svg);
  const status = container.querySelector('[role="status"]');
  let mode = 'country';
  function setView(next) {
    mode = next === 'local' ? 'delta' : next;
    svg.setAttribute('viewBox',mode === 'country' ? '0 0 800 760' : '195 510 210 190');
    container.classList.toggle('is-delta',mode === 'delta');
    container.classList.toggle('is-local',mode === 'local');
    svg.querySelector('.atlas-country-pin').setAttribute('transform', `translate(294.98 598.3) scale(${mode === 'delta' ? .24 : 1})`);
    drawProvinceLabels(mode !== 'country');
    document.querySelectorAll('[data-map-view]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.mapView === mode || (mode === 'local' && button.dataset.mapView === 'delta'))));
    status.textContent = mode === 'delta' ? 'Chạm ảnh để mở câu chuyện · Các chấm được giãn nhẹ để dễ phân biệt.' : 'Chạm ảnh tại Cần Thơ để khám phá ba địa điểm.';
  }
  document.querySelectorAll('[data-map-view]').forEach(button => button.addEventListener('click',() => setView(button.dataset.mapView)));
  const cluster = svg.querySelector('.atlas-country-pin');
  cluster.addEventListener('click',() => setView('local'));
  cluster.addEventListener('keydown',event => { if (['Enter',' '].includes(event.key)) { event.preventDefault(); setView('local'); } });
  document.querySelectorAll('[data-atlas-site]').forEach(link => {
    const highlight = on => pins.children[Number(link.dataset.atlasSite)]?.classList.toggle('is-highlighted',on);
    link.addEventListener('mouseenter',() => highlight(true)); link.addEventListener('mouseleave',() => highlight(false));
    link.addEventListener('focus',() => highlight(true)); link.addEventListener('blur',() => highlight(false));
  });
  setView('country');
}
