/* ===================== FURSAT · reference landing (fx) ===================== */
(function(){"use strict";
var $=function(i){return document.getElementById(i)},cl=function(v,a,b){return Math.max(a,Math.min(b,v))};
var root=document.documentElement,hero=$("top"),WA="919059670033";
var calm=matchMedia("(prefers-reduced-motion:reduce)").matches;

/* ---------- 1. fit the 1536x1024 design frame to the screen ---------- */
var wrap=$("fxartwrap");
function fit(){
  var w=root.clientWidth||innerWidth,h=innerHeight,u;
  if(w>=900){u=cl(Math.min(w/1536,(h-30)/1024),.4,1.5)}else{u=.9}
  root.style.setProperty("--u",u.toFixed(4));root.style.setProperty("--ex",w>=900?Math.round(cl(w/u-1536,0,520)):0);var sp=h-30-1024*u;root.style.setProperty("--gap",(w>=900&&sp>140?Math.round(sp/2-15):0)+"px");
  if(wrap&&w<900){root.style.setProperty("--au",(wrap.clientWidth/876).toFixed(4))}else root.style.removeProperty("--au");
}
fit();addEventListener("resize",fit);addEventListener("orientationchange",fit);
if(window.ResizeObserver&&wrap)new ResizeObserver(fit).observe(wrap);
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);

/* ---------- 2. action wiring: every [data-open] hits the existing features ---------- */
document.addEventListener("click",function(e){
  var t=e.target.closest&&e.target.closest("[data-open]");if(!t)return;
  var k=t.getAttribute("data-open"),pick=t.getAttribute("data-pick");

  if(k==="chat"){e.preventDefault();window.openFursatChat&&window.openFursatChat(pick?[pick]:["Kitchen"])}
  else if(k==="packages"){e.preventDefault();if(window.FursatPackages)window.FursatPackages.open({tab:"party"});else window.openFursatChat&&window.openFursatChat(["Banquets"])}
  else if(k.indexOf("cc:")===0){e.preventDefault();window.FursatConcierge&&window.FursatConcierge.open(k.slice(3))}
  else if(k==="packages-menu"){e.preventDefault();if(window.FursatPackages)window.FursatPackages.open({tab:"menu"});else location.hash="#spaces"}
});

document.addEventListener("keydown",function(e){if(e.key!=="Escape")return;var p=document.querySelector(".pk-sh"),x=p&&p.offsetParent!==null&&p.querySelector(".pk-x");if(x)setTimeout(function(){if(p.offsetParent!==null)x.click()},30)});
/* legal dialog */
(function(){var d=$("fxlegal"),o=$("lbopen"),x=$("fxlegal-x");if(!d||!o)return;
 o.addEventListener("click",function(){if(d.showModal)d.showModal();else d.setAttribute("open","")});
 x&&x.addEventListener("click",function(){d.close?d.close():d.removeAttribute("open")});
 d.addEventListener("click",function(e){if(e.target===d)d.close&&d.close()})})();

/* ---------- 4. "+" picks tray -> WhatsApp ---------- */
(function(){var tray=$("fxtray"),tt=$("fxtray-t"),picks=[];
  function ui(){if(!tray)return;tray.hidden=!picks.length;tt.textContent=picks.length+(picks.length===1?" pick":" picks")}
  document.addEventListener("click",function(e){var b=e.target.closest&&e.target.closest(".hs-add");if(!b)return;
    var c=b.closest(".hs-card"),n=c.getAttribute("data-name"),p=c.getAttribute("data-price"),i=-1;
    picks.forEach(function(x,k){if(x.n===n)i=k});
    if(i>-1){picks.splice(i,1);b.setAttribute("aria-pressed","false")}else{picks.push({n:n,p:p});b.setAttribute("aria-pressed","true");try{navigator.vibrate&&navigator.vibrate(12)}catch(_){}}
    ui()});
  if($("fxtray-x"))$("fxtray-x").addEventListener("click",function(){picks=[];[].forEach.call(document.querySelectorAll(".hs-add"),function(b){b.setAttribute("aria-pressed","false")});ui()});
  if($("fxtray-go"))$("fxtray-go").addEventListener("click",function(){
    var lines=["Hi Fursat! 👋 I would like to try:"].concat(picks.map(function(x){return"• "+x.n+" (\u20B9"+x.p+")"}));
    var sn;try{sn=localStorage.getItem("fz_n")}catch(_){}
    if(sn)lines.push("• Name: "+sn);
    var a=document.createElement("a");a.href="https://wa.me/"+WA+"?text="+encodeURIComponent(lines.join("\n"));a.target="_blank";a.rel="noopener";document.body.appendChild(a);a.click();a.remove()});
})();

/* ---------- 5. helicopter reveal, then the lens intro takes over ---------- */
(function(){var H=$("heli"),v=$("helivid"),skip=$("heliskip");if(!H||!v)return;
  if(calm||!window.__fzGo){H.remove();return}
  var orig=window.__fzGo,started=false,handed=false,t1=0;
  function hand(){if(handed)return;handed=true;clearTimeout(t1);
    H.classList.add("zoom");
    setTimeout(function(){orig()},420);                /* lens intro starts underneath */
    setTimeout(function(){H.classList.add("out")},620);/* helicopter scene dissolves */
    setTimeout(function(){H.remove()},1900)}
  window.__fzGo=function(){if(started)return;started=true;H.classList.add("playing");
    v.muted=true;window.__fzT0=performance.now();v.addEventListener("playing",function(){window.__fzT0=performance.now()},{once:true}); /* silent: the music is the soundtrack; T0 = intro clock for the music sync */
    var p=v.play();
    if(p&&p.catch)p.catch(hand);
    v.addEventListener("timeupdate",function(){if(v.duration&&v.currentTime>=v.duration-1.05)hand()});
    v.addEventListener("ended",hand);v.addEventListener("error",hand);
    t1=setTimeout(hand,8000)};
  if(skip)skip.addEventListener("click",hand);
  /* the lens intro should wait for the clip: keep the original untouched, just delay it */
})();

/* ---------- 7. 3D tilt for the below-the-fold cards ---------- */
(function(){if(calm||!matchMedia("(pointer:fine)").matches)return;
  document.addEventListener("pointermove",function(e){var c=e.target.closest&&e.target.closest(".fx-space,.fx-gal figure");if(!c)return;var r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
    c.style.transform="perspective(900px) rotateY("+(x*9).toFixed(2)+"deg) rotateX("+(-y*7).toFixed(2)+"deg) translateY(-6px)"});
  document.addEventListener("pointerout",function(e){var c=e.target.closest&&e.target.closest(".fx-space,.fx-gal figure");if(c&&!c.contains(e.relatedTarget))c.style.transform=""});
})();
})();

