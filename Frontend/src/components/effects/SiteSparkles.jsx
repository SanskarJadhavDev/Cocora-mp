/**
 * SiteSparkles.jsx — Single Global Ambient Sparkle Layer for Cocora
 *
 * Replaces section-level particle canvases with ONE persistent, site-wide ambient
 * sparkle field mounted once in the root app shell.
 *
 * Key Architectural Decisions:
 * 1. Wrapper: position: fixed; inset: 0; 100vw x 100dvh; pointer-events: none; z-index: 50;
 *    Sits above page backgrounds and sections, but below Navbar (z-100), Modals (z-200),
 *    and Toasts (z-999). aria-hidden="true".
 * 2. Solid black background (#000000) with `mix-blend-mode: screen`:
 *    In screen blending, #000000 is mathematically neutral (invisible), allowing gold
 *    (#E5BB32) and violet (#8A5CC4) sparkles to shine softly over dark sections while
 *    naturally washing out and disappearing over light ivory (#FAF6F0) sections.
 * 3. Lazy loaded via requestIdleCallback after first paint so LCP and CTAs are never blocked.
 * 4. Pauses on tab visibility hidden, respects prefers-reduced-motion (renders static frame,
 *    no animation loop), and throttles particle count on low-power/mobile devices.
 * 5. Coordinated with Hero: IntersectionObserver detects when the Hero (which has its own
 *    denser GoldDust instance) is in view and smoothly fades out / pauses the global layer.
 *    Max ONE canvas visibly active at a time.
 * 6. Route filtering: completely disabled on auth/checkout/admin routes.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

/* ── Route denylist: keep forms and payment screens clean ────────────── */
export const SPARKLE_DENYLIST_ROUTES = [
  '/login',
  '/forgot-password',
  '/verify-email',
  '/admin',
  '/checkout',
  '/payment',
];

/* ── Tuned Config Object (Single source of truth) ────────────────────── */
/**
 * Intent: "little little sparkles", not streaks, not a starfield.
 * Sparse, tiny, slow, softly twinkling, and never competing with text.
 */
export const SITE_SPARKLES_CONFIG = {
  // Colors: violet trail into warm gold head
  headColor:       '#E5BB32',
  trailColor:      '#8A5CC4',
  backgroundColor: '#000000', // Solid black for CSS screen mix-blend

  // Motion & Flow: rising ambient champagne shimmer
  mode:            'glow',
  direction:       'up',
  spread:          120,       // 120-degree cone for gentle, dispersed upward drift
  focus:           0.3,       // Soft focus for ambient distribution
  originOffset:    0.3,

  // Sparkle density & timing: sparse, delicate, relaxed
  count:           72,        // Sparse count (within 60–90 range)
  speed:           0.045,     // Very slow, peaceful floating
  speedVariance:   0.7,       // Natural variety in particle velocities
  acceleration:    0.3,       // Gentle upward lift
  trailLength:     0.15,      // Short subtle trail (within 0.12–0.2 range)
  trailFade:       2.2,       // Fast decay keeps sparkles as tiny specks, not long streaks
  lineWidth:       0.8,       // Hairline delicate trails

  // Geometry & Twinkle
  starSize:        1.35,      // Tiny sparkles (within 1.2–1.6 range)
  twinkle:         0.6,       // Gentle sinusoidal brightness modulation
  fadeIn:          0.1,       // Quick soft birth
  fadeOut:         0.5,       // Gradual dissolution before reset
  depth:           0.8,       // Subtle depth perception

  // Visual balance: non-competing with typography
  glow:            0.3,       // Soft aura without neon glare
  intensity:       0.55,      // Restrained luminance for AA text legibility
  grain:           0,         // Clean aesthetic, zero grain noise
  interactive:     false,     // Never intercepts pointer events
  burst:           0,         // Zero click burst
};

/* ── Ambient Particle Class ─────────────────────────────────────────── */
class SparkleParticle {
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

    // Angle calculation: directed upward (-PI/2) with spread cone
    const spreadRad = (config.spread / 2) * (Math.PI / 180);
    const angleSpread = (1 - config.focus) * spreadRad;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2 * angleSpread;

    const baseSpeed = config.speed * (1 + (Math.random() - 0.5) * config.speedVariance) * (h / 700);
    this.vx = Math.cos(angle) * baseSpeed;
    this.vy = Math.sin(angle) * baseSpeed;

    this.depth = 0.3 + Math.random() * config.depth;
    this.size  = config.starSize * (0.6 + this.depth * 0.4);
    this.alpha = 0;
    this.life  = 0;
    this.maxLife = 0.6 + Math.random() * 0.7;

