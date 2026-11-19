
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
/* SOUND v5.57 / SOUND-CONTRACT: ONE song (intro-music-sreemukhi, 60 s) for the intro and the landing page.
   v5.57: the hero reel files now CARRY that song as their audio track, so on the landing page picture and music are one stream (exact sync, nothing to correct).
   During the intro the separate mp3 plays (synced to the helicopter); when the reel starts, the sound switches to the reel's own audio and the mp3 fades out.
   - Tap "Enter Fursat": the song starts at once (the tap allows it) and plays to its full length, through the intro and on the landing page.
   - No tap (auto-enter after 2 s): silent. "Sound on" is offered in the intro (#fksndb) and on the landing page (#snd).
   - Either button turns it off again. The song never loops; when it ends the buttons go back to "Sound on".
   sessionStorage['fk-sound'] ('1' on) + window events fk:sound {on} and fk:music {id:"main"}; other players (drinks, tour) take over via fk:music. */
var IV=.85,ac,an,fd,avg=0,last=0,B=0,sb=$("snd"),fkb=$("fksndb"),fkv=$("fksndv"),ended=false,rf=$("fxrvf"),viaReel=false;
var M={a:new Audio("/assets/audio/intro-music-sreemukhi.mp3"),on:false,f:0};M.a.preload="none";M.a.volume=0;
function flag(v){try{sessionStorage.setItem("fk-sound",v?"1":"0")}catch(e){}}
function emit(n,d){window.dispatchEvent(new CustomEvent(n,{detail:d}))}
function fade(t,v,ms,cb){cancelAnimationFrame(t.f);var s=t.a.volume,t0=performance.now();(function f(n){var k=cl((n-t0)/ms,0,1);t.a.volume=s+(v-s)*k;if(k<1)t.f=requestAnimationFrame(f);else if(cb)cb()})(t0)}
function ui(){var v=M.on,t=v?"Sound off":"Sound on",l=v?"Turn sound off":"Turn sound on";
 if(sb){sb.removeAttribute("aria-pressed");sb.lastElementChild.textContent=t;sb.setAttribute("aria-label",l);if(v)sb.classList.remove("nudge")}
 if(fkb){fkb.removeAttribute("aria-pressed");fkb.lastElementChild.textContent=t;fkb.setAttribute("aria-label",l)}}
function hook(a){if(ac||!/^https?:/.test(location.protocol))return;try{ac=new(window.AudioContext||window.webkitAudioContext)();var s=ac.createMediaElementSource(a);an=ac.createAnalyser();an.fftSize=256;fd=new Uint8Array(an.frequencyBinCount);s.connect(an);an.connect(ac.destination)}catch(e){an=null}}
var el=function(){return window.__fzT0?(performance.now()-window.__fzT0)/1000:0};
/* sync: during the intro the song jumps to the helicopter's elapsed time. play() is called straight from the tap (Safari / iPhone need that). */
var inIntro=function(){return document.documentElement.classList.contains("lock")};
var reelUsable=function(){return !!(rf&&rf.isConnected&&window.__fzReel&&window.__fzReel.on&&!calm&&!inIntro())};
/* the reel's own audio: fade in over the song's fade-out. If the browser refuses sound (it pauses the video), re-mute, keep the picture playing and leave "Sound on" for a tap. */
function reelSound(on,quick){if(!rf)return;if(!on){rf.muted=true;return}
 try{rf.volume=0;rf.muted=false}catch(e){}
 var t0=performance.now();(function f(n){var k=cl((n-t0)/(quick?200:500),0,1);try{rf.volume=IV*k}catch(e){}if(k<1&&!rf.muted)requestAnimationFrame(f)})(t0);
 setTimeout(function(){var up=$("fxpv");if(rf.paused&&!rf.ended&&!document.hidden&&!(up&&up.dataset.s==="paused")&&M.on&&viaReel){rf.muted=true;var q=rf.play();if(q&&q.catch)q.catch(function(){});viaReel=false;M.on=false;flag(false);ui();emit("fk:sound",{on:false})}},500)}
function play(sync){var a=M.a;if(M.on)return;M.on=true;flag(true);ui();
 emit("fk:sound",{on:true});emit("fk:music",{id:"main"});
 if(reelUsable()){viaReel=true;reelSound(true);wake();return}
 viaReel=false;hook(a);if(ac&&ac.resume)ac.resume();
 a.preload="auto";a.volume=0;
 var p=a.play();
 var seek=function(){try{var d=a.duration||60;if(sync){var e=el();if(e>.3)a.currentTime=Math.min(e,d-.1)}else if(a.ended||a.currentTime>=d-.2)a.currentTime=0}catch(x){}};
 if(a.readyState>=1)seek();else a.addEventListener("loadedmetadata",seek,{once:true});
 var ok=function(){if(!M.on)return;fade(M,IV,sync?250:600);wake()};
 if(p&&p.then)p.then(ok,function(){M.on=false;flag(false);ui()});else ok()}
