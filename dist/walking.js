"use strict";

const ROOM_START = [4, 5.65];
const DISPLAY_STAND = [6.1, 4.72];
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// Every move tests the swept segment against the same padded footprints.
class WalkingArea {
  constructor(objects, indoors) {
    const padding = .14;
    const [width, height] = indoors ? ROOM_SIZE : [15, 15];
    const edge = indoors ? .44 : .18;
    this.bounds = [edge, edge, width - edge, height - edge];
    const lots = objects.filter(o => o.lot).map(o => o.lot);
    if (!indoors) {
      let bank = 0;
      for (const [left, right] of [...BRIDGES, [width, width]]) {
        lots.push([bank, CANAL[0], left - bank, CANAL[1] - CANAL[0]]);
        bank = right;
      }
    }
    this.blocks = lots.map(([x, y, w, h]) => [x-padding, y-padding, x+w+padding, y+h+padding]);
    // Straight paths around rectangles turn at their corners. A small clearance
    // keeps each waypoint outside the closed collision boundary.
    const gap = .005;
    this.corners = this.blocks.flatMap(([l,t,r,b]) => [
      [l-gap,t-gap], [r+gap,t-gap], [l-gap,b+gap], [r+gap,b+gap]
    ]).filter(point => this.clear(point,point));
  }

  clear(a, b) {
    const [x, y] = a, [u, v] = b;
    const [left, top, right, bottom] = this.bounds;
    if (u < left || v < top || u > right || v > bottom) return false;
    const dx = u-x, dy = v-y;
    for (const [l,t,r,bottomEdge] of this.blocks) {
      if (Math.max(x,u)<l || Math.min(x,u)>r || Math.max(y,v)<t || Math.min(y,v)>bottomEdge) continue;
      let enter = 0, leave = 1;
      if (dx) {
        const first = (l-x)/dx, last = (r-x)/dx;
        enter = Math.max(enter, Math.min(first,last));
        leave = Math.min(leave, Math.max(first,last));
      }
      if (dy) {
        const first = (t-y)/dy, last = (bottomEdge-y)/dy;
        enter = Math.max(enter, Math.min(first,last));
        leave = Math.min(leave, Math.max(first,last));
      }
      if (enter <= leave) return false;
    }
    return true;
  }

  path(start, end) {
    if (!this.clear(end,end)) return [];
    if (this.clear(start,end)) return [end];
    const points = [start,end,...this.corners];
    const cost = Array(points.length).fill(Infinity);
    const estimate = points.map(point=>distance(point,end));
    const previous = [], open = new Set([0]);
    cost[0] = 0;
    while (open.size) {
      let current, best = Infinity;
      for (const i of open) {
        if (cost[i]+estimate[i]<best) { current=i; best=cost[i]+estimate[i]; }
      }
      if (current===1) {
        const route = [];
        for (let i=current; i!==0; i=previous[i]) route.unshift(points[i]);
        return route;
      }
      open.delete(current);
      for (let i=1; i<points.length; i++) {
        const nextCost = cost[current]+distance(points[current],points[i]);
        if (nextCost>=cost[i] || !this.clear(points[current],points[i])) continue;
        cost[i]=nextCost;
        previous[i]=current;
        open.add(i);
      }
    }
    return [];
  }

  keyStep(at, horizontal, vertical, length) {
    const [dx,dy] = unproject(horizontal,vertical);
    const norm = Math.hypot(dx,dy);
    if (!norm) return at;
    const x = at[0]+length*dx/norm, y = at[1]+length*dy/norm;
    for (const next of [[x,y],[x,at[1]],[at[0],y]]) {
      if (this.clear(at,next)) return next;
    }
    return at;
  }
}
