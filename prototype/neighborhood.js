// Layout in metres. Each row of houses faces a particular public lane.
// Door approaches, paved surfaces and walking limits all use this plan.
function planNeighborhood(height) {
  const lanes = [], approaches = [], homes = [];
  const streets = {};
  function path(points, width, collection) {
    const segments = [];
    for (let i=1; i<points.length; i++) {
      const [x,z]=points[i-1], [endX,endZ]=points[i];
      const dx=endX-x, dz=endZ-z;
      segments.push({x,z,dx,dz,length2:dx*dx+dz*dz});
    }
    const xs=points.map(p=>p[0]), zs=points.map(p=>p[1]), r=width/2;
    const line={points,width,segments,left:Math.min(...xs)-r,right:Math.max(...xs)+r,
      near:Math.max(...zs)+r,far:Math.min(...zs)-r};
    collection.push(line);
    return line;
  }
  function street(id,width,points) { streets[id]=path(points,width,lanes) }
  street('quay',1.85,[[-1.4,6.9],[-5.5,5.6],[-11.2,4.2],[-16.4,3.8],[-19.3,1.1],[-20,-5.6],[-18.9,-12.8],[-15.4,-16.2],[-10.6,-16.9],[-5.2,-18.5],[-2.4,-18.6]]);
  street('westCourt',1.47,[[-19.3,1.1],[-23.4,.3],[-25.7,-3.5],[-26.2,-9.5],[-24.2,-13.5],[-18.9,-12.8]]);
  street('salon',1.75,[[1.6,-1.7],[5.4,-2.9],[10.1,-4.2],[14.9,-3.4],[17.4,.15],[18.7,3.8],[22.9,4.6],[27,3.5]]);
  street('eastRise',1.72,[[10.1,-4.2],[11.8,-8.4],[11.1,-13.2],[12.2,-17.5],[11,-20.8],[7.4,-22.0],[2.35,-23.1]]);
  street('westRise',1.68,[[-15.4,-16.2],[-15.9,-20.3],[-14,-24.7],[-13.2,-28.7],[-10.5,-31.7],[-7.1,-32.4],[-2.5,-32.1]]);
  street('eastCourt',1.60,[[17.4,.15],[21.5,-2.3],[23.1,-7.4],[22.7,-12.2],[19.1,-15.7],[15.5,-15.9],[11.6,-15.6]]);
  street('upperEast',1.80,[[11,-20.8],[16.2,-23.7],[17.1,-28.3],[15.1,-32.8],[14.2,-38.8],[12,-44.3],[7.8,-46.8]]);
  street('upperWest',1.70,[[-13.2,-28.7],[-15.5,-33.8],[-14.1,-39.5],[-13,-44.7],[-9.1,-48.1]]);
  street('ridge',2.08,[[-29,-48.0],[-22,-45.8],[-13,-44.7],[-7.4,-48.3],[-1,-48.7],[7.8,-46.8],[15.7,-45.5],[22.5,-47.8],[28.8,-50.2]]);
  street('highSteps',1.58,[[-22,-45.8],[-24.1,-52.2],[-21.7,-56.3],[-15.7,-59.6],[-8.2,-57.7],[-2.7,-57.6],[2.6,-60.0],[10.2,-59.3],[16.5,-55.6],[19.4,-51.8],[22.5,-47.8]]);
  street('crest',1.68,[[-21.7,-56.3],[-24.7,-60.6],[-22.8,-65.3],[-17.5,-67.7],[-11.6,-69.3],[-6.1,-68.2],[-1.4,-71],[5.2,-71.5],[11.3,-70.3],[17.6,-67],[20.6,-63.5],[18.2,-59.8],[16.5,-55.6]]);
  // The two houses near the saddle face the rising main road itself.
  const mainBend=path([[-1,-10],[-2.65,-15],[-1,-19],[-.2,-21],[1.6,-23]],2.8,[]);

  function nearest(line,x,z) {
    let best=Infinity,point;
    for (const s of line.segments) {
      const t=Math.max(0,Math.min(1,((x-s.x)*s.dx+(z-s.z)*s.dz)/s.length2));
      const px=s.x+t*s.dx,pz=s.z+t*s.dz,dist=(px-x)**2+(pz-z)**2;
      if (dist<best) { best=dist; point=[px,pz] }
    }
    return point;
  }
  // x, z, frontage, depth, wall height, roof, turn from the lane normal.
  const blocks={
    quay:[
      [-10.5,7.65,4.0,2.65,2.65,'terrace',-.08],[-17.0,7.15,4.9,2.8,3.4,'gable',.06],
      [-13.0,.20,4.35,2.9,3.45,'hip',.14],[-16.9,-4.3,3.4,2.35,4.4,'lean',-.03],
      [-22.6,-7.4,4.15,2.55,4.85,'loggia',-.10]
    ],
    westCourt:[
      [-24.0,4.0,5.3,3.1,4.15,'loggia',.10],[-29.1,-2,4.8,3.3,2.95,'gable',-.12],
      [-29.9,-9.0,3.7,3.05,5.1,'terrace',.07],[-27.5,-16.9,4.2,2.9,3.5,'lean',-.12]
    ],
    salon:[
      [5.65,-6.15,3.7,2.7,3.05,'terrace',-.12],[17.3,6.65,3.25,2.2,3.15,'gable',.09],
      [25.0,7.50,4.3,2.6,3.7,'hip',-.13],[28.9,.15,4.0,3.3,4.45,'loggia',.12]
    ],
    eastCourt:[
      [19.0,-5.65,3.7,3.0,4.4,'loggia',.03],[26.8,-6.3,5.0,3.5,3.15,'gable',-.12],
      [26.6,-13.7,4.1,3.0,4.95,'terrace',.13],[20.8,-19.7,4.8,3.2,3.25,'hip',-.17]
    ],
    eastRise:[
      [15.4,-8.8,4.35,2.8,3.75,'hip',.06],[7.5,-12.0,4.2,3.0,4.85,'loggia',-.14],
      [15.6,-19.1,3.45,2.55,3.05,'lean',.16],[7.9,-18.0,3.85,2.75,3.85,'gable',.06]
    ],
    bend:[[-4.6,-22.85,3.35,2.4,3.25,'terrace',-.1],[2.25,-14.4,3.65,2.6,3.9,'lean',.10]],
    westRise:[
      [-10.25,-21.8,4.1,3.0,4.5,'loggia',.09],[-19.8,-20.6,4.2,3.1,3.2,'hip',-.09],
      [-18.0,-26.1,3.85,3.05,5.15,'gable',.08],[-9.8,-26.05,3.80,2.65,3.5,'terrace',-.10]
    ],
    upperWest:[[-19.3,-34.2,5.40,3.9,4.1,'hip',.09],[-10.4,-41.4,3.55,2.7,3.3,'lean',-.03]],
    upperEast:[[13.15,-27.35,4.2,2.65,3.15,'gable',-.12],[20.85,-27.8,5.1,3.2,4.1,'loggia',.08],[18.25,-34.6,3.6,2.8,5.2,'terrace',-.10]],
    ridge:[[-26.5,-43.7,4.2,2.9,3.4,'hip',.07],[-17.4,-48.6,5.7,3.7,4.65,'gable',-.13],[-3.1,-44.8,4.0,2.85,3.8,'terrace',.12],[3.1,-51.3,5.4,3.3,4.4,'loggia',-.09],[17.3,-42.1,4.25,3.0,4.1,'hip',.10],[26.1,-45,4.5,3.1,4.8,'gable',-.14],[29.6,-54,4.0,3.0,3.75,'lean',.08]],
    highSteps:[[-27.8,-54.6,4.55,3.3,4.0,'gable',.17],[-20.4,-60.8,3.9,3.15,5.5,'terrace',-.10],[-15.2,-55.4,4.75,3.2,3.8,'hip',.06],[-9.3,-62,4.2,3.3,5.1,'loggia',-.11],[-4.6,-54,4.0,3.1,3.1,'lean',.12],[1.0,-64.2,5.15,3.5,4.85,'hip',-.07],[8.0,-55.4,4.3,3.0,4.05,'terrace',.12],[13.8,-62.0,5.7,3.7,4.25,'gable',-.15],[22.7,-57.4,3.7,3.0,5.15,'loggia',.13]],
    crest:[[-27.5,-64.2,4.6,3.4,4.15,'hip',-.06],[-20.4,-70.8,3.55,3.4,5.6,'terrace',.14],[-14.2,-65.2,4.1,2.8,3.4,'lean',.05],[-11.7,-73.4,5.8,3.1,4.25,'gable',-.08],[-3.4,-74.2,4.3,3.1,5.45,'loggia',-.06],[6.3,-66.8,3.5,2.6,4.4,'terrace',.13],[7.4,-75.4,5.35,3.6,4.3,'hip',.03],[15.3,-72.7,4.9,3.35,4.85,'gable',-.09],[23.8,-66.5,3.8,3.3,5.65,'loggia',.06]]
  };
  for (const [id,plots] of Object.entries(blocks)) for (const [x,z,w,d,h,roof,turn] of plots) {
    const lane=id==='bend'?mainBend:streets[id], anchor=nearest(lane,x,z);
    const a=Math.atan2(anchor[0]-x,anchor[1]-z)+turn, s=Math.sin(a),c=Math.cos(a);
    const doorZ=d/2+.34, doorX=(homes.length%3-1)*w*.15;
    const door=[x+c*doorX+s*doorZ,z-s*doorX+c*doorZ];
    const join=nearest(lane,...door), gap=Math.hypot(join[0]-door[0],join[1]-door[1]);
    const run=Math.min(1.02,gap*.65), lift=.14*(1+homes.length%3);
    const foot=[door[0]+s*run,door[1]+c*run];
    const approach=path([join,foot,door],1.10,approaches);
    homes.push({x,z,a,c,s,w,d,h,roof,door,doorX,doorZ,run,lift,approach,base:height(door[1])+lift+.10});
  }
  const paths=[...lanes,...approaches];
  function onPath(x,z,margin=0) {
    return paths.some(p=>{
      if(x<p.left+margin||x>p.right-margin||z<p.far+margin||z>p.near-margin)return false;
      const radius=p.width/2-margin;
      return p.segments.some(s=>{
        const t=Math.max(0,Math.min(1,((x-s.x)*s.dx+(z-s.z)*s.dz)/s.length2));
        return (x-s.x-t*s.dx)**2+(z-s.z-t*s.dz)**2<=radius*radius;
      });
    });
  }
  function occupied(x,z,space) {
    return onPath(x,z,-space)||homes.some(p=>{
      const dx=x-p.x,dz=z-p.z;
      return Math.abs(dx*p.c-dz*p.s)<p.w/2+space && Math.abs(dx*p.s+dz*p.c)<p.d/2+space+.4;
    });
  }
  function stepHeight(x,z) {
    for(const p of homes){
      const dx=x-p.door[0],dz=z-p.door[1],forward=dx*p.s+dz*p.c;
      if(forward>=-.35 && forward<p.run && Math.abs(dx*p.c-dz*p.s)<.60) {
        return p.lift*(1-Math.max(0,forward)/p.run);
      }
    }
    return 0;
  }
  return {homes,lanes,approaches,onPath,occupied,stepHeight};
}

