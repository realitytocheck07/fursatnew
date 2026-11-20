(function(){var g=document.getElementById("gate"),btn=document.getElementById("gatebtn");if(!g)return;
if(!window.__fzGo){g.remove();return}
/* INTRO-ASK2: "Enter Fursat" shows at once but is optional. Tap = helicopter shot starts now (a tap may start sound, per SOUND-CONTRACT);
   no tap within 2 s = it starts by itself, silent unless the guest already turned sound on. */
var started=false,auto=0;
function start(tap){if(started)return;started=true;clearTimeout(auto);
 try{sessionStorage.setItem("fz_seen","1")}catch(e){}
 g.classList.remove("on");g.classList.add("out");setTimeout(function(){g.remove()},700);
 window.__fzGo();
 if(window.__fzIntroSound)window.__fzIntroSound(!!tap)}
g.classList.add("on");try{btn.focus({preventScroll:true})}catch(e){}
auto=setTimeout(function(){start(false)},2000);
btn.addEventListener("click",function(){start(true)});
})();
