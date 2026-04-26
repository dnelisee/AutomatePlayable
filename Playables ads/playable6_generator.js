const fs = require('fs');

let html = fs.readFileSync('playable5.html', 'utf8');

// 1. Keep base64 for old assets, and define placeholders for new ones.
const newAssets = `
    const SPRITE_ORC = "/* BASE64_DATA */";
    const SPRITE_SKELETON = "/* BASE64_DATA */";
    const SPRITE_CYCLOPS = "/* BASE64_DATA */";
    const IMAGE_MISSILE_ENEMY = "/* BASE64_DATA */";
    const IMAGE_TOMB = "/* BASE64_DATA */";
    const IMAGE_SILHOUETTE = "/* BASE64_DATA */";
`;
html = html.replace('// ─── CHARACTERS ASSETS (PLACEHOLDERS) ─────────────────────────────────────────', '// ─── CHARACTERS ASSETS (PLACEHOLDERS) ─────────────────────────────────────────' + newAssets);

// Remove the old IMG_ORC etc since they are replaced.
html = html.replace(/const IMG_ORC[\s\S]*?IMG_TOMB = [^\n]*;/g, '');

html = html.replace('const CHAR_IMGS  = { IMG_ORC, IMG_SKELETON, IMG_CYCLOPS, IMG_TOMB };', 'const CHAR_IMGS = { SPRITE_ORC, SPRITE_SKELETON, SPRITE_CYCLOPS, IMAGE_MISSILE_ENEMY, IMAGE_TOMB, IMAGE_SILHOUETTE };');

// Update UNIT_STATS
html = html.replace(/let UNIT_STATS = {[\s\S]*?};\nlet CASTLE_UNITS = { blue: \[\], red: \[\] };/, `let UNIT_STATS = {
  blue: [
    { type: "cyclops", relX: 0.2, relY: 0.4, hp: 100, maxHp: 100, dmg: 30, projImg: "WEAPON1" },
    { type: "skeleton", relX: 0.5, relY: 0.8, hp: 60, maxHp: 60, dmg: 18, projImg: "PROJ1" },
    { type: "orc", relX: 0.8, relY: 0.4, hp: 150, maxHp: 150, dmg: 45, projImg: "WEAPON2" }
  ],
  red: [
    { type: "orc", relX: 0.2, relY: 0.4, hp: 150, maxHp: 150, dmg: 45, projImg: "IMAGE_MISSILE_ENEMY" },
    { type: "skeleton", relX: 0.5, relY: 0.8, hp: 60, maxHp: 60, dmg: 18, projImg: "IMAGE_MISSILE_ENEMY" },
    { type: "cyclops", relX: 0.8, relY: 0.4, hp: 100, maxHp: 100, dmg: 30, projImg: "IMAGE_MISSILE_ENEMY" }
  ]
};
let CASTLE_UNITS = { blue: [], red: [] };`);

// Update drawCastle
let drawCastleOld = /function drawCastle\(c, isRed\) {[\s\S]*?ctx\.restore\(\);\n}/;
let drawCastleNew = `function drawCastleLayer(c, isRed, layer) {
  ctx.save();
  const px = c.x + c.w/2, py = c.y + c.h;
  ctx.translate(px, py);
  ctx.rotate(c.angle);
  ctx.translate(-px, -py);

  const sil = IMG["IMAGE_SILHOUETTE"];
  const showFacade = c.holes.length === 0;

  if (layer === "interior") {
    if (!showFacade) {
      if (sil && sil.complete) {
        ctx.drawImage(sil, c.x, c.y, c.w, c.h);
      } else {
        ctx.fillStyle = "#000";
        ctx.fillRect(c.x, c.y, c.w, c.h);
      }
      
      let team = isRed ? "red" : "blue";
      CASTLE_UNITS[team].forEach((u, i) => {
        let ux = c.x + c.w * u.relX;
        let uy = c.y + c.h * u.relY;
        let uSize = c.w * 0.4;
        
        let imgKey = u.hp > 0 ? "SPRITE_" + u.type.toUpperCase() : "IMAGE_TOMB";
        let drawImg = IMG[imgKey];
        
        if (drawImg && drawImg.complete) {
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
    }
  } else if (layer === "facade") {
    if (showFacade) {
      let offCanvas = document.createElement("canvas");
      offCanvas.width = c.w;
      offCanvas.height = c.h;
      let octx = offCanvas.getContext("2d");
      
      if (sil && sil.complete) {
        octx.drawImage(sil, 0, 0, c.w, c.h);
      } else {
        octx.fillStyle = "#000";
        octx.fillRect(0, 0, c.w, c.h);
      }
      
      octx.globalCompositeOperation = "source-atop";
      
      const img = IMG[c.img];
      if (img && img.complete) {
         octx.drawImage(img, 0, 0, c.w, c.h);
      } else {
         octx.fillStyle = isRed ? "#c0392b" : "#2980b9";
         octx.fillRect(0, 0, c.w, c.h);
      }
      
      octx.strokeStyle="rgba(10,10,10, 0.9)";
      octx.lineWidth=4;
      octx.lineJoin="round";
      for(let i=0; i<c.cracks.length; i++) {
        let pts = c.cracks[i];
        octx.beginPath();
        octx.moveTo(pts[0].x, pts[0].y);
        for(let j=1; j<pts.length; j++) {
          octx.lineWidth = 4 - (j/pts.length)*3;
          octx.lineTo(pts[j].x, pts[j].y);
          octx.stroke();
          octx.beginPath();
          octx.moveTo(pts[j].x, pts[j].y);
        }
      }
      
      ctx.drawImage(offCanvas, c.x, c.y);
    }
  }
  ctx.restore();
}`;
html = html.replace(drawCastleOld, drawCastleNew);
// remove drawCracks as it is not needed anymore
html = html.replace(/function drawCracks\(c\) {[\s\S]*?ctx\.restore\(\);\n}/, '');

