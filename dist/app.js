"use strict";

const byId = id => document.getElementById(id);
const canvas = byId("map"), panel = byId("panel"), exhibition = byId("exhibition");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let scene, project, position = [...START], entrance, nearby, path = [], frame = 0, lastTime, phase = 0;
const held = new Set();
const directions = {arrowleft:[-1,0],a:[-1,0],arrowright:[1,0],d:[1,0],
  arrowup:[0,-1],w:[0,-1],arrowdown:[0,1],s:[0,1]};
const map = new TownMap(canvas,byId("pins"),walkTo);

function announce(message) { byId("sr").textContent = message; }

function stopWalking() {
  held.clear();
  path = [];
  cancelAnimationFrame(frame);
  frame = 0;
  lastTime = null;
  map.paint(position);
}

function locationStatus() {
  nearby = project ? null : PROJECTS.find(b=>distance(position,b.door)<.78);
  const action = byId("action");
  action.hidden = !project && !nearby;
  const label = project ? project.venue : nearby ? nearby.venue+"の入口" :
    position[1]>CANAL[1] ? "対岸の遊歩道" : position[1]>=CANAL[0] ? "川に架かる橋" :
    distance(position,START)<1.6 ? "川沿いの広場" : "川辺の街路";
  const locationText = "現在地　"+label;
  if (byId("location").textContent!==locationText) byId("location").textContent=locationText;
  const actionText = project ? "展示を見る" : "入る";
  if (action.textContent!==actionText) action.textContent=actionText;
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(tick);
}

function tick(now) {
  frame=0;
  let travel = Math.min(.05,lastTime===null ? 1/60 : (now-lastTime)/1000)*3.45;
  lastTime=now;
  const before = position;
  if (held.size) {
    let x=0,y=0;
    for (const key of held) { x+=directions[key][0]; y+=directions[key][1]; }
    position = map.area.keyStep(position,x,y,travel);
  } else {
    while (path.length && travel>0) {
      const next=path[0], gap=distance(position,next);
      if (gap<=travel) { position=path.shift(); travel-=gap; }
      else {
        const t=travel/gap;
        position=[position[0]+(next[0]-position[0])*t,position[1]+(next[1]-position[1])*t];
        travel=0;
      }
    }
  }
  const moved=distance(before,position);
  phase+=moved*12;
  if (held.size || path.length) schedule(); else lastTime=null;
  map.paint(position,phase,moved>0 && !reducedMotion.matches,path.at(-1));
  const previous = nearby;
  locationStatus();
  if (nearby && nearby!==previous) announce(nearby.venue+"の入口。Eキーまたは「入る」で入室します。");
}

function walkTo(target) {
  stopWalking();
  path = target ? map.area.path(position,target) : [];
  if (!path.length) { announce("そこへは歩けません。道や入口を選んでください。"); return; }
  if (reducedMotion.matches) {
    position=path.at(-1);
    path=[];
    map.paint(position);
    locationStatus();
    if (nearby) announce(nearby.venue+"の入口に到着しました。");
  } else schedule();
}

// Cancel the tap when the gesture becomes a scroll, including touch scrolling.
let press;
canvas.onpointerdown = e => { if (e.isPrimary && e.button===0) press=[e.clientX,e.clientY]; };
canvas.onpointercancel = () => { press=null; };
canvas.onpointerup = e => {
  if (press && e.isPrimary && e.button===0 && distance(press,[e.clientX,e.clientY])<10)
    walkTo(map.pick(e.clientX,e.clientY));
  press=null;
};

function advance(hash,state={},replace=false) {
  const from = location.hash;
  history.replaceState({...history.state,position:[...position],focusId:document.activeElement.id},"",from);
  history[replace ? "replaceState" : "pushState"]({from,...state},"",hash);
  renderRoute();
}

function visit(b,direct=false) {
  const entry = {id:b.id,point:[...b.door],focusId:document.activeElement.id || "map"};
  if (!direct) position=[...b.door];
  advance((direct ? "#exhibit/" : "#room/")+b.id,{entrance:entry});
}

function openExhibit() {
  advance("#exhibit/"+project.id,{entrance,position:[...position]});
}

function returnToRoom() {
  if (history.state?.from==="#room/"+project.id) history.back();
  else advance("#room/"+project.id,{entrance,position:[...position]},true);
}