// Build the fronts from the doorstep outwards. Windows, stairs and garden gates
// share the parcel orientation, including on bends and on the hillside.
function buildResidences(plan, {local,box,rock,timber,round,houseRoof,masonry,bush,cypress,height,pick,floweringVine,road,bankZ,buildings}) {
  const plaster=['#f4e4c9','#e9dac8','#e4c9b6','#efe7d6','#efd6ba','#e5dcca'];
  const shutters=['#526f61','#677c76','#486773','#76685c','#727951'];
  const tile=['#b46e4d','#a6614c','#c4835f','#aa7157','#ba7b60'];
  function sash(x,y,z,w,h,color) {
    rock(x,y,z,w+.14,h+.16,.13,'#e5d5bb');
    box(x,y,z+.077,w,h,.08,'#414d50');
    box(x-w*.19,y+.06,z+.12,w*.39,h*.80,.014,'#829493');
    timber(x,y,z+.134,.048,h,.05,'#776f5c');
    timber(x,y+h*.12,z+.137,w,.042,.047,'#726956');
    for(const sign of [-1,1]){
      const sx=x+sign*w*.72;
      timber(sx,y,z+.09,w*.37,h*.98,.105,color,0,sign*.10);
      for(let k=0;k<4;k++)box(sx,y+(k-1.5)*h*.20,z+.158,w*.32,.032,.035,color,.32);
    }
    rock(x,y-h*.53,z+.065,w+.26,.09,.31,'#ddc9af');
  }
  function wing(p,index,color,paint) {
    const w=p.w*.56,d=p.d*.65,side=index%2?1:-1,ox=side*(p.w+w)/2,oz=-p.d*.22;
    const x=p.x+ox*p.c+oz*p.s,z=p.z-ox*p.s+oz*p.c;
    for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){
      const dx=i*(w/2+.16),dz=j*(d/2+.16),px=x+dx*p.c+dz*p.s,pz=z-dx*p.s+dz*p.c;
      if(pz>bankZ(px)-.3||plan.onPath(px,pz,-.25)||(pz>=-34.8&&road(px,pz,-.25)))return;
      if([...buildings,...plan.homes].some(b=>{
        if(b===p)return false;
        const c=Math.cos(b.a),s=Math.sin(b.a),rx=px-b.x,rz=pz-b.z;
        return Math.abs(rx*c-rz*s)<b.w/2+.17&&Math.abs(rx*s+rz*c)<b.d/2+.17;
      }))return;
    }
    buildings.push({x,z,w,d,a:p.a});
    local(ox,0,oz,0,()=>{
      const h=Math.min(p.h-.55,2.66),bottom=Math.min(-.16,height(z+d/2)-p.base-.15);
      rock(0,(bottom+h)/2,0,w,h-bottom,d,color);
      local(0,0,0,Math.PI/2,()=>houseRoof(d,w,h,tile[(index+2)%tile.length]));
      sash(0,h*.54,d/2+.038,.58,.74,paint);
      local(side*w/2,0,0,side*Math.PI/2,()=>sash(0,h*.55,.035,.51,.73,paint));
    });
  }
  function roof(p,color) {
    const {w,d,h}=p;
    if(p.roof==='terrace'||p.roof==='loggia'){
      rock(0,h+.08,0,w+.26,.16,d+.28,'#decab2');
      for(const k of [-1,1]){
        rock(k*(w-.14)/2,h+.30,0,.17,.51,d,'#efe0c5');
        rock(0,h+.30,k*(d-.14)/2,w,.51,.16,'#ecdbc0');
      }
      if(p.roof==='loggia'){
        const span=w*.66,depth=d*.65,cx=-w*.075;
        for(const i of [-1,1])for(const j of [-1,1])
          timber(cx+i*span/2,h+.83,j*depth/2,.095,1.53,.095,'#877053');
        for(const i of [-1,1])timber(cx,h+1.58,i*depth/2,span+.32,.14,.12,'#8a6c4f');
        for(let i=0;i<8;i++)timber(cx+span*(i/7-.5),h+1.68,0,.11,.10,depth+.40,'#a78059');
        for(let i=0;i<5;i++)box(cx+span*(i/8-.46),h+1.70,0,span*.15,.07,depth*.88,pick(['#8c9a58','#829754','#9aa462']),0,0,i*.025);
      }else{
        rock(-w*.20,h+.52,-d*.15,w*.43,.95,d*.51,'#ebdcc9');
        box(-w*.20,h+1.02,-d*.15,w*.49,.13,d*.58,'#b58465',-.08);
        for(const k of [0,1]){round(w*.29,h+.30,d*(.18-k*.35),.36,.40,.36,'#bc815b');bush(w*.29,h+.51,d*(.18-k*.35),.49)}
      }
    }else if(p.roof==='hip'){
      // Receding terracotta courses close all four slopes, including the ends.
      const rows=9,rise=Math.min(d,w)*.23;
      for(let j=0;j<rows;j++){
        const t=j/rows;
        rock(0,h+.10+j*rise/rows,0,w+.46-t*Math.min(w*.72,d),rise/rows+.105,
          d+.55-t*(d+.40),j%3===0?color:'#b67757');
      }
      round(0,h+rise+.09,0,.22,w+.46-Math.min(w*.72,d),.22,color,0,0,Math.PI/2);
    }else if(p.roof==='lean'){
      const slope=.22,span=d+.50;
      for(let row=0;row<8;row++){
        const z=span*((row+.5)/8-.5),y=h+.18+(span/2-z)*Math.tan(slope);
        rock(0,y,z,w+.48,.14,span/8+.074,color,slope+.045);
      }
      rock(0,h+d*.13,-d*.44,w,d*.27,d*.13,'#e4d4bf');
      timber(0,h+.13,d*.53,w+.45,.14,.14,'#866c53');
    }else{
      houseRoof(w,d,h,color);
      // Fill the gable ends under the ridge on the side elevations.
      for(let i=0;i<7;i++)rock(0,h+.06+i*d*.024,0,w-.10,.14,d*(1-i/7),'#e9d9c0');
    }
    if(p.roof!=='terrace'){
      const y=h+(p.roof==='loggia'?.55:.70);
      rock(w*.28,y,-d*.25,.31,.99,.38,'#dbbda1');
      rock(w*.28,y+.52,-d*.25,.44,.12,.49,'#aa7258');
    }
  }
  for(const [index,p] of plan.homes.entries()){
    const {x,z,w,d,h,a,doorX,doorZ,base,run,lift}=p;
    const face=d/2,color=plaster[index%plaster.length],paint=shutters[(index+Math.floor(index/4))%shutters.length];
    local(x,base,z,a,()=>{
      const low=height(z+Math.abs(p.s)*w/2+Math.abs(p.c)*d/2)-.13,depth=Math.max(.18,base-low);
      rock(0,-depth/2,0,w+.12,depth,d+.13,'#bdab94');
      rock(0,h/2,0,w,h,d,color);
      rock(0,.15,face+.017,w,.30,.07,'#ccbba4');
      roof(p,tile[index%tile.length]);
      if(index%3!==1)wing(p,index,color,paint);
      // A timber leaf set inside a pale stone reveal.
      rock(doorX,1.01,face+.038,1.07,2.07,.16,'#dac5aa');
      timber(doorX,.97,face+.13,.85,1.89,.085,index%3===0?paint:'#927050');
      timber(doorX,1.57,face+.18,.66,.48,.031,'#4e6060');
      box(doorX+.30,.90,face+.20,.044,.12,.045,'#dfc191');
      if(h>3.65&&index%3===2){
        round(doorX,1.79,face+.12,.88,.14,.88,'#495353',Math.PI/2);
        for(let k=0;k<9;k++){
          const t=(k+.5)*Math.PI/9;
          rock(doorX+.48*Math.cos(t),1.79+.48*Math.sin(t),face+.18,.18,.13,.19,'#ddc9ab',0,0,t-Math.PI/2);
        }
      }else rock(doorX,2.075,face+.12,1.16,.105,.31,'#dfc9ac');
      const steps=Math.round(lift/.14);
      for(let j=0;j<steps;j++){
        const front=doorZ+run*(1-j/steps),back=doorZ+run*(1-(j+1)/steps);
        const top=-lift+(j+1)*lift/steps;
        const bottom=Math.min(top-.14,height(z-p.s*doorX+p.c*(front+back)/2)-base-.12);
        rock(doorX,(top+bottom)/2,(front+back)/2,1.14,top-bottom,front-back+.018,pick(['#d7c3a8','#e0ccb1','#d2baa2']));
      }
      rock(doorX,-depth/2,face+.20,1.18,depth,.43,'#e4ccb0');
      const other=doorX>0?-1:1;
      sash(other*w*.31,1.32,face+.042,.63,.85,paint);
      if(h>=3.75){
        for(const k of [-1,1])sash(k*w*.245,h-.87,face+.04,.66,.98,paint);
        if(p.roof==='loggia'||index%5===0){
          rock(0,h-1.51,face+.36,w*.72,.14,.72,'#d6c3a9');
          timber(0,h-.97,face+.69,w*.73,.065,.067,'#625948');
          for(let k=0;k<9;k++)box(w*.71*(k/8-.5),h-1.24,face+.69,.032,.53,.036,'#655e52');
        }
      }
      for(const side of [-1,1])local(side*w/2,0,0,side*Math.PI/2,()=>sash(0,h>3.8?h-1.08:1.54,.04,.65,.86,paint));
      local(0,0,-face,Math.PI,()=>{
        sash(w*.17,h>3.8?h-1.1:1.52,.035,.75,1.00,paint);
        if(index%3!==1){
          rock(-w*.24,(.54-depth)/2,.39,.92,.54+depth,.62,'#cab598');
          bush(-w*.24,.57,.39,.77,true);
        }
        if(index%5===0)floweringVine(-w*.34,h-.02,.15,Math.min(h-.55,2.25),.74);
        if(index%4===1){
          for(const sign of [-1,1])timber(sign*w*.31,.95,.78,.09,1.9,.09,'#927154');
          rock(0,1.99,.53,w*.72,.13,1.06,'#bd805d',.17);
          timber(0,.49,.51,w*.53,.11,.33,'#947854');
        }
      });
      // A narrow garden hugs one cheek of the approach, leaving the front gate open.
      const along=other*w*.31, front=face+.75, gx=x+p.c*along+p.s*front,gz=z-p.s*along+p.c*front;
      if(!plan.onPath(gx,gz,-.48)){
        const gw=Math.min(1.78,w*.34);
        const bottom=Math.min(-.15,height(gz+1)-base-.10);
        rock(along,(.20+bottom)/2,front,gw,.20-bottom,.82,'#b09e79');
        masonry(along,bottom,front+.47,gw+.10,.24-bottom,.19);
        for(let k=0;k<3;k++)bush(along+gw*(k-1)*.27,.23,front,.62,index%4!==1);
        if(index%5===1)cypress(along,.18,front,1.62);
      }
      if(index%3===0){
        timber(doorX,2.22,face+.39,1.27,.105,.74,'#987852',.10);
        for(const k of [-1,1])timber(doorX+k*.44,2.07,face+.31,.055,.06,.53,'#8a7157',.45);
      }
    });
  }
}

