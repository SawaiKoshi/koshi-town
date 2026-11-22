// Local coordinates are metres. The front of each building faces its positive Z axis.
const town=(()=>{
const T=THREE, canvas=document.querySelector('#world');
let renderer;
try { renderer=new T.WebGLRenderer({canvas,antialias:true}); }
catch (error) {
  document.querySelector('footer').innerHTML='<strong>3D表示にはWebGLが必要です。</strong><span>ハードウェアアクセラレーションを有効にしたブラウザーで開いてください。</span>';
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
const scene=new T.Scene(),camera=new T.PerspectiveCamera(61,1,.09,220);
scene.fog=new T.FogExp2(0xf0cbbb,.010);
scene.add(new T.HemisphereLight(0xffe9df,0xe1c4a7,1.85));
const sun=new T.DirectionalLight(0xffdfae,2.45);sun.position.set(-32,43,24);sun.target.position.set(0,0,-8);scene.add(sun,sun.target);sun.castShadow=true;Object.assign(sun.shadow.camera,{left:-47,right:47,top:47,bottom:-47,far:125});sun.shadow.mapSize.set(2048,2048);sun.shadow.normalBias=.032;
const sky=new T.Mesh(new T.SphereGeometry(170,40,20),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{},vertexShader:'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 v;void main(){vec3 n=normalize(v);float t=smoothstep(-.06,.75,n.y);vec3 c=mix(vec3(.98,.81,.69),vec3(.43,.62,.80),t);float s=max(0.,dot(n,normalize(vec3(-.65,.24,-.7))));c+=vec3(.24,.13,.06)*pow(s,12.);gl_FragColor=vec4(c,1.);}'}));scene.add(sky);
let seed=9537;function rand(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296}function pick(a){return a[Math.floor(rand()*a.length)]}
const geos={box:new T.BoxGeometry(1,1,1),round:new T.CylinderGeometry(.5,.5,1,12),cone:new T.ConeGeometry(.5,1,6),leaf:new T.IcosahedronGeometry(.5,0)};
const mat=new T.MeshLambertMaterial(), batches={},dummy=new T.Object3D();let transform=new T.Matrix4();
function local(x,y,z,angle,fn){const prev=transform;transform=prev.clone().multiply(new T.Matrix4().makeRotationY(angle).setPosition(x,y,z));fn();transform=prev}
function part(shape,x,y,z,w,h,d,color,rx=0,ry=0,rz=0){dummy.position.set(x,y,z);dummy.scale.set(w,h,d);dummy.rotation.set(rx,ry,rz);dummy.updateMatrix();(batches[shape]??=[]).push([new T.Matrix4().multiplyMatrices(transform,dummy.matrix),color])}
const box=(...v)=>part('box',...v),round=(...v)=>part('round',...v),leaf=(...v)=>part('leaf',...v);
function label(word,x,y,z,w,h,bg,fg){const c=document.createElement('canvas');c.width=1024;c.height=Math.round(1024*h/w);const g=c.getContext('2d');g.fillStyle=bg;g.fillRect(0,0,c.width,c.height);g.fillStyle=fg;g.font='bold '+Math.floor(c.height*.72)+'px Georgia';g.textAlign='center';g.textBaseline='middle';g.fillText(word,512,c.height*.54,960);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex}));m.position.set(x,y,z);m.updateMatrix();m.applyMatrix4(transform);scene.add(m)}
const stone=['#d2bc9f','#ecd8b7','#dec9ab','#c6ad90'],pave=['#bfada0','#c9b8a8','#e0cbb4','#d5c0aa','#b7a69e'],green=['#74883b','#8d9946','#616f38','#82984c'],petal=['#bb78ad','#8f709d','#df9fc7','#efc95d'];
const height=z=>Math.max(0,Math.min(4.2,(-z-11)*.22));
function bush(x,y,z,s,flowers=false){leaf(x,y+s*.25,z,s*1.4,s,s,pick(green),0,rand()*3);for(let k=0;k<(flowers?8:3);k++){const a=rand()*6.28,r=rand()*s*.55;box(x+r*Math.cos(a),y+s*(.39+rand()*.32),z+r*Math.sin(a),s*.19,s*.18,s*.18,flowers?pick(petal):pick(green))}}
function cypress(x,y,z,h){box(x,y+h*.23,z,.24,h*.46,.23,'#705039');for(let j=0;j<4;j++)part('cone',x,y+h*(.42+j*.13),z,h*(.29-j*.05),h*.51,h*(.28-j*.05),pick(green),0,j*.7)}
function palm(x,y,z,h){for(let i=0;i<9;i++)round(x+.28*i/9,y+h*(i+.5)/9,z,.32,h/9+.02,.33,i%2?'#947451':'#b19865');for(let i=0;i<10;i++)local(x+.28,y+h,z,i*.628,()=>{for(let j=0;j<4;j++)leaf(0,.3-j*j*.105,j*.56,.64+j*.06,.32,1.15,pick(green),j*.23)})}
function lamp(x,y,z){box(x,y+1.1,z,.14,2.2,.14,'#50463b');box(x,y+2.22,z,.42,.09,.42,'#584838');box(x,y+2.47,z,.28,.46,.28,'#ffcf7a');part('cone',x,y+2.78,z,.55,.23,.55,'#69533e')}
function windowBay(x,y,z,w,h){box(x,y,z,w+.19,h+.16,.22,'#ebc9a4');box(x,y,z+.13,w,h,.14,'#42575a');box(x-w*.22,y,z+.21,w*.46,h*.9,.025,'#6c8380');box(x,y,z+.24,.075,h,.08,'#554835');box(x,y-h*.5,z+.12,w+.32,.13,.43,'#d6c4ab')}
function houseRoof(w,d,h,col){const slope=.35;for(const sign of [-1,1]){let len=(d/2+.35)/Math.cos(slope);box(0,h+Math.tan(slope)*d/4,sign*d/4,w+.65,.27,len,col,sign*slope);for(let i=-w/2;i<=w/2;i+=.38)box(i,h+Math.tan(slope)*d/4+.16,sign*d/4,.12,.10,len,pick([col,col,'#a75e46']),sign*slope)}}
function chair(x,z){round(x,.57,z,.66,.11,.66,'#f1e9d9');for(const i of [-1,1])for(const j of [-1,1])box(x+i*.22,.28,z+j*.21,.065,.55,.065,'#eee1ce');for(const i of [-1,1])box(x+i*.23,.86,z-.26,.055,.66,.065,'#eee1ce');box(x,1.14,z-.25,.51,.09,.09,'#eee1ce')}
const buildings=[];
function site(x,z,a,w,d,fn){buildings.push({x,z,a,w,d});local(x,height(z),z,a,fn)}
site(9,3,-.73,8,6,()=>{
box(0,3.35,0,8,6.7,6,'#a35037');
for(let r=0;r<29;r++)for(let k=0;k<14;k++){const x=-3.92+k*.6+(r%2)*.3;if(x>3.85)continue;box(x,r*.22+.12,3.011,.57,.193,.042,pick(['#ba6344','#b45a3f','#ac573c','#bc684c']))}
box(0,6.70,0,8.25,.19,6.25,'#71524c');box(.2,6.02,3.12,6.85,.99,.22,'#5a4037');label('SISTER',.2,6.1,3.24,6.5,.64,'#493937','#fff2d9');label('HAIRCUT & SHAVE',.2,5.71,3.24,4,.21,'#493937','#f4dabc');
for(const x of [-2.1,.5,2.85]){windowBay(x,4.39,3.16,1.32,1.43);for(const side of [-1,1]){box(x+side*.61,4.38,3.47,.33,1.37,.30,'#453f38',0,side*.28);for(let i=0;i<8;i++)box(x+side*.61,3.83+i*.15,3.65,.31,.045,.04,'#736656')}}
for(const x of [.1,2.63]){windowBay(x,1.44,3.1,1.98,2.28);box(x,2.85,3.53,2.3,.14,1.05,'#38795c',.23);box(x,2.69,4.02,2.3,.21,.11,'#407c5e')}
box(-2.63,1.19,3.1,1.35,2.38,.23,'#895e39');box(-2.63,1.56,3.24,.68,1.05,.07,'#505f59');for(let i=0;i<10;i++)round(-3.55+i*.205,2.88,3.53,.27,1.15,.26,pick(['#bf724d','#d4875b']),1.33);
round(-3.6,2.01,3.53,.19,.72,.19,'#f4e7d2');for(let i=0;i<3;i++)round(-3.6,1.80+i*.17,3.53,.196,.082,.196,i===1?'#48647f':'#b35c50',0,0,-.30);
chair(.45,4.12);chair(2.16,4.12);round(1.31,.75,4.1,.9,.10,.9,'#eee4ce');round(1.31,.39,4.1,.14,.78,.14,'#e1d6c6');for(let j=0;j<12;j++)box(-.7+j*.36,.45,3.54,.24,.6+rand()*.58,.24,'#675440');bush(-3.6,.12,4.25,1.1);bush(3.7,.1,4.1,.8,true);
});
site(-10,-8,.60,11,6,()=>{
box(0,1.8,0,11,3.6,6,'#ab7849');for(let j=0;j<14;j++)box(0,j*.25+.12,3.01,11,.205,.08,pick(['#a97146','#be8650','#b37b4d']));houseRoof(11,6,3.63,'#51494b');
for(const x of [-4.35,-2.45,.1,2.3,4.35])windowBay(x,1.54,3.07,1.68,2.02);box(-.65,1.19,3.24,1.2,2.38,.12,'#3f514d');box(-.65,1.63,3.33,.88,1.29,.08,'#bdab82');
for(const x of [-5.4,-1.4,5.4])box(x,1.75,3.48,.28,3.5,.4,'#438581');
for(let i=0;i<7;i++){const x=1.35+i*.55;box(x,1.40,3.45,.29,2.4,.17,pick(['#db904c','#539798','#d16944','#e1b958']));part('cone',x,2.70,3.45,.35,.45,.18,'#b29457')}
for(let i=0;i<3;i++)box(-.65,.08+i*.075,4.33-i*.37,3.4,.16+i*.15,.40,pick(stone));
for(let j=0;j<8;j++)box(0,3.8+j*.14,3.17,5.4-j*.62,.17,.24,'#594532');label('PISOLA',0,4.14,3.31,3.2,.63,'#594532','#ffdfa4');palm(-6.4,0,2.7,5.4);palm(5.8,0,1.4,4.5)
});
site(2,-37,.035,19,7,()=>{box(0,2.55,0,19,5.1,7,'#efe9db');box(1,4.59,3.51,14.4,.92,.14,'#565f65');for(let i=0;i<15;i++)box(-6.1+i,4.58,3.63,.09,.94,.09,'#a39f95');label('3',-8.02,4.22,3.55,1.05,1.2,'#efe9db','#485460');box(0,1.44,3.53,17,2.45,.17,'#496268');for(let i=0;i<12;i++)box(-8.25+i*1.5,1.42,3.69,.09,2.49,.10,'#adab9f');box(0,2.89,4.32,19.6,.26,2.65,'#6d7370');for(let i of [-8,-4,4,8])box(i,1.39,5.25,.15,2.77,.15,'#737673');box(0,1.17,3.71,2.2,2.34,.12,'#33494c')});
// The canal cuts across the road. Block piers and stepped spandrels leave three open arches.
box(0,-2.4,16,170,.4,14,'#569291');for(let i=0;i<580;i++){let x=(rand()-.5)*120,z=10+rand()*13;box(x,-2.17,z,.2+rand()*1.7,.012,.06,pick(['#8ab4a7','#659e9e','#b7c4a6']))}
box(0,-1.64,33,180,3.2,20,'#989765');box(0,-1.65,-.6,180,3.2,21.2,'#a3a473');
for(let i=0;i<65;i++){const z=-11-i*.8;box(0,height(z)-1.55,z,150,3.1,.84,'#9da168')}
box(0,-.62,-10.50,150,1.2,.99,'#a8a77b');box(0,1.65,-78,180,5,35,'#a2a57b');
const bridgeY=z=>z>9&&z<25?.42*Math.sin(Math.PI*(z-9)/16):0;
for(let j=0;j<32;j++){let z=9.25+j*.5,y=bridgeY(z),inner=(j%10)-4.5;box(0,y-.22,z,5,.44,.52,'#bcab92');for(const side of [-1,1]){const deep=.34+1.64*(Math.abs(inner)/4.5)**2;box(side*2.36,y-.15-deep/2,z,.52,deep,.53,pick(stone));box(side*2.32,y+.34,z,.46,.67,.49,pick(stone));box(side*2.32,y+.73,z,.54,.105,.49,'#ead7b4')}}
for(const z of [9,14,19,24.8])for(const x of [-2.34,2.34]){box(x,bridgeY(z)+.45,z,.67,.91,.68,'#cfb897');if(z===9||z===24.8)lamp(x,bridgeY(z)+.90,z)}
function road(x,z){return (z>9&&z<25)?Math.abs(x)<2.1:z>8?Math.abs(x)<4:z>-12?Math.abs(x)<10:Math.abs(x-1.1*Math.sin(z*.16))<(z< -25?10:3.9)}
for(let j=0;j<99;j++){const z=30-j*.66;for(let k=-12;k<=12;k++){let x=k*.83+(j%2)*.415;if(!road(x,z))continue;let h=height(z)+bridgeY(z);box(x,h+.015,z,.807,.085,.636,pick(pave),z<-11&&z>-30?.216:0)}}
for(let j=0;j<39;j++){let z=-11.5-j*.53;for(let side of [-1,1]){let x=side*4.85+Math.sin(z*.16);box(x,height(z)+.28,z,.58,.6,.53,pick(stone));if(j%2===0)bush(x+side*(.8+rand()),height(z),z,.7+rand()*.32,true)}}
// A second short ceremonial stair borders the ramp into the exhibit lawn.
for(let i=0;i<8;i++)box(-5.2,2.65+i*.11,-23.7-i*.5,2.4,.85+i*.17,.56,pick(stone));
for(let i=0;i<3;i++){let x=6+i*1.65,z=-27-i*.85;round(x,height(z)+.56,z,1.25,1.12,1.25,'#439668');round(x,height(z)+1.14,z,1.43,.24,1.43,'#368654');round(x,height(z)+1.27,z,.98,.025,.98,'#235e4a')}
for(let i=0;i<4;i++)box(6+i*.84,6.65,-30,.8,.8,.8,i===1?'#eab450':'#b37c53');
for(let j=0;j<42;j++){let x=(j%2?-1:1)*(11+rand()*23),z=8-rand()*49;if(Math.abs(x+10)<6.8&&Math.abs(z+8)<6)continue;cypress(x,height(z),z,3.2+rand()*4.5)}
for(let j=0;j<180;j++){const side=rand()>.5?1:-1,z=8-rand()*41,x=side*(5+rand()*12);if(buildings.some(b=>Math.hypot(x-b.x,z-b.z)<6.7)||road(x,z))continue;bush(x,height(z),z,.65+rand(),j%3!==0)}
for(let j=0;j<65;j++){const x=(rand()-.5)*83,z=j%2?8.4:24.9;if(Math.abs(x)<3)continue;bush(x,0,z,.8+rand()*.8,true)}
for(let i=0;i<35;i++){let x=(i%10-4.5)*6.4+(rand()-.5)*2,z=-52-Math.floor(i/10)*8-rand()*4;let y=5+Math.floor(i/10)*2;box(x,y-2,z,7,4,6,'#9d9872');local(x,y,z,rand()*.32,()=>{let h=2.6+rand()*2;box(0,h/2,0,4.8,h,3.9,pick(['#e5d4b7','#f0dfbf','#d5bca2']));houseRoof(4.8,3.9,h,'#ae6d50');for(let k of [-1.3,1.2])windowBay(k,h*.61,2,.7,1);cypress(2.9,0,1,4.3)})}
for(let j=0;j<52;j++){const x=(j-25)*3.7;leaf(x,1,-92,21,16+rand()*21,23,pick(['#9a94a1','#ad9fac','#b4a1a0']),0,rand()*4)}
for(let j=0;j<9;j++){let x=-63+j*15,y=16+rand()*12;for(let k=0;k<5;k++)leaf(x+k*1.8,y+rand()*1.4,-88,7,2+rand()*2,4,'#fce0d2')}
for(let z of [4,-15,-25,-31])lamp(-3.95,height(z),z);
// Recessed panes, warm interior fittings and planted edges give close approaches a readable scale.
local(2,4.2,-37,.035,()=>{
 for(let i=0;i<13;i++){const x=-8+i*1.31;box(x,1.42,3.65,1.17,2.01,.035,pick(['#596f70','#617778','#78837b']));box(x,2.10,3.68,.86,.05,.04,'#dec598');box(x-.33,1.11,3.689,.06,1.15,.03,'#667169');}
 for(let i=0;i<14;i++){const x=-5.66+i;box(x,4.57,3.61,.88,.75,.04,pick(['#71858a','#829394','#5f7379']));box(x,4.89,3.65,.92,.035,.03,'#ced5c8')}
 for(const x of [-.48,.48]){box(x,1.24,3.76,.91,2.25,.08,'#687c7c');box(x,1.20,3.82,.06,.36,.04,'#ded4b8')}
 label('GAME GALLERY',0,2.63,4.70,3.10,.36,'#465251','#ffedc8');
});
local(9,0,3,-.73,()=>{for(const x of [.1,2.63]){for(const side of [-1,1])box(x+side*.86,1.45,3.27,.055,2.1,.08,'#4d453b');box(x,1.75,3.28,1.94,.07,.09,'#544537');box(x-.56,1.32,3.29,.42,.72,.02,'#8a9184');box(x+.4,2.19,3.28,.18,.11,.05,'#ffd888')}
 for(const z of [-1.65,1.2])local(-4,0,z,-Math.PI/2,()=>windowBay(0,4.55,0,1.45,1.32));for(let i=0;i<15;i++)box(-4.02,i*.4+.14,0,.04,.023,6,'#935344');
 for(const x of [-3.68,-1.67]){round(x,.26,4.14,.45,.52,.45,'#b77452');bush(x,.52,4.14,.68,true)}
 box(-2.62,1.23,3.29,.84,1.65,.035,'#ae8156');box(-2.62,1.57,3.32,.53,.79,.03,'#81948d');box(-2.12,1.03,3.33,.07,.16,.08,'#dfc791');
});
local(-10,0,-8,.60,()=>{for(const x of [-4.35,-2.45,.1,2.3,4.35]){box(x,1.55,3.34,.052,1.95,.07,'#594c38');box(x,1.89,3.33,1.6,.06,.06,'#574a38');box(x-.32,1.10,3.31,.54,.52,.03,'#a79e7a');box(x+.37,2.27,3.34,.17,.1,.03,'#ffcc79')}
 label('PIZZA · PASTA · RISOTTO',0,3.67,3.32,3.1,.24,'#6d503b','#ffe1ae');for(const x of [-4.3,3.6]){box(x,.2,4.0,2.7,.40,.66,'#c7b295');for(let k=0;k<5;k++)bush(x-1.03+k*.51,.41,4,.56,true)}
});
for(let j=0;j<18;j++){const z=-9-j*1.5;for(const side of [-1,1]){let x=side*(6.8+rand()*2.5);if(z>-17&&side<0)continue;bush(x,height(z),z,.65+rand()*.48,true)}}
for(let j=0;j<15;j++){const side=j%2?-1:1;let x=side*(21+rand()*12),z=6-Math.floor(j/2)*6;local(x,height(z),z,side*.45,()=>{const h=3.1+2*rand();box(0,h/2,0,5.8,h,4.4,pick(['#e5d2ae','#f0d8b7','#d8bc9b']));houseRoof(5.8,4.4,h,'#af694b');for(const x of [-1.6,1.4])windowBay(x,h-.99,2.24,.9,1.22);box(-.4,1.0,2.24,1.0,2,.14,'#81654e');box(-1.5,h+1.1,-.4,.5,1.6,.55,'#c39c79')})}

for(const [shape,items] of Object.entries(batches)){const mesh=new T.InstancedMesh(geos[shape],mat,items.length);items.forEach(([m,c],i)=>{mesh.setMatrixAt(i,m);mesh.setColorAt(i,new T.Color(c))});mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh)}
renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
return {renderer,scene,camera,buildings,height,bridgeY};
})();