function exitRoom() {
  const state = {position:[...entrance.point],focusId:entrance.focusId.replace(/^works-/,"guide-")};
  advance("#town",state);
}

function act() {
  if (project) openExhibit();
  else if (nearby) visit(nearby);
}

function thumbnail(container,b) {
  const {canvas:stamp} = stamps.get(b);
  const thumb = document.createElement("canvas");
  thumb.setAttribute("aria-hidden","true");
  thumb.width=stamp.width; thumb.height=stamp.height;
  thumb.getContext("2d").drawImage(stamp,0,0);
  container.append(thumb);
}

function projectCards(parent,detailed) {
  PROJECTS.forEach(b=>{
    const link = document.createElement("a");
    link.href="#exhibit/"+b.id;
    link.id=(detailed ? "works-" : "guide-")+b.id;
    link.className="project-card";
    link.style.setProperty("--venue-color",b.color);
    link.style.setProperty("--venue-tint",b.tint);
    link.innerHTML = `<span class="thumb"></span><span class="card-copy"><span class="venue"><b>${b.number}</b> ${b.venue}</span>
      <strong>${b.title}</strong><small>${detailed ? b.tech+"　·　"+b.phase : b.kind}</small></span><span class="card-arrow" aria-hidden="true">↗</span>`;
    thumbnail(link.querySelector(".thumb"),b);
    link.onclick=e=>{ if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return; e.preventDefault(); visit(b,true); };
    parent.append(link);
  });
}

function controls() {
  return `<section class="controls"><h3>歩き方</h3><p><span class="keys"><kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd></span> または <kbd>WASD</kbd> で歩く</p>
    <p><kbd>E</kbd> / <kbd>Enter</kbd> ${project ? "展示を見る" : "入口で建物に入る"}</p>
    ${project ? '<p><kbd>Esc</kbd> 入口の外へ戻る</p>' : ''}
    <p class="touch-tip">道をタップして移動。${project ? "展示台の目印を押すと、台の前へ歩きます。" : "建物や番号を押すと、入口まで歩きます。"}</p></section>`;
}

function townGuide() {
  panel.innerHTML = `<div class="guide-heading"><span class="info-icon" aria-hidden="true">i</span><h2>街の案内所</h2></div>
    <p class="guide-intro">行き先を選ぶと、各作品の展示を開きます。</p>
    <div class="project-list"></div>`+controls();
  projectCards(panel.querySelector(".project-list"),false);
}

function roomGuide(b) {
  panel.innerHTML = `<div class="map-edition"><i></i>作品 ${b.number}</div><h2 class="room-name">${b.title}</h2>
    <p class="room-type">${b.kind}　/　${b.tech}</p><p>${b.intro}</p><h3>制作での担当</h3><p>${b.role}</p>
    <p class="phase">${b.phase}</p><div class="room-actions"><button id="room-exhibit" class="solid">展示を見る</button>
    <button id="exit-room">入口の外へ戻る</button></div>`+controls();
  byId("room-exhibit").onclick=openExhibit;
  byId("exit-room").onclick=exitRoom;
}

