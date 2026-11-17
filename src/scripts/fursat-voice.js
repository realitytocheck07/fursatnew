// fursat-voice.js — Ask Fursat intent matcher (typo-tolerant, Eng + Hinglish + Telugu-roman)
// Usage: import { askFursat } from './fursat-voice.js';  const r = askFursat(text);  // {key, text, audio}
// Set audio paths once you map the mp3s. Set `reply` on any intent to override the voice line with real info.

export const VOICE = {
  welcome: { text: "Welcome",           audio: null },   // e.g. "/audio/welcome.mp3"
  hungry:  { text: "Hungry?",           audio: null },
  dishes:  { text: "Dish items",        audio: null },
  biryani: { text: "Nalli gosh biryani", audio: null },
  brand:   { text: "Fursat",            audio: null },
  thanks:  { text: "Thank you",         audio: null },
  bye:     { text: "See you soon",      audio: null },
};

// voice = which voice line to use. reply = optional real answer (menu/prices/hours/etc.) shown with it.
export const INTENTS = [
  { key: "welcome", voice: "welcome", words: [
    "hi","hii","hiii","hello","helo","hey","hola","namaste","namaskar","namaskaram","vanakkam","salaam","salam","assalamualaikum",
    "good morning","good afternoon","good evening","good night","gm","start","begin","anyone","anybody","there","yo","sup","howdy"] },

  { key: "hungry", voice: "hungry", words: [
    "hungry","hunger","bhook","bhukh","aakali","akali","starving","famished","craving","cravings","eat","eating","food","khana","khaana","tindi",
    "lunch","dinner","breakfast","brunch","snack","snacks","supper","meal","meals","dine","dining","feast","treat","yummy","tasty","delicious",
    "order","ordering","takeaway","take away","parcel","delivery","deliver","zomato","swiggy","dotpe","online","pickup","pick up"] },

  { key: "dishes", voice: "dishes", words: [
    "menu","menus","dish","dishes","item","items","list","card","cuisine","speciality","specialty","specialities","special","specials","signature",
    "recommend","recommendation","suggest","suggestion","popular","famous","best","bestseller","must try","chef","whats available","what do you have","options",
    "veg","vegetarian","non veg","nonveg","non-veg","vegan","jain","egg","halal","spicy","mild","sweet","dessert","desserts","drink","drinks","beverage","beverages",
    "starter","starters","appetizer","appetizers","soup","soups","salad","main course","mains","sides","bread","roti","naan","kulcha","paratha","rice","pulao","fried rice","noodles","manchurian",
    "curry","gravy","dal","paneer","tikka","kebab","kabab","kebabs","tandoor","tandoori","grill","grilled","bbq","barbeque","wings","fry","fries",
    "chicken","mutton","lamb","fish","prawn","prawns","seafood","crab","beef","pork","keema","korma","masala","butter chicken","haleem","biryanis",
    "ice cream","kulfi","gulab jamun","falooda","lassi","juice","shake","mocktail","cocktail","mojito","tea","chai","coffee","soda","water","buffet","thali","combo","meal box"] },

  { key: "biryani", voice: "biryani", words: [
    "biryani","biriyani","briyani","biryaani","biriani","dum","dum biryani","hyderabadi","hyderabad biryani","nalli","nalli gosht","nalli gosh","nalli gost","nihari","gosht","gosh","gost","bone","marrow","paya","raan","mandi","kacchi","pakki","handi","zafrani"] },

  { key: "brand", voice: "brand", words: [
    "fursat","furshat","fursath","about","about you","about us","who are you","who r u","what is this","what is fursat","story","history","owner","chef","team","kitchen","bar","restaurant","hotel","cafe","place","brand","instagram","insta","facebook","social","website","contact","phone","number","call","whatsapp","email","mail"] },

  { key: "thanks", voice: "thanks", words: [
    "thanks","thank","thank you","thankyou","thanx","thx","ty","tysm","shukriya","dhanyavad","dhanyavaad","dhanyawad","dhanyavadalu","nandri","great","awesome","nice","cool","perfect","super","superb","wonderful","amazing","good job","well done","excellent","ok","okay","okk","k","fine","alright","got it"] },

  { key: "bye", voice: "bye", words: [
    "bye","byee","goodbye","good bye","see you","see ya","cya","later","tc","take care","tata","ta ta","alvida","chalo","cheers","gtg","got to go","leaving","done","that's all","thats all","nothing else","exit","close","quit","visit again","will come","coming","on my way","reaching"] },

  // Intents with no voice line yet: they fall back to the nearest voice line until you set `reply`.
  { key: "hours",    voice: "welcome", reply: null, words: ["time","timing","timings","hours","open","opening","close","closing","closed","when","today","tonight","tomorrow","sunday","monday","tuesday","wednesday","thursday","friday","saturday","weekend","holiday","late night","till when"] },
  { key: "location", voice: "brand",   reply: null, words: ["where","location","address","map","maps","direction","directions","route","near","nearby","landmark","parking","valet","reach","how to reach","find","locate","branch","branches","outlet","outlets","city","area","road"] },
  { key: "booking",  voice: "welcome", reply: null, words: ["book","booking","reserve","reservation","table","tables","seat","seats","seating","slot","walk in","walkin","queue","wait","waiting","rooftop","ac","outdoor","indoor","private","cabin","couple","family","kids","group"] },
  { key: "party",    voice: "dishes",  reply: null, words: ["party","parties","package","packages","banquet","hall","event","events","celebrate","celebration","birthday","bday","anniversary","wedding","engagement","reception","corporate","meeting","get together","gettogether","function","catering","caterer","bulk","big order","buffet package","per plate","per head","guests","people","pax"] },
  { key: "price",    voice: "dishes",  reply: null, words: ["price","prices","cost","costs","rate","rates","rs","rupees","rupee","inr","budget","cheap","expensive","affordable","how much","charges","charge","gst","tax","bill","offer","offers","discount","discounts","coupon","coupons","promo","deal","deals","combo offer","free"] },
  { key: "payment",  voice: "thanks",  reply: null, words: ["pay","payment","upi","gpay","phonepe","paytm","card","cash","cod","net banking","wallet","refund","invoice","receipt"] },
  { key: "coming",   voice: "welcome", reply: null, words: ["launch","launching","opening date","coming soon","inauguration","new","soon","countdown","when open","grand opening","app","application"] },
  { key: "help",     voice: "welcome", reply: null, words: ["help","support","problem","issue","complaint","feedback","review","reviews","rating","suggestion box","not working","error","human","agent","staff","manager","talk to someone"] },
];

