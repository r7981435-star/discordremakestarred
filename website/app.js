// --- Sound Synthesizer (Zero asset dependency) ---
class AudioController {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  playPop() {
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }
}

const audio = new AudioController();

// --- Particle Background Canvas ---
function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];
  const particleCount = 45;
  const colors = ['#f43f5e', '#ec4899', '#a855f7', '#f59e0b', '#38bdf8'];

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2.5 + 1,
      speedY: -(Math.random() * 0.6 + 0.2),
      speedX: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.6 + 0.2,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    particles.forEach((p) => {
      p.y += p.speedY;
      p.x += p.speedX;

      if (p.y < 0) {
        p.y = height + 10;
        p.x = Math.random() * width;
      }
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;

      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    requestAnimationFrame(render);
  }

  render();
}

// --- Copy Server IP Functionality ---
const SERVER_IP = 'notdonutsmp.sadhost.com';

function setupCopyIP() {
  const ipTriggers = document.querySelectorAll('.copy-ip-trigger');
  const toast = document.getElementById('toast');

  ipTriggers.forEach((trigger) => {
    trigger.addEventListener('click', async (e) => {
      e.preventDefault();
      audio.playPop();

      try {
        await navigator.clipboard.writeText(SERVER_IP);
      } catch (err) {
        const tempInput = document.createElement('input');
        tempInput.value = SERVER_IP;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
      }

      showToast(`Copied ${SERVER_IP} to clipboard!`);
    });
  });

  function showToast(message) {
    if (!toast) return;
    toast.querySelector('.toast-msg').textContent = message;
    toast.classList.add('show');

    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }
}

// --- Live Server Status & Player Counter ---
async function fetchServerStatus() {
  const counterEl = document.getElementById('player-count');
  const liveCountBadge = document.getElementById('nav-player-count');
  const pulseDot = document.querySelector('.pulse-dot');
  const serverBadge = document.querySelector('.server-badge');

  try {
    let data = null;

    // 1. Try local server backend API route
    try {
      const res = await fetch('/api/status');
      if (res.ok) data = await res.json();
    } catch (e) {
      // Backend route unreachable, fallback to direct API
    }

    // 2. Direct public API fallback if needed
    if (!data || typeof data.online === 'undefined') {
      try {
        const res = await fetch(`https://api.mcsrvstat.us/3/${SERVER_IP}`);
        if (res.ok) data = await res.json();
      } catch (e) {
        const resFallback = await fetch(`https://api.mcstatus.io/v2/status/java/${SERVER_IP}`);
        if (resFallback.ok) data = await resFallback.json();
      }
    }

    if (data && data.online) {
      const onlinePlayers = data.players?.online ?? 0;
      const formatted = onlinePlayers.toLocaleString();

      if (counterEl) counterEl.textContent = formatted;
      if (liveCountBadge) liveCountBadge.textContent = `${formatted} Online`;
      if (pulseDot) {
        pulseDot.style.backgroundColor = '#10b981';
        pulseDot.style.boxShadow = '0 0 10px #10b981';
      }
      if (serverBadge) {
        serverBadge.style.color = '#34d399';
        serverBadge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        serverBadge.style.backgroundColor = 'rgba(16, 185, 129, 0.12)';
      }
    } else {
      // Server currently offline or resolving
      if (counterEl) counterEl.textContent = '0';
      if (liveCountBadge) liveCountBadge.textContent = 'Offline';
      if (pulseDot) {
        pulseDot.style.backgroundColor = '#ef4444';
        pulseDot.style.boxShadow = '0 0 10px #ef4444';
      }
      if (serverBadge) {
        serverBadge.style.color = '#f87171';
        serverBadge.style.borderColor = 'rgba(239, 68, 68, 0.3)';
        serverBadge.style.backgroundColor = 'rgba(239, 68, 68, 0.12)';
      }
    }
  } catch (err) {
    console.warn('Failed to query Minecraft server status:', err);
  }
}

function setupPlayerCounter() {
  fetchServerStatus();
  // Poll every 15 seconds for live status
  setInterval(fetchServerStatus, 15000);
}

// --- FAQ Accordion ---
function setupFAQ() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach((item) => {
    const questionBtn = item.querySelector('.faq-question');
    questionBtn.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      faqItems.forEach((other) => other.classList.remove('active'));

      if (!isActive) {
        item.classList.add('active');
        audio.playPop();
      }
    });
  });
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  setupCopyIP();
  setupPlayerCounter();
  setupFAQ();
});
