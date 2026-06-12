(function () {
  var KONAMI = [
    "ArrowUp",
    "ArrowUp",
    "ArrowDown",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ArrowLeft",
    "ArrowRight",
    "KeyB",
    "KeyA",
  ];
  var konamiIndex = 0;
  var overlay = null;
  var running = false;
  var rafId = 0;
  var score = 0;
  var lives = 3;
  var timeLeft = 45;
  var timerId = 0;
  var paddleX = 0;
  var paddleW = 72;
  var items = [];
  var keys = { left: false, right: false };
  var canvas = null;
  var ctx = null;
  var width = 0;
  var height = 0;
  var spawnId = 0;
  var highScoreKey = "blog-secret-game-high";

  var fallingTypes = [
    { emoji: "📄", points: 10, bad: false },
    { emoji: "💬", points: 5, bad: false },
    { emoji: "⭐", points: 15, bad: false },
    { emoji: "🗑️", points: -15, bad: true },
  ];

  function getHighScore() {
    return Number(localStorage.getItem(highScoreKey) || 0);
  }

  function setHighScore(value) {
    localStorage.setItem(highScoreKey, String(value));
  }

  function buildOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = "secret-game-overlay";
    overlay.className = "secret-game-overlay";
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="secret-game-modal" role="dialog" aria-modal="true" aria-label="Secret minigame">' +
      '  <header class="secret-game-header">' +
      '    <h2>📬 Post Catcher</h2>' +
      '    <button type="button" class="secret-game-close" aria-label="Close game">&times;</button>' +
      "  </header>" +
      '  <p class="secret-game-hint">Catch posts &amp; stars. Avoid trash. Arrow keys or drag to move.</p>' +
      '  <div class="secret-game-stats">' +
      '    <span id="sg-score">Score: 0</span>' +
      '    <span id="sg-lives">Lives: 3</span>' +
      '    <span id="sg-time">Time: 45</span>' +
      '    <span id="sg-best">Best: ' +
      getHighScore() +
      "</span>" +
      "  </div>" +
      '  <canvas id="secret-game-canvas" width="480" height="360" aria-label="Post Catcher play area"></canvas>' +
      '  <div id="secret-game-message" class="secret-game-message"></div>' +
      '  <button type="button" id="secret-game-restart" class="btn btn-primary secret-game-restart">Play again</button>' +
      "</div>";
    document.body.appendChild(overlay);

    overlay.querySelector(".secret-game-close").addEventListener("click", closeGame);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeGame();
    });
    overlay.querySelector("#secret-game-restart").addEventListener("click", startGame);

    canvas = overlay.querySelector("#secret-game-canvas");
    ctx = canvas.getContext("2d");
    resizeCanvas();

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerUp);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("resize", resizeCanvas);

    return overlay;
  }

  function resizeCanvas() {
    if (!canvas) return;
    var rect = canvas.getBoundingClientRect();
    width = canvas.width;
    height = canvas.height;
    paddleX = width / 2 - paddleW / 2;
  }

  var dragging = false;

  function onPointerDown(e) {
    dragging = true;
    movePaddleTo(e.offsetX);
  }

  function onPointerMove(e) {
    if (dragging) movePaddleTo(e.offsetX);
  }

  function onPointerUp() {
    dragging = false;
  }

  function movePaddleTo(x) {
    paddleX = Math.max(0, Math.min(width - paddleW, x - paddleW / 2));
  }

  function onKeyDown(e) {
    if (!running) return;
    if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = true;
    if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = true;
  }

  function onKeyUp(e) {
    if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = false;
    if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = false;
  }

  function updateStats() {
    var scoreEl = overlay.querySelector("#sg-score");
    var livesEl = overlay.querySelector("#sg-lives");
    var timeEl = overlay.querySelector("#sg-time");
    var bestEl = overlay.querySelector("#sg-best");
    if (scoreEl) scoreEl.textContent = "Score: " + score;
    if (livesEl) livesEl.textContent = "Lives: " + lives;
    if (timeEl) timeEl.textContent = "Time: " + timeLeft;
    if (bestEl) bestEl.textContent = "Best: " + getHighScore();
  }

  function setMessage(text) {
    var msg = overlay.querySelector("#secret-game-message");
    if (msg) msg.textContent = text;
  }

  function spawnItem() {
    var type = fallingTypes[Math.floor(Math.random() * fallingTypes.length)];
    items.push({
      x: 24 + Math.random() * (width - 48),
      y: -24,
      speed: 1.6 + Math.random() * 2.2,
      size: 28,
      type: type,
    });
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "rgba(0,0,0,0.04)";
    for (var i = 0; i < height; i += 24) {
      ctx.fillRect(0, i, width, 1);
    }

    items.forEach(function (item) {
      ctx.font = item.size + "px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(item.type.emoji, item.x, item.y);
    });

    ctx.fillStyle = getComputedStyle(document.documentElement)
      .getPropertyValue("--accent")
      .trim() || "#4f6ef7";
    var paddleY = height - 18;
    ctx.beginPath();
    ctx.roundRect(paddleX, paddleY, paddleW, 12, 6);
    ctx.fill();
  }

  function tick() {
    if (!running) return;

    var speed = 5;
    if (keys.left) paddleX -= speed;
    if (keys.right) paddleX += speed;
    paddleX = Math.max(0, Math.min(width - paddleW, paddleX));

    items.forEach(function (item) {
      item.y += item.speed;
    });

    var paddleY = height - 18;
    var remaining = [];
    items.forEach(function (item) {
      var caught =
        item.y + item.size / 2 >= paddleY &&
        item.y - item.size / 2 <= paddleY + 12 &&
        item.x >= paddleX &&
        item.x <= paddleX + paddleW;

      if (caught) {
        score += item.type.points;
        if (item.type.bad) lives -= 1;
        updateStats();
        return;
      }

      if (item.y - item.size / 2 > height) {
        if (!item.type.bad) lives -= 1;
        updateStats();
        return;
      }

      remaining.push(item);
    });
    items = remaining;

    if (lives <= 0) {
      endGame("Out of lives!");
      return;
    }

    draw();
    rafId = requestAnimationFrame(tick);
  }

  function startGame() {
    running = true;
    score = 0;
    lives = 3;
    timeLeft = 45;
    items = [];
    paddleX = width / 2 - paddleW / 2;
    keys.left = false;
    keys.right = false;
    setMessage("");
    updateStats();
    draw();

    clearInterval(spawnId);
    clearInterval(timerId);
    cancelAnimationFrame(rafId);

    spawnId = setInterval(spawnItem, 850);
    timerId = setInterval(function () {
      timeLeft -= 1;
      updateStats();
      if (timeLeft <= 0) endGame("Time's up!");
    }, 1000);

    rafId = requestAnimationFrame(tick);
  }

  function endGame(reason) {
    running = false;
    clearInterval(spawnId);
    clearInterval(timerId);
    cancelAnimationFrame(rafId);

    if (score > getHighScore()) setHighScore(score);
    updateStats();
    setMessage(reason + " Final score: " + score + ".");
    draw();
  }

  function openGame() {
    buildOverlay();
    overlay.hidden = false;
    document.body.classList.add("secret-game-open");
    startGame();
  }

  function closeGame() {
    running = false;
    clearInterval(spawnId);
    clearInterval(timerId);
    cancelAnimationFrame(rafId);
    if (overlay) overlay.hidden = true;
    document.body.classList.remove("secret-game-open");
  }

  function onKonamiKey(e) {
    if (overlay && !overlay.hidden) return;
    if (e.code === KONAMI[konamiIndex]) {
      konamiIndex += 1;
      if (konamiIndex === KONAMI.length) {
        konamiIndex = 0;
        openGame();
      }
    } else {
      konamiIndex = e.code === KONAMI[0] ? 1 : 0;
    }
  }

  document.addEventListener("keydown", onKonamiKey);

  document.addEventListener("DOMContentLoaded", function () {
    var toggle = document.getElementById("hint-toggle");
    var panel = document.getElementById("easter-egg-hints");
    if (!toggle || !panel) return;

    toggle.addEventListener("click", function () {
      var open = panel.hidden;
      panel.hidden = !open;
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.textContent = open ? "🎮 Hide hint" : "🎮 Hidden surprise?";
    });
  });
})();
