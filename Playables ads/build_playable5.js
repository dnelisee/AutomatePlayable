const fs = require('fs');

try {
  const html = fs.readFileSync('playable4.html', 'utf8');
  const assetsStart = html.indexOf('const ASSETS_B64 = {');
  const assetsEnd = html.indexOf('};', assetsStart) + 2;
  const assetsCode = html.substring(assetsStart, assetsEnd);

  const newGameCode = `
// ─── CHARACTERS ASSETS (PLACEHOLDERS) ─────────────────────────────────────────
const IMG_ORC = "data:image/png;base64,";      /* BASE64_DATA_HERE */
const IMG_SKELETON = "data:image/png;base64,"; /* BASE64_DATA_HERE */
const IMG_CYCLOPS = "data:image/png;base64,";  /* BASE64_DATA_HERE */
const IMG_TOMB = "data:image/png;base64,";     /* BASE64_DATA_HERE */

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const CONFIG = {
  castleHp: 100,
  castleMoveSpeed: 40,
  projectileSpeed: 520,
  TURN_DURATION: 1.5,
  CAMERA_SMOOTHING: 0.1,
  TERRAIN_BUMPINESS: 30,
  GRAVITY: 600,
  TERMINAL_VELOCITY: 1000,
  SLINGSHOT_SENSITIVITY: 4.0,
  EXPLOSION_RADIUS: 50,
  ctaText: "PLAY NOW!"
};

// ─── ASSET LOADER ────────────────────────────────────────────────────────────
const IMG = {}, AUD = {};
const IMG_KEYS   = ["BG","BLUE_CASTLE","RED_CASTLE","PROJ1","PROJ2","WEAPON1","WEAPON2"];
const AUDIO_KEYS = ["MUSIC","SFX"];
const CHAR_IMGS  = { IMG_ORC, IMG_SKELETON, IMG_CYCLOPS, IMG_TOMB };

function loadAssets(cb) {
  let keys = Object.keys(CHAR_IMGS);
  let n = IMG_KEYS.length + AUDIO_KEYS.length + keys.length, done = 0;
  const tick = () => { if (++done >= n) cb(); };
  IMG_KEYS.forEach(k => {
    const i = new Image(); i.onload=tick; i.onerror=tick; i.src=ASSETS_B64[k]; IMG[k]=i;
  });
  AUDIO_KEYS.forEach(k => {
    const a = new Audio(); a.oncanplaythrough=tick; a.onerror=tick; a.src=ASSETS_B64[k];
    if(k==="MUSIC"){a.loop=true;a.volume=0.35;} else {a.volume=0.6;}
    AUD[k]=a;
  });
  keys.forEach(k => {
    const i = new Image(); i.onload=tick; i.onerror=tick; i.src=CHAR_IMGS[k]; IMG[k]=i;
  });
  setTimeout(cb, 4000); // fallback
}

// ─── STATE & VARS ────────────────────────────────────────────────────────────
const S = { LOADING:0, TITLE:1, OVERVIEW:2, FOCUS:3, AIM:4, SHOOT:5, IMPACT:6, WIN:7, LOSE:8 };
let state = S.LOADING;

const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
let W, H;
function resize() { W = window.innerWidth; H = window.innerHeight; canvas.width = W; canvas.height = H; }
resize();
window.addEventListener("resize", resize);

let blue, red;
let projectiles = [], particles = [], dmgNumbers = [];
let shakeAmt = 0, flashAlpha = 0, flashColor = "255,255,255";
let camera = { x: 0, y: 0, scale: 1, targetX: 0, targetY: 0, targetScale: 1, mode: S.OVERVIEW };

let elapsed = 0, lastTs = 0;
let phaseTimer = 0;
let aiAimTimer = 0;
let activeTeam = "blue"; // "blue" or "red"
let isDragging = false;
let dragStart = null, dragCurrent = null;
let winner = null;
let selectedUnit = 0;

let UNIT_STATS = {
  blue: [
    { type: "cyclops", relX: 0.2, relY: 0.4, hp: 100, maxHp: 100, dmg: 30, projImg: "WEAPON1" },
    { type: "skeleton", relX: 0.5, relY: 0.8, hp: 60, maxHp: 60, dmg: 18, projImg: "PROJ1" },
    { type: "orc", relX: 0.8, relY: 0.4, hp: 150, maxHp: 150, dmg: 45, projImg: "WEAPON2" }
  ],
  red: [
    { type: "orc", relX: 0.2, relY: 0.4, hp: 150, maxHp: 150, dmg: 45, projImg: "WEAPON2" },
    { type: "skeleton", relX: 0.5, relY: 0.8, hp: 60, maxHp: 60, dmg: 18, projImg: "PROJ1" },
    { type: "cyclops", relX: 0.8, relY: 0.4, hp: 100, maxHp: 100, dmg: 30, projImg: "WEAPON1" }
  ]
};
let CASTLE_UNITS = { blue: [], red: [] };

function initGame() {
  const cw = W * 0.28;
  let ch = H * 0.48;
  if (IMG.BLUE_CASTLE && IMG.BLUE_CASTLE.complete && IMG.BLUE_CASTLE.naturalWidth) {
    ch = cw * (IMG.BLUE_CASTLE.naturalHeight / IMG.BLUE_CASTLE.naturalWidth);
  }
  
  blue = {
    x: W * 0.04, y: 0, targetY: 0, vy: 0,
    w: cw, h: ch, hp: 100, maxHp: 100,
    angle: 0, targetAngle: 0,
    img: "BLUE_CASTLE", cracks: [], holes: []
  };
  
  red = {
    x: W - W*0.04 - cw, y: 0, targetY: 0, vy: 0,
    w: cw, h: ch, hp: 100, maxHp: 100,
    angle: 0, targetAngle: 0,
    img: "RED_CASTLE", cracks: [], holes: []
  };
  
  projectiles = []; particles = []; dmgNumbers = [];
  selectedUnit = 0; winner = null;
  elapsed = 0; phaseTimer = 0; activeTeam = "blue";
  isDragging = false;
  
  CASTLE_UNITS.blue = JSON.parse(JSON.stringify(UNIT_STATS.blue));
  CASTLE_UNITS.red = JSON.parse(JSON.stringify(UNIT_STATS.red));
  
  camera.x = W/2; camera.y = H/2; camera.scale = 1;
}

// ─── CAMERA & TERRAIN ────────────────────────────────────────────────────────
function getTerrainY(x) {
  return H*0.75 + Math.sin(x * 0.015) * CONFIG.TERRAIN_BUMPINESS;
}

function updateCamera(dt) {
  if (state === S.OVERVIEW || state === S.IMPACT || state === S.WIN || state === S.LOSE) {
    camera.targetX = W/2;
    camera.targetY = H/2;
    camera.targetScale = 1;
  } else if (state === S.FOCUS || state === S.AIM) {
    let activeCastle = activeTeam === "blue" ? blue : red;
    let shooter = getActiveShooter();
    if(shooter && state === S.AIM) {
        camera.targetX = activeCastle.x + activeCastle.w * shooter.relX;
        camera.targetY = activeCastle.y + activeCastle.h * shooter.relY;
        camera.targetScale = 1.6;
    } else {
        camera.targetX = activeCastle.x + activeCastle.w/2;
        camera.targetY = activeCastle.y + activeCastle.h/2;
        camera.targetScale = 1.4;
    }
  } else if (state === S.SHOOT) {
    if (projectiles.length > 0) {
      camera.targetX = projectiles[0].x;
      camera.targetY = projectiles[0].y;
      camera.targetScale = 1.3;
    }
  }
  
  camera.x += (camera.targetX - camera.x) * CONFIG.CAMERA_SMOOTHING;
  camera.y += (camera.targetY - camera.y) * CONFIG.CAMERA_SMOOTHING;
  camera.scale += (camera.targetScale - camera.scale) * CONFIG.CAMERA_SMOOTHING;
}

function applyCamera(ctx) {
  ctx.translate(W/2, H/2);
  ctx.scale(camera.scale, camera.scale);
  ctx.translate(-camera.x, -camera.y);
  
  if(shakeAmt>0) {
    ctx.translate((Math.random()-0.5)*shakeAmt*30, (Math.random()-0.5)*shakeAmt*30);
  }
}

// ─── STATE MACHINE ───────────────────────────────────────────────────────────
function getActiveShooter() {
  let units = CASTLE_UNITS[activeTeam];
  if (activeTeam === "blue") return units[selectedUnit] && units[selectedUnit].hp > 0 ? units[selectedUnit] : units.find(u=>u.hp>0);
  return units.find(u => u.hp > 0);
}

function checkVictory() {
  let blueDead = CASTLE_UNITS.blue.every(u => u.hp <= 0) || blue.hp <= 0;
  let redDead  = CASTLE_UNITS.red.every(u => u.hp <= 0) || red.hp <= 0;
  
  if (blueDead && redDead) { winner = "tie"; state = S.LOSE; return true; }
  if (blueDead) { winner = "red"; state = S.LOSE; return true; }
  if (redDead) { winner = "blue"; state = S.WIN; return true; }
  return false;
}

function nextTurn() {
  if (checkVictory()) return;

  activeTeam = activeTeam === "blue" ? "red" : "blue";
  state = S.OVERVIEW;
  phaseTimer = 0;
  isDragging = false;
  
  if (activeTeam === "blue") {
      let u = CASTLE_UNITS.blue.findIndex(u=>u.hp>0);
      if(u>=0) selectedUnit = u;
  }
}

function updatePhase(dt) {
  phaseTimer += dt;
  if (state !== S.WIN && state !== S.LOSE) {
     if(checkVictory()) return;
  }

  switch(state) {
    case S.OVERVIEW:
      if (phaseTimer > 0.8) { state = S.FOCUS; phaseTimer = 0; }
      break;
    case S.FOCUS:
      if (phaseTimer > 0.8) { 
         state = S.AIM; phaseTimer = 0; 
         if (activeTeam === "red") aiAimTimer = 1.0;
      }
      break;
    case S.AIM:
      if (activeTeam === "red") {
        aiAimTimer -= dt;
        if (aiAimTimer <= 0) {
          let shooter = getActiveShooter();
          if(shooter) {
             let sx = red.x + red.w * shooter.relX;
             let sy = red.y + red.h * shooter.relY;
             let dist = sx - (blue.x + blue.w/2);
             let vx = -dist * (0.8 + Math.random()*0.2);
             let vy = -300 - Math.random()*150;
             spawnProjectile("red", sx, sy, vx, vy, shooter.dmg, shooter.projImg);
             state = S.SHOOT; phaseTimer = 0;
          } else {
             nextTurn();
          }
        }
      }
      break;
    case S.SHOOT:
      if (projectiles.length === 0) { state = S.IMPACT; phaseTimer = 0; }
      break;
    case S.IMPACT:
      if (phaseTimer > 1.5) { nextTurn(); }
      break;
  }
}

// ─── PHYSIQUE PROJECTILE ─────────────────────────────────────────────────────
function spawnProjectile(owner, sx, sy, vx, vy, dmg, img) {
  projectiles.push({
    x:sx, y:sy, vx, vy,
    grav: CONFIG.GRAVITY,
    owner, dmg, img,
    trail: [], life: 1
  });
  try { const s=AUD.SFX.cloneNode(); s.volume=0.45; s.play(); } catch(e){}
}

function updateCastles(dt) {
  const minDist = W * 0.15;
  const distBetween = red.x - (blue.x + blue.w);
  if (distBetween > minDist) {
    blue.x += CONFIG.castleMoveSpeed * dt;
    red.x  -= CONFIG.castleMoveSpeed * dt;
    if (Math.random() < 0.4) burst(blue.x, getTerrainY(blue.x + blue.w/2), "#aa9977", 1, false);
    if (Math.random() < 0.4) burst(red.x + red.w, getTerrainY(red.x + red.w/2), "#aa9977", 1, false);
  }

  let by = getTerrainY(blue.x + blue.w/2);
  let ry = getTerrainY(red.x + red.w/2);
  
  blue.targetY = by - blue.h;
  red.targetY = ry - red.h;
  
  blue.vy += (blue.targetY - blue.y) * 15 - blue.vy * 0.6;
  blue.y += blue.vy * dt;

  red.vy += (red.targetY - red.y) * 15 - red.vy * 0.6;
  red.y += red.vy * dt;

  let dx = 10;
  let b_dy = getTerrainY(blue.x + blue.w/2 + dx) - getTerrainY(blue.x + blue.w/2 - dx);
  blue.targetAngle = Math.atan2(b_dy, dx*2);
  blue.angle += (blue.targetAngle - blue.angle) * 0.15;

  let r_dy = getTerrainY(red.x + red.w/2 + dx) - getTerrainY(red.x + red.w/2 - dx);
  red.targetAngle = Math.atan2(r_dy, dx*2);
  red.angle += (red.targetAngle - red.angle) * 0.15;
}

function update(ts) {
  requestAnimationFrame(update);
  const dt = Math.min((ts-lastTs)/1000, 0.05);
  lastTs = ts;

  if (state === S.LOADING || state === S.TITLE) { render(); return; }

  elapsed += dt;
  shakeAmt  = Math.max(0, shakeAmt - dt*4);
  flashAlpha = Math.max(0, flashAlpha - dt*3);

  updatePhase(dt);
  updateCamera(dt);
  updateCastles(dt);

  projectiles = projectiles.filter(p => {
    p.trail.push({x:p.x,y:p.y});
    if (p.trail.length > 20) p.trail.shift();
    if(Math.random()<0.3) burst(p.x, p.y, "rgba(200,200,200,0.5)", 1, false, 0);

    p.vy += p.grav * dt;
    if(p.vy > CONFIG.TERMINAL_VELOCITY) p.vy = CONFIG.TERMINAL_VELOCITY;
    p.x  += p.vx  * dt;
    p.y  += p.vy  * dt;

    const tgt = p.owner==="blue" ? red : blue;
    // Collision detection
    if (p.x > tgt.x && p.x < tgt.x+tgt.w && p.y > tgt.y && p.y < tgt.y+tgt.h) {
      tgt.hp = Math.max(0, tgt.hp - p.dmg);
      
      let dx = p.x - (tgt.x + tgt.w/2);
      let dy = p.y - (tgt.y + tgt.h);
      let lx = dx * Math.cos(-tgt.angle) - dy * Math.sin(-tgt.angle);
      let ly = dx * Math.sin(-tgt.angle) + dy * Math.cos(-tgt.angle);
      let localX = lx + (tgt.x + tgt.w/2);
      let localY = ly + (tgt.y + tgt.h);
      tgt.holes.push({x: localX, y: localY, r: CONFIG.EXPLOSION_RADIUS});
      
      // Cracks mapping
      let crackPts = [];
      let cx = localX, cy = localY;
      crackPts.push({x:cx, y:cy});
      for(let j=0; j<4; j++) {
        cx += (Math.random()-0.5)*40;
        cy += (Math.random()-0.5)*40;
        crackPts.push({x:cx, y:cy});
      }
      tgt.cracks.push(crackPts);
      
      // Area of Effect damage
      let units = CASTLE_UNITS[p.owner==="blue"?"red":"blue"];
      units.forEach(u => {
        let ux = tgt.x + tgt.w * u.relX;
        let uy = tgt.y + tgt.h * u.relY;
        let dist = Math.hypot(p.x - ux, p.y - uy);
        if (dist <= CONFIG.EXPLOSION_RADIUS * 1.5 && u.hp > 0) {
           u.hp = Math.max(0, u.hp - p.dmg);
           dmgNumbers.push({x: ux, y: uy - 20, val: \`-\${p.dmg}\`, color: p.owner==="blue"?"#f1c40f":"#e74c3c", life:1});
        }
      });
      
      shakeAmt = 0.5; flashAlpha = 0.5;
      flashColor = p.owner==="blue" ? "255,100,0" : "0,100,255";
      explosion(p.x, p.y);
      if (p.dmg > 0) dmgNumbers.push({x:p.x,y:p.y,val: \`-\${p.dmg}\`, color:p.owner==="blue"?"#f1c40f":"#e74c3c",life:1});
      
      return false;
    }
    
    let gy = getTerrainY(p.x);
    if (p.y > gy) {
      explosion(p.x, p.y);
      shakeAmt = 0.3;
      return false;
    }

    return p.x > -100 && p.x < W+100 && p.y < H+100;
  });

  particles = particles.filter(p => {
    p.x+=p.vx*dt; p.y+=p.vy*dt; 
    if(p.grav) p.vy+=400*dt;
    p.life-=dt*1.2; 
    return p.life>0;
  });

  dmgNumbers = dmgNumbers.filter(d => {
    d.y-=60*dt; d.life-=dt*1.0; return d.life>0;
  });

  render();
}

// ─── RENDU ───────────────────────────────────────────────────────────────────
function render() {
  ctx.clearRect(0,0,W,H);
  
  if(state===S.LOADING){drawLoading();return;}

  if(state===S.TITLE) {
    drawBG(); drawTitle(); return;
  }

  drawBG();

  if(flashAlpha>0) {
    ctx.fillStyle=\`rgba(\${flashColor},\${flashAlpha})\`;
    ctx.fillRect(0,0,W,H);
  }

  ctx.save();
  applyCamera(ctx);

  drawTerrain();
  drawCastle(blue, false);
  drawCastle(red, true);
  drawProjectiles();
  drawParticles();
  drawDmgNumbers();

  // Trajectoire Slingshot
  if (state === S.AIM && isDragging) {
     let shooter = getActiveShooter();
     if(shooter) {
         let sx = blue.x + blue.w * shooter.relX;
         let sy = blue.y + blue.h * shooter.relY;
         let vx = (dragStart.x - dragCurrent.x) * CONFIG.SLINGSHOT_SENSITIVITY / camera.scale;
         let vy = (dragStart.y - dragCurrent.y) * CONFIG.SLINGSHOT_SENSITIVITY / camera.scale;
         drawTrajectory(sx, sy, vx, vy);
     }
  }

  ctx.restore();

  drawHUD();
  drawDock();

  if(state===S.AIM && activeTeam==="blue" && !isDragging) {
      let shooter = getActiveShooter();
      if (shooter) drawAimHint(shooter);
  }

  if(state===S.WIN || state===S.LOSE) drawEndScreen(state===S.WIN);
}

function drawBG() {
  ctx.save();
  ctx.translate(W/2, H/2);
  ctx.scale(1/camera.scale, 1/camera.scale); 
  ctx.translate(-W/2, -H/2);
  
  if (IMG.BG && IMG.BG.complete && IMG.BG.naturalWidth) {
    const r = IMG.BG.naturalWidth/IMG.BG.naturalHeight;
    const bh=H*1.2, bw=bh*r;
    ctx.drawImage(IMG.BG, (W-bw)/2, -H*0.1, bw, bh);
  } else {
    const g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,"#78c8a0"); g.addColorStop(1,"#3a8a5a");
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  }
  ctx.restore();
}

function drawTerrain() {
  ctx.fillStyle = "#2d4a2d";
  ctx.beginPath();
  ctx.moveTo(-W, H*2);
  for(let x = -W; x <= W*2; x += 20) {
    ctx.lineTo(x, getTerrainY(x));
  }
  ctx.lineTo(W*2, H*2);
  ctx.fill();

  ctx.strokeStyle = "#4caf50";
  ctx.lineWidth = H*0.02;
  ctx.beginPath();
  for(let x = -W; x <= W*2; x += 20) {
    ctx.lineTo(x, getTerrainY(x));
  }
  ctx.stroke();

  drawTracks(blue.x, getTerrainY(blue.x + blue.w/2), blue.w, 1.0, elapsed * CONFIG.castleMoveSpeed);
  drawTracks(red.x, getTerrainY(red.x + red.w/2), red.w, 1.0, -elapsed * CONFIG.castleMoveSpeed);
}

function drawTracks(cx, cy, cw, scale, offset) {
  ctx.save();
  ctx.translate(cx + cw/2, cy);
  ctx.scale(scale, scale);
  
  ctx.fillStyle="#222";
  ctx.beginPath();
  ctx.roundRect(-cw/2, -H*0.02, cw, H*0.04, H*0.02);
  ctx.fill();
  
  ctx.strokeStyle="#555"; ctx.lineWidth=2;
  const numGears=4, gw = cw*0.8;
  for(let i=0;i<numGears;i++){
    let gx = -gw/2 + (i/(numGears-1))*gw;
    ctx.beginPath(); ctx.arc(gx, 0, H*0.015, 0, Math.PI*2);
    ctx.fill(); ctx.stroke();
    ctx.save(); ctx.translate(gx,0); ctx.rotate(offset*0.1);
    ctx.beginPath(); ctx.moveTo(0,-H*0.015); ctx.lineTo(0,H*0.015); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-H*0.015,0); ctx.lineTo(H*0.015,0); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawCracks(c) {
  ctx.save();
  ctx.strokeStyle=\`rgba(10,10,10, 0.9)\`;
  ctx.lineWidth=4;
  ctx.lineJoin = "round";
  
  for(let i=0; i<c.cracks.length; i++) {
    let pts = c.cracks[i];
    ctx.beginPath();
    ctx.moveTo(c.x + pts[0].x, c.y + pts[0].y);
    for(let j=1; j<pts.length; j++) {
      ctx.lineWidth = 4 - (j/pts.length)*3;
      ctx.lineTo(c.x + pts[j].x, c.y + pts[j].y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(c.x + pts[j].x, c.y + pts[j].y);
    }
  }
  ctx.restore();
}

function drawCastle(c, isRed) {
  ctx.save();
  const px = c.x + c.w/2, py = c.y + c.h;
  ctx.translate(px, py);
  ctx.rotate(c.angle);
  ctx.translate(-px, -py);

  // 1. Facade Base
  const img = IMG[c.img];
  if (img && img.complete && img.naturalWidth) {
    ctx.drawImage(img, c.x, c.y, c.w, c.h);
  } else {
    ctx.fillStyle = isRed?"#c0392b":"#2980b9";
    ctx.fillRect(c.x, c.y, c.w, c.h);
  }
  
  // 2. Static Cracks
  drawCracks(c);

  // 3. Facade Clipping for Holes (Interior & Characters)
  if (c.holes.length > 0) {
    ctx.save();
    ctx.beginPath();
    c.holes.forEach(h => {
        ctx.moveTo(h.x + h.r, h.y);
        ctx.arc(h.x, h.y, h.r, 0, Math.PI*2);
    });
    ctx.clip();
    
    // Interior floors
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y + c.h*0.3); ctx.lineTo(c.x+c.w, c.y + c.h*0.3);
    ctx.moveTo(c.x, c.y + c.h*0.6); ctx.lineTo(c.x+c.w, c.y + c.h*0.6);
    ctx.stroke();

    // Characters
    let team = isRed ? "red" : "blue";
    CASTLE_UNITS[team].forEach((u, i) => {
      let ux = c.x + c.w * u.relX;
      let uy = c.y + c.h * u.relY;
      let uSize = c.w * 0.4;
      
      let imgKey = u.hp > 0 ? "IMG_" + u.type.toUpperCase() : "IMG_TOMB";
      let drawImg = CHAR_IMGS[imgKey] ? IMG[imgKey] : null;
      
      if (drawImg && drawImg.complete && drawImg.src && drawImg.src.length > 50) {
        ctx.drawImage(drawImg, ux - uSize/2, uy - uSize/2, uSize, uSize);
      } else {
        if (u.hp > 0) {
          ctx.fillStyle = team==="blue" ? "#3498db" : "#e74c3c";
          ctx.beginPath(); ctx.arc(ux, uy, uSize/2, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = "#fff"; ctx.textAlign="center"; ctx.fillText(u.type[0], ux, uy+5);
        } else {
          ctx.fillStyle = "#7f8c8d";
          ctx.beginPath();
          ctx.roundRect(ux - uSize*0.2, uy - uSize*0.2, uSize*0.4, uSize*0.4, 5);
          ctx.fill();
          ctx.fillStyle = "#fff"; ctx.font="10px Arial"; ctx.textAlign="center"; ctx.fillText("RIP", ux, uy+10);
        }
      }
    });

    ctx.restore();
  }

  ctx.restore();
}

function drawTrajectory(sx, sy, vx, vy) {
  ctx.beginPath();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 10]);
  let px = sx, py = sy;
  let pvx = vx, pvy = vy;
  ctx.moveTo(px, py);
  const dt = 0.05;
  for(let i=0; i<40; i++) {
    pvy += CONFIG.GRAVITY * dt;
    px += pvx * dt;
    py += pvy * dt;
    ctx.lineTo(px, py);
    if(py > getTerrainY(px)) break;
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawProjectiles() {
  projectiles.forEach(p => {
    if(p.trail.length>1) {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(150,150,150,0.6)";
      ctx.lineWidth=Math.round(8*W/375);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.moveTo(p.trail[0].x, p.trail[0].y);
      for(let i=1;i<p.trail.length;i++) ctx.lineTo(p.trail[i].x, p.trail[i].y);
      ctx.stroke();
    }
    const img=IMG[p.img];
    const s=Math.round(25*W/375);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(Math.atan2(p.vy, p.vx));
    if(img&&img.complete) {
      ctx.drawImage(img,-s/2,-s/2,s,s);
    } else {
      ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(0,0,s/2,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  });
}

function burst(x,y,col,n, isDebris, speed=150) {
  for(let i=0;i<n;i++) {
    const a=Math.random()*Math.PI*2;
    const s=Math.random()*speed+50;
    particles.push({
      x,y,vx:Math.cos(a)*s, vy:Math.sin(a)*s,
      r:Math.random()*4+2, color:col, life:1, grav: isDebris,
      type: isDebris ? "debris" : "smoke"
    });
  }
}

function explosion(x, y) {
  burst(x, y, "#ffffff", 10, false, 200);
  burst(x, y, "#f39c12", 20, false, 150);
  burst(x, y, "#555555", 15, true, 300);
  particles.push({x, y, vx:0, vy:0, r:10, color:"#e74c3c", life:1, type:"shockwave"});
}

function drawParticles() {
  particles.forEach(p => {
    ctx.globalAlpha=Math.max(0, p.life);
    if (p.type === "shockwave") {
       ctx.strokeStyle=p.color;
       ctx.lineWidth=6 * p.life;
       ctx.beginPath();
       ctx.arc(p.x, p.y, p.r + (1-p.life)*150, 0, Math.PI*2);
       ctx.stroke();
    } else if (p.type === "debris") {
       ctx.fillStyle=p.color;
       ctx.fillRect(p.x, p.y, p.r*2, p.r*2);
    } else {
       ctx.fillStyle=p.color;
       ctx.beginPath(); ctx.arc(p.x,p.y,p.r*p.life,0,Math.PI*2); ctx.fill();
    }
  });
  ctx.globalAlpha=1;
}

function drawDmgNumbers() {
  dmgNumbers.forEach(d => {
    ctx.globalAlpha=Math.max(0, d.life);
    ctx.font=\`bold \${Math.round(22*W/375)}px Arial\`;
    ctx.textAlign="center";
    ctx.strokeStyle="#000"; ctx.lineWidth=4;
    ctx.strokeText(d.val,d.x,d.y);
    ctx.fillStyle=d.color; ctx.fillText(d.val,d.x,d.y);
  });
  ctx.globalAlpha=1;
}

// ─── HUD & UI ────────────────────────────────────────────────────────────────
function drawHUD() {
  const bw=W*0.38, bh=H*0.028, y=H*0.012;
  ctx.fillStyle="rgba(0,0,0,0.5)";
  ctx.beginPath(); ctx.roundRect(W*0.03,y,bw,bh,bh/2); ctx.fill();
  ctx.fillStyle="#3498db";
  ctx.beginPath(); ctx.roundRect(W*0.03,y,bw*(blue.hp/blue.maxHp),bh,bh/2); ctx.fill();
  
  ctx.fillStyle="rgba(0,0,0,0.5)";
  ctx.beginPath(); ctx.roundRect(W-W*0.03-bw,y,bw,bh,bh/2); ctx.fill();
  ctx.fillStyle="#e74c3c";
  ctx.beginPath(); ctx.roundRect(W-W*0.03-bw,y,bw*(red.hp/red.maxHp),bh,bh/2); ctx.fill();
  
  ctx.fillStyle="#fff";
  ctx.font=\`bold \${Math.round(18*W/375)}px Arial\`;
  ctx.textAlign="center";
  ctx.strokeStyle="#000"; ctx.lineWidth=3;
  ctx.strokeText("Vs",W/2,y+bh*0.85); ctx.fillText("Vs",W/2,y+bh*0.85);
}

function dockRect(i) {
  const count = CASTLE_UNITS.blue.length;
  const dw = W*0.3, dh = H*0.08;
  const spacing = W*0.04;
  const totalW = count * dw + (count-1)*spacing;
  const startX = (W - totalW)/2;
  return { x: startX + i*(dw+spacing), y: H*0.88, w: dw, h: dh };
}

function drawDock() {
  if (state === S.TITLE || state === S.WIN || state === S.LOSE || state === S.LOADING) return;
  
  let units = CASTLE_UNITS.blue;
  units.forEach((u,i) => {
    const d=dockRect(i);
    const sel=selectedUnit===i && activeTeam==="blue";
    const ready = u.hp > 0;

    ctx.fillStyle=sel?"rgba(241,196,15,0.92)":"rgba(0,0,0,0.65)";
    if(!ready) ctx.fillStyle="rgba(100,100,100,0.65)";
    ctx.beginPath(); ctx.roundRect(d.x,d.y,d.w,d.h,8); ctx.fill();
    ctx.strokeStyle=sel?"#f1c40f":ready?"#ffffff55":"#ffffff22";
    ctx.lineWidth=sel?3:1.5; ctx.stroke();

    let imgKey = "IMG_" + u.type.toUpperCase();
    const wi=CHAR_IMGS[imgKey] ? IMG[imgKey] : null;
    if(wi&&wi.complete){
      ctx.drawImage(wi,d.x+d.w*0.05,d.y+d.h*0.1,d.h*0.8,d.h*0.8);
    }
    
    ctx.fillStyle="#fff";
    ctx.font=\`bold \${Math.round(12*W/375)}px Arial\`;
    ctx.textAlign="left";
    ctx.fillText(u.type.toUpperCase(), d.x+d.w*0.45, d.y+d.h*0.4);
    ctx.font=\`bold \${Math.round(10*W/375)}px Arial\`;
    ctx.fillStyle="#f1c40f";
    ctx.fillText(\`-\${u.dmg} HP\`, d.x+d.w*0.45, d.y+d.h*0.65);
    if (!ready) {
      ctx.fillStyle="#e74c3c";
      ctx.fillText(\`DEAD\`, d.x+d.w*0.45, d.y+d.h*0.85);
    }
  });
}

function drawAimHint(shooter) {
  let sx = blue.x + blue.w * shooter.relX;
  let sy = blue.y + blue.h * shooter.relY;
  
  ctx.save();
  applyCamera(ctx);
  
  const t2=elapsed%1.2/1.2;
  const cx = sx, cy = sy;
  const tx = sx - W*0.1, ty = sy + H*0.1; // backward drag hint
  const hx = cx + (tx-cx)*t2;
  const hy = cy + (ty-cy)*t2;
  
  ctx.font=\`\${Math.round(32*W/375)}px Arial\`;
  ctx.textAlign="center";
  ctx.globalAlpha=0.7+0.3*Math.sin(elapsed*4);
  ctx.fillText("👆",hx,hy);
  ctx.globalAlpha=1;
  ctx.restore();
  
  ctx.fillStyle="#fff";
  ctx.font=\`bold \${Math.round(16*W/375)}px Arial\`;
  ctx.textAlign="center";
  ctx.fillText("DRAG BACK TO SHOOT", W/2, H*0.8);
}

function drawTitle() {
  ctx.fillStyle="rgba(0,0,0,0.75)";
  ctx.fillRect(0,0,W,H);
  const titleY = H * 0.36;
  ctx.font=\`bold \${Math.round(42*W/375)}px 'Impact', 'Arial Black', sans-serif\`;
  ctx.textAlign="center";
  ctx.fillStyle = "#000";
  ctx.fillText("CASTLE CLASHER", W/2 + 4, titleY + 4);
  const g = ctx.createLinearGradient(0, titleY - 40, 0, titleY);
  g.addColorStop(0, "#f1c40f");
  g.addColorStop(1, "#e67e22");
  ctx.strokeStyle="#000"; ctx.lineWidth=6;
  ctx.strokeText("CASTLE CLASHER",W/2,titleY);
  ctx.fillStyle = g;
  ctx.fillText("CASTLE CLASHER",W/2,titleY);

  ctx.fillStyle="#fff";
  ctx.font=\`\${Math.round(16*W/375)}px Arial\`;
  if(Math.floor(Date.now()/500)%2===0) ctx.fillText("TAP TO PLAY",W/2,H*0.48);
  ctx.font=\`\${Math.round(11*W/375)}px Arial\`;
  ctx.fillStyle="#ccc";
  ctx.fillText("Turn-based Battles!",W/2,H*0.56);
}

function drawEndScreen(win) {
  ctx.fillStyle=win?"rgba(0,60,0,0.82)":"rgba(80,0,0,0.82)";
  ctx.fillRect(0,0,W,H);
  
  const titleY = H*0.4;
  ctx.font=\`bold \${Math.round(44*W/375)}px 'Impact', 'Arial Black', sans-serif\`;
  ctx.textAlign="center";
  const txt=win?"VICTORY! 🏆":"DEFEAT 💀";
  
  ctx.fillStyle = "#000";
  ctx.fillText(txt, W/2 + 4, titleY + 4);
  
  const g = ctx.createLinearGradient(0, titleY - 40, 0, titleY);
  g.addColorStop(0, win ? "#2ecc71" : "#e74c3c");
  g.addColorStop(1, win ? "#27ae60" : "#c0392b");
  
  ctx.strokeStyle="#000"; ctx.lineWidth=6;
  ctx.strokeText(txt,W/2,titleY); 
  ctx.fillStyle = g;
  ctx.fillText(txt,W/2,titleY);
  drawCTABtn();
}

function drawCTABtn() {
  const pulse=1+0.05*Math.sin(Date.now()/180);
  const bw=W*0.62,bh=H*0.082,bx=W/2-bw/2,by=H*0.54;
  ctx.save();
  ctx.translate(W/2,by+bh/2); ctx.scale(pulse,pulse); ctx.translate(-W/2,-(by+bh/2));
  const g=ctx.createLinearGradient(bx,by,bx,by+bh);
  g.addColorStop(0,"#f39c12"); g.addColorStop(1,"#e67e22");
  ctx.fillStyle=g;
  ctx.beginPath(); ctx.roundRect(bx,by,bw,bh,bh/2); ctx.fill();
  ctx.fillStyle="#fff";
  ctx.font=\`bold \${Math.round(20*W/375)}px Arial\`;
  ctx.textAlign="center";
  ctx.fillText(CONFIG.ctaText,W/2,by+bh*0.65);
  ctx.restore();
}

function drawLoading() {
  ctx.fillStyle="#111"; ctx.fillRect(0,0,W,H);
  ctx.fillStyle="#fff";
  ctx.font=\`\${Math.round(18*W/375)}px Arial\`;
  ctx.textAlign="center";
  const dots=".".repeat(Math.floor(Date.now()/400)%4);
  ctx.fillText("Loading"+dots,W/2,H/2);
}

// ─── INPUT ───────────────────────────────────────────────────────────────────
function getPos(e) {
  const r=canvas.getBoundingClientRect();
  const sx=canvas.width/r.width, sy=canvas.height/r.height;
  const s=e.touches?e.touches[0]:e;
  return {x:(s.clientX-r.left)*sx, y:(s.clientY-r.top)*sy};
}

function onDown(e) {
  e.preventDefault();
  const p=getPos(e);

  if(state===S.LOADING) return;

  if(state===S.TITLE) {
    initGame(); state=S.OVERVIEW; lastTs=performance.now();
    try{AUD.MUSIC.play();}catch(err){}
    return;
  }

  if(state===S.WIN||state===S.LOSE) { alert("🎮 "+CONFIG.ctaText); return; }

  // Select Unit from Dock
  if(activeTeam === "blue" && state === S.AIM) {
    let units = CASTLE_UNITS.blue;
    for(let i=0; i<units.length; i++) {
      const d = dockRect(i);
      if(p.x>=d.x && p.x<=d.x+d.w && p.y>=d.y && p.y<=d.y+d.h) {
        if(units[i].hp > 0) selectedUnit = i; 
        return;
      }
    }
  }

  // Slingshot Start
  if (state === S.AIM && activeTeam === "blue") {
    let shooter = getActiveShooter();
    if (shooter) {
      // world pos
      let sx = blue.x + blue.w * shooter.relX;
      let sy = blue.y + blue.h * shooter.relY;
      
      // screen pos
      let screenX = (sx - camera.x) * camera.scale + W/2;
      let screenY = (sy - camera.y) * camera.scale + H/2;
      
      let dist = Math.hypot(p.x - screenX, p.y - screenY);
      // Let user click near the character to start drag
      if (dist < 150 * camera.scale) {
        isDragging = true;
        dragStart = p;
        dragCurrent = p;
      }
    }
  }
}

function onMove(e) {
  if (isDragging) {
    dragCurrent = getPos(e);
  }
}

function onUp(e) {
  if (isDragging && state === S.AIM) {
    isDragging = false;
    let shooter = getActiveShooter();
    if (shooter) {
      let sx = blue.x + blue.w * shooter.relX;
      let sy = blue.y + blue.h * shooter.relY;
      let vx = (dragStart.x - dragCurrent.x) * CONFIG.SLINGSHOT_SENSITIVITY / camera.scale;
      let vy = (dragStart.y - dragCurrent.y) * CONFIG.SLINGSHOT_SENSITIVITY / camera.scale;
      spawnProjectile("blue", sx, sy, vx, vy, shooter.dmg, shooter.projImg);
      state = S.SHOOT;
      phaseTimer = 0;
    }
  }
}

canvas.addEventListener("mousedown",  onDown, {passive:false});
canvas.addEventListener("touchstart", onDown, {passive:false});
canvas.addEventListener("mousemove",  onMove, {passive:false});
canvas.addEventListener("touchmove",  onMove, {passive:false});
canvas.addEventListener("mouseup",    onUp, {passive:false});
canvas.addEventListener("touchend",   onUp, {passive:false});

// ─── BOOT ────────────────────────────────────────────────────────────────────
requestAnimationFrame(update);
loadAssets(() => { state=S.TITLE; });

</script>
</body>
</html>
`;

  const finalHtml = html.substring(0, assetsStart) + assetsCode + newGameCode;
  fs.writeFileSync('playable5.html', finalHtml);
  console.log("Successfully rebuilt playable5.html with the new engine features");
} catch (e) {
  console.error("Error building playable5.html", e);
}
