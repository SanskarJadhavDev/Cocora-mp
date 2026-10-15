const { Product } = require('../models/Product');

const sanitizeString = (val) => {
  if (typeof val !== 'string') return '';
  return val.trim();
};

const sanitizeArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof val === 'string') {
    return val.split(',').map((x) => x.trim()).filter(Boolean);
  }
  return [];
};

const matchesOccasion = (productOccasions, targetOccasion) => {
  if (!targetOccasion || !Array.isArray(productOccasions) || productOccasions.length === 0) {
    return { matched: false, reason: null };
  }

  const target = targetOccasion.toLowerCase().trim();
  const normalized = productOccasions.map((o) => o.toLowerCase());

  if (target === 'birthday') {
    const hasBirthday = normalized.some((o) => o.includes('birthday'));
    if (hasBirthday) {
      return { matched: true, reason: 'Specially recommended for Birthday celebrations' };
    }
  }

  if (target === 'anniversary') {
    const hasAnniversary = normalized.some((o) => o.includes('anniversary') || o.includes('wedding') || o.includes('valentine'));
    if (hasAnniversary) {
      return { matched: true, reason: 'Curated for romantic Anniversary and special milestones' };
    }
  }

  if (target === 'celebration') {
    const hasCelebration = normalized.some((o) => o.includes('celebration') || o.includes('festival') || o.includes('diwali') || o.includes('party'));
    if (hasCelebration) {
      return { matched: true, reason: 'Ideal for festive occasions and joyful celebrations' };
    }
  }

  if (target === 'thank you') {
    const hasThankYou = normalized.some((o) => o.includes('thank you') || o.includes('gratitude') || o.includes('corporate gifting'));
    if (hasThankYou) {
      return { matched: true, reason: 'A gracious choice for expressing heartfelt Thank You wishes' };
    }
  }

  if (target === 'just because') {
    const hasJustBecause = normalized.some((o) => o.includes('casual snacking') || o.includes('self indulgence') || o.includes('movie night') || o.includes('monsoon treat') || o.includes('tasting'));
    if (hasJustBecause) {
      return { matched: true, reason: 'A delightful anytime indulgence Just Because' };
    }
  }

  const direct = productOccasions.find((o) => o.toLowerCase().includes(target) || target.includes(o.toLowerCase()));
  if (direct) {
    return { matched: true, reason: `Matches the ${direct} gifting occasion` };
  }

  return { matched: false, reason: null };
};

const matchesRecipient = (productRecipients, targetRecipient) => {
  if (!targetRecipient || !Array.isArray(productRecipients) || productRecipients.length === 0) {
    return { matched: false, reason: null };
  }

  const target = targetRecipient.toLowerCase().trim();
  const normalized = productRecipients.map((r) => r.toLowerCase());

  if (target === 'partner') {
    if (normalized.some((r) => r.includes('partner'))) {
      return { matched: true, reason: 'Intimately crafted for your Partner' };
    }
  }

  if (target === 'friend' || target === 'friends') {
    if (normalized.some((r) => r.includes('friend'))) {
      return { matched: true, reason: 'A crowd favourite for sharing with Friends' };
    }
  }

  if (target === 'family') {
    if (normalized.some((r) => r.includes('family') || r.includes('parents') || r.includes('kids'))) {
      return { matched: true, reason: 'Wholesome recipe suitable for family sharing' };
    }
  }

  if (target === 'colleague' || target === 'colleagues') {
    if (normalized.some((r) => r.includes('colleague') || r.includes('connoisseur'))) {
      return { matched: true, reason: 'Distinguished profile suitable for Colleagues' };
    }
  }

  if (target === 'kids') {
    if (normalized.some((r) => r.includes('kids'))) {
      return { matched: true, reason: 'Sweet and delightful flavour designed for Kids' };
    }
  }

  if (target === 'parents') {
    if (normalized.some((r) => r.includes('parents') || r.includes('family'))) {
      return { matched: true, reason: 'Refined indulgence curated with care for Parents' };
    }
  }

  if (target === 'connoisseurs') {
    if (normalized.some((r) => r.includes('connoisseur'))) {
      return { matched: true, reason: 'Complex notes selected for passionate Connoisseurs' };
    }
  }

  const direct = productRecipients.find((r) => r.toLowerCase().includes(target) || target.includes(r.toLowerCase()));
  if (direct) {
    return { matched: true, reason: `Recommended for ${direct}` };
  }

  return { matched: false, reason: null };
};

