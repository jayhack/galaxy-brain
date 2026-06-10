// Throwaway tuning harness — calibrate constants, then port to index.html.
const D2R=Math.PI/180,R2D=180/Math.PI;
const lonP=lon=>lon<0?lon+360:lon;
const rad=d=>d*D2R,deg=r=>r*R2D;
const lerp=(t,a,b)=>a+(b-a)*t, clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
function nmDist(a,b){const la1=rad(a.lat),la2=rad(b.lat),dla=rad(b.lat-a.lat),dlo=rad(a.lonP-b.lonP);
  const h=Math.sin(dla/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dlo/2)**2;return 6371*2*Math.asin(Math.min(1,Math.sqrt(h)))/1.852;}
function bearing(a,b){const la1=rad(a.lat),la2=rad(b.lat),dlo=rad(b.lonP-a.lonP);
  const y=Math.sin(dlo)*Math.cos(la2),x=Math.cos(la1)*Math.sin(la2)-Math.sin(la1)*Math.cos(la2)*Math.cos(dlo);
  return (deg(Math.atan2(y,x))+360)%360;}
function angDiff(a,b){let d=Math.abs(a-b)%360;return d>180?360-d:d;}
const fy=y=>{y=Math.round(y);return y<0?(-y)+"BC":y+"AD";};

const RAW=[
 {id:"taiwan",lat:23.7,lon:121.0,screen:800,ev:null,anchor:-3000},
 {id:"phil",lat:16.0,lon:120.5,screen:700,ev:[-2500,-1800],anchor:-2100},
 {id:"bismarck",lat:-5.5,lon:150.8,screen:600,ev:[-1500,-1250],anchor:-1350},
 {id:"solomon",lat:-9.5,lon:160.0,screen:480,ev:[-1300,-1050]},
 {id:"reefsc",lat:-10.7,lon:166.0,screen:200,ev:[-1250,-1000]},
 {id:"vanuatu",lat:-17.7,lon:168.3,screen:300,ev:[-1150,-900]},
 {id:"newcal",lat:-21.5,lon:165.8,screen:350,ev:[-1100,-900]},
 {id:"fiji",lat:-17.8,lon:178.0,screen:350,ev:[-1100,-850]},
 {id:"tonga",lat:-21.2,lon:-175.2,screen:250,ev:[-900,-800]},
 {id:"samoa",lat:-13.9,lon:-171.8,screen:250,ev:[-900,-650]},
 {id:"cook",lat:-21.2,lon:-159.8,screen:190,ev:[1000,1300]},
 {id:"society",lat:-17.6,lon:-149.5,screen:240,ev:[1000,1150]},
 {id:"austral",lat:-23.4,lon:-149.5,screen:160,ev:[1000,1300]},
 {id:"tuamotu",lat:-16.0,lon:-145.5,screen:230,ev:[1000,1250]},
 {id:"marq",lat:-8.9,lon:-140.1,screen:200,ev:[1000,1250]},
 {id:"mangareva",lat:-23.1,lon:-135.0,screen:120,ev:[1050,1300]},
 {id:"pitcairn",lat:-25.1,lon:-130.1,screen:60,ev:[1100,1400]},
 {id:"hawaii",lat:19.6,lon:-155.5,screen:380,ev:[1000,1250],corner:1},
 {id:"rapanui",lat:-27.1,lon:-109.4,screen:95,ev:[1150,1280],corner:1},
 {id:"kermadec",lat:-29.3,lon:-177.9,screen:120,ev:[1100,1400]},
 {id:"nz",lat:-37.0,lon:175.2,screen:720,ev:[1230,1300],corner:1},
];
RAW.forEach(d=>d.lonP=lonP(d.lon));
const NODES=Object.fromEntries(RAW.map(d=>[d.id,d]));
const EDGES=[["taiwan","phil"],["phil","bismarck"],["bismarck","solomon"],["solomon","reefsc"],
 ["reefsc","vanuatu"],["vanuatu","newcal"],["vanuatu","fiji"],["newcal","fiji"],
 ["fiji","tonga"],["fiji","samoa"],["tonga","samoa"],
 ["samoa","cook"],["samoa","society"],["tonga","cook"],["cook","society"],["cook","austral"],
 ["society","austral"],["society","tuamotu"],["society","marq"],
 ["tuamotu","marq"],["tuamotu","mangareva"],["austral","mangareva"],["mangareva","pitcairn"],
 ["pitcairn","rapanui"],["mangareva","rapanui"],["marq","hawaii"],["society","hawaii"],
 ["cook","kermadec"],["austral","kermadec"],["kermadec","nz"]];
const MILESTONES=["bismarck","reefsc","fiji","tonga","samoa","society","marq","hawaii","rapanui","nz"];

