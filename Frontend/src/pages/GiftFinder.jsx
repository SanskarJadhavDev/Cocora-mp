import { useState } from 'react';
import { Link } from 'react-router-dom';
import { giftFinderApi } from '../services/api';
import { useCart } from '../context/CartContext';
import { SiteFooter } from './Home';
import '../css/gift-finder.css';

/* ── Quiz data ─────────────────────────────────────── */
const RECIPIENTS = [
  { val: 'Partner',   icon: '💍', sub: 'For someone special' },
  { val: 'Friend',    icon: '✨', sub: 'Celebration or gesture' },
  { val: 'Family',    icon: '🌿', sub: 'Parents, siblings, kids' },
  { val: 'Colleague', icon: '🤝', sub: 'Professional gift' },
];

const OCCASIONS = [
  { val: 'Birthday',     icon: '🎂' },
  { val: 'Anniversary',  icon: '🥂' },
  { val: 'Celebration',  icon: '🎉' },
  { val: 'Thank You',    icon: '💌' },
  { val: 'Just Because', icon: '✨' },
];

const MOODS = [
  { val: 'Bold',         desc: 'Dark, intense single-origin (65–85%)' },
  { val: 'Classic',      desc: 'Silky milk chocolate & sweet cream' },
  { val: 'Playful',      desc: 'Fruit, floral & unexpected Indian spices' },
  { val: 'Surprise me',  desc: 'Curated selection from kitchen favourites' },
];

const DIETARY = ['None', 'Vegan', 'Gluten-Free', 'Sugar-Free', 'Dairy-Free'];