const evaluateDietaryCompliance = (product, dietaryRequirements = [], allergensToAvoid = []) => {
  const productDietaryTags = Array.isArray(product.dietaryTags)
    ? product.dietaryTags.map((t) => t.toLowerCase())
    : [];
  const productAllergens = Array.isArray(product.allergens)
    ? product.allergens.map((a) => a.toLowerCase())
    : [];
  const productIngredients = Array.isArray(product.ingredients)
    ? product.ingredients.map((i) => i.toLowerCase())
    : [];

  const avoidanceList = [...allergensToAvoid.map((a) => a.toLowerCase().trim()).filter(Boolean)];

  for (const rawReq of dietaryRequirements) {
    const req = rawReq.toLowerCase().trim();
    if (!req) continue;

    if (req === 'vegan') {
      if (!productDietaryTags.includes('vegan')) return false;
      if (productAllergens.some((a) => a.includes('milk') || a.includes('egg'))) return false;
    } else if (req === 'vegetarian') {
      if (!productDietaryTags.includes('vegetarian') && !productDietaryTags.includes('vegan')) return false;
    } else if (req === 'gluten-free' || req === 'gluten free') {
      if (!productDietaryTags.includes('gluten-free')) return false;
      if (productAllergens.some((a) => a.includes('gluten') || a.includes('barley') || a.includes('wheat'))) return false;
    } else if (req === 'sugar-free' || req === 'sugar free' || req === 'zero sugar') {
      const isSugarFreeTag = productDietaryTags.includes('sugar-free');
      const isZeroSugarCat = (product.category || '').toLowerCase() === 'zero sugar';
      if (!isSugarFreeTag && !isZeroSugarCat) return false;
    } else if (req === 'dairy-free' || req === 'dairy free') {
      if (!productDietaryTags.includes('dairy-free')) return false;
      if (productAllergens.some((a) => a.includes('milk'))) return false;
    } else if (req === 'keto-friendly' || req === 'keto friendly' || req === 'keto') {
      if (!productDietaryTags.includes('keto-friendly')) return false;
    } else if (req === 'nut-free' || req === 'nut free') {
      avoidanceList.push('nut', 'almond', 'hazelnut', 'cashew', 'pistachio', 'walnut', 'pecan', 'macadamia', 'peanut');
    } else if (req === 'soy-free' || req === 'soy free') {
      avoidanceList.push('soy');
    } else if (req === 'egg-free' || req === 'egg free') {
      avoidanceList.push('egg');
    } else {
      if (!productDietaryTags.includes(req)) return false;
    }
  }

  if (avoidanceList.length > 0) {
    if (!Array.isArray(product.allergens) || product.allergens.length === 0) {
      return false;
    }

    for (const needle of avoidanceList) {
      const allergenMatch = productAllergens.some((a) => a.includes(needle));
      const ingredientMatch = productIngredients.some((i) => i.includes(needle));
      if (allergenMatch || ingredientMatch) {
        return false;
      }
    }
  }

  return true;
};

