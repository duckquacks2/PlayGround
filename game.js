(() => {
  const canvas = document.querySelector('#game');
  const ctx = canvas.getContext('2d');
  const $ = (s) => document.querySelector(s);
  const ui = { intro: $('#introOverlay'), result: $('#resultOverlay'), pause: $('#pauseOverlay'), hud: $('#hud'), controls: $('#controls'), distance: $('#distance'), stars: $('#stars'), hearts: $('#hearts'), finalDistance: $('#finalDistance'), finalStars: $('#finalStars'), resultTitle: $('#resultTitle'), resultMessage: $('#resultMessage'), resultIcon: $('#resultIcon'), resultEyebrow: $('#resultEyebrow'), chaser: $('#chaserTag'), hint: $('#hint') };
  const TAU = Math.PI * 2;
  const game = { mode: 'intro', time: 0, distance: 0, stars: 0, health: 3, chase: 0, speed: 0, obstacles: [], pickups: [], particles: [], bolts: [], spawnAt: 1.2, pickupAt: 2, invulnerable: 0, jumpY: 0, jumpV: 0, crouch: false, hitFlash: 0, shake: 0, last: 0, w: 0, h: 0, dpr: 1, decor: [], sound: false };
  let W = 0, H = 0;
  function resize() {
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height; game.w = W; game.h = H; game.dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * game.dpr); canvas.height = Math.round(H * game.dpr);
    ctx.setTransform(game.dpr, 0, 0, game.dpr, 0, 0);
    game.decor = Array.from({length: 16}, (_,i) => ({x: i/16*W + Math.random()*45, y: H*(.16+Math.random()*.32), r: 1+Math.random()*2, a: .15+Math.random()*.45, phase: Math.random()*TAU}));
  }
  addEventListener('resize', resize); resize();
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  const rand = (a,b) => a+Math.random()*(b-a);
  function reset() {
    game.time=0; game.distance=0; game.stars=0; game.health=3; game.chase=12; game.speed=H*.72; game.obstacles=[]; game.pickups=[]; game.particles=[]; game.bolts=[]; game.spawnAt=1.15; game.pickupAt=2; game.invulnerable=0; game.jumpY=0; game.jumpV=0; game.crouch=false; game.hitFlash=0; game.shake=0; updateHud();
  }
  function start() { reset(); game.mode='playing'; ui.intro.classList.add('hidden'); ui.result.classList.add('hidden'); ui.pause.classList.add('hidden'); game.last=performance.now(); }
  function pause() { if(game.mode==='playing'){game.mode='paused';ui.pause.classList.remove('hidden');} else if(game.mode==='paused'){game.mode='playing';ui.pause.classList.add('hidden');game.last=performance.now();} }
  function finish(win=false) {
    if(game.mode!=='playing')return; game.mode='result';
    ui.resultTitle.textContent=win?'OUTPAST THE MOON':'CAUGHT IN THE ACT';
    ui.resultMessage.textContent=win?'The castle is behind you. Tonight, you got away.':'Malfoid caught up. The corridor claims another midnight story.';
    ui.resultIcon.textContent=win?'✧':'✦'; ui.resultEyebrow.innerHTML=win?'<i></i> A PERFECT ESCAPE <i></i>':'<i></i> THE NIGHT ISN’T OVER <i></i>';
    ui.finalDistance.textContent=Math.floor(game.distance)+' m'; ui.finalStars.textContent=game.stars; ui.result.classList.remove('hidden');
  }
  function updateHud() {
    ui.distance.textContent=Math.floor(game.distance)+' m'; ui.stars.textContent=game.stars;
    ui.hearts.textContent='♥ '.repeat(Math.max(0,game.health)).trim()+'♡ '.repeat(3-Math.max(0,game.health)).trim();
    ui.hearts.setAttribute('aria-label',`${game.health} hearts remaining`);
    const urgency=game.chase>70; ui.chaser.style.color=urgency?'#ff777a':'';
    ui.chaser.querySelector('.chaser-copy').innerHTML=`<span class="chaser-eye">◉</span> ${urgency?'MALFOID IS RIGHT BEHIND YOU':'MALFOID IS CLOSE'}`;
    $('#chaseFill').style.width=`${game.chase}%`;
  }
  function act(type, down=false) {
    if(game.mode!=='playing')return;
    if(type==='jump'&&down&&game.jumpY===0&&!game.crouch){game.jumpV=-H*1.03;burst(W*.22,H*.78-20,'#f3d37e',8);}
    if(type==='hide')game.crouch=down;
  }
  $('#startButton').addEventListener('click',start); $('#restartButton').addEventListener('click',start);
  $('#pauseButton').addEventListener('click',pause); $('#resumeButton').addEventListener('click',pause);
  for(const button of document.querySelectorAll('.control-btn')){
    const type=button.dataset.action;
    button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture?.(e.pointerId);button.classList.add('pressed');act(type,true);});
    const release=e=>{e.preventDefault();button.classList.remove('pressed');if(type==='hide')act(type,false);};
    button.addEventListener('pointerup',release); button.addEventListener('pointercancel',release); button.addEventListener('lostpointercapture',()=>{button.classList.remove('pressed');if(type==='hide')act(type,false);});
  }
  addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','KeyW','KeyS'].includes(e.code))e.preventDefault();if(e.repeat)return;if(e.code==='Space'||e.code==='ArrowUp'||e.code==='KeyW')act('jump',true);if(e.code==='ArrowDown'||e.code==='KeyS')act('hide',true);if(e.code==='Escape'||e.code==='KeyP')pause();if(e.code==='Enter'&&(game.mode==='intro'||game.mode==='result'))start();});
  addEventListener('keyup',e=>{if(e.code==='ArrowDown'||e.code==='KeyS')act('hide',false);});
  function burst(x,y,color,n=8){for(let i=0;i<n;i++)game.particles.push({x,y,vx:rand(-120,120),vy:rand(-150,30),life:rand(.35,.8),max:.8,color,r:rand(1,3)});}
  function spawnObstacle() {
    const type=Math.random()<(0.53+Math.min(.1,game.time*.002))?'book':'spell';
    const w=type==='book'?rand(40,58):rand(82,110), h=type==='book'?rand(32,45):rand(21,27);
    game.obstacles.push({x:W+70,y:ground()-h,w,h,type,passed:false,phase:rand(0,TAU)});
  }
  function spawnPickup(){const y=ground()-rand(105,190);for(let i=0;i<5;i++)game.pickups.push({x:W+70+i*39,y:y-Math.sin(i/4*Math.PI)*18,r:9,phase:rand(0,TAU)});}
  function ground(){return H*.79;}
  function update(dt) {
    if(game.mode!=='playing')return;
    game.time+=dt; game.speed=H*(.68+Math.min(.28,game.time*.002)); game.distance+=dt*(game.speed/H)*12;
    game.invulnerable=Math.max(0,game.invulnerable-dt);game.hitFlash=Math.max(0,game.hitFlash-dt);game.shake=Math.max(0,game.shake-dt);
    if(game.jumpY<0||game.jumpV<0){game.jumpV+=H*2.7*dt;game.jumpY+=game.jumpV*dt;if(game.jumpY>0){game.jumpY=0;game.jumpV=0;burst(W*.22,ground()-3,'#d7c59f',4);}}
    game.spawnAt-=dt;if(game.spawnAt<=0){spawnObstacle();game.spawnAt=rand(1.13,1.66)*Math.max(.69,1-game.time*.003);}
    game.pickupAt-=dt;if(game.pickupAt<=0){spawnPickup();game.pickupAt=rand(4.5,6.2);}
    for(const o of game.obstacles)o.x-=game.speed*dt;
    for(const p of game.pickups)p.x-=game.speed*dt;
    game.obstacles=game.obstacles.filter(o=>o.x+o.w>-5); game.pickups=game.pickups.filter(p=>p.x+p.r>-5);
    const px=W*.22, gy=ground(), crouch=game.crouch&&game.jumpY===0;
    for(const o of game.obstacles){
      const playerY=gy+game.jumpY-(crouch?4:0), playerH=crouch?H*.105:H*.19, playerW=H*.075;
      if(!o.passed&&o.x+o.w>px-playerW*.4&&o.x<px+playerW*.48){o.passed=true;
        const safe=o.type==='book'?game.jumpY<-H*.055:o.type==='spell'?crouch: false;
        if(!safe&&game.invulnerable===0){game.health--;game.chase=Math.min(100,game.chase+25);game.invulnerable=1.05;game.hitFlash=.4;game.shake=.24;burst(px+10,gy-H*.12,'#ff8b79',15);updateHud();if(game.health<=0||game.chase>=100){finish(false);return;}}
        else if(safe){game.chase=Math.max(0,game.chase-7);burst(px+12,gy-H*.12,'#e7cb7f',6);}
      }
    }
    for(const p of game.pickups){if(!p.got&&Math.abs(p.x-px)<H*.06&&Math.abs(p.y-(gy+game.jumpY-H*.12))<H*.14){p.got=true;game.stars++;game.chase=Math.max(0,game.chase-1.6);burst(p.x,p.y,'#f5d477',9);updateHud();}}
    game.pickups=game.pickups.filter(p=>!p.got);
    // Staying hidden in the pools of shadow gives the pursuer less ground to gain.
    game.chase=clamp(game.chase+(game.crouch?0.65:2.1)*dt,0,100);
    if(game.chase>=100){finish(false);return;}
    for(const b of game.bolts){b.x-=game.speed*1.2*dt;b.life-=dt;} game.bolts=game.bolts.filter(b=>b.life>0&&b.x>-30);
    for(const p of game.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=220*dt;p.life-=dt;}game.particles=game.particles.filter(p=>p.life>0);
    if(Math.floor(game.distance)>=1000){finish(true);return;}
    updateHud();
  }
  function rounded(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
  function drawBackground(t){
    const gy=ground(), sky=ctx.createLinearGradient(0,0,0,gy);sky.addColorStop(0,'#111827');sky.addColorStop(.56,'#25283a');sky.addColorStop(1,'#51404a');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    // Long perspective walls converge into the candlelit heart of the castle.
    const vx=W*.56, vy=H*.31;
    ctx.fillStyle='#242638';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(vx,vy);ctx.lineTo(vx,gy);ctx.lineTo(0,gy);ctx.closePath();ctx.fill();
    ctx.fillStyle='#302b3b';ctx.beginPath();ctx.moveTo(W,0);ctx.lineTo(vx,vy);ctx.lineTo(vx,gy);ctx.lineTo(W,gy);ctx.closePath();ctx.fill();
    const farGlow=ctx.createRadialGradient(vx,vy,4,vx,vy,H*.58);farGlow.addColorStop(0,'#d7a66335');farGlow.addColorStop(1,'#d7a66300');ctx.fillStyle=farGlow;ctx.fillRect(0,0,W,gy);
    // Repeating stone arches, parallaxing slowly through the hallway.
    const unit=Math.max(H*.72,W*.39), shift=(t*game.speed*.21)%unit;
    for(let i=-1;i<Math.ceil(W/unit)+2;i++){
      const x=i*unit-shift, depth=clamp(1-Math.abs(x+unit*.5-vx)/Math.max(W,unit)*.68,.22,.92), top=vy-(H*.31*depth), base=gy-(gy-vy)*depth, wide=unit*.53*depth+unit*.16, archH=(base-top)*.83;
      if(x+unit<0||x>W)continue;
      const cx=x+unit*.54;
      ctx.strokeStyle=`rgba(165,149,153,${.16*depth})`;ctx.lineWidth=Math.max(2,H*.009*depth);
      ctx.beginPath();ctx.moveTo(cx-wide/2,base);ctx.lineTo(cx-wide/2,top+archH*.48);ctx.quadraticCurveTo(cx-wide/2,top,cx,top);ctx.quadraticCurveTo(cx+wide/2,top,cx+wide/2,top+archH*.48);ctx.lineTo(cx+wide/2,base);ctx.stroke();
      // stained glass in selected bays
      if(i%3===1&&depth>.33){ctx.save();ctx.globalAlpha=.4*depth;ctx.fillStyle='#697f9a';ctx.beginPath();ctx.moveTo(cx-wide*.27,base-H*.09*depth);ctx.lineTo(cx-wide*.27,top+archH*.46);ctx.quadraticCurveTo(cx-wide*.27,top+H*.025,cx,top+H*.025);ctx.quadraticCurveTo(cx+wide*.27,top+H*.025,cx+wide*.27,top+archH*.46);ctx.lineTo(cx+wide*.27,base-H*.09*depth);ctx.closePath();ctx.fill();ctx.strokeStyle='#c5a873';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx,top+H*.03);ctx.lineTo(cx,base-H*.09*depth);ctx.moveTo(cx-wide*.26,top+archH*.53);ctx.lineTo(cx+wide*.26,top+archH*.53);ctx.stroke();ctx.restore();}
      if(i%2===0&&depth>.38){const ly=top+archH*.56;ctx.fillStyle='#d9a95d';ctx.beginPath();ctx.arc(cx-wide*.38,ly,Math.max(2,H*.008*depth),0,TAU);ctx.fill();const flame=ctx.createRadialGradient(cx-wide*.38,ly,1,cx-wide*.38,ly,H*.09*depth);flame.addColorStop(0,'#ffd77b42');flame.addColorStop(1,'#ffb74e00');ctx.fillStyle=flame;ctx.fillRect(cx-wide*.65,ly-H*.09*depth,H*.18*depth,H*.18*depth);}
    }
    // Floating dust in the beams of moonlight.
    for(const d of game.decor){const y=(d.y+Math.sin(t*.8+d.phase)*H*.018)%gy;ctx.globalAlpha=d.a*(.5+.5*Math.sin(t*1.3+d.phase));ctx.fillStyle='#f6dca3';ctx.beginPath();ctx.arc((d.x-t*8%W+W)%W,y,d.r,0,TAU);ctx.fill();}ctx.globalAlpha=1;
    // polished flagstones, with perspective seams
    const floor=ctx.createLinearGradient(0,gy,0,H);floor.addColorStop(0,'#55444c');floor.addColorStop(.22,'#393542');floor.addColorStop(1,'#161b29');ctx.fillStyle=floor;ctx.fillRect(0,gy,W,H-gy);
    ctx.strokeStyle='#c2a48720';ctx.lineWidth=1;const floorShift=(t*game.speed*.8)%Math.max(25,H*.09);
    for(let i=0;i<9;i++){const f=(i+1)/9, yy=gy+Math.pow(f,1.7)*(H-gy);ctx.beginPath();ctx.moveTo(0,yy+floorShift*.5);ctx.lineTo(W,yy+floorShift*.5);ctx.stroke();}
    for(let i=-2;i<8;i++){ctx.beginPath();ctx.moveTo(W*.53,gy);ctx.lineTo(i*W/5+(t*game.speed*.15)% (W/5),H);ctx.stroke();}
    const v=ctx.createLinearGradient(0,gy,0,H);v.addColorStop(0,'#100f1900');v.addColorStop(1,'#070a12aa');ctx.fillStyle=v;ctx.fillRect(0,gy,W,H-gy);
  }
  function drawMalfoid(t){
    const gy=ground(),s=H*.145,x=W*.055,y=gy;ctx.save();ctx.translate(x,y+Math.sin(t*9)*H*.003);ctx.globalAlpha=.78;
    // pale-haired rival, trailing in the corridor's long shadow
    ctx.fillStyle='#111522';ctx.beginPath();ctx.ellipse(0,-s*.2,s*.3,s*.08,0,0,TAU);ctx.fill();
    ctx.fillStyle='#292738';ctx.beginPath();ctx.moveTo(-s*.2,-s*.58);ctx.lineTo(s*.19,-s*.58);ctx.lineTo(s*.32,0);ctx.lineTo(-s*.28,0);ctx.closePath();ctx.fill();
    ctx.fillStyle='#d5c9b8';ctx.beginPath();ctx.ellipse(0,-s*.73,s*.14,s*.18,0,0,TAU);ctx.fill();
    ctx.fillStyle='#ded9c8';ctx.beginPath();ctx.moveTo(-s*.15,-s*.85);ctx.quadraticCurveTo(-s*.19,-s*1.1,s*.02,-s*1.02);ctx.quadraticCurveTo(s*.19,-s*1.05,s*.14,-s*.78);ctx.lineTo(s*.08,-s*.92);ctx.lineTo(-s*.03,-s*.81);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#c89c69';ctx.lineWidth=Math.max(1,H*.003);ctx.beginPath();ctx.moveTo(s*.16,-s*.55);ctx.lineTo(s*.37,-s*.72);ctx.stroke();
    ctx.fillStyle='#e49d82';ctx.beginPath();ctx.arc(s*.08,-s*.75,Math.max(1,H*.002),0,TAU);ctx.fill();ctx.restore();
  }
  function drawHarry(t){
    const gy=ground(),x=W*.22,duck=game.crouch&&game.jumpY===0,s=H*(duck?0.145:0.19),y=gy+game.jumpY;
    ctx.save();ctx.translate(x,y);if(game.invulnerable>0&&Math.floor(game.invulnerable*12)%2===0)ctx.globalAlpha=.48;
    const bob=duck?0:Math.sin(t*13)*H*.004;
    // shadow tracks the jump's height
    ctx.globalAlpha*=clamp(1+game.jumpY/H,.35,1);ctx.fillStyle='#090c15a0';ctx.beginPath();ctx.ellipse(0,-2,H*.07,H*.014,0,0,TAU);ctx.fill();ctx.globalAlpha=game.invulnerable>0&&Math.floor(game.invulnerable*12)%2===0?.48:1;
    ctx.translate(0,bob);
    // legs and shoes, cycling in a very readable running silhouette
    const stride=duck?0:Math.sin(t*14)*H*.018;ctx.strokeStyle='#25263a';ctx.lineWidth=H*.018;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(-H*.018,-s*.26);ctx.lineTo(-H*.026+stride,-s*.03);ctx.stroke();ctx.beginPath();ctx.moveTo(H*.018,-s*.26);ctx.lineTo(H*.03-stride,-s*.03);ctx.stroke();
    ctx.strokeStyle='#b59575';ctx.lineWidth=H*.014;ctx.beginPath();ctx.moveTo(-H*.026+stride,-s*.03);ctx.lineTo(-H*.045+stride,-s*.025);ctx.stroke();ctx.beginPath();ctx.moveTo(H*.03-stride,-s*.03);ctx.lineTo(H*.047-stride,-s*.025);ctx.stroke();
    // billowing school cloak
    ctx.fillStyle='#24253a';ctx.beginPath();ctx.moveTo(-s*.19,-s*.66);ctx.quadraticCurveTo(-s*.32,-s*.39,-s*.3,0);ctx.lineTo(s*.29,0);ctx.quadraticCurveTo(s*.29,-s*.37,s*.18,-s*.67);ctx.closePath();ctx.fill();
    ctx.fillStyle='#32334b';ctx.beginPath();ctx.moveTo(-s*.15,-s*.59);ctx.lineTo(-s*.01,-s*.28);ctx.lineTo(s*.13,-s*.61);ctx.lineTo(s*.22,0);ctx.lineTo(-s*.21,0);ctx.closePath();ctx.fill();
    // scarlet and gold scarf streaming backward
    ctx.fillStyle='#a54d48';ctx.beginPath();ctx.moveTo(-s*.08,-s*.67);ctx.quadraticCurveTo(-s*.28,-s*.61,-s*.37,-s*.48);ctx.lineTo(-s*.47,-s*.42);ctx.lineTo(-s*.35,-s*.44);ctx.lineTo(-s*.41,-s*.35);ctx.lineTo(-s*.23,-s*.42);ctx.lineTo(-s*.1,-s*.51);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#e0bd72';ctx.lineWidth=Math.max(1,H*.004);ctx.beginPath();ctx.moveTo(-s*.29,-s*.49);ctx.lineTo(-s*.41,-s*.42);ctx.stroke();
    // arm points his wand forward
    ctx.strokeStyle='#d4aa87';ctx.lineWidth=H*.013;ctx.beginPath();ctx.moveTo(s*.1,-s*.57);ctx.lineTo(s*.22,-s*.48);ctx.lineTo(s*.37,-s*.52);ctx.stroke();ctx.strokeStyle='#87664a';ctx.lineWidth=Math.max(1,H*.003);ctx.beginPath();ctx.moveTo(s*.32,-s*.52);ctx.lineTo(s*.48,-s*.58);ctx.stroke();
    // face, windswept hair, round spectacles and lightning scar
    ctx.fillStyle='#edc7a6';ctx.beginPath();ctx.ellipse(s*.025,-s*.77,s*.155,s*.18,0,0,TAU);ctx.fill();
    ctx.fillStyle='#302a28';ctx.beginPath();ctx.moveTo(-s*.12,-s*.82);ctx.quadraticCurveTo(-s*.1,-s*1.07,s*.12,-s*.96);ctx.lineTo(s*.17,-s*.78);ctx.lineTo(s*.08,-s*.84);ctx.lineTo(-s*.01,-s*.79);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#4b3b39';ctx.lineWidth=Math.max(1,H*.0025);ctx.beginPath();ctx.arc(-s*.015,-s*.765,s*.062,0,TAU);ctx.arc(s*.105,-s*.765,s*.062,0,TAU);ctx.moveTo(s*.047,-s*.765);ctx.lineTo(s*.045,-s*.765);ctx.stroke();
    ctx.strokeStyle='#b48553';ctx.lineWidth=Math.max(1,H*.002);ctx.beginPath();ctx.moveTo(-s*.04,-s*.94);ctx.lineTo(-s*.025,-s*.9);ctx.lineTo(-s*.045,-s*.88);ctx.stroke();
    ctx.restore();
  }
  function drawObstacle(o,t){
    const gy=ground();ctx.save();
    if(o.type==='book'){
      const x=o.x,y=gy-o.h;ctx.fillStyle='#11121d66';ctx.beginPath();ctx.ellipse(x+o.w*.5,gy+4,o.w*.57,H*.013,0,0,TAU);ctx.fill();
      rounded(x,y+o.h*.52,o.w,o.h*.47,3,'#5e3d42','#c29b6d');rounded(x+o.w*.1,y+o.h*.2,o.w*.82,o.h*.43,3,'#354158','#baa878');rounded(x+o.w*.2,y,o.w*.72,o.h*.34,3,'#80504d','#d5b474');
      ctx.fillStyle='#e5cb90';ctx.fillRect(x+o.w*.33,y+o.h*.11,o.w*.4,2);ctx.fillRect(x+o.w*.33,y+o.h*.19,o.w*.28,1);
      ctx.fillStyle='#d9b866';ctx.beginPath();ctx.arc(x+o.w*.15,y+o.h*.69,2,0,TAU);ctx.fill();
    }else{
      const y=gy-H*.225+Math.sin(t*8+o.phase)*H*.006;ctx.fillStyle='#e0807b';ctx.shadowColor='#fc777b';ctx.shadowBlur=H*.035;
      ctx.beginPath();ctx.moveTo(o.x,y+o.h/2);ctx.lineTo(o.x+o.w*.18,y);ctx.lineTo(o.x+o.w*.8,y);ctx.lineTo(o.x+o.w,y+o.h/2);ctx.lineTo(o.x+o.w*.8,y+o.h);ctx.lineTo(o.x+o.w*.18,y+o.h);ctx.closePath();ctx.fill();ctx.shadowBlur=0;
      ctx.fillStyle='#fff0c1';ctx.beginPath();ctx.arc(o.x+o.w*.18,y+o.h/2,H*.009,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(o.x+o.w*.8,y+o.h/2,H*.009,0,TAU);ctx.fill();
      ctx.strokeStyle='#ffcd9944';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(o.x+o.w*.12,y-o.h*.28);ctx.lineTo(o.x+o.w*.86,y-o.h*.28);ctx.stroke();
    }
    ctx.restore();
  }
  function drawPickup(p,t){const glow=ctx.createRadialGradient(p.x,p.y,1,p.x,p.y,p.r*2.7);glow.addColorStop(0,'#ffe9a3a8');glow.addColorStop(1,'#e7bd5700');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(p.x,p.y,p.r*2.7,0,TAU);ctx.fill();ctx.save();ctx.translate(p.x,p.y);ctx.rotate(t*2+p.phase);ctx.fillStyle='#f4d57d';ctx.beginPath();ctx.moveTo(0,-p.r);ctx.lineTo(p.r*.3,-p.r*.27);ctx.lineTo(p.r,-p.r*.08);ctx.lineTo(p.r*.33,p.r*.2);ctx.lineTo(0,p.r);ctx.lineTo(-p.r*.33,p.r*.2);ctx.lineTo(-p.r,-p.r*.08);ctx.lineTo(-p.r*.3,-p.r*.27);ctx.closePath();ctx.fill();ctx.restore();}
  function render(now){
    const t=game.mode==='playing'?game.time:now*.001;ctx.save();
    if(game.shake>0){const power=game.shake/H*.65;ctx.translate(rand(-power,power),rand(-power,power));}
    drawBackground(t);
    // faint, searching wand sparks near the pursuer
    drawMalfoid(t);
    for(const p of game.pickups)drawPickup(p,t);
    for(const o of game.obstacles)drawObstacle(o,t);
    drawHarry(t);
    for(const b of game.bolts){ctx.strokeStyle='#ffada2';ctx.shadowColor='#ff686f';ctx.shadowBlur=14;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x+14,b.y-5);ctx.lineTo(b.x+28,b.y+2);ctx.stroke();ctx.shadowBlur=0;}
    for(const p of game.particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,TAU);ctx.fill();}ctx.globalAlpha=1;
    if(game.hitFlash>0){ctx.fillStyle=`rgba(234,91,92,${game.hitFlash*.2})`;ctx.fillRect(0,0,W,H);}
    // vignette keeps the action readable on bright screens
    const vg=ctx.createRadialGradient(W*.5,H*.48,H*.2,W*.5,H*.48,H*.82);vg.addColorStop(0,'#070a1200');vg.addColorStop(1,'#070a126e');ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
    ctx.restore();
  }
  function frame(now){const dt=game.last?Math.min(.04,(now-game.last)/1000):0;game.last=now;update(dt);render(now);requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
})();
