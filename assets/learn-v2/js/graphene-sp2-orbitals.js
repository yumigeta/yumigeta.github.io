(function () {
  'use strict';

  // Textbook schematic: large forward / small rear sp2 lobes and equal pz lobes.
  // These smooth teardrops are illustrative geometry, not wavefunction isosurfaces.

  var canvas = document.getElementById('sp2-orbital-model');
  if (!canvas) return;

  var fallback = canvas.parentElement.querySelector('.sp2-model-fallback');
  var THREE = window.THREE;
  if (!THREE) {
    canvas.hidden = true;
    if (fallback) fallback.hidden = false;
    return;
  }

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  } catch (error) {
    canvas.hidden = true;
    if (fallback) fallback.hidden = false;
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
  camera.up.set(0, 0, 1);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8b8173, 0.65));
  var keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
  keyLight.position.set(4, -5, 8);
  scene.add(keyLight);
  var fillLight = new THREE.DirectionalLight(0xd9eff2, 0.35);
  fillLight.position.set(-5, 4, 2);
  scene.add(fillLight);

  var root = new THREE.Group();
  scene.add(root);

  var positiveMaterial = new THREE.MeshPhongMaterial({
    color: 0xc33a32,
    specular: 0x333333,
    shininess: 28,
    transparent: false,
    side: THREE.DoubleSide,
    depthWrite: true
  });
  var negativeMaterial = new THREE.MeshPhongMaterial({
    color: 0x267e88,
    specular: 0x333333,
    shininess: 28,
    transparent: false,
    side: THREE.DoubleSide,
    depthWrite: true
  });
  var carbonMaterial = new THREE.MeshStandardMaterial({ color: 0x292722, roughness: 0.38, metalness: 0.05 });
  var contextPositive=positiveMaterial.clone(),contextNegative=negativeMaterial.clone();
  [contextPositive,contextNegative].forEach(function(material){material.transparent=true;material.opacity=.3;material.depthWrite=false;});
  var hybrids=new THREE.Group(),pz=new THREE.Group(),hybridGuides=new THREE.Group();
  hybrids.userData.orbitalType='sp2';pz.userData.orbitalType='pz';
  root.add(hybrids,pz,hybridGuides);
  function addOrbitalLobe(geometry, material, direction, parent, index) {
    var mesh = new THREE.Mesh(geometry, material);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.clone().normalize());
    mesh.userData.orbitalIndex = index;
    mesh.userData.phase=material===positiveMaterial?1:-1;
    parent.add(mesh);
    return mesh;
  }
  var modelMode = 'all';
  function focusGroup(group,type){
    group.visible=true;var focus=modelMode==='all'||modelMode===type;
    group.children.forEach(function(mesh){if(!mesh.isMesh)return;mesh.visible=true;mesh.material=mesh.userData.phase>0?(focus?positiveMaterial:contextPositive):(focus?negativeMaterial:contextNegative);});
  }
  function updateMode(){
    focusGroup(hybrids,'sp2');focusGroup(pz,'pz');
    (structureSp2Groups||[]).forEach(function(group){focusGroup(group,'sp2');});
    (structurePzGroups||[]).forEach(function(group){focusGroup(group,'pz');});
    if(typeof yaw==='number')updateOrbitalAlternatives();
  }
  document.querySelectorAll('[data-sp2-mode]').forEach(function (button) {
    button.addEventListener('click', function () {
      modelMode = button.dataset.sp2Mode;
      document.querySelectorAll('[data-sp2-mode]').forEach(function (b) {
        var active = b === button;
        b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active));
      });
      updateMode();
    });
  });
  function lobeGeometry(length, width) {
    var points = [];
    for (var i = 0; i <= 64; i++) {
      var t = (1 - Math.cos(Math.PI * i / 64)) / 2;
      // A pointed root and rounded outer end; width is the maximum radius.
      var radius = width * 3 * Math.sqrt(3) / 2 * t * Math.sqrt(1 - t);
      points.push(new THREE.Vector2(radius, length * t));
    }
    var geometry = new THREE.LatheGeometry(points, 64);
    geometry.rotateX(Math.PI / 2); // Lathe's +y axis becomes our local +z.
    return geometry;
  }
  var frontLobe = lobeGeometry(2.8, 0.7);
  var rearLobe = lobeGeometry(0.85, 0.25);
  var pLobe = lobeGeometry(2.4, 0.65);
  [0, 2 * Math.PI / 3, 4 * Math.PI / 3].forEach(function (phi, index) {
    var direction = new THREE.Vector3(Math.cos(phi), Math.sin(phi), 0);
    addOrbitalLobe(frontLobe, positiveMaterial, direction, hybrids, index);
    addOrbitalLobe(rearLobe, negativeMaterial, direction.clone().negate(), hybrids, index);
  });
  addOrbitalLobe(pLobe, positiveMaterial, new THREE.Vector3(0, 0, 1), pz, 0);
  addOrbitalLobe(pLobe, negativeMaterial, new THREE.Vector3(0, 0, -1), pz, 0);
  updateMode();

  var plane = new THREE.Mesh(
    new THREE.CircleGeometry(3.75, 96),
    new THREE.MeshBasicMaterial({ color: 0xb7aa93, transparent: true, opacity: 0.095, side: THREE.DoubleSide, depthWrite: false })
  );
  plane.position.z = -0.018;
  plane.renderOrder = -2;
  root.add(plane);

  var planeEdgePoints = [];
  for (var edgeIndex = 0; edgeIndex < 96; edgeIndex += 1) {
    var edgePhi = edgeIndex / 96 * Math.PI * 2;
    planeEdgePoints.push(new THREE.Vector3(3.75 * Math.cos(edgePhi), 3.75 * Math.sin(edgePhi), 0));
  }
  var planeEdge = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(planeEdgePoints),
    new THREE.LineBasicMaterial({ color: 0x948874, transparent: true, opacity: 0.42 })
  );
  root.add(planeEdge);

  var atomGeometry = new THREE.SphereGeometry(0.1, 24, 16);
  var centralAtom = new THREE.Mesh(atomGeometry, carbonMaterial);
  root.add(centralAtom);

  [0, 2 * Math.PI / 3, 4 * Math.PI / 3].forEach(function (phi) {
    var direction = new THREE.Vector3(Math.cos(phi), Math.sin(phi), 0);
    var line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0,0,0), direction.multiplyScalar(3.7)
    ]), new THREE.LineDashedMaterial({color:0x948874,dashSize:0.1,gapSize:0.09}));
    line.computeLineDistances(); hybridGuides.add(line);
  });

  var zAxisMaterial = new THREE.LineDashedMaterial({ color: 0x6e665b, dashSize: 0.12, gapSize: 0.09, transparent: true, opacity: 0.56 });
  var zAxis = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -3.8), new THREE.Vector3(0, 0, 3.8)]),
    zAxisMaterial
  );
  zAxis.computeLineDistances();
  root.add(zAxis);
  [new THREE.Vector3(1,0,0),new THREE.Vector3(0,1,0)].forEach(function(d){var axis=new THREE.Line(new THREE.BufferGeometry().setFromPoints([d.clone().multiplyScalar(-3.8),d.clone().multiplyScalar(3.8)]),zAxisMaterial);axis.computeLineDistances();root.add(axis);});

  function angleArc(start, end, radius) {
    var points = [];
    for (var i = 0; i <= 32; i += 1) {
      var phi = start + (end - start) * i / 32;
      points.push(new THREE.Vector3(radius * Math.cos(phi), radius * Math.sin(phi), 0.025));
    }
    var line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: 0xb04439, transparent: true, opacity: 0.68 })
    );
    hybridGuides.add(line);
  }
  angleArc(0.18, 2 * Math.PI / 3 - 0.18, 2.18);
  angleArc(2 * Math.PI / 3 + 0.18, 4 * Math.PI / 3 - 0.18, 2.18);
  angleArc(4 * Math.PI / 3 + 0.18, 2 * Math.PI - 0.18, 2.18);

  // Requested structural view: same orbital geometries, Phong shading and lighting.
  var structureCanvas=document.getElementById('sp2-structure-model');
  var structureRenderer,structureCamera,structureScene,structureRoot,structureBounds,structureVisible=true;
  var structureLabels=[],structureFitPoints=[],structureLabelLines={},structureSp2Groups=[],structurePzGroups=[];
  if(structureCanvas){
    try{
      structureRenderer=new THREE.WebGLRenderer({canvas:structureCanvas,antialias:true,alpha:true});
      structureRenderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));structureRenderer.setClearColor(0x000000,0);
      structureScene=new THREE.Scene();structureCamera=new THREE.PerspectiveCamera(34,1,.1,200);structureCamera.up.set(0,0,1);
      structureScene.add(new THREE.HemisphereLight(0xffffff,0x8b8173,.65));
      var skey=new THREE.DirectionalLight(0xffffff,.85);skey.position.set(4,-5,8);structureScene.add(skey);
      var sfill=new THREE.DirectionalLight(0xd9eff2,.35);sfill.position.set(-5,4,2);structureScene.add(sfill);
      structureRoot=new THREE.Group();structureScene.add(structureRoot);
      var bond=5.2,sd=[new THREE.Vector3(bond,0,0),new THREE.Vector3(-bond/2,Math.sqrt(3)*bond/2,0),new THREE.Vector3(-bond/2,-Math.sqrt(3)*bond/2,0)];
      var centerShift=new THREE.Vector3(bond/2,Math.sqrt(3)*bond/4,0);
      var atoms=[new THREE.Vector3(0,0,0),sd[0].clone(),new THREE.Vector3(1.5*bond,Math.sqrt(3)*bond/2,0),new THREE.Vector3(bond,Math.sqrt(3)*bond,0),new THREE.Vector3(0,Math.sqrt(3)*bond,0),sd[1].clone(),sd[2].clone()].map(function(p){return p.sub(centerShift);});
      var guideCopy=hybridGuides.clone(true);guideCopy.visible=true;guideCopy.position.copy(atoms[0]);structureRoot.add(guideCopy);
      var bonds=[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[0,6]];
      var carbon=new THREE.SphereGeometry(.12,24,16);
      atoms.forEach(function(p,index){
        var atom=new THREE.Mesh(carbon,carbonMaterial);atom.position.copy(p);structureRoot.add(atom);
        var group=new THREE.Group();group.position.copy(p);group.userData.orbitalType='pz';group.userData.carbonIndex=index;structureRoot.add(group);structurePzGroups.push(group);
        addOrbitalLobe(pLobe,positiveMaterial,new THREE.Vector3(0,0,1),group,index);
        addOrbitalLobe(pLobe,negativeMaterial,new THREE.Vector3(0,0,-1),group,index);
        var sp2Group=new THREE.Group(),siteSign=[0,2,4].indexOf(index)>=0?1:-1;
        sp2Group.position.copy(p);sp2Group.userData.orbitalType='sp2';sp2Group.userData.carbonIndex=index;structureRoot.add(sp2Group);structureSp2Groups.push(sp2Group);
        [0,2*Math.PI/3,4*Math.PI/3].forEach(function(phi,directionIndex){var direction=new THREE.Vector3(siteSign*Math.cos(phi),siteSign*Math.sin(phi),0);addOrbitalLobe(frontLobe,positiveMaterial,direction,sp2Group,directionIndex);addOrbitalLobe(rearLobe,negativeMaterial,direction.clone().negate(),sp2Group,directionIndex);});
      });
      var plusOverlap=positiveMaterial.clone();plusOverlap.transparent=true;plusOverlap.opacity=.14;plusOverlap.depthWrite=false;
      var minusOverlap=negativeMaterial.clone();minusOverlap.transparent=true;minusOverlap.opacity=.14;minusOverlap.depthWrite=false;
      var overlapGeometry=new THREE.SphereGeometry(1,24,16);
      bonds.forEach(function(pair){
        var A=atoms[pair[0]],B=atoms[pair[1]],direction=B.clone().sub(A),length=direction.length(),mid=A.clone().add(B).multiplyScalar(.5);
        structureRoot.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([A,B]),new THREE.LineBasicMaterial({color:0x948874,transparent:true,opacity:.65})));
        [1,-1].forEach(function(sign){var overlap=new THREE.Mesh(overlapGeometry,sign>0?plusOverlap:minusOverlap);overlap.scale.set(length*.52,.4,.33);overlap.quaternion.setFromUnitVectors(new THREE.Vector3(1,0,0),direction.clone().normalize());overlap.position.copy(mid);overlap.position.z=sign*1.35;structureRoot.add(overlap);});
      });
      var structurePlane=new THREE.Mesh(new THREE.PlaneGeometry(bond*2.8,bond*3.3),new THREE.MeshBasicMaterial({color:0xb7aa93,transparent:true,opacity:.055,side:THREE.DoubleSide,depthWrite:false}));structurePlane.position.z=-.02;structurePlane.renderOrder=-2;structureRoot.add(structurePlane);
      // The faint plane is context, not a limit on the required orbital model's fit.
      structureRoot.updateMatrixWorld(true);structureBounds=new THREE.Box3();
      structureRoot.traverse(function(object){if(object===structurePlane||!object.geometry)return;object.geometry.computeBoundingBox();var b=object.geometry.boundingBox;[b.min.x,b.max.x].forEach(function(x){[b.min.y,b.max.y].forEach(function(y){[b.min.z,b.max.z].forEach(function(z){var point=new THREE.Vector3(x,y,z).applyMatrix4(object.matrixWorld);structureFitPoints.push(point);structureBounds.expandByPoint(point);});});});});
      structureLabels=[{id:'sp2-label-hybrid',p:atoms[0].clone().add(new THREE.Vector3(1.6,-.8,.1)),side:-1,dy:12},{id:'sp2-label-sigma',p:atoms[0].clone().add(atoms[1]).multiplyScalar(.5),side:1,dy:18},{id:'sp2-label-pz',p:atoms[3].clone().add(new THREE.Vector3(0,0,2.6)),dx:12,dy:0},{id:'sp2-label-pi',p:atoms[3].clone().add(atoms[4]).multiplyScalar(.5).add(new THREE.Vector3(0,0,1.35)),dx:0,dy:-18}];
      structureLabels.forEach(function(label){var line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([label.p,label.p]),new THREE.LineBasicMaterial({color:0x948874,transparent:true,opacity:.65,depthTest:false}));line.renderOrder=2;structureScene.add(line);structureLabelLines[label.id]=line;});
      structureCanvas.dataset.threeRevision=THREE.REVISION;structureCanvas.dataset.atomCount=String(atoms.length);structureCanvas.dataset.bondCount=String(bonds.length);updateMode();
    }catch(error){structureCanvas.hidden=true;var unavailable=structureCanvas.parentElement.querySelector('.sp2-model-fallback');if(unavailable)unavailable.hidden=false;structureCanvas.dataset.renderFailure=error.message;}
  }
  function placeLabels(canvas,camera,labels){
    if(canvas===structureCanvas){placeStructureLabels();return;}
    var gap=parseFloat(getComputedStyle(canvas.closest('.learn-panel')).getPropertyValue('--panel-related-gap'));
    camera.updateMatrixWorld();var origin=new THREE.Vector3(0,0,0).project(camera);labels.forEach(function(label){var e=document.getElementById(label.id);if(!e)return;var p=label.p.clone().project(camera),hx=e.offsetWidth/2,hy=e.offsetHeight/2,dx=label.side?label.side*(gap+hx):(label.dx||0),x=(p.x+1)*canvas.clientWidth/2+dx,y=(1-p.y)*canvas.clientHeight/2+(label.dy||0);if(label.id==='sp2-axis-y'){var side=p.x<origin.x?-1:1;
      root.updateMatrixWorld(true);
      [hybrids,pz].forEach(function(group){group.children.forEach(function(mesh){if(!mesh.isMesh)return;mesh.geometry.computeBoundingBox();var b=mesh.geometry.boundingBox,left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;[b.min.x,b.max.x].forEach(function(bx){[b.min.y,b.max.y].forEach(function(by){[b.min.z,b.max.z].forEach(function(bz){var q=new THREE.Vector3(bx,by,bz).applyMatrix4(mesh.matrixWorld).project(camera),sx=(q.x+1)*canvas.clientWidth/2,sy=(1-q.y)*canvas.clientHeight/2;left=Math.min(left,sx);right=Math.max(right,sx);top=Math.min(top,sy);bottom=Math.max(bottom,sy);});});});if(x+hx>left&&x-hx<right&&y+hy>top&&y-hy<bottom)x=side<0?Math.min(x,left-gap-hx):Math.max(x,right+gap+hx);});});
    }var placedX=Math.max(gap+hx,Math.min(canvas.clientWidth-gap-hx,x)),placedY=Math.max(gap+hy,Math.min(canvas.clientHeight-gap-hy,y));
    if(label.id==='sp2-axis-y'){
      var xLabel=labels.find(function(item){return item.id==='sp2-axis-x';});
      if(xLabel){var xp=xLabel.p.clone().project(camera),ox=(origin.x+1)*canvas.clientWidth/2,oy=(1-origin.y)*canvas.clientHeight/2,rx=(xp.x-origin.x)*canvas.clientWidth/2,ry=(origin.y-xp.y)*canvas.clientHeight/2,rayLength=Math.hypot(rx,ry),along=rayLength?((placedX-ox)*rx+(placedY-oy)*ry)/(rayLength*rayLength):-1;
        var crossGap=rayLength?Math.abs((placedX-ox)*ry-(placedY-oy)*rx)/rayLength:Infinity,clearance=rayLength?(Math.abs(ry)*hx+Math.abs(rx)*hy)/rayLength+gap:0;
        if(along>0&&along<1&&crossGap<clearance)placedY=Math.max(gap+hy,Math.min(canvas.clientHeight-gap-hy,placedY+(p.y<origin.y?1:-1)*(2*hy+gap)));
      }
    }
    e.style.left=placedX+'px';e.style.top=placedY+'px';
    if(label.id==='sp2-axis-y')placeAtomicAxisLink(canvas,(p.x+1)*canvas.clientWidth/2,(1-p.y)*canvas.clientHeight/2,placedX,placedY,hx,hy,Math.abs(placedX-((p.x+1)*canvas.clientWidth/2+dx))>1||Math.abs(placedY-((1-p.y)*canvas.clientHeight/2+(label.dy||0)))>1);
    });
  }
  function placeAtomicAxisLink(canvas,px,py,x,y,hx,hy,moved){
    var stage=canvas.parentElement,svg=stage.querySelector('[data-sp2-axis-link]');
    if(!svg&&moved){var ns='http://www.w3.org/2000/svg';svg=document.createElementNS(ns,'svg');svg.setAttribute('data-sp2-axis-link','');svg.setAttribute('aria-hidden','true');svg.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible';var line=document.createElementNS(ns,'path');line.setAttribute('fill','none');line.setAttribute('stroke',getComputedStyle(canvas.closest('.learn-panel')).getPropertyValue('--color-neutral').trim());line.setAttribute('stroke-width','1');svg.appendChild(line);stage.appendChild(svg);}
    if(!svg)return;
    if(!moved){svg.firstChild.setAttribute('d','');return;}
    var vx=x-px,vy=y-py,edge=Math.min(1,vx?(hx+2)/Math.abs(vx):Infinity,vy?(hy+2)/Math.abs(vy):Infinity);
    svg.firstChild.setAttribute('d','M '+px+' '+py+' L '+(x-vx*edge)+' '+(y-vy*edge));
  }
  var atomFitPoints=[];
  root.updateMatrixWorld(true);
  root.traverse(function(object){if(!object.geometry)return;object.geometry.computeBoundingBox();var b=object.geometry.boundingBox;[b.min.x,b.max.x].forEach(function(x){[b.min.y,b.max.y].forEach(function(y){[b.min.z,b.max.z].forEach(function(z){atomFitPoints.push(new THREE.Vector3(x,y,z).applyMatrix4(object.matrixWorld));});});});});
  var orbitCalibrations=new WeakMap();
  function orbitGeometryRadius(group,pivot){
    var radiusSquared=0,point=new THREE.Vector3();group.updateMatrixWorld(true);
    group.traverse(function(object){if(object===structurePlane)return;var position=object.geometry&&object.geometry.getAttribute('position');if(!position)return;for(var i=0;i<position.count;i++){point.fromBufferAttribute(position,i).applyMatrix4(object.matrixWorld);radiusSquared=Math.max(radiusSquared,point.distanceToSquared(pivot));}});
    return Math.sqrt(radiusSquared);
  }
  function fitFixedViewport(target,points,center,width,height,padding){
    var calibrated=orbitCalibrations.get(target);
    if(!calibrated||calibrated.width!==width||calibrated.height!==height){
      var pivot=center.clone(),radius=orbitGeometryRadius(target===camera?root:structureRoot,pivot);
      if(target===camera)radius=Math.max(radius,4); // Keep all three positive axis-label anchors in the fixed bound.
      var tangent=Math.tan(target.fov*Math.PI/360),usable=Math.min((width-2*padding.x)/height,(height-padding.top-padding.bottom)/height),halfAngle=Math.atan(tangent*usable);
      calibrated={pivot:pivot,radius:radius,baseDistance:radius/Math.sin(halfAngle)*1.02,width:width,height:height,revision:calibrated?calibrated.revision+1:1};
      orbitCalibrations.set(target,calibrated);
      target.clearViewOffset();target.aspect=width/height;target.setViewOffset(width,height,0,(padding.bottom-padding.top)/2,width,height);target.updateProjectionMatrix();
      target.userData.orbitCalibration={pivot:pivot.toArray(),radius:radius,baseDistance:calibrated.baseDistance,width:width,height:height,revision:calibrated.revision};
    }
    var normal=new THREE.Vector3(Math.cos(elevation)*Math.cos(yaw),Math.cos(elevation)*Math.sin(yaw),Math.sin(elevation)),d=calibrated.baseDistance*(distance/14.5);
    target.position.copy(calibrated.pivot).addScaledVector(normal,d);target.lookAt(calibrated.pivot);target.updateMatrixWorld();
    // Conservative projected bounds are diagnostics only; they never feed calibration or orbit framing.
    var b={left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity};points.forEach(function(point){var p=point.clone().project(target),x=(p.x+1)*width/2,y=(1-p.y)*height/2;b.left=Math.min(b.left,x);b.right=Math.max(b.right,x);b.top=Math.min(b.top,y);b.bottom=Math.max(b.bottom,y);});
    return{distance:d,bounds:b};
  }
  function fitStructureCamera(){
    var width=structureCanvas.clientWidth,height=structureCanvas.clientHeight,gap=parseFloat(getComputedStyle(structureCanvas.closest('.learn-panel')).getPropertyValue('--panel-related-gap')),row=0;
    structureLabels.forEach(function(label){var e=document.getElementById(label.id);if(e)row=Math.max(row,e.offsetHeight);});
    var fit=fitFixedViewport(structureCamera,structureFitPoints,structureBounds.getCenter(new THREE.Vector3()),width,height,{x:gap,top:row+2*gap,bottom:row+2*gap});
    structureCanvas.dataset.fitDistance=String(fit.distance);structureCanvas.dataset.fitHeight=String(height);structureCanvas.dataset.fitLabelRow=String(row);structureCanvas.dataset.fitGap=String(gap);structureCanvas.dataset.projectedModelBounds=JSON.stringify(fit.bounds);
  }
  function placeStructureLabels(){
    var canvas=structureCanvas,camera=structureCamera,width=canvas.clientWidth,height=canvas.clientHeight,gap=parseFloat(canvas.dataset.fitGap),row=parseFloat(canvas.dataset.fitLabelRow);
    [['sp2-label-pi','sp2-label-pz'],['sp2-label-hybrid','sp2-label-sigma']].forEach(function(ids,index){
      var labels=ids.map(function(id){var label=structureLabels.find(function(l){return l.id===id;}),e=document.getElementById(id),p=label.p.clone().project(camera);return{label:label,e:e,p:p,x:(p.x+1)*width/2,w:e.offsetWidth};}).sort(function(a,b){return a.x-b.x;});
      var a=labels[0],b=labels[1],separation=(a.w+b.w)/2+gap;if(b.x-a.x<separation){var center=(a.x+b.x)/2;a.x=center-separation/2;b.x=center+separation/2;}
      var shift=Math.max(0,gap+a.w/2-a.x)-Math.max(0,b.x+b.w/2+gap-width);a.x+=shift;b.x+=shift;
      labels.forEach(function(entry){var y=index===0?gap+row/2:height-gap-row/2;entry.e.style.left=entry.x+'px';entry.e.style.top=y+'px';var endY=y+(index===0?entry.e.offsetHeight/2+gap/2:-entry.e.offsetHeight/2-gap/2),end=new THREE.Vector3(2*entry.x/width-1,1-2*endY/height,entry.p.z).unproject(camera);structureLabelLines[entry.label.id].geometry.setFromPoints([entry.label.p,end]);});
    });
  }
  function updateOrbitalAlternatives(){
    var ja=document.documentElement.getAttribute('data-lang')==='ja';
    var panel=canvas.closest('figure'),controls=panel.querySelector('.learn-panel-buttons'),choice=panel.querySelector('.learn-panel-button-row[role="group"]'),legend=panel.querySelector('.sp2-model-legend');
    if(controls)controls.setAttribute('aria-label',ja?'3Dモデルの操作':'3D model controls');
    if(choice)choice.setAttribute('aria-label',ja?'強調する軌道':'Orbital emphasis');
    if(legend)legend.setAttribute('aria-label',ja?'波動関数の符号':'Wavefunction sign');
    var azimuth=(((yaw*180/Math.PI+180)%360+360)%360-180).toFixed(1),altitude=(elevation*180/Math.PI).toFixed(1),view=ja?' 視点：方位'+azimuth+'°、仰角'+altitude+'°。':' View: azimuth '+azimuth+' degrees, elevation '+altitude+' degrees.',zoom=ja?' 表示倍率'+(14.5/distance).toFixed(2)+'倍。':' Display zoom '+(14.5/distance).toFixed(2)+' times.';
    var emphasis=modelMode==='all'?(ja?'全軌道。':'All orbitals.'):modelMode==='sp2'?(ja?'sp²を強調、p_zは半透明。':'sp2 emphasized; p_z translucent.'):(ja?'p_zを強調、sp²は半透明。':'p_z emphasized; sp2 translucent.');
    canvas.setAttribute('aria-label',(ja?'炭素原子の三方向sp²混成軌道と面外p_z軌道。xyはグラフェン面、zは面外。':'Three planar sp2 hybrid orbitals and an out-of-plane p_z orbital of a carbon atom. The xy plane is graphene and z is normal to it. ')+emphasis+view+zoom);
    canvas.dataset.mode=modelMode;canvas.dataset.yaw=String(yaw);canvas.dataset.elevation=String(elevation);canvas.dataset.distance=String(distance);canvas.dataset.threeRevision=THREE.REVISION;
    if(structureCanvas){structureCanvas.setAttribute('aria-label',(ja?'グラフェンの有限構造中のsp²とσ結合、面外p_z基底と側方重なりによるπ電子系の出発点。ローブと結合の重なりは模式表示。色は軌道の符号。':'Finite graphene structure: planar sp2/sigma bonding and out-of-plane pz basis orbitals with sidewise overlap as the basis for pi electronic states. Schematic orbital shapes and overlap; colors encode orbital signs.')+emphasis+view+zoom);structureCanvas.dataset.mode=modelMode;structureCanvas.dataset.yaw=String(yaw);structureCanvas.dataset.elevation=String(elevation);structureCanvas.dataset.distance=String(distance);}
  }
  function resizeStructure(){
    if(!structureRenderer)return;var width=Math.max(1,Math.round(structureCanvas.clientWidth)),height=Math.max(1,Math.round(structureCanvas.clientHeight));structureRenderer.setSize(width,height,false);structureCamera.aspect=width/height;structureCamera.updateProjectionMatrix();updateCamera();
  }

  var yaw = -Math.PI/2;
  var elevation = 0.42;
  var distance = 14.5;

  function updateCamera() {
    var gap=parseFloat(getComputedStyle(canvas.closest('.learn-panel')).getPropertyValue('--panel-related-gap'));
    var planeLabel=canvas.parentElement.querySelector('.sp2-plane-label'),top=(planeLabel?planeLabel.offsetHeight:0)+2*gap;
    var fit=fitFixedViewport(camera,atomFitPoints,new THREE.Vector3(0,0,0),canvas.clientWidth,canvas.clientHeight,{x:26,top:top,bottom:20});
    canvas.dataset.projectedModelBounds=JSON.stringify(fit.bounds);
    placeLabels(canvas,camera,[{id:'sp2-axis-x',p:new THREE.Vector3(4,0,0),dx:12},{id:'sp2-axis-y',p:new THREE.Vector3(0,4,0),dx:12},{id:'sp2-axis-z',p:new THREE.Vector3(0,0,4),dx:-12}]);
    if(structureCamera){fitStructureCamera();placeLabels(structureCanvas,structureCamera,structureLabels);}
    updateOrbitalAlternatives();
  }

  function setView(nextYaw, nextElevation, nextDistance) {
    yaw = nextYaw;
    elevation = nextElevation;
    distance = nextDistance;
    updateCamera();
  }

  function resetView() {
    modelMode = 'all';
    document.querySelectorAll('[data-sp2-mode]').forEach(function (button) {
      var active = button.dataset.sp2Mode === 'all';
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    updateMode();
    setView(-Math.PI/2, 0.42, 14.5);
  }
  updateCamera();

  function attachCameraControls(target){
  target.tabIndex=0;target.setAttribute('role','group');target.setAttribute('aria-keyshortcuts','ArrowLeft ArrowRight ArrowUp ArrowDown + - Home');
  target.addEventListener('keydown',function(event){
    var used=true;if(event.key==='ArrowLeft')yaw-=.08;else if(event.key==='ArrowRight')yaw+=.08;else if(event.key==='ArrowUp')elevation=Math.min(1.49,elevation+.06);else if(event.key==='ArrowDown')elevation=Math.max(-.08,elevation-.06);else if(event.key==='+'||event.key==='=')distance=Math.max(7,distance/1.1);else if(event.key==='-')distance=Math.min(19,distance*1.1);else if(event.key==='Home'){resetView();}else used=false;if(used){event.preventDefault();updateCamera();}
  });
  var pointers = new Map();
  var previousPinchDistance = 0;

  function pinchDistance() {
    var values = Array.from(pointers.values());
    if (values.length < 2) return 0;
    return Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
  }

  target.addEventListener('pointerdown', function (event) {
    target.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    previousPinchDistance = pinchDistance();
  });
  target.addEventListener('pointermove', function (event) {
    var previous = pointers.get(event.pointerId);
    if (!previous) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) {
      yaw -= (event.clientX - previous.x) * 0.008;
      elevation += (event.clientY - previous.y) * 0.006;
      elevation = Math.max(-0.08, Math.min(1.49, elevation));
    } else {
      var nextPinchDistance = pinchDistance();
      if (previousPinchDistance > 0 && nextPinchDistance > 0) {
        distance *= previousPinchDistance / nextPinchDistance;
        distance = Math.max(7, Math.min(19, distance));
      }
      previousPinchDistance = nextPinchDistance;
    }
    updateCamera();
  });
  function releasePointer(event) {
    pointers.delete(event.pointerId);
    previousPinchDistance = pinchDistance();
  }
  target.addEventListener('pointerup', releasePointer);
  target.addEventListener('pointercancel', releasePointer);
  target.addEventListener('wheel', function (event) {
    event.preventDefault();
    distance *= Math.exp(event.deltaY * 0.001);
    distance = Math.max(7, Math.min(19, distance));
    updateCamera();
  }, { passive: false });

  }
  attachCameraControls(canvas);
  if(structureRenderer)attachCameraControls(structureCanvas);
  new MutationObserver(updateOrbitalAlternatives).observe(document.documentElement,{attributes:true,attributeFilter:['data-lang']});

  function resize() {
    var rect = canvas.getBoundingClientRect();
    var width = Math.max(1, Math.round(rect.width));
    var height = Math.max(1, Math.round(rect.height));
    var pixelRatio = renderer.getPixelRatio();
    if (canvas.width !== Math.round(width * pixelRatio) || canvas.height !== Math.round(height * pixelRatio)) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      updateCamera();
    }
  }

  var visible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
    }, { rootMargin: '120px' }).observe(canvas);
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas.parentElement);
  window.addEventListener('resize', resize);
  resize();resizeStructure();
  if(structureCanvas&&'ResizeObserver' in window)new ResizeObserver(resizeStructure).observe(structureCanvas.parentElement);
  if(structureCanvas&&'IntersectionObserver' in window)new IntersectionObserver(function(entries){structureVisible=entries[0].isIntersecting;},{rootMargin:'120px'}).observe(structureCanvas);

  var lastTime = performance.now();
  function animate(now) {
    requestAnimationFrame(animate);
    if ((!visible&&!structureVisible) || document.hidden) {
      lastTime = now;
      return;
    }
    var elapsed = Math.min(40, now - lastTime);
    lastTime = now;
    if(visible)renderer.render(scene,camera);if(structureRenderer&&structureVisible)structureRenderer.render(structureScene,structureCamera);
  }
  requestAnimationFrame(animate);
}());
