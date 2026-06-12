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

  var ITEM_TYPES = [
    { id: "post", emoji: "\uD83D\uDCC4", label: "Post", points: 10, bad: false, weight: 5 },
    { id: "star", emoji: "\u2B50", label: "Star", points: 15, bad: false, weight: 3 },
    { id: "trash", emoji: "\uD83D\uDDD1\uFE0F", label: "Trash", points: -15, bad: true, weight: 2 },
  ];

  var ARENA_W = 480;
  var ARENA_H = 360;
  var PLAYER_W = 104;
  var PLAYER_H = 32;
  var PLAYER_BOTTOM = 14;
  var HIGH_SCORE_KEY = "blog-secret-game-high";

  var konamiIndex = 0;
  var overlay = null;
  var arena = null;
  var player = null;
  var running = false;
  var rafId = 0;
  var spawnId = 0;
  var timerId = 0;
  var score = 0;
  var lives = 3;
  var timeLeft = 45;
  var combo = 0;
  var playerX = 0;
  var items = [];
  var keys = { left: false, right: false };
  var dragging = false;
  var flashTimer = 0;
  var flashClass = "";

  function getHighScore() {
    return Number(localStorage.getItem(HIGH_SCORE_KEY) || 0);
  }

  function setHighScore(value) {
    localStorage.setItem(HIGH_SCORE_KEY, String(value));
  }

  function pickItemType() {
    var total = 0;
    var i;
    for (i = 0; i < ITEM_TYPES.length; i += 1) total += ITEM_TYPES[i].weight;
    var roll = Math.random() * total;
    for (i = 0; i < ITEM_TYPES.length; i += 1) {
      roll -= ITEM_TYPES[i].weight;
      if (roll <= 0) return ITEM_TYPES[i];
    }
    return ITEM_TYPES[0];
  }

  function buildOverlay() {
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "secret-game-overlay";
    overlay.className = "secret-game-overlay";
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="secret-game-modal" role="dialog" aria-modal="true" aria-label="Post Catcher minigame">' +
      '  <header class="secret-game-header">' +
      "    <h2>\uD83D\uDCEC Post Catcher</h2>" +
      '    <button type="button" class="secret-game-close" aria-label="Close game">&times;</button>' +
      "  </header>" +
      '  <div class="secret-game-stats">' +
      '    <span id="sg-score">Score: 0</span>' +
      '    <span id="sg-lives">Lives: 3</span>' +
      '    <span id="sg-time">Time: 45</span>' +
      '    <span id="sg-combo">Combo: x1</span>' +
      '    <span id="sg-best">Best: ' +
      getHighScore() +
      "</span>" +
      "  </div>" +
      '  <div id="secret-game-arena" class="secret-game-arena" aria-label="Post Catcher play area">' +
      '    <div class="sg-arena-bg" aria-hidden="true"></div>' +
      '    <div id="sg-player" class="sg-player">' +
      '      <span class="sg-player-label">Catcher</span>' +
      "    </div>" +
      "  </div>" +
      '  <div id="secret-game-message" class="secret-game-message"></div>' +
      '  <button type="button" id="secret-game-restart" class="btn btn-primary secret-game-restart">Play again</button>' +
      "</div>";
    document.body.appendChild(overlay);

    arena = overlay.querySelector("#secret-game-arena");
    player = overlay.querySelector("#sg-player");

    overlay.querySelector(".secret-game-close").addEventListener("click", closeGame);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeGame();
    });
    overlay.querySelector("#secret-game-restart").addEventListener("click", startGame);

    arena.addEventListener("pointerdown", onPointerDown);
    arena.addEventListener("pointermove", onPointerMove);
    arena.addEventListener("pointerup", onPointerUp);
    arena.addEventListener("pointerleave", onPointerUp);
    arena.addEventListener("pointercancel", onPointerUp);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return overlay;
  }

  function playerY() {
    return ARENA_H - PLAYER_BOTTOM - PLAYER_H;
  }

  function movePlayerTo(x) {
    playerX = Math.max(0, Math.min(ARENA_W - PLAYER_W, x - PLAYER_W / 2));
    player.style.transform = "translateX(" + playerX + "px)";
  }

  function onPointerDown(e) {
    if (!running) return;
    dragging = true;
    arena.setPointerCapture(e.pointerId);
    movePlayerTo(e.offsetX);
  }

  function onPointerMove(e) {
    if (!running || !dragging) return;
    movePlayerTo(e.offsetX);
  }

  function onPointerUp() {
    dragging = false;
  }

  function onKeyDown(e) {
    if (overlay && !overlay.hidden) {
      if (e.code === "Escape") {
        closeGame();
        return;
      }
      if (!running) return;
      if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = true;
      if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = true;
      return;
    }
  }

  function onKeyUp(e) {
    if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = false;
    if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = false;
  }

  function updateStats() {
    var scoreEl = overlay.querySelector("#sg-score");
    var livesEl = overlay.querySelector("#sg-lives");
    var timeEl = overlay.querySelector("#sg-time");
    var comboEl = overlay.querySelector("#sg-combo");
    var bestEl = overlay.querySelector("#sg-best");
    var multiplier = 1 + Math.floor(combo / 3);
    if (scoreEl) scoreEl.textContent = "Score: " + score;
    if (livesEl) livesEl.textContent = "Lives: " + lives;
    if (timeEl) timeEl.textContent = "Time: " + timeLeft;
    if (comboEl) comboEl.textContent = "Combo: x" + multiplier;
    if (bestEl) bestEl.textContent = "Best: " + getHighScore();
  }

  function setMessage(text) {
    var msg = overlay.querySelector("#secret-game-message");
    if (msg) msg.textContent = text;
  }

  function flashPlayer(kind) {
    flashClass = kind;
    player.classList.remove("sg-player-good", "sg-player-bad");
    player.classList.add(kind === "good" ? "sg-player-good" : "sg-player-bad");
    flashTimer = 12;
  }

  function spawnItem() {
    if (!running) return;
    var type = pickItemType();
    var el = document.createElement("div");
    el.className = "sg-item sg-item-" + type.id;
    el.innerHTML =
      '<span class="sg-item-emoji" aria-hidden="true">' +
      type.emoji +
      '</span><span class="sg-item-label">' +
      type.label +
      "</span><span class=\"sg-item-points\">" +
      (type.bad ? type.points : "+" + type.points) +
      "</span>";
    arena.appendChild(el);

    var itemW = el.offsetWidth;
    var maxX = ARENA_W - itemW - 8;
    items.push({
      el: el,
      type: type,
      x: 8 + Math.random() * Math.max(8, maxX),
      y: -el.offsetHeight - 4,
      w: itemW,
      h: el.offsetHeight,
      speed: 1.3 + Math.random() * 1.2,
    });
  }

  function removeItem(item) {
    if (item.el && item.el.parentNode) item.el.parentNode.removeChild(item.el);
  }

  function showFloatText(x, text, kind) {
    var el = document.createElement("span");
    el.className = "sg-float sg-float-" + kind;
    el.textContent = text;
    el.style.left = x + "px";
    el.style.top = playerY() - 18 + "px";
    arena.appendChild(el);
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 700);
  }

  function rectsOverlap(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  function tick() {
    if (!running) return;

    if (keys.left) movePlayerTo(playerX + PLAYER_W / 2 - 6);
    if (keys.right) movePlayerTo(playerX + PLAYER_W / 2 + 6);

    if (flashTimer > 0) {
      flashTimer -= 1;
      if (flashTimer === 0) {
        player.classList.remove("sg-player-good", "sg-player-bad");
      }
    }

    var paddle = {
      x: playerX,
      y: playerY(),
      w: PLAYER_W,
      h: PLAYER_H,
    };

    var remaining = [];
    items.forEach(function (item) {
      item.y += item.speed;
      item.el.style.transform = "translate(" + item.x + "px," + item.y + "px)";

      var box = { x: item.x, y: item.y, w: item.w, h: item.h };
      var caught = rectsOverlap(box, paddle);

      if (caught) {
        if (item.type.bad) {
          combo = 0;
          lives -= 1;
          score = Math.max(0, score + item.type.points);
          flashPlayer("bad");
          showFloatText(item.x + item.w / 2, String(item.type.points), "bad");
        } else {
          combo += 1;
          var multiplier = 1 + Math.floor(combo / 3);
          var gained = item.type.points * multiplier;
          score += gained;
          flashPlayer("good");
          showFloatText(item.x + item.w / 2, "+" + gained, "good");
        }
        removeItem(item);
        updateStats();
        return;
      }

      if (item.y > ARENA_H) {
        if (!item.type.bad) {
          combo = 0;
          lives -= 1;
          updateStats();
        }
        removeItem(item);
        return;
      }

      remaining.push(item);
    });
    items = remaining;

    if (lives <= 0) {
      endGame("Out of lives!");
      return;
    }

    rafId = requestAnimationFrame(tick);
  }

  function clearItems() {
    items.forEach(removeItem);
    items = [];
    arena.querySelectorAll(".sg-float").forEach(function (el) {
      el.parentNode.removeChild(el);
    });
  }

  function startGame() {
    running = true;
    score = 0;
    lives = 3;
    combo = 0;
    timeLeft = 45;
    keys.left = false;
    keys.right = false;
    dragging = false;
    flashTimer = 0;
    clearItems();
    playerX = ARENA_W / 2 - PLAYER_W / 2;
    player.style.transform = "translateX(" + playerX + "px)";
    player.classList.remove("sg-player-good", "sg-player-bad");
    setMessage("");
    updateStats();

    clearInterval(spawnId);
    clearInterval(timerId);
    cancelAnimationFrame(rafId);

    spawnItem();
    spawnId = setInterval(spawnItem, 900);
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
    clearItems();
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
      toggle.textContent = open ? "\uD83C\uDFAE Hide hint" : "\uD83C\uDFAE Hidden surprise?";
    });
  });
})();