(function(){"use strict";var $=function(i){return document.getElementById(i)},hero=$("top"),WA="919059670033";
/* ======================= 10. scroll depth, journey, sticky bar ======================= */
(function(){var ticking=false,jr=$("journey"),scenes=jr?[].slice.call(jr.querySelectorAll(".jr-scene")):[],dots=jr?[].slice.call(jr.querySelectorAll(".jr-dots button")):[],st=$("fxsticky"),cur=-1;
  function upd(){ticking=false;var y=window.pageYOffset||0,vh=innerHeight;
    if(hero)hero.style.setProperty("--sy",Math.min(1,y/(vh*.85)).toFixed(3));
    if(st)st.classList.toggle("on",y>380);
    if(jr&&jr.offsetParent!==null){var r=jr.getBoundingClientRect(),tot=r.height-Math.min(vh,960);if(tot>0){var p=Math.max(0,Math.min(.9999,-r.top/tot)),i=Math.floor(p*scenes.length),loc=p*scenes.length-i;
      if(i!==cur){cur=i;scenes.forEach(function(s,k){s.classList.toggle("on",k===i)});dots.forEach(function(d,k){d.classList.toggle("on",k===i)})}
      scenes[i].style.setProperty("--jp",loc.toFixed(3))}}}
  function req(){if(!ticking){ticking=true;requestAnimationFrame(upd)}}
  addEventListener("scroll",req,{passive:true});addEventListener("resize",req);upd();
  dots.forEach(function(d){d.addEventListener("click",function(){var r=jr.getBoundingClientRect(),tot=r.height-Math.min(innerHeight,960),i=+d.getAttribute("data-i");scrollTo({top:window.pageYOffset+r.top+tot*((i+.5)/scenes.length),behavior:"smooth"})})});
})();

/* ======================= 11. sparkle trail + elephant toot ======================= */
(function(){var cv=$("fxsparks");if(!cv)return;var cx=cv.getContext("2d"),P=[],W=0,H=0,dpr=Math.min(2,window.devicePixelRatio||1),reduce=matchMedia("(prefers-reduced-motion:reduce)").matches,fine=matchMedia("(pointer:fine)").matches,run=false;
  var sized=false;function rs(){W=innerWidth;H=innerHeight;cv.width=W*dpr;cv.height=H*dpr;cx.setTransform(dpr,0,0,dpr,0,0);sized=true}addEventListener("resize",function(){sized=false;if(run)rs()},{passive:true});
  function add(x,y,n,sp){if(!sized)rs();for(var i=0;i<n;i++){var a=Math.random()*6.283,s=(Math.random()*.9+.2)*sp;P.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-.3,l:1,r:Math.random()*2.2+1})}go()}
  function go(){if(!run){run=true;requestAnimationFrame(tick)}}
  function tick(){cx.clearRect(0,0,W,H);var night=document.documentElement.classList.contains("night");cx.globalCompositeOperation="lighter";
    for(var i=P.length-1;i>=0;i--){var p=P[i];p.x+=p.vx;p.y+=p.vy;p.vy+=.012;p.l-=.022;if(p.l<=0){P.splice(i,1);continue}
      var g=cx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*3.2);g.addColorStop(0,"rgba(255,246,214,"+p.l+")");g.addColorStop(.4,(night?"rgba(255,170,60,":"rgba(230,160,50,")+p.l*.7+")");g.addColorStop(1,"rgba(255,160,40,0)");cx.fillStyle=g;cx.beginPath();cx.arc(p.x,p.y,p.r*3.2,0,6.283);cx.fill()}
    if(P.length)requestAnimationFrame(tick);else{run=false;cx.clearRect(0,0,W,H)}}
  var lx=0,ly=0;
  if(!reduce&&fine)addEventListener("pointermove",function(e){var d=Math.abs(e.clientX-lx)+Math.abs(e.clientY-ly);if(d<14)return;lx=e.clientX;ly=e.clientY;add(lx,ly,2,.9)},{passive:true});
  window.__fxSparks=add;
})();

/* ======================= 12. dish flies into the picks tray ======================= */
document.addEventListener("click",function(e){var b=e.target.closest&&e.target.closest(".hs-add");if(!b||matchMedia("(prefers-reduced-motion:reduce)").matches)return;
  setTimeout(function(){if(b.getAttribute("aria-pressed")!=="true")return;var im=b.closest(".hs-card").querySelector(".hs-img img.on"),tr=$("fxtray");if(!im||!Element.prototype.animate)return;
    var a=im.getBoundingClientRect(),t=tr&&!tr.hidden?tr.getBoundingClientRect():{left:innerWidth/2-20,top:innerHeight-60,width:40,height:40},c=document.createElement("img");c.className="fx-fly";c.src=im.currentSrc||im.src;c.alt="";document.body.appendChild(c);
    var sx=a.left+a.width/2-32,sy=a.top+a.height/2-32,ex=t.left+t.width/2-32,ey=t.top+t.height/2-32;
    c.animate([{transform:"translate("+sx+"px,"+sy+"px) scale(1.2)",opacity:1},{transform:"translate("+((sx+ex)/2)+"px,"+(Math.min(sy,ey)-80)+"px) scale(.9)",opacity:1,offset:.5},{transform:"translate("+ex+"px,"+ey+"px) scale(.2)",opacity:.2}],{duration:750,easing:"cubic-bezier(.5,0,.3,1)"}).onfinish=function(){c.remove();window.__fxSparks&&window.__fxSparks(ex+32,ey+32,14,2)};c.style.left="0";c.style.top="0"},30)});

/* ======================= 17. Elephant Flow clip (colour + matte packed side by side, composited on a canvas) ======================= */


})();