function renderRoute(initial=false) {
  stopWalking();
  if (exhibition.open) exhibition.close();
  if (byId("bio").open) byId("bio").close();
  const [,kind,id] = /^#(room|exhibit)\/([^/]+)$/.exec(location.hash) || [];
  project = PROJECTS.find(b=>b.id===id) || null;
  scene = project ? kind : location.hash==="#works" ? "works" : "town";
  const state=history.state || {};
  entrance = project ? (state.entrance?.id===project.id ? state.entrance :
    {id:project.id,point:[...project.door],focusId:"pin-"+project.id}) : null;
  position = state.position || (project ? [...ROOM_START] : [...START]);
  document.querySelector(".map-panel").hidden = panel.hidden = scene==="works";
  byId("works-page").hidden=scene!=="works";
  for (const name of ["town","works"]) {
    const nav=byId("nav-"+name);
    if ((scene==="works") === (name==="works")) nav.setAttribute("aria-current","page");
    else nav.removeAttribute("aria-current");
  }
  let focus;
  if (scene==="works") {
    byId("works-page").innerHTML = '<div class="works-heading"><div class="map-edition"><i></i>PORTFOLIO</div><h1 id="works-title" tabindex="-1">作品一覧</h1><p>作品を選んで展示を体験できます。</p></div><div class="works-list"></div>';
    projectCards(byId("works-page").querySelector(".works-list"),true);
    focus=byId("works-title");
  } else {
    map.setScene(project,position);
    byId("zoom-in").disabled=false;
    byId("zoom-out").disabled=true;
    byId("scene-kicker").textContent=project ? project.sign : "RIVERSIDE TOWN";
    byId("scene-title").innerHTML=(project ? project.venue : "川辺の制作街")+'<span class="title-stop">.</span>';
    byId("scene-desc").textContent=project ? project.title+"の展示室" : "小さな街を歩いて、3つの作品を巡る。";
    byId("scale").textContent=project ? "室内図" : "町内図";
    canvas.setAttribute("aria-label",project ? project.venue+"の室内。矢印キーかWASDで歩き、Eで展示を開きます。Escapeで外へ戻ります。" :
      "歩ける街。矢印キーかWASDで歩き、入口でEまたはEnterを押します。");
    if (project) roomGuide(project); else townGuide();
    locationStatus();
    focus=byId("scene-title");
    if (scene==="exhibit") {
      byId("exhibit-venue").textContent=project.venue+"　/　"+project.title;
      byId("exhibit-title").textContent=project.exhibit;
      byId("exhibit-about").textContent=project.about;
      const demo=byId("exhibit-demo");
      demo.oninput=null;
      EXHIBITS[project.id](demo);
      exhibition.style.setProperty("--accent",project.color);
      exhibition.showModal();
      exhibition.scrollTop=0;
      focus=byId("exhibit-title");
    }
  }
  document.title=(scene==="exhibit" ? project.exhibit : focus.textContent.replace(/\.$/,""))+" ｜ 澤井航志のポートフォリオ";
  if (!initial) {
    const previousFocus = byId(state.focusId || "");
    const target = previousFocus?.getClientRects().length && (!!previousFocus.closest("dialog")===exhibition.open) ? previousFocus : focus;
    target.focus({preventScroll:true});
    if (!exhibition.open) target.scrollIntoView({block:"nearest",behavior:"instant"});
    announce(project ? project.venue+"。"+project.exhibit : scene==="works" ? "作品一覧" : byId("location").textContent);
  }
}

document.querySelectorAll('.top a[href^="#"]').forEach(link=>{
  link.onclick=e=>{
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    const hash=link.getAttribute("href");
    if (hash===location.hash) return;
    if (hash==="#town" && project) exitRoom();
    else advance(hash,{position:project ? [...entrance.point] : [...position]});
  };
});
byId("action").onclick=act;
byId("to-door").onclick=exitRoom;
byId("close-exhibit").onclick=byId("to-room").onclick=returnToRoom;
exhibition.oncancel=e=>{ e.preventDefault(); returnToRoom(); };
byId("profile").onclick=()=>{ stopWalking(); byId("bio").showModal(); };
byId("bio-go").onclick=()=>{ byId("bio").close(); if (project) exitRoom(); else if (scene==="works") advance("#town",{position}); };
for (const [id,delta] of [["zoom-in",.25],["zoom-out",-.25]]) {
  byId(id).onclick=()=>{
    map.changeZoom(delta);
    byId("zoom-in").disabled=map.zoom>=2;
    byId("zoom-out").disabled=map.zoom<=1;
  };
}

window.addEventListener("keydown",e=>{
  if (scene==="works" || exhibition.open || byId("bio").open || e.ctrlKey || e.metaKey || e.altKey) return;
  const key=e.key.toLowerCase(), interactive=e.target.closest("button,a,input");
  if (directions[key]) {
    if (interactive && !e.target.closest(".map-panel")) return;
    e.preventDefault();
    if (!held.has(key)) {
      path=[];
      held.add(key);
      if (!frame) tick(performance.now());
    }
  } else if (!e.repeat && (key==="e" || (key==="enter" && !interactive))) {
    e.preventDefault(); act();
  } else if (key==="escape" && project) { e.preventDefault(); exitRoom(); }
});
window.addEventListener("keyup",e=>held.delete(e.key.toLowerCase()));
window.addEventListener("blur",stopWalking);
document.addEventListener("visibilitychange",()=>{ if (document.hidden) stopWalking(); });
window.addEventListener("resize",()=>map.resize());
window.addEventListener("popstate",()=>renderRoute());
if (!location.hash) history.replaceState(null,"","#town");
lastTime=null;
renderRoute(true);
