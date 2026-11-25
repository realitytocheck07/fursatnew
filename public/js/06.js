
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
/* SOUND v5.57 / SOUND-CONTRACT: ONE song (intro-music, 60 s) for the intro and the landing page.
   v5.57: the hero reel files now CARRY that song as their audio track, so on the landing page picture and music are one stream (exact sync, nothing to correct).
   During the intro the separate mp3 plays (synced to the helicopter); when the reel starts, the sound switches to the reel's own audio and the mp3 fades out.
   - Tap "Enter Fursat": the song starts at once (the tap allows it) and plays to its full length, through the intro and on the landing page.
   - No tap (auto-enter after 2 s): silent. "Sound on" is offered in the intro (#fksndb) and on the landing page (#snd).
   - Either button turns it off again. The song never loops; when it ends the buttons go back to "Sound on".
   sessionStorage['fk-sound'] ('1' on) + window events fk:sound {on} and fk:music {id:"main"}; other players (drinks, tour) take over via fk:music. */
var IV=.85,ac,an,fd,avg=0,last=0,B=0,sb=$("snd"),fkb=$("fksndb"),fkv=$("fksndv"),ended=false,rf=$("fxrvf"),viaReel=false;
var M={a:new Audio("/assets/audio/intro-music.mp3"),on:false,f:0};M.a.preload="none";M.a.volume=0;
function flag(v){try{sessionStorage.setItem("fk-sound",v?"1":"0")}catch(e){}}
function emit(n,d){window.dispatchEvent(new CustomEvent(n,{detail:d}))}
function fade(t,v,ms,cb){cancelAnimationFrame(t.f);var s=t.a.volume,t0=performance.now();(function f(n){var k=cl((n-t0)/ms,0,1);t.a.volume=s+(v-s)*k;if(k<1)t.f=requestAnimationFrame(f);else if(cb)cb()})(t0)}
function ui(){var v=M.on,t=v?"Sound off":"Sound on",l=v?"Turn sound off":"Turn sound on";
 /* v5.62: #snd is now the separate "Vibe with us" button (see VIBE below). #rsnd only exists to switch the reel's own sound off, and shows only while that sound plays. */
 var rsb=$("rsnd");if(rsb){rsb.hidden=!v;rsb.setAttribute("aria-label","Turn reel sound off");rsb.lastElementChild.textContent="Reel sound off"}
 if(fkb){fkb.removeAttribute("aria-pressed");fkb.lastElementChild.textContent=t;fkb.setAttribute("aria-label",l)}}
function hook(a){if(ac||!/^https?:/.test(location.protocol))return;try{ac=new(window.AudioContext||window.webkitAudioContext)();var s=ac.createMediaElementSource(a);an=ac.createAnalyser();an.fftSize=256;fd=new Uint8Array(an.frequencyBinCount);s.connect(an);an.connect(ac.destination)}catch(e){an=null}}
/* v5.58b: where the intro song is now (seconds), 0 if it is not playing. 10.js starts the reel from this second, so the song CONTINUES: no repeat, no overlap. */
window.__fzSongPos=function(){return(M.on&&!viaReel&&!M.a.paused&&!M.a.ended)?M.a.currentTime:0};
var el=function(){return window.__fzT0?(performance.now()-window.__fzT0)/1000:0};
/* sync: during the intro the song jumps to the helicopter's elapsed time. play() is called straight from the tap (Safari / iPhone need that). */
var inIntro=function(){return document.documentElement.classList.contains("lock")};
var reelUsable=function(){return !!(rf&&rf.isConnected&&window.__fzReel&&window.__fzReel.on&&!window.__fzReel.keepSong&&!calm&&!inIntro())};
/* the reel's own audio: fade in over the song's fade-out. If the browser refuses sound (it pauses the video), re-mute, keep the picture playing and leave "Sound on" for a tap. */
var rsAt=0,refused=false;
function reelSound(on,quick){if(!rf)return;if(!on){rf.muted=true;return}
 rsAt=performance.now();try{rf.volume=0;rf.muted=false}catch(e){}
 var t0=performance.now();(function f(n){var k=cl((n-t0)/(quick?200:500),0,1);try{rf.volume=IV*k}catch(e){}if(k<1&&!rf.muted)requestAnimationFrame(f)})(t0);
 setTimeout(function(){var up=$("fxpv");if(rf.paused&&!rf.ended&&!document.hidden&&!(up&&up.dataset.s==="paused")&&M.on&&viaReel){rf.muted=true;var q=rf.play();if(q&&q.catch)q.catch(function(){});toSong(rf.currentTime)}},500)}   /* AV1: sound refused: the song carries on from the reel's second (sound stays on) */
