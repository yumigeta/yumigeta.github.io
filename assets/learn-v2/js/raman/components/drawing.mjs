import {scientificText} from './typography.mjs';
export const text = (x,y,value,attrs='') => `<text x="${x}" y="${y}" ${attrs.replace('rp-tick','rp-tick learn-panel-tick')}>${scientificText(value,true)}</text>`;
export const line = (x1,y1,x2,y2,cls='rp-axis',attrs='') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}${cls==='rp-axis'?' learn-panel-axis':cls==='rp-grid'?' learn-panel-grid':''}" ${attrs}/>`;
export function arrow(x1,y1,x2,y2,cls='rp-total',width=2) {
  const a=Math.atan2(y2-y1,x2-x1), length=Math.hypot(x2-x1,y2-y1), h=Math.min(7,length*.45);
  const head=[[-h,-h*.45],[-h,h*.45]].map(([x,y])=>`${x2+x*Math.cos(a)-y*Math.sin(a)},${y2+x*Math.sin(a)+y*Math.cos(a)}`).join(' ');
  return `<g class="${cls}" stroke-width="${width}">${line(x1,y1,x2,y2,'rp-vector')}<polygon points="${x2},${y2} ${head}"/></g>`;
}
export const svg = (body,label,width=360,height=280,cls='') => `<svg class="rp-svg learn-panel-plot ${cls}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}"><title>${label}</title>${body}</svg>`;
export const yAxisTitle = (x,y,label) => text(x,y,label,`class="rp-y-title" text-anchor="middle" dominant-baseline="central" transform="rotate(-90 ${x} ${y})"`);
export function frame({xmin,xmax,ymin,ymax,xlabel,ylabel,xticks,yticks,leftInset=100,rightInset=18,topInset=34,bottomInset=84,yTitleX=16},width=360,height=280) {
  const left=leftInset,right=width-rightInset,top=topInset,bottom=height-bottomInset;
  const x=v=>left+(v-xmin)/(xmax-xmin)*(right-left), y=v=>bottom-(v-ymin)/(ymax-ymin)*(bottom-top);
  let body=yAxisTitle(yTitleX,(top+bottom)/2,ylabel)+text((left+right)/2,height-16,xlabel,'text-anchor="middle" class="rp-x-title"');
  for(const v of xticks) body+=line(x(v),top,x(v),bottom,'rp-grid')+line(x(v),bottom,x(v),bottom+5)+text(x(v),bottom+21,v,'text-anchor="middle" class="rp-tick"');
  for(const v of yticks) body+=line(left,y(v),right,y(v),'rp-grid')+line(left-5,y(v),left,y(v))+text(left-9,y(v)+4,v,'text-anchor="end" class="rp-tick"');
  body+=`<rect class="rp-axis learn-panel-axis rp-plot-frame" x="${left}" y="${top}" width="${right-left}" height="${bottom-top}"/>`;
  return {x,y,body,left,right,top,bottom};
}
export const curve = (points,cls='rp-mode-a',extra='') => `<polyline class="rp-curve ${cls}" points="${points.map(([x,y])=>`${x.toFixed(2)},${y.toFixed(2)}`).join(' ')}" ${extra}/>`;
export function mark(x,y,r) {
  const c=`class="rp-mark rp-state-${r+1}"`;
  return r===0?`<circle cx="${x}" cy="${y}" r="4" ${c}/>`:r===1?`<rect x="${x-4}" y="${y-4}" width="8" height="8" ${c}/>`:`<polygon points="${x},${y-5} ${x-5},${y+4} ${x+5},${y+4}" ${c}/>`;
}
export function complexPlane(contributions,total,{range=24,unit='',labels=true}={}) {
  // Square plotting region: identical pixel scale on Re and Im; never fits to data.
  const f=frame({xmin:-range,xmax:range,ymin:-range,ymax:range,xlabel:`実部 ${unit}`,ylabel:`虚部 ${unit}`,xticks:[-range,0,range],yticks:[-range,0,range]},360,360);
  let body=f.body+line(f.x(0),f.top,f.x(0),f.bottom)+line(f.left,f.y(0),f.right,f.y(0));
  let p={re:0,im:0};
  contributions.forEach((z,r)=>{
    const end={re:p.re+z.re,im:p.im+z.im};
    body+=arrow(f.x(p.re),f.y(p.im),f.x(end.re),f.y(end.im),labels?`rp-state-${r+1}`:'rp-part',labels?2.2:1.2);
    if(labels) body+=mark(f.x(end.re),f.y(end.im),r);
    p=end;
  });
  body+=arrow(f.x(0),f.y(0),f.x(total.re),f.y(total.im),'rp-total',3.5);
  body+=text(f.left+11,55,labels?'合成 αₖ':'合成 A','class="rp-total-label"');
  return svg(body,`${labels?'状態の複素振幅和':'時間差積分の区間和'}。実部 ${total.re.toFixed(3)}、虚部 ${total.im.toFixed(3)} ${unit}。両軸固定 ±${range}。`,360,360,'rp-complex');
}
export const formatComplex = z => `${z.re.toFixed(4)} ${z.im<0?'−':'+'} ${Math.abs(z.im).toFixed(4)} i`;
export const chartSlot = name => `<div data-view="${name}" class="rp-chart"></div>`;
export function rangeControl(id,label,min,max,step,value,unit='') {
  const ticks=[min,(min+max)/2,max].map((n,i)=>`<span style="left:${i*50}%">${Number(n.toFixed(3))}</span>`).join('');
  return `<div class="rp-control learn-panel-controls"><div class="learn-panel-range"><label for="${id}">${label}</label><div class="learn-panel-track"><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-unit="${unit}" aria-valuetext="${value} ${unit}" aria-describedby="${id}-value"><div class="learn-panel-range-ticks" aria-hidden="true">${ticks}</div></div><output id="${id}-value" for="${id}" data-value="${id}">${value} ${unit}</output></div></div>`;
}
export function setReadout(root,id,value) {root.querySelector(`[data-value="${id}"]`).textContent=value;root.querySelector(`#${id}`).setAttribute('aria-valuetext',value);}
