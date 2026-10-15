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
  const [preferredChocolateTypes, setPreferredChocolateTypes] = useState([]);
  const [preferredFlavours, setPreferredFlavours] = useState([]);
  const [sweetnessPreference, setSweetnessPreference] = useState('');
  const [dietaryRequirements, setDietaryRequirements] = useState([]);
  const [allergensToAvoid, setAllergensToAvoid] = useState([]);
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');

  const [appliedCriteria, setAppliedCriteria] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [emptySuggestions, setEmptySuggestions] = useState([]);
  const [addedNotice, setAddedNotice] = useState('');

  const handleStart = () => {
    setStage('quiz');
    setStep(1);
  };

  const toggleItem = (list, setList, item) => {
    if (list.includes(item)) {
      setList(list.filter((x) => x !== item));
    } else {
      setList([...list, item]);
    }
  };

  const getBudgetValidation = () => {
    const minVal = budgetMin !== '' && budgetMin !== null ? Number(budgetMin) : null;
    const maxVal = budgetMax !== '' && budgetMax !== null ? Number(budgetMax) : null;

    if (minVal !== null && (isNaN(minVal) || minVal < 0)) {
      return 'Minimum budget cannot be negative or invalid';
    }
    if (maxVal !== null && (isNaN(maxVal) || maxVal < 0)) {
      return 'Maximum budget cannot be negative or invalid';
    }
    if (minVal !== null && maxVal !== null && minVal > maxVal) {
      return 'Minimum budget cannot be greater than maximum budget';
    }
    return '';
  };

  const budgetError = getBudgetValidation();
  const isBudgetValid = !budgetError;

  const budgetPresets = [
    { label: 'All Budgets', min: '', max: '' },
    { label: 'Under ₹300', min: '', max: '300' },
    { label: '₹280 – ₹350', min: '280', max: '350' },
    { label: '₹350 – ₹460', min: '350', max: '460' }
  ];

  const applyBudgetPreset = (preset) => {
    setBudgetMin(preset.min);
    setBudgetMax(preset.max);
  };

  const isPresetActive = (preset) => {
    return String(budgetMin) === String(preset.min) && String(budgetMax) === String(preset.max);
  };

  const handleFinish = async (options = {}) => {
    setLoading(true);
    setError('');
    setStage('result');

    try {
      const payload = {
        limit: 4
      };

      if (recipient) payload.recipient = recipient;
      if (occasion) payload.occasion = occasion;
      if (mood) payload.mood = mood;
      if (sweetnessPreference) payload.sweetnessPreference = sweetnessPreference;

      if (!options.skipBudget) {
        if (budgetMin !== '' && budgetMin !== null && !isNaN(Number(budgetMin))) {
          payload.budgetMin = Number(budgetMin);
        }
        if (budgetMax !== '' && budgetMax !== null && !isNaN(Number(budgetMax))) {
          payload.budgetMax = Number(budgetMax);
        }
      }

      if (preferredChocolateTypes.length > 0) {
        payload.preferredChocolateTypes = preferredChocolateTypes;
      }
      if (preferredFlavours.length > 0) {
        payload.preferredFlavours = preferredFlavours;
      }
      if (dietaryRequirements.length > 0) {
        payload.dietaryRequirements = dietaryRequirements;
      }
      if (allergensToAvoid.length > 0) {
        payload.allergensToAvoid = allergensToAvoid;
      }

      setAppliedCriteria(payload);

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

  const adjustPreferences = () => {
    setStage('quiz');
  };

  const resetQuiz = () => {
    setRecipient('');
    setOccasion('');
    setMood('');
    setPreferredChocolateTypes([]);
    setPreferredFlavours([]);
    setSweetnessPreference('');
    setDietaryRequirements([]);
    setAllergensToAvoid([]);
    setBudgetMin('');
    setBudgetMax('');
    setStep(1);
    setRecommendations([]);
    setEmptySuggestions([]);
    setError('');
    setAppliedCriteria(null);
    setStage('quiz');
  };

  const getProgressText = () => {
    return `${String(step).padStart(2, '0')} / 09`;
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
                Tell us about your recipient, occasion, flavour palette, and dietary needs. Our engine matches real artisanal chocolates tempered fresh in Bandra West.
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
                  <div id="progress-fill" className={`progress-fill step-${step}`} style={{ width: `${(step / 9) * 100}%` }}></div>
                </div>
              </div>

              {step === 1 && (
                <div id="step-1" className="quiz-step">
                  <h2 className="quiz-question">Who are you gifting?</h2>
                  <p className="quiz-step-desc">Select who this curated chocolate gift is for.</p>
                  <div className="options-grid options-grid-2">
                    {[
                      { val: 'Partner', icon: '💍', desc: 'Intimately crafted for your special someone' },
                      { val: 'Friend', icon: '✨', desc: 'A crowd favourite for joyful sharing' },
                      { val: 'Family', icon: '🌿', desc: 'Wholesome indulgence for family gatherings' },
                      { val: 'Colleague', icon: '🤝', desc: 'Distinguished profile suitable for colleagues' },
                      { val: 'Parents', icon: '🏡', desc: 'Refined chocolate crafted with special care' },
                      { val: 'Connoisseurs', icon: '🍫', desc: 'Complex single-origin profiles for cacao lovers' }
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        className={`option-card ${recipient === item.val ? 'selected' : ''}`}
                        data-step="1"
                        data-value={item.val}
                        onClick={() => setRecipient(item.val)}
                      >
                        <span className="option-icon">{item.icon}</span>
                        <span className="option-text">
                          <span className="option-title">{item.val}</span>
                          <span className="option-desc">{item.desc}</span>
                        </span>
                      </button>
                    ))}
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
                  <p className="quiz-step-desc">We tailor recipe themes and gift box presentation to the milestone.</p>
                  <div className="options-grid options-grid-2">
                    {[
                      { val: 'Birthday', icon: '🎂', desc: 'Celebrations & joyful milestones' },
                      { val: 'Anniversary', icon: '🥂', desc: 'Romantic memories & heartfelt moments' },
                      { val: 'Celebration', icon: '🎉', desc: 'Festive treats & joyful gatherings' },
                      { val: 'Thank You', icon: '💌', desc: 'Gratitude expressed in artisanal chocolate' },
                      { val: 'Just Because', icon: '✨', desc: 'Spontaneous anytime indulgence', full: true }
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
                          <span className="option-desc">{item.desc}</span>
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
                  <p className="quiz-step-desc">Pick the general intensity or let our chefs surprise you.</p>
                  <div className="options-grid options-grid-2">
                    {[
                      { val: 'Bold', icon: '☕', desc: 'Dark, intense single-origin (65–85% cacao)' },
                      { val: 'Classic', icon: '🥛', desc: 'Silky smooth milk chocolate & sweet dairy cream' },
                      { val: 'Playful', icon: '🍓', desc: 'Fruit, floral & unexpected Indian spices' },
                      { val: 'Surprise me', icon: '🎁', desc: 'Curated selection from kitchen signature favourites' }
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        className={`option-card ${mood === item.val ? 'selected' : ''}`}
                        data-step="3"
                        data-value={item.val}
                        onClick={() => setMood(item.val)}
                      >
                        <span className="option-icon">{item.icon}</span>
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
                    <div className="quiz-actions-group">
                      <button
                        type="button"
                        id="skip-3"
                        className="btn-skip"
                        onClick={() => {
                          setMood('');
                          setStep(4);
                        }}
                      >
                        Skip
                      </button>
                      <button
                        type="button"
                        id="next-3"
                        className="btn-primary"
                        onClick={() => setStep(4)}
                      >
                        Continue &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div id="step-4" className="quiz-step">
                  <h2 className="quiz-question">Preferred chocolate types?</h2>
                  <p className="quiz-step-desc">Select one or more styles they love, or skip to view all varieties.</p>
                  <div className="options-grid options-grid-2">
                    {[
                      { val: 'Dark Chocolate', icon: '🍫', desc: 'Single-origin, intense roasted cacao & deep undertones' },
                      { val: 'Milk Chocolate', icon: '🥛', desc: 'Velvety, smooth dairy cream & golden cocoa balance' },
                      { val: 'White Chocolate', icon: '🍦', desc: 'Buttery cocoa butter infused with natural vanilla pods' },
                      { val: 'Zero Sugar', icon: '🌿', desc: '100% sugar-free, crafted with natural plant sweeteners' }
                    ].map((item) => {
                      const isSelected = preferredChocolateTypes.includes(item.val);
                      return (
                        <button
                          key={item.val}
                          type="button"
                          className={`option-card ${isSelected ? 'selected' : ''}`}
                          data-step="4"
                          data-value={item.val}
                          onClick={() => toggleItem(preferredChocolateTypes, setPreferredChocolateTypes, item.val)}
                        >
                          <span className="option-icon">{item.icon}</span>
                          <span className="option-text">
                            <span className="option-title">{item.val}</span>
                            <span className="option-desc">{item.desc}</span>
                          </span>
                          <span className="option-checkbox">{isSelected ? '✓' : ''}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="quiz-actions quiz-actions-split">
                    <button
                      type="button"
                      id="back-4"
                      className="btn-outline"
                      onClick={() => setStep(3)}
                    >
                      Back
                    </button>
                    <div className="quiz-actions-group">
                      <button
                        type="button"
                        id="skip-4"
                        className="btn-skip"
                        onClick={() => {
                          setPreferredChocolateTypes([]);
                          setStep(5);
                        }}
                      >
                        Skip
                      </button>
                      <button
                        type="button"
                        id="next-4"
                        className="btn-primary"
                        onClick={() => setStep(5)}
                      >
                        Continue &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div id="step-5" className="quiz-step">
                  <h2 className="quiz-question">Which flavour notes do they love?</h2>
                  <p className="quiz-step-desc">Select their favourite flavour accents, or skip.</p>
                  <div className="options-grid options-grid-2">
                    {[
                      { val: 'Caramel', icon: '🍯', desc: 'Salted toffee, golden syrup & dulce de leche' },
                      { val: 'Sea Salt', icon: '🌊', desc: 'Flaked fleur de sel & clean mineral finish' },
                      { val: 'Vanilla', icon: '🌸', desc: 'Madagascar bourbon vanilla beans & sweet cream' },
                      { val: 'Hazelnut', icon: '🌰', desc: 'Roasted hazelnuts, almond flakes & nutty praline' },
                      { val: 'Espresso', icon: '☕', desc: 'Dark roast arabica beans & crunchy cocoa nibs' },
                      { val: 'Berry', icon: '🍓', desc: 'Tart raspberry, strawberry coulis & fruit vibrancy' },
                      { val: 'Spices', icon: '✨', desc: 'Ceylon cinnamon, green cardamom & warm nutmeg' },
                      { val: 'Honey', icon: '🐝', desc: 'Fragrant wildflower honey & golden honeycomb' }
                    ].map((item) => {
                      const isSelected = preferredFlavours.includes(item.val);
                      return (
                        <button
                          key={item.val}
                          type="button"
                          className={`option-card ${isSelected ? 'selected' : ''}`}
                          data-step="5"
                          data-value={item.val}
                          onClick={() => toggleItem(preferredFlavours, setPreferredFlavours, item.val)}
                        >
                          <span className="option-icon">{item.icon}</span>
                          <span className="option-text">
                            <span className="option-title">{item.val}</span>
                            <span className="option-desc">{item.desc}</span>
                          </span>
                          <span className="option-checkbox">{isSelected ? '✓' : ''}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="quiz-actions quiz-actions-split">
                    <button
                      type="button"
                      id="back-5"
                      className="btn-outline"
                      onClick={() => setStep(4)}
                    >
                      Back
                    </button>
                    <div className="quiz-actions-group">
                      <button
                        type="button"
                        id="skip-5"
                        className="btn-skip"
                        onClick={() => {
                          setPreferredFlavours([]);
                          setStep(6);
                        }}
                      >
                        Skip
                      </button>
                      <button
                        type="button"
                        id="next-5"
                        className="btn-primary"
                        onClick={() => setStep(6)}
                      >
                        Continue &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {step === 6 && (
                <div id="step-6" className="quiz-step">
                  <h2 className="quiz-question">What is their sweetness preference?</h2>
                  <p className="quiz-step-desc">Guide the balance between cacao intensity and sweetness.</p>
                  <div className="options-grid">
                    {[
                      { val: 'Low', icon: '🌑', desc: 'Subtle sweetness that lets pure cocoa terroir and deep roasting shine' },
                      { val: 'Medium', icon: '🌓', desc: 'Harmonious, classic balance between smooth cocoa and refined sweetness' },
                      { val: 'High', icon: '🌕', desc: 'Luscious, dessert-forward profile with velvety dairy richness' }
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        className={`option-card ${sweetnessPreference === item.val ? 'selected' : ''}`}
                        data-step="6"
                        data-value={item.val}
                        onClick={() => setSweetnessPreference(sweetnessPreference === item.val ? '' : item.val)}
                      >
                        <span className="option-icon">{item.icon}</span>
                        <span className="option-text">
                          <span className="option-title">{item.val} Sweetness</span>
                          <span className="option-desc">{item.desc}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="quiz-actions quiz-actions-split">
                    <button
                      type="button"
                      id="back-6"
                      className="btn-outline"
                      onClick={() => setStep(5)}
                    >
                      Back
                    </button>
                    <div className="quiz-actions-group">
                      <button
                        type="button"
                        id="skip-6"
                        className="btn-skip"
                        onClick={() => {
                          setSweetnessPreference('');
                          setStep(7);
                        }}
                      >
                        Skip
                      </button>
                      <button
                        type="button"
                        id="next-6"
                        className="btn-primary"
                        onClick={() => setStep(7)}
                      >
                        Continue &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {step === 7 && (
                <div id="step-7" className="quiz-step">
                  <h2 className="quiz-question">Any dietary requirements?</h2>
                  <p className="quiz-step-desc">We'll strictly match chocolates verified for these lifestyles.</p>
                  <div className="options-grid options-grid-2">
                    {[
                      { val: 'Vegetarian', icon: '🌱', desc: 'Pure vegetarian-certified cocoa recipes' },
                      { val: 'Vegan', icon: '🌿', desc: '100% plant-based, strictly dairy-free & egg-free' },
                      { val: 'Gluten-Free', icon: '🌾', desc: 'Free of barley, wheat, or gluten traces' },
                      { val: 'Dairy-Free', icon: '🥛', desc: 'Strictly zero milk, cream, or dairy allergens' },
                      { val: 'Sugar-Free', icon: '✨', desc: 'Zero added cane sugar, keto & diabetic friendly' },
                      { val: 'Keto-Friendly', icon: '🥑', desc: 'High cocoa butter fats with minimal net carbs' },
                      { val: 'Nut-Free', icon: '🥜', desc: 'Recipe and facility excluded from nut processing' }
                    ].map((item) => {
                      const isSelected = dietaryRequirements.includes(item.val);
                      return (
                        <button
                          key={item.val}
                          type="button"
                          className={`option-card ${isSelected ? 'selected' : ''}`}
                          data-step="7"
                          data-value={item.val}
                          onClick={() => toggleItem(dietaryRequirements, setDietaryRequirements, item.val)}
                        >
                          <span className="option-icon">{item.icon}</span>
                          <span className="option-text">
                            <span className="option-title">{item.val}</span>
                            <span className="option-desc">{item.desc}</span>
                          </span>
                          <span className="option-checkbox">{isSelected ? '✓' : ''}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="quiz-actions quiz-actions-split">
                    <button
                      type="button"
                      id="back-7"
                      className="btn-outline"
                      onClick={() => setStep(6)}
                    >
                      Back
                    </button>
                    <div className="quiz-actions-group">
                      <button
                        type="button"
                        id="skip-7"
                        className="btn-skip"
                        onClick={() => {
                          setDietaryRequirements([]);
                          setStep(8);
                        }}
                      >
                        Skip
                      </button>
                      <button
                        type="button"
                        id="next-7"
                        className="btn-primary"
                        onClick={() => setStep(8)}
                      >
                        Continue &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {step === 8 && (
                <div id="step-8" className="quiz-step">
                  <h2 className="quiz-question">Any allergens to avoid?</h2>
                  <p className="quiz-step-desc">We will strictly exclude recipes containing any of these ingredients.</p>
                  <div className="options-grid options-grid-2">
                    {[
                      { val: 'Nuts', icon: '🌰', desc: 'Tree nuts: hazelnuts, almonds, cashews, pistachios' },
                      { val: 'Milk', icon: '🥛', desc: 'Dairy: milk powder, cream, butter' },
                      { val: 'Gluten', icon: '🌾', desc: 'Wheat, barley malt extract, crisped pearls' },
                      { val: 'Soy', icon: '🫘', desc: 'Soy lecithin emulsifiers' },
                      { val: 'Egg', icon: '🥚', desc: 'Baked meringue & egg whites' },
                      { val: 'Sesame', icon: '🌱', desc: 'Sesame seeds and paste' }
                    ].map((item) => {
                      const isSelected = allergensToAvoid.includes(item.val);
                      return (
                        <button
                          key={item.val}
                          type="button"
                          className={`option-card ${isSelected ? 'selected' : ''}`}
                          data-step="8"
                          data-value={item.val}
                          onClick={() => toggleItem(allergensToAvoid, setAllergensToAvoid, item.val)}
                        >
                          <span className="option-icon">{item.icon}</span>
                          <span className="option-text">
                            <span className="option-title">Avoid {item.val}</span>
                            <span className="option-desc">{item.desc}</span>
                          </span>
                          <span className="option-checkbox">{isSelected ? '✓' : ''}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="quiz-actions quiz-actions-split">
                    <button
                      type="button"
                      id="back-8"
                      className="btn-outline"
                      onClick={() => setStep(7)}
                    >
                      Back
                    </button>
                    <div className="quiz-actions-group">
                      <button
                        type="button"
                        id="skip-8"
                        className="btn-skip"
                        onClick={() => {
                          setAllergensToAvoid([]);
                          setStep(9);
                        }}
                      >
                        Skip
                      </button>
                      <button
                        type="button"
                        id="next-8"
                        className="btn-primary"
                        onClick={() => setStep(9)}
                      >
                        Continue &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {step === 9 && (
                <div id="step-9" className="quiz-step">
                  <h2 className="quiz-question">What's your budget range?</h2>
                  <p className="quiz-step-desc">Cocora artisanal chocolates range between ₹220 and ₹460.</p>

                  <div className="budget-presets">
                    {budgetPresets.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        className={`budget-preset-btn ${isPresetActive(preset) ? 'active' : ''}`}
                        onClick={() => applyBudgetPreset(preset)}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="budget-grid">
                    <div className="budget-group">
                      <label htmlFor="budget-min" className="budget-label">Minimum Price (₹)</label>
                      <div className="budget-input-wrapper">
                        <span className="budget-currency">₹</span>
                        <input
                          type="number"
                          id="budget-min"
                          className={`budget-input ${budgetError ? 'input-error' : ''}`}
                          placeholder="e.g. 250"
                          min="0"
                          step="10"
                          value={budgetMin}
                          onChange={(e) => setBudgetMin(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="budget-group">
                      <label htmlFor="budget-max" className="budget-label">Maximum Price (₹)</label>
                      <div className="budget-input-wrapper">
                        <span className="budget-currency">₹</span>
                        <input
                          type="number"
                          id="budget-max"
                          className={`budget-input ${budgetError ? 'input-error' : ''}`}
                          placeholder="e.g. 350"
                          min="0"
                          step="10"
                          value={budgetMax}
                          onChange={(e) => setBudgetMax(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {budgetError && (
                    <p className="budget-error-msg">{budgetError}</p>
                  )}

                  <div className="quiz-actions quiz-actions-split" style={{ marginTop: '2rem' }}>
                    <button
                      type="button"
                      id="back-9"
                      className="btn-outline"
                      onClick={() => setStep(8)}
                    >
                      Back
                    </button>
                    <div className="quiz-actions-group">
                      <button
                        type="button"
                        id="skip-9"
                        className="btn-skip"
                        onClick={() => {
                          setBudgetMin('');
                          setBudgetMax('');
                          handleFinish({ skipBudget: true });
                        }}
                      >
                        Skip
                      </button>
                      <button
                        type="button"
                        id="finish-btn"
                        className="btn-primary"
                        disabled={!isBudgetValid || loading}
                        onClick={() => handleFinish()}
                      >
                        Find my gifts &rarr;
                      </button>
                    </div>
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

              {appliedCriteria && (
                <div className="criteria-summary">
                  {appliedCriteria.recipient && <span className="criteria-pill">Recipient: {appliedCriteria.recipient}</span>}
                  {appliedCriteria.occasion && <span className="criteria-pill">Occasion: {appliedCriteria.occasion}</span>}
                  {appliedCriteria.mood && <span className="criteria-pill">Mood: {appliedCriteria.mood}</span>}
                  {appliedCriteria.sweetnessPreference && <span className="criteria-pill">Sweetness: {appliedCriteria.sweetnessPreference}</span>}
                  {appliedCriteria.preferredChocolateTypes && appliedCriteria.preferredChocolateTypes.length > 0 && (
                    <span className="criteria-pill">Types: {appliedCriteria.preferredChocolateTypes.join(', ')}</span>
                  )}
                  {appliedCriteria.preferredFlavours && appliedCriteria.preferredFlavours.length > 0 && (
                    <span className="criteria-pill">Flavours: {appliedCriteria.preferredFlavours.join(', ')}</span>
                  )}
                  {appliedCriteria.dietaryRequirements && appliedCriteria.dietaryRequirements.length > 0 && (
                    <span className="criteria-pill">Dietary: {appliedCriteria.dietaryRequirements.join(', ')}</span>
                  )}
                  {appliedCriteria.allergensToAvoid && appliedCriteria.allergensToAvoid.length > 0 && (
                    <span className="criteria-pill">Excludes: {appliedCriteria.allergensToAvoid.join(', ')}</span>
                  )}
                  {(appliedCriteria.budgetMin !== undefined || appliedCriteria.budgetMax !== undefined) && (
                    <span className="criteria-pill">
                      Budget: {appliedCriteria.budgetMin !== undefined ? `₹${appliedCriteria.budgetMin}` : '₹0'} – {appliedCriteria.budgetMax !== undefined ? `₹${appliedCriteria.budgetMax}` : 'No max'}
                    </span>
                  )}
                </div>
              )}

              {addedNotice && (
                <div className="auth-notice" style={{ marginBottom: '2rem', textAlign: 'center' }}>
                  {addedNotice}
                </div>
              )}

              {loading ? (
                <div className="finder-intro" style={{ padding: '3rem' }}>
                  <p className="section-title" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
                    Searching artisanal chocolates...
                  </p>
                  <p className="intro-desc" style={{ marginBottom: 0 }}>
                    Matching recipient occasion, flavour notes, sweetness, dietary standards, and budget against active kitchen stock.
                  </p>
                </div>
              ) : error ? (
                <div className="finder-intro" style={{ padding: '3rem' }}>
                  <p className="section-title" style={{ fontSize: '1.5rem', color: '#E06C75', marginBottom: '1rem' }}>
                    {error}
                  </p>
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button type="button" className="btn-primary" onClick={adjustPreferences}>
                      Adjust Preferences
                    </button>
                    <button type="button" className="btn-outline" onClick={resetQuiz}>
                      Start Over
                    </button>
                  </div>
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
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button type="button" className="btn-primary" onClick={adjustPreferences}>
                      Adjust Preferences
                    </button>
                    <button type="button" className="btn-outline" onClick={resetQuiz}>
                      Start Over
                    </button>
                  </div>
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

                  <div className="result-reset-wrapper" style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '1rem' }}>
                    <button
                      type="button"
                      id="adjust-btn"
                      className="try-again-btn"
                      onClick={adjustPreferences}
                    >
                      Adjust preferences
                    </button>
                    <button
                      type="button"
                      id="try-again-btn"
                      className="try-again-btn"
                      onClick={resetQuiz}
                    >
                      Start new quiz
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
