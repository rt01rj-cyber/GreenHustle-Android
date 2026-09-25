'use strict';
const assert=require('node:assert/strict');
const E=require('../app/src/main/assets/www/engine.js');
const C=require('../app/src/main/assets/www/campaign.js');
let count=0;
function test(n,f){f();console.log('PASS '+n);count++;}
function take(s,id){let i=s.deck.findIndex(c=>c.id===id);assert(i>=0);return s.deck.splice(i,1)[0];}
function all(s){return s.deck.concat(s.discard,...s.players.flatMap(p=>[p.hand,p.stash]),s.pending?[s.pending.card]:[]);}
function valid(s){assert.equal(all(s).length,101);assert.equal(new Set(all(s).map(c=>c.uid)).size,101);E.restore(JSON.stringify(s));}
function run(hero='riz',node=0){const r=C.create(hero,100+node);r.node=node;C.launch(r);return r;}
test('Eight complete fictional encounters, evidence and three operative replies',()=>{assert.equal(C.tables.length,8);C.tables.forEach(t=>{assert(t.evidence&&t.scene&&t.intro&&t.after);C.heroes.forEach(h=>assert(t.reply[h.id]));});assert(C.tables[7].place.includes('Eireannach'));});
test('Banking to target clears immediately without drawing Raptor',()=>{let r=run(),s=r.battle,p=s.players[0];s.phase='act';p.line=1;p.bank=35000;p.roundBank=35000;let c=take(s,'baggie');p.stash.push(c);let left=s.deck.length;assert(E.act(s,0,{type:'bank',uid:c.uid}).ok);assert.equal(s.phase,'over');assert.equal(s.clearReason,'target');assert.equal(s.deck.length,left);assert.equal(s.events[0].type,'clear');valid(s);assert(C.settle(r).ok);assert.equal(r.wallet,40000);assert.equal(r.score,40000);assert(!C.settle(r).ok);C.finishResult(r);assert.equal(r.stage,'shop');});
test('Counter bonus can clear an encounter out of turn',()=>{let r=run('caz'),s=r.battle,p=s.players[0];p.bank=35000;p.roundBank=35000;p.mods.counterpay=true;p.hand.push(take(s,'nocomment'));s.current=1;s.phase='act';let raid=take(s,'raid');s.players[1].hand.push(raid);E.act(s,1,{type:'play',uid:raid.uid,target:0});E.act(s,0,{type:'react',card:'nocomment'});assert.equal(s.phase,'over');assert.equal(s.clearReason,'target');valid(s);});
test('Classic still waits for Raptor',()=>{let s=E.create({seed:9});s.players[0].bank=999999;assert.equal(E.checkVictory(s),false);assert.equal(s.phase,'draw');});
test('After drawing, excess hand cards require an explicit free trim',()=>{let r=run(),s=r.battle,p=s.players[0];p.hand.push(take(s,'cali'),take(s,'vape'));assert.equal(p.hand.length,7);E.act(s,0,{type:'draw'});assert.equal(s.phase,'trim');assert.equal(p.hand.length,8);assert(!E.legal(s,0).some(a=>a.type==='play'));let n=s.current;let c=p.hand[3];E.act(s,0,{type:'trim',uid:c.uid});assert.equal(p.hand.length,7);assert.equal(s.phase,'act');assert.equal(s.current,n);valid(s);});
test('Taxed cannot secretly overflow the hand after an action',()=>{let r=run(),s=r.battle,p=s.players[0];while(p.hand.length<8)p.hand.push(take(s,'baggie'));s.phase='act';p.line=1;let b=take(s,'baggie');p.stash.push(b);E.act(s,0,{type:'bank',uid:b.uid});assert.equal(s.phase,'trim');assert.equal(s.trimNext,'advance');E.act(s,0,E.legal(s,0)[0]);assert.equal(s.current,1);assert.equal(s.phase,'draw');valid(s);});
test('Trim save resumes to the right action rather than adding another turn',()=>{let r=run(),s=r.battle,p=s.players[0];while(p.hand.length<8)p.hand.push(take(s,'baggie'));s.phase='trim';s.trimNext='act';let copy=E.restore(JSON.stringify(s));E.act(copy,0,E.legal(copy,0)[0]);assert.equal(copy.phase,'act');assert.equal(copy.current,0);});
test('Boss constraints and suspended upgrades match announced rules',()=>{let r=C.create('geth',4);r.equipped=['toolkit','pocket'];r.node=5;C.launch(r);assert.equal(r.battle.players[0].maxStash,2);r= C.create('riz',4);r.equipped=['pocket','charged'];r.node=4;C.launch(r);assert.equal(r.battle.players[0].suspended,'pocket');assert(!r.battle.players[0].mods.pocket);assert(r.battle.players[0].mods.charged);});
test('A failed attempt cannot farm the wallet or keep consumed checkpoint items',()=>{let r=run();r.wallet=25000;r.score=50000;r.bag=['bara'];r.checkpoint={wallet:25000,score:50000,equipped:[],bag:['bara']};r.bag=[];let s=r.battle;const i=s.deck.findIndex(c=>c.id==='raptor');s.deck.unshift(s.deck.splice(i,1)[0]);E.act(s,0,{type:'draw'});C.settle(r);assert.equal(r.wallet,25000);assert.equal(r.score,50000);assert.deepEqual(r.bag,['bara']);assert.equal(r.chances,2);});
test('Shop purchase reduces wallet, not score; duplicate result is rejected',()=>{let r=run();r.battle.players[0].bank=40000;E.checkVictory(r.battle);C.settle(r);C.finishResult(r);let id=r.shop.offers.find(id=>C.items[id].cost<=r.wallet);let cost=C.items[id].cost;assert(C.buy(r,id).ok);assert.equal(r.wallet,40000-cost);assert.equal(r.score,40000);assert(!C.buy(r,id).ok);assert(C.restore(JSON.stringify(r)));});
test('Only the eighth result ends the case',()=>{for(let node=0;node<8;node++){let r=run('riz',node);r.battle.players[0].bank=C.tables[node].target;E.checkVictory(r.battle);C.settle(r);C.finishResult(r);assert.equal(r.stage,node===7?'won':'shop');}});
let wins=0,losses=0,maxSteps=0,stages=Array(8).fill(0);
for(let n=0;n<300;n++){
 let r=C.create(C.heroes[n%3].id,n+500),steps=0;
 while(!['won','lost'].includes(r.stage)&&steps<5000){
  if(r.stage==='map'){assert(C.launch(r).ok);stages[r.node]++;}
  else if(r.stage==='shop'){for(const id of r.shop.offers){if(r.equipped.length<4&&C.items[id].kind==='passive'&&r.wallet>=C.items[id].cost)C.buy(r,id);}C.leaveShop(r);}
  else if(r.stage==='result')C.finishResult(r);
  else {let s=r.battle;if(s.phase==='over')C.settle(r);else{let a=E.bot(s);assert(a);assert(E.act(s,E.seat(s),a).ok);valid(s);if(s.phase==='act')assert(s.players[s.current].hand.length<=7);}}
  steps++;
 }
 assert(['won','lost'].includes(r.stage));if(r.stage==='won')wins++;else losses++;maxSteps=Math.max(maxSteps,steps);
}
console.log(JSON.stringify({focused:count,simulations:300,wins,losses,maxSteps,stages,stalls:0}));