/* ======================= 18. Ask Fursat concierge (banquets, catering, visit, contact) ======================= */
(function(){
var WA="919059670033",MAP="https://www.google.com/maps/search/?api=1&query=Fursat+Kitchen+Bar+Capital+Park+Madhapur+Hyderabad";
var reduce=matchMedia("(prefers-reduced-motion:reduce)").matches;
var IC={
 hall:'<path d="M3 20h18M5 20V9l7-5 7 5v11M9 20v-6h6v6M12 9v.01"/>',
 cater:'<path d="M3 17h18M5 17a7 7 0 0 1 14 0M12 8V6M10 6h4"/><path d="M2 20h20"/>',
 pin:'<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
 phone:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 cal:'<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
 users:'<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5.2a3 3 0 0 1 0 5.6M18 14.3c1.8.8 3 2.6 3 4.7"/>',
 send:'<path d="M4 12l16-7-6 15-2.5-6.5z"/>',
 arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
 x:'<path d="M6 6l12 12M18 6L6 18"/>',
 glass:'<path d="M5 4h14l-7 9zM12 13v7M8 20h8"/>',
 ring:'<circle cx="12" cy="15" r="5"/><path d="M9.5 6.5L12 3l2.5 3.5L12 9z"/>',
 brief:'<rect x="3" y="7" width="18" height="13" rx="3"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
 cake:'<path d="M4 20h16v-7H4zM6 13V9h12v4M12 9V6M12 3.5v.01"/>',
 spark:'<path d="M12 3l2.1 5.9L20 11l-5.9 2.1L12 19l-2.1-5.9L4 11l5.9-2.1L12 3z"/>',
 menu:'<path d="M5 4v8a3 3 0 0 0 3 3v5M8 4v6M11 4v8a3 3 0 0 1-3 3M17 20V4c-2 1.5-3 4-3 7h3"/>',
 check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
 ig:'<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".6" fill="currentColor"/>',
 wa:'<path d="M12.04 2a9.9 9.9 0 0 0-8.47 15.04L2 22l5.1-1.34A9.9 9.9 0 1 0 12.04 2zm0 1.8a8.1 8.1 0 1 1-4.2 15.02l-.3-.18-3 .79.8-2.92-.2-.31A8.1 8.1 0 0 1 12.04 3.8z"/>'
};
function ic(n,c){return '<svg class="cc-i'+(c?' '+c:'')+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+IC[n]+'</svg>'}
function inr(n){return "₹"+Number(n).toLocaleString("en-IN")}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function wa(msg){window.open("https://wa.me/"+WA+"?text="+encodeURIComponent(msg),"_blank","noopener")}

var TABS=[["banq","Banquets","hall"],["cater","Catering & buffets","cater"],["visit","Visit us","pin"],["talk","Contact","phone"]];
var ROUTES=[
 ["banq",/banquet|\bhall\b|wedding|marriage|reception|engagement|sangeet|shaadi|venue|corporate|conference|function|\bevents?\b|bar bash|beer bash|open bar|platinum|gold package|silver package|party (package|hall|booking|venue|plan)|plan (a |my )?(party|event)/i],
 ["cater",/cater|buffet|bulk|package|per person|per head|group order|large group|headcount|quote/i],
 ["visit",/where|location|address|direction|map\b|route|reach|parking|landmark|timing|hours|open(ing)?\b|close|closing|when do|what time|reserve|reservation|book a table|table for|madhapur|capital park/i],
 ["talk",/contact|phone|call us|number|whatsapp|insta|email|talk to|speak to|owner|manager|enquir/i]
];
function route(q){q=String(q||"").trim();if(q.length<3)return null;for(var i=0;i<ROUTES.length;i++)if(ROUTES[i][1].test(q))return ROUTES[i][0];return null}

var el,body,tabsEl,titleEl,st={tab:"banq",occ:"Wedding",guests:60,date:"",diet:"Veg + Non-veg"},last=null;
function build(){if(el)return;
 el=document.createElement("div");el.className="cc";el.id="fxcc";el.hidden=true;
 el.innerHTML='<div class="cc-bd" data-cc="x"></div><div class="cc-sh" role="dialog" aria-modal="true" aria-labelledby="cc-t"><i class="cc-glow" aria-hidden="true"></i><header class="cc-hd"><div><p class="cc-ey">'+ic("spark")+'Ask Fursat <b>Concierge</b></p><h3 id="cc-t"></h3></div><button class="cc-x" type="button" data-cc="x" aria-label="Close">'+ic("x")+'</button></header><nav class="cc-tabs" id="cc-tabs" role="tablist"></nav><form class="cc-ask" id="cc-ask" role="search"><input id="cc-q" type="text" maxlength="120" placeholder="Ask anything: hall for 150 guests, buffet price, where to park…" aria-label="Ask Fursat anything"><button type="submit" aria-label="Ask">'+ic("arrow")+'</button></form><div class="cc-bo" id="cc-bo"></div><footer class="cc-ft"><span>Prices are per person and indicative. Final menu, date and quote are confirmed on WhatsApp.</span><a href="https://bjnexusai.com" target="_blank" rel="noopener">Designed &amp; developed by BJNexus AI</a></footer></div>';
 document.body.appendChild(el);
 body=el.querySelector("#cc-bo");tabsEl=el.querySelector("#cc-tabs");titleEl=el.querySelector("#cc-t");
 tabsEl.innerHTML=TABS.map(function(t){return '<button type="button" role="tab" data-tab="'+t[0]+'">'+ic(t[2])+'<span>'+t[1]+'</span></button>'}).join("")+'<i class="cc-pill" aria-hidden="true"></i>';
 el.addEventListener("click",onClick);
 el.querySelector("#cc-ask").addEventListener("submit",function(e){e.preventDefault();var q=el.querySelector("#cc-q").value,r=route(q);if(r){show(r)}else{closeIt();feed(q)}});
 el.addEventListener("keydown",function(e){
  if(e.key==="Escape"){closeIt();return}
  if(e.key==="Tab"){var f=[].filter.call(el.querySelectorAll("button,input,a[href],textarea"),function(n){return n.offsetParent!==null});if(!f.length)return;var a=f[0],z=f[f.length-1];
   if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}}});
}
function feed(q){var i=document.getElementById("af-q"),s=document.getElementById("af-send");if(!i||!s)return;i.value=q;s.__ccPass=1;s.click()}

function pk(){return(window.FursatPackages&&window.FursatPackages.packages)||[]}
function party(){return pk().filter(function(p){return p.k==="party"})}
function buffets(){return pk().filter(function(p){return p.k==="buffet"})}

function secLine(p){return p.sec&&p.sec.length?p.sec.map(function(s){return s.n+" "+s.t.replace(/\s*·.*$/,"").toLowerCase()}).slice(0,4).join(" · "):""}

function viewBanq(){
 var occ=[["Weddings & receptions","ring","Sit-down or buffet spreads for the big day."],["Parties & bar bashes","glass","Open-bar tiers with starters, mains and dessert."],["Corporate & get-togethers","brief","Team lunches, launches and celebrations."],["Birthdays & anniversaries","cake","Intimate to lively, with your menu your way."]];
 var h='<section class="cc-hero cc-in"><p class="cc-kick">One address, four moods</p><h4>Your celebration, <em>hosted by Fursat</em></h4><p>Weddings, parties and corporate events at Capital Park, Madhapur. Pick a package or tell us your headcount and we will shape the rest.</p><div class="cc-row"><button class="cc-btn pri" data-cc="pk">'+ic("menu")+'See all packages</button><button class="cc-btn" data-cc="plan">'+ic("cal")+'Plan my event</button></div></section>';
 h+='<div class="cc-occ">'+occ.map(function(o,i){return '<article class="cc-occ-i cc-in" style="--i:'+(i+1)+'">'+ic(o[1],"big")+'<h5>'+o[0]+'</h5><p>'+o[2]+'</p></article>'}).join("")+'</div>';
 var P=party();
 if(P.length){h+='<h4 class="cc-h cc-in" style="--i:5">Party packages <small>per person</small></h4><div class="cc-pk">'+P.map(function(p,i){return '<button class="cc-card cc-in tilt" style="--c:'+p.c+';--i:'+(i+6)+'" data-cc="pk" data-id="'+p.id+'"><span class="cc-tag">'+esc(p.tag)+'</span><b class="cc-t">'+esc(p.t)+'</b><span class="cc-pr"><i data-n="'+p.price+'">'+inr(p.price)+'</i></span><span class="cc-m">'+(p.serve?'Open bar · '+esc(p.serve):(p.veg?'Veg only':'Food package'))+'</span><span class="cc-go">View menu '+ic("arrow")+'</span></button>'}).join("")+'</div>'}
 h+=plan();
 return h}

function plan(){
 var occs=["Wedding","Birthday","Corporate","Anniversary","Get-together"],diets=["Veg","Veg + Non-veg","Open bar + food"];
 return '<section class="cc-plan cc-in" id="cc-plan" style="--i:14"><h4>Plan my event</h4><div class="cc-f"><label>Occasion</label><div class="cc-chips" data-grp="occ">'+occs.map(function(o){return '<button type="button" class="'+(st.occ===o?'on':'')+'" data-cc="occ" data-v="'+o+'">'+o+'</button>'}).join("")+'</div></div><div class="cc-f two"><div><label>Guests</label><div class="cc-step"><button type="button" data-cc="g-" aria-label="Fewer guests">−</button><output id="cc-g">'+st.guests+'</output><button type="button" data-cc="g+" aria-label="More guests">+</button></div></div><div><label for="cc-d">Date</label><input id="cc-d" type="date" value="'+st.date+'"></div></div><div class="cc-f"><label>Food &amp; drinks</label><div class="cc-chips" data-grp="diet">'+diets.map(function(o){return '<button type="button" class="'+(st.diet===o?'on':'')+'" data-cc="diet" data-v="'+o+'">'+o+'</button>'}).join("")+'</div></div><button class="cc-btn wa" data-cc="send">'+ic("wa")+'Send enquiry on WhatsApp'+ic("arrow")+'</button></section>'}

function viewCater(){
 var B=buffets();
 var h='<section class="cc-hero cc-in alt"><p class="cc-kick">Bites &amp; Buffet</p><h4>Buffets that <em>feed the whole room</em></h4><p>Complete spreads from welcome drink to dessert, priced per person. Veg and veg + non-veg options.</p><div class="cc-row"><button class="cc-btn pri" data-cc="pkb">'+ic("menu")+'Browse buffet menus</button><a class="cc-btn" href="https://www.instagram.com/fursat_bitesandbuffet" target="_blank" rel="noopener">'+ic("ig")+'@fursat_bitesandbuffet</a></div></section>';
 if(B.length){h+='<h4 class="cc-h cc-in" style="--i:2">Buffet packages <small>per person</small></h4><div class="cc-bf">'+B.map(function(p,i){var n=p.sec.length;return '<button class="cc-bfi cc-in" style="--c:'+p.c+';--i:'+(i+3)+'" data-cc="pkb" data-id="'+p.id+'"><span class="cc-dot '+(p.veg?'v':'n')+'" title="'+(p.veg?'Vegetarian':'Veg and non-veg')+'"></span><span class="cc-bt"><b>'+inr(p.price)+'</b><small>'+(p.veg?'Veg buffet':'Veg + Non-veg buffet')+'</small></span><span class="cc-bm">'+n+'-part spread · '+esc(secLine(p))+'</span>'+ic("arrow")+'</button>'}).join("")+'</div>'}
 h+='<section class="cc-note cc-in" style="--i:9">'+ic("check")+'<p><b>Planning for a big headcount or an off-site event?</b> Share the date, place and guest count on WhatsApp and we will confirm what we can do.</p><button class="cc-btn wa sm" data-cc="wa-cater">'+ic("wa")+'Ask about catering</button></section>';
 return h}

function viewVisit(){
 var zones=[["Café","Slow coffees and shakes"],["Kitchen","Dine-in favourites"],["Bar","Cocktails after dark"],["Banquets","Weddings & parties"]];
 return '<section class="cc-hero cc-in alt2"><p class="cc-kick">Find us</p><h4>Capital Park, <em>Madhapur</em></h4><p>Hyderabad, Telangana. Tap Directions and your maps app takes it from there.</p><div class="cc-row"><a class="cc-btn pri" href="'+MAP+'" target="_blank" rel="noopener">'+ic("pin")+'Get directions</a><button class="cc-btn" data-cc="book">'+ic("cal")+'Reserve a table</button></div></section>'
 +'<div class="cc-two"><article class="cc-box cc-in" style="--i:2">'+ic("clock","big")+'<h5>Timings</h5><p>Table slots run from 12 PM to 10 PM. Hours can change on special days, so confirm today’s timing on WhatsApp before you head over.</p><button class="cc-link" data-cc="wa-hours">Check today’s hours '+ic("arrow")+'</button></article><article class="cc-box cc-in" style="--i:3">'+ic("pin","big")+'<h5>Address</h5><p>Capital Park, Madhapur, Hyderabad</p><a class="cc-link" href="'+MAP+'" target="_blank" rel="noopener">Open in maps '+ic("arrow")+'</a></article></div>'
 +'<h4 class="cc-h cc-in" style="--i:4">Four spaces, one address</h4><div class="cc-zones">'+zones.map(function(z,i){return '<article class="cc-zone cc-in" style="--i:'+(i+5)+'"><b>'+z[0]+'</b><span>'+z[1]+'</span></article>'}).join("")+'</div>'}

function viewTalk(){
 var ig=[["@fursatind.in","Kitchen & Bar"],["@fursat_bitesandbuffet","Bites & Buffet"],["@fursatbanquets","Banquets"],["@fursatsocialclub","Social Club"]];
 return '<section class="cc-hero cc-in alt3"><p class="cc-kick">Talk to a human</p><h4>We reply <em>fastest on WhatsApp</em></h4><p>Questions, bookings, quotes or a quick hello.</p><div class="cc-row"><button class="cc-btn wa" data-cc="wa-hi">'+ic("wa")+'WhatsApp us</button><a class="cc-btn" href="tel:+919059670033">'+ic("phone")+'+91 90596 70033</a></div></section>'
 +'<h4 class="cc-h cc-in" style="--i:2">Follow the feast</h4><div class="cc-ig">'+ig.map(function(g,i){return '<a class="cc-igi cc-in" style="--i:'+(i+3)+'" href="https://www.instagram.com/'+g[0].slice(1)+'" target="_blank" rel="noopener">'+ic("ig","big")+'<b>'+g[0]+'</b><small>'+g[1]+'</small></a>'}).join("")+'</div>'
 +'<section class="cc-note cc-in" style="--i:8">'+ic("menu")+'<p><b>Looking for dishes instead?</b> Tell Ask Fursat your mood and it will suggest what to order.</p><button class="cc-btn sm" data-cc="dishes">Pick by mood</button></section>'}

var VIEWS={banq:viewBanq,cater:viewCater,visit:viewVisit,talk:viewTalk},TITLES={banq:"Banquets &amp; celebrations",cater:"Catering &amp; buffets",visit:"Visit Fursat",talk:"Talk to Fursat"};
function pill(){var b=tabsEl.querySelector('[data-tab="'+st.tab+'"]'),p=tabsEl.querySelector(".cc-pill");if(!b||!p)return;p.style.width=b.offsetWidth+"px";p.style.transform="translateX("+b.offsetLeft+"px)"}
function countUp(){if(reduce)return;[].forEach.call(body.querySelectorAll("[data-n]"),function(n){var to=+n.getAttribute("data-n"),t0=null;function f(t){if(t0===null)t0=t;var k=Math.min(1,(t-t0)/700);n.textContent=inr(Math.round(to*(1-Math.pow(1-k,3))));if(k<1)requestAnimationFrame(f)}requestAnimationFrame(f)})}
function show(tab){st.tab=tab;titleEl.innerHTML=TITLES[tab];[].forEach.call(tabsEl.querySelectorAll("button"),function(b){var on=b.getAttribute("data-tab")===tab;b.classList.toggle("on",on);b.setAttribute("aria-selected",on)});pill();body.classList.remove("swap");body.innerHTML=VIEWS[tab]();body.scrollTop=0;void body.offsetWidth;body.classList.add("swap");countUp()}
function openIt(tab,q){build();last=document.activeElement;el.hidden=false;document.documentElement.style.overflow="hidden";show(tab||"banq");requestAnimationFrame(function(){el.classList.add("on");pill()});if(q)el.querySelector("#cc-q").value="";setTimeout(function(){var b=el.querySelector(".cc-x");b&&b.focus({preventScroll:true})},80)}
function closeIt(){if(!el||el.hidden)return;el.classList.remove("on");document.documentElement.style.overflow="";setTimeout(function(){el.hidden=true},reduce?0:300);if(last&&last.focus)try{last.focus({preventScroll:true})}catch(e){}}

function onClick(e){var t=e.target.closest("[data-cc],[data-tab]");if(!t)return;
 var tab=t.getAttribute("data-tab");if(tab){show(tab);return}
 var a=t.getAttribute("data-cc"),P=window.FursatPackages;
 if(a==="x")closeIt();
 else if(a==="pk"){closeIt();P&&P.open({tab:"party"})}
 else if(a==="pkb"){closeIt();P&&P.open({tab:"menu"})}
 else if(a==="plan"){var p=el.querySelector("#cc-plan");p&&p.scrollIntoView({behavior:reduce?"auto":"smooth",block:"center"})}
 else if(a==="occ"||a==="diet"){st[a]=t.getAttribute("data-v");[].forEach.call(t.parentNode.children,function(c){c.classList.toggle("on",c===t)})}
 else if(a==="g-"||a==="g+"){st.guests=Math.max(10,Math.min(2000,st.guests+(a==="g+"?10:-10)));el.querySelector("#cc-g").textContent=st.guests}
 else if(a==="send"){var d=el.querySelector("#cc-d");st.date=d?d.value:"";if(window.fkForm)window.fkForm.send("events","Event planner (home)",{occasion:st.occ,guests:String(st.guests),date:st.date||"not chosen",food_and_drinks:st.diet});var dl=st.date?new Date(st.date+"T00:00").toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"}):"";wa(["Hi Fursat! 👋 I would like to plan an event:","• Occasion: "+st.occ,"• Guests: about "+st.guests].concat(dl?["• Date: "+dl]:[],["• Food and drinks: "+st.diet,"Please share hall options, availability and a quote."]).join("\n"))}
 else if(a==="wa-cater")wa("Hi Fursat! I would like to know about buffet and catering options.");
 else if(a==="wa-hours")wa("Hi Fursat! Could you confirm today’s opening hours?");
 else if(a==="wa-hi")wa("Hi Fursat! I would like to know more.");
 else if(a==="book"){closeIt();window.openFursatBook&&window.openFursatBook()}
 else if(a==="dishes"){closeIt();var i=document.getElementById("af-q");if(i){i.scrollIntoView({block:"center",behavior:reduce?"auto":"smooth"});setTimeout(function(){i.focus()},400)}}
}
/* tilt on cards */
document.addEventListener("pointermove",function(e){if(!el||el.hidden||reduce||e.pointerType==="touch")return;var c=e.target.closest&&e.target.closest(".cc-card");if(!c)return;var r=c.getBoundingClientRect();c.style.setProperty("--rx",((e.clientY-r.top)/r.height-.5)*-7+"deg");c.style.setProperty("--ry",((e.clientX-r.left)/r.width-.5)*9+"deg")});
document.addEventListener("pointerout",function(e){var c=e.target.closest&&e.target.closest(".cc-card");if(c){c.style.removeProperty("--rx");c.style.removeProperty("--ry")}});
window.addEventListener("resize",function(){el&&!el.hidden&&pill()});

/* hook the Ask Fursat input: info questions go to the concierge, dish questions to the original engine */
function intercept(e){
 var q=document.getElementById("af-q"),s=document.getElementById("af-send");if(!q||!s)return;
 if(e.type==="keydown"){if(e.key!=="Enter"||e.target!==q)return}
 else{var b=e.target.closest&&e.target.closest("#af-send");if(!b)return;if(b.__ccPass){b.__ccPass=0;return}}
 var r=route(q.value);if(!r)return;e.preventDefault();e.stopImmediatePropagation();openIt(r);q.value=""}
document.addEventListener("keydown",intercept,true);document.addEventListener("click",intercept,true);

/* topic chips at the front of the Ask Fursat chip row */
function chips(){var t=document.getElementById("af-track");if(!t||t.querySelector(".cc-chip"))return;
 var f=document.createDocumentFragment();
 [["banq","Banquets","hall"],["cater","Catering","cater"],["visit","Timings & map","clock"],["talk","Contact","phone"]].forEach(function(c){var b=document.createElement("button");b.type="button";b.className="af-chip cc-chip";b.innerHTML=ic(c[2])+"<span>"+c[1]+"</span>";b.addEventListener("click",function(ev){ev.stopPropagation();openIt(c[0])});f.appendChild(b)});
 t.insertBefore(f,t.firstChild);var m=document.getElementById("af-marquee");if(m)m.classList.add("cc-scroll")}
chips();
document.addEventListener("click",function(e){var t=e.target.closest&&e.target.closest("[data-open='concierge']");if(!t)return;e.preventDefault();openIt(t.getAttribute("data-pick")||"banq")});
window.FursatConcierge={open:openIt,route:route};
})();

