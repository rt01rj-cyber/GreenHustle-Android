(() => {
  'use strict';
  const E = window.GreenHustleEngine;
  const KEY = 'green_hustle_save_v1';
  const $ = (id) => document.getElementById(id);

  let state = null;
  let selectedIndex = null;
  let privacyLocked = false;
  let aiBusy = false;
  let toastTimer = null;

  function showScreen(which) {
    $('menuScreen').classList.toggle('hidden', which !== 'menu');
    $('gameScreen').classList.toggle('hidden', which !== 'game');
  }

  function save() {
    if (!state) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {}
    refreshContinue();
  }

  function refreshContinue() {
    let good = false;
    try {
      const raw = localStorage.getItem(KEY);
      good = !!raw && !!JSON.parse(raw).players;
    } catch (_) {}
    $('continueBtn').classList.toggle('hidden', !good);
  }

  function startGame(mode) {
    const target = Number($('targetSelect').value);
    const difficulty = $('difficultySelect').value;
    const players = mode === 'solo' ? Number($('aiCount').value) + 1 : Number($('localCount').value);
    state = E.newGame({mode, target, difficulty, players});
    selectedIndex = null;
    privacyLocked = mode === 'local';
    showScreen('game');
    save();
    render();
    if (privacyLocked) showPass(state.players[state.currentPlayer].name, true);
  }

  function continueGame() {
    try {
      state = E.reviveState(JSON.parse(localStorage.getItem(KEY)));
      selectedIndex = null;
      privacyLocked = state.mode === 'local' && !state.roundEnded;
      showScreen('game');
      render();
      if (privacyLocked) showPass(state.players[state.currentPlayer].name, true);
    } catch (err) {
      localStorage.removeItem(KEY);
      refreshContinue();
      toast('That save could not be loaded.');
    }
  }

  function goHome() {
    if (state) save();
    aiBusy = false;
    closeModal();
    $('passOverlay').classList.add('hidden');
    showScreen('menu');
    refreshContinue();
  }

  function render() {
    if (!state) return;
    const p = state.players[state.currentPlayer];
    $('roundLabel').textContent = `Round ${state.round}`;
    $('deckLabel').textContent = `Deck ${state.deck.length}`;
    $('targetLabel').textContent = `Goal ${E.MONEY(state.target)}`;

    $('scoreStrip').innerHTML = state.players.map((q, i) => {
      const market = E.stashValue(q) + q.securedCash;
      const pressure = q.heat.length ? ` · ⚠ ${q.heat.length}` : '';
      return `<div class="player-pill ${i===state.currentPlayer?'active':''}">
        <div class="name">${esc(q.name)}${q.isHuman?'':' · AI'}</div>
        <div class="money">${E.MONEY(q.total)}</div>
        <div class="mini">Pitch ${q.marketOpen?'open':'closed'} · table ${E.MONEY(market)}${pressure}</div>
      </div>`;
    }).join('');

    $('turnName').textContent = `${p.name}'s turn`;
    $('turnHint').textContent = state.roundEnded ? 'round complete' : (!p.isHuman ? 'thinking…' : state.drawn ? 'play or bin one card' : 'draw first');
    renderStatus(p);
    renderMarket(p);
    renderLog();
    renderHand(p);

    if (state.roundEnded) showRoundResults();
    else if (!p.isHuman) maybeRunAi();
  }

  function renderStatus(p) {
    const chips = [];
    chips.push(`<span class="chip">${p.marketOpen?'🏪 Pitch open':'🔐 Pitch closed'}</span>`);
    if (p.heat.length) p.heat.forEach(h => chips.push(`<span class="chip heat">${h.icon||'⚠'} ${esc(h.title)}</span>`));
    if (p.shieldTokens) chips.push(`<span class="chip safe">🛡 ${p.shieldTokens} stock shield${p.shieldTokens===1?'':'s'}</span>`);
    if (p.heatImmunity) chips.push(`<span class="chip safe">📒 next pressure blocked</span>`);
    if (p.nextStockMultiplier > 1) chips.push(`<span class="chip">📈 next stock ×${p.nextStockMultiplier}</span>`);
    if (p.securedCash) chips.push(`<span class="chip safe">💷 ${E.MONEY(p.securedCash)} banked</span>`);
    if (p.roundPenalty) chips.push(`<span class="chip heat">🧾 -${E.MONEY(p.roundPenalty)}</span>`);
    $('statusChips').innerHTML = chips.join('');
  }

  function renderMarket(p) {
    if (!p.stash.length) {
      $('marketArea').innerHTML = `<div class="empty-market">${p.marketOpen?'Pitch open — no Stock played yet':'Open the pitch to start building value'}</div>`;
      return;
    }
    $('marketArea').innerHTML = p.stash.map((s, i) => `<div class="stash-card ${s.protected?'protected':''}" style="--tilt:${(i%3-1)*1.2}deg">
      ${s.protected?'<span class="shield">🔒</span>':''}
      <div class="icon">${s.icon||'🌿'}</div><div class="s-title">${esc(s.title)}</div>
      <div class="s-value">${E.MONEY(s.value*(s.multiplier||1))}</div>
      ${(s.multiplier||1)>1?`<div class="boost">PRICE SPIKE ×${s.multiplier}</div>`:''}
    </div>`).join('');
  }

  function renderLog() {
    $('gameLog').innerHTML = state.log.slice(0,4).map(x=>`<div>${esc(x)}</div>`).join('');
  }

  function renderHand(p) {
    const visible = p.isHuman && !privacyLocked && !state.roundEnded;
    $('handOwner').textContent = visible ? `${p.name}'s hand` : (!p.isHuman ? `${p.name} is playing` : 'Hand hidden');
    $('handSub').textContent = visible ? `${p.hand.length} cards · projected round ${E.MONEY(E.projectedRoundScore(p))}` : '';
    $('drawBtn').classList.toggle('hidden', !visible || state.drawn);
    $('drawBtn').disabled = !visible || state.drawn;

    if (!visible) {
      $('hand').innerHTML = `<div class="empty-market">${!p.isHuman?'AI turn in progress':'Pass the device before revealing this hand'}</div>`;
      $('cardAction').classList.add('hidden');
      return;
    }

    if (selectedIndex != null && selectedIndex >= p.hand.length) selectedIndex = null;
    $('hand').innerHTML = p.hand.map((c, i) => {
      const playable = state.drawn && E.cardPlayable(state, state.currentPlayer, i);
      const bottom = c.kind==='stock' ? E.MONEY(c.value) : c.penalty ? `-${E.MONEY(c.penalty)}` : '';
      return `<button class="hand-card kind-${c.kind} ${selectedIndex===i?'selected':''} ${state.drawn&&!playable?'unplayable':''}" data-i="${i}">
        <div class="type">${esc(c.kind)}</div><div class="big-icon">${c.icon||'🃏'}</div>
        <div class="title">${esc(c.title)}</div><div class="desc">${esc(c.text||'')}</div>
        ${bottom?`<div class="value ${c.penalty?'penalty':''}">${bottom}</div>`:''}
      </button>`;
    }).join('');
    [...$('hand').querySelectorAll('.hand-card')].forEach(btn => btn.addEventListener('click', () => {
      selectedIndex = Number(btn.dataset.i); renderCardAction();
      [...$('hand').children].forEach((x,j)=>x.classList.toggle('selected',j===selectedIndex));
    }));
    renderCardAction();
  }

  function renderCardAction() {
    const p = state && state.players[state.currentPlayer];
    if (!p || selectedIndex == null || !state.drawn || privacyLocked || !p.isHuman || state.roundEnded) {
      $('cardAction').classList.add('hidden'); return;
    }
    const c = p.hand[selectedIndex];
    if (!c) { $('cardAction').classList.add('hidden'); return; }
    const playable = E.cardPlayable(state, state.currentPlayer, selectedIndex);
    $('cardAction').innerHTML = `<div class="action-title"><span>${c.icon||'🃏'} ${esc(c.title)}</span><span>${c.kind.toUpperCase()}</span></div>
      <div class="action-buttons">
        <button id="playSelected" class="play-btn" ${playable?'':'disabled'}>${playable?(c.target?'Choose rival':'Play card'):"Can't play now"}</button>
        <button id="binSelected" class="danger-btn">Bin card</button>
      </div>`;
    $('cardAction').classList.remove('hidden');
    $('playSelected').addEventListener('click', () => { if (playable) beginPlaySelected(); });
    $('binSelected').addEventListener('click', discardSelected);
  }

  function drawCard() {
    const r = E.draw(state, state.currentPlayer);
    if (!r.ok) toast(r.message);
    selectedIndex = null;
    save(); render();
  }

  function beginPlaySelected() {
    const p = state.players[state.currentPlayer];
    const c = p.hand[selectedIndex];
    if (!c) return;
    if (c.target) return chooseTarget(c);
    finishPlay(null);
  }

  function chooseTarget(card) {
    const source = state.currentPlayer;
    const rivals = state.players.map((p,i)=>({p,i})).filter(x=>x.i!==source);
    const html = `<button class="close" id="closeTarget">✕</button><h2>${card.icon} ${esc(card.title)}</h2><p>${esc(card.text)}</p><div class="target-list">
      ${rivals.map(({p,i})=>`<button class="target-btn" data-target="${i}"><span><b>${esc(p.name)}</b><br><small>${p.heat.length} pressure · ${p.stash.length} stock cards</small></span><b>${E.MONEY(p.total+E.stashValue(p))}</b></button>`).join('')}
      </div>`;
    openModal(html,'target');
    $('closeTarget').onclick = closeModal;
    [...$('modalCard').querySelectorAll('.target-btn')].forEach(b => b.onclick = () => { closeModal(); finishPlay(Number(b.dataset.target)); });
  }

  function finishPlay(targetIndex) {
    const oldPlayer = state.currentPlayer;
    const r = E.playCard(state, oldPlayer, selectedIndex, targetIndex);
    if (!r.ok) { toast(r.message); return; }
    selectedIndex = null;
    save();
    if (state.mode === 'local' && !state.roundEnded && state.currentPlayer !== oldPlayer) {
      privacyLocked = true; showPass(state.players[state.currentPlayer].name, false);
    }
    render();
  }

  function discardSelected() {
    const oldPlayer = state.currentPlayer;
    const r = E.discardCard(state, oldPlayer, selectedIndex);
    if (!r.ok) { toast(r.message); return; }
    selectedIndex = null;
    save();
    if (state.mode === 'local' && !state.roundEnded && state.currentPlayer !== oldPlayer) {
      privacyLocked = true; showPass(state.players[state.currentPlayer].name, false);
    }
    render();
  }

  function showPass(name, first) {
    $('passTitle').textContent = first ? `${name}, you're up` : `Pass to ${name}`;
    $('passText').textContent = 'The hand is hidden. Only tap Reveal when the next player has the device.';
    $('passOverlay').classList.remove('hidden');
  }

  function revealHand() {
    privacyLocked = false;
    $('passOverlay').classList.add('hidden');
    render();
  }

  function maybeRunAi() {
    if (!state || aiBusy || state.roundEnded || state.gameOver) return;
    const p = state.players[state.currentPlayer];
    if (p.isHuman) return;
    aiBusy = true;
    setTimeout(() => {
      if (!state || state.roundEnded) { aiBusy=false; return; }
      if (!state.drawn) E.draw(state, state.currentPlayer);
      save(); render();
      setTimeout(() => {
        if (!state || state.roundEnded) { aiBusy=false; return; }
        const idx = state.currentPlayer;
        const move = E.chooseAiMove(state, idx);
        if (move) {
          if (move.discard) E.discardCard(state, idx, move.handIndex);
          else E.playCard(state, idx, move.handIndex, move.targetIndex);
        }
        save(); aiBusy=false; render();
      }, 480);
    }, 380);
  }

  function showRoundResults() {
    if ($('modal').dataset.kind === 'round') return;
    const lr = state.lastRound;
    if (!lr) return;
    const rows = lr.details.map(d => {
      const p = state.players[d.index];
      const bits = [`Protected ${E.MONEY(d.protectedValue)}`, `Exposed ${E.MONEY(d.exposedValue)}`];
      if (d.lossPct) bits.push(`exposed loss ${d.lossPct}%`);
      if (d.secured) bits.push(`banked +${E.MONEY(d.secured)}`);
      if (d.roundPenalty) bits.push(`bills -${E.MONEY(d.roundPenalty)}`);
      if (d.handPenalty) bits.push(`hand risk -${E.MONEY(d.handPenalty)}`);
      if (d.bonus) bits.push(`round bonus +${E.MONEY(d.bonus)}`);
      return `<div class="result-row"><b>${esc(p.name)}</b><strong>+${E.MONEY(d.totalForRound)}</strong><small>${bits.join(' · ')} · total ${E.MONEY(p.total)}</small></div>`;
    }).join('');

    if (state.gameOver) {
      const winner = state.players[state.winner];
      openModal(`<h2>🏆 ${esc(winner.name)} wins</h2><p>${esc(lr.reason)} Final total: <b>${E.MONEY(winner.total)}</b>.</p><div class="results">${rows}</div><button id="newGameBtn" class="primary" style="width:100%">Back to menu</button>`,'round');
      $('newGameBtn').onclick = () => { localStorage.removeItem(KEY); state=null; closeModal(); goHome(); };
    } else {
      openModal(`<h2>Round ${state.round} complete</h2><p>${esc(lr.reason)}</p><div class="results">${rows}</div><button id="nextRoundBtn" class="primary" style="width:100%">Start round ${state.round+1}</button>`,'round');
      $('nextRoundBtn').onclick = () => {
        E.nextRound(state); selectedIndex=null; closeModal(); save();
        if (state.mode==='local') { privacyLocked=true; showPass(state.players[state.currentPlayer].name,true); }
        render();
      };
    }
  }

  function showRules() {
    openModal(`<button class="close" id="closeRules">✕</button><h2>How to play</h2>
      <p><b>Goal:</b> finish rounds with valuable stock and be the first player to reach the chosen winning total.</p>
      <ol class="rules-list">
        <li>On your turn, <b>draw one card</b>.</li>
        <li>Then <b>play one card</b> or bin one card you do not want.</li>
        <li>You need <b>Pitch Open</b> before Stock can go onto your table.</li>
        <li><b>Pressure</b> disrupts rivals. Supply Freeze blocks Stock; other pressure can reduce exposed value at scoring.</li>
        <li><b>Protection</b> secures valuable Stock or blocks incoming pressure.</li>
        <li>Play <b>Cash Out</b> with an open, pressure-free pitch to end the round. The round also ends when the deck runs out.</li>
        <li>Protected Stock scores in full. Exposed Stock can be reduced by pressure and Price Crash. Risk cards left in your hand cost money.</li>
      </ol>
      <div class="legend"><div>🏪 Market</div><div>🌿 Stock</div><div>📋 Pressure</div><div>✅ Relief</div><div>🛡 Protection</div><div>📈 Action</div></div>
      <p><small>This is an original game prototype inspired by classic competitive draw-and-play card games. It does not use the original Grass deck, text or artwork.</small></p>`,'rules');
    $('closeRules').onclick = closeModal;
  }

  function openModal(html, kind='generic') {
    $('modalCard').innerHTML = html;
    $('modal').dataset.kind = kind;
    $('modal').classList.remove('hidden');
  }
  function closeModal() { $('modal').classList.add('hidden'); $('modal').dataset.kind=''; }

  function toast(message) {
    clearTimeout(toastTimer); $('toast').textContent = message; $('toast').classList.remove('hidden');
    toastTimer = setTimeout(()=>$('toast').classList.add('hidden'), 1900);
  }

  function esc(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  $('soloBtn').addEventListener('click', () => startGame('solo'));
  $('localBtn').addEventListener('click', () => startGame('local'));
  $('continueBtn').addEventListener('click', continueGame);
  $('rulesBtn').addEventListener('click', showRules);
  $('homeBtn').addEventListener('click', goHome);
  $('drawBtn').addEventListener('click', drawCard);
  $('revealBtn').addEventListener('click', revealHand);
  $('modal').addEventListener('click', e => { if (e.target === $('modal') && $('modal').dataset.kind !== 'round') closeModal(); });

  refreshContinue();
  showScreen('menu');
})();
