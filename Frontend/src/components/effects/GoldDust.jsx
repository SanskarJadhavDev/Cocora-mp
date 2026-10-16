/**
 * GoldDust.jsx — Native canvas particle system for Cocora
 *
 * Implements a "rising cocoa dust / champagne sparks" effect:
 * - Warm gold particle heads (#E5BB32) with soft purple-violet trails (#6E43A8)
 * - Mode: glow — additive blending for luminous warmth
 * - Direction: up — particles rise from bottom, biased right (behind chocolate)
 * - Feels like: champagne bubbles through warm amber light, NOT sci-fi/space
 *
 * Final tuned config (see GOLD_DUST_CONFIG):
 * - count: 180 (restrained, never overwhelming)
 * - Narrow spread (90), strong focus (0.5), right-biased origin
 * - Low speed, long trails, soft glow — warmth over spectacle
 *
 * Pauses when: off-screen (IntersectionObserver), tab hidden,
 *              prefers-reduced-motion, or `paused` prop is true.
 * Renders nothing harmful during SSR.
 * aria-hidden + pointer-events-none (unless interactive).
 */

import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';

/* ── Config object — single source of truth ─────────────────────────── */
export const GOLD_DUST_CONFIG = {
  // Colors: warm gold heads, muted aubergine trails — NOT cyan/white (that's space)
  headColor:       '#E5BB32',
  trailColor:      '#6E43A8',
  backgroundColor: '#160D22',   // exactly matches page midnight — zero box-edge

  // Flow: origin biased to the right third of canvas so dust rises behind chocolate
  direction:       'up',
  spread:          90,           // narrowed — keeps it a column, not a flood
  focus:           0.5,          // moderate focus: not laser-beam, not everywhere
  originOffset:    0.25,         // 25% from the right edge
  originShift:     0.35,         // 35% vertical shift keeps origin in mid-frame

  // Particle count & motion: restrained! High counts read as "spaceship exhaust"
  count:           180,
  speed:           0.085,
  speedVariance:   0.6,
  acceleration:    0.6,

  // Trails: long-ish trails = cocoa dust streak; short = fireflies. Aim for dust.
  trailLength:     0.35,
  trailFade:       1.8,
  lineWidth:       1,
  starSize:        2.0,

  // Atmosphere: subtle twinkle, glow kept low (high glow = sci-fi)
  twinkle:         0.3,
  fadeOut:         0.4,
  depth:           0.7,
  glow:            0.28,         // intentionally low — warm shimmer, not neon
  intensity:       0.85,
  grain:           0.15,

  // Interaction: gentle, not aggressive
  interactive:     true,
  thrust:          0.6,
};

/* ── Particle class ─────────────────────────────────────────────────── */
class Particle {
  constructor(canvas, config, isLowPower) {
    this.canvas = canvas;
    this.config = config;
    this.isLowPower = isLowPower;
    this.reset(true);
  }

  reset(initialise = false) {
    const { canvas, config } = this;
    const w = canvas.width;
    const h = canvas.height;

    // Origin: biased toward the right side (behind chocolate visual)
    const originX = w * (1 - config.originOffset);
    const originY = h * (1 - config.originShift);

    // Spread in a cone shape
    const spreadRad = (config.spread / 2) * (Math.PI / 180);
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2 * spreadRad;

    const baseSpeed = config.speed * (1 + (Math.random() - 0.5) * config.speedVariance);
    this.vx = Math.cos(angle) * baseSpeed;
    this.vy = Math.sin(angle) * baseSpeed;

    // Depth gives parallax feel — particles at different z levels
    this.depth = 0.3 + Math.random() * config.depth;
    this.size  = config.starSize * (0.5 + this.depth * 0.5);
    this.alpha = 0;
    this.life  = 0;
    this.maxLife = 0.5 + Math.random() * 0.5;

    // Twinkle phase
    this.twinklePhase = Math.random() * Math.PI * 2;
    this.twinkleFreq  = 0.02 + Math.random() * 0.04;

    // Trail history
    const trailLen = Math.floor(
      (this.isLowPower ? 6 : 14) * config.trailLength
    );
    this.trail = [];
    this.maxTrail = trailLen;

    if (initialise) {
      // Scatter through the full canvas height at start
      const scatter = Math.random();
      this.x = originX + (Math.random() - 0.5) * w * 0.6;
      this.y = originY - scatter * h * 1.1;
      this.life = scatter * this.maxLife;
      this.alpha = scatter;
    } else {
      this.x = originX + (Math.random() - 0.5) * (w * (config.spread / 360));
      this.y = originY;
    }
  }

