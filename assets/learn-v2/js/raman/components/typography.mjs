// Figure labels use the legacy Raman panel's serif for quantities; prose remains Gothic.
// Variable indices j/k/r/v are italic. Descriptive in/out/ref/L and units are upright.
const quantities={
  'E_L':['E','L',false], 'I_ref':['I','ref',false], 'F_in':['F','in',false], 'F_out':['F','out',false],
  'Iₖ':['I','k',true], 'αₖ':['α','k',true], 'δAⱼ':['δA','j',true],
  'Γᵣ':['Γ','r',true], 'γₖ':['γ','k',true], 'ψᵥ⁽ᵉ⁾':['ψ','v',true,'e'],
  'ψ₀⁽ᵍ⁾':['ψ','0',false,'g'], 'ψ₁⁽ᵍ⁾':['ψ','1',false,'g'],
  'ψₐ':['ψ','a',true], 'ψᵦ':['ψ','b',true], 'μ₀':['μ','0',false], 'μ₁':['μ','1',false],
  'E₀':['E','0',false], 'nᵢ':['n','i',false], 'nₛ':['n','s',false], 'aᵢ':['a','i',false], 'aₛ†':['a','s',false,'†'],
  'Γ':['Γ'], 'Δ':['Δ'], 'τ':['τ'], 'α':['α'], 'μ':['μ'], 'ψ':['ψ'], 'ν̃':['ν̃'],
  'A':['A'], 'I':['I'], 'N':['N'], 'S':['S'], 'T':['T'], 'q':['q'], 'Q':['Q'], 'd':['d'], 'v':['v'], 'm':['m'], 'n':['n'], 'r':['r'], 'e':['e'],
  'Re':['Re',null,false,null,true], 'Im':['Im',null,false,null,true],
  'fs':['fs',null,false,null,true], 'eV':['eV',null,false,null,true], 'cm⁻¹':['cm',null,false,'−1',true],
  'cm':['cm',null,false,null,true], 'i':['i',null,false,null,true]
};
const units=new Set(['fs','eV','cm⁻¹','cm']);
const tokens=new RegExp(`(?<![A-Za-z])(${Object.keys(quantities).sort((a,b)=>b.length-a.length).map(t=>t+(/[₀-₉ᵣₖₐᵦᵥᵍᵉ]/.test(t)?'':'(?![A-Za-z])')).join('|')})`,'g');
export function scientificText(value,svg=false) {
  const tag=svg?'tspan':'span';
  const run=(s,cls)=>`<${tag} class="${cls}">${s}</${tag}>`;
  return String(value).replace(tokens,(token,_match,offset,source)=>{
    if(token==='A' && source.slice(Math.max(0,offset-3),offset)==='モード')return token;
    const [base,index,italicIndex,sup,roman]=quantities[token];
    if(units.has(token))return run(base+(sup?run(sup,'rp-sup rp-unit'):''),'rp-notation rp-unit');
    return run(run(base,roman?'rp-roman':'rp-variable')+(index?run(index,`rp-sub ${italicIndex?'rp-variable':'rp-roman'}`):'')+(sup?run(sup,'rp-sup rp-roman'):''),'rp-notation');
  });
}
export function watchTypography(root) {
  // SVG viewBox geometry may scale; type sizes must keep their screen hierarchy.
  const sizeFigures=()=>root.querySelectorAll('svg.rp-svg').forEach(svg=>{
    const width=svg.getBoundingClientRect().width;
    if(width<=0)return;
    const unitsPerPixel=svg.viewBox.baseVal.width/width;
    svg.style.setProperty('--panel-font-scale',String(unitsPerPixel));
    // Keep a real 10px gap from tick text even when the SVG geometry scales.
    // Screen bounds include superscripts and the rotated vertical title.
    const frame=svg.querySelector('.rp-plot-frame');
    if(!frame)return;
    const left=Number(frame.getAttribute('x'));
    const bottom=Number(frame.getAttribute('y'))+Number(frame.getAttribute('height'));
    const ticks=Array.from(svg.querySelectorAll('.rp-tick'));
    const frameBox=frame.getBoundingClientRect();
    for(const tick of ticks) {
      const bounds=tick.getBoundingClientRect();
      if(Number(tick.getAttribute('x'))<left) {
        tick.setAttribute('x',Number(tick.getAttribute('x'))+(frameBox.left-9-bounds.right)*unitsPerPixel);
      } else if(Number(tick.getAttribute('y'))>bottom) {
        tick.setAttribute('y',Number(tick.getAttribute('y'))+(frameBox.bottom+9-bounds.top)*unitsPerPixel);
      }
    }
    const yt=svg.querySelector('.rp-y-title'), xt=svg.querySelector('.rp-x-title');
    const yTicks=ticks.filter(t=>Number(t.getAttribute('x'))<left).map(t=>t.getBoundingClientRect());
    const xTicks=ticks.filter(t=>Number(t.getAttribute('y'))>bottom).map(t=>t.getBoundingClientRect());
    if(yt && yTicks.length) {
      const dx=Math.min(...yTicks.map(t=>t.left))-10-yt.getBoundingClientRect().right;
      const x=Number(yt.getAttribute('x'))+dx*unitsPerPixel, y=Number(yt.getAttribute('y'));
      yt.setAttribute('x',x);yt.setAttribute('transform',`rotate(-90 ${x} ${y})`);
    }
    if(xt && xTicks.length) {
      const dy=Math.max(...xTicks.map(t=>t.bottom))+10-xt.getBoundingClientRect().top;
      xt.setAttribute('y',Number(xt.getAttribute('y'))+dy*unitsPerPixel);
    }
  });
  const format=()=>{
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT), nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    for(const node of nodes) {
      if(node.parentElement.closest('svg,.rp-notation,.katex,script,style,noscript,select') || node.textContent.includes('$'))continue;
      const rendered=scientificText(node.textContent.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'));
      if(!rendered.includes('class="rp-notation"'))continue;
      const template=document.createElement('template');template.innerHTML=rendered;node.parentNode.replaceChild(template.content,node);
    }
    root.querySelectorAll('button').forEach(b=>{b.classList.add('demo-btn');b.classList.toggle('active',b.getAttribute('aria-pressed')==='true')});
    sizeFigures();
  };
  const observer=new MutationObserver(()=>{observer.disconnect();format();observer.observe(root,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['aria-pressed']})});
  format();observer.observe(root,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['aria-pressed']});
  new ResizeObserver(sizeFigures).observe(root);
  document.fonts.ready.then(sizeFigures);
}