const calculateScoreAndReasons = (product, criteria) => {
  let score = 0;
  const reasons = [];

  const occasionMatch = matchesOccasion(product.suitableOccasions, criteria.occasion);
  if (occasionMatch.matched) {
    score += 25;
    reasons.push(occasionMatch.reason);
  }

  const recipientMatch = matchesRecipient(product.suitableRecipients, criteria.recipient);
  if (recipientMatch.matched) {
    score += 25;
    reasons.push(recipientMatch.reason);
  }

  const preferredTypes = sanitizeArray(criteria.preferredChocolateTypes).map((t) => t.toLowerCase());
  const productType = (product.chocolateType || '').toLowerCase();
  const productCategory = (product.category || '').toLowerCase();

  if (preferredTypes.length > 0) {
    const matchedType = preferredTypes.find((t) => productType.includes(t) || productCategory.includes(t) || t.includes(productType));
    if (matchedType) {
      score += 20;
      reasons.push(`Crafted in ${product.chocolateType || product.category} matching your preference`);
    }
  } else if (criteria.mood) {
    const mood = criteria.mood.toLowerCase().trim();
    if (mood === 'bold') {
      if (productCategory === 'dark chocolate' || (product.cocoaPercentage && product.cocoaPercentage >= 65)) {
        score += 20;
        reasons.push(`Bold cocoa intensity with ${product.cocoaPercentage || 70}% single-origin notes`);
      } else if (product.cocoaPercentage && product.cocoaPercentage >= 50) {
        score += 12;
        reasons.push(`Deep cocoa notes suited for bold taste profiles`);
      }
    } else if (mood === 'classic') {
      if (productCategory === 'milk chocolate' || productCategory === 'white chocolate' || productCategory === 'nuts & praline') {
        score += 20;
        reasons.push(`Classic and comforting ${product.category} profile`);
      }
    } else if (mood === 'playful') {
      if (productCategory === 'fruit & floral' || productCategory === 'indian & experimental') {
        score += 20;
        reasons.push(`Vibrant and playful flavour profile from our experimental line`);
      }
    } else if (mood === 'surprise me' || mood === 'curated') {
      if (product.isFeatured) {
        score += 18;
        reasons.push('Curated kitchen signature surprise');
      } else {
        score += 12;
      }
    }
  }

  const preferredFlavours = sanitizeArray(criteria.preferredFlavours).map((f) => f.toLowerCase());
  const productNotes = Array.isArray(product.flavourNotes) ? product.flavourNotes : [];
  const normalizedNotes = productNotes.map((n) => n.toLowerCase());

  if (preferredFlavours.length > 0) {
    const matchedNotes = [];
    for (const pf of preferredFlavours) {
      const match = productNotes.find((note) => note.toLowerCase().includes(pf) || pf.includes(note.toLowerCase()));
      if (match && !matchedNotes.includes(match)) {
        matchedNotes.push(match);
      }
    }
    if (matchedNotes.length >= 2) {
      score += 15;
      reasons.push(`Showcases tasting notes of ${matchedNotes.join(' and ')}`);
    } else if (matchedNotes.length === 1) {
      score += 10;
      reasons.push(`Highlights tasting note of ${matchedNotes[0]}`);
    }
  } else if (criteria.mood) {
    const mood = criteria.mood.toLowerCase().trim();
    if (mood === 'bold') {
      const boldKeywords = ['espresso', 'salt', 'roast', 'smoke', 'chilli', 'bitter', 'whiskey', 'spice', 'truffle', 'cacao'];
      const boldMatch = productNotes.find((n) => boldKeywords.some((k) => n.toLowerCase().includes(k)));
      if (boldMatch) {
        score += 10;
        reasons.push(`Features intense flavour notes of ${boldMatch}`);
      }
    } else if (mood === 'classic') {
      const classicKeywords = ['caramel', 'vanilla', 'cream', 'butter', 'malt', 'hazelnut', 'almond', 'toffee', 'praline'];
      const classicMatch = productNotes.find((n) => classicKeywords.some((k) => n.toLowerCase().includes(k)));
      if (classicMatch) {
        score += 10;
        reasons.push(`Features luscious flavour notes of ${classicMatch}`);
      }
    } else if (mood === 'playful') {
      const playfulKeywords = ['berry', 'mango', 'rose', 'passionfruit', 'crisp', 'honey', 'cardamom', 'saffron', 'zest', 'mint', 'pepper'];
      const playfulMatch = productNotes.find((n) => playfulKeywords.some((k) => n.toLowerCase().includes(k)));
      if (playfulMatch) {
        score += 10;
        reasons.push(`Features adventurous flavour notes of ${playfulMatch}`);
      }
    }
  }

  if (criteria.sweetnessPreference) {
    const targetSweetness = criteria.sweetnessPreference.toLowerCase().trim();
    const productSweetness = (product.sweetnessLevel || '').toLowerCase();
    if (productSweetness === targetSweetness) {
      score += 10;
      reasons.push(`Balanced ${product.sweetnessLevel} sweetness matching your preference`);
    } else if (
      (targetSweetness === 'low' && (productSweetness === 'very low' || productSweetness === 'low-medium')) ||
      (targetSweetness === 'medium' && (productSweetness === 'medium-low' || productSweetness === 'medium-high')) ||
      (targetSweetness === 'high' && productSweetness === 'medium-high')
    ) {
      score += 5;
      reasons.push(`${product.sweetnessLevel} sweetness close to desired profile`);
    }
  } else if (criteria.mood) {
    const mood = criteria.mood.toLowerCase().trim();
    const productSweetness = (product.sweetnessLevel || '').toLowerCase();
    if (mood === 'bold' && (productSweetness.includes('low') || productSweetness === 'very low')) {
      score += 8;
      reasons.push('Subtle sweetness that lets cocoa character shine');
    } else if (mood === 'classic' && (productSweetness.includes('medium') || productSweetness.includes('high'))) {
      score += 8;
      reasons.push('Pleasantly sweet and harmonious flavour');
    }
  }

  if (product.isFeatured) {
    score += 5;
    reasons.push('Cocora Kitchen signature house creation');
  }

  const dietaryReqs = sanitizeArray(criteria.dietaryRequirements);
  if (dietaryReqs.length > 0) {
    const matchingTags = [];
    const prodTags = Array.isArray(product.dietaryTags) ? product.dietaryTags : [];
    for (const req of dietaryReqs) {
      const found = prodTags.find((t) => t.toLowerCase() === req.toLowerCase());
      if (found && !matchingTags.includes(found)) {
        matchingTags.push(found);
      }
    }
    if (matchingTags.length > 0) {
      reasons.push(`Verified ${matchingTags.join(' and ')} recipe`);
    }
  }

  const matchPercentage = Math.min(100, Math.max(15, Math.round(score)));

  return {
    score,
    matchPercentage,
    reasons
  };
};

