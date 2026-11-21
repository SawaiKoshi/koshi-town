"use strict";

// Invert the ground-plane basis of the drawing, in CSS pixels before DPR scaling.
const slope = iso(1,0)[1];
function unproject(u,v) {
  return [(v/slope+u)/2, (v/slope-u)/2];
}

// Retain the exact opaque silhouette for picking roofs, awnings and doorways.
function buildingStamp(b, scale) {
  const [x,y,w,d] = b.lot;
  const left = x-y-d-.8, top = (x+y)*slope-b.height*1.13-1.2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil((w+d+1.6)*scale);
  canvas.height = Math.ceil(((x+y+w+d)*slope-top+.8)*scale);
  const ctx = canvas.getContext("2d", {willReadFrequently:true});
  ctx.setTransform(scale,0,0,scale,-left*scale,-top*scale);
  building(new Pen(ctx),b);
  return {canvas, left, top, scale, pixels:ctx.getImageData(0,0,canvas.width,canvas.height).data};
}

const townScenery = townObjects();
const stamps = new Map([...HOUSES,...PROJECTS].map(b => [b,buildingStamp(b,25)]));

class TownMap {
  constructor(canvas, pins, onTarget) {
    this.canvas = canvas;
    this.pins = pins;
    this.onTarget = onTarget;
    this.layers = [0,1].map(() => document.createElement("canvas"));
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.setScene(null,START);
  }

  setScene(project,position) {
    this.project = project;
    this.position = position;
    this.objects = project ? roomObjects(project) : townScenery;
    this.area = new WalkingArea(this.objects,!!project);
    this.zoom = 1;
    this.anchor = null;
    this.pins.replaceChildren();
    const items = project ? [project] : PROJECTS;
    this.markers = items.map(b => {
      const marker = document.createElement("button");
      marker.className = "pin";
      const [x,y,w,d] = b.lot;
      const point = project ? iso(6.16,3.92,1.34) : iso(x+w/2,y+d/2,b.height+.12);
      marker.style.setProperty("--pin-color", b.color);
      marker.setAttribute("aria-label",project ? b.exhibit+"へ歩く" : b.venue+"の入口へ歩く");
      marker.title = marker.getAttribute("aria-label");
      marker.innerHTML = "<span>"+(project ? "展示" : b.number)+"</span>";
      marker.id = "pin-"+b.id;
      marker.onclick = () => this.onTarget(project ? DISPLAY_STAND : b.door);
      this.pins.append(marker);
      return {marker,point};
    });
    this.resize();
  }

  resize() {
    const box = this.canvas.getBoundingClientRect();
    this.width = box.width;
    this.height = box.height;
    if (!this.width || !this.height) return;
    this.dpr = window.devicePixelRatio || 1;
    const pixelW = Math.round(this.width*this.dpr), pixelH = Math.round(this.height*this.dpr);
    for (const c of [this.canvas,...this.layers]) {
      if (c.width!==pixelW || c.height!==pixelH) { c.width=pixelW; c.height=pixelH; }
    }
    // Bounds include the roof ridge at the back and the thickness of the riverbank.
    const [l,t,r,b] = this.project ? [-7.2,-3.25,8.35,7.4] : [-15.65,-2.8,15.65,15.35];
    const scale = Math.min(this.width/(r-l),this.height/(b-t));
    this.scale = scale*this.zoom;
    const center = [(l+r)/2,(t+b)/2];
    const anchor = this.anchor || center;
    this.ox = this.width/2-center[0]*scale-anchor[0]*(this.scale-scale);
    this.oy = this.height/2-center[1]*scale-anchor[1]*(this.scale-scale);
    this.alignMarkers();
    this.split = -1;
    this.paint(this.position);
  }

  changeZoom(delta) {
    this.zoom = Math.max(1,Math.min(2,Math.round((this.zoom+delta)*100)/100));
    this.anchor = iso(...this.position);
    this.resize();
  }

  alignMarkers() {
    for (const {marker,point:[u,v]} of this.markers) {
      marker.style.left = this.ox+u*this.scale+"px";
      marker.style.top = this.oy+v*this.scale+"px";
    }
  }

  pick(clientX,clientY) {
    const box = this.canvas.getBoundingClientRect();
    const u = ((clientX-box.left)*this.width/box.width-this.ox)/this.scale;
    const v = ((clientY-box.top)*this.height/box.height-this.oy)/this.scale;
    if (!this.project) {
      for (let i=this.objects.length-1; i>=0; i--) {
        const b = this.objects[i].buildingData;
        if (!b) continue;
        const s = stamps.get(b), x = Math.floor((u-s.left)*s.scale), y = Math.floor((v-s.top)*s.scale);
        if (x>=0 && x<s.canvas.width && y>=0 && y<s.canvas.height && s.pixels[4*(y*s.canvas.width+x)+3]>64) {
          return b.door || null;
        }
      }
    }
    return unproject(u,v);
  }

  context(c) {
    const ctx = c.getContext("2d");
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,c.width,c.height);
    ctx.setTransform(this.dpr*this.scale,0,0,this.dpr*this.scale,this.dpr*this.ox,this.dpr*this.oy);
    ctx.lineJoin = "round";
    return ctx;
  }

  paint(position,phase=0,moving=false,target=null) {
    this.position = position;
    if (!this.width || !this.height) return;
    const [x,y] = position;
    const [u,v] = iso(x,y);
    if (this.zoom>1) {
      const sx = this.ox+u*this.scale, sy = this.oy+v*this.scale;
      const pad = 26;
      const dx = Math.min(this.width-pad,Math.max(pad,sx))-sx;
      const dy = Math.min(this.height-pad,Math.max(pad,sy))-sy;
      if (dx || dy) { this.ox+=dx; this.oy+=dy; this.split=-1; this.alignMarkers(); }
    }
    let split = this.objects.findIndex(o => o.depth>x+y);
    if (split===-1) split=this.objects.length;
    // A long facade can be in front of the depth anchor but behind the visitor.
    this.objects.forEach((o,i) => {
      if (!o.lot) return;
      const [l,t,w,h] = o.lot;
      if ((x>=l && x<=l+w && y>=t+h) || (y>=t && y<=t+h && x>=l+w)) split=Math.max(split,i+1);
    });
    if (this.split!==split) {
      const pens = this.layers.map(c => new Pen(this.context(c)));
      if (this.project) roomGround(pens[0],this.project); else ground(pens[0]);
      this.objects.forEach((o,i)=>o.draw(pens[i<split ? 0 : 1]));
      this.split=split;
    }
    const ctx = this.context(this.canvas), p = new Pen(ctx);
    const blit = layer => {
      ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.drawImage(layer,0,0); ctx.restore();
    };
    blit(this.layers[0]);
    if (target) p.ellipse(...target,.06,.25,.10,"#eee5bc","#406556");
    // A ground ring keeps the existing small character legible on a phone.
    p.ellipse(x,y,.08,.34,.16,"#f7e9b5","#3d6658");
    avatar(p,x,y,phase,moving,Math.max(1,23/this.scale));
    blit(this.layers[1]);
  }
}