(function(){
  var cards=[].slice.call(document.querySelectorAll(".hs-card[data-dishes]"));if(!cards.length)return;
  var reduce=matchMedia("(prefers-reduced-motion:reduce)").matches;
  cards.forEach(function(c,ci){
    var D;try{D=JSON.parse(c.getAttribute("data-dishes"))}catch(e){return}
    var sl=[].slice.call(c.querySelectorAll(".hs-sl")),body=c.querySelector(".hs-body"),h=body.querySelector("h3"),p=body.querySelector("p"),pr=body.querySelector(".hs-price"),ad=c.querySelector(".hs-add");
    if(sl.length<2||D.length!==sl.length||reduce)return;
    var i=0,paused=false,vis=true;
    c.addEventListener("mouseenter",function(){paused=true});c.addEventListener("mouseleave",function(){paused=false});
    if("IntersectionObserver"in window)new IntersectionObserver(function(es){vis=es[0].isIntersecting}).observe(c);
    function step(){
      if(paused||!vis||document.hidden){setTimeout(step,900);return}
      var n=(i+1)%sl.length;sl[n].classList.add("on");sl[i].classList.remove("on");body.classList.add("sw");
      setTimeout(function(){h.textContent=D[n][0];p.textContent=D[n][1];pr.textContent=D[n][2];c.setAttribute("data-name",D[n][0]);c.setAttribute("data-price",D[n][3]||0);if(ad)ad.setAttribute("aria-label","Add "+D[n][0]+" to my picks");body.classList.remove("sw")},520);
      i=n;setTimeout(step,6200)}
    setTimeout(step,4200+ci*2100)});
})();

