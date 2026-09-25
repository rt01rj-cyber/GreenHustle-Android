const E = require('../app/src/main/assets/www/engine.js');
let games=0, rounds=0, maxTurns=0;
for(let g=0; g<100; g++){
  const s=E.newGame({mode:'solo',players:4,target:300000,difficulty:['casual','sharp','ruthless'][g%3]});
  s.players.forEach(p=>p.isHuman=false);
  let steps=0;
  while(!s.gameOver && steps<5000){
    if(s.roundEnded){ rounds++; E.nextRound(s); continue; }
    const idx=s.currentPlayer;
    const d=E.draw(s,idx);
    if(s.roundEnded) continue;
    if(!d.ok && !s.drawn){ throw new Error('draw stalled '+d.message); }
    const m=E.chooseAiMove(s,idx);
    if(!m) throw new Error('no AI move');
    const r=m.discard?E.discardCard(s,idx,m.handIndex):E.playCard(s,idx,m.handIndex,m.targetIndex);
    if(!r.ok){
      const fallback=E.discardCard(s,idx,0);
      if(!fallback.ok) throw new Error('play and fallback failed: '+r.message+' / '+fallback.message);
    }
    steps++;
  }
  if(!s.gameOver) throw new Error('simulation did not finish');
  maxTurns=Math.max(maxTurns,steps); games++;
}
console.log({games,rounds,maxTurns});
