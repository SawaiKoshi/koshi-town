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
scene.fog=new T.FogExp2(0xdbb3bd,.0067);
scene.add(new T.HemisphereLight(0xb7c4ed,0x76667d,.91));
const sun=new T.DirectionalLight(0xffce98,4.35);
sun.position.set(-39,23,18);sun.target.position.set(0,0,-12);scene.add(sun,sun.target);
sun.castShadow=true;
Object.assign(sun.shadow.camera,{left:-43,right:43,top:39,bottom:-39,far:116});
const shadowSize=Math.min(innerWidth<600?2048:4096,renderer.capabilities.maxTextureSize);
sun.shadow.mapSize.set(shadowSize,shadowSize);sun.shadow.normalBias=.012;sun.shadow.bias=-.00007;
// A faint, slightly cool fill lifts facades turned away from the low sun without warming
// their shade; the shadow side stays blue-violet against the sunlit fronts.
const bounce=new T.DirectionalLight(0xdfe4f4,.3);bounce.position.set(30,12,34);scene.add(bounce);
// Canopies read the sun's direction in view space to light the leaves it shines through.
const sunView=new T.Vector3();
scene.onBeforeRender=(_,__,view)=>sunView.copy(sun.position).sub(sun.target.position).transformDirection(view.matrixWorldInverse);
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
// The corners share vertices between each broad face, bevel and chipped tip.
// Reuse this solid for near masonry so its relief also appears in the shadow map.
function chippedStoneGeometry() {
 const positions=[],uv=[],colors=[];
 const inset=signs=>.025+.009*((signs[0]+1)*3+(signs[1]+1)*2+(signs[2]+1))% .044;
 function vertex(signs,axis) {
   const cut=inset(signs);
   return signs.map((sign,i)=>sign*(i===axis?.5:.5-cut));
 }
 function polygon(points) {
   const a=new T.Vector3(...points[0]),b=new T.Vector3(...points[1]),c=new T.Vector3(...points[2]);
   const normal=b.sub(a).cross(c.sub(a));
   if(normal.dot(a)<0)points.reverse();
   for(let i=1;i<points.length-1;i++)for(const p of [points[0],points[i],points[i+1]]){
     positions.push(...p);uv.push(p[0]+p[2],p[1]+p[2]);
     const light=.77+.23*(p[1]+.5);colors.push(light,light*.98,light);
   }
 }
 for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
   const others=[0,1,2].filter(i=>i!==axis);
   polygon([[-1,-1],[1,-1],[1,1],[-1,1]].map(pair=>{
     const signs=[0,0,0];signs[axis]=sign;others.forEach((v,i)=>signs[v]=pair[i]);
     return vertex(signs,axis);
   }));
 }
 for(let free=0;free<3;free++)for(const a of [-1,1])for(const b of [-1,1]){
   const axes=[0,1,2].filter(i=>i!==free),lo=[0,0,0],hi=[0,0,0];
   lo[axes[0]]=hi[axes[0]]=a;lo[axes[1]]=hi[axes[1]]=b;lo[free]=-1;hi[free]=1;
   polygon([vertex(lo,axes[0]),vertex(hi,axes[0]),vertex(hi,axes[1]),vertex(lo,axes[1])]);
 }
 for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])polygon([0,1,2].map(axis=>vertex([x,y,z],axis)));
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
 geometry.computeVertexNormals();return geometry;
}
geos.cutstone=chippedStoneGeometry();
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
finishes.cutstone=finishes.stone;
// Small contact shadows ground dense foliage even where a leaf is below a shadow texel.
const shadeCanvas=document.createElement('canvas');shadeCanvas.width=shadeCanvas.height=32;
const shadeContext=shadeCanvas.getContext('2d'),shadeGradient=shadeContext.createRadialGradient(16,16,2,16,16,16);
shadeGradient.addColorStop(0,'#30272f70');shadeGradient.addColorStop(.5,'#30272f33');shadeGradient.addColorStop(1,'#30272f00');
shadeContext.fillStyle=shadeGradient;shadeContext.fillRect(0,0,32,32);
geos.shade=new T.PlaneGeometry(1,1).rotateX(-Math.PI/2);
finishes.shade=new T.MeshBasicMaterial({map:new T.CanvasTexture(shadeCanvas),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
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
const height=z=>2.35*smooth((-z-8)/10)+5.75*smooth((-z-16)/15)
 +3.1*smooth((-z-44)/10)+3.6*smooth((-z-54)/10)+5.2*smooth((-z-65)/16);
const quarter=planNeighborhood(height);
// Folded, faceted leaves and small stepped whorls of flowers share two meshes.
function herbGeometry(flower,distant=false){
 const vertices=[],colors=[];
 function triangle(a,b,c){
   for(const p of [a,b,c]){vertices.push(...p.slice(0,3));colors.push(...p.slice(3))}
 }
 if(flower){
   const cube=new T.BoxGeometry(1,1,1).toNonIndexed(),points=cube.getAttribute('position'),normals=cube.getAttribute('normal');
   for(let level=0;level<(distant?3:5);level++)for(let side=0;side<(distant?1:2);side++){
     const angle=side*Math.PI+level*.72,r=distant?0:.043*(1-level*.13),size=(distant?.085:.063)-level*.004;
     for(let i=0;i<points.count;i++){
       const light=.72+level*.045+Math.max(0,normals.getY(i))*.10;
       vertices.push(Math.cos(angle)*r+points.getX(i)*size,level*(distant?.19:.11)+.13+points.getY(i)*.074,Math.sin(angle)*r+points.getZ(i)*size);
       colors.push(light,light*.94,light);
     }
   }
   cube.dispose();
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
geos.herb=herbGeometry(false);geos.spike=herbGeometry(true);geos.spikeFar=herbGeometry(true,true);
finishes.herb=finishes.spike=finishes.spikeFar=new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide});
// Leaves turned from the sun glow faintly, and brightly where the viewer looks into the light.
finishes.foliage=new T.MeshLambertMaterial({vertexColors:true});
finishes.foliage.onBeforeCompile=shader=>{
 shader.uniforms.sunView={value:sunView};
 shader.fragmentShader='uniform vec3 sunView;\n'+shader.fragmentShader.replace('#include <opaque_fragment>',`
  float back=max(-dot(normal,sunView),0.);
  float into=pow(max(dot(normalize(-vViewPosition),sunView),0.),3.);
  outgoingLight+=diffuseColor.rgb*vec3(1.,.80,.50)*(.16*back+.62*into*(.4+.6*back));
  #include <opaque_fragment>`);
};
finishes.foliage.customProgramCacheKey=()=>'foliage-transmission';
function bush(x,y,z,s,flowers=false){
 const m=transform.elements,wx=m[0]*x+m[8]*z+m[12],wz=m[2]*x+m[10]*z+m[14];
 const distant=Math.abs(wx)>19||wz< -36;
 // Nearby flowers form separate swathes. Empty cells and lower foliage leave soil visible.
 const swath=Math.sin(wx*.64+wz*.37)+Math.sin(wx*.29-wz*.51);
 const palette=swath<-.70?['#b54a84','#db76af','#e6a2bd']:swath>1.2?['#e5b44c','#f6d47a','#ecd196']:['#9762bc','#bc86d6','#d6a2e0'];
 const count=flowers?(distant?5:21):(distant?3:7);
 if(!distant&&s>.7)part('shade',x,y+.018,z,s*1.27,1,s*1.06,'#ffffff');
 for(let i=0;i<count;i++){
   const a=i*2.4+.65*rand(),r=Math.sqrt(i/count)*s*(.35+rand()*.15),px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;
   const h=s*(.22+rand()*.59),size=s*(.075+rand()*.10);
   box(px,y+.09*s,pz,size*1.6,.12*s,size*1.4,pick(['#415a37','#536e3c','#607847']),0,a*.12);
   box(px+.025,y+.20*s,pz,size,.14*s,size,pick(green),0,a*.10);
   if(i%3===0)part('herb',px,y,pz,s*.46,h*.85,s*.46,pick(green),0,a);
   if(flowers&&i%7!==0){
     const lean=(rand()-.5)*.23;
     timber(px,y+h*.40,pz,.018*s,h*.80,.018*s,'#6f7d41',0,0,lean);
     part(distant?'spikeFar':'spike',px-Math.sin(lean)*h*.40,y+h*.43,pz,s*.69,h*.90,s*.69,pick(palette),0,a,lean);
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
   for(let j=0;j<18;j++){
     const t=j/17,r=t*length,py=.42*Math.sin(t*Math.PI)-t*t*.92;
     box(0,py,r,.055,.068,length/16+.025,'#89944f');
     for(const side of [-1,1]){
       const width=.46*Math.sin((.05+t*.91)*Math.PI);
       for(let k=0;k<3;k++){
         if((i+j+k)%13===0)continue;
         const u=(k+.5)/3;
         part('foliage',side*width*u,py-.04-u*.11,r+u*.10,.105,.105,.115,pick(green),0,side*.13);
       }
     }
   }
 });
}
finishes.glow=new T.MeshBasicMaterial({color:0xffd697});
function lamp(x,y,z){
 box(x,y+.12,z,.31,.24,.31,'#574b40');box(x,y+1.1,z,.11,2.2,.11,'#50463b');
 box(x,y+2.22,z,.38,.085,.38,'#584838');part('glow',x,y+2.46,z,.27,.42,.27,'#ffffff');
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
   const rows=detailed?15:4,columns=Math.ceil(w/(detailed ? .25 : 1.2));
   const step=(w+.76)/columns;
   for(let row=0;row<rows;row++)for(let k=0;k<columns;k++){
     const z=(row+.5)*half/rows;
     const tileLength=length/rows+(detailed?.095:.045);
     rock(-w/2-.38+(k+.5)*step,ridge-Math.tan(slope)*z+.17,sign*z,step-.012,detailed?.085:.115,tileLength,
       pick(detailed?['#514d55','#625c65','#57515b','#6c6067']:[col,'#a15e46','#b37656']),sign*(slope+.055));
     if(detailed){
       const front=z+half/rows*.48;
       rock(-w/2-.38+(k+.5)*step,ridge-Math.tan(slope)*front+.178,sign*front,step-.017,.048,.075,'#766973',sign*slope);
     }
   }
 }
 box(0,ridge+.13,0,w+.79,.23,.29,col);
 if(detailed)for(let k=0;k<Math.ceil(w/.25);k++)rock(-w/2+k*.25,ridge+.22,0,.242,.13,.34,'#70606a');
}
function clayTileGeometry() {
 const profile=[[-.5,0],[-.30,.34],[0,.48],[.30,.34],[.5,0]],positions=[],uv=[];
 function quad(a,b,c,d) { for(const p of [a,b,d,b,c,d]){positions.push(...p);uv.push(p[0],p[2])} }
 for(let i=1;i<profile.length;i++){
   const [ax,ay]=profile[i-1],[bx,by]=profile[i];
   quad([ax,ay,-.5],[ax,ay,.5],[bx,by,.5],[bx,by,-.5]);
   quad([ax,ay-.16,.5],[ax,ay-.16,-.5],[bx,by-.16,-.5],[bx,by-.16,.5]);
   for(const z of [-.5,.5])quad([ax,ay,z],[bx,by,z],[bx,by-.16,z],[ax,ay-.16,z]);
 }
 for(const [x,y] of [profile[0],profile[4]])quad([x,y,-.5],[x,y,.5],[x,y-.16,.5],[x,y-.16,-.5]);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;
}
geos.tile=clayTileGeometry();finishes.tile=new T.MeshLambertMaterial({map:stoneGrain,side:T.DoubleSide});
function chair(x,z){round(x,.57,z,.66,.11,.66,'#f1e9d9');for(const i of [-1,1])for(const j of [-1,1])box(x+i*.22,.28,z+j*.21,.065,.55,.065,'#eee1ce');for(const i of [-1,1])box(x+i*.23,.86,z-.26,.055,.66,.065,'#eee1ce');box(x,1.14,z-.25,.51,.09,.09,'#eee1ce')}
const buildings=[];
function site(x,z,a,w,d,fn){buildings.push({x,z,a,w,d});local(x,height(z),z,a,fn)}
// One corner plot anchors the facade, its furniture and the walking destination.
const salon={x:7.35,z:1.35,angle:-.85};
function salonFront(build) { local(salon.x,0,salon.z,salon.angle,build) }
const salonDoor=[salon.x-2.63*Math.cos(salon.angle)+4.08*Math.sin(salon.angle),
 salon.z+2.63*Math.sin(salon.angle)+4.08*Math.cos(salon.angle)];
site(salon.x,salon.z,salon.angle,8,6,()=>{
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
const pisola={x:-10,z:-8,angle:.60};
site(pisola.x,pisola.z,pisola.angle,11,6,()=>{
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
function terrain(x,z){
 const verge=smooth((Math.abs(x)-32)/17);
 return height(z)+verge*(2.7+1.8*Math.sin(z*.094+x*.04))
   +smooth((-z-80)/22)*(3.8+3.2*Math.sin(x*.12)+2.4*Math.cos(x*.20));
}
// One continuous hillside keeps the grazing sunlight smooth between the terraces.
// Separate banks leave the riverbed open under the bridge.
function riverbank(north){
 const positions=[],uv=[],colors=[],indices=[];
 const cols=77,rows=north?77:30;
 for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){
   const x=(j-cols/2)*4.15,edge=north?bankZ(x):24+.65*Math.sin(x*.16);
   const z=edge+(north?-1:1)*i*2.1,y=north?terrain(x,z):0;
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
// The two stone colour draws per deck row are kept so every later random placement in the town stays put.
for(let j=0;j<32;j++){const z=9.25+j*.5;box(0,bridgeY(z)-.22,z,5,.44,.52,'#bcab92');pick(stone);pick(stone)}
// Three elliptical arches spring from cutwater piers just above the water. A ring of
// voussoirs on each face and a darker barrel soffit make the openings read from the banks.
const archCenters=[11.5,16.5,21.5],archHalf=2.08,springY=-1.92;
const archCrown=zc=>bridgeY(zc)-.66;
function intrados(z){
 for(const zc of archCenters){const u=(z-zc)/archHalf;if(Math.abs(u)<1)return springY+(archCrown(zc)-springY)*Math.sqrt(1-u*u)}
 return null;
}
const vary=i=>{const v=Math.sin(i*12.9898+4.1)*43758.5453;return v-Math.floor(v)};
const archStone=['#dcc6a8','#e6d2b3','#d2bb9c','#e9d7bb','#cdb497'];
for(const side of [-1,1]){
 for(let k=0;k<64;k++){
   const z0=9+k*.25,z=z0+.125,under=intrados(z),top=bridgeY(z)-.15,bottom=under===null?-2.36:under+.05;
   rock(side*2.36,(top+bottom)/2,z,.52,top-bottom,.26,'#c8b293');
 }
 for(const [a,zc] of archCenters.entries()){
   const b=archCrown(zc)-springY,blocks=19;
   for(let i=0;i<blocks;i++){
     const t0=Math.PI*i/blocks,t1=Math.PI*(i+1)/blocks,tm=(t0+t1)/2,key=i===9;
     const depth=key?.50:i%2?.34:.40;
     const iz=zc+archHalf*Math.cos(tm),iy=springY+b*Math.sin(tm);
     let nz=b*Math.cos(tm),ny=archHalf*Math.sin(tm);const nl=Math.hypot(nz,ny);nz/=nl;ny/=nl;
     const tz=-archHalf*Math.sin(tm),ty=b*Math.cos(tm),tl=Math.hypot(tz,ty);
     const chord=Math.hypot(archHalf*(Math.cos(t1)-Math.cos(t0)),b*(Math.sin(t1)-Math.sin(t0)));
     const tone=archStone[Math.floor(vary(a*40+i*2+side)*archStone.length)];
     part('cutstone',side*(2.39+(key?.03:0)),iy+ny*depth/2,iz+nz*depth/2,.58,depth,chord-.025,tone,Math.atan2(-ty/tl,tz/tl));
     if(side>0)part('cutstone',0,iy+ny*.13,iz+nz*.13,4.2,.2,chord+.02,'#8f7d69',Math.atan2(-ty/tl,tz/tl));
   }
 }
 // Pointed cutwaters on the two river piers, stepped back under a sloping cap.
 for(const zp of [14,19]){
   part('cutstone',side*2.62,-1.97,zp,.62,.86,.62,'#c3ab8d',0,Math.PI/4);
   part('cutstone',side*2.56,-1.47,zp,.48,.16,.48,'#d6c1a2',0,Math.PI/4);
 }
}
for(const z of [9,14,19,24.8])for(const x of [-2.34,2.34]){box(x,bridgeY(z)+.45,z,.67,.91,.68,'#cfb897');if(z===9||z===24.8)lamp(x,bridgeY(z)+.90,z)}
// Each cross-section joins both shop forecourts to the uphill lane.
// Interpolating the two edges also gives the paving and walking limits the same bends.
const sections=[
 [-35,-5.7,9.5],[-31,-3.8,4.8],[-25,.15,5.15],[-21,-1.6,3.35],[-19,-3.55,1.75],
 [-15,-5.25,-.55],[-10,-3.95,1.45],[-6,-9.8,3.3],[-3.2,-9.3,4.45],
 [.5,-1.85,2.8],[3.7,-3.4,7.8],[6,-3.65,6.9],[9,-2.14,2.14]
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
   const rise=.024+rand()*.016,pa=row(a,false,rise),pb=row(b,false,rise),pc=row(b,true,rise),pd=row(a,true,rise);
   pc[2]-=.010;pd[2]-=.010;
   const color=pick(['#d3bbad','#dfc7b9','#d7c2ae','#bfb1b2','#d5bdb4','#e0c9ad']);
   const rim=[pa,pb,pc,pd],center=pa.map((v,i)=>(v+pc[i])*.5);
   const top=rim.map(p=>[p[0]+(center[0]-p[0])*.078,p[1]+.006+rand()*.008,p[2]+(center[2]-p[2])*.10]);
   face(...top,color);
   for(let s=0;s<4;s++)face(rim[s],rim[(s+1)%4],top[(s+1)%4],top[s],color);
 }
}
// Mitered cross-sections give each alley a continuous paved corner. Lay the
// smaller cobbles into the same mesh as the main street, below the junction paving.
for(const path of [...quarter.lanes,...quarter.approaches]){
 const narrow=path.width<1.2,normals=path.segments.map(s=>{
   const len=Math.sqrt(s.length2);return [s.dz/len,-s.dx/len];
 });
 const sides=path.points.map(([x,z],i)=>{
   const a=normals[Math.max(0,i-1)],b=normals[Math.min(i,normals.length-1)];
   const s=path.width/(2*(1+a[0]*b[0]+a[1]*b[1]));
   return [(a[0]+b[0])*s,(a[1]+b[1])*s];
 });
 for(const [i,seg] of path.segments.entries()){
   const rows=Math.max(1,Math.ceil(Math.sqrt(seg.length2)/.29)),cols=narrow?3:5;
   const point=(t,u,lift)=>{
     const x=seg.x+t*seg.dx+(2*u-1)*(sides[i][0]*(1-t)+sides[i+1][0]*t);
     const z=seg.z+t*seg.dz+(2*u-1)*(sides[i][1]*(1-t)+sides[i+1][1]*t);
     return [x,height(z)+(narrow?.080:.058)+lift,z];
   };
   for(let row=0;row<rows;row++){
     const t0=row/rows,t1=(row+1)/rows;
     face(point(t0,0,0),point(t0,1,0),point(t1,1,0),point(t1,0,0),'#ad9b86');
     for(let k=0;k<cols+row%2;k++){
       const u=Math.max(0,(k-(row%2)*.5)/cols)+.003,v=Math.min(1,(k+1-(row%2)*.5)/cols)-.003;
       const end=t1-.026/rows;
       face(point(t0,u,.009),point(t0,v,.009),point(end,v,.009),point(end,u,.009),pick(stone));
     }
   }
 }
}
// From above, cultivated slopes frame the outermost lanes. Fit the field surfaces
// to the hillside and raise only their downhill edge behind a dry-stone wall.
for(const side of [-1,1])for(let tier=0;tier<8;tier++)for(let band=0;band<(side>0?4:2);band++){
 const cx=side*(43+band*15+2.4*Math.sin(tier*.73+band)),cz=3-tier*9.9-band*1.2;
 const angle=side*(.12+.13*Math.sin(tier*.9+band)),ca=Math.cos(angle),sa=Math.sin(angle);
 const w=10.7+2.8*Math.sin(tier*1.5+.52*band),d=6.7+1.4*Math.cos(tier*.71+band);
 function bed(u,v){
   const lx=w*(u-.5),lz=d*(v-.5),x=cx+lx*ca+lz*sa,z=cz-lx*sa+lz*ca;
   return [x,terrain(x,z)+.14+.48*v,z];
 }
 const patchColor=pick(['#9da673','#a1a06a','#939f68','#afa473','#a0a76d']);
 const toe=p=>[p[0],terrain(p[0],p[2])-.12,p[2]];
 for(let k=0;k<5;k++){
   const a=bed(k/5,0),b=bed((k+1)/5,0),c=bed((k+1)/5,1),e=bed(k/5,1);
   face(a,b,c,e,patchColor);
   face(toe(b),b,a,toe(a),'#af9b7f');
   if(k===0)face(toe(a),a,e,toe(e),'#af9b7f');
   if(k===4)face(toe(c),c,b,toe(b),'#af9b7f');
   const len=Math.hypot(c[0]-e[0],c[2]-e[2]);
   rock((c[0]+e[0])/2,(c[1]+e[1])/2-.39,(c[2]+e[2])/2,len+.01,.85,.28,'#c6b499',0,angle,Math.atan2(c[1]-e[1],len));
 }
 if((tier+band)%3===0){
   for(let j=0;j<6;j++){
     const [x,y,z]=bed(.15+(j%3)*.33,.22+Math.floor(j/3)*.52),h=1.65+rand()*.50;
     timber(x,y+h*.37,z,.17,h*.76,.17,'#95785b');
     for(let k=0;k<6;k++)leaf(x+.47*Math.cos(k),y+h*(.88+.12*Math.sin(k*2)),z+.46*Math.sin(k),1.31,.94,1.12,pick(['#899461','#929d64','#77875b']),0,k);
   }
 }else{
   for(let j=1;j<=3;j++)for(let k=0;k<9;k++){
     const [x,y,z]=bed(.09+k*.10,j*.24);
     box(x,y+.30,z,w*.09,.52+rand()*.24,.50,pick(['#8b985b','#a0a65c','#919b61']),0,angle);
     if(k%4===0)timber(x,y+.40,z,.07,.83,.08,'#9c8761');
   }
 }
 if(band===0&&tier%2===1){const [x,y,z]=bed(.10,.93);cypress(x,y,z,3+rand()*2)}
}
const stonework=new T.BufferGeometry();
stonework.setAttribute('position',new T.Float32BufferAttribute(strips,3));
stonework.setAttribute('color',new T.Float32BufferAttribute(stripColors,3));
stonework.setAttribute('uv',new T.Float32BufferAttribute(stripUV,2));
stonework.computeVertexNormals();
stoneGrain.wrapS=stoneGrain.wrapT=T.RepeatWrapping;
const lane=new T.Mesh(stonework,finishes.stone);
lane.castShadow=lane.receiveShadow=true;scene.add(lane);
function masonry(x,y,z,w,h,depth,along=0){
 local(x,y,z,along,()=>{
   const m=transform.elements,near=Math.abs(m[12])<19&&m[14]>-26&&m[14]<28;
   box(0,h/2,0,w-.015,h,depth-.07,'#857462');
   const rows=Math.max(2,Math.round(h/(near?.155:.20))),n=Math.max(2,Math.ceil(w/(near?.31:.45)));
   for(let row=0;row<rows;row++){
     let start=0;
     for(let i=1;start<n;i++){
       const end=i>=n+row%2?n:i-(row%2)*.5+(rand()-.5)*.48;
       const px=((start+end)/2/n-.5)*w,py=(row+.50)*h/rows;
       part(near?'cutstone':'stone',px,py,(rand()-.5)*.034,(end-start)*w/n-.022,h/rows-.019,depth+.018+rand()*.070,pick(stone),(rand()-.5)*.022,(rand()-.5)*.038,(rand()-.5)*.018);
       start=end;
     }
   }
   for(let k=0;k<n;k++)part(near?'cutstone':'stone',(k+.5)*w/n-w/2,h+.045,0,w/n-.014,.10+rand()*.025,depth+.14,pick(stone),0,(rand()-.5)*.023);
 });
}
// Raised beds follow the switchback; the wall joints step up the hill.
for(const side of [-1,1])for(let j=0;j<30;j++){
 const za=-8.3-j*.72,zb=za-.72,z=(za+zb)/2;
 const edge=t=>edges(t)[side<0?0:1]+side*.33;
 const a=edge(za),b=edge(zb),x=(a+b)/2;
 if(quarter.occupied(x,z,.85)||quarter.onPath(x+side*1.02,z,-.75))continue;
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
for(let j=0;j<55;j++){
 const x=(j%2?-1:1)*(12+rand()*25),z=6-rand()*52;
 if(!quarter.occupied(x,z,1.2)&&buildings.every(b=>Math.hypot(x-b.x,z-b.z)>8))
   cypress(x,height(z),z,2.8+rand()*3.8);
}
for(let j=0;j<65;j++){
 const x=(rand()-.5)*83,z=j%2?8.4:24.9;
 if(Math.abs(x)>3&&!inQuayGarden(x,z)&&!quarter.occupied(x,z,.8))bush(x,0,z,.8+rand()*.8,true);
}
for(let j=0;j<60;j++){
 const x=(j-30)*4.1;
 const ridge=27+10*Math.sin(x*.081)+6*Math.cos(x*.21);
 leaf(x,14,-110,25,ridge+rand()*9,25,pick(['#9794ad','#a99cb0','#b29ca4']),0,rand()*4);
}
for(let z of [1,-15,-31]){const x=edges(z)[0]-.75;if(!quarter.onPath(x,z,-.4))lamp(x,height(z),z)}
// Recessed panes, warm interior fittings and planted edges give close approaches a readable scale.
local(2,height(-37),-37,.035,()=>{
 for(let i=0;i<13;i++){const x=-8+i*1.31;box(x,1.42,3.65,1.17,2.01,.035,pick(['#596f70','#617778','#78837b']));box(x,2.10,3.68,.86,.05,.04,'#dec598');box(x-.33,1.11,3.689,.06,1.15,.03,'#667169');}
 for(let i=0;i<14;i++){const x=-5.66+i;box(x,4.57,3.61,.88,.75,.04,pick(['#71858a','#829394','#5f7379']));box(x,4.89,3.65,.92,.035,.03,'#ced5c8')}
 for(const x of [-.48,.48]){box(x,1.24,3.76,.91,2.25,.08,'#687c7c');box(x,1.20,3.82,.06,.36,.04,'#ded4b8')}
 label('GAME GALLERY',0,2.63,4.70,3.10,.36,'#465251','#ffedc8');
});
salonFront(()=>{for(const x of [.1,2.63]){for(const side of [-1,1])box(x+side*.86,1.45,3.27,.055,2.1,.08,'#4d453b');box(x,1.75,3.28,1.94,.07,.09,'#544537');box(x-.56,1.32,3.29,.42,.72,.02,'#8a9184');box(x+.4,2.19,3.28,.18,.11,.05,'#ffd888')}
 for(const z of [-1.65,1.2])local(-4,0,z,-Math.PI/2,()=>windowBay(0,4.55,0,1.45,1.32));for(let i=0;i<15;i++)box(-4.02,i*.4+.14,0,.04,.023,6,'#935344');
 for(const x of [-3.68,-1.67]){round(x,.26,4.14,.45,.52,.45,'#b77452');bush(x,.52,4.14,.68,true)}
 box(-2.62,1.23,3.29,.84,1.65,.035,'#ae8156');box(-2.62,1.57,3.32,.53,.79,.03,'#81948d');box(-2.12,1.03,3.33,.07,.16,.08,'#dfc791');
});
local(-10,0,-8,.60,()=>{for(const x of [-4.35,-2.45,.1,2.3,4.35]){box(x,1.55,3.34,.052,1.95,.07,'#594c38');box(x,1.89,3.33,1.6,.06,.06,'#574a38');box(x-.32,1.10,3.31,.54,.52,.03,'#a79e7a');box(x+.37,2.27,3.34,.17,.1,.03,'#ffcc79')}
 label('PIZZA · PASTA · RISOTTO',0,3.86,3.643,3.6,.30,null,'#ffe1ae');for(const x of [-4.3,3.6]){rock(x,.2,4.0,2.7,.40,.66,'#c7b295');for(let k=0;k<5;k++)bush(x-1.03+k*.51,.41,4,.56,true)}
});
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
   if(!inQuayGarden(x,bankZ(x)-.25)&&!quarter.occupied(x,bankZ(x)-.25,.7))bush(x,.06,bankZ(x)-.25,.92+rand()*.55,k%3!==0);
 }
 for(let k=0;k<15;k++){
   const z=7.7-k*.74,edge=edges(z)[side<0?0:1],px=edge+side*.55;
   if((side>0&&z<6.4)||(side<0&&z<-.4)||quarter.occupied(px,z,.92))continue;
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
salonFront(()=>{
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
// The high edge follows the quay footpath. Each lower bed reaches farther
// towards the river, so all three flowering edges are visible from the bridge.
function quayBedEdge(x,t) {
 const pathEdge=6.98+(x+4.15)*.24;
 return pathEdge*(1-t)+(bankZ(x)-.13)*t;
}
function inQuayGarden(x,z) {
 return x>=-11.85 && x<=-4.15 && z>=quayBedEdge(x,0)-.18 && z<=bankZ(x)+.15;
}
for(const [tier,top] of [.89,.58,.29].entries()){
 const t0=tier/3,t1=(tier+1)/3;
 const ends=[-11.85,-9.95,-8,-6.05,-4.15];
 for(let i=1;i<ends.length;i++){
   const left=ends[i-1],right=ends[i],x=(left+right)/2;
   const back=quayBedEdge(x,t0),front=quayBedEdge(x,t1);
   const dz=quayBedEdge(right,t1)-quayBedEdge(left,t1),angle=-Math.atan2(dz,right-left);
   const width=Math.hypot(right-left,dz),depth=(front-back)*Math.cos(angle);
   local(x,0,(front+back)/2,angle,()=>{
     rock(0,top/2-.04,0,width+.05,top+.08,depth,'#b4a383');
     box(0,top-.022,0,width+.04,.06,depth,'#87915a');
     masonry(0,-.08,depth/2,width,top+.08,.18);
     for(const side of [-1,1])if(side<0?i===1:i===ends.length-1)
       masonry(side*width/2,-.08,0,depth,top+.08,.18,Math.PI/2);
     for(let k=0;k<5;k++){
       const lx=width*((k+.5)/5-.5),lz=(k%2-.5)*depth*.51;
       bush(lx,top,lz,.84+.22*Math.cos(i+k),k%4!==tier);
     }
     if((tier+i)%3===0)floweringVine(width*.18,top+.10,depth/2+.13,.46,.49);
   });
 }
}
palm(-12.5,0,6.05,4.8);

// Timber joinery, hanging lamps and painted boards sit in front of recessed glazing.
local(-10,0,-8,.60,()=>{
 for(let i=0;i<25;i++){
   const x=-5.45+i*.45;
   timber(x,3.39,3.30,.092,.14,.80,'#98683d');
   if(i%3===0){box(x,3.25,3.41,.12,.09,.12,'#604734');part('glow',x,3.19,3.41,.078,.054,.078,'#ffffff')}
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
       box(px+dx,py+dy,pz+.06,.10+rand()*.09,.12,.13,pick(['#4f693c','#6e853e','#9aa34d']),0,(rand()-.5)*.2);
       if((k+strand+j)%3)box(px+dx,py+dy+.045,pz+.12,.07,.075,.07,pick(['#c34886','#e783af','#b4458c']),0,.10);
     }
   }
 }
}
salonFront(()=>{
 // Coping and roof seams are also visible from the high camera.
 for(const side of [-1,1]){
   rock(side*3.93,6.83,0,.18,.25,6.11,'#aa6853');rock(0,6.83,side*2.94,7.80,.25,.17,'#af725e');
 }
 for(let i=0;i<13;i++)box(-3.66+i*.61,6.806,0,.035,.035,5.76,'#94756a');
 for(const x of [-2.74,0,2.83]){
   box(x,6.67,3.35,.05,.05,.51,'#5c5654');box(x,6.62,3.58,.22,.10,.14,'#504749',.32);
 }
 timber(-2.59,2.79,3.98,2.26,.16,.15,'#7e4e37');
 for(let row=0;row<4;row++)for(let i=0;i<12;i++){
   const z=3.13+row*.23,y=3.12-row*.068,x=-3.58+i*.18;
   part('tile',x,y,z,.195,.17,.34,pick(['#ca7c51','#d89160','#b96d49','#e0a070']),.28);
   if(row===3)rock(x,y-.021,z+.14,.18,.027,.045,'#ad6847',.28);
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
// The pendant row under PISOLA's eaves spills onto the timber front and its forecourt.
const porch=new T.PointLight(0xffb066,7,13,2);
porch.position.set(-.65,3.1,6.3).applyAxisAngle(new T.Vector3(0,1,0),.60).add(new T.Vector3(-10,0,-8));scene.add(porch);
salonFront(()=>rock(0,.004,.68,8.86,.14,7.76,'#ceba9f'));
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
     const radius=h*.19,cell=h>5?.23:.16;
     const count=h>5?210:80;
     for(let k=0;k<count;k++){
       const u=k*2.4,r=radius*Math.sqrt(rand()),dx=r*Math.cos(u),dz=r*Math.sin(u);
       if(Math.sin(u*3+j)>.80&&r>radius*.36)continue;
       const py=tip[1]+Math.sqrt(Math.max(0,radius*radius-r*r))*.60+(rand()-.5)*radius*.48;
       const px=tip[0]+dx,pz=tip[2]+dz,size=cell*(.65+rand()*.75);
       const tone=py<tip[1]?pick(['#4a6238','#5c713c']):pick(['#6a8341','#83974a','#9ca95a','#b3b463']);
       part('foliage',px,py,pz,size,size*(.78+rand()*.35),size,tone,0,(rand()-.5)*.16);
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
 if(quarter.occupied(x,z,3.0))continue;
 const y=height(z);
 masonry(x,y-.08,z+2.0,5.7,.52,.36);
 rock(x,y+.14,z,5.5,.38,4,'#b7a884');
 olive(x,y+.32,z,3.6+rand());
 for(let k=0;k<10;k++)bush(x-2.5+k*.54,y+.34,z+1.64,.72,k%3!==1);
}
for(let k=0;k<12;k++){
 const z=-11-k*1.42,side=k%2?1:-1,x=edges(z)[side>0?1:0]+side*3.9;
 if((z>-18&&side<0)||quarter.occupied(x,z,2.2))continue;
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
   if(quarter.occupied(x,z,1.20))continue;
   const y=height(z),bed=.28+band*.16;
   rock(x,y+bed*.50-.12,z,1.32,bed+.17,1.80,'#b6a384');
   for(const dz of [-.45,.45])bush(x+(rand()-.5)*.46,y+bed-.018,z+dz,.96+rand()*.21,true);
 }
}

buildResidences(quarter,{local,box,rock,timber,round,houseRoof,masonry,bush,cypress,height,pick,floweringVine,road,bankZ,buildings});
plantNeighborhood(quarter,{local,box,rock,timber,leaf,masonry,bush,cypress,height,terrain,road,bankZ,inQuayGarden,buildings,rand,pick});
buildings.push(...quarter.homes);
for(const [key,items] of Object.entries(batches)){
 const shape=key.split('@')[0],mesh=new T.InstancedMesh(geos[shape]||geos.box,finishes[shape]||mat,items.length);
 items.forEach(([m,c],i)=>{mesh.setMatrixAt(i,m);mesh.setColorAt(i,new T.Color(c))});
 mesh.castShadow=mesh.receiveShadow=shape!=='shade';scene.add(mesh);
}
renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
function canWalk(x,z){
 const main=z<=30&&z>=-33.15&&road(x,z,.24);
 if(!main&&!quarter.onPath(x,z,.24))return false;
 return !buildings.some(b=>{
   const dx=x-b.x,dz=z-b.z,c=Math.cos(b.a),s=Math.sin(b.a);
   return Math.abs(dx*c-dz*s)<b.w/2+.24&&Math.abs(dx*s+dz*c)<b.d/2+.24;
 });
}
// What the bridge vista must keep in frame: all of PISOLA (eave ends, gable sign, teal pillars,
// palm crowns) and SISTER's front (cornice, sign, awnings, chairs). Its far side may be cropped.
const onSite=({x,z,angle},points)=>points.map(([px,py,pz])=>
 new T.Vector3(px,py,pz).applyMatrix4(new T.Matrix4().makeRotationY(angle).setPosition(x,height(z),z)));
const vistaKeep=[
 ...onSite(pisola,[[-5.89,3.49,3.38],[5.89,3.49,3.38],[-5.89,3.29,3.38],[5.89,3.29,3.38],[-5.89,3.39,-3.38],[5.89,3.39,-3.38],
  [-5.89,4.97,0],[5.89,4.97,0],[0,5.29,3.47],[-5.54,3.5,3.68],[-5.54,0,3.68],[5.54,3.5,3.68],[5.54,0,3.68],[-6.02,5.85,2.7],[6.18,4.95,1.4]]),
 ...onSite(salon,[[-4.12,6.8,3.12],[4.12,6.8,3.12],[-4.12,0,3.12],[4.12,0,3.12],[-1.05,2.69,4.07],[3.78,2.69,4.07],[.45,0,4.4],[2.16,0,4.4]])
];
return {renderer,scene,camera,buildings,height,bridgeY,road,quarter,canWalk,salonDoor,vistaKeep};
})();
