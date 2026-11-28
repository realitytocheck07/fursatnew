
(function(){
var $=function(i){return document.getElementById(i)},cl=function(v,a,b){return Math.max(a,Math.min(b,v))};
var e5=function(t){t=cl(t,0,1);return t<.5?16*t*t*t*t*t:1-Math.pow(-2*t+2,5)/2};
var calm=matchMedia("(prefers-reduced-motion:reduce)").matches,H=document.documentElement,VW=innerWidth,VH=innerHeight;
addEventListener("resize",function(){VW=innerWidth;VH=innerHeight},{passive:true});
var seen=false;
try{seen=sessionStorage.getItem("fz_seen")==="1"}catch(e){}
var hero=$("top"),intro=$("intro"),ibox=$("ibox"),icard=$("icard"),lgo=$("lgo"),lcap=$("lcap"),D=6000,t0=null,done=false,go=false,ringed=false,Sz=0;
intro.appendChild(lgo);
ibox.style.background="#0e0a07";icard.style.willChange="opacity";   /* the dark start of the picture is its opacity over a dark plate (no blur / brightness filter, no extra layer) */
function bez(x1,y1,x2,y2){function X(t){return 3*(1-t)*(1-t)*t*x1+3*(1-t)*t*t*x2+t*t*t}function Y(t){return 3*(1-t)*(1-t)*t*y1+3*(1-t)*t*t*y2+t*t*t}return function(t){t=cl(t,0,1);var lo=0,hi=1,m,i;for(i=0;i<14;i++){m=(lo+hi)/2;X(m)<t?lo=m:hi=m}return Y((lo+hi)/2)}}
var ez=bez(.7,0,.15,1),eo=bez(.6,0,.2,1);
/* LOGO -> GLASSES: the logo flies in one arc onto the logo reflected in the lens (accelerate, then settle: cubic-bezier .7,0,.15,1), the lens holds one beat, then the picture pushes in on the lens (scale 1.3) and dissolves onto the hero (opacity, ease .6,0,.2,1). Only transform and opacity change per frame. */
function frame(p){var vw=VW,vh=VH,s=Math.max(vw/700,vh/875),ox=(vw-700*s)/2,oy=(vh-875*s)/2,X=ox+497.6*s,Y=oy+321.6*s,r0=32*s,d=2*r0,
 S=Math.min(vw*.6,vh*.46,300,512/Math.min(devicePixelRatio||1,3)),sx=vw/2,sy=vh*.42,a=ez((p-.08)/.36),b=eo((p-.5)/.5),z=1+.3*b,
 cxp=sx-vw*.16,cyp=sy-vh*.2,u=1-a,cx=u*u*sx+2*u*a*cxp+a*a*X,cy=u*u*sy+2*u*a*cyp+a*a*Y,k=(d/S-1)*a+1;
 if(Sz!==S){Sz=S;lgo.style.width=lgo.style.height=S+"px"}
 icard.style.opacity=(.42+.58*a).toFixed(3);
 lgo.style.transform="translate3d("+(cx-S/2).toFixed(1)+"px,"+(cy-S/2).toFixed(1)+"px,0) scale("+(k*(1+.35*b)).toFixed(4)+")";
 lgo.style.opacity=(1-eo(b*1.7)).toFixed(2);
 ibox.style.transformOrigin=X.toFixed(1)+"px "+Y.toFixed(1)+"px";ibox.style.transform="scale("+z.toFixed(3)+")";
 if(b>0){intro.style.background="transparent";ibox.style.opacity=(1-eo((b-.3)/.7)).toFixed(3)}
 lcap.style.opacity=cl(1-a*3,0,1);lcap.style.transform="translateY("+(a*26).toFixed(1)+"px)";
 if(b>.3&&!go){go=true;hero.classList.add("go")}}
function finish(){if(done)return;done=true;go=true;hero.classList.add("go");intro.remove();lcap.remove();H.classList.remove("lock");scrollTo(0,0);dispatchEvent(new Event("fz:introend"))}
function tick(now){if(done)return;if(t0===null)t0=now;var p=cl((now-t0-400)/D,0,1);frame(p);p<1?requestAnimationFrame(tick):finish()}
if(calm||seen){finish()}else{H.classList.add("lock");frame(0);window.__fzGo=function(){if(window.__fzS)return;window.__fzS=1;requestAnimationFrame(tick)};/* 11.js shows "Enter Fursat" and starts the intro on tap or after 2 s */
 var skip=function(e){if(e&&e.target&&e.target.closest&&e.target.closest(".fk-isnd"))return;if(t0!==null&&performance.now()-t0>1200)finish()};["wheel","touchmove","keydown","pointerdown"].forEach(function(n){addEventListener(n,skip,{passive:true})})}
/* SOUND (REEL-HQ-4) / SOUND-CONTRACT: intro-song.mp3 = the song "Yeh Chikittha" from its 3.0 s mark (sample 132,300), 14 s, plays with the intro. The hero reel is the owner's original reel, full length, with its own audio (music + the spoken line), from its 0:00.
   - Tap "Enter Fursat": the song starts at once. At hand-over (animation end) it fades out (300 ms) while the reel starts from 0:00 UNMUTED (fade-in 300 ms). If the reel is not ready the song keeps playing, the reel waits up to 1 s (10.js) and then starts.
   - No tap (auto-enter after 3 s): the intro is silent, the reel plays MUTED from its 0:00; "Sound on" unmutes the reel in place. Sound turned on during the intro: the song joins at the intro's clock (seek only in the buffered part; if it cannot seek it stays silent and the reel gets the sound at hand-over).
   - Skip intro: the song fades out in 150 ms, the reel starts from 0:00 (muted or not as the sound state says). Slow / Save-Data network: no song, the old 540 reel, muted. If the browser refuses sound the reel stays muted and the button shows "Sound on".
   sessionStorage['fk-sound'] ('1' on) + window events fk:sound {on} and fk:music {id:"main"}; other players (drinks, tour) take over via fk:music. */
var IV=.85,ac,an,fd,avg=0,last=0,B=0,sb=$("snd"),fkb=$("fksndb"),fkv=$("fksndv"),ended=false,rf=$("fxrvf"),viaReel=false;
var M={a:new Audio("/assets/audio/intro-song.mp3"),on:false,f:0};M.a.preload="none";M.a.volume=0;
function flag(v){try{sessionStorage.setItem("fk-sound",v?"1":"0")}catch(e){}}
function emit(n,d){window.dispatchEvent(new CustomEvent(n,{detail:d}))}
function fade(t,v,ms,cb){cancelAnimationFrame(t.f);var s=t.a.volume,t0=performance.now();(function f(n){var k=cl((n-t0)/ms,0,1);t.a.volume=s+(v-s)*k;if(k<1)t.f=requestAnimationFrame(f);else if(cb)cb()})(t0)}
function ui(){var v=M.on,t=v?"Sound off":"Sound on",l=v?"Turn sound off":"Turn sound on";
 /* #rsnd is the sound button of the hero reel: shown while the reel is on screen, "Sound on" (muted reel) or "Reel sound off" */
 var rsb=$("rsnd");if(rsb){var ro=!!(rf&&hero.classList.contains("reel-on")&&!rf.ended&&!rf.error);rsb.hidden=!ro;rsb.setAttribute("aria-label",v?"Turn reel sound off":"Turn sound on");rsb.lastElementChild.textContent=v?"Reel sound off":"Sound on"}
 if(fkb){fkb.removeAttribute("aria-pressed");fkb.lastElementChild.textContent=t;fkb.setAttribute("aria-label",l)}}
function hook(a){if(ac||!/^https?:/.test(location.protocol))return;try{ac=new(window.AudioContext||window.webkitAudioContext)();var s=ac.createMediaElementSource(a);an=ac.createAnalyser();an.fftSize=256;fd=new Uint8Array(an.frequencyBinCount);s.connect(an);an.connect(ac.destination)}catch(e){an=null}}
/* true while the intro song is audibly playing */
window.__fzSongOn=function(){return !!(M.on&&!viaReel&&!M.a.paused&&!M.a.ended)};
var el=function(){return window.__fzT0?(performance.now()-window.__fzT0)/1000:0};
/* sync: during the intro the song jumps to the helicopter's elapsed time. play() is called straight from the tap (Safari / iPhone need that). */
var inIntro=function(){return document.documentElement.classList.contains("lock")};
var reelUsable=function(){return !!(rf&&rf.isConnected&&window.__fzReel&&window.__fzReel.on&&!calm&&!inIntro())};
/* the reel's own audio. If the browser refuses sound (it pauses the video) the picture keeps playing muted and the button goes back to "Sound on". */
var rsAt=0,pend=0;
function reelSound(on,mode){if(!rf)return;if(!on){rf.muted=true;return}
 rsAt=performance.now();try{rf.volume=0;rf.muted=false}catch(e){}
 {var t0=performance.now();var ms=mode==="x150"?150:mode==="x300"?300:500;(function f(n){var k=cl((n-t0)/ms,0,1);try{rf.volume=IV*k}catch(e){}if(k<1&&!rf.muted)requestAnimationFrame(f)})(t0)}
 setTimeout(function(){var up=$("fxpv");if(rf.paused&&!rf.ended&&!document.hidden&&!(up&&up.dataset.s==="paused")&&M.on&&viaReel)refuse()},500)}
function refuse(){viaReel=false;rf.muted=true;var q=rf.play();if(q&&q.catch)q.catch(function(){});M.on=false;flag(false);ui();emit("fk:sound",{on:false})}
function play(sync){var a=M.a;if(M.on)return;
 if(reelUsable()){M.on=true;flag(true);ui();emit("fk:sound",{on:true});emit("fk:music",{id:"main"});viaReel=true;reelSound(true);wake();return}   /* the reel is on screen (muted): unmute it in place, no restart, no jump */
 if(window.__fzReel&&window.__fzReel.noSong)return;   /* slow / Save-Data network: no intro song, the intro stays silent */
 M.on=true;flag(true);ui();emit("fk:sound",{on:true});emit("fk:music",{id:"main"});
 viaReel=false;hook(a);if(ac&&ac.resume)ac.resume();
 a.preload="auto";a.volume=0;
 var p=a.play();
 var tries=0,place=function(){if(!M.on)return;var e=el(),d=a.duration||14;
  if(!(e>.3)){fade(M,IV,80);wake();return}   /* from the start of the clip */
  var b=a.buffered,have=b.length&&b.end(b.length-1)>=Math.min(e,d-.1)+.4;
  if(!have&&++tries<40){setTimeout(place,40);return}   /* the clip is small: wait until the part we jump to is buffered (not every host can seek by URL) */
  var tg=Math.min(el(),d-.1);try{a.currentTime=tg}catch(x){}
  setTimeout(function(){if(!M.on||viaReel)return;if(a.paused||a.currentTime<tg-.3){a.pause();a.volume=0;return}   /* the host could not seek: no out-of-sync audio, the reel gets the sound at hand-over */
   fade(M,IV,250);wake()},200)},ok=function(){place()};
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
var rsb0=$("rsnd");if(rsb0)rsb0.onclick=function(){M.on?stop():play(false)};
addEventListener("fk:music",function(e){var i=e.detail&&e.detail.id;if(i&&i!=="vibe"&&V.on){V.on=false;vui();vfade(0,200,function(){if(!V.on)V.a.pause()})}});
document.addEventListener("visibilitychange",function(){if(!V.on)return;if(document.hidden)V.a.pause();else{V.a.play().catch(function(){});wake()}});
vui();
if(fkb)fkb.onclick=function(){toggle(true)};
if(fkv)fkv.oninput=function(){IV=cl(fkv.value/100,0,1);if(M.on&&!viaReel){cancelAnimationFrame(M.f);M.a.volume=IV}if(M.on&&viaReel)try{rf.volume=IV}catch(x){}};
/* the song reached its end: back to "Sound on" */
M.a.addEventListener("ended",function(){if(!M.on||viaReel)return;if(window.__fzReel&&window.__fzReel.on&&!hero.classList.contains("reel-on")){return}M.on=false;flag(false);ui();emit("fk:sound",{on:false})});
addEventListener("fk:sound",function(e){if(e.detail&&e.detail.on===false)stop(true)});
addEventListener("fk:music",function(e){var i=e.detail&&e.detail.id;if(i&&i!=="main")stop(true,true)});
/* the hero reel: when the browser pauses it (scroll / tab) its sound pauses and comes back with it; if it paused right after the unmute the browser refused sound */
if(rf){rf.addEventListener("pause",function(){if(!M.on||!viaReel||rf.ended||document.documentElement.classList.contains("lock"))return;var up=$("fxpv");if(up&&up.dataset.s==="paused")return;if(performance.now()-rsAt<700&&!document.hidden)refuse()});
 rf.addEventListener("playing",function(){ui();if(pend){var ms=pend;pend=0;fade(M,0,ms,function(){try{M.a.pause()}catch(x){}});reelSound(true,ms===150?"x150":"x300")}});   /* hand-over: the song fades out while the reel fades in */
 var reelEnd=function(){if(M.on&&viaReel){if(window.__fzReel)window.__fzReel.heard=true;viaReel=false;M.on=false;flag(false);emit("fk:sound",{on:false})}ui()};
 rf.addEventListener("ended",reelEnd);rf.addEventListener("error",reelEnd)}
/* 10.js calls this in the same task just before the hero reel plays: sound on -> when the reel really plays, the song fades out (300 ms, 150 ms when the intro was skipped) while the reel fades in unmuted from its 0:00; sound off -> muted */
window.__fzReelStart=function(sk){if(!rf)return;if(M.on&&!viaReel){viaReel=true;pend=sk?150:300;try{rf.volume=0;rf.muted=false}catch(x){}}else if(!M.on)rf.muted=true;ui()};   /* the song keeps playing until the reel really plays (see the "playing" listener) */
window.__fzSongStop=function(){if(M.on&&!viaReel){fade(M,0,150,function(){try{M.a.pause()}catch(x){}});setTimeout(function(){if(!viaReel)try{M.a.pause()}catch(x){}},170)}};   /* skipped intro: the song stops at once (the sound state stays on for the reel) */
window.__fzSongWarm=function(){if(window.__fzReel&&window.__fzReel.noSong)return;M.a.preload="auto";try{M.a.load()}catch(x){}};   /* the 225 KB song is fetched when Enter is tapped / the auto-enter starts */
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
