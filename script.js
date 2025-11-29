const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('scoreValue');
const levelEl = document.getElementById('levelValue');

let GAME_STATES = { MENU: 'menu', PLAYING: 'playing', GAME_OVER: 'game_over' };
let gameState = {
    currentState: GAME_STATES.MENU,
    ghostY: 300, velocity: 0, flapStrength: -10,
    pipes: [], pipeWidth: 65, score: 0,
    pipeSpeed: 1.8, pipeGap: 220, gravity: 0.35,
    time: 0, flicker: 0, bloodDrips: []
};

// HORROR LEVELS
const levels = {
    easy: { pipeSpeed: 1.8, pipeGap: 220, gravity: 0.35, color: '#8b0000' },
    medium: { pipeSpeed: 2.8, pipeGap: 190, gravity: 0.45, color: '#660000' },
    hard: { pipeSpeed: 3.8, pipeGap: 160, gravity: 0.55, color: '#330000' }
};

let currentLevel = null;
let mouseX = 0, mouseY = 0;

// BLOOD DRIP SYSTEM
function createBloodDrip() {
    gameState.bloodDrips.push({
        x: Math.random() * canvas.width,
        y: 0,
        speed: Math.random() * 3 + 1,
        size: Math.random() * 4 + 2
    });
}

// ULTIMATE HORROR GHOST (7 Eyes + Skull + Blood)
function drawHorrorGhost(y) {
    gameState.flicker += 0.15;
    const flickerAlpha = (Math.sin(gameState.flicker) * 0.4 + 0.6);
    
    ctx.save();
    ctx.shadowColor = `rgba(255, 0, 0, ${flickerAlpha})`;
    ctx.shadowBlur = 50;
    
    // Tattered Cloth Body
    const bodyGradient = ctx.createRadialGradient(85, y, 0, 85, y+40, 40);
    bodyGradient.addColorStop(0, `rgba(100, 0, 0, ${flickerAlpha})`);
    bodyGradient.addColorStop(0.5, `rgba(50, 0, 0, ${flickerAlpha})`);
    bodyGradient.addColorStop(1, `rgba(20, 0, 0, ${flickerAlpha*0.3})`);
    
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.moveTo(85, y-35); ctx.lineTo(50, y-20); ctx.lineTo(40, y+10);
    ctx.lineTo(45, y+35); ctx.lineTo(70, y+50); ctx.lineTo(100, y+50);
    ctx.lineTo(125, y+35); ctx.lineTo(120, y+10); ctx.lineTo(110, y-20);
    ctx.closePath();
    ctx.fill();
    
    // Ragged Cloth Tears
    ctx.strokeStyle = `rgba(0, 0, 0, ${flickerAlpha})`;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(50, y-20); ctx.lineTo(45, y+10); ctx.lineTo(40, y+5);
    ctx.moveTo(125, y-20); ctx.lineTo(120, y+10); ctx.lineTo(115, y+5);
    ctx.moveTo(70, y+50); ctx.lineTo(75, y+55); ctx.lineTo(80, y+52);
    ctx.stroke();
    
    // EXPOSED SKULL
    ctx.fillStyle = `rgba(255, 220, 180, ${flickerAlpha})`;
    ctx.beginPath();
    ctx.arc(85, y-10, 18, 0, Math.PI * 2);
    ctx.fill();
    
    // Skull cracks
    ctx.strokeStyle = '#8b4513';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(75, y-15); ctx.lineTo(85, y-25); ctx.lineTo(95, y-15);
    ctx.moveTo(80, y+5); ctx.lineTo(90, y+15);
    ctx.stroke();
    
    // 7 CREEPY EYES
    const eyePositions = [
        {x: 72, y: y-18, size: 6}, {x: 98, y: y-18, size: 5},
        {x: 65, y: y-8, size: 4}, {x: 105, y: y-8, size: 4},
        {x: 78, y: y+2, size: 7}, {x: 92, y: y+2, size: 6},
        {x: 85, y: y-25, size: 3}
    ];
    
    eyePositions.forEach((eye, i) => {
        const pulse = Math.sin(gameState.time * 0.3 + i) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(255, 0, 100, ${flickerAlpha * pulse})`;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(eye.x, eye.y, eye.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(eye.x + 1, eye.y + 1, eye.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // BLOODY JAW + TEETH
    ctx.fillStyle = `rgba(139, 0, 0, ${flickerAlpha})`;
    ctx.fillRect(70, y+18, 20, 12);
    ctx.fillStyle = '#fff';
    for(let i = 0; i < 10; i++) {
        const toothWobble = Math.sin(gameState.time * 0.4 + i * 0.5) * 1;
        ctx.fillRect(71 + i*2, y+20 + toothWobble, 1.5, 8 + Math.random()*2);
    }
    
    // SPIDER WEB ARMS
    ctx.strokeStyle = `rgba(100, 100, 100, ${flickerAlpha*0.7})`;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(40, y); ctx.lineTo(20, y-20); ctx.lineTo(10, y+10); ctx.lineTo(25, y);
    ctx.moveTo(120, y); ctx.lineTo(140, y-20); ctx.lineTo(150, y+10); ctx.lineTo(135, y);
    ctx.stroke();
    
    // SMOKE TAIL
    ctx.fillStyle = `rgba(50, 50, 50, ${flickerAlpha*0.4})`;
    for(let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(85, y+45 + i*8, 12 - i*2 + Math.sin(gameState.time*0.2)*3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.restore();
}

// SKULL PIPES
function drawSkullPipe(x, topHeight, pipeColor) {
    ctx.save();
    ctx.shadowColor = '#8b0000';
    ctx.shadowBlur = 25;
    ctx.fillStyle = pipeColor;
    ctx.fillRect(x, 0, gameState.pipeWidth, topHeight);
    ctx.fillRect(x, topHeight + gameState.pipeGap, gameState.pipeWidth, canvas.height - topHeight - gameState.pipeGap);
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💀', x + gameState.pipeWidth/2, topHeight/2);
    ctx.fillText('☠️', x + gameState.pipeWidth/2, topHeight + gameState.pipeGap + 50);
    
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 10, topHeight/2); ctx.lineTo(x + 55, topHeight/2 + 20); ctx.stroke();
    ctx.restore();
}

// BLOOD RAIN
function drawBloodRain() {
    for(let i = gameState.bloodDrips.length - 1; i >= 0; i--) {
        const drip = gameState.bloodDrips[i];
        ctx.fillStyle = '#8b0000';
        ctx.shadowColor = '#8b0000';
        ctx.shadowBlur = 10;
        ctx.fillRect(drip.x, drip.y, drip.size, drip.speed * 5);
        drip.y += drip.speed;
        if(drip.y > canvas.height) gameState.bloodDrips.splice(i, 1);
    }
}

// HORROR BUTTONS
function drawHorrorButton(x, y, width, height, text, hover = false) {
    ctx.save();
    ctx.shadowColor = hover ? '#ff0000' : '#660000';
    ctx.shadowBlur = hover ? 30 : 15;
    
    const gradient = ctx.createRadialGradient(x + width/2, y + height/2, 0, x + width/2, y + height/2, height);
    gradient.addColorStop(0, hover ? '#ff4444' : '#330000');
    gradient.addColorStop(1, hover ? '#8b0000' : '#000');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
    
    ctx.shadowBlur = 0;
    ctx.fillStyle = hover ? '#ffff00' : '#ffaa00';
    ctx.font = `bold ${Math.floor(height * 0.6)}px 'Arial Black'`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 15;
    ctx.fillText(text, x + width/2, y + height/2);
    ctx.restore();
}

function isMouseOverButton(x, y, width, height) {
    return mouseX > x && mouseX < x + width && mouseY > y && mouseY < y + height;
}

function drawHorrorMenu() {
    ctx.fillStyle = 'rgba(0,0,0,0.95)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = `rgba(255,0,0,${Math.sin(gameState.time * 0.1) * 0.3 + 0.7})`;
    ctx.font = 'bold 44px Arial Black';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 50;
    ctx.fillText('🩸 HAUNTED NIGHTMARE 🩸', canvas.width/2, 140);
    
    ctx.font = 'bold 28px Arial Black';
    ctx.fillStyle = '#ff4444';
    ctx.shadowBlur = 20;
    ctx.fillText('Choose Your Doom', canvas.width/2, 220);
    
    const btnWidth = 130, btnHeight = 55;
    const easyHover = isMouseOverButton(40, 320, btnWidth, btnHeight);
    const mediumHover = isMouseOverButton(200, 320, btnWidth, btnHeight);
    const hardHover = isMouseOverButton(360 - btnWidth, 320, btnWidth, btnHeight);
    
    drawHorrorButton(40, 320, btnWidth, btnHeight, '😱 EASY', easyHover);
    drawHorrorButton(200, 320, btnWidth, btnHeight, '💀 MEDIUM', mediumHover);
    drawHorrorButton(360 - btnWidth, 320, btnWidth, btnHeight, '👹 HARD', hardHover);
    
    ctx.shadowBlur = 0;
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#ff6666';
    ctx.fillText('Click to Enter Hell...', canvas.width/2, 420);
}

function drawGameOver() {
    ctx.fillStyle = 'rgba(139,0,0,0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#ff0000';
    ctx.font = 'bold 50px Arial Black';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ff6666';
    ctx.shadowBlur = 60;
    ctx.fillText('💀 GAME OVER 💀', canvas.width/2, 180);
    
    ctx.font = 'bold 36px Arial Black';
    ctx.fillStyle = '#ffff00';
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 30;
    ctx.fillText(`KILLS: ${gameState.score}`, canvas.width/2, 280);
    
    const restartX = 150, restartY = 380, restartW = 100, restartH = 50;
    const restartHover = isMouseOverButton(restartX, restartY, restartW, restartH);
    drawHorrorButton(restartX, restartY, restartW, restartH, '🔄 RESPAWN', restartHover);
    
    ctx.font = 'bold 22px Arial';
    ctx.fillStyle = '#ff9999';
    ctx.shadowBlur = 0;
    ctx.fillText('Click to Suffer Again', canvas.width/2, 480);
}

function updateGame() {
    gameState.velocity += gameState.gravity;
    gameState.ghostY += gameState.velocity;
    
    if (gameState.pipes.length === 0 || gameState.pipes[gameState.pipes.length - 1][0] < 300) {
        let topHeight = Math.random() * 220 + 60;
        gameState.pipes.push([canvas.width + 50, topHeight]);
    }
    
    for (let i = gameState.pipes.length - 1; i >= 0; i--) {
        gameState.pipes[i][0] -= gameState.pipeSpeed;
        if (gameState.pipes[i][0] + gameState.pipeWidth < 0) {
            gameState.pipes.splice(i, 1);
            gameState.score++;
            scoreEl.textContent = gameState.score;
        }
    }
    
    if (gameState.ghostY - 32 < 0 || gameState.ghostY + 32 > canvas.height) {
        gameOver();
    } else {
        for (let pipe of gameState.pipes) {
            if (85 + 32 > pipe[0] && 85 - 32 < pipe[0] + gameState.pipeWidth &&
                (gameState.ghostY - 32 < pipe[1] || gameState.ghostY + 32 > pipe[1] + gameState.pipeGap)) {
                gameOver();
                break;
            }
        }
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    gameState.time++;
    
    if(gameState.time % 3 === 0) createBloodDrip();
    drawBloodRain();
    
    switch(gameState.currentState) {
        case GAME_STATES.MENU: drawHorrorMenu(); break;
        case GAME_STATES.PLAYING: 
            updateGame();
            drawHorrorGhost(gameState.ghostY);
            gameState.pipes.forEach(pipe => drawSkullPipe(pipe[0], pipe[1], levels[currentLevel].color));
            break;
        case GAME_STATES.GAME_OVER: 
            drawHorrorGhost(gameState.ghostY);
            gameState.pipes.forEach(pipe => drawSkullPipe(pipe[0], pipe[1], levels[currentLevel].color));
            drawGameOver();
            break;
    }
    
    requestAnimationFrame(gameLoop);
}

function gameOver() { gameState.currentState = GAME_STATES.GAME_OVER; }

function startGame(level) {
    currentLevel = level;
    const config = levels[level];
    gameState = { currentState: GAME_STATES.PLAYING, ghostY: 300, velocity: 0, flapStrength: -10,
        pipes: [], pipeWidth: 65, score: 0, pipeSpeed: config.pipeSpeed, pipeGap: config.pipeGap, gravity: config.gravity,
        time: 0, flicker: 0, bloodDrips: [] };
    levelEl.textContent = level.toUpperCase();
    scoreEl.textContent = '0';
}

function restartGame() { if(currentLevel) startGame(currentLevel); }

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    
    if (gameState.currentState === GAME_STATES.MENU) {
        if (mouseX > 40 && mouseX < 170 && mouseY > 320 && mouseY < 375) startGame('easy');
        else if (mouseX > 200 && mouseX < 330 && mouseY > 320 && mouseY < 375) startGame('medium');
        else if (mouseX > 230 && mouseX < 360 && mouseY > 320 && mouseY < 375) startGame('hard');
    } else if (gameState.currentState === GAME_STATES.PLAYING) {
        gameState.velocity = gameState.flapStrength;
    } else if (gameState.currentState === GAME_STATES.GAME_OVER) {
        if (mouseX > 150 && mouseX < 250 && mouseY > 380 && mouseY < 430) restartGame();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && gameState.currentState === GAME_STATES.PLAYING) {
        e.preventDefault();
        gameState.velocity = gameState.flapStrength;
    }
});

gameLoop();