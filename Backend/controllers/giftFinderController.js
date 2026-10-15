const giftFinderService = require('../services/giftFinderService');

const validateString = (val, fieldName, maxLength = 100) => {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }
  const trimmed = val.trim();
  if (trimmed.length > maxLength) {
    throw new Error(`${fieldName} cannot exceed ${maxLength} characters`);
  }
  return trimmed;
};

const validateStringArray = (val, fieldName, maxItems = 20, maxItemLength = 100) => {
  if (val === undefined || val === null || val === '') return [];
  let list = [];
  if (Array.isArray(val)) {
    list = val;
  } else if (typeof val === 'string') {
    list = val.split(',');
  } else {
    throw new Error(`${fieldName} must be an array or comma-separated string`);
  }

  if (list.length > maxItems) {
    throw new Error(`${fieldName} cannot contain more than ${maxItems} items`);
  }

  return list.map((item) => {
    if (typeof item !== 'string') {
      throw new Error(`Items in ${fieldName} must be strings`);
    }
    const trimmed = item.trim();
    if (trimmed.length > maxItemLength) {
      throw new Error(`Item in ${fieldName} exceeds ${maxItemLength} characters`);
    }
    return trimmed;
  }).filter(Boolean);
};

const validateBudget = (val, fieldName) => {
  if (val === undefined || val === null || val === '') return null;
  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
  if (num < 0) {
    throw new Error(`${fieldName} cannot be negative`);
  }
  return num;
};

const getRecommendations = async (req, res, next) => {
  try {
    const body = req.body || {};

    let occasion = null;
    let recipient = null;
    let mood = null;
    let sweetnessPreference = null;
    let budgetMin = null;
    let budgetMax = null;
    let preferredChocolateTypes = [];
    let preferredFlavours = [];
    let dietaryRequirements = [];
    let allergensToAvoid = [];
    let limit = 4;

    try {
      occasion = validateString(body.occasion, 'occasion');
      recipient = validateString(body.recipient, 'recipient');
      mood = validateString(body.mood, 'mood');
      sweetnessPreference = validateString(body.sweetnessPreference, 'sweetnessPreference');

      budgetMin = validateBudget(body.budgetMin, 'budgetMin');
      budgetMax = validateBudget(body.budgetMax, 'budgetMax');

      if (budgetMin !== null && budgetMax !== null && budgetMin > budgetMax) {
        return res.status(400).json({
          success: false,
          message: 'budgetMin cannot be greater than budgetMax'
        });
      }

      preferredChocolateTypes = validateStringArray(body.preferredChocolateTypes, 'preferredChocolateTypes');
      preferredFlavours = validateStringArray(body.preferredFlavours, 'preferredFlavours');
      dietaryRequirements = validateStringArray(body.dietaryRequirements, 'dietaryRequirements');
      allergensToAvoid = validateStringArray(body.allergensToAvoid, 'allergensToAvoid');

      if (body.limit !== undefined && body.limit !== null && body.limit !== '') {
        const parsedLimit = Number(body.limit);
        if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
          return res.status(400).json({
            success: false,
            message: 'limit must be a positive integer between 1 and 10'
          });
        }
        limit = Math.min(parsedLimit, 10);
      }
    } catch (validationErr) {
      return res.status(400).json({
        success: false,
        message: validationErr.message
      });
    }

    const result = await giftFinderService.findGiftRecommendations({
      occasion,
      recipient,
      mood,
      sweetnessPreference,
      budgetMin,
      budgetMax,
      preferredChocolateTypes,
      preferredFlavours,
      dietaryRequirements,
      allergensToAvoid,
      limit
    });

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getRecommendations,
  validateBudget,
  validateString,
  validateStringArray
};
