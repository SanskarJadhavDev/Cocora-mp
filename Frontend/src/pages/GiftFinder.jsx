import { useState } from 'react'
import { Link } from 'react-router-dom'
import '../css/gift-finder.css'

export default function GiftFinder() {
  const [stage, setStage] = useState('intro')
  const [step, setStep] = useState(1)
  const [recipient, setRecipient] = useState('')
  const [occasion, setOccasion] = useState('')
  const [mood, setMood] = useState('')
  const [result, setResult] = useState(null)

  const handleStart = () => {
    setStage('quiz')
    setStep(1)
  }

  const handleFinish = () => {
    let name = ''
    let desc = ''
    let price = ''
    let link = ''
    let code = ''
    let visualClass = ''

    if (recipient === 'Partner' && occasion === 'Anniversary' && mood === 'Classic') {
      name = 'Ivory Cardamom'
      desc = 'White chocolate, green cardamom ground the same day.'
      price = '₹190'
      link = '/build?product=ivory-cardamom'
      code = 'CCR-03'
      visualClass = 'choco-3'
    } else if (recipient === 'Friend' && occasion === 'Birthday' && mood === 'Playful') {
      name = 'Ember'
      desc = 'Dark ganache cut with Kashmiri chilli. Heat arrives late.'
      price = '₹180'
      link = '/build?product=ember'
      code = 'CCR-02'
      visualClass = 'choco-2'
    } else if (recipient === 'Colleague' && occasion === 'Thank You' && mood === 'Bold') {
      name = 'Obsidian'
      desc = '72% dark, flaked sea salt, a long bitter finish.'
      price = '₹200'
      link = '/build?product=obsidian'
      code = 'CCR-01'
      visualClass = 'choco-1'
    } else {
      name = 'Cocora Signature Box'
      desc = 'A curated selection of Cocora chocolates that makes gifting easy.'
      price = '₹1699'
      link = '/build?product=signature-box'
      code = 'CCR-BOX-12'
      visualClass = 'choco-signature'
    }

    setResult({ name, desc, price, link, code, visualClass })
    setStage('result')
  }

  const resetQuiz = () => {
    setRecipient('')
    setOccasion('')
    setMood('')
    setStep(1)
    setStage('quiz')
  }

  const getProgressText = () => {
    if (step === 1) return '01 / 03'
    if (step === 2) return '02 / 03'
    return '03 / 03'
  }

  return (
    <div>
      <main className="finder-main">
        <div className="finder-container">
          {stage === 'intro' && (
            <section id="intro-section" className="finder-intro">
              <p className="section-tag">GIFT FINDER</p>
              <h1 className="intro-title">
                Not sure what to gift?<br />
                <span className="intro-highlight">We'll find the sweet spot.</span>
              </h1>
              <p className="intro-desc">Answer three quick questions and we'll match you with a Cocora gift.</p>
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
                      }
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
                      )
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
                      { val: 'Bold', desc: 'Dark, intense & sophisticated' },
                      { val: 'Classic', desc: 'Smooth, creamy & familiar' },
                      { val: 'Playful', desc: 'Sweet with something unexpected' },
                      { val: 'Surprise me', desc: 'You choose. We trust you.' }
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
                  <div className="quiz-actions quiz-actions-split">
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
                      Find my gift &rarr;
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {stage === 'result' && result && (
            <section id="result-section" className="result-section">
              <div className="result-header">
                <p className="section-tag">CURATED MATCH</p>
                <h2 className="result-title">We found their kind of chocolate.</h2>
              </div>

              <div className="result-card">
                <div id="result-image-wrapper" className={`product-image ${result.visualClass}`}>
                  <div className="chocolate-tray">
                    <div className="chocolate-piece"></div>
                    <div className="chocolate-piece"></div>
                    <div className="chocolate-piece"></div>
                    <div className="chocolate-piece"></div>
                    <div className="chocolate-piece"></div>
                    <div className="chocolate-piece"></div>
                    <div className="chocolate-piece"></div>
                    <div className="chocolate-piece"></div>
                    <div className="chocolate-piece"></div>
                  </div>
                </div>
                <div className="result-content">
                  <p id="result-code" className="product-code">{result.code}</p>
                  <h3 id="result-name" className="result-product-name">{result.name}</h3>
                  <p id="result-desc" className="result-product-desc">{result.desc}</p>
                  <p id="result-price" className="result-product-price">{result.price}</p>
                  <div className="result-action-bar">
                    <Link
                      id="result-build-link"
                      to={result.link}
                      className="btn-primary"
                    >
                      Build this box &rarr;
                    </Link>
                  </div>
                </div>
              </div>

              <div className="result-reset-wrapper">
                <button
                  type="button"
                  id="try-again-btn"
                  className="try-again-btn"
                  onClick={resetQuiz}
                >
                  Not quite right? Try again
                </button>
              </div>
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
  )
}
