import { useState } from 'react';
import { Link } from 'react-router-dom';
import { giftFinderApi } from '../services/api';
import { useCart } from '../context/CartContext';
import '../css/gift-finder.css';

export default function GiftFinder() {
  const { addToCart } = useCart();
  const [stage, setStage] = useState('intro');
  const [step, setStep] = useState(1);
  const [recipient, setRecipient] = useState('');
  const [occasion, setOccasion] = useState('');
  const [mood, setMood] = useState('');
  const [dietary, setDietary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [emptySuggestions, setEmptySuggestions] = useState([]);
  const [addedNotice, setAddedNotice] = useState('');

  const handleStart = () => {
    setStage('quiz');
    setStep(1);
  };

  const handleFinish = async () => {
    setLoading(true);
    setError('');
    setStage('result');

    try {
      const payload = {
        recipient,
        occasion,
        mood,
        limit: 4
      };
      if (dietary && dietary !== 'None') {
        payload.dietaryRequirements = [dietary];
      }

      const response = await giftFinderApi.recommend(payload);
      if (response && response.recommendations) {
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
    setRecipient('');
    setOccasion('');
    setMood('');
    setDietary('');
    setStep(1);
    setRecommendations([]);
    setEmptySuggestions([]);
    setError('');
    setStage('quiz');
  };

  const getProgressText = () => {
    if (step === 1) return '01 / 03';
    if (step === 2) return '02 / 03';
    return '03 / 03';
  };

  const handleAddToCart = async (rec) => {
    const res = await addToCart(rec.productId, 1);
    if (res && res.success) {
      setAddedNotice(`Added "${rec.name}" to your cart!`);
      setTimeout(() => {
        setAddedNotice('');
      }, 2500);
    }
  };

  return (
    <div>
      <main className="finder-main">
        <div className="finder-container">
          {stage === 'intro' && (
            <section id="intro-section" className="finder-intro">
              <p className="section-tag">INTELLIGENT GIFT FINDER</p>
              <h1 className="intro-title">
                Not sure what to gift?<br />
                <span className="intro-highlight">We'll find the sweet spot.</span>
              </h1>
              <p className="intro-desc">
                Answer three quick questions about the recipient, occasion, and flavour preference. Our engine matches real artisanal chocolates tempered fresh in Bandra West.
              </p>
              <button
                type="button"
                id="start-btn"
                className="btn-primary"
                onClick={handleStart}
              >
                Find my gift &rarr;
              </button>
            </section>
          )}

          {stage === 'quiz' && (
            <section id="quiz-section" className="quiz-section">
              <div className="quiz-progress-bar-wrapper">
                <div className="quiz-progress-header">
                  <span className="quiz-progress-label">GIFT FINDER</span>
                  <span id="progress-text" className="quiz-progress-step">{getProgressText()}</span>
                </div>
                <div className="progress-track">
                  <div id="progress-fill" className={`progress-fill step-${step}`}></div>
                </div>
              </div>

              {step === 1 && (
                <div id="step-1" className="quiz-step">
                  <h2 className="quiz-question">Who are you gifting?</h2>
                  <div className="options-grid options-grid-2">
                    {['Partner', 'Friend', 'Family', 'Colleague'].map((item) => {
                      const icons = {
                        Partner: '💍',
                        Friend: '✨',
                        Family: '🌿',
                        Colleague: '🤝'
                      };
                      return (
                        <button
                          key={item}
                          type="button"
                          className={`option-card ${recipient === item ? 'selected' : ''}`}
                          data-step="1"
                          data-value={item}
                          onClick={() => setRecipient(item)}
                        >
                          <span className="option-icon">{icons[item]}</span>
                          <span className="option-text">
                            <span className="option-title">{item}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="quiz-actions">
                    <button
                      type="button"
                      id="next-1"
                      className="btn-primary"
                      disabled={!recipient}
                      onClick={() => setStep(2)}
                    >
                      Next &rarr;
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div id="step-2" className="quiz-step">
                  <h2 className="quiz-question">What's the occasion?</h2>
                  <div className="options-grid options-grid-2">
                    {[
                      { val: 'Birthday', icon: '🎂' },
                      { val: 'Anniversary', icon: '🥂' },
                      { val: 'Celebration', icon: '🎉' },
                      { val: 'Thank You', icon: '💌' },
                      { val: 'Just Because', icon: '✨', full: true }
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        className={`option-card ${item.full ? 'option-card-full' : ''} ${occasion === item.val ? 'selected' : ''}`}
                        data-step="2"
                        data-value={item.val}
                        onClick={() => setOccasion(item.val)}
                      >
                        <span className="option-icon">{item.icon}</span>
                        <span className="option-text">
                          <span className="option-title">{item.val}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="quiz-actions quiz-actions-split">
                    <button
                      type="button"
                      id="back-2"
                      className="btn-outline"
                      onClick={() => setStep(1)}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      id="next-2"
                      className="btn-primary"
                      disabled={!occasion}
                      onClick={() => setStep(3)}
                    >
                      Next &rarr;
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div id="step-3" className="quiz-step">
                  <h2 className="quiz-question">What's their chocolate mood?</h2>
                  <div className="options-grid options-grid-2">
                    {[
                      { val: 'Bold', desc: 'Dark, intense single-origin (65–85%)' },
                      { val: 'Classic', desc: 'Silky milk chocolate & sweet cream' },
                      { val: 'Playful', desc: 'Fruit, floral & unexpected Indian spices' },
                      { val: 'Surprise me', desc: 'Curated selection from kitchen favourites' }
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        className={`option-card ${mood === item.val ? 'selected' : ''}`}
                        data-step="3"
                        data-value={item.val}
                        onClick={() => setMood(item.val)}
                      >
                        <span className="option-text">
                          <span className="option-title">{item.val}</span>
                          <span className="option-desc">{item.desc}</span>
                        </span>
                      </button>
                    ))}
                  </div>

                  <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(212, 175, 55, 0.2)' }}>
                    <p className="section-tag" style={{ marginBottom: '0.75rem' }}>OPTIONAL DIETARY PREFERENCE</p>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {['None', 'Vegan', 'Gluten-Free', 'Sugar-Free', 'Dairy-Free'].map((d) => (
                        <button
                          key={d}
                          type="button"
                          className={`category-tab ${(dietary === d || (!dietary && d === 'None')) ? 'active' : ''}`}
                          style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}
                          onClick={() => setDietary(d === 'None' ? '' : d)}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="quiz-actions quiz-actions-split" style={{ marginTop: '2rem' }}>
                    <button
                      type="button"
                      id="back-3"
                      className="btn-outline"
                      onClick={() => setStep(2)}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      id="finish-btn"
                      className="btn-primary"
                      disabled={!mood}
                      onClick={handleFinish}
                    >
                      Find my gifts &rarr;
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {stage === 'result' && (
            <section id="result-section" className="result-section">
              <div className="result-header">
                <p className="section-tag">CURATED KITCHEN MATCHES</p>
                <h2 className="result-title">Chocolates tailored to your gift</h2>
              </div>

              {addedNotice && (
                <div className="auth-notice" style={{ marginBottom: '2rem', textAlign: 'center' }}>
                  {addedNotice}
                </div>
              )}

              {loading ? (
                <div className="finder-intro" style={{ padding: '3rem' }}>
                  <p className="section-title" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
                    Searching 60 artisanal chocolates...
                  </p>
                  <p className="intro-desc" style={{ marginBottom: 0 }}>
                    Matching recipient occasion, cocoa percentage, and flavour notes against active kitchen stock.
                  </p>
                </div>
              ) : error ? (
                <div className="finder-intro" style={{ padding: '3rem' }}>
                  <p className="section-title" style={{ fontSize: '1.5rem', color: '#E06C75', marginBottom: '1rem' }}>
                    {error}
                  </p>
                  <button type="button" className="btn-primary" onClick={resetQuiz}>
                    Try Again
                  </button>
                </div>
              ) : recommendations.length === 0 ? (
                <div className="finder-intro" style={{ padding: '3rem' }}>
                  <p className="section-title" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
                    No chocolates matched all criteria
                  </p>
                  {emptySuggestions.length > 0 && (
                    <ul style={{ textAlign: 'left', maxWidth: '30rem', margin: '1rem auto 2rem', color: 'rgba(245, 237, 224, 0.8)' }}>
                      {emptySuggestions.map((s, idx) => (
                        <li key={idx} style={{ marginBottom: '0.5rem' }}>• {s}</li>
                      ))}
                    </ul>
                  )}
                  <button type="button" className="btn-primary" onClick={resetQuiz}>
                    Adjust Preferences
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {recommendations.map((rec) => (
                    <div key={rec.productId} className="result-card">
                      <div className="product-image" style={{ padding: 0, overflow: 'hidden' }}>
                        <img
                          src={rec.image}
                          alt={rec.name}
                          style={{ width: '100%', height: '100%', minHeight: '260px', objectFit: 'cover' }}
                        />
                      </div>
                      <div className="result-content">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <p className="product-code">{rec.category}</p>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: 'rgba(212, 175, 55, 0.2)',
                              color: '#D4AF37',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '9999px',
                              border: '1px solid #D4AF37'
                            }}
                          >
                            {rec.matchPercentage}% MATCH
                          </span>
                        </div>
                        <h3 className="result-product-name">{rec.name}</h3>
                        <p className="result-product-desc">{rec.description}</p>

                        {rec.matchReasons && rec.matchReasons.length > 0 && (
                          <div style={{ background: '#1A0F2E', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                            <p style={{ fontSize: '0.75rem', color: '#D4AF37', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                              WHY IT'S A MATCH:
                            </p>
                            <ul style={{ fontSize: '0.85rem', color: 'rgba(245, 237, 224, 0.85)', lineHeight: 1.5 }}>
                              {rec.matchReasons.map((reason, idx) => (
                                <li key={idx} style={{ marginBottom: '0.25rem' }}>✓ {reason}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <p className="result-product-price">₹{rec.price}</p>

                        <div className="hero-buttons">
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={() => handleAddToCart(rec)}
                          >
                            Add to Cart +
                          </button>
                          <Link
                            to={`/build?product=${rec.productId}`}
                            className="btn-outline"
                          >
                            Build into Box &rarr;
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="result-reset-wrapper" style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <button
                      type="button"
                      id="try-again-btn"
                      className="try-again-btn"
                      onClick={resetQuiz}
                    >
                      Not quite right? Try again
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-grid">
            <div className="footer-brand">
              <p className="footer-brand-name">Cocora</p>
              <p className="footer-brand-desc">
                A small chocolate kitchen in Bandra West. We make twelve things and we
                make them well.
              </p>
            </div>
            <div>
              <p className="footer-heading">Shop</p>
              <ul className="footer-links">
                <li><Link to="/collection">The collection</Link></li>
                <li><Link to="/build">Build a box</Link></li>
                <li><Link to="/#trays">Tray sizes</Link></li>
              </ul>
            </div>
            <div>
              <p className="footer-heading">Kitchen</p>
              <ul className="footer-links">
                <li>Perry Cross Rd, Bandra West</li>
                <li>Tue to Sun, 11am to 8pm</li>
                <li>kitchen@cocora.in</li>
              </ul>
            </div>
          </div>
          <p className="footer-bottom">
            © 2026 Cocora Chocolate Co. — Mumbai
          </p>
        </div>
      </footer>
    </div>
  );
}
