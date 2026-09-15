/* Physical controls for the hand-edited graphene Raman articles. */
(function(){
  'use strict';
  const language=()=>document.documentElement.dataset.lang==='ja'?'ja':'en';
  const parseCsvPoints=text=>{
    const lines=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/);
    const header=(lines.shift()||'').split(',').map(v=>v.trim());
    const xi=header.indexOf('raman_shift_cm^-1'),yi=header.indexOf('normalized_intensity');
    if(xi<0||yi<0)throw new Error('Raman CSV columns are missing');
    const points=lines.filter(line=>line.trim()).map((line,index)=>{
      const cells=line.split(','),x=Number(cells[xi]),y=Number(cells[yi]);
      if(!Number.isFinite(x)||!Number.isFinite(y))throw new Error('Invalid Raman CSV row '+(index+2));
      return [x,y];
    });
    if(points.length<2)throw new Error('Raman CSV has too few points');
    return points;
  };
  fetch('/assets/data/graphene-raman/datasets.json?v=qe-phonopy-20260912').then(r=>{if(!r.ok)throw new Error('Raman data '+r.status);return r.json();}).then(data=>{
    const csvUrls=Array.from(new Set(Array.from(document.querySelectorAll('figure[data-gr-csv]')).map(figure=>figure.dataset.grCsv).filter(Boolean)));
    return Promise.all(csvUrls.map(url=>fetch(url).then(r=>{if(!r.ok)throw new Error('Raman CSV '+r.status);return r.text();}).then(text=>[url,parseCsvPoints(text)]))).then(entries=>{
      data.__csv=Object.create(null);
      entries.forEach(([url,points])=>{data.__csv[url]=points;});
      return data;
    });
  }).then(data=>{
    const controllers=[];
    document.querySelectorAll('figure[data-gr-config]').forEach(figure=>{
      const state=JSON.parse(figure.dataset.grConfig),stage=figure.querySelector('.gfig-stage'),status=figure.querySelector('[data-gr-result]');
      if(figure.dataset.grCsv)state.csv=figure.dataset.grCsv;
      const inputs=Array.from(figure.querySelectorAll('[data-gr-input]'));
      let queued=0,lastWidth=0,panels=[],moved=false;
      function update(){
        queued=0;
        const model=window.GrapheneRamanViews.render(state,data,language());
        panels=model.panels;
        const cardLayout=figure.dataset.grLayout==='phonon-cards';
        const width=Math.max(cardLayout?180:300,Math.floor(stage.getBoundingClientRect().width||600));
        lastWidth=width;
        const useRow=(cardLayout||width>=520)&&model.panels.some(p=>p.widthFraction);
        const panelWidth=width-(cardLayout&&useRow?12:0);
        stage.classList.toggle('gfig-stage--row',useRow);
        const canvases=Array.from(stage.querySelectorAll(':scope > canvas'));
        while(canvases.length>model.panels.length)canvases.pop().remove();
        const latticeHeight=Math.min(270,Math.max(180,Math.round(panelWidth*.44*.8)));
        const modeHeight=cardLayout?figure.querySelector('.phonon-mode-row').getBoundingClientRect().height:0;
        model.panels.forEach((panel,i)=>{
          let canvas=canvases[i];
          if(!canvas){canvas=document.createElement('canvas');stage.appendChild(canvas);}
          canvas.setAttribute('role','img');canvas.setAttribute('aria-label',panel.title||figure.querySelector('figcaption')?.textContent||'Graphene Raman');
          const cw=(useRow&&panel.widthFraction)?(cardLayout?(i===0?Math.floor(panel.widthFraction*panelWidth):panelWidth-Math.floor(model.panels[0].widthFraction*panelWidth)):Math.round(panel.widthFraction*width)):width;
          canvas.style.width=(useRow&&panel.widthFraction)?cw+'px':'';
          const ph=cardLayout?(panel.gl?latticeHeight:latticeHeight+modeHeight+12):(typeof panel.height==='function'?panel.height(cw):panel.height);
          canvas.style.height=ph+'px';
          if(panel.gl){
            if(figure.dataset.grWheel==='zoom')bindCanvasZoom(canvas);
            panel.render(canvas,cw,ph);
          }else{
            const ratio=Math.min(2,window.devicePixelRatio||1);
            canvas.width=Math.round(cw*ratio);canvas.height=Math.round(ph*ratio);
            const ctx=canvas.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,cw,ph);panel.draw(ctx,cw,ph);
          }
        });
        figure.querySelectorAll('[data-gr-set]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.classList.contains('active'))));
        if(status){if(status.textContent!==model.result)status.textContent=model.result;status.hidden=!model.result;}
        inputs.forEach(input=>{
          if(input.tagName==='SELECT')Array.from(input.options).forEach(o=>o.textContent=o.dataset[language()]||o.value);
          else{
            const out=figure.querySelector('output[for="'+input.id+'"]'),key=input.dataset.grInput;
            if(out){
              const value=(model.outputs&&model.outputs[key]!=null)?model.outputs[key]:String(Number(input.value))+(input.dataset.grUnit||'');
              const position=out.querySelector('.phonon-position');
              if(position){const parts=String(value).match(/^(.*?)\s+(\d+)%$/);position.textContent=(parts?parts[1]:value).replaceAll('→',' → ');const progress=out.querySelector('.phonon-progress');progress.hidden=!parts;progress.textContent=parts?parts[2]+'%':'';input.setAttribute('aria-valuetext',String(value));}
              else out.textContent=value;
            }
          }
        });
      }
      const schedule=()=>{if(!queued)queued=requestAnimationFrame(update);};
      const bindCanvasZoom=canvas=>{
        if(canvas.dataset.grZoomBound==='true')return;
        canvas.dataset.grZoomBound='true';
        canvas.addEventListener('wheel',e=>{
          e.preventDefault();
          const z=Number(state.zoom)||1;
          state.zoom=Math.max(0.55,Math.min(2.6,z*(e.deltaY<0?1.08:0.926)));
          schedule();
        },{passive:false});
      };
      const play=figure.querySelector('[data-gr-play]');
      if(play){
        let raf=0,last=0;
        const key=play.dataset.grPlay||'phase',step=Number(play.dataset.grStep)||3,limit=Number(play.dataset.grLimit)||360;
        const interval=Number(play.dataset.grInterval)||0;
        const advance=()=>{
          state[key]=(Number(state[key])+step)%limit;
          const input=inputs.find(i=>i.dataset.grInput===key);if(input)input.value=String(state[key]);
          update();
        };
        const loop=now=>{
          if(!interval||now-last>=interval){last=now;advance();}
          raf=requestAnimationFrame(loop);
        };
        const stop=()=>{if(raf)cancelAnimationFrame(raf);raf=0;play.classList.remove('active');play.setAttribute('aria-pressed','false');};
        play.addEventListener('click',()=>{if(raf)stop();else{play.classList.add('active');play.setAttribute('aria-pressed','true');raf=requestAnimationFrame(loop);}});
        inputs.forEach(input=>{if(input.dataset.grInput===key)input.addEventListener('input',stop);});
        document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
      }
      const setButtons=Array.from(figure.querySelectorAll('[data-gr-set]'));
      const parseSet=btn=>{
        const raw=btn.dataset.grSet,eq=raw.indexOf('='),key=raw.slice(0,eq),text=raw.slice(eq+1),num=Number(text);
        return {key,value:text!==''&&Number.isFinite(num)?num:text};
      };
      setButtons.forEach(btn=>{
        const parsed=parseSet(btn);
        if(state[parsed.key]===parsed.value)btn.classList.add('active');
        btn.addEventListener('click',()=>{
          const cur=parseSet(btn);state[cur.key]=cur.value;
          setButtons.forEach(other=>{if(parseSet(other).key===cur.key)other.classList.remove('active');});
          btn.classList.add('active');
          schedule();
        });
      });
      if(figure.dataset.grDrag){
        const [zKey,xKey]=figure.dataset.grDrag.split(',');
        stage.style.touchAction='none';
        let dragging=false,lastX=0,lastY=0,moveAcc=0;
        const syncInput=k=>{const input=inputs.find(i=>i.dataset.grInput===k);if(input)input.value=String(state[k]);};
        stage.addEventListener('pointerdown',e=>{
          moved=false;moveAcc=0;
          const i=Array.from(stage.querySelectorAll(':scope > canvas')).indexOf(e.target),panel=panels[i],rect=e.target.getBoundingClientRect(),px=e.clientX-rect.left,py=e.clientY-rect.top;
          if(!panel||(typeof panel.rotatable==='function'&&panel.rotatable(px,py,rect.width)===false))return;
          dragging=true;lastX=e.clientX;lastY=e.clientY;stage.setPointerCapture(e.pointerId);
        });
        stage.addEventListener('pointermove',e=>{
          if(!dragging)return;
          const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;
          moveAcc+=Math.abs(dx)+Math.abs(dy);if(moveAcc>4)moved=true;
          // Move the camera opposite to the pointer so the lattice follows the
          // drag direction on screen, like a turntable rather than a viewport.
          state[zKey]=Number(state[zKey])-dx*0.5;
          state[xKey]=Math.min(90,Math.max(10,Number(state[xKey])-dy*0.5));
          syncInput(zKey);syncInput(xKey);schedule();
        });
        const endDrag=()=>{dragging=false;};
        stage.addEventListener('pointerup',endDrag);
        stage.addEventListener('pointercancel',endDrag);
      }
      stage.addEventListener('click',e=>{
        if(moved)return;
        const i=Array.from(stage.querySelectorAll(':scope > canvas')).indexOf(e.target),panel=panels[i];
        if(!panel||typeof panel.hit!=='function')return;
        const rect=e.target.getBoundingClientRect(),px=e.clientX-rect.left,py=e.clientY-rect.top;
        const res=panel.hit(px,py,rect.width);
        if(!res||typeof res!=='object')return;
        Object.assign(state,res);
        Object.keys(res).forEach(key=>{
          const input=inputs.find(inp=>inp.dataset.grInput===key);if(input)input.value=String(state[key]);
          setButtons.forEach(btn=>{const p=parseSet(btn);if(p.key===key)btn.classList.toggle('active',p.value===state[key]);});
        });
        schedule();
      });
      inputs.forEach(input=>input.addEventListener('input',()=>{
        const key=input.dataset.grInput;state[key]=typeof state[key]==='number'?Number(input.value):input.value;schedule();
      }));
      if(window.ResizeObserver)new ResizeObserver(()=>{if(Math.floor(stage.getBoundingClientRect().width)!==lastWidth)schedule();}).observe(stage);
      figure.closest('details')?.addEventListener('toggle',schedule);
      controllers.push(schedule);schedule();
    });
    new MutationObserver(()=>controllers.forEach(fn=>fn())).observe(document.documentElement,{attributes:true,attributeFilter:['data-lang']});
    document.fonts?.ready.then(()=>controllers.forEach(fn=>fn()));
  }).catch(error=>{
    console.error(error);
    document.querySelectorAll('.raman-figure .gfig-stage').forEach(stage=>{
      const note=document.createElement('p');note.className='gfig-cap';
      note.textContent=language()==='ja'?'図のデータを読み込めませんでした。ページを再読み込みしてください。':'The figure data could not be loaded. Please reload the page.';
      stage.appendChild(note);
    });
  });
})();
