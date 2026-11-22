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
scene.fog=new T.FogExp2(0xdfbccc,.0081);
scene.add(new T.HemisphereLight(0xcad1ff,0xb699af,1.34));
const sun=new T.DirectionalLight(0xffdbab,3.8);
sun.position.set(-36,22,26);sun.target.position.set(0,0,-12);scene.add(sun,sun.target);
sun.castShadow=true;
Object.assign(sun.shadow.camera,{left:-43,right:43,top:39,bottom:-39,far:116});
sun.shadow.mapSize.set(2048,2048);sun.shadow.normalBias=.020;sun.shadow.bias=-.00018;
const sky=new T.Mesh(new T.SphereGeometry(170,40,20),new T.ShaderMaterial({
 side:T.BackSide,depthWrite:false,
 vertexShader:'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`
 varying vec3 v;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){
   vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
   return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);
 }
 void main(){
   vec3 n=normalize(v);float t=smoothstep(-.04,.62,n.y);
   vec3 c=mix(vec3(1.,.78,.61),vec3(.54,.55,.75),t);
   vec2 p=n.xz/max(.10,n.y+.13)*vec2(3.2,6.4);
   p+=.48*vec2(noise(p*2.3),noise(p*1.8+3.1));
   float vapor=noise(p)*.44+noise(p*2.1)*.28+noise(p*4.3)*.16+noise(p*8.3)*.08+noise(p*16.2)*.04;
   c=mix(c,mix(vec3(.86,.67,.72),vec3(1.,.83,.73),smoothstep(.42,.70,vapor)),
     smoothstep(.47,.67,vapor)*smoothstep(-.01,.18,n.y)*.84);
   float glare=max(0.,dot(n,normalize(vec3(-.81,.14,-.58))));
   c+=vec3(.31,.135,.045)*pow(glare,6.)+vec3(.17,.13,.08)*pow(glare,150.);
   gl_FragColor=vec4(c,1.);
 }`
}));scene.add(sky);
let seed=9537;function rand(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296}function pick(a){return a[Math.floor(rand()*a.length)]}
const geos={box:new T.BoxGeometry(1,1,1),round:new T.CylinderGeometry(.5,.5,1,12),cone:new T.ConeGeometry(.5,1,6),leaf:new T.IcosahedronGeometry(.5,0)};
// A little reflected skylight at the upper edge keeps adjacent tiny courses legible.
for(const geometry of Object.values(geos)){
 const points=geometry.getAttribute('position'),colors=[];
 for(let i=0;i<points.count;i++){
   const t=Math.min(1,Math.max(0,points.getY(i)+.5));
   colors.push(.84+t*.16,.82+t*.18,.85+t*.15);
 }
 geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
}
const mat=new T.MeshLambertMaterial({vertexColors:true}), batches={},dummy=new T.Object3D();let transform=new T.Matrix4();
// Seamless grain in the stone, fired clay and sawn timber. Mipmaps filter the
// fine marks out on the hill; the broad planes and silhouetted edges stay legible.
function grain(kind){
 const c=document.createElement('canvas');c.width=c.height=128;
 const g=c.getContext('2d'),pixels=g.createImageData(128,128);
 let state=47;
 const uniform=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
 const lattices=[4,16,32].map(n=>Array.from({length:n*n},uniform));
 function noise(x,y,grid){
   const n=Math.sqrt(grid.length),u=x*n/128,v=y*n/128,a=Math.floor(u),b=Math.floor(v);
   const at=(i,j)=>grid[(j%n)*n+i%n],fx=u-a,fy=v-b;
   return (at(a,b)*(1-fx)+at(a+1,b)*fx)*(1-fy)+(at(a,b+1)*(1-fx)+at(a+1,b+1)*fx)*fy;
 }
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){
   const base=noise(x,y,lattices[0]),mid=noise(x,y,lattices[1]),fine=noise(x,y,lattices[2]);
   let value=202+23*base+18*mid+10*fine+6*uniform();
   if(kind==='wood')value=203+26*base+18*Math.sin(y*1.33+4*base+1.7*Math.sin(x*.049))+6*fine;
   const i=(y*128+x)*4;pixels.data.set([value,value,value,255],i);
 }
 g.putImageData(pixels,0,0);
 for(let i=0;i<270;i++){
   const x=uniform()*128,y=uniform()*128;
   g.fillStyle=i%3?'#49382824':'#fff3da47';
   g.fillRect(x,y,kind==='wood'?4+uniform()*24:1+uniform()*3,uniform()*1.6+.4);
 }
 const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;
 texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
 return texture;
}
const stoneGrain=grain('stone'),woodGrain=grain('wood');
const finishes={
 stone:new T.MeshLambertMaterial({vertexColors:true,map:stoneGrain}),
 wood:new T.MeshLambertMaterial({vertexColors:true,map:woodGrain})
};
function local(x,y,z,angle,fn){const prev=transform;transform=prev.clone().multiply(new T.Matrix4().makeRotationY(angle).setPosition(x,y,z));fn();transform=prev}
function part(shape,x,y,z,w,h,d,color,rx=0,ry=0,rz=0){
 dummy.position.set(x,y,z);dummy.scale.set(w,h,d);dummy.rotation.set(rx,ry,rz);dummy.updateMatrix();
 const matrix=new T.Matrix4().multiplyMatrices(transform,dummy.matrix),p=matrix.elements;
 // Cull whole beds and house fronts behind the viewer in a single draw batch.
 const key=w>32?shape:shape+'@'+Math.floor(p[12]/24)+','+Math.floor(p[14]/24);
 (batches[key]??=[]).push([matrix,color]);
}
const box=(...v)=>part('box',...v),round=(...v)=>part('round',...v),leaf=(...v)=>part('leaf',...v);
const rock=(...v)=>part('stone',...v),timber=(...v)=>part('wood',...v);
function panel(material,x,y,z,w,h){
 const m=new T.Mesh(new T.PlaneGeometry(w,h),material);
 m.position.set(x,y,z);m.updateMatrix();m.applyMatrix4(transform);scene.add(m);
}
function label(word,x,y,z,w,h,bg,fg){
 const c=document.createElement('canvas');c.width=1024;c.height=Math.round(1024*h/w);
 const g=c.getContext('2d');
 if(bg){g.fillStyle=bg;g.fillRect(0,0,c.width,c.height)}
 g.fillStyle=fg;g.font='bold '+Math.floor(c.height*.72)+'px '+(bg?'Georgia':'sans-serif');
 g.textAlign='center';g.textBaseline='middle';g.fillText(word,512,c.height*.54,960);
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;
 panel(new T.MeshBasicMaterial({map:tex,transparent:!bg}),x,y,z,w,h);
}
// Reflected sky above eye level, pendants and timber fittings behind the glass below.
// Keep the same physical window frames and recesses as the reference facades.
function glazing(top,inside,lit){
 const c=document.createElement('canvas');c.width=192;c.height=192;
 const g=c.getContext('2d'),reflection=g.createLinearGradient(0,0,40,192);
 [[0,'#33343c'],[.12,top],[.43,'#727c83'],[.53,inside],[.78,'#a37450'],[1,'#453d3d']].forEach(([t,tone])=>reflection.addColorStop(t,tone));
 g.fillStyle=reflection;g.fillRect(0,0,192,192);
 g.fillStyle='#ded5bb';g.globalAlpha=.17;g.beginPath();g.moveTo(0,29);g.lineTo(192,9);g.lineTo(192,26);g.lineTo(0,57);g.fill();g.globalAlpha=1;
 if(lit){
   for(const x of [31,126]){
     const glow=g.createRadialGradient(x,72,1,x,72,45);glow.addColorStop(0,'#ffd69a');glow.addColorStop(.22,'#f3b975a8');glow.addColorStop(1,'#d49c6000');
     g.fillStyle=glow;g.fillRect(x-45,27,90,90);g.fillStyle='#4e4337';g.fillRect(x,0,2,65);
     g.fillStyle='#ffdf9a';g.fillRect(x-7,67,15,5);
     g.fillStyle='#513e39';g.beginPath();g.moveTo(x-12,68);g.lineTo(x,58);g.lineTo(x+12,68);g.fill();
   }
   g.fillStyle='#b88956';g.fillRect(0,144,192,5);
   for(const x of [12,66,151]){g.fillStyle='#554337';g.fillRect(x,151,27,8);g.fillRect(x+2,157,4,25)}
   for(let i=0;i<8;i++){const x=10+i*22;g.fillStyle=i%2?'#566152':'#8a784c';g.fillRect(x,132-i%3*4,5,12+i%3*4)}
 }
 const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;
 return new T.MeshBasicMaterial({map:texture,color:0xebdfd2});
}
const stone=['#d8c2a6','#efdab8','#d4bba2','#c3a99a','#d0b5a1'];
const green=['#778b46','#98a84c','#586e45','#859852'];
function smooth(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)}
const height=z=>1.76*smooth((-z-8)/9)+3.9*smooth((-z-16)/14);
// Folded, faceted leaves and small stepped whorls of flowers share two meshes.
function herbGeometry(flower){
 const vertices=[],colors=[];
 function triangle(a,b,c){
   for(const p of [a,b,c]){vertices.push(...p.slice(0,3));colors.push(...p.slice(3))}
 }
 if(flower){
   for(let level=0;level<5;level++){
     const y=level*.16,r=(level===0?.025:.115)*(1-level*.11),x=y*.14;
     for(let k=0;k<3;k++){
       const angle=k*Math.PI*2/3+level*.85,dx=Math.cos(angle)*r,dz=Math.sin(angle)*r;
       const low=[x,y,0,.43,.52,.43],a=[x+dx,y+.07,dz,.83,.77,.89];
       const b=[x+dx-dz*.7,y+.095,dz+dx*.7,1,.94,1],tip=[x+.02,y+.22,0,1,1,.96];
       triangle(low,b,a);triangle(a,b,tip);
     }
   }
 }else{
   for(let k=0;k<16;k++){
     const angle=k*2.40,r=.15+.40*((k*7)%16)/16,h=.26+.26*((k*11)%16)/16;
     const dx=Math.cos(angle),dz=Math.sin(angle),w=.035+.04*(k%4)/3;
     const root=[.07*dx,.01,.07*dz,.23,.36,.29],tip=[dx*r,h,dz*r,.99,1,.76];
     const mid=[dx*r*.51,h*.81,dz*r*.51,.81,.96,.72];
     const a=[mid[0]-dz*w,h*.64,mid[2]+dx*w,.53,.69,.53];
     const b=[mid[0]+dz*w,h*.64,mid[2]-dx*w,.67,.81,.61];
     triangle(root,mid,a);triangle(a,mid,tip);triangle(root,b,mid);triangle(mid,b,tip);
   }
 }
 const g=new T.BufferGeometry();
 g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
 g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();
 return g;
}
geos.herb=herbGeometry(false);geos.spike=herbGeometry(true);
finishes.herb=finishes.spike=new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide});
function bush(x,y,z,s,flowers=false){
 const bloom=pick(['#b580e4','#a882d1','#d18cc6','#d156a4','#f5c150']);
 const count=flowers?9:4;
 for(let i=0;i<count;i++){
   const a=i*2.4+.5*rand(),r=Math.sqrt(i/count)*s*.46,px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;
   const h=s*(.33+rand()*.24);
   if(i%2===0)part('herb',px,y,pz,s*.63,h*1.25,s*.64,pick(green),0,a);
   if(flowers){
     const lean=(rand()-.5)*.38;
     box(px,y+h*.44,pz,.016*s,h*.88,.016*s,'#829058',0,0,lean);
     part('spike',px-Math.sin(lean)*h*.43,y+h*.80,pz,.47*s,h*.61,.47*s,bloom,0,a,lean);
   }
 }
}
function cypress(x,y,z,h){
 box(x,y+h*.23,z,.12*h,h*.46,.11*h,'#705039');
 for(let j=0;j<9;j++){
   const t=j/9,w=h*(.065+.20*Math.sin(Math.PI*(t+.11))*(1-t*.7));
   box(x,y+h*(.20+t*.87),z,w,h*.16,w*.9,pick(['#576744','#61774a','#70834f']),0,j*.51);
   box(x-w*.35,y+h*(.22+t*.86),z+w*.12,w*.45,h*.14,w*.47,pick(green));
 }
}
function palm(x,y,z,h){
 for(let i=0;i<14;i++)round(x+.38*(i/14)**2,y+h*(i+.5)/14,z,.33-i*.004,h/14+.02,.33-i*.004,i%2?'#91704e':'#b39867');
 for(let i=0;i<11;i++)local(x+.38,y+h,z,i*.571,()=>{
   const length=1.9+.78*rand();
   for(let j=0;j<9;j++){
     const t=j/8,r=t*length,py=.42*Math.sin(t*Math.PI)-t*t*.92;
     const slope=(.42*Math.PI*Math.cos(t*Math.PI)-1.84*t)/length;
     box(0,py,r,.10,.11,Math.hypot(1,slope)*length/8+.12,'#798445',-Math.atan(slope));
     for(const side of [-1,1]){
       const w=.48*Math.sin((.05+t*.91)*Math.PI);
       box(side*w*.55,py-.09,r+.10,w+.06,.10,.19,pick(green),0,side*-.44,side*-.30);
     }
   }
 });
}
function lamp(x,y,z){
 box(x,y+.12,z,.31,.24,.31,'#574b40');box(x,y+1.1,z,.11,2.2,.11,'#50463b');
 box(x,y+2.22,z,.38,.085,.38,'#584838');box(x,y+2.46,z,.27,.42,.27,'#ffdb96');
 for(const i of [-1,1])for(const j of [-1,1])box(x+i*.145,y+2.46,z+j*.145,.027,.44,.027,'#645147');
 part('cone',x,y+2.76,z,.54,.21,.54,'#69533e');round(x,y+2.91,z,.07,.12,.07,'#675447');
}
function windowBay(x,y,z,w,h){box(x,y,z,w+.19,h+.16,.22,'#ebc9a4');box(x,y,z+.13,w,h,.14,'#42575a');box(x-w*.22,y,z+.21,w*.46,h*.9,.025,'#6c8380');box(x,y,z+.24,.075,h,.08,'#554835');box(x,y-h*.5,z+.12,w+.32,.13,.43,'#d6c4ab')}
function houseRoof(w,d,h,col,detailed=false){
 const slope=.35,half=d/2+.38,ridge=h+Math.tan(slope)*d/2;
 for(const sign of [-1,1]){
   const length=half/Math.cos(slope);
   box(0,ridge-Math.tan(slope)*half/2,sign*half/2,w+.75,.24,length,col,sign*slope);
   timber(0,ridge-Math.tan(slope)*half-.10,sign*half,w+.78,.18,.16,'#614537');
   const rows=detailed?11:4,columns=Math.ceil(w/(detailed ? .34 : 1.2));
   const step=(w+.76)/columns;
   for(let row=0;row<rows;row++)for(let k=0;k<columns;k++){
     const z=(row+.5)*half/rows;
     const tileLength=length/rows+.045;
     rock(-w/2-.38+(k+.5)*step,ridge-Math.tan(slope)*z+.17,sign*z,step-.014,.115,tileLength,
       pick(detailed?['#565060','#676171','#585666','#64606b']:[col,'#a15e46','#b37656']),sign*(slope+.055));
   }
 }
 box(0,ridge+.13,0,w+.79,.23,.29,col);
}
function chair(x,z){round(x,.57,z,.66,.11,.66,'#f1e9d9');for(const i of [-1,1])for(const j of [-1,1])box(x+i*.22,.28,z+j*.21,.065,.55,.065,'#eee1ce');for(const i of [-1,1])box(x+i*.23,.86,z-.26,.055,.66,.065,'#eee1ce');box(x,1.14,z-.25,.51,.09,.09,'#eee1ce')}
const buildings=[];
function site(x,z,a,w,d,fn){buildings.push({x,z,a,w,d});local(x,height(z),z,a,fn)}
site(9,3,-.73,8,6,()=>{
box(0,3.35,0,8,6.7,6,'#a35037');
function brickFace(width){
 for(let r=0;r<46;r++)for(let k=-1;k<Math.ceil(width/.36);k++){
   const left=Math.max(-width/2,-width/2+k*.36+(r%2)*.18),right=Math.min(width/2,-width/2+k*.36+(r%2)*.18+.346);
   if(right>left)rock((left+right)/2,r*.143+.076,.014,right-left,.131,.038+rand()*.018,pick(['#c46a4a','#bd6242','#b75e46','#c67150','#b96950']));
 }
}
local(0,0,3,0,()=>brickFace(8));
for(const side of [-1,1])local(4*side,0,0,side*Math.PI/2,()=>brickFace(6));
local(0,0,-3,Math.PI,()=>brickFace(8));
box(0,6.70,0,8.25,.19,6.25,'#71524c');box(.2,6.02,3.12,6.85,.99,.22,'#373537');label('SISTER',.2,6.14,3.24,6.5,.77,null,'#fff2dc');label('HAIRCUTS & SHAVE',.2,5.72,3.24,4,.23,null,'#f4dabc');
for(const x of [-2.1,.5,2.85]){windowBay(x,4.39,3.16,1.32,1.43);for(const side of [-1,1]){box(x+side*.61,4.38,3.47,.33,1.37,.30,'#453f38',0,side*.28);for(let i=0;i<8;i++)box(x+side*.61,3.83+i*.15,3.65,.31,.045,.04,'#736656')}}
for(const x of [.1,2.63]){windowBay(x,1.44,3.1,1.98,2.28);box(x,2.85,3.53,2.3,.14,1.05,'#38795c',.23);box(x,2.69,4.02,2.3,.21,.11,'#407c5e')}
timber(-2.63,1.19,3.1,1.35,2.38,.23,'#895e39');
round(-3.6,2.01,3.53,.19,.72,.19,'#f4e7d2');for(let i=0;i<3;i++)round(-3.6,1.80+i*.17,3.53,.196,.082,.196,i===1?'#48647f':'#b35c50',0,0,-.30);
chair(.45,4.12);chair(2.16,4.12);round(1.31,.75,4.1,.9,.10,.9,'#eee4ce');round(1.31,.39,4.1,.14,.78,.14,'#e1d6c6');for(let j=0;j<12;j++)box(-.7+j*.36,.45,3.54,.24,.6+rand()*.58,.24,'#675440');bush(-3.6,.12,4.25,1.1);bush(3.7,.1,4.1,.8,true);
});
site(-10,-8,.60,11,6,()=>{
box(0,1.8,0,11,3.6,6,'#93603d');
for(let j=0;j<20;j++)for(let k=0;k<5;k++)timber(-4.4+k*2.2,j*.18+.09,3.028,2.19,.171,.068,pick(['#b77d4a','#c08b5c','#be8455']));
houseRoof(11,6,3.63,'#51494b',true);
for(const x of [-4.35,-2.45,.1,2.3,4.35])windowBay(x,1.54,3.07,1.68,2.02);box(-.65,1.19,3.24,1.2,2.38,.12,'#3f514d');box(-.65,1.63,3.33,.88,1.29,.08,'#bdab82');
for(const x of [-5.4,-1.4,5.4])box(x,1.75,3.48,.28,3.5,.4,'#438581');
for(let i=0;i<7;i++){const x=1.35+i*.55;box(x,1.40,3.45,.29,2.4,.17,pick(['#db904c','#539798','#d16944','#e1b958']));part('cone',x,2.70,3.45,.35,.45,.18,'#b29457')}
for(let i=0;i<3;i++)box(-.65,.08+i*.075,4.33-i*.37,3.4,.16+i*.15,.40,pick(stone));
for(let j=0;j<12;j++)timber(0,3.77+j*.132,3.47,5.85-j*.48,.14,.32,'#815636');
for(const side of [-1,1])box(side*1.48,4.55,3.50,3.36,.12,.39,'#615661',0,0,-side*.49);
label('PISOLA',0,4.32,3.642,3.25,.81,null,'#ffdfa4');palm(-6.4,0,2.7,5.4);palm(5.8,0,1.4,4.5)
});
site(2,-37,.035,19,7,()=>{box(0,2.55,0,19,5.1,7,'#efe9db');box(1,4.59,3.51,14.4,.92,.14,'#565f65');for(let i=0;i<15;i++)box(-6.1+i,4.58,3.63,.09,.94,.09,'#a39f95');label('3',-8.02,4.22,3.55,1.05,1.2,'#efe9db','#485460');box(0,1.44,3.53,17,2.45,.17,'#496268');for(let i=0;i<12;i++)box(-8.25+i*1.5,1.42,3.69,.09,2.49,.10,'#adab9f');box(0,2.89,4.32,19.6,.26,2.65,'#6d7370');for(let i of [-8,-4,4,8])box(i,1.39,5.25,.15,2.77,.15,'#737673');box(0,1.17,3.71,2.2,2.34,.12,'#33494c')});
// Cool bank reflections break into horizontal bands where the low sun hits the water.
const water=new T.Mesh(new T.PlaneGeometry(170,16),new T.ShaderMaterial({
 vertexShader:'varying vec3 world;void main(){world=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}',
 fragmentShader:`varying vec3 world;
 float h(vec2 p){return fract(sin(dot(p,vec2(27.3,139.7)))*4197.17);}
 float n(vec2 p){
   vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
   return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);
 }
 void main(){
   vec2 p=world.xz;
   float swell=n(p*vec2(.56,1.2)),ripple=n(p*vec2(2.4,19.)+2.*swell);
   float bank=n(p*vec2(.51,.19)+.47*ripple);
   vec3 c=mix(vec3(.18,.32,.34),vec3(.36,.55,.57),.57*bank+.43*swell);
   float sun=exp(-abs(p.x+7.+2.1*swell)*.12);
   c+=vec3(.60,.39,.21)*smoothstep(.66,.91,ripple)*sun;
   c*=mix(.68,1.,smoothstep(0.,2.4,abs(p.x)-1.1));gl_FragColor=vec4(c,1.);
 }`
}));
water.rotation.x=-Math.PI/2;water.scale.set(3,1.44,1);water.position.set(0,-2.18,16.8);scene.add(water);
const bankZ=x=>9.90+smooth((Math.abs(x)-2.4)/7)*(1.12*Math.sin(x*.28)+.72*Math.sin(x*.46));
// One continuous hillside keeps the grazing sunlight smooth between the terraces.
// Separate banks leave the riverbed open under the bridge.
function riverbank(north){
 const positions=[],uv=[],colors=[],indices=[];
 const cols=77,rows=north?77:30;
 for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){
   const x=(j-cols/2)*4.15,edge=north?bankZ(x):24+.65*Math.sin(x*.16);
   const z=edge+(north?-1:1)*i*2.1,y=north?height(z):0;
   positions.push(x,y-.051,z);uv.push(x*.24,z*.24);
   const t=.5+.21*Math.sin(x*.93+z*.43)+.22*Math.sin(z*.96-x*.25);
   const color=new T.Color().lerpColors(new T.Color('#93915e'),new T.Color('#b5ae78'),t);
   colors.push(color.r,color.g,color.b);
   if(i&&j){const d=i*(cols+1)+j,a=d-cols-2,b=a+1,c=d-1;
     indices.push(...(north?[a,b,c,b,d,c]:[a,c,b,b,c,d]))}
 }
 // Continue the exposed bank down to the riverbed beyond the stone quay.
 const bottom=positions.length/3;
 for(let j=0;j<=cols;j++){
   const x=positions[3*j],z=positions[3*j+2];
   positions.push(x,-2.55,z+(north?.72:-.72));uv.push(x*.24,-.59);colors.push(.32,.24,.16);
   if(j)indices.push(...(north?[j,j-1,bottom+j-1,j,bottom+j-1,bottom+j]:[j-1,j,bottom+j,j-1,bottom+j,bottom+j-1]));
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 g.setIndex(indices);g.computeVertexNormals();const mesh=new T.Mesh(g,finishes.stone);mesh.receiveShadow=true;scene.add(mesh);
}
riverbank(true);riverbank(false);
const bridgeY=z=>z>9&&z<25?.42*Math.sin(Math.PI*(z-9)/16):0;
for(let j=0;j<32;j++){let z=9.25+j*.5,y=bridgeY(z),inner=(j%10)-4.5;box(0,y-.22,z,5,.44,.52,'#bcab92');for(const side of [-1,1]){const deep=.34+1.64*(Math.abs(inner)/4.5)**2;box(side*2.36,y-.15-deep/2,z,.52,deep,.53,pick(stone))}}
for(const z of [9,14,19,24.8])for(const x of [-2.34,2.34]){box(x,bridgeY(z)+.45,z,.67,.91,.68,'#cfb897');if(z===9||z===24.8)lamp(x,bridgeY(z)+.90,z)}
// Each cross-section joins both shop forecourts to the uphill lane.
// Interpolating the two edges also gives the paving and walking limits the same bends.
const sections=[
 [-35,-5.7,9.5],[-31,-3.8,3.9],[-25,.2,4.7],[-20,-1.7,3.1],
 [-15,-5.1,-.3],[-10,-4.3,1.1],[-6,-9.6,3.4],[-3.2,-9.1,4.3],
 [.5,-2.3,3.7],[3.7,-3.3,7.5],[6,-3.6,6.7],[9,-2.14,2.14]
];
function edges(z){
 if(z>=9)return [-2.14,2.14];
 const end=sections.findIndex(p=>p[0]>=z);
 if(end<=0)return sections[0].slice(1);
 const [za,la,ra]=sections[end-1],[zb,lb,rb]=sections[end],t=smooth((z-za)/(zb-za));
 return [la+(lb-la)*t,ra+(rb-ra)*t];
}
function road(x,z,margin=0){const [l,r]=edges(z);return x>l+margin&&x<r-margin}
const surface=z=>height(z)+bridgeY(z);
// Each row of setts is tapered to its cross-section so the stones turn together.
const strips=[],stripColors=[],stripUV=[];
function face(a,b,c,d,color){
 const tone=new T.Color(color);
 for(const point of [a,d,b,b,d,c]){strips.push(...point);stripColors.push(tone.r,tone.g,tone.b);stripUV.push(point[0]*1.3,point[2]*1.3)}
}
for(let j=0;j<203;j++){
 const z0=-34.8+j*.32,z1=z0+.32,[l0,r0]=edges(z0),[l1,r1]=edges(z1);
 const y0=surface(z0)+.082,y1=surface(z1)+.082;
 const row=(u,far,dy)=>far?[l1+u*(r1-l1),y1+dy,z1]:[l0+u*(r0-l0),y0+dy,z0];
 face(row(0,false,0),row(1,false,0),row(1,true,0),row(0,true,0),'#99877c');
 const count=Math.round(((r0-l0)+(r1-l1))/.85);
 const seams=Array.from({length:count+2},(_,k)=>Math.max(0,Math.min(1,(k-(j%2)*.5+(k>0&&k<count?(rand()-.5)*.47:0))/count)));
 for(let k=0;k<count+(j%2);k++){
   const a=seams[k]+.0008,b=seams[k+1]-.0008;
   const rise=.016+rand()*.006,pa=row(a,false,rise),pb=row(b,false,rise),pc=row(b,true,rise),pd=row(a,true,rise);
   pc[2]-=.010;pd[2]-=.010;
   const color=pick(['#d3bbad','#dfc7b9','#d7c2ae','#bfb1b2','#d5bdb4','#e0c9ad']);
   const rim=[pa,pb,pc,pd],center=pa.map((v,i)=>(v+pc[i])*.5);
   const top=rim.map(p=>[p[0]+(center[0]-p[0])*.078,p[1]+.006+rand()*.008,p[2]+(center[2]-p[2])*.10]);
   face(...top,color);
   for(let s=0;s<4;s++)face(rim[s],rim[(s+1)%4],top[(s+1)%4],top[s],color);
 }
}
const stonework=new T.BufferGeometry();
stonework.setAttribute('position',new T.Float32BufferAttribute(strips,3));
stonework.setAttribute('color',new T.Float32BufferAttribute(stripColors,3));
stonework.setAttribute('uv',new T.Float32BufferAttribute(stripUV,2));
stonework.computeVertexNormals();
stoneGrain.wrapS=stoneGrain.wrapT=T.RepeatWrapping;
const lane=new T.Mesh(stonework,finishes.stone);
lane.receiveShadow=true;scene.add(lane);
function masonry(x,y,z,w,h,depth,along=0){
 local(x,y,z,along,()=>{
   box(0,h/2,0,w-.015,h,depth-.04,'#a08a74');
   const rows=Math.max(2,Math.round(h/.20)),n=Math.max(2,Math.ceil(w/.45));
   for(let row=0;row<rows;row++){
     let start=0;
     for(let i=1;start<n;i++){
       const end=i>=n+row%2?n:i-(row%2)*.5+(rand()-.5)*.48;
       rock(((start+end)/2/n-.5)*w,(row+.50)*h/rows,0,(end-start)*w/n-.017,h/rows-.016,depth+.012+rand()*.091,pick(stone),0,(rand()-.5)*.034);
       start=end;
     }
   }
   for(let k=0;k<n;k++)rock((k+.5)*w/n-w/2,h+.045,0,w/n-.012,.10+rand()*.020,depth+.14,pick(stone));
 });
}
// Raised beds follow the switchback; the wall joints step up the hill.
for(const side of [-1,1])for(let j=0;j<30;j++){
 const za=-8.3-j*.72,zb=za-.72,z=(za+zb)/2;
 const edge=t=>edges(t)[side<0?0:1]+side*.33;
 const a=edge(za),b=edge(zb),x=(a+b)/2;
 const lawn=smooth((-z-20)/5),bed=.44+.37*smooth((-z-10)/9)-.66*lawn;
 masonry(x,height(z)-.10,z,Math.hypot(a-b,za-zb)+.018,bed+.10,.44,Math.atan2(za-zb,b-a));
 const px=x+side*1.02;
 box(px,height(z)+bed/2-.08,z,1.6,bed,.78,'#8b8c58');
 if(lawn<.95||j%4===0)bush(px,height(z)+bed-.08,z,(.90+rand()*.25)*(1-.5*lawn),true);
 if(j%5===0&&lawn<.2)cypress(px+side*.53,height(z)+bed,z,1.2+rand()*.60);
}
for(let i=0;i<3;i++){let x=6+i*1.65,z=-27-i*.85;round(x,height(z)+.56,z,1.25,1.12,1.25,'#439668');round(x,height(z)+1.14,z,1.43,.24,1.43,'#368654');round(x,height(z)+1.27,z,.98,.025,.98,'#235e4a')}
const galleryLift=height(-37)-4.2;
local(0,galleryLift,0,0,()=>{for(let i=0;i<5;i++){
 const x=6+i*.74;
 box(x,6.65,-30,.73,.73,.68,i===1?'#f3b337':'#915431');
 if(i===1)label('?',x,6.65,-29.65,.61,.61,'#eba127','#fff3cf');
 else for(let row=0;row<2;row++)for(let k=0;k<2;k++)box(x-.18+k*.36,6.48+row*.34,-29.65,.33,.30,.05,'#bf7748');
}
for(const x of [6.05,8.85])box(x,5.45,-30.20,.075,2.4,.10,'#606b62');
round(7.68,7.16,-30,.31,.39,.31,'#f0d8ad');
round(7.68,7.38,-30,.58,.19,.55,'#b64f3d');round(7.68,7.51,-30,.44,.10,.40,'#c15b47');
box(7.66,7.39,-29.73,.14,.12,.035,'#ffe3bf');
});
for(let j=0;j<42;j++){let x=(j%2?-1:1)*(11+rand()*23),z=8-rand()*49;if(Math.abs(x+10)<6.8&&Math.abs(z+8)<6)continue;cypress(x,height(z),z,3.2+rand()*4.5)}
for(let j=0;j<180;j++){const side=rand()>.5?1:-1,z=8-rand()*41,x=side*(5+rand()*12);if(buildings.some(b=>Math.hypot(x-b.x,z-b.z)<6.7)||road(x,z))continue;bush(x,height(z),z,.65+rand(),j%3!==0)}
for(let j=0;j<65;j++){const x=(rand()-.5)*83,z=j%2?8.4:24.9;if(Math.abs(x)<3)continue;bush(x,0,z,.8+rand()*.8,true)}
for(let i=0;i<35;i++){
 const tier=Math.floor(i/10),x=(i%10-4.5)*7.15+(rand()-.5)*2.8,z=-52-tier*8-rand()*4;
 const y=6.3+tier*3.55+.14*Math.abs(x)+Math.sin(x*.13)*2.6;
 rock(x,(y+4)/2,z,8.2,y-4,12,'#b4a186');
 local(x,y,z,(rand()-.5)*.64,()=>{
   const h=2.6+rand()*2.2,w=3.8+rand()*1.7;
   rock(0,h/2,0,w,h,3.9,pick(['#efe3c9','#f6e1c6','#dbbdac']));
   houseRoof(w,3.9,h,'#ae6d50');
   for(const k of [-1.1,1.0]){
     windowBay(k,h*.61,2,.7,1);
     for(const side of [-1,1])timber(k+side*.48,h*.61,2.13,.21,1.03,.10,'#707968');
   }
   rock(-w*.27,h+.68,-.4,.42,1.3,.48,'#dfb797');box(-w*.27,h+1.38,-.4,.55,.15,.6,'#a66f59');
   cypress(w*.63,0,1,3.4+rand()*2.6);
 });
}
for(let j=0;j<60;j++){
 const x=(j-30)*4.1;
 const ridge=21+8*Math.sin(x*.081)+4*Math.cos(x*.21);
 leaf(x,4,-104,24,ridge+rand()*8,22,pick(['#9794ad','#a99cb0','#b29ca4']),0,rand()*4);
}
for(let z of [1,-15,-31])lamp(edges(z)[0]-.75,height(z),z);
// Recessed panes, warm interior fittings and planted edges give close approaches a readable scale.
local(2,height(-37),-37,.035,()=>{
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
 label('PIZZA · PASTA · RISOTTO',0,3.86,3.643,3.6,.30,null,'#ffe1ae');for(const x of [-4.3,3.6]){rock(x,.2,4.0,2.7,.40,.66,'#c7b295');for(let k=0;k<5;k++)bush(x-1.03+k*.51,.41,4,.56,true)}
});
for(let j=0;j<18;j++){const z=-9-j*1.5;for(const side of [-1,1]){let x=side*(6.8+rand()*2.5);if((z>-17&&side<0)||(z< -24&&side>0)||road(x,z,-.7))continue;bush(x,height(z),z,.65+rand()*.48,true)}}
for(let j=0;j<15;j++){const side=j%2?-1:1;let x=side*(21+rand()*12),z=6-Math.floor(j/2)*6;local(x,height(z),z,side*.45,()=>{const h=3.1+2*rand();box(0,h/2,0,5.8,h,4.4,pick(['#e5d2ae','#f0d8b7','#d8bc9b']));houseRoof(5.8,4.4,h,'#af694b');for(const x of [-1.6,1.4])windowBay(x,h-.99,2.24,.9,1.22);box(-.4,1.0,2.24,1.0,2,.14,'#81654e');box(-1.5,h+1.1,-.4,.5,1.6,.55,'#c39c79')})}

// The bridge and quay are the closest surfaces in the arrival view.
for(const side of [-1,1]){
 for(let i=0;i<8;i++){
   const z=10+i*2;
   masonry(side*2.31,bridgeY(z)+.03,z,1.98,.64,.50,Math.PI/2);
   if((i+(side>0?1:0))%3===0)for(let k=0;k<19;k++){
     const t=k/18,stem=z+.33*Math.sin(t*4),y=bridgeY(z)+.79-.62*t;
     box(side*2.021,y,stem,.055,.095,.07,'#73804c');
     box(side*2.00,y-.025,stem+(k%2?.08:-.07),.08,.075,.13,pick(green),.35,0,t);
     if(k%6===1)box(side*1.96,y+.03,stem,.048,.07,.064,'#c997ad');
   }
 }
 for(let k=0;k<11;k++){
   const x=side*(3.52+k*2.1);
   const za=bankZ(x-1.05),zb=bankZ(x+1.05);
   masonry(x,-2.26,(za+zb)/2,Math.hypot(2.1,zb-za),2.26,.57,-Math.atan2(zb-za,2.1));
   bush(x,.06,bankZ(x)-.25,.92+rand()*.55,k%3!==0);
 }
 for(let k=0;k<15;k++){
   const z=7.7-k*.74,edge=edges(z)[side<0?0:1],px=edge+side*.55;
   if((side>0&&z<6.4)||(side<0&&z<-.4))continue;
   masonry(px,-.04,z,.76,.30,.35,Math.PI/2);
   bush(px+side*.46,.02,z,1.02,k%4!==0);
 }
}
local(-10,0,-8,.60,()=>{
 const glass=glazing('#97b4b0','#918675',true);
 for(const x of [-4.35,-2.45,.1,2.3,4.35]){
   // Recess each pane behind the exterior muntins.
   for(const side of [-1,1])panel(glass,x+side*.41,1.56,3.325,.75,1.90);
   box(x,2.80,3.32,1.77,.13,.28,'#62452d');
   box(x,2.71,3.35,1.46,.04,.21,'#d0a261');
 }
 for(let k=0;k<7;k++){
   const x=1.35+k*.55;
   box(x,1.25,3.555,.19,.13,.035,'#e9bc7c');
   box(x,2.05,3.555,.13,.38,.035,k%2?'#dfb25d':'#548f8c');
 }
});
local(9,0,3,-.73,()=>{
 const glass=glazing('#849b99','#686c59',true);
 for(const x of [.1,2.63]){
   for(const side of [-1,1])panel(glass,x+side*.46,1.43,3.35,.81,2.14);
   box(x,1.44,3.372,.05,2.14,.06,'#4c4c42');box(x,1.74,3.37,1.92,.065,.06,'#665740');
   box(x,2.63,3.47,2.18,.08,.79,'#384c3d');
   for(const s of [-1,1])box(x+s*.91,2.52,3.52,.065,.08,.78,'#544639',.45);
 }
});
local(2,height(-37),-37,.035,()=>{
 const gallery=glazing('#adb7be','#a39a82',true),clerestory=glazing('#a3b3b9','#71848b',false);
 for(let i=0;i<13;i++){
   const x=-8+i*1.31;
   if(Math.abs(x)>1.2)panel(gallery,x,1.45,3.70,1.17,2.04);
 }
 for(let i=0;i<14;i++)panel(clerestory,-5.66+i,4.57,3.644,.88,.74);
});
// Layers of vines on the bank frame the storefronts from the bridge.
palm(-8.1,0,8.5,6.6);
for(let i=0;i<19;i++){
 const x=-15+i*.65;
 if(x>-3.4)break;
 bush(x,.06,8.9+rand()*.44,1.2+rand()*.7,true);
}

// Timber joinery, hanging lamps and painted boards sit in front of recessed glazing.
local(-10,0,-8,.60,()=>{
 for(let i=0;i<25;i++){
   const x=-5.45+i*.45;
   timber(x,3.39,3.30,.092,.14,.80,'#98683d');
   if(i%3===0){box(x,3.25,3.41,.12,.09,.12,'#604734');box(x,3.19,3.41,.078,.054,.078,'#ffdaa0')}
 }
 for(let i=0;i<7;i++){
   const x=1.35+i*.55;
   for(let j=0;j<5;j++){
     box(x, .69+j*.35,3.561,.20,.065,.03,j%2?'#f0cb8d':'#678f8c',0,0,(i%3-1)*.43);
     box(x+.073, .79+j*.35,3.564,.045,.08,.026,'#fff0bd');
   }
 }
 timber(-.65,1.15,3.338,1.02,2.16,.10,'#98613c');
 panel(glazing('#9caca9','#806d55',true),-.65,1.52,3.395,.76,1.17);
 box(-.24,1.02,3.42,.046,.22,.07,'#edc783');
 for(const x of [-5.4,-1.4,5.4])for(let k=0;k<12;k++)rock(x, .14+k*.28,3.69,.26,.265,.034,pick(['#509a95','#64aaa0','#5b9b91']));
 for(const side of [-1,1])local(5.51*side,0,0,side*Math.PI/2,()=>{
   rock(0,1.77,0,5.91,3.47,.06,'#c79a80');
   for(let i=0;i<31;i++){
     const u=(i%8-3.5)*.69,v=.47+Math.floor(i/8)*.78;
     box(u,v,.054,.15,.53,.035,pick(['#549998','#c7714d','#dfc28f','#757a90']),0,0,Math.sin(i*2.7)*.79);
   }
   windowBay(.1,1.63,.10,2.65,1.64);
 });
});

function floweringVine(x,y,z,length,span){
 for(let strand=0;strand<7;strand++){
   const start=x+span*(strand/6-.5),drop=length*(.35+.65*rand());
   for(let k=0;k<Math.ceil(drop/.15);k++){
     const t=k*.15,px=start+.11*Math.sin(k*.57+strand),py=y-t,pz=z+.07*Math.cos(k*.7);
     timber(px,py,pz,.045,.17,.045,'#81704d',0,0,.18*Math.sin(k));
     for(let j=0;j<3;j++){
       const dx=(rand()-.5)*.28,dy=rand()*.16;
       leaf(px+dx,py+dy,pz+.06,.19,.125,.18,pick(['#668147','#779442','#98a54e']),0,rand()*3);
       if((k+strand+j)%3)box(px+dx,py+dy+.045,pz+.12,.075,.091,.072,pick(['#c34886','#e783af','#b4458c']),0,.5);
     }
   }
 }
}
local(9,0,3,-.73,()=>{
 // Coping and roof seams are also visible from the high camera.
 for(const side of [-1,1]){
   rock(side*3.93,6.83,0,.18,.25,6.11,'#aa6853');rock(0,6.83,side*2.94,7.80,.25,.17,'#af725e');
 }
 for(let i=0;i<13;i++)box(-3.66+i*.61,6.806,0,.035,.035,5.76,'#94756a');
 for(const x of [-2.74,0,2.83]){
   box(x,6.67,3.35,.05,.05,.51,'#5c5654');box(x,6.62,3.58,.22,.10,.14,'#504749',.32);
 }
 for(let row=0;row<3;row++)for(let i=0;i<12;i++){
   const z=3.18+row*.32;
   rock(-3.58+i*.18,3.10-row*.095,z,.174,.095,.39,pick(['#ce8960','#c97c56','#dc9466']),.26);
   round(-3.58+i*.18,3.14-row*.095,z,.086,.42,.086,'#d99969',1.31);
 }
 for(const x of [-2.10,.50,2.85]){
   box(x,5.17,3.38,1.66,.115,.47,'#f1dfc5');box(x,3.61,3.39,1.68,.105,.49,'#d4c4b7');
   for(const side of [-1,1])box(x+side*.746,4.39,3.38,.11,1.52,.44,'#eedac3');
 }
 const upperGlass=glazing('#83969c','#65665e',false);
 for(const x of [-2.10,.50,2.85])panel(upperGlass,x,4.39,3.398,.91,1.32);
 for(let j=0;j<6;j++)timber(-3.02+j*.16,1.16,3.332,.151,2.02,.042,pick(['#a27650','#95633e','#a77648']));
 panel(upperGlass,-2.62,1.55,3.368,.59,.76);
 for(const side of [-1,1])timber(-2.62+side*.33,1.55,3.39,.065,.89,.074,'#b48b5e');
 box(-2.23,1.01,3.41,.04,.19,.062,'#dbbc82');
 for(const x of [.1,2.63])for(let i=0;i<9;i++)box(x-.99+i*.246,2.86,3.56,.019,.024,.94,'#61967a',.23);
 for(const x of [.45,2.16])for(let k=0;k<12;k++){
   const a=k*Math.PI/6;
   round(x+.18*Math.cos(a),.94+.16*Math.sin(a),3.863,.031,.105,.031,'#fff1d4',0,0,a);
 }
 floweringVine(3.81,6.72,3.19,2.55,.65);
});
// Gravel courtyards ground each shop. The public lane runs level with the steps.
local(-10,0,-8,.60,()=>rock(0,.006,.75,13.5,.11,7.65,'#d4c0a3'));
local(9,0,3,-.73,()=>rock(0,.004,.68,8.86,.14,7.76,'#ceba9f'));
local(2,height(-37),-37,.035,()=>{
 rock(0,.005,2.35,20.2,.12,6.7,'#d9d2bd');
 for(let i=0;i<6;i++)box(-7.8+i*3.1,5.16,0,.08,.12,6.68,'#c9c5bf');
});

function olive(x,y,z,h){
 function branch(a,b,r,color){
   const dir=new T.Vector3(...b).sub(new T.Vector3(...a));
   const rotation=new T.Euler().setFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),dir.clone().normalize()));
   timber((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,r,dir.length(),r,color,rotation.x,rotation.y,rotation.z);
 }
 local(x,y,z,0,()=>{
   const fork=[.10*h,h*.54,0],lower=[.01*h,h*.28,-.04*h];
   branch([0,0,0],lower,h*.066,'#756147');branch(lower,fork,h*.051,'#806a50');
   for(let j=0;j<8;j++){
     const a=j*2.4,spread=h*(.23+rand()*.16),tip=[fork[0]+spread*Math.cos(a),h*(.78+rand()*.21),spread*Math.sin(a)];
     const elbow=[(fork[0]+tip[0])*.50,(fork[1]+tip[1])*.53,(fork[2]+tip[2])*.44];
     branch(fork,elbow,h*.025,'#81654b');branch(elbow,tip,h*.015,'#917957');
     for(let k=0;k<28;k++){
       const u=rand()*6.28,r=h*.19*Math.sqrt(rand()),px=tip[0]+r*Math.cos(u),pz=tip[2]+r*Math.sin(u);
       const py=tip[1]+(.52-r/h)*rand()*h*.35;
       box(px,py,pz,.28+rand()*.35,.11+rand()*.15,.35+rand()*.29,pick(['#556a42','#738a51','#839b5f','#abb56d']),.18,u,.25);
       box(px-.10,py+.105,pz,.16,.075,.20,'#aab978',.21,u);
     }
   }
 });
}
// A rocky shelf in the water catches the near canopy without narrowing the bridge.
for(let i=0;i<54;i++){
 const a=i*2.4,r=2.6*Math.sqrt(i/54);
 rock(-7.85+r*Math.cos(a),-1.96+.24*(1-r/2.6),15.3+r*.68*Math.sin(a),.72+rand()*.8,.55+rand()*.61,.55+rand()*.75,pick(stone),.09,rand()*.65);
}
olive(-7.85,-1.45,15.3,7.65);
for(let i=0;i<13;i++)bush(-9.35+rand()*3,-1.46,15.1+rand()*.82,.76+rand()*.6,i%2===0);
for(const side of [-1,1])for(let i=0;i<26;i++){
 const x=side*(3.1+i*.48),z=bankZ(x)+.45+rand()*.6;
 rock(x,-2.08,z,.55+rand()*.67,.23+rand()*.41,.58+rand()*.38,pick(stone),.04,rand()*.7);
 if(i%3===0)part('herb',x,-1.96,z,.72,1.8,.64,'#a29c5c',0,i);
 if(i%9===2)floweringVine(x,.10,bankZ(x)+.36,1.39,.94);
}
// Side gardens carry the eye from the two forecourts to a planted hillside.
for(const [x,z] of [[-15,4],[16,-7],[-12,-20],[15,-24],[21,32],[-18,28]]){
 const y=height(z);
 masonry(x,y-.08,z+2.0,5.7,.52,.36);
 rock(x,y+.14,z,5.5,.38,4,'#b7a884');
 olive(x,y+.32,z,3.6+rand());
 for(let k=0;k<10;k++)bush(x-2.5+k*.54,y+.34,z+1.64,.72,k%3!==1);
}
for(let k=0;k<12;k++){
 const z=-11-k*1.42,side=k%2?1:-1,x=edges(z)[side>0?1:0]+side*3.9;
 if(z>-18&&side<0)continue;
 masonry(x,height(z)-.16,z,3.4,.48,.31);
 for(let i=0;i<9;i++)bush(x-1.42+i*.36,height(z)+.06,z-.48,.77,true);
}
// Long garden beds step down towards the shop fronts. The inner margins follow
// the actual lane, leaving its bends and the museum lawn clear at every grade.
for(const side of [-1,1])for(let band=0;band<3;band++){
 for(let j=0;j<7;j++){
   const z=-12.4-j*1.7,margin=3.05+band*1.25;
   if(side<0&&j<2)continue;
   const edge=edges(z)[side<0?0:1],x=edge+side*margin;
   const y=height(z),bed=.28+band*.16;
   rock(x,y+bed*.50-.12,z,1.32,bed+.17,1.80,'#b6a384');
   for(const dz of [-.45,.45])bush(x+(rand()-.5)*.46,y+bed-.018,z+dz,.96+rand()*.21,true);
 }
}

for(const [key,items] of Object.entries(batches)){
 const shape=key.split('@')[0],mesh=new T.InstancedMesh(geos[shape]||geos.box,finishes[shape]||mat,items.length);
 items.forEach(([m,c],i)=>{mesh.setMatrixAt(i,m);mesh.setColorAt(i,new T.Color(c))});
 mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);
}
renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
return {renderer,scene,camera,buildings,height,bridgeY,road};
})();