  update(mouseX, mouseY, interactive, thrust) {
    const { config } = this;

    this.life += 0.008;
    const t = this.life / this.maxLife;

    // Fade in and out
    if (t < 0.1) {
      this.alpha = t / 0.1;
    } else if (t > 1 - config.fadeOut) {
      this.alpha = (1 - t) / config.fadeOut;
    } else {
      this.alpha = 1;
    }

    // Twinkle modulation
    const twinkle = 1 + config.twinkle * Math.sin(this.twinklePhase + this.life * this.twinkleFreq * 100);
    this.displayAlpha = this.alpha * twinkle * config.intensity;

    // Mouse repulsion (gentle, not chasing)
    if (interactive && mouseX !== null) {
      const dx = this.x - mouseX;
      const dy = this.y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 80) {
        const force = (1 - dist / 80) * thrust * 0.3;
        this.vx += (dx / dist) * force;
        this.vy += (dy / dist) * force;
      }
    }

    // Slight upward acceleration
    this.vy -= config.acceleration * 0.00015;

    // Trail
    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrail) this.trail.pop();

    this.x += this.vx * (0.5 + this.depth * 0.5);
    this.y += this.vy * (0.5 + this.depth * 0.5);

    // Dead when off screen or life expired
    if (this.life >= this.maxLife || this.y < -20 ||
        this.x < -20 || this.x > this.canvas.width + 20) {
      this.reset();
    }
  }

  draw(ctx, headColor, trailColor, trailFade, glow, lineWidth) {
    if (this.displayAlpha <= 0.01) return;

    // Draw trail
    if (this.trail.length > 1) {
      for (let i = 1; i < this.trail.length; i++) {
        const ratio = 1 - i / this.trail.length;
        const trailAlpha = this.displayAlpha * ratio / trailFade;
        if (trailAlpha < 0.01) continue;
        ctx.beginPath();
        ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y);
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
        ctx.strokeStyle = trailColor + Math.round(trailAlpha * 255).toString(16).padStart(2, '0');
        ctx.lineWidth = lineWidth * ratio;
        ctx.stroke();
      }
    }

    // Draw head with glow
    const a = this.displayAlpha;
    if (glow > 0) {
      const glowRadius = this.size * (3 + glow * 6);
      const gradient = ctx.createRadialGradient(
        this.x, this.y, 0,
        this.x, this.y, glowRadius
      );
      gradient.addColorStop(0, headColor + Math.round(a * 0.6 * 255).toString(16).padStart(2, '0'));
      gradient.addColorStop(1, headColor + '00');
      ctx.beginPath();
      ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // Core particle
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = headColor + Math.round(a * 255).toString(16).padStart(2, '0');
    ctx.fill();
  }
}

