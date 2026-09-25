'use strict';
const assert=require('node:assert/strict'),E=require('../../app/src/main/assets/www/engine.js'),C=require('../campaign.js');
let count=0;function test(n,fn){fn();count++;console.log('PASS '+n);}
function run(hero='riz',seed=12){let r=C.create(hero,seed);assert(C.launch(r).ok);return r;}
function give(s,i,id,stash=false){let j=s.deck.findIndex(c=>c.id===id);assert(j>=0);const c=s.deck.splice(j,1)[0];s.players[i][stash?'stash':'hand'].push(c);return c;}
function own(s){s.current=0;s.phase='act';s.players[0].line=1;}
function end(r,money){r.battle.players[0].bank=money;r.battle.players[0].roundBank=money;let i=r.battle.deck.findIndex(c=>c.id==='raptor');r.battle.deck.unshift(r.battle.deck.splice(i,1)[0]);r.battle.phase='draw';assert(E.act(r.battle,r.battle.current,{type:'draw'}).ok);assert(C.settle(r).ok);}
function inv(s){let all=s.deck.concat(s.discard,...s.players.flatMap(p=>[p.hand,p.stash]),s.pending?[s.pending.card]:[]);assert.equal(all.length,101);assert.equal(new Set(all.map(c=>c.uid)).size,101);}
function hit(r,id){let s=r.battle,c=give(s,1,id);s.current=1;s.phase='act';assert(E.act(s,1,{type:'play',uid:c.uid,target:0}).ok);}
test('All three heroes, twelve passive upgrades and three consumables',()=>{assert.equal(C.heroes.length,3);assert.equal(C.upgrades.length,12);assert.equal(C.consumables.length,3);C.heroes.forEach(h=>{let r=run(h.id);assert.equal(r.battle.players[0].hero,h.id);inv(r.battle);});});
test('Classic remains unmodified by campaign equipment',()=>{let s=E.create({seed:10});assert(!s.players[0].mods);s.players.forEach(p=>{assert(p.hand.some(c=>c.id==='burner'));assert(p.hand.some(c=>c.id==='baggie'));});inv(s);});
test('Clear rewards credited once, wallet separate from run score',()=>{let r=run();end(r,80000);assert.equal(r.score,80000);assert.equal(r.wallet,80000);assert(!C.settle(r).ok);assert.equal(r.wallet,80000);C.finishResult(r);assert.equal(r.stage,'shop');let id=r.shop.offers.find(id=>C.items[id].kind==='passive'&&C.items[id].cost<=80000);let cost=C.items[id].cost;assert(C.buy(r,id).ok);assert.equal(r.wallet,80000-cost);assert.equal(r.score,80000);assert(!C.buy(r,id).ok);});
test('Failure rolls back item and wallet checkpoint; fresh retries use a new deal',()=>{let r=C.create('riz',1);r.wallet=25000;r.bag=['receipt'];C.launch(r);let before=r.battle.seed;own(r.battle);assert(C.use(r,'receipt').ok);assert.equal(r.bag.length,0);end(r,10000);assert.equal(r.chances,2);assert.equal(r.score,0);assert.equal(r.wallet,25000);assert.deepEqual(r.bag,['receipt']);C.finishResult(r);assert.equal(r.stage,'map');C.launch(r);assert.notEqual(r.battle.seed,before);assert.equal(r.battle.players[0].bank,0);});
test('Exactly three failed attempts end a run',()=>{let r=run();for(let i=0;i<3;i++){end(r,0);C.finishResult(r);if(i<2){assert.equal(r.stage,'map');C.launch(r);}}assert.equal(r.stage,'lost');assert.equal(r.chances,0);assert(!C.launch(r).ok);});
test('Shop offers and purchased flags survive reload without reroll',()=>{let r=run();end(r,100000);C.finishResult(r);let copy=C.restore(JSON.stringify(r));assert.deepEqual(copy.shop,r.shop);assert.equal(copy.seed,r.seed);C.refresh(r);assert.notDeepEqual(r.shop.offers,copy.shop.offers);assert.equal(r.wallet,95000);});
test('No buying unaffordable, unoffered or duplicate items',()=>{let r=run();end(r,40000);C.finishResult(r);r.shop.offers=['charged'];assert(!C.buy(r,'charged').ok);assert(!C.buy(r,'pocket').ok);assert.equal(r.wallet,40000);});
test('Four passive slots require an explicit replacement; two consumable slots enforced',()=>{let r=run();end(r,200000);C.finishResult(r);r.equipped=['pocket','double','oracle','sippy'];r.shop.offers=['toolkit','bara','flask','receipt'];assert(!C.buy(r,'toolkit').ok);assert(C.buy(r,'toolkit','oracle').ok);assert.equal(r.equipped.length,4);assert(!r.equipped.includes('oracle'));C.buy(r,'bara');C.buy(r,'flask');assert(!C.buy(r,'receipt').ok);});
test('Mrs Sippy provides exactly one free refresh at this shop',()=>{let r=run();end(r,100000);C.finishResult(r);r.equipped=['sippy'];C.refresh(r);assert.equal(r.wallet,100000);C.refresh(r);assert.equal(r.wallet,95000);});
test('Geth and toolkit add slots; Dockjaw caps total at two',()=>{let r=C.create('geth',1);r.equipped=['toolkit'];C.launch(r);assert.equal(r.battle.players[0].maxStash,8);r.stage='map';r.node=2;C.launch(r);assert.equal(r.battle.players[0].maxStash,2);});
test('Pocket Rocket + Double Drop bank £20k using one action',()=>{let r=C.create('riz',1);r.equipped=['pocket','double'];C.launch(r);let s=r.battle;own(s);give(s,0,'baggie',true);give(s,0,'baggie',true);assert(E.act(s,0,{type:'bankpair'}).ok);assert.equal(s.players[0].bank,20000);assert.equal(s.current,1);inv(s);});
test('Double Drop halves only the first product with Fake Batch',()=>{let r=C.create('riz',1);r.equipped=['pocket','double'];C.launch(r);let s=r.battle;own(s);s.players[0].fake=true;give(s,0,'baggie',true);give(s,0,'baggie',true);E.act(s,0,{type:'bankpair'});assert.equal(s.players[0].bank,15000);assert(!s.players[0].fake);});
test('Banking bonuses: vape/cali, first bank and every third action',()=>{let r=C.create('caz',1);r.equipped=['vapesurge','calicash','rainyday','loyalty'];C.launch(r);let s=r.battle;for(let id of ['vape','cali','baggie']){own(s);let c=give(s,0,id,true);assert(E.act(s,0,{type:'bank',uid:c.uid}).ok);}assert.equal(s.players[0].bank,115000);inv(s);});
test('Full Charge starts line, no cards manufactured',()=>{let r=C.create('riz',1);r.equipped=['charged'];C.launch(r);assert.equal(r.battle.players[0].line,1);inv(r.battle);});
test('Riz replaces one card once; keeps current main action',()=>{let r=run();own(r.battle);let p=r.battle.players[0],uid=p.hand[1].uid,n=p.hand.length;assert(C.skill(r,[uid]).ok);assert.equal(p.hand.length,n);assert.equal(r.battle.phase,'act');assert.equal(r.battle.current,0);assert(!C.skill(r,[p.hand[1].uid]).ok);inv(r.battle);});
test('Caz counter and Comeback Bonus trigger once per encounter',()=>{let r=C.create('caz',1);r.equipped=['counterpay'];C.launch(r);let s=r.battle;give(s,0,'nocomment');hit(r,'raid');E.act(s,0,{type:'react',card:'nocomment'});assert.equal(s.players[0].bonusDraw,1);assert.equal(s.players[0].bank,5000);give(s,0,'nocomment');hit(r,'raid');E.act(s,0,{type:'react',card:'nocomment'});assert.equal(s.players[0].bonusDraw,1);assert.equal(s.players[0].bank,5000);s.current=0;s.phase='draw';let n=s.players[0].hand.length;E.act(s,0,{type:'draw'});assert.equal(s.players[0].hand.length,n+2);assert.equal(s.players[0].bonusDraw,0);inv(s);});
test('Cwtch Cushion prevents one eligible loss, not all police hits',()=>{let r=C.create('riz',1);r.equipped=['cushion'];C.launch(r);let s=r.battle;give(s,0,'baggie',true);hit(r,'search');E.act(s,0,{type:'accept'});assert.equal(s.players[0].stash.length,1);hit(r,'search');E.act(s,0,{type:'accept'});assert.equal(s.players[0].stash.length,0);inv(s);});
test('Bara consumes one item and redraws two, without spending main action',()=>{let r=C.create('geth',1);r.bag=['bara'];C.launch(r);let s=r.battle;own(s);let n=s.players[0].hand.length;assert(C.use(r,'bara',s.players[0].hand.slice(1,3).map(c=>c.uid)).ok);assert.equal(s.players[0].hand.length,n);assert.equal(s.phase,'act');assert.equal(r.bag.length,0);inv(s);});
test('Flask is not wasted with no Raid; receipt cannot stack',()=>{let r=C.create('geth',1);r.bag=['flask','receipt'];C.launch(r);let s=r.battle;own(s);assert(!C.use(r,'flask').ok);s.players[0].raid=2;assert(C.use(r,'flask').ok);assert.equal(s.players[0].raid,0);assert(C.use(r,'receipt').ok);let c=give(s,0,'baggie',true);E.act(s,0,{type:'bank',uid:c.uid});assert.equal(s.players[0].bank,15000);assert.equal(s.players[0].nextBonus,0);});
test('Redraw does not bypass Operation Raptor or duplicate cards',()=>{let r=run();let s=r.battle;own(s);let j=s.deck.findIndex(c=>c.id==='raptor');s.deck.unshift(s.deck.splice(j,1)[0]);assert(C.skill(r,[s.players[0].hand[1].uid]).ok);assert.equal(s.phase,'over');inv(s);});
test('Completion is exactly three tables, ending at Dockjaw',()=>{let r=run();for(let n=0;n<3;n++){end(r,100000);C.finishResult(r);if(n<2){C.leaveShop(r);assert.equal(r.node,n+1);C.launch(r);}}assert.equal(r.stage,'won');assert.equal(r.score,300000);assert.equal(r.cleared.length,3);assert(!C.launch(r).ok);});
test('Malformed campaign saves rejected',()=>{assert.throws(()=>C.restore('{}'));let r=run();r.wallet=-1;assert.throws(()=>C.restore(r));});
console.log(JSON.stringify({campaign_checks:count}));
// Complete runs across every hero, retries, shop purchase and all three tables.
let wins=0,losses=0,steps=0,maxSteps=0;
for(let n=1;n<=300;n++){
 let r=C.create(C.heroes[n%3].id,n),guard=0;
 while(!['won','lost'].includes(r.stage)&&guard<6000){
  if(r.stage==='map')C.launch(r);
  else if(r.stage==='battle'){
   if(r.battle.phase==='over')C.settle(r);
   else{let a=E.bot(r.battle);assert(a);assert(E.act(r.battle,E.seat(r.battle),a).ok);inv(r.battle);}
  }else if(r.stage==='result')C.finishResult(r);
  else if(r.stage==='shop'){
   for(let id of ['pocket','double','rainyday','vapesurge','calicash','counterpay','charged'])if(r.equipped.length<4)C.buy(r,id);
   C.leaveShop(r);
  }
  guard++;
 }
 assert(guard<6000);assert(['won','lost'].includes(r.stage));assert(r.wallet>=0&&r.score>=r.wallet);C.restore(JSON.stringify(r));wins+=r.stage==='won'?1:0;losses+=r.stage==='lost'?1:0;steps+=guard;maxSteps=Math.max(maxSteps,guard);
}
console.log(JSON.stringify({campaign_runs:300,wins,losses,stalls:0,steps,maxSteps}));
