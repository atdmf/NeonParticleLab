const canvas = document.querySelector("#field");
const ctx = canvas.getContext("2d");
const stats = document.querySelector("#stats");
const density = document.querySelector("#density");
const energy = document.querySelector("#energy");
const shuffle = document.querySelector("#shuffle");
const freeze = document.querySelector("#freeze");
const modeButtons = [...document.querySelectorAll("[data-mode]")];

const palettes = [
  ["#38f6c8", "#ffcf5a", "#ff5c8a", "#8ee8ff"],
  ["#7cff6b", "#f7f052", "#ff7b54", "#f9f7f3"],
  ["#65d6ff", "#f8f4a6", "#f25f5c", "#b8f2e6"],
  ["#ff8fab", "#fbff12", "#41ead4", "#f7f7ff"]
];

let width = 0;
let height = 0;
let dpr = 1;
let particles = [];
let mode = "orbit";
let palette = palettes[0];
let paused = false;
let pointer = { x: 0, y: 0, active: false };
let lastTime = performance.now();

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  pointer.x = width * 0.58;
  pointer.y = height * 0.48;
  createParticles();
}

function createParticles() {
  const count = Number(density.value);
  particles = Array.from({ length: count }, (_, index) => {
    const angle = Math.random() * Math.PI * 2;
    const radius = 40 + Math.random() * Math.min(width, height) * 0.42;
    return {
      x: width / 2 + Math.cos(angle) * radius,
      y: height / 2 + Math.sin(angle) * radius,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: 0.8 + Math.random() * 2.4,
      hue: index % palette.length,
      phase: Math.random() * Math.PI * 2
    };
  });
  stats.textContent = `${count} particles`;
}

function drawBackground() {
  ctx.fillStyle = "rgba(8, 16, 15, 0.18)";
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, Math.max(width, height) * 0.42);
  glow.addColorStop(0, "rgba(56, 246, 200, 0.12)");
  glow.addColorStop(0.45, "rgba(255, 207, 90, 0.04)");
  glow.addColorStop(1, "rgba(8, 16, 15, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
}

function updateParticle(p, dt, index) {
  const dx = pointer.x - p.x;
  const dy = pointer.y - p.y;
  const dist = Math.hypot(dx, dy) || 1;
  const force = Number(energy.value) / 9000;
  const wave = Math.sin(performance.now() * 0.0015 + p.phase);

  if (mode === "orbit") {
    p.vx += (-dy / dist) * force * 7 + dx * force * 0.5;
    p.vy += (dx / dist) * force * 7 + dy * force * 0.5;
  }

  if (mode === "flow") {
    p.vx += Math.cos((p.y + index) * 0.008 + wave) * force * 5;
    p.vy += Math.sin((p.x - index) * 0.008 - wave) * force * 5;
  }

  if (mode === "burst") {
    p.vx -= (dx / dist) * force * 14;
    p.vy -= (dy / dist) * force * 14;
  }

  p.vx *= 0.985;
  p.vy *= 0.985;
  p.x += p.vx * dt;
  p.y += p.vy * dt;

  if (p.x < -20) p.x = width + 20;
  if (p.x > width + 20) p.x = -20;
  if (p.y < -20) p.y = height + 20;
  if (p.y > height + 20) p.y = -20;
}

function drawParticle(p) {
  ctx.beginPath();
  ctx.fillStyle = palette[p.hue];
  ctx.shadowColor = palette[p.hue];
  ctx.shadowBlur = 16;
  ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
  ctx.fill();
}

function drawLinks() {
  ctx.shadowBlur = 0;
  for (let i = 0; i < particles.length; i += 1) {
    const a = particles[i];
    for (let j = i + 1; j < Math.min(i + 8, particles.length); j += 1) {
      const b = particles[j];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist > 92) continue;
      ctx.globalAlpha = (1 - dist / 92) * 0.22;
      ctx.strokeStyle = palette[a.hue];
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

function frame(now) {
  const dt = Math.min((now - lastTime) / 16.67, 2);
  lastTime = now;

  if (!paused) {
    drawBackground();
    particles.forEach((particle, index) => {
      updateParticle(particle, dt, index);
      drawParticle(particle);
    });
    drawLinks();
  }

  requestAnimationFrame(frame);
}

window.addEventListener("resize", resize);
window.addEventListener("pointermove", (event) => {
  pointer = { x: event.clientX, y: event.clientY, active: true };
});
window.addEventListener("pointerleave", () => {
  pointer.active = false;
});

density.addEventListener("input", createParticles);

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    mode = button.dataset.mode;
    modeButtons.forEach((item) => item.classList.toggle("active", item === button));
  });
});

shuffle.addEventListener("click", () => {
  const currentIndex = palettes.indexOf(palette);
  palette = palettes[(currentIndex + 1) % palettes.length];
  document.documentElement.style.setProperty("--accent", palette[0]);
  document.documentElement.style.setProperty("--accent-2", palette[1]);
  document.documentElement.style.setProperty("--accent-3", palette[2]);
  particles.forEach((particle, index) => {
    particle.hue = index % palette.length;
  });
});

freeze.addEventListener("click", () => {
  paused = !paused;
  freeze.textContent = paused ? "▶" : "Ⅱ";
  freeze.setAttribute("aria-label", paused ? "Resume animation" : "Pause animation");
  freeze.setAttribute("title", paused ? "Resume animation" : "Pause animation");
});

resize();
requestAnimationFrame(frame);