/* ---------- 25. smooth video: decode the embedded clips into blob URLs (proper range seeking + gapless loops) instead of huge data: URIs ---------- */
(function(){
  if(!window.fetch||!window.URL||!URL.createObjectURL)return;
  function blob(u){return fetch(u).then(function(r){return r.blob()}).then(function(b){return URL.createObjectURL(b)})}
  [].forEach.call(document.querySelectorAll("video:not(.fx-pl-rv)"),function(v){
    var s=v.getAttribute("src");
    if(s&&s.indexOf("data:")===0){var was=!v.paused;blob(s).then(function(u){var t=v.currentTime||0;v.src=u;v.preload="auto";try{v.currentTime=t}catch(e){}if(was||v.autoplay||v.hasAttribute("data-play")){var p=v.play();p&&p.catch&&p.catch(function(){})}}).catch(function(){})}
    
  })
})();


/* ---------- 26. hero: ONE baked master video (design + our dishes + dish clips + burn transitions, seamless loop); the elephant arch follows its clock ---------- */
(function(){
  var v=document.getElementById("fxplv");
  if(!v)return;
  /* reduced motion: still load the video (poster -> real frame) but never autoplay; the pause/play button (17.js) starts it on request */
  var calm=matchMedia("(prefers-reduced-motion:reduce)").matches;
  if(calm){v.removeAttribute("autoplay");try{v.pause()}catch(e){}v.preload="metadata"}
  var vis=true;
  function play(){if(calm||(window.__fzReel&&window.__fzReel.on))return;var p=v.play();p&&p.catch&&p.catch(function(){})}
  var ready=false,live=false,hero=document.getElementById("top");
  function start(){if(live||!ready||!(hero&&hero.classList.contains("go")))return;live=true;try{v.currentTime=2.45}catch(e){}if(!calm)play()}
  v.addEventListener("loadedmetadata",function(){try{v.currentTime=2.45}catch(e){}},{once:true});
  var isPhone=matchMedia("(max-width:767px)").matches;
  var d=v.getAttribute("data-src"),sm=v.getAttribute("data-src-sm");if(sm&&(matchMedia("(max-width:899px)").matches||(navigator.connection&&navigator.connection.saveData)))d=sm;
  function loaded(){ready=true;start()}
  if(isPhone){
    v.preload="none";
    function loadAndPlay(){
      if(!v.src){
        v.src=d;
        v.load();
        loaded();
      }
      play();
    }
    var stg=document.getElementById("fxstage")||v;
    stg.addEventListener("click",loadAndPlay,{once:true});
    var pv=document.getElementById("fxpv");
    if(pv)pv.addEventListener("click",loadAndPlay,{once:true});
  } else {
    if(d.indexOf("data:")===0){fetch(d).then(function(r){return r.blob()}).then(function(b){v.src=URL.createObjectURL(b);v.load();loaded()}).catch(function(){v.src=d;loaded()})}else{v.src=d;v.load();loaded()}
  }
  if(hero&&window.MutationObserver)new MutationObserver(start).observe(hero,{attributes:true,attributeFilter:["class"]});
  if("IntersectionObserver"in window)new IntersectionObserver(function(es){vis=es[0].isIntersecting;if(vis){if(live)play()}else v.pause()}).observe(document.getElementById("top")||v);
  document.addEventListener("visibilitychange",function(){if(document.hidden)v.pause();else if(vis&&live)play()});
})();

