(()=>{
const {renderer,scene,camera,buildings,height,bridgeY}=town,canvas=renderer.domElement,keys=new Set();
const views={bridge:[-.65,22,.015,.012],sister:[1.0,8.7,-.90,.15],pisola:[-5,-1,.63,.14],hill:[-2.85,-23.4,-.34,.15]};
let x,z,yaw,pitch,dirty=true,drag=null,last=performance.now();
function jump(name){[x,z,yaw,pitch]=views[name]||views.bridge;keys.clear();dirty=true}
jump(location.hash.slice(1));const select=document.querySelector('#views');select.onchange=()=>{if(select.value)jump(select.value);select.value='';canvas.focus()};
function free(x,z){if(z>30||z< -33.15||x< -17||x>16)return false;if(z>9&&z<25&&Math.abs(x)>1.95)return false;if(z<-11&&z>-25&&Math.abs(x-1.1*Math.sin(z*.16))>4.05)return false;
return !buildings.some(b=>{const dx=x-b.x,dz=z-b.z,c=Math.cos(b.a),s=Math.sin(b.a);return Math.abs(dx*c-dz*s)<b.w/2+.24&&Math.abs(dx*s+dz*c)<b.d/2+.24})}
const aliases={arrowup:'w',arrowdown:'s',arrowleft:'a',arrowright:'d'};
function key(e,down){if(e.target===select)return;const k=aliases[e.key.toLowerCase()]||e.key.toLowerCase();if(!['w','a','s','d','q','e'].includes(k))return;e.preventDefault();if(down)keys.add(k);else keys.delete(k)}
onkeydown=e=>key(e,true);onkeyup=e=>key(e,false);onblur=()=>{keys.clear();drag=null};document.querySelectorAll('[data-key]').forEach(btn=>{btn.onpointerdown=e=>{btn.setPointerCapture(e.pointerId);keys.add(btn.dataset.key)};btn.onlostpointercapture=()=>keys.delete(btn.dataset.key)});
canvas.onpointerdown=e=>{canvas.focus();canvas.setPointerCapture(e.pointerId);drag=[e.clientX,e.clientY]};
canvas.onpointermove=e=>{if(!drag)return;yaw-=(e.clientX-drag[0])*.005;pitch=Math.max(-.85,Math.min(.86,pitch-(e.clientY-drag[1])*.004));drag=[e.clientX,e.clientY];dirty=true};
canvas.onlostpointercapture=()=>drag=null;
function size(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.fov=innerWidth<600?78:60;camera.updateProjectionMatrix();dirty=true}onresize=size;size();
function frame(now){const dt=Math.min(.06,(now-last)/1000);last=now;let f=Number(keys.has('w'))-Number(keys.has('s')),r=Number(keys.has('d'))-Number(keys.has('a')),turn=Number(keys.has('q'))-Number(keys.has('e'));yaw+=turn*dt*1.6;if(f||r){const speed=4.7*dt/Math.hypot(f,r),nx=x+(-Math.sin(yaw)*f+Math.cos(yaw)*r)*speed,nz=z+(-Math.cos(yaw)*f-Math.sin(yaw)*r)*speed;if(free(nx,z))x=nx;if(free(x,nz))z=nz}
if(f||r||turn||dirty){camera.position.set(x,2.02+height(z)+bridgeY(z),z);camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);renderer.render(scene,camera);const doors=[['SISTERの入口',6.8,5.5],['PISOLAの入口',-8.7,-5],['ゲーム展示館の入口',2,-33]];document.querySelector('#place').textContent=doors.find(d=>Math.hypot(x-d[1],z-d[2])<2.8)?.[0]||(z>9?'石橋':z<-23?'丘の前庭':z<-11?'丘へ続く坂道':'川沿いの路地');dirty=false}requestAnimationFrame(frame)}requestAnimationFrame(frame)
})();
