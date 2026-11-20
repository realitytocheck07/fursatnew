/* ask-host.js: the reception-desk layer on /ask.
   Loads BEFORE ask.js. It answers desk questions (hours, directions, reserve, party, call) from confirmed data only,
   and lets everything else fall through to the dish finder in ask.js. No invented facts. */
(function(){
  var q=document.getElementById("af-q"),send=document.getElementById("af-send"),out=document.getElementById("as-results");
  var dataEl=document.getElementById("ask-host-data");
  if(!q||!send||!out||!dataEl)return;
  var D;try{D=JSON.parse(dataEl.textContent)}catch(e){return}
  var calm=matchMedia("(prefers-reduced-motion: reduce)").matches;
  var st=document.getElementById("as-status");
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}

  /* ---------- time in Hyderabad (IST), whatever the guest's device says ---------- */
  function ist(){
    var p=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kolkata",weekday:"long",hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(new Date()),o={};
    p.forEach(function(x){o[x.type]=x.value});
    return{day:o.weekday,mins:(+o.hour%24)*60+(+o.minute)};
  }
  function toMin(s){var a=s.split(":");return(+a[0])*60+(+a[1])}
  function label(m){m=m%1440;var h=Math.floor(m/60),ap=h>=12?"PM":"AM",h12=h%12||12;return h12+(m%60?":"+("0"+(m%60)).slice(-2):"")+" "+ap}
  var DAYS=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  function windowFor(day){
    for(var i=0;i<D.schedule.length;i++){var s=D.schedule[i];if(s.dayOfWeek.indexOf(day)>-1){var o=toMin(s.opens),c=toMin(s.closes);if(c<=o)c+=1440;return{o:o,c:c}}}
    return null}
  function status(){
    var n=ist(),w=windowFor(n.day),prev=windowFor(DAYS[(DAYS.indexOf(n.day)+6)%7]);
    /* still inside yesterday's late window (e.g. Saturday 12:30 AM belongs to Friday night) */
    if(prev&&prev.c>1440&&n.mins<prev.c-1440)return{open:true,until:label(prev.c)};
    if(w&&n.mins>=w.o&&n.mins<w.c)return{open:true,until:label(w.c)};
    if(w&&n.mins<w.o)return{open:false,next:label(w.o),today:true};
    var nx=windowFor(DAYS[(DAYS.indexOf(n.day)+1)%7]);
    return{open:false,next:nx?label(nx.o):"12 PM",today:false};
  }
  function greet(){var h=Math.floor(ist().mins/60);return h<12?"Good morning":h<17?"Good afternoon":"Good evening"}

  /* ---------- status chip ---------- */
  var chip=document.getElementById("ah-status");
  function paintStatus(){
    if(!chip)return;var s=status(),o=document.getElementById("ah-open");
    if(o)o.textContent=s.open?"Open now, until "+s.until:"Closed now, opens "+(s.today?"":"tomorrow ")+s.next;
    chip.setAttribute("data-open",s.open?"1":"0");
  }
  paintStatus();setInterval(paintStatus,60000);

  /* ---------- the desk answers ---------- */
  var WA="https://wa.me/"+D.whatsapp+"?text=";
  var ICON={
    clock:'<path d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>',
    pin:'<path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/>',
    cal:'<path d="M4 8h16M8 3v4M16 3v4M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"/>',
    gift:'<path d="M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7c-1.5-3-5-3-5-1s3 1 5 1ZM12 7c1.5-3 5-3 5-1s-3 1-5 1Z"/>',
    phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/>',
    hi:'<path d="M12 21c-5-3.5-8-6.4-8-10a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 11c0 3.6-3 6.5-8 10Z"/>'
  };
  function ico(k){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+ICON[k]+"</svg>"}
  function btn(href,text,kind,ext){return '<a class="fk-btn fk-btn--md fk-btn--'+(kind?"secondary":"primary")+' ah-btn'+(kind?" ah-btn--"+kind:"")+'" href="'+esc(href)+'"'+(ext?' target="_blank" rel="noopener"':"")+"><span>"+esc(text)+"</span></a>"}
  var ANS={
    reserve:function(){return{icon:"cal",title:"Reserve a table",body:"Send us your date, time and number of guests. We confirm every request on WhatsApp.",acts:btn("/reserve","Reserve a table")+btn(WA+encodeURIComponent("Hi Fursat! I would like to reserve a table."),"WhatsApp us","ghost",1)}},
    hours:function(){var s=status();return{icon:"clock",title:"Opening hours",body:esc(D.hours)+"."+'<br><strong class="ah-live" data-open="'+(s.open?1:0)+'">'+(s.open?"Open now, until "+s.until:"Closed now, opens "+(s.today?"":"tomorrow ")+s.next)+"</strong>",acts:btn("/reserve","Reserve a table")}},
    where:function(){return{icon:"pin",title:"Find us",body:esc(D.address)+".",acts:btn(D.maps,"Open in Maps","",1)+btn("tel:+"+D.whatsapp,"Call us","ghost")}},
    party:function(){return{icon:"gift",title:"Parties and events",body:"Birthdays, corporate and kitty parties, bar parties, catering and the banquet hall. Plan it in three short steps right here, then we continue on WhatsApp.",acts:btn("#plan","Plan an event")+btn("/party","See party packages","ghost")}},
    call:function(){return{icon:"phone",title:"Call or WhatsApp",body:esc(D.phone)+". We reply on WhatsApp.",acts:btn("tel:+"+D.whatsapp,"Call us")+btn(WA+encodeURIComponent("Hi Fursat!"),"WhatsApp us","ghost",1)}},
    hello:function(){return{icon:"hi",title:greet()+', welcome to <span class="brand-t">Fursat</span>',body:"Tell me what you feel like eating or drinking, or use the desk for a table, hours, directions or a party.",acts:""}}
  };
  var RULES=[
    ["hello",/^\s*(hi+|hello|hey+|namaste|good (morning|afternoon|evening))\W*$/],
    ["party",/(plan|host|organi[sz]e|arrange|book|hall|venue|package|packages).*(party|event|birthday|kitty|anniversary)|banquet|private (dining|event)|kitty party|corporate (event|lunch|party)/],
    ["reserve",/\b(reserve|reservation|book(ing)?|table for|booth)\b/],
    ["hours",/\b(hours?|timings?|opening|open (now|today|till|until|at)|is it open|are you open|clos(e|ing)|what time|till when|until when)\b/],
    ["where",/\b(where|address|directions?|location|located|map|parking|how (do|to|can) (i |we )?(get|reach))\b/],
    ["call",/\b(call|phone|number|whatsapp|contact|talk to|speak to)\b/]
  ];
  function intent(text){var t=text.toLowerCase();for(var i=0;i<RULES.length;i++)if(RULES[i][1].test(t))return RULES[i][0];return null}

  var timer=0;
  function show(key,echo){
    var a=ANS[key]();clearTimeout(timer);
    function fin(){
      out.hidden=false;out.classList.remove("pre");
      out.innerHTML='<h2 class="fk-ty-h2 rs-h" id="as-rh" tabindex="-1"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-leaf"/></svg><span>'+a.title+'</span></h2>'
        +'<div class="ah-card"><span class="ah-ic">'+ico(a.icon)+'</span><div class="ah-tx"><p class="ah-p">'+a.body+"</p>"+(a.acts?'<div class="ah-acts">'+a.acts+"</div>":"")+"</div></div>";
      if(st)st.textContent=a.title+". "+out.querySelector(".ah-p").textContent;
      var h=document.getElementById("as-rh");if(h){h.focus({preventScroll:true});
        var r=out.getBoundingClientRect();if(r.top>innerHeight*.6||r.top<0)out.scrollIntoView({behavior:calm?"auto":"smooth",block:"start"})}
    }
    out.hidden=false;
    if(calm){fin();return}
    out.innerHTML='<div class="ah-typing" role="status" aria-label="Fursat is typing"><i></i><i></i><i></i></div>';
    timer=setTimeout(fin,520);
  }
  window.askHost={show:show,intent:intent};

  /* run before ask.js: if the text is a desk question, answer it here and stop ask.js from running a dish search */
  function take(e){
    var t=q.value.trim();if(!t)return false;var k=intent(t);if(!k)return false;
    e.stopImmediatePropagation();e.preventDefault();show(k);return true}
  send.addEventListener("click",take,true);
  q.addEventListener("keydown",function(e){if(e.key==="Enter")take(e)},true);

  /* /ask?q=opening hours (links from other pages): answer it, and keep ask.js from searching dishes for it */
  (function(){var u=new URL(location.href),pq=u.searchParams.get("q");if(!pq)return;var k=intent(pq);if(!k)return;
    u.searchParams.delete("q");history.replaceState(null,"",u.pathname+(u.search||"")+u.hash);q.value="";
    document.addEventListener("DOMContentLoaded",function(){show(k)});if(document.readyState!=="loading")show(k)})();

  /* ---------- the desk buttons ---------- */
  document.querySelectorAll("[data-desk]").forEach(function(b){b.addEventListener("click",function(){q.value="";show(b.getAttribute("data-desk"))})});

  /* ---------- the host speaks: a bubble beside the elephant, real prompts only ---------- */
  var bub=document.getElementById("ah-bubble"),photo=document.querySelector(".ah-hero");
  if(bub&&photo){
    var P=[
      {t:"Hungry? Try “something spicy under 400”",q:"Something spicy under 400"},
      {t:"Need a table tonight?",desk:"reserve"},
      {t:"Rainy day? I know comfort food",q:"It’s raining"},
      {t:"Planning a party? Ask me",desk:"party"},
      {t:"Not sure where we are? Tap me",desk:"where"}
    ],i=0,loop=0,stopped=false,txt=bub.querySelector("span");
    function setP(){txt.textContent=P[i].t}
    function enter(){
      bub.hidden=false;setP();
      if(calm||!bub.animate)return;
      bub.animate([{opacity:0,transform:"translateY(8px) scale(.95)"},{opacity:1,transform:"none"}],{duration:420,easing:"cubic-bezier(.16,1,.3,1)",fill:"backwards"})}
    function leave(done){
      if(calm||!bub.animate){done();return}
      var an=bub.animate([{opacity:1},{opacity:0,transform:"translateY(-4px)"}],{duration:160,easing:"ease-out",fill:"forwards"});an.onfinish=function(){an.cancel();done()}}
    function next(){if(stopped||document.hidden||photo.matches(":hover,:focus-within"))return;leave(function(){i=(i+1)%P.length;enter()})}
    function start(){clearInterval(loop);if(!calm)loop=setInterval(next,6500)}
    setTimeout(function(){if(!stopped){enter();start()}},calm?0:1400);
    bub.addEventListener("click",function(){var p=P[i];if(p.desk){q.value="";show(p.desk)}else{q.value=p.q;send.click()}});
    q.addEventListener("focus",function(){stopped=true;clearInterval(loop);leave(function(){bub.hidden=true})},{once:true});
  }
})();