/* ---------- 26b. hero reel first: hero-reel-540 plays once (after the intro), then hands over to the master loop ----------
   V1-reel: the reel is a plain <video preload=auto> that loads during the lens (paused on its first frame, ~3.4 s after the lens starts) and starts in the same task as the lens overlay removal.
   Whole-file blob (seekable, to join the song): fast desktop with sound on only, aborted after ~9 s, attached at lens END, never during the lens.
   reel -> master: the reel's last frame stays up until a master frame is decoded. "Watch again": the master keeps playing while the reel reloads, then one-frame swap. */
(function(){
  var $=function(i){return document.getElementById(i)},hero=$("top"),rv=$("fxrv"),fg=$("fxrvf"),bg=$("fxrvb"),bar=$("fxrvp"),m=$("fxplv"),pv=$("fxpv"),stg=$("fxstage");
  if(!rv||!fg||!m||!hero)return;
  var calm=matchMedia("(prefers-reduced-motion:reduce)").matches,phone=matchMedia("(max-width:899px)").matches,
    save=!!(navigator.connection&&navigator.connection.saveData),st="idle",loaded=false,raf=0,warm=false,cleanT=0;
  window.__fzReel={on:true};
  var RK="fz_reel",again=false,ag=$("fxagain");try{again=sessionStorage.getItem(RK)==="1"}catch(e){}   /* U2: the reel plays once per visit; later page loads go straight to the master loop and show the "Watch again" pill */
  if(phone&&bg){bg.remove();bg=null}               /* ambient fill is desktop only */
  function paused(){return !!(pv&&pv.dataset.s==="paused")}
  var bgL=false,bgW=false,lr=0;
  function load(){if(loaded)return;loaded=true;fg.preload="auto";fg.load()}   /* V1b: front reel only; the ambient bg reel loads after the reel is playing */
  function loadBg(){if(!bg||bgL)return;bgL=true;bg.preload="auto";bg.load()}
  function sync(){if(bg&&bg.readyState>0&&Math.abs(bg.currentTime-fg.currentTime)>.25)try{bg.currentTime=fg.currentTime}catch(e){}}
  function tick(){raf=0;if(st!=="play")return;var d=fg.duration||60;bar.style.transform="scaleX("+Math.min(fg.currentTime/d,1).toFixed(4)+")";sync();
    if(phone&&!warm&&d-fg.currentTime<6){warm=true;if(!m.src&&stg)stg.click()}   /* phone: start fetching the master a few seconds early */
    raf=requestAnimationFrame(tick)}
  function run(){if(st==="done")return;var p=fg.play();if(p&&p.catch)p.catch(function(){});if(bg){if(bgL){var q=bg.play();if(q&&q.catch)q.catch(function(){})}else if(!bgW){bgW=true;fg.addEventListener("playing",function(){loadBg();if(st==="play"&&!paused()){var q2=bg.play();if(q2&&q2.catch)q2.catch(function(){})}},{once:true})}}if(!raf)raf=requestAnimationFrame(tick)}
  function halt(){fg.pause();if(bg)bg.pause()}
  /* a frame of video v is on screen (or cap ms passed) */
  function frame(v,cb,cap){var d=false,t=setTimeout(fin,cap);function fin(){if(d)return;d=true;clearTimeout(t);cb()}
    if(v.requestVideoFrameCallback)v.requestVideoFrameCallback(fin);else v.addEventListener("playing",fin,{once:true})}
  /* C10: the host answers media Range requests with a 200, so the reel is not seekable by URL. A blob: URL is seekable, so with the song playing the reel can join it. Fast desktop + sound only. */
  var blobUrl=null,blobP=null,conn=navigator.connection||{};
  function songPos(){return window.__fzSongPos?window.__fzSongPos():0}
  function soundOn(){var v=0;try{v=sessionStorage.getItem("fk-sound")==="1"}catch(e){}return v||songPos()>0}
  function goodNet(){return !save&&!/^(slow-2g|2g|3g)$/.test(conn.effectiveType||"")}
  function reelUrl(){var ss=fg.querySelectorAll("source"),i,t;for(i=0;i<ss.length;i++){t=ss[i].getAttribute("type");if(!t||fg.canPlayType(t))return ss[i].getAttribute("src")}return ""}
  function fetchBlob(){if(blobP||save||calm||phone||!window.fetch||!window.URL)return;var u=reelUrl();if(!u)return;
    var ac=window.AbortController?new AbortController():null,tm=setTimeout(function(){if(ac)ac.abort()},9000);
    blobP=fetch(u,ac?{signal:ac.signal}:undefined).then(function(r){return r.ok?r.blob():Promise.reject()}).then(function(b){clearTimeout(tm);if(st==="idle"||st==="wait")blobUrl=URL.createObjectURL(b)}).catch(function(){clearTimeout(tm)})}
  addEventListener("fk:sound",function(e){if(e.detail&&e.detail.on&&goodNet()&&window.__fzLens)fetchBlob()});
  addEventListener("pagehide",function(){if(blobUrl){try{URL.revokeObjectURL(blobUrl)}catch(e){}blobUrl=null}});
  function fromBlob(done){var n=0,fin=function(){if(!n++)done()};
    [fg,bg].forEach(function(x){if(x){x.preload="auto";x.src=blobUrl;x.load()}});loaded=true;bgL=true;
    if(fg.readyState>=1)fin();else{fg.addEventListener("loadedmetadata",fin,{once:true});setTimeout(fin,1500)}}
  function lock(){var n=0,fix=function(){var T=songPos();if(T<.5||st!=="play")return;var d=Math.abs(fg.currentTime-T);
      if(d>.22){try{fg.currentTime=Math.min(T+.3,(fg.duration||60)-.5);if(bg)bg.currentTime=fg.currentTime}catch(e){}}
      if(++n<12)setTimeout(fix,600)};
    fg.addEventListener("playing",function(){setTimeout(fix,150)},{once:true})}
  function start(mode){st="play";try{sessionStorage.setItem(RK,"1")}catch(e){}hero.classList.add("reel-on");m.pause();
    if(mode==="fresh")window.__fzReel.keepSong=true;   /* no seekable blob: the mp3 keeps playing, the reel starts muted from 0, the song is never restarted */
    if(!paused())run()}
  /* plain path: start the moment the reel can play (usually already buffered during the lens); 15 s fallback = master loop + pill */
  function waitPlain(){load();var fin=false,t;
    function go(){if(fin)return;fin=true;clearTimeout(t);fg.removeEventListener("canplay",go);start(songPos()>=.5?"fresh":"plain")}
    if(fg.readyState>=3){go();return}
    fg.addEventListener("canplay",go);
    t=setTimeout(function(){if(fin)return;fin=true;fg.removeEventListener("canplay",go);handoff()},15000)}
  /* V1b contract with Hero.astro: cb() runs once the front reel can show a decoded frame (or after cap ms); the lens fades on top of it, then starts the reel on fz:lensfade */
  window.__fzReelReady=function(cb,cap){var fin=false,t;function go(){if(fin)return;fin=true;clearTimeout(t);fg.removeEventListener("canplay",go);cb()}
    if(st!=="idle"||again||save||calm||fg.readyState>=3){go();return}
    load();fg.addEventListener("canplay",go);t=setTimeout(go,cap||1500)};
  function begin(){if(st!=="idle")return;if(again){handoff();return}
    st="wait";
    if(songPos()>=.5&&blobUrl){fromBlob(function(){var T2=songPos();try{fg.currentTime=Math.min(T2,(fg.duration||60)-.5);if(bg)bg.currentTime=fg.currentTime}catch(e){}start("blob");lock()});return}
    waitPlain()}
  function handoff(){if(st==="done")return;st="done";window.__fzReel.on=false;cancelAnimationFrame(raf);raf=0;
    if(!hero.classList.contains("reel-on")){hero.classList.add("reel-again");placeAgain(4200)}   /* no reel on screen (reload, error, fallback): the pill shows at once */
    try{m.currentTime=2.45}catch(e){}
    if(!m.src&&stg)stg.click();
    var p=m.play();if(p&&p.catch)p.catch(function(){});
    var sw=false;
    function swap(){if(sw)return;sw=true;hero.classList.remove("reel-on");m.classList.add("zin");rv.classList.add("out");hero.classList.add("reel-again");placeAgain(4200);
      clearTimeout(cleanT);cleanT=setTimeout(function(){m.classList.remove("zin");halt();rv.style.visibility="hidden"},700)}
    frame(m,swap,1500)}                             /* the reel's last frame stays up until a master frame is decoded */
  /* U2: "Watch again": the master keeps playing while the reel reloads; when it can play, swap in one frame */
  function replay(){if(st!=="done")return;st="wait";warm=false;clearTimeout(cleanT);hero.classList.remove("reel-again");
    if(bar)bar.style.transform="scaleX(0)";
    [fg,bg].forEach(function(x){if(x){x.preload="auto";x.load()}});loaded=true;bgL=true;
    var fin=false,t;
    function go(){if(fin)return;fin=true;clearTimeout(t);fg.removeEventListener("canplay",go);
      st="play";window.__fzReel.on=true;
      if(pv&&paused()){pv.dataset.s="playing";pv.setAttribute("aria-label","Pause background video")}
      rv.style.visibility="";rv.classList.remove("out");m.classList.remove("zin");hero.classList.add("reel-on");m.pause();run()}
    fg.addEventListener("canplay",go);
    t=setTimeout(function(){if(fin)return;fin=true;fg.removeEventListener("canplay",go);st="done";hero.classList.add("reel-again");placeAgain(300)},15000)}
  if(ag)ag.addEventListener("click",replay);
  /* phone: the card with "Book a table" sits at the bottom, so the pill rides just above the card (and the elephant on it): bottom-left of the video, clear of the Book button and the ribbon. Position = one translateY, tracked while the card slides in. */
  function placeAgain(ms){if(!ag)return;var t0=Date.now();(function f(){
    if(!matchMedia("(max-width:899px)").matches||!hero.classList.contains("fxs-on")){ag.style.removeProperty("--ay")}
    else{var el=hero.querySelector(".fxs-el"),cd=hero.querySelector(".fxs-card");if(el&&cd){var hr=hero.getBoundingClientRect(),top=Math.min(el.getBoundingClientRect().top,cd.getBoundingClientRect().top);ag.style.setProperty("--ay",(top-hr.top-10-(ag.offsetTop+ag.offsetHeight))+"px")}}
    if(Date.now()-t0<ms)requestAnimationFrame(f)})()}
  addEventListener("resize",function(){if(hero.classList.contains("reel-again"))placeAgain(300)});
  if(again)placeAgain(4200);
  fg.addEventListener("ended",handoff);fg.addEventListener("error",handoff);
  rv.querySelectorAll("source").forEach(function(s){s.addEventListener("error",function(){if(!fg.currentSrc)handoff()})});
  if(save){handoff();return}                         /* Save-Data: skip the 60s reel, go straight to the master loop */
  if(pv)pv.addEventListener("click",function(){setTimeout(function(){
    if(st==="idle"&&!paused()){begin();return}
    if(st!=="play")return;
    m.pause();if(paused())halt();else run()},0)});
  if("IntersectionObserver"in window)new IntersectionObserver(function(es){if(st!=="play")return;if(es[0].isIntersecting){if(!paused())run()}else halt()}).observe(hero);
  document.addEventListener("visibilitychange",function(){if(st!=="play")return;if(document.hidden)halt();else if(!paused())run()});
  if(calm)return;                                    /* reduced motion: poster + the play button, no autoplay */
  var de=document.documentElement,lt=0;
  function ready(){return hero.classList.contains("go")&&!de.classList.contains("lock")}
  /* lens running: the reel loads paused on its first frame ~3.4 s in; it starts at the lens END (fz:lensend fires synchronously from the lens end(), same task as the overlay removal) */
  function check(){if(st!=="idle"||!ready())return st!=="idle";
    if(window.__fzLens){if(!lt&&!again){lt=1;if(goodNet()&&soundOn())fetchBlob()}return false}
    begin();return true}
  addEventListener("fz:lensrun",function(){if(st==="idle"&&!again&&!lr)lr=setTimeout(function(){if(st==="idle"&&!again)load()},500)});   /* V1b: fetch the front reel during the light first shot, never in dive 2 */
  addEventListener("fz:lensfade",function(){clearTimeout(lr);if(ready())begin()});
  addEventListener("fz:lensend",function(){clearTimeout(lr);if(ready())begin()});
  if(!check()&&window.MutationObserver){var mo=new MutationObserver(function(){if(check())mo.disconnect()});mo.observe(hero,{attributes:true,attributeFilter:["class"]});mo.observe(de,{attributes:true,attributeFilter:["class"]})}
})();

