(function (global) {
  "use strict";

  var STORAGE_KEY = "operation-cost-v13-remembered-account";
  var MAX_PARTICLES = 3000;
  var EXIT_DURATION_MS = 720;
  var EXIT_TAIL_FADE_MS = 100;
  var REDUCED_EXIT_MS = 160;
  var FALLBACK_MS = 1100;
  var canvas = null;
  var ctx = null;
  var particles = [];
  var cardParticles = [];
  var rafId = 0;
  var width = 0;
  var height = 0;
  var dpr = 1;
  var layerNode = null;
  var exiting = false;
  var exitStart = 0;
  var doneCallback = null;
  var fallbackTimer = 0;
  var reducedMotion = false;

  var metrics = {
    particleCount: 0,
    maxParticles: MAX_PARTICLES,
    canvasCount: 0,
    usesSingleCanvas: true,
    usesRequestAnimationFrame: true,
    usesDomParticles: false,
    rafActive: false,
    destroyCalled: false,
    canvasRemovedAfterExit: false,
    canvasClearedBeforeExit: false,
    canvasHiddenBeforeExit: false,
    canvasClearedAt: 0,
    animationDurationMs: EXIT_DURATION_MS,
    visualTailFadeMs: EXIT_TAIL_FADE_MS,
    lastAnimationDurationMs: 0,
    cardParticleCount: 0,
    totalParticleCount: 0,
    cardBurstPrepared: false,
    reducedMotion: false,
    fallbackUsed: false,
    dprCap: 1.5
  };

  function rememberAccount(username, enabled) {
    try {
      if (!global.localStorage) return;
      if (enabled) {
        global.localStorage.setItem(STORAGE_KEY, String(username || "").trim());
      } else {
        global.localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      // Ignore storage limitations in locked-down browser contexts.
    }
  }

  function rememberedAccount() {
    try {
      return global.localStorage ? global.localStorage.getItem(STORAGE_KEY) || "" : "";
    } catch (error) {
      return "";
    }
  }

  function isReducedMotion() {
    return Boolean(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function particleTargetCount() {
    if (reducedMotion) return 0;
    var area = Math.max(1, width * height);
    return Math.min(2000, Math.max(1050, Math.round(area / 900)));
  }

  function syncParticleMetrics() {
    metrics.particleCount = particles.length;
    metrics.cardParticleCount = cardParticles.length;
    metrics.totalParticleCount = particles.length + cardParticles.length;
  }

  function randomParticle() {
    var angle = Math.random() * Math.PI * 2;
    var distance = Math.random() * Math.max(width, height) * 0.34;
    var centerX = width * (0.46 + (Math.random() - 0.5) * 0.18);
    var centerY = height * (0.48 + (Math.random() - 0.5) * 0.22);
    var x = centerX + Math.cos(angle) * distance;
    var y = centerY + Math.sin(angle) * distance * 0.52;
    return {
      x: x,
      y: y,
      originX: x,
      originY: y,
      vx: (Math.random() - 0.5) * 0.16,
      vy: (Math.random() - 0.5) * 0.14,
      burstX: Math.cos(angle) * (2.4 + Math.random() * 7.2),
      burstY: Math.sin(angle) * (1.6 + Math.random() * 6.4),
      r: 0.55 + Math.random() * 1.35,
      alpha: 0.24 + Math.random() * 0.66,
      phase: Math.random() * Math.PI * 2,
      digit: Math.random() > 0.86 ? (Math.random() > 0.5 ? "1" : "0") : ""
    };
  }

  function resetParticles() {
    var count = particleTargetCount();
    particles = [];
    for (var i = 0; i < count; i += 1) particles.push(randomParticle());
    syncParticleMetrics();
  }

  function cardParticleColor(xRatio, yRatio) {
    if (yRatio > 0.64 && yRatio < 0.74) return "rgba(76,190,255,0.94)";
    if (xRatio < 0.18 && yRatio < 0.22) return "rgba(236,249,255,0.96)";
    if (yRatio < 0.16 || xRatio < 0.08 || xRatio > 0.92) return "rgba(224,244,255,0.88)";
    return Math.random() > 0.5 ? "rgba(135,209,255,0.86)" : "rgba(215,238,255,0.72)";
  }

  function prepareCardBurst() {
    cardParticles = [];
    metrics.cardBurstPrepared = false;
    if (reducedMotion || !layerNode) {
      syncParticleMetrics();
      return;
    }
    var card = layerNode.querySelector(".v1313-login-card");
    if (!card) {
      syncParticleMetrics();
      return;
    }
    var rect = card.getBoundingClientRect();
    var available = Math.max(0, MAX_PARTICLES - particles.length);
    var count = Math.min(900, available);
    var centerX = rect.left + rect.width / 2;
    var centerY = rect.top + rect.height / 2;
    for (var i = 0; i < count; i += 1) {
      var edgeBias = Math.random();
      var xRatio = Math.random();
      var yRatio = Math.random();
      if (edgeBias > 0.74) {
        if (Math.random() > 0.5) xRatio = Math.random() > 0.5 ? Math.random() * 0.08 : 0.92 + Math.random() * 0.08;
        else yRatio = Math.random() > 0.5 ? Math.random() * 0.08 : 0.92 + Math.random() * 0.08;
      }
      var x = rect.left + rect.width * xRatio;
      var y = rect.top + rect.height * yRatio;
      var dx = (x - centerX) / Math.max(1, rect.width / 2);
      var dy = (y - centerY) / Math.max(1, rect.height / 2);
      var angle = Math.atan2(dy + (Math.random() - 0.5) * 0.36, dx + (Math.random() - 0.5) * 0.36);
      var distanceBoost = Math.min(1.8, Math.sqrt(dx * dx + dy * dy));
      var speed = 3.6 + Math.random() * 6.4 + distanceBoost * 2.4;
      cardParticles.push({
        x: x,
        y: y,
        originX: x,
        originY: y,
        burstX: Math.cos(angle) * speed,
        burstY: Math.sin(angle) * speed,
        r: 0.9 + Math.random() * 2.6,
        alpha: 0.58 + Math.random() * 0.42,
        delay: Math.random() * 0.18,
        color: cardParticleColor(xRatio, yRatio),
        streak: Math.random() > 0.7
      });
    }
    metrics.cardBurstPrepared = true;
    syncParticleMetrics();
  }

  function resize() {
    if (!canvas) return;
    reducedMotion = isReducedMotion();
    metrics.reducedMotion = reducedMotion;
    dpr = Math.min(1.5, Math.max(1, global.devicePixelRatio || 1));
    width = Math.max(1, canvas.clientWidth || global.innerWidth || 1366);
    height = Math.max(1, canvas.clientHeight || global.innerHeight || 768);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx = canvas.getContext("2d", { alpha: true });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    resetParticles();
    if (reducedMotion) drawStatic();
  }

  function drawBackground(time) {
    var tail = exitTailOpacity();
    var gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#020815");
    gradient.addColorStop(0.45, "#061a3a");
    gradient.addColorStop(1, "#01040b");
    ctx.save();
    ctx.globalAlpha = tail;
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    var glow = ctx.createRadialGradient(width * 0.34, height * 0.38, 0, width * 0.34, height * 0.38, Math.max(width, height) * 0.55);
    glow.addColorStop(0, "rgba(45,135,255,0.20)");
    glow.addColorStop(0.42, "rgba(34,105,220,0.08)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = 0.15 * tail;
    ctx.strokeStyle = "rgba(111,196,255,0.35)";
    ctx.lineWidth = 1;
    var offset = (time * 0.012) % 64;
    for (var x = -64 + offset; x < width; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (var y = -64 + offset; y < height; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  }

  function exitTailOpacity() {
    if (!exiting) return 1;
    var elapsed = Math.max(0, performance.now() - exitStart);
    var remaining = EXIT_DURATION_MS - elapsed;
    return Math.max(0, Math.min(1, remaining / EXIT_TAIL_FADE_MS));
  }

  function drawConnections(step) {
    ctx.save();
    ctx.globalAlpha = (exiting ? Math.max(0, 0.18 * (1 - step)) : 0.14) * exitTailOpacity();
    ctx.strokeStyle = "rgba(111,200,255,0.42)";
    ctx.lineWidth = 0.7;
    var stride = Math.max(1, Math.floor(particles.length / 160));
    for (var i = 0; i < particles.length; i += stride) {
      var a = particles[i];
      var b = particles[(i + stride * 7) % particles.length];
      if (!a || !b) continue;
      var dx = a.x - b.x;
      var dy = a.y - b.y;
      if (dx * dx + dy * dy > 15000) continue;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawParticles(time, step) {
    ctx.save();
    ctx.font = "11px Consolas, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (var i = 0; i < particles.length; i += 1) {
      var p = particles[i];
      if (exiting) {
        var ease = 1 - Math.pow(1 - step, 3);
        p.x = p.originX + p.burstX * ease * 130;
        p.y = p.originY + p.burstY * ease * 105;
      } else {
        p.x += p.vx + Math.cos(time * 0.0006 + p.phase) * 0.08;
        p.y += p.vy + Math.sin(time * 0.0007 + p.phase) * 0.07;
        if (p.x < -24) p.x = width + 24;
        if (p.x > width + 24) p.x = -24;
        if (p.y < -24) p.y = height + 24;
        if (p.y > height + 24) p.y = -24;
      }
      var alpha = exiting
        ? Math.max(0, p.alpha * (1 - step)) * exitTailOpacity()
        : p.alpha * (0.72 + Math.sin(time * 0.001 + p.phase) * 0.18);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.digit ? "rgba(176,230,255,0.92)" : "rgba(118,202,255,0.92)";
      if (p.digit) {
        ctx.fillText(p.digit, p.x, p.y);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawCardParticles(step) {
    if (!exiting || !cardParticles.length) return;
    ctx.save();
    ctx.lineCap = "round";
    for (var i = 0; i < cardParticles.length; i += 1) {
      var p = cardParticles[i];
      var local = Math.max(0, Math.min(1, (step - p.delay) / Math.max(0.01, 1 - p.delay)));
      var ease = 1 - Math.pow(1 - local, 3);
      var x = p.originX + p.burstX * ease * 54;
      var y = p.originY + p.burstY * ease * 46;
      var alpha = p.alpha * Math.max(0, 1 - local) * exitTailOpacity();
      if (alpha <= 0.01) continue;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(x, y, p.r * (1 + local * 0.35), 0, Math.PI * 2);
      ctx.fill();
      if (p.streak && local > 0.08) {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(0.6, p.r * 0.72);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - p.burstX * 4.8, y - p.burstY * 4.2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function animate(time) {
    if (!canvas || !ctx) return;
    var step = 0;
    if (exiting) {
      step = Math.min(1, (performance.now() - exitStart) / EXIT_DURATION_MS);
    }
    drawBackground(time);
    drawConnections(step);
    drawParticles(time, step);
    drawCardParticles(step);
    if (exiting && step >= 1) {
      finish(false);
      return;
    }
    rafId = global.requestAnimationFrame(animate);
    metrics.rafActive = true;
  }

  function drawStatic() {
    if (!canvas || !ctx) return;
    drawBackground(0);
    metrics.rafActive = false;
  }

  function start() {
    stop();
    if (reducedMotion) {
      drawStatic();
      return;
    }
    rafId = global.requestAnimationFrame(animate);
    metrics.rafActive = true;
  }

  function stop() {
    if (rafId) {
      global.cancelAnimationFrame(rafId);
      rafId = 0;
    }
    metrics.rafActive = false;
  }

  function destroy() {
    stop();
    exiting = false;
    metrics.destroyCalled = true;
    if (fallbackTimer) {
      global.clearTimeout(fallbackTimer);
      fallbackTimer = 0;
    }
    global.removeEventListener("resize", resize);
    clearAndHideCanvas();
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    canvas = null;
    ctx = null;
    particles = [];
    cardParticles = [];
    metrics.particleCount = 0;
    metrics.cardParticleCount = 0;
    metrics.totalParticleCount = 0;
    metrics.canvasCount = 0;
    metrics.canvasRemovedAfterExit = !document.querySelector(".v1313-particle-canvas");
    document.body.classList.remove("v1313-login-active", "v1313-login-exiting");
  }

  function clearAndHideCanvas() {
    if (!canvas) return;
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width || 0, canvas.height || 0);
    }
    canvas.style.opacity = "0";
    canvas.style.display = "none";
    metrics.canvasClearedBeforeExit = true;
    metrics.canvasHiddenBeforeExit = true;
    metrics.canvasClearedAt = performance.now();
  }

  function finish(fallback) {
    var callback = doneCallback;
    doneCallback = null;
    metrics.fallbackUsed = Boolean(fallback);
    metrics.lastAnimationDurationMs = Math.round(performance.now() - exitStart);
    clearAndHideCanvas();
    destroy();
    if (typeof callback === "function") callback();
  }

  function mount(layer) {
    layerNode = layer || layerNode;
    if (!layerNode) return metrics;
    destroy();
    document.body.classList.add("v1313-login-active");
    document.body.classList.remove("v1313-login-exiting");
    canvas = document.createElement("canvas");
    canvas.className = "v1313-particle-canvas";
    canvas.setAttribute("aria-hidden", "true");
    var screen = layerNode.querySelector(".v13-auth-screen");
    if (screen) screen.prepend(canvas);
    reducedMotion = isReducedMotion();
    metrics.reducedMotion = reducedMotion;
    metrics.destroyCalled = false;
    metrics.canvasRemovedAfterExit = false;
    metrics.canvasCount = 1;
    global.addEventListener("resize", resize);
    resize();
    start();
    return metrics;
  }

  function playSuccess(callback) {
    doneCallback = callback;
    exitStart = performance.now();
    exiting = true;
    prepareCardBurst();
    document.body.classList.add("v1313-login-exiting");
    metrics.animationDurationMs = reducedMotion ? REDUCED_EXIT_MS : EXIT_DURATION_MS;
    fallbackTimer = global.setTimeout(function () {
      if (doneCallback) finish(true);
    }, FALLBACK_MS);
    if (reducedMotion) {
      global.setTimeout(function () {
        if (doneCallback) finish(false);
      }, REDUCED_EXIT_MS);
      return;
    }
    start();
  }

  global.__V1313_PARTICLE_METRICS = metrics;
  global.V1313LoginParticle = {
    mount: mount,
    playSuccess: playSuccess,
    destroy: destroy,
    metrics: metrics,
    rememberAccount: rememberAccount,
    rememberedAccount: rememberedAccount,
    isRemembered: function () { return Boolean(rememberedAccount()); }
  };
})(typeof window !== "undefined" ? window : globalThis);