    this.twinklePhase = Math.random() * Math.PI * 2;
    this.twinkleFreq  = 0.02 + Math.random() * 0.035;

    // Trail storage
    const trailPoints = Math.max(1, Math.floor((this.isLowPower ? 4 : 8) * config.trailLength * 5));
    this.trail = [];
    this.maxTrail = trailPoints;

    if (initialise) {
      // Scatter evenly throughout the entire viewport on first boot
      this.x = Math.random() * w;
      this.y = Math.random() * h;
      this.life = Math.random() * this.maxLife;
      this.alpha = Math.random();
    } else {
      // Spawn at bottom edge across the full width
      this.x = Math.random() * w;
      this.y = h + Math.random() * 15;
    }
  }

  update() {
    const { config } = this;
    this.life += 0.005;

    if (this.life >= this.maxLife || this.y < -20 || this.x < -20 || this.x > this.canvas.width + 20) {
      this.reset(false);
      return;
    }

    // Gentle upward acceleration
    this.vy -= config.acceleration * 0.003;
    this.x += this.vx;
    this.y += this.vy;

    // Store trail point
    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrail) {
      this.trail.pop();
    }

    // Alpha curve: fadeIn -> peak -> fadeOut
    const t = this.life / this.maxLife;
    if (t < config.fadeIn) {
      this.alpha = t / config.fadeIn;
    } else if (t > 1 - config.fadeOut) {
      this.alpha = (1 - t) / config.fadeOut;
    } else {
      this.alpha = 1;
    }

    // Twinkle modulation
    const twinkleMod = 1 + config.twinkle * Math.sin(this.twinklePhase + this.life * this.twinkleFreq * 100);
    this.displayAlpha = Math.max(0, Math.min(1, this.alpha * twinkleMod * config.intensity));
  }

  draw(ctx) {
    const a = this.displayAlpha;
    if (a <= 0.005) return;

    const { headColor, trailColor, trailFade, glow, lineWidth } = this.config;

    // Draw delicate subtle trail
    if (this.trail.length > 1) {
      for (let i = 0; i < this.trail.length - 1; i++) {
        const p1 = this.trail[i];
        const p2 = this.trail[i + 1];
        const segAlpha = a * Math.pow(1 - i / this.trail.length, trailFade) * 0.45;
        if (segAlpha <= 0.01) continue;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = trailColor + Math.round(segAlpha * 255).toString(16).padStart(2, '0');
        ctx.lineWidth = lineWidth * (1 - (i / this.trail.length) * 0.5);
        ctx.stroke();
      }
    }

    // Soft aura glow
    if (glow > 0 && !this.isLowPower) {
      const glowRadius = this.size * 2.8 * (1 + glow);
      const gradient = ctx.createRadialGradient(
        this.x, this.y, 0,
        this.x, this.y, glowRadius
      );
      gradient.addColorStop(0, headColor + Math.round(a * 0.4 * 255).toString(16).padStart(2, '0'));
      gradient.addColorStop(1, headColor + '00');

      ctx.beginPath();
      ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // Core star head
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = headColor + Math.round(a * 255).toString(16).padStart(2, '0');
    ctx.fill();
  }
}

