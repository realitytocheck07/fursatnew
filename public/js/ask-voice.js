/* ask-voice.js: Ask Fursat voice words. Additive: it only watches the page and shows a short voice line under the search pill.
   It never changes dish results, prices or desk answers (ask.js / ask-host.js stay untouched).
   Voice words are the owner's: Welcome / Hungry? / Dish items / Nalli gosh biryani / Fursat / Thank you / See you soon.
   Audio: fill AUDIO once the mp3s are mapped (e.g. welcome:"/audio/welcome.mp3"). Empty = text only. */
(function(){
  var VOICE={welcome:"Welcome",hungry:"Hungry?",biryani:"Nalli gosh biryani",dishes:"Dish items",brand:"Fursat",thanks:"Thank you",bye:"See you soon"};
  var AUDIO={welcome:"",hungry:"",biryani:"",dishes:"",brand:"",thanks:"",bye:""};

  /* order matters: on a tie the earlier intent wins (biryani before dishes, hungry before dishes) */
  var INTENTS=[
    ["welcome",["hi","hii","hiii","hello","helo","hey","hola","namaste","namaskar","namaskaram","vanakkam","salaam","salam","assalamualaikum","good morning","good afternoon","good evening"]],
    ["hungry",["hungry","hunger","bhook","bhukh","aakali","akali","starving","famished","craving","cravings","khana","khaana","tindi","lunch","dinner","breakfast","brunch","snack","snacks","supper","feast","yummy","tasty","delicious","takeaway","take away","parcel"]],
    ["biryani",["biryani","biriyani","briyani","biryaani","biriani","dum","dum biryani","hyderabadi","nalli","nalli gosht","nalli gosh","nalli gost","nihari","gosht","gosh","gost","paya","raan","mandi","kacchi","pakki","handi","zafrani"]],
    ["dishes",["menu","menus","dish","dishes","item","items","cuisine","speciality","specialty","specialities","signature","recommend","recommendation","popular","famous","bestseller","must try","options",
      "veg","vegetarian","non veg","nonveg","vegan","jain","egg","halal","sweet","dessert","desserts","drink","drinks","beverage","beverages","starter","starters","appetizer","appetizers","soup","soups","salad","main course","mains","bread","roti","naan","kulcha","paratha","rice","pulao","fried rice","noodles","manchurian",
      "curry","gravy","dal","paneer","tikka","kebab","kabab","kebabs","tandoor","tandoori","grill","grilled","bbq","wings","fry","fries","chicken","mutton","lamb","fish","prawn","prawns","seafood","crab","keema","korma","masala","butter chicken","haleem",
      "ice cream","kulfi","gulab jamun","falooda","lassi","juice","shake","mocktail","cocktail","mojito","tea","chai","coffee","soda","buffet","thali","combo","pizza","pasta","burger","sandwich","momos","cake","cookies"]],
    ["brand",["fursat","furshat","fursath","who are you","about you","about us","story"]],
    ["thanks",["thanks","thank","thank you","thankyou","thanx","thx","tysm","shukriya","dhanyavad","dhanyavaad","dhanyawad","dhanyavadalu","nandri","awesome","superb","wonderful","amazing","good job","well done","excellent"]],
    ["bye",["bye","byee","goodbye","good bye","see you","see ya","cya","take care","tata","ta ta","alvida","cheers","gtg","got to go","thats all","that is all","nothing else"]]
  ];

  var norm=function(s){return String(s).toLowerCase().replace(/[\u2019']/g,"").replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim()};
  function lev(a,b){
    if(Math.abs(a.length-b.length)>2)return 9;
    var d=[],i,j;for(i=0;i<=a.length;i++){d[i]=[i]}for(j=1;j<=b.length;j++)d[0][j]=j;
    for(i=1;i<=a.length;i++)for(j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
    return d[a.length][b.length]}
  function score(text,tokens,words){
    var s=0;
    words.forEach(function(w){
      if(w.indexOf(" ")>-1){if((" "+text+" ").indexOf(" "+w+" ")>-1)s+=3;return}
      for(var i=0;i<tokens.length;i++){var t=tokens[i];
        if(t===w){s+=2;return}
        if(w.length>=5&&t.length>=4&&(t.indexOf(w)===0||w.indexOf(t)===0)){s+=1.5;return}
        if(w.length>=5&&t.length>=4&&lev(t,w)<=(w.length>=8?2:1)){s+=1;return}}});
    return s}
  /* returns an intent key, or null when no voice word fits (then the page stays as it is) */
  function match(input){
    var text=norm(input||"");if(!text)return null;
    var tokens=text.split(" "),best=null,top=0;
    INTENTS.forEach(function(it){var s=score(text,tokens,it[1]);if(s>top){top=s;best=it[0]}});
    return best}

  if(typeof module!=="undefined"&&module.exports)module.exports={match:match,VOICE:VOICE};

  var q=document.getElementById("af-q"),pill=document.querySelector(".ah-pill");
  if(!q||!pill)return;
  var calm=matchMedia("(prefers-reduced-motion: reduce)").matches;

  var st=document.createElement("style");
  st.textContent=".ah-voice{margin:8px 6px 0;min-height:1.4em;font:italic 500 1.1rem/1.3 var(--fk-serif,Georgia,serif);color:var(--as-gold-ink,#8f6516);opacity:0;transition:opacity .3s}.ah-voice.on{opacity:1}@media(prefers-reduced-motion:reduce){.ah-voice{transition:none}}";
  document.head.appendChild(st);
  var line=document.createElement("p");line.className="ah-voice";line.setAttribute("aria-hidden","true");
  pill.parentNode.insertBefore(line,pill.nextSibling);

  var clip=null;
  function say(key,sound){
    if(!key||!VOICE[key])return;
    line.textContent=VOICE[key];line.classList.add("on");
    if(sound&&AUDIO[key]){try{if(clip)clip.pause();clip=new Audio(AUDIO[key]);clip.play().catch(function(){})}catch(e){}}}

  /* page load: Welcome (text only, no sound: browsers block audio before a tap) */
  say("welcome",false);

  /* listen on document in the capture phase so ask-host.js (which stops events on the send button) cannot hide them from us */
  document.addEventListener("click",function(e){
    var t=e.target&&e.target.closest?e.target.closest("#af-send,[data-mood],#ah-ans-x,[data-desk],#ah-bubble"):null;
    if(!t)return;
    if(t.id==="ah-ans-x"){say("bye",true);return}
    if(t.hasAttribute("data-mood")){say(match(t.getAttribute("data-mood")),true);return}
    if(t.id==="af-send"){say(match(q.value),true)}
  },true);
  q.addEventListener("keydown",function(e){if(e.key==="Enter")say(match(q.value),true)},true);
})();
