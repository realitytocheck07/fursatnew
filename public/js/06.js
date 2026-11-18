
(function(){
var $=function(i){return document.getElementById(i)},cl=function(v,a,b){return Math.max(a,Math.min(b,v))};
var e5=function(t){t=cl(t,0,1);return t<.5?16*t*t*t*t*t:1-Math.pow(-2*t+2,5)/2};
var calm=matchMedia("(prefers-reduced-motion:reduce)").matches,H=document.documentElement,VW=innerWidth,VH=innerHeight;
addEventListener("resize",function(){VW=innerWidth;VH=innerHeight},{passive:true});
var seen=false;
try{seen=sessionStorage.getItem("fz_seen")==="1"}catch(e){}
var hero=$("top"),intro=$("intro"),ibox=$("ibox"),icard=$("icard"),lgo=$("lgo"),lcap=$("lcap"),D=7000,t0=null,done=false,go=false,ringed=false,Sz=0;
var ring=document.createElement("div");ring.className="lring";intro.appendChild(lgo);intro.appendChild(ring);
function frame(p){var vw=VW,vh=VH,s=Math.max(vw/700,vh/875),ox=(vw-700*s)/2,oy=(vh-875*s)/2,X=ox+497.6*s,Y=oy+321.6*s,r0=32*s,d=2*r0,
 S=Math.min(vw*.6,vh*.46,300),sx=vw/2,sy=vh*.42,a=e5((p-.12)/.40),b=e5((p-.56)/.44),z=1+1.5*b,R=r0+(Math.hypot(vw,vh)/z*1.06-r0)*b,
 cxp=sx-vw*.16,cyp=sy-vh*.2,u=1-a,
 cx=u*u*sx+2*u*a*cxp+a*a*X,cy=u*u*sy+2*u*a*cyp+a*a*Y,
 settle=Math.sin(cl((p-.47)/.12,0,1)*Math.PI)*.07,
 k=(d/S-1)*a+1+settle,float=Math.sin(p*55)*5*u,rot=-9*u+Math.sin(p*36)*2.4*u;
 if(Sz!==S){Sz=S;lgo.style.width=lgo.style.height=S+"px"}
 icard.style.filter="blur("+(u*10).toFixed(1)+"px) brightness("+(.42+.58*a).toFixed(2)+") saturate("+(.82+.18*a).toFixed(2)+")";
 lgo.style.transform="translate3d("+(cx-S/2).toFixed(1)+"px,"+(cy-S/2+float).toFixed(1)+"px,0) rotate("+rot.toFixed(2)+"deg) scale("+(k*(1+.35*b)).toFixed(4)+")";
 lgo.style.opacity=(1-e5(b*1.7)).toFixed(2);
 if(a>.985&&!ringed){ringed=true;ring.style.cssText="width:"+d+"px;height:"+d+"px;--x:"+(X-d/2).toFixed(1)+"px;--y:"+(Y-d/2).toFixed(1)+"px";ring.classList.add("pop")}
 var f=2+26*b,m="radial-gradient(circle at "+X.toFixed(1)+"px "+Y.toFixed(1)+"px,transparent "+R.toFixed(1)+"px,#000 "+(R+f).toFixed(1)+"px)";
 ibox.style.transformOrigin=X.toFixed(1)+"px "+Y.toFixed(1)+"px";ibox.style.transform="scale("+z.toFixed(3)+")";
 if(b>0){intro.style.background="transparent";ibox.style.webkitMaskImage=ibox.style.maskImage=m}
 lcap.style.opacity=cl(1-a*3,0,1);lcap.style.transform="translateY("+(a*26).toFixed(1)+"px)";
 if(b>.3&&!go){go=true;hero.classList.add("go")}}
function finish(){if(done)return;done=true;go=true;hero.classList.add("go");intro.remove();lcap.remove();H.classList.remove("lock");scrollTo(0,0);dispatchEvent(new Event("fz:introend"))}
function tick(now){if(done)return;if(t0===null)t0=now;var p=cl((now-t0-400)/D,0,1);frame(p);p<1?requestAnimationFrame(tick):finish()}
if(calm||seen){finish()}else{H.classList.add("lock");frame(0);window.__fzGo=function(){if(window.__fzS)return;window.__fzS=1;requestAnimationFrame(tick)};/* 11.js shows "Enter Fursat" and starts the intro on tap or after 2 s */
 var skip=function(e){if(e&&e.target&&e.target.closest&&e.target.closest(".fk-isnd"))return;if(t0!==null&&performance.now()-t0>1200)finish()};["wheel","touchmove","keydown","pointerdown"].forEach(function(n){addEventListener(n,skip,{passive:true})})}
/* INTRO-ASK2 / SOUND-CONTRACT: two tracks, one at a time. "intro" = intro-music-sreemukhi (during the intro), "vibe" = 611fb91032 (landing, "Set the mood").
   sessionStorage['fk-sound'] ('1' on) + window events fk:sound {on} and fk:music {id}. Sound only ever starts after a tap (or when a tap already turned it on this visit). */
var VOL=.85,IV=.85,ac,an,fd,avg=0,last=0,B=0,sb=$("snd"),fkb=$("fksndb"),fkv=$("fksndv"),bp=.504,ended=false;
function mkA(s){var a=new Audio(s);a.loop=true;a.preload="none";a.volume=0;return a}
var T={intro:{a:mkA("/assets/audio/intro-music-sreemukhi.mp3"),on:false,f:0},vibe:{a:mkA("/assets/611fb91032.mp3"),on:false,f:0}};
function flag(v){try{sessionStorage.setItem("fk-sound",v?"1":"0")}catch(e){}}
function flagOn(){try{return sessionStorage.getItem("fk-sound")==="1"}catch(e){return false}}
function emit(n,d){window.dispatchEvent(new CustomEvent(n,{detail:d}))}
function fade(t,v,ms,cb){cancelAnimationFrame(t.f);var s=t.a.volume,t0=performance.now();(function f(n){var k=cl((n-t0)/ms,0,1);t.a.volume=s+(v-s)*k;if(k<1)t.f=requestAnimationFrame(f);else if(cb)cb()})(t0)}
function ui(){var v=T.vibe.on;sb.setAttribute("aria-pressed",v);sb.lastElementChild.textContent=v?"Mood on":"Set the mood";if(v)sb.classList.remove("nudge");
 if(fkb){var a=T.intro.on;fkb.lastElementChild.textContent=a?"Sound off":"Sound on";fkb.setAttribute("aria-pressed",a);fkb.setAttribute("aria-label",a?"Turn intro sound off":"Turn intro sound on")}}
function hook(a){if(ac||!/^https?:/.test(location.protocol))return;try{ac=new(window.AudioContext||window.webkitAudioContext)();var s=ac.createMediaElementSource(a);an=ac.createAnalyser();an.fftSize=256;fd=new Uint8Array(an.frequencyBinCount);s.connect(an);an.connect(ac.destination)}catch(e){an=null}}
var el=function(){return window.__fzT0?(performance.now()-window.__fzT0)/1000:0};
/* id, sync (intro only: jump to the helicopter's elapsed time), quiet (sound was already on: no fk:sound) */
function play(id,sync,quiet){var t=T[id],a=t.a,iv=id==="intro";if(t.on)return;t.on=true;if(!iv){flag(true);hook(a)}if(ac&&ac.resume)ac.resume();ui();
 if(!iv){if(!quiet)emit("fk:sound",{on:true});emit("fk:music",{id:id})}
 function go(){a.volume=0;try{a.currentTime=sync?el()%(a.duration||60):0}catch(e){}
  var p=a.play(),ok=function(){if(!t.on)return;if(sync){var d=el()-a.currentTime;if(Math.abs(d)>.3&&Math.abs(d)<30)try{a.currentTime=el()%(a.duration||60)}catch(e){}}fade(t,iv?IV:VOL,sync?250:600);if(id==="vibe")wake()};
  if(p&&p.then)p.then(ok,function(){t.on=false;if(!iv)flag(false);ui()});else ok()}
 a.preload="auto";if(a.readyState>=1)go();else{a.addEventListener("loadedmetadata",go,{once:true});a.load()}}
/* INTRO-SOUND-SPLIT: the intro track has its own button + volume slider and never touches the mood flag/events; the mood button (#snd) only drives the "vibe" track. */
function stop(id,quiet,keep){var t=T[id],iv=id==="intro";if(!t.on)return;t.on=false;if(!iv&&!keep)flag(false);ui();fade(t,0,250,function(){if(!t.on)t.a.pause()});if(!iv&&!quiet)emit("fk:sound",{on:false})}
sb.onclick=function(){T.vibe.on?stop("vibe"):play("vibe",false)};
if(fkb)fkb.onclick=function(){T.intro.on?stop("intro"):play("intro",true)};
if(fkv)fkv.oninput=function(){IV=cl(fkv.value/100,0,1);if(T.intro.on){cancelAnimationFrame(T.intro.f);T.intro.a.volume=IV}};
addEventListener("fk:sound",function(e){if(e.detail&&e.detail.on===false)stop("vibe",true)});
addEventListener("fk:music",function(e){var i=e.detail&&e.detail.id;if(i&&i!=="vibe")stop("vibe",true,true)});
/* the Enter tap no longer starts music: the intro button is the only switch */
window.__fzIntroSound=function(){};
/* intro over (finished, or Skip intro): the intro track fades out; nothing else starts */
function onEnd(){if(ended)return;ended=true;finish();if(T.intro.on){T.intro.on=false;ui();fade(T.intro,0,900,function(){if(!T.intro.on)T.intro.a.pause()})}}
addEventListener("fz:introend",onEnd);
var bq=0,sbv=true;
function wake(){if(T.vibe.on&&!bq&&sbv&&!document.hidden)bq=requestAnimationFrame(beat)}
if("IntersectionObserver"in window)new IntersectionObserver(function(e){sbv=e[0].isIntersecting;wake()}).observe(sb);
function beat(t){bq=0;if(!T.vibe.on){B=0;sb.style.setProperty("--b",0);return}if(!sbv||document.hidden)return;t=t||performance.now();
 if(an){an.getByteFrequencyData(fd);var e=(fd[1]+fd[2]+fd[3]+fd[4])/1020;avg=avg*.96+e*.04;if(e>avg*1.22+.07&&t-last>250){B=1;last=t}}else if(t-last>504){B=1;last=t}
 B*=.9;if(B<.01)B=0;sb.style.setProperty("--b",B.toFixed(3));bq=requestAnimationFrame(beat)}
document.addEventListener("visibilitychange",function(){["intro","vibe"].forEach(function(k){var t=T[k];if(document.hidden&&t.on){t.a.pause()}else if(t.on){if(k==="vibe"&&!flagOn())return;t.a.play().catch(function(){});wake()}})});
var af=document.querySelector(".askwrap .af");if(af){if("IntersectionObserver"in window){new IntersectionObserver(function(e,o){if(e[0].isIntersecting){af.classList.add("in");o.disconnect()}},{threshold:.12}).observe(af)}else af.classList.add("in")}
})();


(function(){var by=document.getElementById("by"),t=document.getElementById("byt");if(!by||!t)return;var txt="Designed & being developed by",calm=matchMedia("(prefers-reduced-motion:reduce)").matches;
function fin(){t.textContent=txt;by.classList.add("fin")}
if(calm){fin();return}
var i=0;function type(){if(i<=txt.length){t.textContent=txt.slice(0,i++);setTimeout(type,i<4?260:48+Math.random()*50)}else setTimeout(function(){by.classList.add("fin")},350)}
var h=document.getElementById("top"),started=false;function go(){if(started)return;started=true;setTimeout(type,1400)}
if(h.classList.contains("go"))go();else new MutationObserver(function(m,o){if(h.classList.contains("go")){o.disconnect();go()}}).observe(h,{attributes:true,attributeFilter:["class"]});
})();
