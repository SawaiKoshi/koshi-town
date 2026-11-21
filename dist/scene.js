"use strict";
const INK="#554f40";
function shade(hex, factor) {
  const c=parseInt(hex.slice(1),16);
  return "rgb("+[c>>16,(c>>8)&255,c&255].map(v=>Math.min(255,Math.round(v*factor))).join(",")+")";
}
function rng(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function iso(x,y,z=0){return [x-y,(x+y)*.47-z*1.13];}
class Pen {
  constructor(ctx){this.c=ctx;}
  shape(pts,fill,stroke=INK,width=.029){
    const c=this.c;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();
    if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
  }
  poly(pts,fill,stroke=INK,width=.029){this.shape(pts.map(v=>iso(...v)),fill,stroke,width);}
  line(pts,color=INK,width=.028){const c=this.c;c.beginPath();pts.forEach((v,i)=>i?c.lineTo(...iso(...v)):c.moveTo(...iso(...v)));c.lineWidth=width;c.strokeStyle=color;c.stroke();}
  tile(x,y,w,d,col,z=0,stroke=null){this.poly([[x,y,z],[x+w,y,z],[x+w,y+d,z],[x,y+d,z]],col,stroke);}
  box(x,y,z,w,d,h,color,top=color){
    this.poly([[x,y+d,z],[x+w,y+d,z],[x+w,y+d,z+h],[x,y+d,z+h]],shade(color,.95));
    this.poly([[x+w,y,z],[x+w,y+d,z],[x+w,y+d,z+h],[x+w,y,z+h]],shade(color,.80));
    this.tile(x,y,w,d,top,z+h,INK);
  }
  ellipse(x,y,z,rx,ry,col,stroke=null){const c=this.c,p=iso(x,y,z);c.beginPath();c.ellipse(...p,rx,ry,0,0,Math.PI*2);c.fillStyle=col;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=.026;c.stroke();}}
  front(x,y,z,w,h,fill,stroke=INK){this.poly([[x,y,z],[x+w,y,z],[x+w,y,z+h],[x,y,z+h]],fill,stroke);}
  side(x,y,z,w,h,fill){this.poly([[x,y,z],[x,y+w,z],[x,y+w,z+h],[x,y,z+h]],fill);}
  label(x,y,z,txt,size,color){const c=this.c,p=iso(x,y,z);c.save();c.translate(...p);c.transform(1,.47,0,1,0,0);c.textAlign="center";c.textBaseline="middle";c.font="bold "+size+"px Georgia, serif";c.fillStyle=color;c.fillText(txt,0,0);c.restore();}
}
function pane(p,x,y,z,w,h,side=false) {
  const f=(x,y,z,w,h,c)=>side?p.side(x,y,z,w,h,c):p.front(x,y,z,w,h,c);
  f(x,y,z,w,h,"#e5d6b5");
  const dx=side?0:.065,dy=side?.065:0;
  f(x+dx,y+dy,z+.065,w-.13,h-.13,"#507574");
  const mid=w*.51;
  p.line([[x+(side?0:mid),y+(side?mid:0),z+.05],[x+(side?0:mid),y+(side?mid:0),z+h-.05]],"#e7ddbc",.046);
  p.line([[x,y,z+h*.63],[x+(side?0:w),y+(side?w:0),z+h*.63]],"#e7ddbc",.044);
}
function planter(p,x,y,z=0,len=.57) {
  p.box(x,y,z,len,.24,.22,"#ab7559","#785f48");
  const rand=rng(Math.round((x+y+z)*93));
  for(let i=0;i<7;i++){const xx=x+.04+rand()*(len-.08), yy=y+rand()*.19;
    p.ellipse(xx,yy,z+.27+rand()*.12,.10,.105,["#899563","#687b50","#a8ac68"][i%3],INK);
  }
}
function roof(p,x,y,w,d,z,h,color){
  const o=.15,front=y+d+o,back=y-o,left=x-o,right=x+w+o,mid=x+w/2;
  p.poly([[left,front,z],[right,front,z],[mid,front,z+h]],"#e3ceaa");
  p.poly([[left,back,z],[mid,back,z+h],[mid,front,z+h],[left,front,z]],shade(color,1.1));
  p.poly([[mid,back,z+h],[right,back,z],[right,front,z],[mid,front,z+h]],color);
  for(let i=1;i<9;i++){
    let u=i/9;
    p.line([[mid+(right-mid)*u,back,z+h*(1-u)],[mid+(right-mid)*u,front,z+h*(1-u)]],shade(color,.79),.019);
    p.line([[mid+(left-mid)*u,back,z+h*(1-u)],[mid+(left-mid)*u,front,z+h*(1-u)]],shade(color,.9),.018);
  }
  for(let i=0;i<12;i++){let yy=back+(front-back)*i/12;
    p.line([[mid,yy,z+h],[right,yy,z]],shade(color,.87),.014);}
  p.line([[mid,back-.02,z+h+.035],[mid,front+.02,z+h+.035]],shade(color,.71),.084);
}
function canopy(p,x,y,z,w,d,col,stripes){
  for(let i=0;i<stripes;i++){const xx=x+w*i/stripes,sw=w/stripes,fill=i%2?"#fff0cb":col;
    p.poly([[xx,y,z+.16],[xx+sw,y,z+.16],[xx+sw,y+d,z],[xx,y+d,z]],fill,INK,.019);
    p.front(xx,y+d,z-.13,sw,.13,fill);}
}
function building(p,b) {
  const [x,y,w,d]=b.lot, fy=y+d,rx=x+w, type=b.form;
  const body=b.wall||({diner:"#e8c395",studio:"#d3d6c3",salon:"#dfd4ad"})[type];
  const h=type==="diner"?2.02:type==="studio"?2.55:type==="salon"?1.94:b.height;
  p.tile(x+.14,y+.17,w+.12,d+.12,"#b4b29a",.015);
  p.box(x-.13,y-.13,.025,w+.26,d+.27,.13,"#b6a68a","#eadfc7");
  p.box(x,y,.15,w,d,h,body);const e=h+.15;
  // Timber siding and stone foundation on both visible faces.
  p.front(x,fy+.007,.16,w,.23,"#baa383");p.side(rx+.008,y,.16,d,.23,"#b29f87");
  for(let z=.5;z<e;z+=.21){p.line([[x,fy+.008,z],[rx,fy+.008,z]],shade(body,.84),.017);p.line([[rx+.008,y,z],[rx+.008,fy,z]],shade(body,.72),.016);}
  if(type==="house"){
    pane(p,x+.21,fy+.03,.7,.54,.6);
    p.front(x+w*.58,fy+.04,.17,.4,.88,"#846845");
    pane(p,rx+.02,y+.25,.64,.68,.68,true);
    roof(p,x,y,w,d,e,.67,b.roof);p.box(x+.24,y+.35,e+.18,.25,.27,.62,"#ab8568");return;
  }
  for(let i=0;i<2;i++)pane(p,rx+.025,y+.25+i*d*.46,.67,.77,.94,true);
  for(const dx of [.03,w-.11])p.front(x+dx,fy+.018,.2,.08,h-.04,"#8f7856");
  const doorX=x+w*.5-.3;
  pane(p,x+.2,fy+.03,.63,w*.27,.89);pane(p,x+w*.67,fy+.03,.63,w*.26,.89);
  p.front(doorX,fy+.035,.16,.61,1.21,"#6b5f48");p.front(doorX+.07,fy+.041,.33,.47,.89,"#557371");
  p.line([[doorX+.46,fy+.05,.62],[doorX+.46,fy+.05,.82]],"#f2d38b",.045);
  p.box(doorX-.13,fy+.065,.035,.85,.23,.09,"#bba583");
  if(type==="diner"){
    p.front(x+.14,fy+.05,1.68,w-.28,.38,"#804335");
    p.label(x+w*.5,fy+.055,1.87,"OMACHI",.28,"#fff1cd");
    canopy(p,x+.03,fy+.055,1.52,w-.06,.43,"#be563e",11);
    roof(p,x,y,w,d,e,.92,"#c57650");
    p.box(x+.45,y+.52,e+.19,.37,.38,.97,"#b98166");
    p.box(x+.40,y+.47,e+1.10,.47,.48,.12,"#796956");
    for(const dx of [.20,w-.22]){p.line([[x+dx,fy+.39,1.47],[x+dx,fy+.39,1.25]],INK);p.ellipse(x+dx,fy+.39,1.10,.13,.19,"#dc895b",INK);}
    planter(p,x+.15,fy+.15,.13,.59);
  }else if(type==="studio"){
    p.front(x+.13,fy+.03,1.55,w-.26,.46,"#44656b");p.label(x+w*.5,fy+.05,1.78,"BUSH DUSH",.265,"#f3e9ca");
    for(let i=0;i<4;i++)pane(p,x+.19+i*(w-.38)/4,fy+.035,2.09,.54,.38);
    roof(p,x,y,w,d,e,.93,"#66848a");
    // A sunlit rooftop skylight following the roof plane.
    const sx=x+w*.54,tx=x+w*.83,zy=t=>e+.93*(1-(t-x-w*.5)/(w*.5+.15))+.04;
    p.poly([[sx,y+.32,zy(sx)],[tx,y+.32,zy(tx)],[tx,y+1.45,zy(tx)],[sx,y+1.45,zy(sx)]],"#9cbdba");
    for(let i=1;i<=3;i++)p.line([[sx,y+.32+i*.28,zy(sx)],[tx,y+.32+i*.28,zy(tx)]],"#546f71",.045);
    p.box(rx-.34,y+.21,e+.3,.23,.28,.82,"#928875");
    canopy(p,doorX-.13,fy+.04,1.43,.87,.28,"#5d797c",1);
    p.box(x+.18,fy+.14,.14,.47,.31,.32,"#be9864");
  }else{
    p.box(x-.13,y-.13,e,w+.26,d+.26,.18,"#829078","#91a489");
    p.box(x+.09,y+.09,e+.18,w-.18,d-.18,.08,"#cbbd9e","#cabea4");
    p.box(x+.32,y+.32,e+.26,1.03,.63,.47,"#c1c2a9");p.box(x+.25,y+.25,e+.72,1.17,.77,.08,"#88998b");
    p.front(x+.16,fy+.04,1.60,w-.32,.39,"#4b674f");p.label(x+w*.5,fy+.06,1.79,"SISTER",.285,"#fff0d1");
    canopy(p,x+.02,fy+.055,1.51,w-.04,.42,"#798a64",9);
    p.box(rx-.12,fy+.17,.67,.14,.13,.77,"#eee7cc");
    for(let k=0;k<4;k++)p.front(rx-.115,fy+.309,.72+k*.16,.13,.074,k%2?"#678389":"#ad5541");
    planter(p,x+.14,fy+.17,.13,.58);planter(p,rx-.85,fy+.17,.13,.62);
  }
}
function tree(p,x,y,size,seed,kind="round"){
  const r=rng(seed),s=size, c=p.c;
  p.ellipse(x+.15*s,y+.06*s,.02,.59*s,.225*s,"#b2b299");
  p.box(x-.055*s,y-.055*s,.03,.11*s,.11*s,.89*s,"#826c4d");
  p.line([[x,y,.62*s],[x-.18*s,y,.94*s]],"#796b4e",.065*s);
  const colors=kind==="flower"?["#b88477","#d5a38f","#dfb7a2","#edccb4"]:kind==="gold"?["#ac924f","#c5ad60","#d1bd70","#dccb88"]:["#647c56","#81965f","#99a66b","#afba80"];
  const centers=[[.22,.01,1.08,.52],[-.25,-.09,1.20,.51],[.14,-.21,1.43,.47],[-.02,.20,1.25,.57],[-.18,-.01,1.59,.43]];
  for(let k=0;k<centers.length;k++){
    let [dx,dy,z,rad]=centers[k],cp=iso(x+dx*s,y+dy*s,z*s),rr=rad*s,pts=[];
    for(let i=0;i<17;i++){let a=i*Math.PI*2/17,m=.9+.13*r();pts.push([cp[0]+Math.cos(a)*rr*m,cp[1]+Math.sin(a)*rr*m*.9]);}
    p.shape(pts,colors[k===4?2:k%3],"#657453",.025);
    for(let i=0;i<11;i++){let a=r()*6.28,rr2=r()*rr*.82;const xx=cp[0]+Math.cos(a)*rr2,yy=cp[1]+Math.sin(a)*rr2*.75;c.beginPath();c.ellipse(xx,yy,.040*s,.015*s,-.34,0,Math.PI*2);c.fillStyle=colors[(i+k+1)%4];c.fill();}
  }
}
function bench(p,x,y,z=0){
  for(const a of [.13,.84])p.box(x+a,y+.13,z,.085,.20,.32,"#655f49");
  for(let i=0;i<3;i++)p.box(x,y+i*.10,z+.32,1.04,.075,.055,"#b08a59");
  for(let i=0;i<2;i++)p.box(x,y-.02,z+.52+i*.13,1.04,.09,.095,"#bd9865");
  for(const a of [.1,.88])p.line([[x+a,y,z+.25],[x+a,y,z+.71]],"#615f4d",.047);
}
function lamp(p,x,y){p.ellipse(x,y,0,.15,.065,"#aaa58c");p.box(x-.055,y-.055,.04,.11,.11,.13,"#686f5d");p.line([[x,y,.12],[x,y,1.55]],"#546453",.066);p.box(x-.095,y-.095,1.43,.19,.19,.25,"#f5d997");p.box(x-.13,y-.13,1.68,.26,.26,.07,"#576357");}
function bridge(p,x,end){
  const y0=8.72,y1=10.87,w=end-x;
  p.box(x,y0,-.16,w,y1-y0,.23,"#9e8465","#bea77e");
  for(let i=0;i<15;i++)p.line([[x,y0+i*.143,.075],[end,y0+i*.143,.075]],"#98846b",.025);
  for(const xx of [x,end]){
    for(let i=0;i<5;i++)p.box(xx-.041,y0+i*(y1-y0)/4-.041,.07,.082,.082,.4,"#7d6952");
    p.line([[xx,y0,.46],[xx,y1,.46]],"#80694c",.072);p.line([[xx,y0,.29],[xx,y1,.29]],"#9b805d",.037);}
}
function boat(p,x,y,col){const coords=[[-.6,0],[-.35,-.19],[.39,-.16],[.61,0],[.39,.16],[-.35,.19]];p.poly(coords.map(([a,b])=>[x+a,y+b,-.24]),col);p.poly(coords.map(([a,b])=>[x+a*.78,y+b*.63,-.23]),"#645d48");for(let a of [-.25,.15])p.line([[x+a,y-.12,-.21],[x+a,y+.12,-.21]],"#e8d0a0",.06);}
function avatar(p,x,y,phase,moving,bodyScale=1) {
  const [u,v]=iso(x,y,.06),c=p.c;
  p.ellipse(x,y,.075,.26,.105,"rgba(49,60,47,.27)");
  const step=moving?Math.sin(phase)*.045:0;
  c.save();c.translate(u,v);c.scale(bodyScale,bodyScale);
  const pill=(xx,yy,rx,ry,color)=>{c.beginPath();c.ellipse(xx,yy,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();c.lineWidth=.028;c.strokeStyle="#343f35";c.stroke();};
  pill(-.068,-.085+step,.064,.088,"#3d4e52");pill(.074,-.085-step,.064,.088,"#3d4e52");
  pill(0,-.25,.139,.17,"#d87744");pill(-.115,-.24-step,.046,.086,"#e8ab74");pill(.124,-.24+step,.045,.086,"#e8ab74");
  pill(.008,-.49,.121,.133,"#ecc298");pill(-.016,-.586,.143,.084,"#365c56");pill(.073,-.559,.111,.028,"#365c56");c.restore();
}
function ground(p){
  const r=rng(49),n=15;
  p.box(0,0,-.67,n,n,.47,"#bc9b76","#c8b89a");
  for(const [y,d] of [[0,CANAL[0]],[CANAL[1],n-CANAL[1]]])p.box(0,y,-.22,n,d,.23,"#c1a984","#c5c4a5");
  p.tile(0,CANAL[0],15,2,"#78b6af",-.18);
  for(let i=0;i<160;i++){const x=r()*14.5,y=8.87+r()*1.81,len=.07+r()*.39;p.line([[x,y,-.176],[x+len,y,-.176]],i%3?"#9bcac0":"#d0ded0",.016+r()*.016);}
  for(const y of [8.71,10.8]){p.box(0,y,-.28,15,.09,.34,"#a59b81","#dfd0af");}
  p.tile(.16,2.60,14.65,.75,"#ddd2b8",.025);p.tile(.16,6.95,14.67,1.74,"#e7d6b3",.025);
  p.tile(5.06,.13,1.05,8.55,"#dfcfad",.027);p.tile(9.34,.13,.68,8.54,"#ddd0b0",.026);
  p.tile(.08,10.91,14.84,1.06,"#e6d6b4",.03);p.tile(4.95,11.94,1.1,2.95,"#dfd1af",.03);p.tile(11.79,11.94,1.03,2.94,"#e2d3b3",.03);
  for(let y=7.04;y<8.69;y+=.245){let k=Math.round(y*4);p.line([[0,y,.035],[15,y,.035]],"#c8b99e",.014);for(let x=(k%2)*.32;x<15;x+=.65)p.line([[x,y,.035],[x,y+.18,.035]],"#c5b79c",.012);}
  for(let i=0;i<420;i++){let x=r()*14.9,y=r()*14.85;if(y>8.69&&y<10.91)continue;
    p.line([[x,y,.039],[x+.04+r()*.10,y,.039]],y>12?"#a4a687":"#c3b698",.019);}
  // Low stone courses along the visible edge of the diorama.
  for(let i=0;i<30;i++){let a=i*.5;p.line([[a,n,-.62],[a,n,-.35]],"#aa8f70",.014);p.line([[n,a,-.62],[n,a,-.35]],"#a18668",.014);}
  boat(p,3.05,9.5,"#ab7455");boat(p,9.4,10.22,"#d1b476");
}
function parasol(p,x,y){
  p.ellipse(x,y,.03,.68,.25,"#adae8c");p.line([[x,y,.03],[x,y,1.55]],"#876e4a",.065);
  let s=iso(x,y,1.42),top=[s[0],s[1]-.25],pts=Array.from({length:8},(_,i)=>[s[0]+.66*Math.cos(i*.7854),s[1]+.26*Math.sin(i*.7854)]);
  for(let i=0;i<8;i++)p.shape([top,pts[i],pts[(i+1)%8]],i%2?"#e8c98f":"#d99a63",INK,.026);
}
function kiosk(p,x,y){p.box(x,y,.06,.38,.38,.76,"#b65943");p.box(x-.045,y-.045,.84,.47,.47,.11,"#a74734");p.front(x+.07,y+.39,.59,.24,.065,"#564b3e");}
function townObjects(){
  const out=[],add=(depth,draw,lot,buildingData)=>out.push({depth,draw,lot,buildingData});
  for(const b of [...HOUSES,...PROJECTS]){let [x,y,w,d]=b.lot;add(x+y+w+d-.20,p=>building(p,b),b.lot,b);}
  for(const [a,b] of BRIDGES)add(a+9.58,p=>bridge(p,a,b));
  const trees=[[.62,2.85,.92],[5.3,.54,1.08],[9.62,.65,1.08],[13.82,1.01,1.25],[14.18,2.73,1.12],[.8,6.28,1],[.7,8.03,.8],[7.83,5.75,.72],[13.77,5.35,1.13],[14.27,7.13,1.05],[1.0,12.75,1.25],[2.18,13.83,1.05],[.8,14.05,.86],[3.42,12.32,.92],[6.56,13.34,1.03],[8.05,14.05,1.20],[10.1,12.94,.84],[13.72,12.67,1.25],[14.36,14.19,1.12]];
  trees.forEach(([x,y,s],i)=>add(x+y,p=>tree(p,x,y,s,i*53+12,i%7===0?"gold":i%11===0?"flower":"round"),[x-.07,y-.07,.14,.14]));
  for(const [x,y] of [[1.8,7.85],[7.1,8.32],[10.4,11.3],[3.33,13.03],[8.52,12.17]])add(x+y+.35,p=>bench(p,x,y),[x,y,1.04,.3]);
  for(const [x,y] of [[4.15,8.45],[6.6,8.48],[11.28,8.35],[13.37,11.2],[4.61,11.28],[8.7,5.24]])add(x+y,p=>lamp(p,x,y),[x-.055,y-.055,.11,.11]);
  for(const [x,y] of [[.45,7.1],[9.25,5.35],[6.72,12.53],[2.1,11.83]])add(x+y+.35,p=>planter(p,x,y,.025,.9),[x,y,.9,.24]);
  add(14.3,p=>kiosk(p,6.25,7.8),[6.25,7.8,.38,.38]);add(23.95,p=>parasol(p,10.1,13.85),[10.05,13.8,.1,.1]);return out.sort((a,b)=>a.depth-b.depth);
}
function roomGround(p,project){
  const [w,d]=ROOM_SIZE;
  p.box(.15,.15,-.28,w-.3,d-.3,.28,"#aa896b","#d5b58b");
  for(let y=.18;y<d-.17;y+=.37){
    p.line([[.16,y,.012],[w-.16,y,.012]],"#ad916e",.027);
    for(let x=.2+(Math.round(y/.37)%2)*.75;x<w-.3;x+=1.58)p.line([[x,y,.013],[x,Math.min(y+.36,d-.15),.013]],"#b59b77",.02);}
  p.box(.13,.13,0,w-.26,.13,2.6,"#e4d5b5");
  p.box(.13,.13,0,.13,d-.26,2.6,"#ded1b4");
  p.box(.14,.12,2.58,w-.24,.19,.13,"#91785b");p.box(.12,.12,2.58,.19,d-.23,.13,"#91785b");
  p.front(.5,.273,1.05,2.9,1.12,"#8e795b");p.front(.58,.28,1.13,2.74,.96,"#a7c9c0");
  for(let x of [1.4,2.4])p.line([[x,.291,1.13],[x,.291,2.1]],"#e9daaf",.075);
  p.front(4.23,.29,1.27,2.99,.74,project.color);p.label(5.72,.30,1.63,project.sign,.35,"#fff2d3");
  p.side(.28,1.5,1.31,1.05,.73,"#c19f6d");p.side(.28,1.59,1.38,.87,.58,"#779587");
  p.tile(2.57,3.52,2.8,1.7,project.tint,.028,INK);p.tile(2.69,3.64,2.56,1.46,project.color,.03);
  for(let i=0;i<12;i++)p.line([[2.67+i*.218,5.10,.034],[2.67+i*.218,5.22,.034]],"#e8d6b2",.025);
}
function roomObjects(b){
  const objects=[],add=(x,y,draw,lot)=>objects.push({depth:x+y,draw,lot});
  add(1,1.31,p=>{p.box(.55,.55,.05,3.0,.76,.83,"#ad8860");p.box(.48,.49,.88,3.14,.89,.13,"#d5b88b");},[.48,.49,3.14,.89]);
  if(b.form==="diner"){
    add(2.9,1.5,p=>{for(let i=0;i<4;i++){let x=1+i*.56;p.ellipse(x,.9,1.03,.17,.07,"#f9ecd4",INK);p.ellipse(x,.9,1.041,.08,.03,"#c18352");}});
    add(5.6,2.43,p=>{p.box(4.7,.78,.03,1.75,.91,.83,"#976e4c");p.box(4.59,.68,.87,1.97,1.07,.1,"#e4c497");p.front(5.1,1.77,.45,.98,.29,"#bd6348");},[4.59,.68,1.97,1.07]);
  }else if(b.form==="studio"){
    add(2.9,1.5,p=>{p.box(.9,.66,1.04,1.24,.14,.71,"#536768");p.front(.98,.81,1.14,1.06,.49,"#a8c6ad");p.front(1.15,.82,1.26,.21,.15,"#598677");p.box(.99,1.03,1.03,.89,.24,.04,"#667575");});
    add(5.8,2.33,p=>{for(let i=0;i<2;i++){let x=4.5+i*.91;p.box(x,.73,.03,.78,.88,1.43,"#607c80");p.front(x+.08,1.62,.75,.61,.49,"#b7c8a0");p.front(x+.09,1.63,.39,.60,.20,"#3c5c62");}},[4.5,.73,1.69,.88]);
  }else{
    add(2.9,1.5,p=>{for(let i=0;i<4;i++)p.box(.9+i*.33,.85,1.04,.14,.13,.26+(i%2)*.09,i%2?"#979d73":"#ad8661");});
    add(5.8,2.33,p=>{p.box(4.65,1.05,.06,1.14,1.1,.51,"#826c52");p.box(4.59,1.00,.54,1.25,1.1,.17,"#738571");p.box(4.59,1.00,.68,1.25,.18,.66,"#81927a");},[4.59,1,1.25,1.15]);
  }
  add(1.0,4.6,p=>{p.box(.65,4.18,.06,.49,.47,.57,"#ae7959");tree(p,.89,4.41,.85,69);},[.65,4.18,.49,.47]);
  add(5.9,4.25,p=>{p.box(5.78,3.54,.045,.86,.69,.8,"#ad926e");p.box(5.68,3.46,.85,1.07,.82,.11,"#e8d1a6");p.front(5.9,4.30,.61,.64,.19,b.color);p.box(5.88,3.64,.98,.6,.45,.09,b.color);},[5.68,3.46,1.07,.84]);
  return objects.sort((a,b)=>a.depth-b.depth);
}