function play(sync){var a=M.a;if(M.on)return;refused=false;M.on=true;flag(true);ui();
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
function stop(quiet,keep){if(!M.on)return;if(window.__fzReel)window.__fzReel.heard=false;M.on=false;if(!keep)flag(false);ui();if(viaReel){viaReel=false;reelSound(false)}else fade(M,0,250,function(){if(!M.on)M.a.pause()});if(!quiet)emit("fk:sound",{on:false})}
function toggle(sync){M.on?stop():play(sync)}
/* v5.62 VIBE WITH US: a separate track (611fb91032.mp3, from 27 s, looping) on its own button #snd.
   The reel's own sound (the song carried by the hero video) has NO play button: it comes with the video after the Enter tap, and while it plays #rsnd offers to switch it off.
   Vibe and reel sound never play together: starting one stops the other. To use another song, change VIBE_SRC. */
var VIBE_SRC="/assets/611fb91032.mp3",VIBE_START=27,V={a:new Audio(VIBE_SRC),on:false,f:0};V.a.preload="none";V.a.loop=true;V.a.volume=0;
function vui(){if(!sb)return;var v=V.on;sb.removeAttribute("aria-pressed");sb.lastElementChild.textContent=v?"Vibe off":"Vibe with us";sb.setAttribute("aria-label",v?"Turn vibe music off":"Play vibe music");if(v)sb.classList.remove("nudge")}
function vfade(v,ms,cb){cancelAnimationFrame(V.f);var s=V.a.volume,t0=performance.now();(function f(n){var k=cl((n-t0)/ms,0,1);V.a.volume=s+(v-s)*k;if(k<1)V.f=requestAnimationFrame(f);else if(cb)cb()})(t0)}
/* dance: route the vibe track through the same analyser the song and the reel use, so Ask Fursat dances to ANY music that is playing (needs http/https; without it the 120 bpm pulse takes over) */
var vh=false;
function vhook(){if(vh||!/^https?:/.test(location.protocol))return;try{if(!ac){hook(V.a);if(!ac||!an)return;ac.resume&&ac.resume()}else{ac.resume&&ac.resume();if(!an)return;ac.createMediaElementSource(V.a).connect(an)}vh=true}catch(e){}}
function vstop(){if(!V.on)return;V.on=false;vui();vfade(0,250,function(){if(!V.on)V.a.pause()})}
function vplay(){if(V.on)return;V.on=true;vui();
 emit("fk:music",{id:"vibe"});/* the reel sound, the intro song and the other players (drinks, tour) stop */
 var a=V.a;a.preload="auto";a.volume=0;vhook();
 var seek=function(){try{if(a.currentTime<.5)a.currentTime=Math.min(VIBE_START,(a.duration||150)-1)}catch(x){}};
 if(a.readyState>=1)seek();else a.addEventListener("loadedmetadata",seek,{once:true});
 var p=a.play(),ok=function(){if(V.on){vfade(IV,600);wake()}};
 if(p&&p.then)p.then(ok,function(){V.on=false;vui()});else ok()}
if(sb)sb.onclick=function(){V.on?vstop():vplay()};
var rsb0=$("rsnd");if(rsb0)rsb0.onclick=function(){stop()};
addEventListener("fk:music",function(e){var i=e.detail&&e.detail.id;if(i&&i!=="vibe"&&V.on){V.on=false;vui();vfade(0,200,function(){if(!V.on)V.a.pause()})}});
document.addEventListener("visibilitychange",function(){if(!V.on)return;if(document.hidden)V.a.pause();else{V.a.play().catch(function(){});wake()}});
vui();
if(fkb)fkb.onclick=function(){toggle(true)};
if(fkv)fkv.oninput=function(){IV=cl(fkv.value/100,0,1);if(M.on&&!viaReel){cancelAnimationFrame(M.f);M.a.volume=IV}};
/* the song reached its end: back to "Sound on" */
M.a.addEventListener("ended",function(){if(!M.on||viaReel)return;M.on=false;flag(false);ui();emit("fk:sound",{on:false})});
addEventListener("fk:sound",function(e){if(e.detail&&e.detail.on===false)stop(true)});
addEventListener("fk:music",function(e){var i=e.detail&&e.detail.id;if(i&&i!=="main")stop(true,true)});
/* the reel starts (after the intro): if sound is on, hand over from the mp3 to the reel's own audio. The reel ending / failing turns the sound off, like the song ending. */
/* AV1: the reel's audio cannot play (paused by scroll / tab, or the browser refused sound): the mp3 carries on from the reel's second. */
function toSong(tt,resume){var a=M.a;viaReel=false;if(resume)refused=true;rf.muted=true;if(resume){var rq=rf.play();if(rq&&rq.catch)rq.catch(function(){})}   /* resume: the browser paused the reel because it refused sound, so the picture keeps going muted */
  hook(a);if(ac&&ac.resume)ac.resume();a.preload="auto";a.volume=0;
  var go=function(){try{a.currentTime=Math.min(tt,(a.duration||60)-.1)}catch(x){}var q=a.play();if(q&&q.then)q.then(function(){if(M.on)fade(M,IV,250)},function(){});else fade(M,IV,250)};
  if(a.readyState>=1)go();else a.addEventListener("loadedmetadata",go,{once:true});wake()}
if(rf){rf.addEventListener("playing",function(){if(M.on&&!viaReel&&!refused&&reelUsable()){
  /* v5.58: coming back from the mp3 (the reel was paused by scroll / tab switch while the song kept playing): put the picture where the song is */
  var own=window.__fzReel&&window.__fzReel.own;if(window.__fzReel)window.__fzReel.own=false;   /* AV1: first start of the reel: it plays from 0 on its own audio */
  if(!own)try{var tt=M.a.currentTime;if(tt>.3&&Math.abs(rf.currentTime-tt)>.4)rf.currentTime=tt}catch(x){}
  viaReel=true;fade(M,0,120,function(){M.a.pause()});reelSound(true,true)}});
 /* v5.58 FIX "music stops before the end": the reel is paused when the hero scrolls off screen or the tab hides (10.js). Its audio is the song, so the
    song died with it. Now, whenever the reel pauses by itself (not the guest's own pause button, not the end), the mp3 carries on from the same second. */
 rf.addEventListener("pause",function(){if(!M.on||!viaReel||rf.ended||document.documentElement.classList.contains("lock"))return;
  var up=$("fxpv");if(up&&up.dataset.s==="paused")return;
  toSong(rf.currentTime,performance.now()-rsAt<700&&!document.hidden)});
 var reelEnd=function(){if(M.on&&viaReel){if(window.__fzReel)window.__fzReel.heard=true;viaReel=false;M.on=false;flag(false);ui();emit("fk:sound",{on:false})}};
 rf.addEventListener("ended",reelEnd);rf.addEventListener("error",reelEnd)}
/* the Enter tap starts the song; the 2 s auto-enter does not */
window.__fzIntroSound=function(tap){if(tap)play(true)};
window.__fzReplayOn=function(){play(false)};   /* AV1: "Watch again" with the reel sound that was on when the reel ended */
/* intro over (finished, or Skip intro): the song keeps playing on the landing page; only the intro button goes away with the intro */
function onEnd(){if(ended)return;ended=true;finish()}
addEventListener("fz:introend",onEnd);
var bq=0,sbv=true;
function wake(){if((M.on||V.on)&&!bq&&!document.hidden)bq=requestAnimationFrame(beat)}
if(sb&&"IntersectionObserver"in window)new IntersectionObserver(function(e){sbv=e[0].isIntersecting;wake()}).observe(sb);
var R=document.documentElement,dir=1,wasOn=false,LV=[0,0,0,0,0],PK=[.1,.1,.1,.1,.1],MN=[.3,.3,.3,.3,.3],BN=[[1,2],[3,5],[6,10],[11,20],[21,40]],rfHooked=false,vib=[0,0,0,0,0];
/* v5.60: the music is published on <html> for Ask Fursat's dance: --fk-beat (0..1 kick, eased down), --fk-bdir (+1/-1 per beat) and
   --fk-b0..--fk-b4 (0..1 live level of five frequency bands, bass first). Runs whenever the sound is on. It reads the song's own audio (analyser),
   also while the reel's audio carries it; if the browser gives no analyser it falls back to a steady 120 bpm pulse. */
function hookReel(){if(rfHooked||!rf||!window.AudioContext&&!window.webkitAudioContext)return;
 try{if(!ac)hook(M.a);if(!ac||!an)return;
  ac.resume&&ac.resume().then(function(){if(rfHooked||ac.state!=="running")return;rfHooked=true;var s=ac.createMediaElementSource(rf);s.connect(an)}).catch(function(){})}catch(e){}}
function beat(t){bq=0;if(!M.on&&!V.on){B=0;if(sb)sb.style.setProperty("--b",0);R.style.setProperty("--fk-beat",0);for(var z=0;z<5;z++){LV[z]=0;R.style.setProperty("--fk-b"+z,0)}if(wasOn){wasOn=false;R.classList.remove("fk-music")}return}
 if(document.hidden)return;t=t||performance.now();if(!wasOn){wasOn=true;R.classList.add("fk-music")}
 if(viaReel&&!rfHooked)hookReel();
 var live=an&&(!viaReel||rfHooked);
 if(live){an.getByteFrequencyData(fd);var e=(fd[1]+fd[2]+fd[3]+fd[4])/1020;avg=avg*.96+e*.04;if(e>avg*1.22+.07&&t-last>250){B=1;last=t;dir=-dir;R.style.setProperty("--fk-bdir",dir)}
  for(var i=0;i<5;i++){var lo=BN[i][0],hi=BN[i][1],sum=0;for(var k=lo;k<=hi;k++)sum+=fd[k];var x=sum/((hi-lo+1)*255);MN[i]+=(x-MN[i])*.03;var dv=x-MN[i];PK[i]=Math.max(dv,PK[i]*.9985);var v=Math.max(0,Math.min(1,.3+.7*dv/Math.max(PK[i],.035)));LV[i]=v>LV[i]?v:LV[i]*.8}}
 else{if(t-last>504){B=1;last=t;dir=-dir;R.style.setProperty("--fk-bdir",dir)}
  var ph=(t-last)/504;for(var j=0;j<5;j++){var w=Math.max(0,1-ph*(1.1+j*.25))*(.55+.45*Math.abs(Math.sin(t/(210+j*70)+j)));LV[j]=Math.max(w,LV[j]*.78)}}
 B*=.92;if(B<.01)B=0;if(sb&&sbv)sb.style.setProperty("--b",B.toFixed(3));R.style.setProperty("--fk-beat",B.toFixed(3));
 for(var q=0;q<5;q++)R.style.setProperty("--fk-b"+q,LV[q].toFixed(3));
 bq=requestAnimationFrame(beat)}
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