const findGiftRecommendations = async (params = {}) => {
  const occasion = sanitizeString(params.occasion);
  const recipient = sanitizeString(params.recipient);
  const mood = sanitizeString(params.mood);
  const sweetnessPreference = sanitizeString(params.sweetnessPreference);
  const preferredChocolateTypes = sanitizeArray(params.preferredChocolateTypes);
  const preferredFlavours = sanitizeArray(params.preferredFlavours);
  const dietaryRequirements = sanitizeArray(params.dietaryRequirements);
  const allergensToAvoid = sanitizeArray(params.allergensToAvoid);

  let budgetMin = null;
  if (params.budgetMin !== undefined && params.budgetMin !== null && params.budgetMin !== '') {
    const parsedMin = Number(params.budgetMin);
    if (!isNaN(parsedMin) && parsedMin >= 0) {
      budgetMin = parsedMin;
    }
  }

  let budgetMax = null;
  if (params.budgetMax !== undefined && params.budgetMax !== null && params.budgetMax !== '') {
    const parsedMax = Number(params.budgetMax);
    if (!isNaN(parsedMax) && parsedMax >= 0) {
      budgetMax = parsedMax;
    }
  }

  let limit = 4;
  if (params.limit !== undefined && params.limit !== null) {
    const parsedLimit = Number(params.limit);
    if (Number.isInteger(parsedLimit) && parsedLimit >= 1) {
      limit = Math.min(parsedLimit, 10);
    }
  }

  const query = {
    isAvailable: true,
    stock: { $gt: 0 }
  };

  if (budgetMin !== null && budgetMax !== null) {
    query.price = { $gte: budgetMin, $lte: budgetMax };
  } else if (budgetMin !== null) {
    query.price = { $gte: budgetMin };
  } else if (budgetMax !== null) {
    query.price = { $lte: budgetMax };
  }

  const candidates = await Product.find(query)
    .select('_id name slug description price image category chocolateType cocoaPercentage flavourNotes sweetnessLevel dietaryTags allergens ingredients suitableOccasions suitableRecipients isFeatured stock')
    .lean();

  const dietaryCompliant = candidates.filter((product) =>
    evaluateDietaryCompliance(product, dietaryRequirements, allergensToAvoid)
  );

  if (dietaryCompliant.length === 0) {
    const suggestions = [];
    if (budgetMin !== null || budgetMax !== null) {
      suggestions.push('Expand your price range. Cocora artisanal chocolates range between ₹220 and ₹460.');
    }
    if (dietaryRequirements.length > 0 || allergensToAvoid.length > 0) {
      suggestions.push('Consider relaxing one of the dietary tags or allergen constraints.');
    }
    if (suggestions.length === 0) {
      suggestions.push('Try adjusting the recipient or occasion preferences.');
    }

    return {
      success: true,
      count: 0,
      recommendations: [],
      message: 'No chocolates matched all of your selected requirements.',
      suggestions,
      criteriaApplied: {
        occasion,
        recipient,
        mood,
        budgetMin,
        budgetMax,
        preferredChocolateTypes,
        preferredFlavours,
        sweetnessPreference,
        dietaryRequirements,
        allergensToAvoid
      }
    };
  }

  const scoredProducts = dietaryCompliant.map((product) => {
    const { score, matchPercentage, reasons } = calculateScoreAndReasons(product, {
      occasion,
      recipient,
      mood,
      sweetnessPreference,
      preferredChocolateTypes,
      preferredFlavours,
      dietaryRequirements
    });

    return {
      product,
      score,
      matchPercentage,
      reasons: reasons.length > 0 ? reasons : ['Handcrafted premium Cocora chocolate']
    };
  });

  scoredProducts.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    if (a.product.price !== b.product.price) {
      return a.product.price - b.product.price;
    }
    return String(a.product._id).localeCompare(String(b.product._id));
  });

  const selected = scoredProducts.slice(0, limit);

  const recommendations = selected.map((item) => {
    const p = item.product;
    return {
      productId: p._id,
      _id: p._id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: p.price,
      image: p.image,
      category: p.category,
      chocolateType: p.chocolateType,
      cocoaPercentage: p.cocoaPercentage,
      flavourNotes: p.flavourNotes,
      sweetnessLevel: p.sweetnessLevel,
      dietaryTags: p.dietaryTags,
      allergens: p.allergens,
      suitableOccasions: p.suitableOccasions || [],
      suitableRecipients: p.suitableRecipients || [],
      stock: p.stock,
      isFeatured: p.isFeatured,
      matchScore: item.score,
      matchPercentage: item.matchPercentage,
      matchReasons: item.reasons,
      buildBoxCompatible: true,
      cartAction: {
        productId: p._id,
        quantity: 1
      }
    };
  });

  return {
    success: true,
    count: recommendations.length,
    recommendations,
    message: `Found ${recommendations.length} curated gift recommendation${recommendations.length === 1 ? '' : 's'}`,
    criteriaApplied: {
      occasion,
      recipient,
      mood,
      budgetMin,
      budgetMax,
      preferredChocolateTypes,
      preferredFlavours,
      sweetnessPreference,
      dietaryRequirements,
      allergensToAvoid
    }
  };
};

module.exports = {
  findGiftRecommendations,
  matchesOccasion,
  matchesRecipient,
  evaluateDietaryCompliance,
  calculateScoreAndReasons
};
