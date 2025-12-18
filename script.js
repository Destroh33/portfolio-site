const yearSpan = document.getElementById("year");
if (yearSpan) yearSpan.textContent = String(new Date().getFullYear());

const revealElements = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window && revealElements.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.15 }
  );
  revealElements.forEach((el) => observer.observe(el));
} else {
  revealElements.forEach((el) => el.classList.add("visible"));
}

(() => {
  const canvas = document.getElementById("bg-fx");
  if (!canvas) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isSmall = window.matchMedia("(max-width: 640px)").matches;

  const ctx = canvas.getContext("2d", { alpha: true });
  let w = 0, h = 0, dpr = 1;

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  const MAX_PARTICLES = reduceMotion ? 0 : (isSmall ? 90 : 190);

  const particles = [];
  const ripples = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(1, window.innerWidth);
    h = Math.max(1, window.innerHeight);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function initParticles() {
    particles.length = 0;
    const triesPer = 20;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const isGlow = Math.random() < 0.42;
      const r = isGlow ? rand(2.0, 3.8) : rand(1.2, 2.6);
      const m = r * r;

      let x = rand(r, w - r);
      let y = rand(r, h - r);

      for (let t = 0; t < triesPer; t++) {
        let ok = true;
        for (let j = 0; j < particles.length; j++) {
          const p = particles[j];
          const dx = x - p.x;
          const dy = y - p.y;
          const d2 = dx * dx + dy * dy;
          const min = (r + p.r) * 1.1;
          if (d2 < min * min) {
            ok = false;
            x = rand(r, w - r);
            y = rand(r, h - r);
            break;
          }
        }
        if (ok) break;
      }

      const speed = isGlow ? rand(18, 42) : rand(16, 36);
      const ang = rand(0, Math.PI * 2);

      particles.push({
        x,
        y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        r,
        m,
        hue: rand(165, 290),
        a: isGlow ? rand(0.38, 0.62) : rand(0.28, 0.50),
        glow: isGlow ? rand(10, 22) : rand(6, 14)
      });
    }
  }

  function addRipple(x, y) {
    if (reduceMotion) return;
    ripples.push({
      x,
      y,
      r: 0,
      speed: 260,
      width: 2.6,
      life: 0,
      lifeMax: 1.35,
      strength: 420,
      band: 150
    });
  }

  function onPointerDown(e) {
    addRipple(e.clientX, e.clientY);
  }

  function bounceEdges(p) {
    const pad = 0.5;
    if (p.x - p.r < 0) {
      p.x = p.r + pad;
      p.vx = Math.abs(p.vx);
    } else if (p.x + p.r > w) {
      p.x = w - p.r - pad;
      p.vx = -Math.abs(p.vx);
    }

    if (p.y - p.r < 0) {
      p.y = p.r + pad;
      p.vy = Math.abs(p.vy);
    } else if (p.y + p.r > h) {
      p.y = h - p.r - pad;
      p.vy = -Math.abs(p.vy);
    }
  }

  function resolveCollision(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist2 = dx * dx + dy * dy;
    const minDist = a.r + b.r;

    if (dist2 <= 0) return;
    if (dist2 > minDist * minDist) return;

    const dist = Math.sqrt(dist2);
    const nx = dx / dist;
    const ny = dy / dist;

    const overlap = (minDist - dist) + 0.01;
    const totalM = a.m + b.m;

    a.x -= nx * overlap * (b.m / totalM);
    a.y -= ny * overlap * (b.m / totalM);
    b.x += nx * overlap * (a.m / totalM);
    b.y += ny * overlap * (a.m / totalM);

    const rvx = b.vx - a.vx;
    const rvy = b.vy - a.vy;
    const velAlongNormal = rvx * nx + rvy * ny;
    if (velAlongNormal > 0) return;

    const restitution = 0.98;
    const j = -(1 + restitution) * velAlongNormal / (1 / a.m + 1 / b.m);

    const ix = j * nx;
    const iy = j * ny;

    a.vx -= ix / a.m;
    a.vy -= iy / a.m;
    b.vx += ix / b.m;
    b.vy += iy / b.m;
  }

  function step(dt) {
    const drag = 0.9992;

    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      bounceEdges(p);
    }

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        resolveCollision(particles[i], particles[j]);
      }
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.life += dt;
      r.r += r.speed * dt;

      const t = r.life / r.lifeMax;
      const falloff = 1 - t;
      const push = r.strength * Math.max(0, falloff);

      for (const p of particles) {
        const dx = p.x - r.x;
        const dy = p.y - r.y;
        const dist = Math.hypot(dx, dy) || 0.0001;

        const band = Math.abs(dist - r.r);
        if (band > r.band) continue;

        const x01 = 1 - clamp(band / r.band, 0, 1);
        const influence = (x01 * x01) * push;

        const nx = dx / dist;
        const ny = dy / dist;

        p.vx += nx * influence * 0.0018;
        p.vy += ny * influence * 0.0018;
      }

      if (r.life >= r.lifeMax) ripples.splice(i, 1);
    }

    for (const p of particles) {
      p.vx *= drag;
      p.vy *= drag;

      const sp = Math.hypot(p.vx, p.vy);
      const minSpeed = 18;
      const maxSpeed = 140;

      if (sp < minSpeed) {
        const ang = Math.random() * Math.PI * 2;
        const boost = (minSpeed - sp) * 0.06;
        p.vx += Math.cos(ang) * boost;
        p.vy += Math.sin(ang) * boost;
      }

      if (sp > maxSpeed) {
        const s = maxSpeed / sp;
        p.vx *= s;
        p.vy *= s;
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (const r of ripples) {
      const t = Math.min(r.life / r.lifeMax, 1);
      const alpha = 0.45 * (1 - t);

      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(124, 231, 214, ${alpha})`;
      ctx.lineWidth = r.width;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r * 0.985, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(167, 139, 250, ${alpha * 0.8})`;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r * 1.02, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 184, 107, ${alpha * 0.35})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + p.glow, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 100%, 72%, ${p.a * 0.35})`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 0.95, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 100%, 86%, ${p.a})`;
      ctx.fill();
    }

    ctx.restore();
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.033);
    last = now;

    if (MAX_PARTICLES > 0) {
      step(dt);
      draw();
    }

    requestAnimationFrame(loop);
  }

  resize();
  initParticles();

  window.addEventListener(
    "resize",
    () => {
      resize();
      initParticles();
    },
    { passive: true }
  );

  window.addEventListener("pointerdown", onPointerDown, { passive: true });

  requestAnimationFrame(loop);
})();
