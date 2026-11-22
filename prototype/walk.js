(()=>{
const {renderer,scene,camera,buildings,height,bridgeY,road}=town,canvas=renderer.domElement,keys=new Set();
const views={bridge:[-.65,22,.015,.012],sister:[1.0,8.7,-.90,.15],pisola:[-4.3,-2.5,.95,.14],hill:[-.95,-20.9,-.28,.10]};
const entrances=[
 {label:'SISTERの入口',x:4.25,z:4.45},
 {label:'PISOLAの入口',x:-8.05,z:-4.1},
 {label:'ゲーム展示館の入口',x:2.15,z:-32.55}
];
let x,z,yaw,pitch,dirty=true,drag=null,last=performance.now();
function jump(name){[x,z,yaw,pitch]=views[name]||views.bridge;keys.clear();dirty=true}
jump(location.hash.slice(1));const select=document.querySelector('#views');select.onchange=()=>{if(select.value)jump(select.value);select.value='';canvas.focus()};
function free(x,z){if(z>30||z< -33.15||!road(x,z,.24))return false;
return !buildings.some(b=>{const dx=x-b.x,dz=z-b.z,c=Math.cos(b.a),s=Math.sin(b.a);return Math.abs(dx*c-dz*s)<b.w/2+.24&&Math.abs(dx*s+dz*c)<b.d/2+.24})}
const aliases={arrowup:'w',arrowdown:'s',arrowleft:'a',arrowright:'d'};
function key(e,down){if(e.target===select)return;const k=aliases[e.key.toLowerCase()]||e.key.toLowerCase();if(!['w','a','s','d','q','e'].includes(k))return;e.preventDefault();if(down)keys.add(k);else keys.delete(k)}
onkeydown=e=>key(e,true);onkeyup=e=>key(e,false);onblur=()=>{keys.clear();drag=null};document.querySelectorAll('[data-key]').forEach(btn=>{btn.onpointerdown=e=>{btn.setPointerCapture(e.pointerId);keys.add(btn.dataset.key)};btn.onlostpointercapture=()=>keys.delete(btn.dataset.key)});
canvas.onpointerdown=e=>{canvas.focus();canvas.setPointerCapture(e.pointerId);drag=[e.clientX,e.clientY]};
canvas.onpointermove=e=>{if(!drag)return;yaw-=(e.clientX-drag[0])*.005;pitch=Math.max(-.85,Math.min(.86,pitch-(e.clientY-drag[1])*.004));drag=[e.clientX,e.clientY];dirty=true};
canvas.onlostpointercapture=()=>drag=null;
function size(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.fov=innerWidth<600?78:60;camera.updateProjectionMatrix();dirty=true}onresize=size;size();
function frame(now){const dt=Math.min(.06,(now-last)/1000);last=now;let f=Number(keys.has('w'))-Number(keys.has('s')),r=Number(keys.has('d'))-Number(keys.has('a')),turn=Number(keys.has('q'))-Number(keys.has('e'));yaw+=turn*dt*1.6;if(f||r){const speed=4.7*dt/Math.hypot(f,r),nx=x+(-Math.sin(yaw)*f+Math.cos(yaw)*r)*speed,nz=z+(-Math.cos(yaw)*f-Math.sin(yaw)*r)*speed;if(free(nx,z))x=nx;if(free(x,nz))z=nz}
if(f||r||turn||dirty){camera.position.set(x,2.02+height(z)+bridgeY(z),z);camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);renderer.render(scene,camera);
 const door=entrances.find(d=>Math.hypot(x-d.x,z-d.z)<1.4);
 document.querySelector('#place').textContent=door?.label||(z>9?'石橋':z<-27?'丘の前庭':z<-9?'丘へ続く坂道':'川沿いの路地');dirty=false}requestAnimationFrame(frame)}requestAnimationFrame(frame)
})();