/* quiet: no fk:sound (another player took over); keep: leave the sound flag as it is */
function stop(quiet,keep){if(!M.on)return;M.on=false;if(!keep)flag(false);ui();if(viaReel){viaReel=false;reelSound(false)}else fade(M,0,250,function(){if(!M.on)M.a.pause()});if(!quiet)emit("fk:sound",{on:false})}
function toggle(sync){M.on?stop():play(sync)}
if(sb)sb.onclick=function(){toggle(false)};
if(fkb)fkb.onclick=function(){toggle(true)};
if(fkv)fkv.oninput=function(){IV=cl(fkv.value/100,0,1);if(M.on&&!viaReel){cancelAnimationFrame(M.f);M.a.volume=IV}};
/* the song reached its end: back to "Sound on" */
M.a.addEventListener("ended",function(){if(!M.on||viaReel)return;M.on=false;flag(false);ui();emit("fk:sound",{on:false})});
addEventListener("fk:sound",function(e){if(e.detail&&e.detail.on===false)stop(true)});
addEventListener("fk:music",function(e){var i=e.detail&&e.detail.id;if(i&&i!=="main")stop(true,true)});
/* the reel starts (after the intro): if sound is on, hand over from the mp3 to the reel's own audio. The reel ending / failing turns the sound off, like the song ending. */
if(rf){rf.addEventListener("playing",function(){if(M.on&&!viaReel&&reelUsable()){viaReel=true;fade(M,0,200,function(){M.a.pause()});reelSound(true,true)}});
 var reelEnd=function(){if(M.on&&viaReel){viaReel=false;M.on=false;flag(false);ui();emit("fk:sound",{on:false})}};
 rf.addEventListener("ended",reelEnd);rf.addEventListener("error",reelEnd)}
/* the Enter tap starts the song; the 2 s auto-enter does not */
window.__fzIntroSound=function(tap){if(tap)play(true)};
/* intro over (finished, or Skip intro): the song keeps playing on the landing page; only the intro button goes away with the intro */
function onEnd(){if(ended)return;ended=true;finish()}
addEventListener("fz:introend",onEnd);
var bq=0,sbv=true;
function wake(){if(M.on&&!bq&&sbv&&!document.hidden)bq=requestAnimationFrame(beat)}
if(sb&&"IntersectionObserver"in window)new IntersectionObserver(function(e){sbv=e[0].isIntersecting;wake()}).observe(sb);
function beat(t){bq=0;if(!M.on){B=0;if(sb)sb.style.setProperty("--b",0);return}if(!sbv||document.hidden)return;t=t||performance.now();
 if(an&&!viaReel){an.getByteFrequencyData(fd);var e=(fd[1]+fd[2]+fd[3]+fd[4])/1020;avg=avg*.96+e*.04;if(e>avg*1.22+.07&&t-last>250){B=1;last=t}}else if(t-last>504){B=1;last=t}
 B*=.9;if(B<.01)B=0;if(sb)sb.style.setProperty("--b",B.toFixed(3));bq=requestAnimationFrame(beat)}
document.addEventListener("visibilitychange",function(){if(viaReel){wake();return}if(document.hidden&&M.on){M.a.pause()}else if(M.on&&!M.a.ended){M.a.play().catch(function(){});wake()}});
var af=document.querySelector(".askwrap .af");if(af){if("IntersectionObserver"in window){new IntersectionObserver(function(e,o){if(e[0].isIntersecting){af.classList.add("in");o.disconnect()}},{threshold:.12}).observe(af)}else af.classList.add("in")}
})();


(function(){var by=document.getElementById("by"),t=document.getElementById("byt");if(!by||!t)return;var txt="Designed & being developed by",calm=matchMedia("(prefers-reduced-motion:reduce)").matches;
function fin(){t.textContent=txt;by.classList.add("fin")}
if(calm){fin();return}
var i=0;function type(){if(i<=txt.length){t.textContent=txt.slice(0,i++);setTimeout(type,i<4?260:48+Math.random()*50)}else setTimeout(function(){by.classList.add("fin")},350)}
var h=document.getElementById("top"),started=false;function go(){if(started)return;started=true;setTimeout(type,1400)}
if(h.classList.contains("go"))go();else new MutationObserver(function(m,o){if(h.classList.contains("go")){o.disconnect();go()}}).observe(h,{attributes:true,attributeFilter:["class"]});
})();
