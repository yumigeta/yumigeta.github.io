/* 3D lattice-vibration figures for the graphene Raman series: kind `lattice3d`
   (mode gallery), `defectdisks` (defect statistics), and `phonons` (dispersion
   map + lattice view). Registers into the shared GrapheneRamanViews registry;
   depends on graphene-raman-core.js for the numerical model and
   graphene-raman-views.js for chart/pen/palette. The lattice itself is drawn
   with Three.js (WebGL): a 54-atom hexagonal flake rendered as a real
   ball-and-stick model with perspective, lit spheres and cylinders. If
   window.THREE is not loaded, the gl panels render nothing but never throw. */
(function(root,factory){
  if(typeof module==='object'&&module.exports){
    factory(require('./graphene-raman-core.js'),require('./graphene-raman-views.js'));
  }else{
    factory(root.GrapheneRaman,root.GrapheneRamanViews);
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(P,Views){
  'use strict';
  const K_POINT=P.lattice().K;
  const ZERO3=[[0,0],[0,0],[0,0]];
  const BRANCH=['oTA','iTA','iLA','oTO','iTO','iLO'];
  const MODE_TABLE={
    iLO:{Q:[0,0],eA:[[1,0],[0,0],[0,0]],eB:[[-1,0],[0,0],[0,0]],ja:'iLO　E₂g',en:'iLO E₂g',freqJa:'約 1580 cm⁻¹',freqEn:'about 1580 cm⁻¹'},
    iTO:{Q:[0,0],eA:[[0,0],[1,0],[0,0]],eB:[[0,0],[-1,0],[0,0]],ja:'iTO　E₂g',en:'iTO E₂g',freqJa:'約 1580 cm⁻¹',freqEn:'about 1580 cm⁻¹'},
    oTO:{Q:[0,0],eA:[[0,0],[0,0],[1,0]],eB:[[0,0],[0,0],[-1,0]],ja:'oTO　B₂g',en:'oTO B₂g',freqJa:'約 880 cm⁻¹',freqEn:'about 880 cm⁻¹'},
    iLA:{Q:[0,0],eA:[[1,0],[0,0],[0,0]],eB:[[1,0],[0,0],[0,0]],ja:'iLA　E₁u',en:'iLA E₁u',freqJa:'Γ で 0 cm⁻¹',freqEn:'0 cm⁻¹ at Γ'},
    iTA:{Q:[0,0],eA:[[0,0],[1,0],[0,0]],eB:[[0,0],[1,0],[0,0]],ja:'iTA　E₁u',en:'iTA E₁u',freqJa:'Γ で 0 cm⁻¹',freqEn:'0 cm⁻¹ at Γ'},
    oTA:{Q:[0,0],eA:[[0,0],[0,0],[1,0]],eB:[[0,0],[0,0],[1,0]],ja:'oTA　A₂u',en:'oTA A₂u',freqJa:'Γ で 0 cm⁻¹',freqEn:'0 cm⁻¹ at Γ'},
    KA1:{Q:K_POINT,eA:[[-0.5,0],[0,-0.5],[0,0]],eB:[[-0.5,0],[0,0.5],[0,0]],ja:'K の A₁′ 呼吸モード',en:'A₁′ breathing mode at K',freqJa:'約 1300 cm⁻¹',freqEn:'about 1300 cm⁻¹'}
  };

  // Which eigenvectors (per layer) a lattice3d state resolves to, plus its
  // bilingual title/frequency strings before any strain-title suffix.
  function resolveMode(system,mode,strain,phonons){
    if(mode==='rest'||(system!=='bilayer'&&(mode==='shear'||mode==='breathing'))){
      const layers=system==='bilayer'?[{eA:ZERO3,eB:ZERO3},{eA:ZERO3,eB:ZERO3}]:[{eA:ZERO3,eB:ZERO3}];
      return system==='bilayer'?{Q:[0,0],layers,ja:'AB 積層',en:'AB stacking',freqJa:'',freqEn:''}
        :{Q:[0,0],layers,ja:'静止',en:'At rest',freqJa:'',freqEn:''};
    }
    if(system==='bilayer'&&mode==='shear'){
      const e1=[[1,0],[0,0],[0,0]],e2=[[-1,0],[0,0],[0,0]];
      return {Q:[0,0],layers:[{eA:e1,eB:e1},{eA:e2,eB:e2}],ja:'層間せん断　E₂g',en:'Interlayer shear E₂g',freqJa:'約 31 cm⁻¹（二層）',freqEn:'about 31 cm⁻¹ (bilayer)'};
    }
    if(system==='bilayer'&&mode==='breathing'){
      const e1=[[0,0],[0,0],[1,0]],e2=[[0,0],[0,0],[-1,0]];
      return {Q:[0,0],layers:[{eA:e1,eB:e1},{eA:e2,eB:e2}],ja:'層呼吸',en:'Layer breathing',freqJa:'',freqEn:''};
    }
    const title=MODE_TABLE[mode]||MODE_TABLE.iLO;
    if(system==='mono'&&!strain&&phonons){
      const gamma=phonons.gamma_modes&&phonons.gamma_modes[mode];
      if(gamma){
        const ev=gamma.eigenvector;
        return {Q:[0,0],layers:[{eA:ev.slice(0,3),eB:ev.slice(3,6)}],ja:title.ja,en:title.en,
          freqJa:'DFT '+(Math.abs(gamma.frequency_cm)<0.002?0:Number(gamma.frequency_cm)).toFixed(1)+' cm⁻¹',
          freqEn:'DFT '+(Math.abs(gamma.frequency_cm)<0.002?0:Number(gamma.frequency_cm)).toFixed(1)+' cm⁻¹',
          isDft:true,bond:phonons.bond_nm};
      }
      if(mode==='KA1'){
        const kLabel=phonons.path_labels&&phonons.path_labels.find(p=>p.label==='K');
        const kNode=kLabel&&phonons.points[kLabel.index];
        const raw=kLabel&&phonons.branch_of[kLabel.index].indexOf(4);
        if(kNode&&raw>=0){
          const ev=kNode.eigenvectors[raw];
          return {Q:kNode.Q_nm_inv,layers:[{eA:ev.slice(0,3),eB:ev.slice(3,6)}],ja:title.ja,en:title.en,
            freqJa:'DFT '+Number(kNode.frequency_cm[raw]).toFixed(1)+' cm⁻¹',
            freqEn:'DFT '+Number(kNode.frequency_cm[raw]).toFixed(1)+' cm⁻¹',
            isDft:true,bond:phonons.bond_nm};
        }
      }
    }
    const base=title;
    const layers=system==='bilayer'?[{eA:base.eA,eB:base.eB},{eA:base.eA,eB:base.eB}]:[{eA:base.eA,eB:base.eB}];
    return {Q:base.Q,layers,ja:base.ja,en:base.en,freqJa:base.freqJa,freqEn:base.freqEn};
  }

  // The 54-atom hexagonal flake (circumcoronene shape, 19 fused hexagons)
  // shared by every lattice3d/phonons state. Hexagon centres form the same
  // triangular lattice as the atoms themselves, offset by c = (sqrt3*a/2,
  // a/2) from an A atom at the origin cell. Keeping hexagons whose centre
  // lies within 0.52 nm of the flake's own centre (19 of them, in shells of
  // 1+6+12) and then every atom that borders at least one kept hexagon
  // (within one bond length of its centre) gives exactly 54 atoms. The
  // geometry is cached separately for each bond length used by the views.
  const flakeCache=new Map();
  function makeFlake(bond){
    const key=Number(bond).toFixed(9);
    let cached=flakeCache.get(key);
    if(cached)return cached;
    const lat=P.lattice(bond),a1=lat.a1,a2=lat.a2;
    const hexC=[Math.sqrt(3)*bond/2,bond/2],centers=[];
    for(let n=-3;n<=3;n++)for(let m=-3;m<=3;m++){
      const Hx=n*a1[0]+m*a2[0]+hexC[0],Hy=n*a1[1]+m*a2[1]+hexC[1];
      if(Math.hypot(Hx-hexC[0],Hy-hexC[1])<=0.52*bond/P.C.a+1e-6)centers.push([Hx,Hy]);
    }
    const atoms=[],seen=new Set(),tol=bond*1.05;
    for(let n=-4;n<=4;n++)for(let m=-4;m<=4;m++){
      const Rx=n*a1[0]+m*a2[0],Ry=n*a1[1]+m*a2[1];
      for(let sIdx=0;sIdx<2;sIdx++){
        const px=Rx,py=Ry+(sIdx===1?bond:0);
        let near=false;
        for(const c of centers){if(Math.hypot(px-c[0],py-c[1])<=tol){near=true;break;}}
        if(!near)continue;
        const atomKey=px.toFixed(6)+','+py.toFixed(6)+','+sIdx;
        if(seen.has(atomKey))continue;seen.add(atomKey);
        atoms.push({R:[Rx,Ry],s:sIdx,eq:[px,py]});
      }
    }
    flakeCache.set(key,atoms);
    return atoms;
  }

  // Harmonic displacement u_s(R) = A * Re[e_s * exp(iQ.R-i phase)],
  // A = 0.028 nm * amp, over the 54-atom flake for one or two (AB-stacked)
  // layers. `system==='mono'` applies the strain map x -> x(1+ex),
  // y -> y(1+ey) to equilibrium positions.
  function buildAtoms(layers,Q,system,strain,amp,phase,bond=P.C.a){
    const flake=makeFlake(bond);
    const ex=strain/100,ey=-0.33*strain/100,A0=0.028*amp,phaseRad=phase*Math.PI/180;
    const positions=[],disp=[];
    for(let li=0;li<layers.length;li++){
      const layer=layers[li],zOff=li===0?0:0.335,yOff=li===0?0:bond;
      for(const atom of flake){
        const Rx=atom.R[0],Ry=atom.R[1];
        const theta=Q[0]*Rx+Q[1]*Ry-phaseRad,cq=Math.cos(theta),sq=Math.sin(theta);
        let px=atom.eq[0],py=atom.eq[1];
        if(system==='mono'&&strain){px=px*(1+ex);py=py*(1+ey);}
        py+=yOff;
        const e=atom.s===0?layer.eA:layer.eB;
        const dvec=[0,1,2].map(k=>A0*(e[k][0]*cq-e[k][1]*sq));
        positions.push({layer:li,s:atom.s,R:[Rx,Ry],pos:[px,py,zOff]});
        disp.push(dvec);
      }
    }
    return {positions,disp};
  }

  // Three.js scene cache, one per canvas, so repeated renders (drag, zoom,
  // phase animation) reuse the renderer/scene/geometries/materials instead
  // of rebuilding them every frame.
  const sceneCache=new WeakMap();
  function getTHREE(){
    if(typeof window!=='undefined'&&window.THREE)return window.THREE;
    if(typeof globalThis!=='undefined'&&globalThis.THREE)return globalThis.THREE;
    return null;
  }
  function getScene(canvas,THREE){
    let st=sceneCache.get(canvas);
    if(st)return st;
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
    renderer.setClearColor(0x000000,0);
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(30,1,0.05,50);
    camera.up.set(0,0,1);
    const dirLight=new THREE.DirectionalLight(0xffffff,0.9);
    dirLight.position.set(-1,1.2,1.6);
    camera.add(dirLight);
    scene.add(camera);
    scene.add(new THREE.HemisphereLight(0xffffff,0x6a6058,0.6));
    scene.add(new THREE.AmbientLight(0xffffff,0.25));
    st={renderer,scene,camera,lastW:0,lastH:0,
      geomCache:new Map(),
      matCache:new Map(),atomPool:[],bondPool:[],arrowPool:[]};
    sceneCache.set(canvas,st);
    return st;
  }

  // Ball-and-stick renderer shared by lattice3d and phonons. opts =
  // {positions, disp, bond, rotX, rotZ, zoom}. Rotation is about the flake's own
  // centroid so dragging never shifts the picture; the camera orbits it in
  // spherical coordinates (polar angle rotX from +z, azimuth rotZ), and zoom
  // divides the fitted distance so the flake always fills the frame at
  // zoom 1. Geometries and materials are cached per colour and reused.
  function render3D(canvas,width,height,opts,helpers){
    const THREE=getTHREE();
    if(!THREE)return;
    if(!width||!height)return;
    const st=getScene(canvas,THREE);
    const {renderer,scene,camera}=st;
    if(st.lastW!==width||st.lastH!==height){
      const ratio=Math.min(2,(typeof window!=='undefined'&&window.devicePixelRatio)||1);
      renderer.setPixelRatio(ratio);
      renderer.setSize(width,height,false);
      camera.aspect=width/Math.max(1,height);
      camera.updateProjectionMatrix();
      st.lastW=width;st.lastH=height;
    }
    const pal=helpers.palette(),a=Number(opts.bond)||P.C.a;
    const positions=opts.positions,disp=opts.disp,n=positions.length;
    const arrowBaseA=new THREE.Color(pal.colors[0]),arrowBaseB=new THREE.Color(pal.colors[2]);
    const colA=new THREE.Color(0x454545),colB=colA.clone(),colBond=colA.clone(),colPlate=new THREE.Color(pal.plate);
    const colA2=colA.clone().lerp(colPlate,0.30),colB2=colB.clone().lerp(colPlate,0.30),
      colBond2=colBond.clone().lerp(colPlate,0.30),black=new THREE.Color(0,0,0);
    function mat(color){
      const key=color.getHexString();
      let m=st.matCache.get(key);
      if(!m){m=new THREE.MeshStandardMaterial({color:color.clone(),roughness:0.45,metalness:0.05});st.matCache.set(key,m);}
      return m;
    }
    const geomKey=a.toFixed(9);
    let geoms=st.geomCache.get(geomKey);
    if(!geoms){
      geoms={
        atomGeom:new THREE.SphereGeometry(0.30*a,32,24),
        bondGeom:new THREE.CylinderGeometry(0.10*a,0.10*a,1,16),
        shaftGeom:new THREE.CylinderGeometry(0.045*a,0.045*a,1,12),
        coneGeom:new THREE.ConeGeometry(0.055*a,0.22*a,12)
      };
      st.geomCache.set(geomKey,geoms);
    }
    const {atomGeom,bondGeom,shaftGeom,coneGeom}=geoms;

    const eq=positions.map(p=>p.pos);
    const dp=positions.map((p,i)=>[p.pos[0]+disp[i][0],p.pos[1]+disp[i][1],p.pos[2]+disp[i][2]]);
    const c0=[0,0,0];
    for(const p of eq){c0[0]+=p[0];c0[1]+=p[1];c0[2]+=p[2];}
    c0[0]/=n;c0[1]/=n;c0[2]/=n;
    let Rb=0;
    for(const p of eq){const dx=p[0]-c0[0],dy=p[1]-c0[1],dz=p[2]-c0[2],d=Math.sqrt(dx*dx+dy*dy+dz*dz);if(d>Rb)Rb=d;}
    Rb+=0.30*a+0.06;

    const up=new THREE.Vector3(0,1,0);
    for(let i=0;i<n;i++){
      let mesh=st.atomPool[i];
      if(!mesh){mesh=new THREE.Mesh(atomGeom,colA);scene.add(mesh);st.atomPool.push(mesh);}
      mesh.visible=true;
      mesh.geometry=atomGeom;
      const p=positions[i],P3=dp[i];
      mesh.position.set(P3[0]-c0[0],P3[1]-c0[1],P3[2]-c0[2]);
      const base=p.s===0?colA:colB,shaded=p.layer===1?(p.s===0?colA2:colB2):base;
      mesh.material=mat(shaded);
    }
    for(let i=n;i<st.atomPool.length;i++)st.atomPool[i].visible=false;

    const bondLen=a;
    let bi=0;
    for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
      if(positions[i].layer!==positions[j].layer)continue;
      const dx=positions[i].pos[0]-positions[j].pos[0],dy=positions[i].pos[1]-positions[j].pos[1],dz=positions[i].pos[2]-positions[j].pos[2];
      if(Math.abs(Math.hypot(dx,dy,dz)-bondLen)>=bondLen*0.2)continue;
      let mesh=st.bondPool[bi];
      if(!mesh){mesh=new THREE.Mesh(bondGeom,colBond);scene.add(mesh);st.bondPool.push(mesh);}
      mesh.visible=true;
      mesh.geometry=bondGeom;
      const Pi=dp[i],Pj=dp[j];
      const vx=Pi[0]-Pj[0],vy=Pi[1]-Pj[1],vz=Pi[2]-Pj[2],len=Math.max(1e-6,Math.hypot(vx,vy,vz));
      mesh.position.set((Pi[0]+Pj[0])/2-c0[0],(Pi[1]+Pj[1])/2-c0[1],(Pi[2]+Pj[2])/2-c0[2]);
      mesh.scale.set(1,len,1);
      mesh.quaternion.setFromUnitVectors(up,new THREE.Vector3(vx,vy,vz).normalize());
      mesh.material=mat(positions[i].layer===1?colBond2:colBond);
      bi++;
    }
    for(let i=bi;i<st.bondPool.length;i++)st.bondPool[i].visible=false;

    let ai=0;
    for(let i=0;i<n;i++){
      const dv=disp[i],mag=Math.hypot(dv[0],dv[1],dv[2]);
      if(mag<0.006)continue;
      let grp=st.arrowPool[ai];
      if(!grp){
        const shaft=new THREE.Mesh(shaftGeom,colBond),cone=new THREE.Mesh(coneGeom,colBond);
        grp=new THREE.Group();grp.add(shaft);grp.add(cone);grp.userData={shaft,cone};
        scene.add(grp);st.arrowPool.push(grp);
      }
      grp.visible=true;
      // Origin sits just outside the displaced atom's own surface (radius
      // 0.30a + a small gap), pointing along the displacement, so the arrow
      // is never swallowed by the sphere; its length scales with |disp|.
      const dir=new THREE.Vector3(dv[0],dv[1],dv[2]).normalize(),q=new THREE.Quaternion().setFromUnitVectors(up,dir);
      const atomX=dp[i][0]-c0[0],atomY=dp[i][1]-c0[1],atomZ=dp[i][2]-c0[2];
      const originOffset=0.30*a+0.005;
      const p0x=atomX+dir.x*originOffset,p0y=atomY+dir.y*originOffset,p0z=atomZ+dir.z*originOffset;
      const len=Math.max(1e-6,4*mag);
      const headLen=Math.min(len*0.5,0.22*a),shaftLen=Math.max(1e-6,len-headLen);
      const shaft=grp.userData.shaft,cone=grp.userData.cone;
      shaft.geometry=shaftGeom;cone.geometry=coneGeom;
      shaft.position.set(p0x+dir.x*shaftLen/2,p0y+dir.y*shaftLen/2,p0z+dir.z*shaftLen/2);
      shaft.scale.set(1,shaftLen,1);shaft.quaternion.copy(q);
      cone.position.set(p0x+dir.x*(shaftLen+headLen/2),p0y+dir.y*(shaftLen+headLen/2),p0z+dir.z*(shaftLen+headLen/2));
      cone.quaternion.copy(q);
      const atomColor=positions[i].s===0?arrowBaseA:arrowBaseB,arrowColor=atomColor.clone().lerp(black,0.35);
      shaft.material=mat(arrowColor);cone.material=mat(arrowColor);
      ai++;
    }
    for(let i=ai;i<st.arrowPool.length;i++)st.arrowPool[i].visible=false;

    const fov=camera.fov*Math.PI/180;
    const d0=Rb/Math.sin(fov/2)*Math.max(1,height/width)*1.05;
    const d=d0/(opts.zoom||1);
    const polar=(opts.rotX||0)*Math.PI/180,az=(opts.rotZ||0)*Math.PI/180;
    camera.position.set(d*Math.sin(polar)*Math.cos(az),d*Math.sin(polar)*Math.sin(az),d*Math.cos(polar));
    camera.lookAt(0,0,0);
    renderer.render(scene,camera);
  }

  function kindLattice3d(s,d,lang,helpers){
    const t=helpers.t,fmt=helpers.fmt;
    const system=s.system==='bilayer'?'bilayer':'mono';
    const mode=String(s.mode);
    const strain=Number(s.strain)||0,amp=Number(s.amp)||1,phase=Number(s.phase)||0;
    const rotX=Number(s.rotX),rotZ=Number(s.rotZ),zoom=Number(s.zoom)||1;
    const r=resolveMode(system,mode,strain,d.phonons);
    const bond=r.isDft?Number(r.bond)||P.C.a:P.C.a;
    let jaTitle=r.ja,enTitle=r.en,jaFreq=r.freqJa,enFreq=r.freqEn;
    if(strain>0&&(mode==='iLO'||mode==='iTO')){
      const vm=P.strainModes(strain/100,-0.33*strain/100);
      if(mode==='iLO'){
        jaTitle+='（G⁻：引っ張り方向）';enTitle+=' (G⁻, along the pull)';
        jaFreq='約 '+fmt(vm.parallel,0)+' cm⁻¹';enFreq='about '+fmt(vm.parallel,0)+' cm⁻¹';
      }else{
        jaTitle+='（G⁺：引っ張りと直角）';enTitle+=' (G⁺, across the pull)';
        jaFreq='約 '+fmt(vm.perpendicular,0)+' cm⁻¹';enFreq='about '+fmt(vm.perpendicular,0)+' cm⁻¹';
      }
    }
    const title=t(jaTitle,enTitle),freqText=t(jaFreq,enFreq);
    const result=freqText?title+t('、',', ')+freqText:title;
    const built=buildAtoms(r.layers,r.Q,system,strain,amp,phase,bond);
    const panel={height:320,title,gl:true,render(canvas,width,height){
      render3D(canvas,width,height,{positions:built.positions,disp:built.disp,bond,rotX,rotZ,zoom},helpers);
    }};
    return {panels:[panel],result,outputs:{phase:phase+'°',rotX:rotX+'°',rotZ:rotZ+'°',strain:fmt(strain,1)+' %'},values:{system,mode,strain_pct:strain}};
  }

  // Dispersion map (panel 1) + lattice view (panel 2, gl) shown side by side
  // (ui.js lays panels out by widthFraction). Branch b's energy index at
  // node n is mb(n,b)=branch_of[n].indexOf(b): raw energy order swaps which
  // branch is highest away from Γ, so curves, markers and the 3D eigenvector
  // all go through mb() to track the physical branch.

  function phononCardMap(ctx,w,h,curves,opts,selected,helpers){
    const g=helpers.pen(ctx),pal=helpers.palette(),t=helpers.t;
    const compact=w<260,L=compact?54:66,R=compact?10:16,T=18,H=h-T-(compact?52:60);
    const style=typeof document!=='undefined'?getComputedStyle(document.documentElement):null;
    const surface=style?style.getPropertyValue('--color-bg').trim():pal.plate;
    const fontFamily=style?.getPropertyValue('--gothic').trim()||'sans-serif';
    const xmax=curves[0].points.at(-1)[0];
    const X=x=>L+x/xmax*(w-L-R),Y=y=>T+H-y/1700*H;
    const map={L,R,T,H,w,X,Y,invX:x=>(x-L)/(w-L-R)*xmax};
    const text=(x,y,str,size=13,align='left',color=pal.ink,bold=false)=>{
      const fontSize=compact?Math.max(9,Math.round(size*.8)):size;
      ctx.font=(bold?'700 ':'500 ')+fontSize+'px '+fontFamily;ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='alphabetic';ctx.fillText(str,x,y);
    };
    const button=typeof document!=='undefined'?document.querySelector('#phonon-map .gfig-btn'):null;
    const controlSize=button?parseFloat(getComputedStyle(button).fontSize):13;
    ctx.save();ctx.translate(compact?21:25,T+H/2);ctx.rotate(-Math.PI/2);
    ctx.font='500 '+controlSize+'px '+fontFamily;ctx.fillStyle=pal.ink;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText(t('振動数（cm⁻¹）','Frequency (cm⁻¹)'),0,0);ctx.restore();
    for(const y of[0,500,1000,1500]){
      ctx.globalAlpha=.19;g.line(L,Y(y),w-R,Y(y),pal.grid,.8);ctx.globalAlpha=1;text(L-7,Y(y)+4,String(y),11,'right');
    }
    for(const[x,label]of opts.xticks){
      ctx.globalAlpha=.55;g.line(X(x),T,X(x),T+H,pal.axis,1);ctx.globalAlpha=1;
      text(X(x),T+H+(compact?14:18),label,12,'center');
    }
    ctx.font='500 '+controlSize+'px '+fontFamily;ctx.fillStyle=pal.ink;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText(t('波数ベクトル Q','Wavevector Q'),(L+w-R)/2,h-(compact?12:14));
    ctx.save();ctx.beginPath();ctx.rect(L,T,w-L-R,H);ctx.clip();
    const stroke=(curve,color,width,alpha=1)=>{
      ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.beginPath();curve.points.forEach((p,i)=>i?ctx.lineTo(X(p[0]),Y(p[1])):ctx.moveTo(X(p[0]),Y(p[1])));ctx.stroke();ctx.globalAlpha=1;
    };
    curves.forEach((c,i)=>{if(i!==selected)stroke(c,pal.colors[i],1.4,.82);});
    stroke(curves[selected],pal.colors[selected],3.1);
    const segments=curves.flatMap(c=>c.points.slice(1).map((p,i)=>[X(c.points[i][0]),Y(c.points[i][1]),X(p[0]),Y(p[1])]));
    const overlapsCurve=box=>segments.some(([x1,y1,x2,y2])=>{
      const left=box.x-3,right=box.x+box.w+3,top=box.y-3,bottom=box.y+box.h+3;
      if(x2<left||x1>right||y1<top&&y2<top||y1>bottom&&y2>bottom)return false;
      const xa=Math.max(left,Math.min(right,Math.min(x1,x2))),xb=Math.min(right,Math.max(x1,x2));
      if(xb<xa)return false;
      const dx=x2-x1||1,ya=y1+(y2-y1)*(xa-x1)/dx,yb=y1+(y2-y1)*(xb-x1)/dx;
      return Math.max(ya,yb)>=top&&Math.min(ya,yb)<=bottom;
    });
    const highlight=opts.highlight;
    if(highlight){
      const curve=curves[highlight.curveIndex];
      const points=[];
      for(let i=1;i<curve.points.length;i++){
        const a=curve.points[i-1],b=curve.points[i],lo=Math.max(highlight.x0,a[0]),hi=Math.min(highlight.x1,b[0]);
        if(hi<lo)continue;
        const value=x=>a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]||1);
        const start=[lo,value(lo)],end=[hi,value(hi)];
        if(!points.length||Math.abs(points[points.length-1][0]-start[0])>1e-9)points.push(start);
        if(!points.length||Math.abs(points[points.length-1][0]-end[0])>1e-9)points.push(end);
      }
      if(points.length>1){
        ctx.strokeStyle=pal.colors[highlight.colorIndex===undefined?1:highlight.colorIndex];ctx.lineWidth=5.2;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
        points.forEach((p,i)=>i?ctx.lineTo(X(p[0]),Y(p[1])):ctx.moveTo(X(p[0]),Y(p[1])));ctx.stroke();ctx.lineCap='butt';
      }
    }
    g.line(X(opts.guides[0][0]),T,X(opts.guides[0][0]),T+H,pal.axis,1.3,true);
    ctx.restore();
    g.line(L,T,w-R,T);g.line(w-R,T,w-R,T+H);g.line(L,T,L,T+H);g.line(L,T+H,w-R,T+H);
    // Keep each label in its requested quadrant without covering a branch.
    const annotationBoxes=[];
    (opts.markers||[]).forEach((m,i)=>{
      const x=X(m[0]),y=Y(m[1]),label=m[2].replaceAll(' ',''),color=pal.colors[m[3]],size=compact?9:11,gap=4;
      ctx.font='700 '+size+'px '+fontFamily;
      const bw=ctx.measureText(label).width+2,bh=size+2;
      let box;
      for(let offset=0;offset<=140&&!box;offset+=2){
        for(let dx=0;dx<=Math.min(48,offset);dx+=2){
          const dy=offset-dx,candidate={x:x+gap+dx,y:i?y-gap-bh-dy:y+gap+dy,w:bw,h:bh,label,point:[x,y]};
          if(candidate.x+bw>w-R-2||candidate.y<4||candidate.y+bh>T+H-3)continue;
          if(overlapsCurve(candidate))continue;
          if(annotationBoxes.some(r=>candidate.x<r.x+r.w&&candidate.x+bw>r.x&&candidate.y<r.y+r.h&&candidate.y+bh>r.y))continue;
          box=candidate;break;
        }
      }
      if(!box)box={x:x+gap,y:i?4:y+gap,w:bw,h:bh,label,point:[x,y]};
      annotationBoxes.push(box);
      ctx.fillStyle=surface;ctx.fillRect(box.x,box.y,box.w,box.h);
      ctx.fillStyle=color;ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText(label,box.x+1,box.y+1);
      g.circle(x,y,3.6,color);
    });
    if(highlight){
      const curve=curves[highlight.curveIndex],center=(highlight.x0+highlight.x1)/2;
      const freq=helpers.interpolate(curve.points,center),x=X(center),y=Y(freq),size=compact?9:11;
      ctx.font='700 '+size+'px '+fontFamily;const label=highlight.label,bw=ctx.measureText(label).width+4,bh=size+3;
      const gap=compact?10:14;
      const candidates=[
        {x:x-bw/2,y:y-bh-gap},
        {x:x-bw/2,y:y+gap},
        {x:x-bw-gap,y:y-bh/2},
        {x:x+gap,y:y-bh/2}
      ];
      const inside=box=>box.x>=L+2&&box.x+box.w<=w-R-2&&box.y>=T+2&&box.y+box.h<=T+H-2;
      const placed=candidates.find(box=>inside(box)&&!overlapsCurve(box))||candidates[0];
      const bx=placed.x,by=placed.y;
      ctx.fillStyle=surface;ctx.fillRect(bx,by,bw,bh);ctx.fillStyle=pal.colors[highlight.colorIndex===undefined?1:highlight.colorIndex];ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText(label,bx+2,by+1);
    }
    const marker=opts.selectedMarker;if(marker)g.circle(X(marker[0]),Y(marker[1]),5,pal.colors[0]);
    return {map,annotationBoxes};
  }

  function kindPhonons(s,d,lang,helpers){
    const t=helpers.t,fmt=helpers.fmt,chart=helpers.chart;
    const phase=Number(s.phase)||0,rotX=Number(s.rotX),rotZ=Number(s.rotZ),zoom=Number(s.zoom)||1;
    const cards=s.presentation==='cards',panelHeight=cards?350:300;
    const labels=d.phonons.path_labels,pts=d.phonons.points;
    const clampIndex=(value,max)=>Math.max(0,Math.min(max,Number.isFinite(value)?Math.round(value):0));
    const idx=clampIndex(Number(s.node),pts.length-1),m=clampIndex(Number(s.mode),5),node=pts[idx];
    const names=d.phonons.branch_names;
    const mb=(nn,b)=>d.phonons.branch_of[nn].indexOf(b);
    const kLabel=labels.find(l=>l.label==='K')||labels[1],kIdx=clampIndex(kLabel.index,pts.length-1),kNode=pts[kIdx];
    const gFreq=pts[0].frequency_cm[mb(0,5)],kFreq=kNode.frequency_cm[mb(kIdx,4)];
    const exact=labels.find(l=>l.index===idx);
    let pos;
    if(exact)pos=exact.label;
    else{
      const before=labels.filter(l=>l.index<idx),a=before[before.length-1],b2=labels.find(l=>l.index>idx);
      pos=a.label+'→'+b2.label+' '+Math.round(100*(node.distance_nm_inv-pts[a.index].distance_nm_inv)/(pts[b2.index].distance_nm_inv-pts[a.index].distance_nm_inv))+'%';
    }
    const freqSel=node.frequency_cm[mb(idx,m)];
    const curves=Array.from({length:6},(_,b)=>({points:pts.map((p,nn)=>[p.distance_nm_inv,p.frequency_cm[mb(nn,b)]]),name:names[b],width:b===m?2.4:1,legendWidth:b===m?3.4:1.8}));
    const kWindow=18,kLeftIdx=Math.max(0,kIdx-kWindow),kRightIdx=Math.min(pts.length-1,kIdx+kWindow);
    const chartOpts={xlabel:'',ylabel:t('振動数（cm⁻¹）','Frequency (cm⁻¹)'),ydomain:[0,1700],
      xticks:labels.map(p=>[pts[p.index].distance_nm_inv,p.label]),
      vlines:labels.slice(1,-1).map(p=>pts[p.index].distance_nm_inv),
      legendOffset:44,
      markers:[[0,gFreq,'G',3]],
      selectedMarker:[node.distance_nm_inv,freqSel],
      highlight:{curveIndex:4,x0:pts[kLeftIdx].distance_nm_inv,x1:pts[kRightIdx].distance_nm_inv,label:'D・2D',colorIndex:1},
      guides:[[node.distance_nm_inv,'']]} ;
    const ev=node.eigenvectors[mb(idx,m)];
    const bond=Number(d.phonons.bond_nm)||P.C.a;
    const built=buildAtoms([{eA:[ev[0],ev[1],ev[2]],eB:[ev[3],ev[4],ev[5]]}],node.Q_nm_inv,'mono',0,1,phase,bond);
    const displayFreq=Math.abs(freqSel)<0.002?0:freqSel;
    const latticeTitle=names[m]+' '+fmt(displayFreq,0)+' cm⁻¹';
    const result=t('選んだ振動：','Selected vibration: ')+pos+t('、',', ')+names[m]+t('、',', ')+fmt(displayFreq,0)+' cm⁻¹';
    const mapPanel={
      height:panelHeight,title:t('フォノン分散 G、D・2D','Phonon dispersion with G and D / 2D'),widthFraction:0.56,
      draw(ctx,w,height=panelHeight){
        if(cards){this.mapPanel=phononCardMap(ctx,w,height,curves,chartOpts,m,helpers);return;}
        const map=chart(curves,{...chartOpts,height:300});
        map.draw(ctx,w);
        this.mapPanel=map;
      },
      hit(px,py,w){
        const mp=this.mapPanel&&this.mapPanel.map;
        if(!mp)return null;
        const legend=this.mapPanel.legend;
        if(legend&&px>=legend.x&&px<legend.x+legend.w&&py>=legend.y&&py<legend.y+6*legend.step/(legend.cols||1))return {mode:Math.floor((py-legend.y)/legend.step)*(legend.cols||1)+Math.floor((px-legend.x)/(legend.w/(legend.cols||1)))};
        if(px<mp.L||px>mp.w-mp.R||py<mp.T||py>mp.T+mp.H)return null;
        const xv=mp.invX(px);
        let bestN=0,bestD=Infinity;
        for(let nn=0;nn<pts.length;nn++){const dd=Math.abs(pts[nn].distance_nm_inv-xv);if(dd<bestD){bestD=dd;bestN=nn;}}
        let bestB=0,bestDy=Infinity;
        for(let b=0;b<6;b++){const yy=mp.Y(pts[bestN].frequency_cm[mb(bestN,b)]),dy=Math.abs(yy-py);if(dy<bestDy){bestDy=dy;bestB=b;}}
        return {node:bestN,mode:bestB};
      },
      rotatable(){return false;}
    };
    const glPanel={
      height:panelHeight,gl:true,widthFraction:0.44,title:latticeTitle,
      render(canvas,width,height){
        render3D(canvas,width,height,{positions:built.positions,disp:built.disp,bond,rotX,rotZ,zoom},helpers);
      }
    };
    return {panels:[mapPanel,glPanel],result,outputs:{node:pos},values:{node,selected_mode:m,phase_deg:phase,source:d.phonons.source_id}};
  }

  function kindDefectDisks(s,d,lang,helpers){
    const t=helpers.t,fmt=helpers.fmt,chart=helpers.chart,range=helpers.range,pen=helpers.pen,palette=helpers.palette;
    const ld=Number(s.ld)||7,L=60;
    const n=Math.min(400,Math.round((L*L)/(Math.PI*ld*ld)));
    let seed=12345;
    const rnd=()=>{seed=(1103515245*seed+12345)%2147483648;return seed/2147483648;};
    const defects=[];
    for(let i=0;i<n;i++)defects.push([rnd()*L,rnd()*L]);
    const rA=3.1,rS=1.0,GRID=240,cell=L/GRID;
    const status=new Uint8Array(GRID*GRID);
    const mark=(cx,cy,r,level)=>{
      const i0=Math.max(0,Math.floor((cx-r)/cell)),i1=Math.min(GRID-1,Math.ceil((cx+r)/cell));
      const j0=Math.max(0,Math.floor((cy-r)/cell)),j1=Math.min(GRID-1,Math.ceil((cy+r)/cell));
      for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){
        const gx=(i+0.5)*cell,gy=(j+0.5)*cell,dx=gx-cx,dy=gy-cy;
        if(dx*dx+dy*dy<=r*r){const idx=j*GRID+i;if(status[idx]<level)status[idx]=level;}
      }
    };
    for(const p of defects)mark(p[0],p[1],rA,1);
    for(const p of defects)mark(p[0],p[1],rS,2);
    let nD=0,nA=0;const total=GRID*GRID;
    for(let k=0;k<total;k++){if(status[k]===2)nD++;else if(status[k]===1)nA++;}
    const fS=nD/total,fA=(nD+nA)/total;
    const title1=t('欠陥の間隔 ','Defect spacing ')+ld+' nm';
    const panel1={height:320,title:title1,draw(ctx,w){
      const g=pen(ctx),pal=palette();
      const pad=30,top=34,avail=Math.min(w-2*pad,320-top-16),left=(w-avail)/2,sc=avail/L;
      g.text(10,21,title1,13);
      ctx.strokeStyle=pal.axis;ctx.lineWidth=1;ctx.strokeRect(left,top,avail,avail);
      ctx.globalAlpha=0.35;
      for(const p of defects)g.circle(left+p[0]*sc,top+p[1]*sc,rA*sc,pal.colors[2]);
      ctx.globalAlpha=0.9;
      for(const p of defects)g.circle(left+p[0]*sc,top+p[1]*sc,rS*sc,pal.colors[3]);
      ctx.globalAlpha=1;
    }};
    const curve=range(Math.log10(0.7),2,200).map(x=>[x,P.defectTrajectory(Math.pow(10,x),2.41)]);
    const panel2=chart([{points:curve,name:t('経験模型','Empirical model')}],{
      xlabel:t('欠陥の間隔 LD (nm)：左ほど多い','Defect spacing LD (nm): denser on the left'),
      ylabel:'HD/HG',height:300,
      xticks:[1,2,3,5,10,30,100].map(x=>[Math.log10(x),String(x)]),
      ydomain:[0,Math.max(5.5,...curve.map(p=>p[1]*1.1))],
      markers:[[Math.log10(ld),P.defectTrajectory(ld,2.41)]]
    });
    const result=t('D を作る面積 ','Area producing D ')+fmt(100*fA,0)+'%'+t('、壊れた面積 ',', damaged area ')+fmt(100*fS,0)+'%';
    return {panels:[panel1,panel2],result,outputs:{ld:ld+' nm'},values:{fA,fS,n}};
  }

  Views.registerKind('lattice3d',kindLattice3d);
  Views.registerKind('phonons',kindPhonons);
  Views.registerKind('defectdisks',kindDefectDisks);
});