/* ── SiteSparkles Component ─────────────────────────────────────────── */
export default function SiteSparkles() {
  const location = useLocation();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // States
  const [isReady, setIsReady]         = useState(false);
  const [heroInView, setHeroInView]   = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Route check
  const isDeniedRoute = useMemo(() => {
    return SPARKLE_DENYLIST_ROUTES.some(
      (route) => location.pathname === route || location.pathname.startsWith(route + '/')
    );
  }, [location.pathname]);

  // Animation & simulation ref
  const simRef = useRef({
    particles: [],
    animId: null,
    isLowPower: false,
    effectiveCount: SITE_SPARKLES_CONFIG.count,
    paused: false,
  });

  /* ── 1. Respect prefers-reduced-motion ───────────────────────────────── */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  /* ── 2. Lazy load after first paint (requestIdleCallback) ────────────── */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cancelled = false;
    const scheduleInit = () => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
          if (!cancelled) setIsReady(true);
        }, { timeout: 1500 });
      } else {
        setTimeout(() => {
          if (!cancelled) setIsReady(true);
        }, 150);
      }
    };

    if (document.readyState === 'complete') {
      scheduleInit();
    } else {
      window.addEventListener('load', scheduleInit, { once: true });
    }

    return () => {
      cancelled = true;
    };
  }, []);

  /* ── 3. Coordinate with Hero (Section C) ─────────────────────────────── */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // If not on Home page, Hero is not present -> SiteSparkles stays visible
    if (location.pathname !== '/') {
      setHeroInView(false);
      return;
    }

    let observer = null;
    let timer = null;

    const observeHero = () => {
      const hero = document.getElementById('hero-section') || document.querySelector('.hero');
      if (!hero) return false;

      observer = new IntersectionObserver(
        ([entry]) => {
          // If Hero occupies more than 5% of viewport, fade out & pause global sparkles
          setHeroInView(entry.isIntersecting && entry.intersectionRatio > 0.05);
        },
        { threshold: [0, 0.05, 0.2, 0.5] }
      );
      observer.observe(hero);
      return true;
    };

    if (!observeHero()) {
      // Retry briefly in case Home page transition is finalizing
      timer = setTimeout(observeHero, 60);
    }

    return () => {
      if (observer) observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [location.pathname]);

  /* ── 4. Main Canvas Simulation & Render Loop ────────────────────────── */
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const sim = simRef.current;

    if (sim.paused) return;

    // Paint solid black background (screen mix-blend makes black 100% invisible)
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = SITE_SPARKLES_CONFIG.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Additive glow blending for luminous warmth
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < sim.particles.length; i++) {
      const p = sim.particles[i];
      p.update();
      p.draw(ctx);
    }

    ctx.globalCompositeOperation = 'source-over';
    sim.animId = requestAnimationFrame(drawFrame);
  }, []);

  useEffect(() => {
    if (!isReady || isDeniedRoute || typeof window === 'undefined') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const sim = simRef.current;

    // Detect hardware & low-power capabilities
    const isMobile = window.innerWidth < 768;
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    const lowCores = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
    const lowMem   = navigator.deviceMemory && navigator.deviceMemory <= 4;
    const isLowPower = isMobile || isCoarse || lowCores || lowMem;
    sim.isLowPower = isLowPower;

    // Lower count on low-power devices: target < 5% frame budget
    const effectiveCount = Math.round(
      SITE_SPARKLES_CONFIG.count * (isLowPower ? 0.55 : 1)
    );
    sim.effectiveCount = effectiveCount;

    // Canvas sizing with explicit DPR capping
    const resizeCanvas = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, isLowPower ? 1.0 : 1.5);
      const w = window.innerWidth;
      const h = window.innerHeight;

      canvas.width  = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);

      // Re-seed particles to adapt to new dimensions
      sim.particles = Array.from({ length: effectiveCount }, () =>
        new SparkleParticle(canvas, SITE_SPARKLES_CONFIG, isLowPower)
      );

      // If reduced motion, draw one still frame and do not start animation loop
      if (reducedMotion) {
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = SITE_SPARKLES_CONFIG.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'lighter';
        for (const p of sim.particles) {
          p.draw(ctx);
        }
        ctx.globalCompositeOperation = 'source-over';
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });

    // Page visibility listener: pause when tab hidden
    const onVisibilityChange = () => {
      sim.paused = document.hidden || heroInView;
      if (!sim.paused && !sim.animId && !reducedMotion) {
        sim.animId = requestAnimationFrame(drawFrame);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Initial start
    sim.paused = heroInView;
    if (!sim.paused && !reducedMotion) {
      sim.animId = requestAnimationFrame(drawFrame);
    }

    return () => {
      if (sim.animId) cancelAnimationFrame(sim.animId);
      sim.animId = null;
      window.removeEventListener('resize', resizeCanvas);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isReady, isDeniedRoute, reducedMotion, drawFrame]);

  // Sync heroInView state with animation pause
  useEffect(() => {
    const sim = simRef.current;
    sim.paused = heroInView || document.hidden;
    if (!sim.paused && !sim.animId && isReady && !isDeniedRoute && !reducedMotion) {
      sim.animId = requestAnimationFrame(drawFrame);
    }
  }, [heroInView, isReady, isDeniedRoute, reducedMotion, drawFrame]);

  // Do not render anything on denylisted routes (forms, checkout, admin)
  if (isDeniedRoute) return null;

  // Active visibility: fade out when hero is in view
  const isVisible = isReady && !heroInView;

  return (
    <div
      ref={containerRef}
      className="site-sparkles-layer"
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100dvh',
        pointerEvents: 'none',
        zIndex: 50,
        mixBlendMode: 'screen',
        backgroundColor: '#000000',
        overflow: 'hidden',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
