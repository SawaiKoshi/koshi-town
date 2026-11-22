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
scene.fog=new T.FogExp2(0xe9beb3,.0105);
scene.add(new T.HemisphereLight(0xffe3df,0xaa92a1,1.05));
const sun=new T.DirectionalLight(0xffdeb0,2.55);
sun.position.set(-43,25,17);sun.target.position.set(0,0,-12);scene.add(sun,sun.target);
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
   vec3 c=mix(vec3(.99,.79,.64),vec3(.54,.55,.73),t);
   vec2 p=n.xz/max(.10,n.y+.13)*vec2(2.5,5.);
   float vapor=noise(p)*.52+noise(p*2.1)*.28+noise(p*4.3)*.14+noise(p*8.3)*.06;
   c=mix(c,mix(vec3(.86,.67,.72),vec3(1.,.83,.73),smoothstep(.42,.70,vapor)),
     smoothstep(.47,.67,vapor)*smoothstep(-.01,.18,n.y)*.84);
   c+=vec3(.16,.093,.03)*pow(max(0.,dot(n,normalize(vec3(-.8,.22,-.35)))),12.);
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
function local(x,y,z,angle,fn){const prev=transform;transform=prev.clone().multiply(new T.Matrix4().makeRotationY(angle).setPosition(x,y,z));fn();transform=prev}
function part(shape,x,y,z,w,h,d,color,rx=0,ry=0,rz=0){dummy.position.set(x,y,z);dummy.scale.set(w,h,d);dummy.rotation.set(rx,ry,rz);dummy.updateMatrix();(batches[shape]??=[]).push([new T.Matrix4().multiplyMatrices(transform,dummy.matrix),color])}
const box=(...v)=>part('box',...v),round=(...v)=>part('round',...v),leaf=(...v)=>part('leaf',...v);
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
 [[0,top],[.47,'#6d7879'],[.51,inside],[1,'#594532']].forEach(([t,tone])=>reflection.addColorStop(t,tone));
 g.fillStyle=reflection;g.fillRect(0,0,192,192);
 g.fillStyle='#ded5bb';g.globalAlpha=.17;g.beginPath();g.moveTo(0,29);g.lineTo(192,9);g.lineTo(192,26);g.lineTo(0,57);g.fill();g.globalAlpha=1;
 if(lit){
   for(const x of [31,126]){
     const glow=g.createRadialGradient(x,72,1,x,72,45);glow.addColorStop(0,'#ffd69a');glow.addColorStop(.22,'#f3b975a8');glow.addColorStop(1,'#d49c6000');
     g.fillStyle=glow;g.fillRect(x-45,27,90,90);g.fillStyle='#4e4337';g.fillRect(x,0,2,65);
     g.fillStyle='#ffdf9a';g.fillRect(x-7,67,15,5);
   }
   g.fillStyle='#b88956';g.fillRect(0,144,192,5);
   for(const x of [12,66,151]){g.fillStyle='#554337';g.fillRect(x,151,27,8);g.fillRect(x+2,157,4,25)}
 }
 const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;
 return new T.MeshBasicMaterial({map:texture,color:0xebdfd2});
}
const stone=['#d2bc9f','#ecd8b7','#dec9ab','#c6ad90'],pave=['#bfada0','#c9b8a8','#e0cbb4','#d5c0aa','#b7a69e'],green=['#74883b','#8d9946','#616f38','#82984c'],petal=['#bb78ad','#8f709d','#df9fc7','#efc95d'];
function smooth(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)}
const height=z=>1.46*smooth((-z-8)/9)+2.74*smooth((-z-16)/14);
function bush(x,y,z,s,flowers=false){
 const bloom=pick(['#b572ab','#cf80a8','#9576ad','#efbd59']);
 for(let i=0;i<9;i++){
   const a=i*2.4,r=Math.sqrt(i/9)*s*.50,px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;
   const h=s*(.26+rand()*.22)*(1-.22*r/s);
   box(px,y+h*.48,pz,s*.31,h,s*.28,pick(green));
   box(px+.045*s,y+h,pz,s*.21,s*.13,s*.18,pick(['#778c43','#899f4e','#99a75d']));
   if(flowers && i%3!==0){
     box(px,y+h+s*.14,pz,.055*s,.25*s,.055*s,'#728440');
     box(px,y+h+s*.25,pz,s*.12,s*.14,s*.12,bloom);
     box(px+.025*s,y+h+s*.34,pz,.078*s,.085*s,.08*s,pick([bloom,'#e3b7c9']));
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
   box(0,ridge-Math.tan(slope)*half-.10,sign*half,w+.78,.18,.16,'#614537');
   const rows=detailed?8:4,columns=Math.ceil(w/(detailed ? .46 : 1.2));
   const step=(w+.76)/columns;
   for(let row=0;row<rows;row++)for(let k=0;k<columns;k++){
     const z=(row+.5)*half/rows;
     box(-w/2-.38+(k+.5)*step,ridge-Math.tan(slope)*z+.145,sign*z,step-.018,.09,length/rows+.04,
       pick(detailed?['#52494c','#605452','#544c50','#635757']:[col,'#a15e46','#b37656']),sign*slope);
   }
 }
 box(0,ridge+.13,0,w+.79,.23,.29,col);
}
function chair(x,z){round(x,.57,z,.66,.11,.66,'#f1e9d9');for(const i of [-1,1])for(const j of [-1,1])box(x+i*.22,.28,z+j*.21,.065,.55,.065,'#eee1ce');for(const i of [-1,1])box(x+i*.23,.86,z-.26,.055,.66,.065,'#eee1ce');box(x,1.14,z-.25,.51,.09,.09,'#eee1ce')}
const buildings=[];
function site(x,z,a,w,d,fn){buildings.push({x,z,a,w,d});local(x,height(z),z,a,fn)}
site(9,3,-.73,8,6,()=>{
box(0,3.35,0,8,6.7,6,'#a35037');
for(let r=0;r<29;r++)for(let k=-1;k<14;k++){
 const left=Math.max(-4,-4+k*.60+(r%2)*.30),right=Math.min(4,-3.42+k*.60+(r%2)*.30);
 if(right>left)box((left+right)/2,r*.22+.12,3.011,right-left,.198,.042,pick(['#ba6344','#b45a3f','#ac573c','#bc684c']));
}
box(0,6.70,0,8.25,.19,6.25,'#71524c');box(.2,6.02,3.12,6.85,.99,.22,'#373537');label('SISTER',.2,6.14,3.24,6.5,.77,null,'#fff2dc');label('HAIRCUTS & SHAVE',.2,5.72,3.24,4,.23,null,'#f4dabc');
for(const x of [-2.1,.5,2.85]){windowBay(x,4.39,3.16,1.32,1.43);for(const side of [-1,1]){box(x+side*.61,4.38,3.47,.33,1.37,.30,'#453f38',0,side*.28);for(let i=0;i<8;i++)box(x+side*.61,3.83+i*.15,3.65,.31,.045,.04,'#736656')}}
for(const x of [.1,2.63]){windowBay(x,1.44,3.1,1.98,2.28);box(x,2.85,3.53,2.3,.14,1.05,'#38795c',.23);box(x,2.69,4.02,2.3,.21,.11,'#407c5e')}
box(-2.63,1.19,3.1,1.35,2.38,.23,'#895e39');box(-2.63,1.56,3.24,.68,1.05,.07,'#505f59');for(let i=0;i<10;i++)round(-3.55+i*.205,2.88,3.53,.27,1.15,.26,pick(['#bf724d','#d4875b']),1.33);
round(-3.6,2.01,3.53,.19,.72,.19,'#f4e7d2');for(let i=0;i<3;i++)round(-3.6,1.80+i*.17,3.53,.196,.082,.196,i===1?'#48647f':'#b35c50',0,0,-.30);
chair(.45,4.12);chair(2.16,4.12);round(1.31,.75,4.1,.9,.10,.9,'#eee4ce');round(1.31,.39,4.1,.14,.78,.14,'#e1d6c6');for(let j=0;j<12;j++)box(-.7+j*.36,.45,3.54,.24,.6+rand()*.58,.24,'#675440');bush(-3.6,.12,4.25,1.1);bush(3.7,.1,4.1,.8,true);
});
site(-10,-8,.60,11,6,()=>{
box(0,1.8,0,11,3.6,6,'#ab7849');for(let j=0;j<14;j++)box(0,j*.25+.12,3.01,11,.205,.08,pick(['#a97146','#be8650','#b37b4d']));houseRoof(11,6,3.63,'#51494b',true);
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
for(let i=0;i<130;i++){const z=-10.8-i*.4;box(0,height(z)-1.61,z,150,3.1,.41,'#92945d')}
box(0,-.62,-10.50,150,1.2,.99,'#a8a77b');box(0,1.65,-78,180,5,35,'#a2a57b');
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
const strips=[],stripColors=[];
function face(a,b,c,d,color){
 const tone=new T.Color(color);
 for(const point of [a,d,b,b,d,c]){strips.push(...point);stripColors.push(tone.r,tone.g,tone.b)}
}
for(let j=0;j<203;j++){
 const z0=-34.8+j*.32,z1=z0+.32,[l0,r0]=edges(z0),[l1,r1]=edges(z1);
 const y0=surface(z0)+.082,y1=surface(z1)+.082;
 const row=(u,far,dy)=>far?[l1+u*(r1-l1),y1+dy,z1]:[l0+u*(r0-l0),y0+dy,z0];
 face(row(0,false,0),row(1,false,0),row(1,true,0),row(0,true,0),'#99877c');
 const count=Math.round(((r0-l0)+(r1-l1))/.98);
 for(let k=0;k<count+(j%2);k++){
   const a=Math.max(0,(k-(j%2)*.5)/count)+.0009,b=Math.min(1,(k+1-(j%2)*.5)/count)-.0009;
   const rise=.016+rand()*.006,pa=row(a,false,rise),pb=row(b,false,rise),pc=row(b,true,rise),pd=row(a,true,rise);
   pc[2]-=.010;pd[2]-=.010;
   face(pa,pb,pc,pd,pick(['#c4aa98','#cab5a2','#d1bda7','#b9a6a0','#c5b0a8','#d7c0a7']));
 }
}
const stonework=new T.BufferGeometry();
stonework.setAttribute('position',new T.Float32BufferAttribute(strips,3));
stonework.setAttribute('color',new T.Float32BufferAttribute(stripColors,3));
stonework.computeVertexNormals();
const lane=new T.Mesh(stonework,new T.MeshLambertMaterial({vertexColors:true}));
lane.receiveShadow=true;scene.add(lane);
function masonry(x,y,z,w,h,depth,along=0){
 local(x,y,z,along,()=>{
   box(0,h/2,0,w-.015,h,depth-.04,'#a08a74');
   const rows=Math.max(2,Math.round(h/.24)),n=Math.max(2,Math.ceil(w/.50));
   for(let row=0;row<rows;row++)for(let i=0;i<n+row%2;i++){
     const start=Math.max(0,i-(row%2)*.5),end=Math.min(n,i+1-(row%2)*.5);
     box(((start+end)/2/n-.5)*w,(row+.50)*h/rows,0,(end-start)*w/n-.014,h/rows-.013,depth+rand()*.055,pick(stone));
   }
   for(let k=0;k<n;k++)box((k+.5)*w/n-w/2,h+.045,0,w/n-.012,.10,depth+.14,pick(stone));
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
for(let i=0;i<5;i++){
 const x=6+i*.74;
 box(x,6.65,-30,.73,.73,.68,i===1?'#f3b337':'#915431');
 if(i===1)label('?',x,6.65,-29.65,.61,.61,'#eba127','#fff3cf');
 else for(let row=0;row<2;row++)for(let k=0;k<2;k++)box(x-.18+k*.36,6.48+row*.34,-29.65,.33,.30,.05,'#bf7748');
}
for(const x of [6.05,8.85])box(x,5.45,-30.20,.075,2.4,.10,'#606b62');
round(7.68,7.16,-30,.31,.39,.31,'#f0d8ad');
round(7.68,7.38,-30,.58,.19,.55,'#b64f3d');round(7.68,7.51,-30,.44,.10,.40,'#c15b47');
box(7.66,7.39,-29.73,.14,.12,.035,'#ffe3bf');
for(let j=0;j<42;j++){let x=(j%2?-1:1)*(11+rand()*23),z=8-rand()*49;if(Math.abs(x+10)<6.8&&Math.abs(z+8)<6)continue;cypress(x,height(z),z,3.2+rand()*4.5)}
for(let j=0;j<180;j++){const side=rand()>.5?1:-1,z=8-rand()*41,x=side*(5+rand()*12);if(buildings.some(b=>Math.hypot(x-b.x,z-b.z)<6.7)||road(x,z))continue;bush(x,height(z),z,.65+rand(),j%3!==0)}
for(let j=0;j<65;j++){const x=(rand()-.5)*83,z=j%2?8.4:24.9;if(Math.abs(x)<3)continue;bush(x,0,z,.8+rand()*.8,true)}
for(let i=0;i<35;i++){let x=(i%10-4.5)*6.4+(rand()-.5)*2,z=-52-Math.floor(i/10)*8-rand()*4;let y=6+Math.floor(i/10)*3.5+.10*Math.abs(x)+Math.sin(x*.12)*1.7;box(x,(y+4)/2,z,7.9,y-4,12,'#ae9d83');local(x,y,z,rand()*.32,()=>{let h=2.6+rand()*2;box(0,h/2,0,4.8,h,3.9,pick(['#e5d4b7','#f0dfbf','#d5bca2']));houseRoof(4.8,3.9,h,'#ae6d50');for(let k of [-1.3,1.2])windowBay(k,h*.61,2,.7,1);cypress(2.9,0,1,4.3)})}
for(let j=0;j<52;j++){const x=(j-25)*3.7;leaf(x,1,-92,21,16+rand()*21,23,pick(['#9a94a1','#ad9fac','#b4a1a0']),0,rand()*4)}
for(let z of [1,-15,-31])lamp(edges(z)[0]-.75,height(z),z);
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
   masonry(x,-2.26,9.92,2.09,2.26,.52);
   bush(x,.06,9.45,.92+rand()*.55,k%3!==0);
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
 for(let row=0;row<28;row++)for(let k=0;k<10;k++){
   const z=-2.72+k*.57+(row%2)*.24;
   if(z<2.98)box(-4.035,row*.228+.13,z,.06,.204,.54,pick(['#a9523b','#b76246','#b65b40']));
 }
 for(const x of [.1,2.63]){
   for(const side of [-1,1])panel(glass,x+side*.46,1.43,3.307,.81,2.14);
   box(x,2.63,3.47,2.18,.08,.79,'#384c3d');
   for(const s of [-1,1])box(x+s*.91,2.52,3.52,.065,.08,.78,'#544639',.45);
 }
});
local(2,4.2,-37,.035,()=>{
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

for(const [shape,items] of Object.entries(batches)){const mesh=new T.InstancedMesh(geos[shape],mat,items.length);items.forEach(([m,c],i)=>{mesh.setMatrixAt(i,m);mesh.setColorAt(i,new T.Color(c))});mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh)}
renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
return {renderer,scene,camera,buildings,height,bridgeY,road};
})();