/* ---------- 27. intro control: one "Skip intro" opens the site straight away; crawlers, repeat visits and no-JS never see the intro ---------- */
(function(){
  var ids=["heli","intro","gate","lcap"],de=document.documentElement,seen=false;
  try{seen=sessionStorage.getItem("fz_seen")==="1"}catch(e){}
  function any(){return ids.some(function(i){return document.getElementById(i)})}
  function skipAll(){ids.forEach(function(i){var e=document.getElementById(i);e&&e.remove()});de.classList.remove("lock");var h=document.getElementById("top");h&&h.classList.add("go");
    try{sessionStorage.setItem("fz_seen","1")}catch(e){}var b=document.getElementById("fxskipall");b&&b.remove();scrollTo(0,0);dispatchEvent(new Event("fz:introend"))}
  if(seen){skipAll();return}
  if(!any())return;
  var b=document.createElement("button");b.id="fxskipall";b.type="button";b.textContent="Skip intro";b.setAttribute("aria-label","Skip intro and open the site");b.addEventListener("click",skipAll);document.body.appendChild(b);
  var g=document.getElementById("gatebtn");if(g)g.addEventListener("click",function(){try{sessionStorage.setItem("fz_seen","1")}catch(e){}},true);
  var iv=setInterval(function(){if(!any()){clearInterval(iv);b.remove()}},600);
})();