const CFG={SIM_END:1500,CONSOLIDATE:48,HOP_FREE:200,WINDOW_REACH:520,MONSOON_LON:182};
function windFrom(lat,lonp){
  if(lat<-32)return 250;            // S westerlies
  if(lat>12)return 65;              // NE trades (Hawaii latitudes)
  if(lat>6)return 72;
  if(lonp<CFG.MONSOON_LON&&lat>-28)return 300; // western monsoon domain (seasonally reversing)
  return 115;                       // SE trade wall (central/east Pacific)
}
function isMonsoon(a,b){const mlon=(a.lonP+b.lonP)/2,mlat=(a.lat+b.lat)/2;return mlon<CFG.MONSOON_LON&&mlat>-28&&mlat<12;}
function sampleWindFrom(a,b){let sx=0,sy=0;for(let t=0;t<=1;t+=0.25){const lat=lerp(t,a.lat,b.lat),lo=lerp(t,a.lonP,b.lonP),w=rad(windFrom(lat,lo));sx+=Math.sin(w);sy+=Math.cos(w);}return (deg(Math.atan2(sx,sy))+360)%360;}
function current(lat){if(lat<-32)return{to:90,sp:0.4};if(lat>8&&lat<22)return{to:280,sp:0.5};if(lat>=3&&lat<=8)return{to:95,sp:0.5};if(lat<3&&lat>-25)return{to:280,sp:0.6};return{to:280,sp:0.25};}
function currentProj(a,b,brg){let s=0,n=0;for(let t=0;t<=1;t+=0.5){const lat=lerp(t,a.lat,b.lat),c=current(lat);s+=c.sp*Math.cos(rad(c.to-brg));n++;}return s/n;}
function sailLeg(gamma,p,speed,cur,distNm,rangeDays){let factor,mode;
 if(gamma>=p){const t=(gamma-p)/(180-p);factor=clamp(0.66+0.42*Math.sin(clamp(t,0,1)*Math.PI),0.66,1.0);mode=gamma>150?"running":"reaching";}
 else{if(p>=88)return{feasible:false,mode:"irons",days:Infinity,ground:0};factor=Math.cos(rad(p))*0.80*(0.55+0.45*(gamma/p));mode="beating";}
 const ground=factor*speed+cur;if(ground<=0.15)return{feasible:false,mode:"pinned",days:Infinity,ground};
 const days=distNm/(ground*24);return{feasible:days<=rangeDays,days,ground,mode,factor};}
function detectProb(distNm,screenKm,nav){const distKm=distNm*1.852,reach=Math.max(screenKm*6,800);
 return clamp(nav*Math.exp(-(distKm/reach)*(1-nav)),0,0.985);}