// Gardens occupy the leftover pockets between buildings and the outside of a bend.
// Test their whole footprint, including a walking clearance around every gate.
function plantNeighborhood(plan, {local,box,rock,timber,leaf,masonry,bush,cypress,height,terrain,road,bankZ,buildings,rand,pick}) {
  function clear(x,z,margin){
    if(z>bankZ(x)-.35||plan.occupied(x,z,margin)||(z>=-34.8&&road(x,z,-margin)))return false;
    return buildings.every(b=>{
      const dx=x-b.x,dz=z-b.z,c=Math.cos(b.a),s=Math.sin(b.a);
      return Math.abs(dx*c-dz*s)>b.w/2+margin || Math.abs(dx*s+dz*c)>b.d/2+margin;
    });
  }
  function citrus(x,y,z,size){
    timber(x,y+size*.37,z,.13*size,.76*size,.15*size,'#947252',0,0,.09);
    for(let k=0;k<26;k++){
      const a=k*2.4,r=size*.41*Math.sqrt(k/26),px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;
      const py=y+size*(.83+.25*(1-k/26)+rand()*.16);
      leaf(px,py,pz,size*.45,size*.39,size*.43,pick(['#657e44','#768f4b','#86984b','#60794b']),.08,a);
      if(k%3===1)box(px+.08,py-size*.13,pz+.12,.085,.085,.085,'#edb454',0,a);
    }
  }
  // These plots follow existing gaps beside the quay, the two shop courts and the saddle.
  // Several sizes let a pocket garden tuck in behind a wall without closing the alley.
  const gardens=[];
  function garden(x,z,w,d,angle,style){
    const c=Math.cos(angle),s=Math.sin(angle),radius=Math.hypot(w,d)/2;
    if(gardens.some(g=>Math.hypot(x-g.x,z-g.z)<radius+g.radius-.28))return false;
    const levels=[];
    for(let i=0;i<=4;i++)for(let j=0;j<=4;j++){
      const lx=w*(i/4-.5),lz=d*(j/4-.5),px=x+c*lx+s*lz,pz=z-s*lx+c*lz;
      if(!clear(px,pz,.22))return false;
      levels.push(height(pz));
    }
    const top=Math.max(...levels)+.26,low=Math.min(...levels)-.09,rise=top-low;
    gardens.push({x,z,radius});
    local(x,top,z,angle,()=>{
      rock(0,-rise*.5,0,w,rise,d,'#b9a585');
      box(0,-.012,0,w-.10,.05,d-.10,pick(['#92955f','#999662','#99945a']));
      masonry(0,-rise,d/2,w,rise+.20,.25);
      masonry(-w/2,-rise,0,d,rise+.12,.22,Math.PI/2);
      for(let i=0;i<Math.ceil(w/.64);i++)bush(-w*.39+i*.55,.09,d*.32,.82+rand()*.16,true);
      if(style%3===0)citrus(w*.10,0,-d*.03,1.85);
      else if(style%3===1)cypress(-w*.29,.015,-d*.14,2.35);
      else{
        for(const a of [-1,1])timber(a*w*.30,.87,-d*.15,.09,1.74,.09,'#9e795b');
        for(const y of [.9,1.38])timber(0,y,-d*.15,w*.66,.045,.07,'#9e795b');
        for(let j=0;j<16;j++)leaf((j%8-3.5)*w*.086,1.07+Math.floor(j/8)*.25,-d*.14,.38,.31,.35,'#81964e',0,j);
      }
    });
    return true;
  }
  const pockets=[[-5.9,2.4],[-6.2,7.8],[-18,-.6],[-22,6],[-23.5,-3],[-25,-19],[-11,-13],[-16,-11.8],
    [3.7,-9.1],[5,-18.9],[-6.7,-24.7],[-7.8,-28.8],[-20,-29.5],[8.7,-8.6],[12,-11.2],[17.75,-12.9],
    [15.8,-23.2],[20.1,-23.5],[20.5,7],[24.6,.3],[6.3,-31.4],[-26,-24],[-21.7,-36.4]];
  for(const [i,[x,z]] of pockets.entries()){
    for(const w of [4.1,2.8,1.85])if(garden(x,z,w,w*.64,.18*Math.sin(i*3.4),i))break;
  }
  for(const [i,p] of plan.homes.entries()){
    const gap=p.d/2+1.82,side=(i%2-.5)*p.w*.47;
    garden(p.x-p.s*gap+p.c*side,p.z-p.c*gap-p.s*side,Math.min(3.35,p.w*.84),1.7,p.a,i);
  }

  // Kneewalls trace the outer edges of lanes. Interrupt the masonry wherever a
  // doorstep path joins, so that an open gate is visible from either direction.
  for(const [laneIndex,lane] of plan.lanes.entries())for(const [i,seg] of lane.segments.entries()){
    const len=Math.sqrt(seg.length2),n=Math.floor(len/1.3);
    for(let j=0;j<n;j++){
      const t=(j+.5)/n,side=(laneIndex+i)%2?1:-1,nx=seg.dz/len*side,nz=-seg.dx/len*side;
      const x=seg.x+t*seg.dx+nx*(lane.width/2+.41),z=seg.z+t*seg.dz+nz*(lane.width/2+.41);
      const tx=seg.dx/len,tz=seg.dz/len,half=len/n*.5;
      if(![-half,0,half].every(k=>clear(x+tx*k,z+tz*k,.25)))continue;
      const y=height(z),h=.31+.19*(i%3),bottom=Math.min(height(z-tz*half),height(z+tz*half))-.14;
      masonry(x,bottom,z,len/n-.035,y+h-bottom,.26,Math.atan2(-seg.dz,seg.dx));
      if(j%2===0&&clear(x+nx*.42,z+nz*.42,.40))bush(x+nx*.42,y,z+nz*.42,.80,i%3!==1);
    }
  }

  // Broader terraces give the inhabited slope a cultivated edge in overview.
  for(const side of [-1,1])for(let tier=0;tier<5;tier++){
    let x=side*(29.5+Math.sin(tier*1.8)*2.5);
    const z=-22.5-tier*7.1;
    const w=10+tier%3*2,angle=side*(.17+.045*tier);
    while(!clear(x,z,w/2+1.0))x+=side*1.5;
    const y=terrain(x,z)+.46;
    local(x,y,z,angle,()=>{
      rock(0,-.41,0,w,.80,4.3,'#b89e80');
      box(0,-.025,0,w-.06,.07,4.24,'#9b995f');
      masonry(0,-.81,2.14,w,.91,.33);
      for(let k=0;k<5;k++){
        const lx=(k-2)*w*.18;
        if(k%2===tier%2)citrus(lx,.02,-.56,1.77+rand()*.52);
        for(let j=0;j<3;j++)bush(lx+(j-1)*.41,.02,1.18,.78,true);
      }
    });
  }
}