// ---------- matching ----------
const norm = s => s.toLowerCase().replace(/[^a-z0-9\u0900-\u097F\u0C00-\u0C7F\s]/g, " ").replace(/\s+/g, " ").trim();

function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
  return d[a.length][b.length];
}

function score(text, tokens, words) {
  let s = 0;
  for (const w of words) {
    if (w.includes(" ")) { if (text.includes(w)) s += 3; continue; }       // phrase hit
    for (const t of tokens) {
      if (t === w) { s += 2; break; }                                        // exact
      if (w.length >= 5 && t.length >= 4 && (t.startsWith(w) || w.startsWith(t))) { s += 1.5; break; } // stem
      if (w.length >= 5 && lev(t, w) <= (w.length >= 8 ? 2 : 1)) { s += 1; break; }                     // typo
    }
  }
  return s;
}

export function askFursat(input, { play = false } = {}) {
  const text = norm(input || "");
  const tokens = text.split(" ").filter(Boolean);
  let best = null, top = 0;
  for (const it of INTENTS) {
    const s = score(text, tokens, it.words);
    if (s > top) { top = s; best = it; }
  }
  const it = best || INTENTS[0];                       // no match -> Welcome
  const v = VOICE[it.voice];
  if (play && v.audio) new Audio(v.audio).play().catch(() => {});
  return { key: it.key, matched: !!best, text: v.text, reply: it.reply ?? null, audio: v.audio };
}