function pointingAngle(u){return 90-42*clamp(u,0,1);}
function windowReturnYears(freq,distNm){const p=clamp(freq*Math.exp(-Math.max(0,distNm-CFG.HOP_FREE)/CFG.WINDOW_REACH),0,1);return p>0?1/p:Infinity;}
function computeEdge(A,B,P,rec=true){
 const dist=nmDist(A,B),brg=bearing(A,B),wf=sampleWindFrom(A,B);
 const mons=isMonsoon(A,B);
 const gamma=mons?Math.max(angDiff(brg,wf),120):angDiff(brg,wf); // monsoon: seasonal reversal => reaching either way
 const cur=currentProj(A,B,brg),p=pointingAngle(P.upwind);
 const interval=P.attemptInterval,detect=detectProb(dist,B.screen,P.nav);
 const direct=sailLeg(gamma,p,P.speed,cur,dist,P.rangeDays);
 const gammaW=mons?120:angDiff(brg,(wf+180)%360),win=sailLeg(gammaW,p,P.speed,cur,dist,P.rangeDays);
 const winWaitBase=windowReturnYears(P.windowFreq,dist);
 let best={wait:Infinity};
 if(direct.feasible&&detect>0.02){const wait=interval/detect+direct.days/365+CFG.CONSOLIDATE;if(wait<best.wait)best={wait,via:"prevailing",needsWindow:false,leg:direct,detect,gamma,dist,winWait:0};}
 if(!mons&&win.feasible&&isFinite(winWaitBase)&&detect>0.02){const wait=(interval+winWaitBase)/detect+win.days/365+CFG.CONSOLIDATE;if(wait<best.wait)best={wait,via:"window",needsWindow:true,leg:win,detect,gamma,dist,winWait:winWaitBase};}
 let feasible=isFinite(best.wait);
 if(feasible&&P.twoWay&&rec){const back=computeEdge(B,A,P,false);if(!back.feasible){feasible=false;best={wait:Infinity};}}
 return{feasible,wait:best.wait,needsWindow:best.needsWindow,dist,gamma,detect,via:best.via,leg:best.leg,winWait:best.winWait,mons};
}
function runModel(P){
 const ids=RAW.map(d=>d.id),arrival={},fromEdge={};ids.forEach(id=>arrival[id]=Infinity);
 RAW.forEach(d=>{if(d.anchor!=null)arrival[d.id]=d.anchor;});
 const adj={};ids.forEach(id=>adj[id]=[]);EDGES.forEach(([a,b])=>{adj[a].push(b);adj[b].push(a);});
 const visited={};
 while(true){let u=null,best=Infinity;for(const id of ids)if(!visited[id]&&arrival[id]<best){best=arrival[id];u=id;}
  if(u===null)break;visited[u]=true;if(arrival[u]>CFG.SIM_END+6000)continue;
  for(const v of adj[u]){if(visited[v]||NODES[v].anchor!=null)continue;const e=computeEdge(NODES[u],NODES[v],P);if(!e.feasible)continue;
   const start=e.needsWindow?Math.max(arrival[u],P.onset):arrival[u];
   const cand=start+e.wait;if(cand<arrival[v]){arrival[v]=cand;fromEdge[v]={from:u,edge:e};}}}
 return{arrival,fromEdge};
}
const PRESETS=[
 {name:"Weatherly two-way (onset AD850)",p:{speed:4.8,rangeDays:22,upwind:0.55,nav:0.72,windowFreq:0.45,attemptInterval:13,onset:850},twoWay:true},
 {name:"Drift only (Sharp)",p:{speed:3.0,rangeDays:12,upwind:0.0,nav:0.18,windowFreq:0.03,attemptInterval:25,onset:850},twoWay:false},
 {name:"Marginal range (strands corners)",p:{speed:4.0,rangeDays:13,upwind:0.40,nav:0.60,windowFreq:0.45,attemptInterval:15,onset:850},twoWay:true},
 {name:"Heavy ENSO, modest boats",p:{speed:4.2,rangeDays:20,upwind:0.28,nav:0.62,windowFreq:0.82,attemptInterval:14,onset:850},twoWay:true},
 {name:"Door opens early (AD -500)",p:{speed:4.8,rangeDays:22,upwind:0.55,nav:0.72,windowFreq:0.45,attemptInterval:13,onset:-500},twoWay:true},
 {name:"Door never opens (onset 3000)",p:{speed:4.8,rangeDays:22,upwind:0.55,nav:0.72,windowFreq:0.45,attemptInterval:13,onset:3000},twoWay:true},
];
for(const pr of PRESETS){
 const P={twoWay:pr.twoWay,...pr.p};const {arrival,fromEdge}=runModel(P);
 console.log("\n=== "+pr.name+" ===");
 const show=["bismarck","solomon","reefsc","vanuatu","fiji","tonga","samoa","cook","society","tuamotu","marq","mangareva","hawaii","rapanui","kermadec","nz"];
 for(const id of show){const d=NODES[id];const y=arrival[id];const ev=d.ev?`[${fy(d.ev[0])}..${fy(d.ev[1])}]`:"origin";
  let tag="";if(isFinite(y)){if(d.ev){if(y<d.ev[0]-150)tag="EARLY";else if(y>d.ev[1]+150)tag="LATE";else tag="hit";}else tag="hit";}else tag="NEVER";
  const via=fromEdge[id]?fromEdge[id].edge.via:"";
  console.log(`  ${id.padEnd(10)} ${(isFinite(y)?fy(y):"never").padStart(7)}  ev ${ev.padEnd(16)} ${tag.padEnd(6)} ${via||""}`);}
}

const Pm={twoWay:true,speed:4.0,rangeDays:13,upwind:0.40,nav:0.60,windowFreq:0.45,attemptInterval:15,onset:850};
for(const [a,b] of [["bismarck","solomon"],["solomon","reefsc"],["solomon","bismarck"]]){
  const e=computeEdge(NODES[a],NODES[b],Pm);
  console.log(`${a}->${b} feasible=${e.feasible} via=${e.via} dist=${e.dist.toFixed(0)} gamma=${e.gamma.toFixed(0)} mons=${e.mons} detect=${(e.detect||0).toFixed(2)} leg=${e.leg?JSON.stringify(e.leg):'-'}`);
}

const Pdr={twoWay:false,speed:3.0,rangeDays:12,upwind:0.0,nav:0.18,windowFreq:0.03,attemptInterval:25,onset:850};
console.log("\nDRIFT debug:");
for(const [a,b] of [["bismarck","solomon"],["solomon","reefsc"],["reefsc","vanuatu"],["vanuatu","fiji"]]){
  const e=computeEdge(NODES[a],NODES[b],Pdr);
  console.log(`${a}->${b} feasible=${e.feasible} via=${e.via} dist=${e.dist.toFixed(0)} gamma=${e.gamma.toFixed(0)} mons=${e.mons} detect=${(e.detect||0).toFixed(3)} wait=${isFinite(e.wait)?e.wait.toFixed(0):'inf'}`);
}