/* ── GoldDust component ─────────────────────────────────────────────── */
const GoldDust = forwardRef(function GoldDust({
  paused = false,
  quality = 1,      // 0–1; low-power screens get 0.5
  count: countProp,
  colors,
  backgroundColor,
  interactive: interactiveProp,
  ...overrides
}, ref) {
  const canvasRef  = useRef(null);
  const stateRef   = useRef({
    particles:   [],
    animId:      null,
    paused:      false,
    mouseX:      null,
    mouseY:      null,
    isLowPower:  false,
    grain:       null,
  });

  // Allow parent to trigger burst via ref
  useImperativeHandle(ref, () => ({
    burst(x, y, extra = 40) {
      const s = stateRef.current;
      for (let i = 0; i < extra; i++) {
        const p = new Particle(canvasRef.current, config, s.isLowPower);
        p.x = x ?? canvasRef.current?.width * 0.65;
        p.y = y ?? canvasRef.current?.height * 0.6;
        p.vx = (Math.random() - 0.5) * 0.3;
        p.vy = -config.speed * (1.5 + Math.random());
        p.life = 0;
        s.particles.push(p);
      }
    }
  }));

  // Merge config
  const config = {
    ...GOLD_DUST_CONFIG,
    ...overrides,
    ...(colors ? { headColor: colors[1] ?? GOLD_DUST_CONFIG.headColor, trailColor: colors[0] ?? GOLD_DUST_CONFIG.trailColor } : {}),
    ...(backgroundColor ? { backgroundColor } : {}),
    ...(interactiveProp !== undefined ? { interactive: interactiveProp } : {}),
  };

  const effectiveCount = Math.round((countProp ?? config.count) * quality);

  // Check for low-power / reduced-motion
  const prefersReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
  const isCoarsePointer = typeof window !== 'undefined'
    ? window.matchMedia('(pointer: coarse)').matches
    : false;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;
    if (s.paused) return;

    // Additive blending for glow mode — warmth not neon
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = config.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'lighter';

    for (const p of s.particles) {
      p.update(
        isCoarsePointer ? null : s.mouseX,
        isCoarsePointer ? null : s.mouseY,
        config.interactive && !isCoarsePointer,
        config.thrust ?? 0.6
      );
      p.draw(ctx, config.headColor, config.trailColor, config.trailFade, config.glow, config.lineWidth);
    }

    // Film grain overlay
    if (config.grain > 0 && s.grain) {
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = config.grain * 0.3;
      ctx.drawImage(s.grain, 0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
    }

    ctx.globalCompositeOperation = 'source-over';
    s.animId = requestAnimationFrame(draw);
  }, [config, isCoarsePointer]);

  const buildGrainTexture = (w, h) => {
    const offscreen = document.createElement('canvas');
    offscreen.width  = Math.min(w, 256);
    offscreen.height = Math.min(h, 256);
    const octx = offscreen.getContext('2d');
    const img = octx.createImageData(offscreen.width, offscreen.height);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    octx.putImageData(img, 0, 0);
    return offscreen;
  };

  useEffect(() => {
    // SSR guard
    if (typeof window === 'undefined') return;

    // Reduced motion: render static frame, don't animate
    if (prefersReducedMotion) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = config.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;

    // Detect low-power
    s.isLowPower = isCoarsePointer || quality < 0.7;

    // Size canvas
    const resize = () => {
      canvas.width  = canvas.offsetWidth  * Math.min(window.devicePixelRatio, 1.5);
      canvas.height = canvas.offsetHeight * Math.min(window.devicePixelRatio, 1.5);
      // Rebuild particles after resize
      s.particles = Array.from({ length: effectiveCount }, () =>
        new Particle(canvas, config, s.isLowPower)
      );
      s.grain = config.grain > 0 ? buildGrainTexture(canvas.width, canvas.height) : null;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Mouse tracking
    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width  / rect.width;
      const scaleY = canvas.height / rect.height;
      s.mouseX = (e.clientX - rect.left) * scaleX;
      s.mouseY = (e.clientY - rect.top)  * scaleY;
    };
    if (config.interactive && !isCoarsePointer) {
      canvas.addEventListener('mousemove', onMouseMove, { passive: true });
    }

    // IntersectionObserver to pause off-screen
    const io = new IntersectionObserver(([entry]) => {
      s.paused = !entry.isIntersecting || paused;
      if (!s.paused && !s.animId) s.animId = requestAnimationFrame(draw);
    }, { threshold: 0.05 });
    io.observe(canvas);

    // Page visibility
    const onVisibilityChange = () => {
      s.paused = document.hidden || paused;
      if (!s.paused && !s.animId) s.animId = requestAnimationFrame(draw);
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Start
    s.paused = paused;
    s.animId = requestAnimationFrame(draw);

    return () => {
      if (s.animId) cancelAnimationFrame(s.animId);
      s.animId = null;
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (config.interactive && !isCoarsePointer) {
        canvas.removeEventListener('mousemove', onMouseMove);
      }
    };
  }, [paused, quality, effectiveCount, draw]);

  // Sync paused prop changes
  useEffect(() => {
    stateRef.current.paused = paused;
  }, [paused]);

  // SSR: render nothing
  if (typeof window === 'undefined') return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: config.interactive && !isCoarsePointer ? 'auto' : 'none',
        display: 'block',
      }}
    />
  );
});

export default GoldDust;
