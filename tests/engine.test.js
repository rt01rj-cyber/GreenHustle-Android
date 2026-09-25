const assert = require('assert');
const E = require('../app/src/main/assets/www/engine.js');

function findCardIndex(p, id) { return p.hand.findIndex(c => c.id === id); }
function inject(p, id) {
  const def = E.catalogById[id];
  const c = {...def, uid:'test_'+id+'_'+Math.random()};
  p.hand.push(c); return p.hand.length-1;
}

// New game basics
let s = E.newGame({mode:'solo', players:3, target:300000});
assert.equal(s.players.length, 3);
assert.equal(s.players[0].hand.length, 6);
assert(s.deck.length > 0);

// Must draw before play
let ix = inject(s.players[0], 'pitch_open');
let r = E.playCard(s, 0, ix);
assert.equal(r.ok, false);

// Open market after draw
E.draw(s, 0);
ix = findCardIndex(s.players[0], 'pitch_open');
r = E.playCard(s, 0, ix);
assert.equal(r.ok, true);
assert.equal(s.players[0].marketOpen, true);

// Force turn back to player 0 for focused rules tests
s.currentPlayer = 0; s.drawn = true;
ix = inject(s.players[0], 'premium_crop');
r = E.playCard(s, 0, ix);
assert.equal(r.ok, true);
assert(s.players[0].stash.some(c => c.id === 'premium_crop'));

// Heat blocks stock
s.currentPlayer = 1; s.drawn = true;
let open1 = inject(s.players[1], 'pitch_open');
E.playCard(s, 1, open1);
s.currentPlayer = 0; s.drawn = true;
let heatIx = inject(s.players[0], 'supply_freeze');
E.playCard(s, 0, heatIx, 1);
assert(s.players[1].heat.some(h => h.effect === 'freeze'));
s.currentPlayer = 1; s.drawn = true;
let stockIx = inject(s.players[1], 'garden_batch');
assert.equal(E.playCard(s,1,stockIx).ok,false);

// Relief clears heat
let clearIx = inject(s.players[1], 'all_clear');
assert.equal(E.playCard(s,1,clearIx).ok,true);
assert.equal(s.players[1].heat.length,0);

// Score round never yields negative total
s = E.newGame({mode:'local', players:2, target:300000});
s.players[0].roundPenalty = 999999;
E.scoreRound(s,'test');
assert.equal(s.players[0].total,0);
assert.equal(s.roundEnded,true);

// AI always returns a move once drawn and hand has cards
s = E.newGame({mode:'solo', players:2, target:300000});
s.currentPlayer = 1; E.draw(s,1);
const move = E.chooseAiMove(s,1);
assert(move && Number.isInteger(move.handIndex));

console.log('Green Hustle engine tests: PASS');
