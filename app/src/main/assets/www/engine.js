/* Hot Box 0.2 — fictional card-game rules; no real-world prices or advice. */
(function (root, factory) {
  var engine = factory();
  if (typeof module === 'object' && module.exports) module.exports = engine;
  root.HotBox = engine;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var C = [
    ['burner','Burner Phone','line',0,8,'phone','Open your line. You can now put products on the table.','Different number. Same business.'],
    ['whip','Smart Whip','line',0,4,'car','Open or upgrade your line. Your £5k hand cards cannot be Taxed.','All that finance. Still no parking.'],
    ['baggie','The 3.5','product',5000,18,'baggie','Add £5k to your exposed stash. Bank it on a later turn.','Small bag. Big ambitions.'],
    ['vape','THC Vapes','product',25000,12,'vape','Add £25k to your exposed stash. Bank it on a later turn.','Twenty flavours. One bad idea.'],
    ['cali','Cali Packs','product',50000,10,'cali','Add £50k to your exposed stash. Bank it on a later turn.','Packaging budget: astronomical.'],
    ['grow','Grow Room','product',100000,5,'grow','Add £100k to your exposed stash. A juicy police target.','The leccy bill has entered the chat.'],
    ['search','Section 60','hassle',0,7,'police','A rival loses their biggest exposed product; otherwise their biggest hand product.','An exceptionally inconvenient evening.'],
    ['taxed','Taxed','hassle',0,7,'taxed','Steal a random product from a rival’s hidden hand. No eligible product? You get nothing.','Not the HMRC sort.'],
    ['fake','Fake Batch','hassle',0,5,'fake','Halve a rival’s next banked product. Does not stack.','Five-star packaging. One-star contents.'],
    ['raid','Raid','hassle',0,4,'raid','Block a rival’s selling and banking for their next two turns. They may still draw and act.','Nobody ordered this takeaway.'],
    ['nocomment','No Comment','counter',0,7,'solicitor','React to cancel Section 60 or Raid. Also clears your own Raid when played on your turn.','My client has nothing to add.'],
    ['solicitor','Good Solicitor','counter',0,7,'solicitor','On your turn, clear your Raid and Fake Batch.','Billable hours. Unbillable attitude.'],
    ['dash','Dash It','counter',0,6,'dash','React: discard this and a product from your hand to cancel a police hit.','A tactical change of ownership.'],
    ['raptor','Operation Raptor','event',0,1,'raptor','Ends the round immediately. Only banked cash survives.','It was only a matter of time.']
  ].map(function (a) { return {id:a[0],name:a[1],kind:a[2],value:a[3],copies:a[4],art:a[5],text:a[6],flavour:a[7]}; });
  var BY = {}; C.forEach(function (c) { BY[c.id] = c; });
  var NAMES = ['You','Mags','Dai','Jay','Lez','Nix'];
  var STYLES = ['You','The banker','The opportunist','The menace','The collector','The spoiler'];
  function money(n) { return '£' + (n / 1000).toLocaleString('en-GB',{maximumFractionDigits:1}) + 'k'; }
  function rng(s) { s.seed = (Math.imul(s.seed,1664525)+1013904223)>>>0; return s.seed/4294967296; }
  function shuffle(s,a) { for(var i=a.length-1;i>0;i--){var j=Math.floor(rng(s)*(i+1)),t=a[i];a[i]=a[j];a[j]=t;}return a; }
  function def(card) { return BY[typeof card==='string'?card:card.id]; }
  function value(card) { return def(card).value; }
  function sum(cards) { return cards.reduce(function(n,c){return n+value(c);},0); }
  function event(s,type,text,card,actor,target) { s.seq++; s.events.unshift({seq:s.seq,type:type,text:text,card:card||null,actor:actor==null?s.current:actor,target:target});s.events=s.events.slice(0,50); }
  function currentSeat(s) { return s.pending ? s.pending.to : s.current; }
  function create(o) {
    o=o||{}; var n=Math.max(2,Math.min(6,Math.floor(Number(o.players)||3)));
    var rounds=[3,5,7].indexOf(Number(o.rounds))>=0?Number(o.rounds):3;
    var s={version:2,seed:(o.seed==null?Date.now():o.seed)>>>0,mode:o.mode==='local'?'local':'solo',difficulty:o.difficulty||'sharp',rounds:rounds,round:0,phase:'round',current:0,starter:0,turn:0,seq:0,events:[],players:[],deck:[],discard:[],pending:null,results:null,stats:{banks:0,counters:0,attacks:0}};
    for(var i=0;i<n;i++)s.players.push({name:s.mode==='local'?'Player '+(i+1):NAMES[i],human:s.mode==='local'||i===0,avatar:i,style:s.mode==='local'?'Local player':STYLES[i],bank:0,roundBank:0,hand:[],stash:[],line:0,raid:0,fake:false});
    nextRound(s);return s;
  }
  function nextRound(s) {
    if(s.phase!=='round')return {ok:false,error:'Finish the current round first.'};
    s.round++;s.starter=(s.round-1)%s.players.length;s.current=s.starter;s.turn++;s.pending=null;s.results=null;s.discard=[];s.deck=[];
    C.filter(function(c){return c.id!=='raptor';}).forEach(function(d){for(var i=0;i<d.copies;i++)s.deck.push({id:d.id,uid:s.round+'-'+d.id+'-'+i});});
    // Every player gets an opener, so nobody spends a whole first round locked out.
    s.players.forEach(function(p){p.hand=[s.deck.splice(s.deck.findIndex(function(c){return c.id==='burner';}),1)[0]];p.stash=[];p.line=0;p.raid=0;p.fake=false;p.roundBank=0;});
    shuffle(s,s.deck);
    for(var j=0;j<4;j++)s.players.forEach(function(p){p.hand.push(s.deck.shift());});
    s.players.forEach(function(p){if(!p.hand.some(function(c){return c.id==='baggie';})){var ix=s.deck.findIndex(function(c){return c.id==='baggie';});if(ix>=0){var old=p.hand[4];p.hand[4]=s.deck[ix];s.deck[ix]=old;}}});
    var lower=Math.ceil(s.deck.length*2/3),at=lower+Math.floor(rng(s)*(s.deck.length-lower+1));
    s.deck.splice(at,0,{id:'raptor',uid:s.round+'-raptor-0'});
    s.initialDeck=s.deck.length;s.phase='draw';event(s,'round','Round '+s.round+'. Build your stash. Bank before the raid.');return {ok:true};
  }
  function roundEnd(s) {
    if(s.phase==='round'||s.phase==='over')return;
    s.results=s.players.map(function(p,i){var lost=sum(p.stash)+sum(p.hand);var r={seat:i,name:p.name,banked:p.roundBank,total:p.bank,lost:lost};s.discard.push.apply(s.discard,p.stash.concat(p.hand));p.stash=[];p.hand=[];p.line=0;p.raid=0;p.fake=false;return r;});
    s.phase=s.round>=s.rounds?'over':'round';s.pending=null;
    var best=Math.max.apply(null,s.players.map(function(p){return p.bank;}));
    s.winners=s.players.map(function(p,i){return p.bank===best?i:-1;}).filter(function(i){return i>=0;});
    event(s,'raptor','OPERATION RAPTOR. Unbanked products are gone.','raptor');
  }
  function advance(s) { var p=s.players[s.current];if(p.raid>0)p.raid--;s.current=(s.current+1)%s.players.length;s.turn++;s.phase='draw'; }
  function reactions(s) {
    if(!s.pending)return [];
    var p=s.players[s.pending.to],out=[{type:'accept'}];
    if(p.hand.some(function(c){return c.id==='nocomment';}))out.push({type:'react',card:'nocomment'});
    if(p.hand.some(function(c){return c.id==='dash';}))p.hand.filter(function(c){return value(c)>0;}).forEach(function(c){out.push({type:'react',card:'dash',sacrifice:c.uid});});
    return out;
  }
  function finishHit(s,blocked) {
    var a=s.pending,from=s.players[a.from],p=s.players[a.to],d=def(a.card),note;
    if(!blocked){
      if(d.id==='search'){
        var pool=p.stash.length?p.stash:p.hand;
        var products=pool.filter(function(c){return value(c)>0;}).sort(function(x,y){return value(y)-value(x);});
        if(products.length){var c=products[0];if(pool===p.stash&&c.id==='baggie'&&p.mods&&p.mods.cushion&&!p.cushionUsed){p.cushionUsed=true;note=p.name+' keeps The 3.5. Cwtch Cushion!';}else{pool.splice(pool.indexOf(c),1);s.discard.push(c);note=p.name+' loses '+def(c).name+'.';}}
        else note=p.name+' has no product to seize.';
      } else {p.raid=2;note=p.name+' is raided: no selling or banking for two turns.';}
      event(s,'hit',note,d.id,a.from,a.to);
    }
    s.discard.push(a.card);s.pending=null;advance(s);
  }
  function legal(s,seat) {
    if(seat!==currentSeat(s))return [];
    if(s.phase==='react')return reactions(s);
    if(s.phase==='draw')return [{type:'draw'}];
    if(s.phase!=='act')return [];
    var p=s.players[seat],out=[];
    p.hand.forEach(function(c){
      var d=def(c);out.push({type:'discard',uid:c.uid});
      if(d.kind==='product'&&p.line&&!p.raid&&p.stash.length<(p.maxStash||6))out.push({type:'play',uid:c.uid});
      if((c.id==='burner'&&!p.line)||(c.id==='whip'&&p.line<2))out.push({type:'play',uid:c.uid});
      if(c.id==='solicitor'&&(p.raid||p.fake)||c.id==='nocomment'&&p.raid)out.push({type:'play',uid:c.uid});
      if(d.kind==='hassle')s.players.forEach(function(q,j){
        if(j===seat)return;
        // Availability uses public state only; it never reveals a hidden product.
        if(c.id==='fake'&&q.fake||c.id==='raid'&&q.raid)return;
        if(c.id==='taxed'&&!q.hand.length)return;
        out.push({type:'play',uid:c.uid,target:j});
      });
    });
    if(p.line&&!p.raid)p.stash.forEach(function(c){out.push({type:'bank',uid:c.uid});});
    if(!out.length)out.push({type:'pass'});
    if(p.mods&&p.mods.double&&p.line&&!p.raid&&p.stash.filter(function(c){return c.id==='baggie';}).length>=2)out.push({type:'bankpair'});
    return out;
  }
  function equivalent(a,b) { return ['type','uid','target','card','sacrifice'].every(function(k){return a[k]===b[k];}); }
  function act(s,seat,a) {
    if(!a||!legal(s,seat).some(function(b){return equivalent(a,b);}))return {ok:false,error:'That move is not available now.'};
    var p=s.players[seat],c,d;
    if(a.type==='draw'){
      c=s.deck.shift();
      if(!c||c.id==='raptor'){if(c)s.discard.push(c);roundEnd(s);return {ok:true};}
      p.hand.push(c);var queued=p.bonusDraw||0;p.bonusDraw=0;while(queued-->0){var extra=s.deck.shift();if(!extra||extra.id==='raptor'){if(extra)s.discard.push(extra);roundEnd(s);return {ok:true};}p.hand.push(extra);}
      s.phase='act';event(s,'draw',p.name+' draws. Choose one action.',null,seat);return {ok:true};
    }
    if(a.type==='accept'){finishHit(s,false);return {ok:true};}
    if(a.type==='react'){
      var ix=p.hand.findIndex(function(x){return x.id===a.card;});c=p.hand.splice(ix,1)[0];s.discard.push(c);
      if(a.sacrifice){ix=p.hand.findIndex(function(x){return x.uid===a.sacrifice;});s.discard.push(p.hand.splice(ix,1)[0]);}
      var reward='';if(!p.counterUsed){p.counterUsed=true;if(p.hero==='caz'){p.bonusDraw=(p.bonusDraw||0)+1;reward+=' Second Wind: extra card on your next draw.';}if(p.mods&&p.mods.counterpay){p.bank+=5000;p.roundBank+=5000;reward+=' Comeback Bonus: +£5k banked.';}}
      s.stats.counters++;event(s,'counter',p.name+' shuts it down. '+def(c).name+'!'+reward,c.id,seat,s.pending.from);finishHit(s,true);return {ok:true};
    }
    if(a.type==='bank'||a.type==='bankpair'){
      var take=a.type==='bankpair'?p.stash.filter(function(x){return x.id==='baggie';}).slice(0,2):[p.stash.find(function(x){return x.uid===a.uid;})];
      var cash=0,reduced=p.fake,mods=p.mods||{},bonus=0,bonusNames=[];
      take.forEach(function(x,index){var base=value(x),extra=0;
        if(x.id==='baggie'&&mods.pocket){extra+=5000;bonusNames.push('Pocket Rocket');}
        if(x.id==='vape'&&mods.vapesurge){extra+=5000;bonusNames.push('Pocket Premium');}
        if(x.id==='cali'&&mods.calicash){extra+=10000;bonusNames.push('Fancy Packaging');}
        cash+=(base+extra)*(index===0&&reduced?0.5:1);p.stash.splice(p.stash.indexOf(x),1);s.discard.push(x);
      });
      p.bankCount=(p.bankCount||0)+1;
      if(mods.loyalty&&p.bankCount%3===0){bonus+=10000;bonusNames.push('Third Time Lucky');}
      if(mods.rainyday&&p.bankCount===1){bonus+=10000;bonusNames.push('Rainy Day Fund');}
      if(p.nextBonus){bonus+=p.nextBonus;p.nextBonus=0;bonusNames.push('Lucky Receipt');}
      cash+=bonus;p.fake=false;p.bank+=cash;p.roundBank+=cash;s.stats.banks++;
      event(s,'bank',p.name+' banks '+money(cash)+(reduced?' — first product halved.':'. Safe from Raptor.')+(bonusNames.length?' '+bonusNames.join(' + ')+'!':''),take[0].id,seat);
      advance(s);return {ok:true};
    }
    if(a.type==='pass'){advance(s);return {ok:true};}
    c=p.hand.splice(p.hand.findIndex(function(x){return x.uid===a.uid;}),1)[0];d=def(c);
    if(a.type==='discard'){s.discard.push(c);event(s,'discard',p.name+' bins '+d.name+'.',c.id,seat);advance(s);return {ok:true};}
    if(d.kind==='product'){p.stash.push(c);event(s,'product',p.name+' lays '+d.name+'. '+money(d.value)+' at risk.',c.id,seat);advance(s);return {ok:true};}
    if(c.id==='burner'||c.id==='whip'){p.line=c.id==='whip'?2:1;event(s,'line',p.name+(p.line===2?' upgrades to Smart Whip.':' opens their line.'),c.id,seat);}
    else if(c.id==='solicitor'||c.id==='nocomment'){p.raid=0;if(c.id==='solicitor')p.fake=false;event(s,'counter',p.name+' clears the heat.',c.id,seat);}
    else if(d.kind==='hassle'){
      s.stats.attacks++;var q=s.players[a.target];
      if(c.id==='search'||c.id==='raid'){
        s.pending={from:seat,to:a.target,card:c};s.phase='react';event(s,'attack',p.name+' hits '+q.name+' with '+d.name+'.',c.id,seat,a.target);return {ok:true};
      }
      if(c.id==='taxed'){
        var candidates=q.hand.filter(function(x){return value(x)>0&&!(q.line===2&&value(x)===5000);});
        if(candidates.length){var stolen=candidates[Math.floor(rng(s)*candidates.length)];q.hand.splice(q.hand.indexOf(stolen),1);p.hand.push(stolen);event(s,'steal',p.name+' taxes '+q.name+': one hidden product changes hands.',c.id,seat,a.target);}
        else event(s,'miss',p.name+' tries to tax '+q.name+'. Nothing eligible to take.',c.id,seat,a.target);
      }else{q.fake=true;event(s,'hit',p.name+' drops Fake Batch on '+q.name+'. Next bank is halved.',c.id,seat,a.target);}
    }
    s.discard.push(c);advance(s);return {ok:true};
  }
  function bot(s) {
    var seat=currentSeat(s),p=s.players[seat],opts=legal(s,seat);
    if(!opts.length)return null;
    if(s.phase==='draw')return opts[0];
    if(s.phase==='react'){
      var nc=opts.find(function(a){return a.card==='nocomment';});
      if(nc)return nc;
      var ds=opts.filter(function(a){return a.card==='dash';}).sort(function(a,b){return value(p.hand.find(function(c){return c.uid===a.sacrifice;}))-value(p.hand.find(function(c){return c.uid===b.sacrifice;}));});
      var loss=Math.max.apply(null,[0].concat((p.stash.length?p.stash:p.hand).map(value)));
      if(ds.length){var cost=value(p.hand.find(function(c){return c.uid===ds[0].sacrifice;}));if(s.pending.card.id==='raid'&&sum(p.stash)>cost||s.pending.card.id==='search'&&loss>cost)return ds[0];}
      return opts[0];
    }
    var urgency=s.deck.length<s.initialDeck/3?25:0;
    var scored=opts.map(function(a){
      var score=-100;
      if(a.type==='bankpair')score=85+urgency;
      if(a.type==='bank'){var v=value(p.stash.find(function(c){return c.uid===a.uid;}));score=55+v/2000+urgency;if(p.mods&&p.mods.pocket&&v===5000)score+=6;if(p.fake)score-=35;if(p.avatar===1)score+=12;}
      if(a.type==='play'){
        var c=p.hand.find(function(x){return x.uid===a.uid;}),d=def(c);
        if(c.id==='burner'||c.id==='whip')score=!p.line?130:10;
        else if(c.id==='solicitor'||c.id==='nocomment')score=110;
        else if(d.kind==='product')score=48+d.value/3000-p.stash.length*18-urgency/2+(p.avatar===4?10:0);
        else if(d.kind==='hassle'){
          var q=s.players[a.target],threat=q.bank+sum(q.stash),police=c.id==='raid'||c.id==='search';
          score=18+threat/12000+(s.difficulty==='ruthless'?20:0)+(p.avatar===3||p.avatar===5?12:0);
          if(c.id==='search')score+=Math.min(28,sum(q.stash)/3500);
          if(c.id==='raid'&&!q.line)score-=30;
          if(c.id==='fake'&&!q.stash.length)score-=12;
          if(police&&q.hand.length<2)score+=8;
        }
      }
      if(a.type==='discard'){var d=def(p.hand.find(function(c){return c.uid===a.uid;}));score=d.id==='burner'&&p.line?5:-10;if(d.kind==='product')score-=d.value/1000;}
      // Randomness uses only this player's cards and public opponent state.
      score+=rng(s)*(s.difficulty==='casual'?85:8);
      return {action:a,score:score};
    });
    scored.sort(function(a,b){return b.score-a.score;});return scored[0].action;
  }
  function redraw(s,seat,uids){
    if(s.phase!=='act'||s.current!==seat||!Array.isArray(uids)||uids.length<1||uids.length>2||new Set(uids).size!==uids.length)return {ok:false,error:'Choose one or two different hand cards, after drawing.'};
    var p=s.players[seat];if(uids.some(function(uid){return !p.hand.some(function(c){return c.uid===uid;});}))return {ok:false,error:'That card is not in your hand.'};
    uids.forEach(function(uid){s.discard.push(p.hand.splice(p.hand.findIndex(function(c){return c.uid===uid;}),1)[0]);});
    for(var i=0;i<uids.length;i++){var c=s.deck.shift();if(!c||c.id==='raptor'){if(c)s.discard.push(c);roundEnd(s);return {ok:true};}p.hand.push(c);}
    event(s,'skill',p.name+' refreshes '+uids.length+' card'+(uids.length===1?'':'s')+'. Main action still available.',null,seat);return {ok:true};
  }
  function restore(raw) {
    var s=typeof raw==='string'?JSON.parse(raw):raw;
    if(!s||s.version!==2||!Array.isArray(s.players)||s.players.length<2||s.players.length>6||!Array.isArray(s.deck)||!Array.isArray(s.discard)||!Number.isInteger(s.current)||s.current<0||s.current>=s.players.length||['draw','act','react','round','over'].indexOf(s.phase)<0)throw new Error('Incompatible save');
    s.players.forEach(function(p){if(!Array.isArray(p.hand)||!Array.isArray(p.stash)||!Number.isFinite(p.bank)||p.bank<0)throw new Error('Invalid player');});
    var cards=s.deck.concat(s.discard);s.players.forEach(function(p){cards=cards.concat(p.hand,p.stash);});if(s.pending)cards.push(s.pending.card);
    if(cards.some(function(c){return !c||!BY[c.id]||typeof c.uid!=='string';})||new Set(cards.map(function(c){return c.uid;})).size!==cards.length)throw new Error('Invalid deck');
    if(s.phase==='react'&&(!s.pending||!Number.isInteger(s.pending.to)||s.pending.to<0||s.pending.to>=s.players.length))throw new Error('Invalid reaction');
    return s;
  }
  return {redraw:redraw,catalog:C,byId:BY,money:money,def:def,value:value,sum:sum,create:create,nextRound:nextRound,act:act,legal:legal,bot:bot,seat:currentSeat,restore:restore};
}));

// AFTER_HOURS_ENGINE_030