/* ── Component ─────────────────────────────────────── */
export default function GiftFinder() {
  const { addToCart } = useCart();

  const [stage, setStage]         = useState('intro'); // intro | quiz | result
  const [step, setStep]           = useState(1);
  const [recipient, setRecipient] = useState('');
  const [occasion, setOccasion]   = useState('');
  const [mood, setMood]           = useState('');
  const [dietary, setDietary]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [emptySuggestions, setEmptySuggestions] = useState([]);
  const [addedNotice, setAddedNotice] = useState('');

  const progressPct = ((step - 1) / 3) * 100;

  const handleStart = () => { setStage('quiz'); setStep(1); };

  const handleFinish = async () => {
    setLoading(true);
    setError('');
    setStage('result');
    try {
      const payload = { recipient, occasion, mood, limit: 4 };
      if (dietary && dietary !== 'None') payload.dietaryRequirements = [dietary];
      const response = await giftFinderApi.recommend(payload);
      if (response?.recommendations) {
        setRecommendations(response.recommendations);
        if (response.count === 0 && response.suggestions) {
          setEmptySuggestions(response.suggestions);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to generate recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetQuiz = () => {
    setRecipient(''); setOccasion(''); setMood(''); setDietary('');
    setStep(1); setRecommendations([]); setEmptySuggestions([]);
    setError(''); setStage('quiz');
  };

  const handleAddToCart = async (rec) => {
    const res = await addToCart(rec.productId, 1);
    if (res?.success) {
      setAddedNotice(`Added "${rec.name}" to your cart!`);
      setTimeout(() => setAddedNotice(''), 2500);
    }
  };

  return (
    <div className="gift-finder-page">

      {/* ── INTRO ── */}
      {stage === 'intro' && (
        <section id="intro-section" className="gf-hero" aria-labelledby="gf-intro-title">
          <div className="gf-hero-icon" aria-hidden="true">✦</div>
          <p className="section-tag">Intelligent Gift Finder</p>
          <h1 id="gf-intro-title" className="gf-hero-title">
            Not sure what to gift?<br />
            <em>We'll find the sweet spot.</em>
          </h1>
          <p className="gf-hero-text">
            Answer three quick questions about the recipient, occasion, and flavour preference.
            Our engine matches real artisanal chocolates tempered fresh in Bandra West.
          </p>
          <button
            id="start-btn"
            type="button"
            className="btn-primary"
            onClick={handleStart}
            style={{ padding: '1rem 2.5rem', fontSize: '1rem' }}
          >
            Find my gift →
          </button>
        </section>
      )}

      {/* ── QUIZ ── */}
      {stage === 'quiz' && (
        <section id="quiz-section" className="gf-quiz" aria-label="Gift finder quiz">
          {/* Progress */}
          <div className="gf-progress" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={3}>
            <span className="gf-progress-label">Step {step} of 3</span>
            <div className="gf-progress-track" aria-hidden="true">
              <div className="gf-progress-bar" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="gf-progress-label" aria-hidden="true">{step}/3</span>
          </div>

          {/* Step 1: Recipient */}
          {step === 1 && (
            <div id="step-1" className="gf-step-card" key="step1">
              <h2 className="gf-step-heading">Who are you gifting?</h2>
              <p className="gf-step-sub">Personalised recommendations based on who'll be unwrapping.</p>
              <div className="gf-options">
                {RECIPIENTS.map(({ val, icon, sub }) => (
                  <button
                    key={val}
                    type="button"
                    id={`recipient-${val.toLowerCase()}`}
                    className={`gf-option${recipient === val ? ' selected' : ''}`}
                    onClick={() => setRecipient(val)}
                    aria-pressed={recipient === val}
                  >
                    <span className="gf-option-emoji">{icon}</span>
                    <span className="gf-option-label">{val}</span>
                    <span className="gf-option-sub">{sub}</span>
                  </button>
                ))}
              </div>
              <div className="gf-nav">
                <button
                  type="button"
                  className="gf-back-btn"
                  onClick={() => setStage('intro')}
                >
                  ← Back
                </button>
                <button
                  id="next-1"
                  type="button"
                  className="btn-primary gf-next-btn"
                  disabled={!recipient}
                  onClick={() => setStep(2)}
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Occasion */}
          {step === 2 && (
            <div id="step-2" className="gf-step-card" key="step2">
              <h2 className="gf-step-heading">What's the occasion?</h2>
              <p className="gf-step-sub">Helps our kitchen match the right mood and flavour weight.</p>
              <div className="gf-options">
                {OCCASIONS.map(({ val, icon }) => (
                  <button
                    key={val}
                    type="button"
                    id={`occasion-${val.toLowerCase().replace(/\s/g, '-')}`}
                    className={`gf-option${occasion === val ? ' selected' : ''}`}
                    onClick={() => setOccasion(val)}
                    aria-pressed={occasion === val}
                  >
                    <span className="gf-option-emoji">{icon}</span>
                    <span className="gf-option-label">{val}</span>
                  </button>
                ))}
              </div>
              <div className="gf-nav">
                <button type="button" className="gf-back-btn" onClick={() => setStep(1)}>
                  ← Back
                </button>
                <button
                  id="next-2"
                  type="button"
                  className="btn-primary gf-next-btn"
                  disabled={!occasion}
                  onClick={() => setStep(3)}
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Mood + optional dietary */}
          {step === 3 && (
            <div id="step-3" className="gf-step-card" key="step3">
              <h2 className="gf-step-heading">What's their chocolate mood?</h2>
              <p className="gf-step-sub">We'll match cocoa percentage and flavour notes accordingly.</p>
              <div className="gf-options" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                {MOODS.map(({ val, desc }) => (
                  <button
                    key={val}
                    type="button"
                    id={`mood-${val.toLowerCase().replace(/\s/g, '-')}`}
                    className={`gf-option${mood === val ? ' selected' : ''}`}
                    onClick={() => setMood(val)}
                    aria-pressed={mood === val}
                  >
                    <span className="gf-option-label">{val}</span>
                    <span className="gf-option-sub">{desc}</span>
                  </button>
                ))}
              </div>

              {/* Optional dietary */}
              <div style={{ marginTop: '1.75rem', paddingTop: '1.5rem', borderTop: '1px solid var(--gold-15)' }}>
                <p className="section-tag" style={{ marginBottom: '0.75rem' }}>
                  Optional dietary preference
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {DIETARY.map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`category-tab${(dietary === d || (!dietary && d === 'None')) ? ' active' : ''}`}
                      style={{ fontSize: '0.78rem', padding: '0.35rem 0.85rem' }}
                      onClick={() => setDietary(d === 'None' ? '' : d)}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="gf-nav" style={{ marginTop: '2rem' }}>
                <button type="button" className="gf-back-btn" onClick={() => setStep(2)}>
                  ← Back
                </button>
                <button
                  id="finish-btn"
                  type="button"
                  className="btn-primary gf-next-btn"
                  disabled={!mood}
                  onClick={handleFinish}
                >
                  Find my gifts →
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── RESULTS ── */}
      {stage === 'result' && (
        <section id="result-section" className="gf-results" aria-label="Gift recommendations">
          <div className="gf-results-header">
            <p className="section-tag">Curated Kitchen Matches</p>
            <h2 className="gf-results-title">Chocolates tailored to your gift</h2>
          </div>

          {addedNotice && (
            <div className="auth-notice" style={{ marginBottom: '2rem', maxWidth: '36rem', margin: '0 auto 2rem' }}>
              ✓ {addedNotice}
            </div>
          )}

          {loading ? (
            <div className="gf-state-box">
              <div className="gf-spinner" aria-hidden="true" />
              <p className="section-title" style={{ fontSize: '1.4rem' }}>
                Searching 60 artisanal chocolates…
              </p>
              <p style={{ color: 'var(--ivory-60)', fontSize: '0.9rem', maxWidth: '30rem', textAlign: 'center' }}>
                Matching recipient, occasion, cocoa percentage, and flavour notes against active kitchen stock.
              </p>
            </div>
          ) : error ? (
            <div className="gf-state-box">
              <p style={{ color: 'var(--color-error)', fontSize: '1.25rem', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                {error}
              </p>
              <button type="button" className="btn-primary" onClick={resetQuiz}>
                Try Again
              </button>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="gf-state-box">
              <p className="section-title" style={{ fontSize: '1.4rem' }}>
                No chocolates matched all criteria
              </p>
              {emptySuggestions.length > 0 && (
                <ul style={{ textAlign: 'left', maxWidth: '30rem', color: 'var(--ivory-75)', lineHeight: 1.7 }}>
                  {emptySuggestions.map((s, i) => (
                    <li key={i} style={{ marginBottom: '0.35rem' }}>• {s}</li>
                  ))}
                </ul>
              )}
              <button type="button" className="btn-primary" onClick={resetQuiz}>
                Adjust Preferences
              </button>
            </div>
          ) : (
            <>
              <div className="gf-results-grid">
                {recommendations.map((rec) => (
                  <article key={rec.productId} className="gf-rec-card">
                    <div className="gf-rec-img">
                      <img src={rec.image} alt={rec.name} loading="lazy" width="400" height="520" />
                    </div>
                    <div className="gf-rec-info">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p className="gf-rec-category">{rec.category}</p>
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 700,
                          background: 'var(--gold-15)', color: 'var(--color-gold-warm)',
                          padding: '0.2rem 0.55rem', borderRadius: 'var(--radius-full)',
                          border: '1px solid var(--gold-30)', whiteSpace: 'nowrap'
                        }}>
                          {rec.matchPercentage}% MATCH
                        </span>
                      </div>
                      <h3 className="gf-rec-name">{rec.name}</h3>
                      <p className="gf-rec-desc">{rec.description}</p>

                      {rec.matchReasons?.length > 0 && (
                        <div style={{ background: 'rgba(22, 13, 34, 0.6)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--gold-15)', marginTop: 'auto' }}>
                          <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--color-gold-warm)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                            Why it matches:
                          </p>
                          <ul style={{ fontSize: '0.78rem', color: 'var(--ivory-75)', lineHeight: 1.5 }}>
                            {rec.matchReasons.map((r, i) => (
                              <li key={i} style={{ marginBottom: '0.2rem' }}>✓ {r}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="gf-rec-footer" style={{ marginTop: '0.75rem' }}>
                        <span className="gf-rec-price">₹{rec.price}</span>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="gf-add-btn"
                            onClick={() => handleAddToCart(rec)}
                            aria-label={`Add ${rec.name} to cart`}
                          >
                            +
                          </button>
                          <Link
                            to={`/build?product=${rec.productId}`}
                            className="btn-ghost"
                            style={{ fontSize: '0.78rem' }}
                            aria-label={`Build ${rec.name} into a box`}
                          >
                            Box it →
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
                <button
                  id="try-again-btn"
                  type="button"
                  className="btn-ghost"
                  onClick={resetQuiz}
                  style={{ fontSize: '0.9rem' }}
                >
                  Not quite right? Try again →
                </button>
              </div>
            </>
          )}
        </section>
      )}

      <SiteFooter />
    </div>
  );
}
