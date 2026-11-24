(() => {
  const {renderer, scene, camera, height, bridgeY, road, quarter, canWalk} = town;
  const canvas = renderer.domElement;
  const views = {
    bridge: [-.65,22,.015,.012], sister: [-.1,8.3,-.79,.15],
    pisola: [-4.3,-2.5,.95,.14], hill: [-.95,-20.9,-.28,.10]
  };
  const doors = [
    ['SISTERの入口',...town.salonDoor], ['PISOLAの入口',-8.05,-4.1], ['ゲーム展示館の入口',2.15,-32.55]
  ];
  // Fixed vantage points beside the bridge: river and arches in front, PISOLA left,
  // SISTER right, the lane and gallery behind. Portrait screens get their own framing.
  const vistas = {
    a: {name:'案A 橋の脇', wide:{eye:[9.0,4.0,27.8],target:[-2.8,.9,-6],fov:54},
      narrow:{eye:[9.2,4.0,28.2],target:[-2.6,.2,-6],fov:68}},
    b: {name:'案B 東岸の高台', wide:{eye:[6.8,6.8,31.5],target:[-1.8,1,-7],fov:47},
      narrow:{eye:[6.8,8.6,37],target:[-2.2,1.2,-8],fov:66}}
  };
  const select = document.querySelector('#views');
  const picker = document.querySelector('#vistas');
  const keys = new Set(), pointers = new Map(), padKeys = new Map();
  const aliases = {arrowup:'w', arrowdown:'s', arrowleft:'a', arrowright:'d'};
  const clamp = THREE.MathUtils.clamp;
  const start = location.hash.slice(1);
  let [x,z,yaw,pitch] = Object.hasOwn(views,start) ? views[start] : views.bridge;
  // The vantage keeps its own small look-around offset; walking state is never touched.
  let vista = 'a', glance = {yaw:0, pitch:0};
  // This rig has its own focus, lens and orbit. Walking coordinates stay in metres.
  const orbit = {x:0, z:-4, bearing:-.45, elevation:.47, distance:62};
  let current = 'walk', dirty = true, last = performance.now();
  const isOverview = () => current === 'overview';
  const pose = () => vistas[vista][camera.aspect < .8 ? 'narrow' : 'wide'];

  function clearInput() {
    for (const [id,btn] of padKeys) if (btn.hasPointerCapture(id)) btn.releasePointerCapture(id);
    for (const id of pointers.keys()) if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    keys.clear(); padKeys.clear(); pointers.clear();
  }
  function size() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.fov = current === 'vista' ? pose().fov
      : isOverview() ? (camera.aspect < .8 ? 67 : 48) : (innerWidth < 600 ? 78 : 60);
    camera.updateProjectionMatrix();
    dirty = true;
  }
  const help = {
    walk: ['WASD・矢印で歩く　ドラッグで見回す', '方向ボタンで歩く　ドラッグで見回す'],
    overview: ['ドラッグで回転　ホイールでズーム　右ドラッグ・矢印で移動', '1本指で回転　2本指で移動・ピンチでズーム'],
    vista: ['ドラッグ・Q/Eで少し見回す　案A・案Bで構図を切り替え', '1本指で少し見回す　案A・案Bで構図を切り替え']
  };
  function mode(next) {
    if (next === current) return;
    clearInput();
    current = next;
    glance = {yaw:0, pitch:0};
    document.body.classList.toggle('overview', next === 'overview');
    document.body.classList.toggle('vista', next === 'vista');
    for (const b of document.querySelectorAll('[data-mode]')) {
      b.setAttribute('aria-pressed', String(b.dataset.mode === next));
    }
    select.hidden = next !== 'walk';
    picker.hidden = next !== 'vista';
    document.querySelector('#pad').hidden = next !== 'walk';
    document.querySelector('#desktop-help').textContent = help[next][0];
    document.querySelector('#touch-help').textContent = help[next][1];
    size();
    canvas.focus({preventScroll:true});
  }
  function compose(name) {
    vista = name; glance = {yaw:0, pitch:0};
    for (const b of picker.querySelectorAll('[data-vista]')) {
      b.setAttribute('aria-pressed', String(b.dataset.vista === name));
    }
    size();
  }
  function onTap(b, activate) {
    b.onclick = activate;
    // After a canvas drag some touch browsers suppress the next compatibility click.
    // Accept a completed tap as well; both handlers are idempotent when both events fire.
    let tap;
    b.onpointerdown = e => {
      if (e.pointerType === 'touch') tap = {id:e.pointerId,x:e.clientX,y:e.clientY};
    };
    b.onpointercancel = () => { tap = null };
    b.onpointerup = e => {
      if (tap?.id === e.pointerId && Math.hypot(e.clientX-tap.x,e.clientY-tap.y)<10) activate();
      tap = null;
    };
  }
  for (const b of document.querySelectorAll('[data-mode]')) onTap(b, () => mode(b.dataset.mode));
  for (const b of picker.querySelectorAll('[data-vista]')) {
    onTap(b, () => { compose(b.dataset.vista); canvas.focus({preventScroll:true}) });
  }
  select.onchange = () => {
    clearInput();
    if (select.value) [x,z,yaw,pitch] = views[select.value];
    select.value = ''; dirty = true; canvas.focus();
  };
  function pan(right,forward) {
    const c = Math.cos(orbit.bearing), s = Math.sin(orbit.bearing);
    orbit.x = clamp(orbit.x + right*c - forward*s,-18,18);
    orbit.z = clamp(orbit.z - right*s - forward*c,-39,20);
  }
  function zoom(factor) { orbit.distance = clamp(orbit.distance * factor,15,74); dirty = true }
  function key(e, down) {
    const k = aliases[e.key.toLowerCase()] || e.key.toLowerCase();
    if (!['w','a','s','d','q','e','+','=','-'].includes(k)) return;
    if (!down) { keys.delete(k); return }
    if (e.target === select || e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault();
    if (!e.repeat) keys.add(k);
  }
  onkeydown = e => key(e,true); onkeyup = e => key(e,false);
  onblur = clearInput;
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearInput() });
  for (const b of document.querySelectorAll('[data-key]')) {
    b.onpointerdown = e => { b.setPointerCapture(e.pointerId); padKeys.set(e.pointerId,b) };
    b.onlostpointercapture = e => padKeys.delete(e.pointerId);
  }
  canvas.oncontextmenu = e => e.preventDefault();
  canvas.onwheel = e => {
    if (!isOverview()) return;
    e.preventDefault();
    const pixels = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
    zoom(Math.exp(clamp(pixels,-240,240)*.0016));
  };
  canvas.onpointerdown = e => {
    canvas.focus(); canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  };
  canvas.onlostpointercapture = e => pointers.delete(e.pointerId);
  function pair() {
    const [a,b] = pointers.values();
    return {x:(a.x+b.x)/2, y:(a.y+b.y)/2, span:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))};
  }
  canvas.onpointermove = e => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const two = pointers.size === 2 && isOverview();
    const old = two && pair(), dx=e.clientX-p.x, dy=e.clientY-p.y;
    p.x=e.clientX; p.y=e.clientY;
    if (pointers.size > 2) return;
    const units = 2 * orbit.distance * Math.tan(camera.fov*Math.PI/360) / innerHeight;
    if (two) {
      const now = pair();
      pan((old.x-now.x)*units,(now.y-old.y)*units);
      zoom(old.span/now.span);
    } else if (current === 'vista') {
      if (pointers.size === 1) look(-dx*.003,-dy*.003);
    } else if (isOverview() && (e.buttons === 2 || e.shiftKey)) {
      pan(-dx*units,dy*units);
    } else if (isOverview()) {
      orbit.bearing -= dx*.006;
      orbit.elevation = clamp(orbit.elevation+dy*.004,.30,1.24);
    } else if (pointers.size === 1) {
      yaw -= dx*.005;
      pitch = clamp(pitch-dy*.004,-.85,.86);
    }
    dirty=true;
  };
  function look(dyaw,dpitch) {
    glance.yaw = clamp(glance.yaw+dyaw,-.32,.32);
    glance.pitch = clamp(glance.pitch+dpitch,-.18,.18);
  }
  function renderCamera() {
    let place;
    if (current === 'vista') {
      const {eye,target} = pose();
      camera.position.set(...eye);
      camera.lookAt(...target);
      camera.rotateOnWorldAxis(new THREE.Vector3(0,1,0),glance.yaw);
      camera.rotateX(glance.pitch);
      place = '橋の眺め・'+vistas[vista].name;
    } else if (isOverview()) {
      // A portrait lens needs more horizontal clearance for both riverside facades.
      const distance = orbit.distance * Math.max(1,.52/camera.aspect);
      const horizontal = distance*Math.cos(orbit.elevation);
      const y = height(orbit.z)+1;
      camera.position.set(orbit.x+Math.sin(orbit.bearing)*horizontal,y+distance*Math.sin(orbit.elevation),
        orbit.z+Math.cos(orbit.bearing)*horizontal);
      camera.lookAt(orbit.x,y,orbit.z);
      place='街区の俯瞰';
    } else {
      camera.position.set(x,2.02+height(z)+bridgeY(z)+quarter.stepHeight(x,z),z);
      camera.rotation.set(pitch,yaw,0,'YXZ');
      const door=doors.find(([,dx,dz]) => Math.hypot(x-dx,z-dz)<1.4);
      const alley=quarter.onPath(x,z) && (z< -33.15 || !road(x,z));
      place=door?.[0] || (alley?'住宅の路地':z>9?'石橋':z<-27?'丘の前庭':z<-9?'丘へ続く坂道':'川沿いの路地');
    }
    document.querySelector('#place').textContent=place;
    renderer.render(scene,camera); dirty=false;
  }
  function frame(now) {
    const dt=Math.min(.06,(now-last)/1000); last=now;
    const down = k => {
      if (keys.has(k)) return true;
      for (const b of padKeys.values()) if (b.dataset.key === k) return true;
      return false;
    };
    const f=down('w')-down('s'), r=down('d')-down('a'), turn=down('q')-down('e');
    if (current === 'vista') {
      if (turn) look(turn*dt*.6,0);
    } else if (isOverview()) {
      if (f || r) pan(r*dt*orbit.distance*.28,f*dt*orbit.distance*.28);
      orbit.bearing+=turn*dt;
      const magnify=down('-')-(down('+')||down('='));
      if (magnify) zoom(Math.exp(magnify*dt));
    } else {
      yaw+=turn*dt*1.6;
      if (f || r) {
        const step=4.7*dt/Math.hypot(f,r);
        const nx=x+(-Math.sin(yaw)*f+Math.cos(yaw)*r)*step, nz=z+(-Math.cos(yaw)*f-Math.sin(yaw)*r)*step;
        if (canWalk(nx,z)) x=nx;
        if (canWalk(x,nz)) z=nz;
      }
    }
    if (f || r || turn || dirty) renderCamera();
    requestAnimationFrame(frame);
  }
  const [, opening, choice] = /^(vista|overview)(?:-([ab]))?$/.exec(start) || [];
  if (choice) compose(choice);
  if (opening) mode(opening);
  onresize=size; size(); requestAnimationFrame(frame);
})();