// Update render function for z-index order
let renderOld = /function render\(\) {[\s\S]*?if\(state===S\.WIN \|\| state===S\.LOSE\) drawEndScreen\(state===S\.WIN\);\n}/;
let renderNew = `function render() {
  ctx.clearRect(0,0,W,H);
  if(state===S.LOADING){drawLoading();return;}
  if(state===S.TITLE) { drawBG(); drawTitle(); return; }

  drawBG();

  if(flashAlpha>0) {
    ctx.fillStyle=\`rgba(\${flashColor},\${flashAlpha})\`;
    ctx.fillRect(0,0,W,H);
  }

  ctx.save();
  applyCamera(ctx);

  drawTerrain();

  drawCastleLayer(blue, false, "interior");
  drawCastleLayer(red, true, "interior");

  drawCastleLayer(blue, false, "facade");
  drawCastleLayer(red, true, "facade");

  drawProjectiles();
  drawParticles();
  drawDmgNumbers();

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
}`;
html = html.replace(renderOld, renderNew);

// Update drawAimHint to have diagonal top-right to bottom-left motion and dotted line trajectory
let aimHintOld = /function drawAimHint\(shooter\) {[\s\S]*?ctx\.fillText\("DRAG BACK TO SHOOT", W\/2, H\*0\.8\);\n}/;
let aimHintNew = `function drawAimHint(shooter) {
  let sx = blue.x + blue.w * shooter.relX;
  let sy = blue.y + blue.h * shooter.relY;
  
  ctx.save();
  applyCamera(ctx);
  
  const t2=elapsed%1.2/1.2;
  const cx = sx + W*0.05, cy = sy - H*0.05;
  const tx = sx - W*0.05, ty = sy + H*0.05;
  const hx = cx + (tx-cx)*t2;
  const hy = cy + (ty-cy)*t2;
  
  let vx = (cx - hx) * CONFIG.SLINGSHOT_SENSITIVITY / camera.scale;
  let vy = (cy - hy) * CONFIG.SLINGSHOT_SENSITIVITY / camera.scale;
  drawTrajectory(sx, sy, vx, vy);
  
  ctx.font=\`\${Math.round(32*W/375)}px Arial\`;
  ctx.textAlign="center";
  ctx.globalAlpha=0.7+0.3*Math.sin(elapsed*4);
  ctx.fillText("👆",hx,hy);
  ctx.globalAlpha=1;
  ctx.restore();
  
  ctx.fillStyle="#fff";
  ctx.font=\`bold \${Math.round(16*W/375)}px Arial\`;
  ctx.textAlign="center";
  ctx.fillText("DRAG TO SHOOT", W/2, H*0.8);
}`;
html = html.replace(aimHintOld, aimHintNew);

// Fix local coordinates for cracks and holes
html = html.replace('let localX = lx + (tgt.x + tgt.w/2);\n      let localY = ly + (tgt.y + tgt.h);', 
                    'let localX = lx + tgt.w/2;\n      let localY = ly + tgt.h;');

// Remove any lingering timers
// In updatePhase:
// There is no game timer, but we ensure no 30s logic exists. (We verified earlier none is there)

// Fix dock units rendering to use new SPRITE_ constants
html = html.replace('let imgKey = "IMG_" + u.type.toUpperCase();', 'let imgKey = "SPRITE_" + u.type.toUpperCase();');

fs.writeFileSync('playable6.html', html);
console.log('playable6.html successfully generated.');
