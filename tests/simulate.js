'use strict';
const assert=require('node:assert/strict');
const E=require('../app/src/main/assets/www/engine.js');
let maxSteps=0, banks=0,counters=0;
for(let i=0;i<1000;i++){
 const s=E.create({players:2+i%5,rounds:[3,5,7][i%3],difficulty:['casual','sharp','ruthless'][i%3],seed:i+10});
 let steps=0;
 while(s.phase!=='over'&&steps<5000){
  if(s.phase==='round'){assert(E.nextRound(s).ok);continue;}
  const a=E.bot(s);assert(a,'AI stalled');
  assert(E.act(s,E.seat(s),a).ok,'AI made an invalid move');
  const all=s.deck.concat(s.discard,...s.players.flatMap(p=>[p.hand,p.stash]),s.pending?[s.pending.card]:[]);
  assert.equal(all.length,101,'Card conservation');assert.equal(new Set(all.map(c=>c.uid)).size,101,'Duplicate cards');
  steps++;
 }
 assert.equal(s.phase,'over');maxSteps=Math.max(maxSteps,steps);banks+=s.stats.banks;counters+=s.stats.counters;
 if(i%100===0)E.restore(JSON.stringify(s));
}
console.log(JSON.stringify({games:1000,maxSteps,banks,counters,stalls:0}));
