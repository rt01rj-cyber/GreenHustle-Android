(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.GreenHustleEngine=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const MONEY=n=>`£${Math.round((n||0)/1000)}k`;
const CATALOG=[
{id:'pitch_open',title:'Pitch Open',kind:'market',effect:'open',copies:8,icon:'🏪',text:'Open your pitch. Stock cards can now be played.'},
{id:'cash_out',title:'Cash Out',kind:'market',effect:'cashout',copies:4,icon:'🏁',text:'End the round. Requires an open pitch and no active pressure.'},
{id:'garden_batch',title:'Garden Batch',kind:'stock',value:10000,copies:7,icon:'🌿',text:'Reliable local stock.'},
{id:'local_favourite',title:'Local Favourite',kind:'stock',value:20000,copies:7,icon:'🍃',text:'A dependable crowd-pleaser.'},
{id:'festival_supply',title:'Festival Supply',kind:'stock',value:30000,copies:6,icon:'🎪',text:'Busy weekend. Bigger return.'},
{id:'premium_crop',title:'Premium Crop',kind:'stock',value:45000,copies:5,icon:'✨',text:'High-value stock worth protecting.'},
{id:'green_reserve',title:'Green Reserve',kind:'stock',value:60000,copies:4,icon:'🌱',text:'Rare stock with serious value.'},
{id:'collectors_cut',title:"Collector's Cut",kind:'stock',value:75000,copies:2,icon:'💎',text:'The most valuable stock in the deck.'},
{id:'council_visit',title:'Council Visit',kind:'heat',effect:'inspection',copies:4,icon:'📋',text:'Pressure reduces exposed stock at scoring.',target:true},
{id:'supply_freeze',title:'Supply Freeze',kind:'heat',effect:'freeze',copies:4,icon:'🧊',text:'Target cannot play Stock until cleared.',target:true},
{id:'paper_trail',title:'Paper Trail',kind:'heat',effect:'paper',copies:3,icon:'🗂️',text:'Target loses their highest exposed Stock.',target:true},
{id:'rumour_mill',title:'Rumour Mill',kind:'heat',effect:'rumour',copies:3,icon:'🗣️',text:'Target takes a £10k round penalty.',target:true},
{id:'all_clear',title:'All Clear',kind:'relief',effect:'clear_all',copies:5,icon:'✅',text:'Remove every active pressure card.'},
{id:'quiet_word',title:'Quiet Word',kind:'relief',effect:'clear_one',copies:4,icon:'🤝',text:'Remove one active pressure card.'},
{id:'lockbox',title:'Lockbox',kind:'protect',effect:'protect_one',copies:4,icon:'🔒',text:'Protect your highest exposed Stock.'},
{id:'trusted_crew',title:'Trusted Crew',kind:'protect',effect:'shield_next',copies:3,icon:'🛡️',text:'Your next two Stock cards enter protected.'},
{id:'clean_books',title:'Clean Books',kind:'protect',effect:'heat_immunity',copies:3,icon:'📒',text:'Cancel the next pressure card against you.'},
{id:'swap_crates',title:'Swap Crates',kind:'action',effect:'swap',copies:3,icon:'🔁',text:'Swap highest exposed Stock with a rival.',target:true},
{id:'lucky_find',title:'Lucky Find',kind:'action',effect:'draw_two',copies:3,icon:'🎁',text:'Draw two extra cards.'},
{id:'price_spike',title:'Price Spike',kind:'action',effect:'spike',copies:3,icon:'📈',text:'Your next Stock is worth 50% more.'},
{id:'price_crash',title:'Price Crash',kind:'action',effect:'crash',copies:2,icon:'📉',text:'Rivals lose 20% from exposed Stock this round.'},
{id:'windfall',title:'Windfall',kind:'action',effect:'windfall',copies:3,icon:'💷',text:'Bank £20k immediately.'},
{id:'tax_bill',title:'Tax Bill',kind:'action',effect:'tax',copies:3,icon:'🧾',text:'Give a rival a £20k round penalty.',target:true},
{id:'spoiled_stock',title:'Spoiled Stock',kind:'risk',penalty:15000,copies:4,icon:'🥀',text:'-£15k if held when the round ends.'},
{id:'bad_debt',title:'Bad Debt',kind:'risk',penalty:25000,copies:3,icon:'💸',text:'-£25k if held when the round ends.'}
];
const catalogById=Object.fromEntries(CATALOG.map(c=>[c.id,c]));let uid=1;
const shuffle=(a,r=Math.random)=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const buildDeck=()=>shuffle(CATALOG.flatMap(d=>Array.from({length:d.copies},()=>({...d,uid:`c${uid++}`}))));
const player=(name,isHuman)=>({name,isHuman,total:0,hand:[],marketOpen:false,heat:[],stash:[],securedCash:0,roundPenalty:0,exposedLossPercent:0,shieldTokens:0,heatImmunity:0,nextStockMultiplier:1,skipTurns:0});
const log=(s,m)=>{s.log.unshift(m);s.log=s.log.slice(0,30);};
function resetRound(s,starter){s.deck=buildDeck();s.discard=[];s.currentPlayer=starter;s.startingPlayer=starter;s.drawn=false;s.roundEnded=false;s.lastRound=null;s.players.forEach(p=>Object.assign(p,{hand:[],marketOpen:false,heat:[],stash:[],securedCash:0,roundPenalty:0,exposedLossPercent:0,shieldTokens:0,heatImmunity:0,nextStockMultiplier:1,skipTurns:0}));for(let n=0;n<6;n++)s.players.forEach(p=>{if(s.deck.length)p.hand.push(s.deck.pop());});}
function newGame(o={}){const mode=o.mode==='local'?'local':'solo',count=Math.max(2,Math.min(6,Number(o.players||3))),names=['You','Mags','Dai','Frankie','Nessa','Taff'];const s={version:1,mode,difficulty:o.difficulty||'sharp',target:Number(o.target||300000),round:1,direction:1,players:Array.from({length:count},(_,i)=>player(mode==='local'?`Player ${i+1}`:names[i],mode==='local'||i===0)),currentPlayer:0,startingPlayer:0,deck:[],discard:[],drawn:false,roundEnded:false,gameOver:false,winner:null,lastRound:null,log:[],turnNo:1};resetRound(s,0);log(s,`Round 1 begins. First to ${MONEY(s.target)} wins.`);return s;}
const stashValue=(p,exposedOnly=false)=>p.stash.reduce((t,c)=>t+((!exposedOnly||!c.protected)?Math.round(c.value*(c.multiplier||1)):0),0);
const highestExposed=p=>p.stash.filter(c=>!c.protected).sort((a,b)=>b.value*(b.multiplier||1)-a.value*(a.multiplier||1))[0]||null;
const projectedRoundScore=p=>{const safe=p.stash.filter(c=>c.protected).reduce((t,c)=>t+Math.round(c.value*(c.multiplier||1)),0),open=p.stash.filter(c=>!c.protected).reduce((t,c)=>t+Math.round(c.value*(c.multiplier||1)),0),loss=Math.min(70,p.exposedLossPercent+(p.heat.length?25:0)),risk=p.hand.reduce((t,c)=>t+(c.penalty||0),0);return Math.max(0,safe+Math.round(open*(100-loss)/100)+p.securedCash-p.roundPenalty-risk);};
function draw(s,i=s.currentPlayer){if(s.gameOver||s.roundEnded)return{ok:false,message:'The round is over.'};if(i!==s.currentPlayer)return{ok:false,message:'Not this player’s turn.'};if(s.drawn)return{ok:false,message:'You already drew this turn.'};if(!s.deck.length){scoreRound(s,'The deck ran out.');return{ok:false,message:'The deck is empty.'};}const card=s.deck.pop();s.players[i].hand.push(card);s.drawn=true;log(s,`${s.players[i].name} draws a card.`);return{ok:true,card};}
const validTarget=(s,i,t)=>Number.isInteger(t)&&t>=0&&t<s.players.length&&t!==i;
function validate(s,i,c,t){const p=s.players[i];if(!s.drawn)return'Draw a card first.';if(!c)return'Choose a card.';if(c.target&&!validTarget(s,i,t))return'Choose a rival first.';if(c.effect==='open'&&p.marketOpen)return'Your pitch is already open.';if(c.effect==='cashout'&&(!p.marketOpen||p.heat.length))return'Cash Out needs an open pitch with no pressure.';if(c.kind==='stock'&&!p.marketOpen)return'Open your pitch before playing Stock.';if(c.kind==='stock'&&p.heat.some(h=>h.effect==='freeze'))return'Supply Freeze blocks Stock.';if(c.effect==='protect_one'&&!highestExposed(p))return'No exposed Stock to protect.';if(c.effect==='clear_one'&&!p.heat.length)return'No pressure to clear.';if(c.effect==='clear_all'&&!p.heat.length)return'No pressure to clear.';if(c.effect==='swap'){const q=s.players[t];if(!highestExposed(p)||!highestExposed(q))return'Both players need exposed Stock.';}return null;}
const cardPlayable=(s,i,h)=>{const c=s.players[i].hand[h];if(!c)return false;if(c.target)return s.players.some((_,t)=>t!==i&&!validate(s,i,c,t));return!validate(s,i,c,null);};
function advance(s){if(!s.deck.length){scoreRound(s,'The deck ran out.');return;}const n=s.players.length;for(let g=0;g<n*2;g++){const next=(s.currentPlayer+s.direction+n)%n;s.currentPlayer=next;const p=s.players[next];if(p.skipTurns){p.skipTurns--;continue;}s.drawn=false;s.turnNo++;return;}}
function playCard(s,i,h,t=null){if(s.gameOver||s.roundEnded)return{ok:false,message:'The round is over.'};if(i!==s.currentPlayer)return{ok:false,message:'Not this player’s turn.'};const p=s.players[i],c=p.hand[h],err=validate(s,i,c,t);if(err)return{ok:false,message:err};p.hand.splice(h,1);let note=`${p.name} plays ${c.title}.`,end=false;
if(c.effect==='open')p.marketOpen=true;
else if(c.effect==='cashout')end=true;
else if(c.kind==='stock'){const mult=p.nextStockMultiplier||1;p.nextStockMultiplier=1;p.stash.push({...c,multiplier:mult,protected:p.shieldTokens>0});if(p.shieldTokens>0)p.shieldTokens--;}
else if(c.effect==='clear_all')p.heat=[];
else if(c.effect==='clear_one')p.heat.shift();
else if(c.effect==='protect_one'){const x=highestExposed(p);if(x)x.protected=true;}
else if(c.effect==='shield_next')p.shieldTokens+=2;
else if(c.effect==='heat_immunity')p.heatImmunity++;
else if(c.kind==='heat'){const q=s.players[t];if(q.heatImmunity){q.heatImmunity--;note+=` ${q.name}'s Clean Books cancels it.`;}else if(c.effect==='paper'){const x=highestExposed(q);if(x){q.stash=q.stash.filter(z=>z.uid!==x.uid);s.discard.push(x);note+=` ${q.name} loses ${x.title}.`;}}else{q.heat.push({uid:c.uid,id:c.id,title:c.title,effect:c.effect,icon:c.icon});if(c.effect==='rumour')q.roundPenalty+=10000;}}
else if(c.effect==='swap'){const q=s.players[t],a=highestExposed(p),b=highestExposed(q);p.stash=p.stash.map(x=>x.uid===a.uid?b:x);q.stash=q.stash.map(x=>x.uid===b.uid?a:x);}
else if(c.effect==='draw_two'){for(let n=0;n<2&&s.deck.length;n++)p.hand.push(s.deck.pop());}
else if(c.effect==='spike')p.nextStockMultiplier=Math.max(p.nextStockMultiplier,1.5);
else if(c.effect==='crash')s.players.forEach((q,j)=>{if(j!==i)q.exposedLossPercent+=20;});
else if(c.effect==='windfall')p.securedCash+=20000;
else if(c.effect==='tax')s.players[t].roundPenalty+=20000;
s.discard.push(c);log(s,note);if(end){scoreRound(s,`${p.name} cashed out.`);return{ok:true,roundEnded:true};}advance(s);return{ok:true};}
function discardCard(s,i,h){if(s.gameOver||s.roundEnded)return{ok:false,message:'The round is over.'};if(i!==s.currentPlayer)return{ok:false,message:'Not this player’s turn.'};if(!s.drawn)return{ok:false,message:'Draw a card first.'};const p=s.players[i],c=p.hand[h];if(!c)return{ok:false,message:'Choose a card.'};p.hand.splice(h,1);s.discard.push(c);log(s,`${p.name} bins ${c.title}.`);advance(s);return{ok:true};}
function scoreRound(s,reason){if(s.roundEnded||s.gameOver)return s.lastRound;const details=s.players.map((p,index)=>{const protectedValue=p.stash.filter(c=>c.protected).reduce((t,c)=>t+Math.round(c.value*(c.multiplier||1)),0),exposedBase=p.stash.filter(c=>!c.protected).reduce((t,c)=>t+Math.round(c.value*(c.multiplier||1)),0),lossPct=Math.min(70,p.exposedLossPercent+(p.heat.length?25:0)),exposedValue=Math.round(exposedBase*(100-lossPct)/100),handPenalty=p.hand.reduce((t,c)=>t+(c.penalty||0),0),score=Math.max(0,protectedValue+exposedValue+p.securedCash-p.roundPenalty-handPenalty);return{index,protectedValue,exposedBase,exposedValue,lossPct,secured:p.securedCash,roundPenalty:p.roundPenalty,handPenalty,score,bonus:0};});const top=Math.max(...details.map(d=>d.score)),wins=details.filter(d=>d.score===top);if(wins.length===1)wins[0].bonus=15000;details.forEach(d=>{d.totalForRound=d.score+d.bonus;s.players[d.index].total+=d.totalForRound;});s.lastRound={reason,details,winnerIndex:wins.length===1?wins[0].index:null};s.roundEnded=true;const reached=s.players.map((p,i)=>({i,total:p.total})).filter(x=>x.total>=s.target).sort((a,b)=>b.total-a.total);if(reached.length){s.gameOver=true;s.winner=reached[0].i;}log(s,reason);return s.lastRound;}
function nextRound(s){if(!s.roundEnded||s.gameOver)return{ok:false};const starter=s.lastRound&&s.lastRound.winnerIndex!=null?s.lastRound.winnerIndex:(s.startingPlayer+1)%s.players.length;s.round++;s.direction*=-1;resetRound(s,starter);log(s,`Round ${s.round} begins. Direction reverses.`);return{ok:true};}
function chooseTarget(s,i,c){const xs=s.players.map((p,j)=>({j,p,power:p.total+stashValue(p)})).filter(x=>x.j!==i);if(c.effect==='swap'){const ok=xs.filter(x=>highestExposed(x.p));if(ok.length)return ok.sort((a,b)=>b.power-a.power)[0].j;}return xs.sort((a,b)=>b.power-a.power)[0]?.j??null;}
function chooseAiMove(s,i){const p=s.players[i],moves=p.hand.map((card,handIndex)=>({card,handIndex,targetIndex:card.target?chooseTarget(s,i,card):null})).filter(m=>!validate(s,i,m.card,m.targetIndex));if(!moves.length){const r=p.hand.findIndex(c=>c.kind==='risk');return{discard:true,handIndex:r>=0?r:0};}const f=pred=>moves.find(pred);let m;if(p.heat.length&&(m=f(x=>x.card.effect==='clear_all'||x.card.effect==='clear_one')))return m;if(!p.marketOpen&&(m=f(x=>x.card.effect==='open')))return m;const threshold=s.difficulty==='ruthless'?105000:s.difficulty==='casual'?65000:85000;if(projectedRoundScore(p)>=threshold&&(m=f(x=>x.card.effect==='cashout')))return m;if((m=f(x=>x.card.effect==='protect_one')))return m;if((m=f(x=>x.card.effect==='spike'))&&p.hand.some(c=>c.kind==='stock'&&c.value>=45000))return m;const stock=moves.filter(x=>x.card.kind==='stock').sort((a,b)=>b.card.value-a.card.value);if(stock.length)return stock[0];if((m=f(x=>['windfall','draw_two'].includes(x.card.effect))))return m;const attack=moves.filter(x=>x.card.kind==='heat'||['tax','crash','swap'].includes(x.card.effect));return attack[0]||moves[0];}
function reviveState(s){if(!s||!Array.isArray(s.players))throw new Error('Invalid save');s.players.forEach(p=>{p.hand||=[];p.stash||=[];p.heat||=[];p.nextStockMultiplier??=1;p.exposedLossPercent??=0;});return s;}
return{CATALOG,catalogById,newGame,draw,playCard,discardCard,nextRound,projectedRoundScore,stashValue,cardPlayable,chooseAiMove,chooseTarget,scoreRound,reviveState,MONEY,shuffle};
});