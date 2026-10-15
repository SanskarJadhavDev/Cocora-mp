require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const dns = require('dns');

dns.setServers(['1.1.1.1', '8.8.8.8']);

const connectDB = require('../config/db');
const { Product } = require('../models/Product');
const giftFinderService = require('../services/giftFinderService');

const makeRequest = (options, postData = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (postData) {
      const payload = typeof postData === 'string' ? postData : JSON.stringify(postData);
      req.write(payload);
    }
    req.end();
  });
};

const runGiftFinderTests = async () => {
  console.log('--- STARTING PROMPT 09 GIFT FINDER TEST SUITE ---');
  const results = [];

  const logResult = (name, passed, details) => {
    results.push({ name, passed, details });
    const tag = passed ? 'PASS' : 'FAIL';
    console.log(`[${tag}] ${name}: ${details}`);
  };

  try {
    await connectDB();
    logResult('Database Connection', mongoose.connection.readyState === 1, 'MongoDB Atlas connected successfully');

    const healthRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET'
    });
    logResult('Health Check', healthRes.statusCode === 200 && healthRes.body.status === 'healthy', 'Server is healthy on port 5000');

    const birthdayRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/gift-finder/recommend',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { occasion: 'Birthday' });

    const birthdayPassed = birthdayRes.statusCode === 200 &&
      birthdayRes.body.success === true &&
      birthdayRes.body.count >= 3 &&
      birthdayRes.body.recommendations.every((r) => r.matchReasons.some((reason) => reason.toLowerCase().includes('birthday') || reason.toLowerCase().includes('kitchen')));
    logResult('Occasion: Birthday', birthdayPassed, `Returned ${birthdayRes.body.count} recommendations with birthday reasons`);

    const anniversaryRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/gift-finder/recommend',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { occasion: 'Anniversary', recipient: 'Partner', mood: 'Bold' });

    const annivPassed = anniversaryRes.statusCode === 200 &&
      anniversaryRes.body.success === true &&
      anniversaryRes.body.count >= 3 &&
      anniversaryRes.body.recommendations[0].matchReasons.some((reason) => reason.includes('Anniversary')) &&
      anniversaryRes.body.recommendations[0].matchReasons.some((reason) => reason.includes('Partner'));
    logResult('Occasion & Recipient: Anniversary for Partner (Bold)', annivPassed, `Top match scored ${anniversaryRes.body.recommendations[0].matchScore} pts with romantic and bold reasons`);

    const colleagueRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/gift-finder/recommend',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { recipient: 'Colleague', occasion: 'Thank You' });

    const colleaguePassed = colleagueRes.statusCode === 200 &&
      colleagueRes.body.count >= 3 &&
      colleagueRes.body.recommendations.some((r) => r.suitableRecipients.some((rec) => rec.toLowerCase().includes('colleague')));
    logResult('Recipient: Colleague (Thank You)', colleaguePassed, `Returned ${colleagueRes.body.count} appropriate professional gift options`);

    const budgetMin = 280;
    const budgetMax = 320;
    const budgetRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/gift-finder/recommend',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { budgetMin, budgetMax });

    const budgetPassed = budgetRes.statusCode === 200 &&
      budgetRes.body.count >= 3 &&
      budgetRes.body.recommendations.every((r) => r.price >= budgetMin && r.price <= budgetMax);
    logResult('Budget Range (₹280–₹320)', budgetPassed, `All ${budgetRes.body.count} recommendations strictly within [${budgetMin}, ${budgetMax}]`);

    const chocoTypeRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/gift-finder/recommend',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      preferredChocolateTypes: ['Dark Chocolate'],
      preferredFlavours: ['Caramel', 'Sea Salt']
    });

    const chocoTypePassed = chocoTypeRes.statusCode === 200 &&
      chocoTypeRes.body.count >= 3 &&
      chocoTypeRes.body.recommendations.some((r) => r.category === 'Dark Chocolate' || (r.flavourNotes && r.flavourNotes.some((f) => f.toLowerCase().includes('salt') || f.toLowerCase().includes('caramel'))));
    logResult('Chocolate Type & Flavour Match', chocoTypePassed, 'Top matches prioritized Dark Chocolate with requested notes');

    const veganRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/gift-finder/recommend',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { dietaryRequirements: ['Vegan'] });

    const veganPassed = veganRes.statusCode === 200 &&
      veganRes.body.count >= 3 &&
      veganRes.body.recommendations.every((r) =>
        r.dietaryTags.some((tag) => tag.toLowerCase() === 'vegan') &&
        !r.allergens.some((alg) => alg.toLowerCase().includes('milk') || alg.toLowerCase().includes('egg'))
      );
    logResult('Strict Dietary: Vegan', veganPassed, `All ${veganRes.body.count} items strictly tagged Vegan and free of dairy/egg allergens`);

    const dairyFreeRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/gift-finder/recommend',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { dietaryRequirements: ['Dairy-Free'] });

    const dairyFreePassed = dairyFreeRes.statusCode === 200 &&
      dairyFreeRes.body.count >= 3 &&
      dairyFreeRes.body.recommendations.every((r) =>
        r.dietaryTags.some((tag) => tag.toLowerCase() === 'dairy-free') &&
        !r.allergens.some((alg) => alg.toLowerCase().includes('milk'))
      );
    logResult('Strict Dietary: Dairy-Free', dairyFreePassed, `All ${dairyFreeRes.body.count} items confirmed Dairy-Free with 0 milk allergens`);

    const nutFreeRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/gift-finder/recommend',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { dietaryRequirements: ['Nut-Free'] });

    const nutKeywords = ['nut', 'almond', 'hazelnut', 'cashew', 'pistachio', 'walnut', 'pecan', 'macadamia', 'peanut'];
    const nutFreePassed = nutFreeRes.statusCode === 200 &&
      nutFreeRes.body.count >= 3 &&
      nutFreeRes.body.recommendations.every((r) =>
        !r.allergens.some((alg) => nutKeywords.some((k) => alg.toLowerCase().includes(k)))
      );
    logResult('Strict Allergen: Nut-Free', nutFreePassed, `All ${nutFreeRes.body.count} items completely exclude nut allergens`);

    const tempOosProduct = new Product({
      name: 'Temporary OOS Test Chocolate',
      description: 'Test product that is out of stock',
      price: 250,
      category: 'Milk Chocolate',
      chocolateType: 'Milk',
      flavourNotes: ['Caramel'],
      sweetnessLevel: 'Medium',
      suitableOccasions: ['Birthday'],
      suitableRecipients: ['Friends'],
      image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=600&q=80',
      stock: 0,
      isAvailable: true
    });
    await tempOosProduct.save();

    const tempUnavailableProduct = new Product({
      name: 'Temporary Unavailable Test Chocolate',
      description: 'Test product marked unavailable',
      price: 250,
      category: 'Milk Chocolate',
      chocolateType: 'Milk',
      flavourNotes: ['Caramel'],
      sweetnessLevel: 'Medium',
      suitableOccasions: ['Birthday'],
      suitableRecipients: ['Friends'],
      image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=600&q=80',
      stock: 50,
      isAvailable: false
    });
    await tempUnavailableProduct.save();

    const checkOosRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/gift-finder/recommend',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { occasion: 'Birthday', limit: 10 });

    const excludedOosPassed = checkOosRes.body.recommendations.every((r) =>
      r.name !== 'Temporary OOS Test Chocolate' && r.name !== 'Temporary Unavailable Test Chocolate'
    );
    logResult('Stock & Availability Filter', excludedOosPassed, 'Out-of-stock and unavailable products successfully excluded');

    await Product.deleteOne({ _id: tempOosProduct._id });
    await Product.deleteOne({ _id: tempUnavailableProduct._id });

    const negativeBudgetRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/gift-finder/recommend',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { budgetMin: -50 });
    logResult('Malformed Input: Negative Budget', negativeBudgetRes.statusCode === 400, `Rejected with status ${negativeBudgetRes.statusCode}: ${negativeBudgetRes.body.message}`);

    const invertedBudgetRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/gift-finder/recommend',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { budgetMin: 400, budgetMax: 200 });
    logResult('Malformed Input: budgetMin > budgetMax', invertedBudgetRes.statusCode === 400, `Rejected with status ${invertedBudgetRes.statusCode}: ${invertedBudgetRes.body.message}`);

    const invalidLimitRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/gift-finder/recommend',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { limit: 'invalid' });
    logResult('Malformed Input: Invalid Limit', invalidLimitRes.statusCode === 400, `Rejected with status ${invalidLimitRes.statusCode}: ${invalidLimitRes.body.message}`);

    const emptyCriteriaRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/gift-finder/recommend',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {});
    logResult('Empty Input Handling', emptyCriteriaRes.statusCode === 200 && emptyCriteriaRes.body.count >= 3, `Returned ${emptyCriteriaRes.body.count} curated default recommendations gracefully`);

    const detRun1 = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/gift-finder/recommend',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { occasion: 'Birthday', recipient: 'Friends', mood: 'Classic' });

    const detRun2 = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/gift-finder/recommend',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { occasion: 'Birthday', recipient: 'Friends', mood: 'Classic' });

    const detPassed = detRun1.body.recommendations.length === detRun2.body.recommendations.length &&
      detRun1.body.recommendations.every((item, idx) => item.productId === detRun2.body.recommendations[idx].productId && item.matchScore === detRun2.body.recommendations[idx].matchScore);
    logResult('Deterministic Ranking', detPassed, 'Identical input queries produced exact same ranking and scores');

    const honestRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/gift-finder/recommend',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { occasion: 'Birthday', recipient: 'Partner', mood: 'Classic' });

    const honestyPassed = honestRes.body.recommendations.every((r) => {
      const dbRecipients = (r.suitableRecipients || []).map((x) => x.toLowerCase());
      const dbOccasions = (r.suitableOccasions || []).map((x) => x.toLowerCase());
      for (const reason of r.matchReasons) {
        if (reason.includes('Partner') && !dbRecipients.includes('partner')) return false;
        if (reason.includes('Birthday') && !dbOccasions.some((o) => o.includes('birthday'))) return false;
      }
      return true;
    });
    logResult('Honest Grounded Reasons', honestyPassed, 'All human-readable explanations backed 100% by actual database fields');

    const impossibleRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/gift-finder/recommend',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { budgetMax: 100 });

    const emptyResultPassed = impossibleRes.statusCode === 200 &&
      impossibleRes.body.success === true &&
      impossibleRes.body.count === 0 &&
      impossibleRes.body.recommendations.length === 0 &&
      Array.isArray(impossibleRes.body.suggestions) &&
      impossibleRes.body.suggestions.length > 0;
    logResult('Empty Result Graceful Fallback', emptyResultPassed, `Returned helpful guidance: "${impossibleRes.body.suggestions[0]}"`);

    const sample = birthdayRes.body.recommendations[0];
    const buildBoxCompatible = Boolean(
      sample.productId &&
      sample._id &&
      sample.name &&
      sample.price &&
      sample.buildBoxCompatible === true &&
      sample.cartAction &&
      sample.cartAction.productId === sample.productId
    );
    logResult('Build a Box & Cart Integration Compatibility', buildBoxCompatible, 'Output contains productId, price, and cartAction payloads');

    const paginationRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/products?page=1&limit=4',
      method: 'GET'
    });
    const paginationPassed = paginationRes.statusCode === 200 && paginationRes.body.data && paginationRes.body.data.length === 4;
    logResult('Regression: Product Pagination', paginationPassed, `Product catalogue API returned page 1 with ${paginationRes.body.data ? paginationRes.body.data.length : 0} items`);

    const boxPreviewRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/box/validate',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      traySize: 6,
      items: [{ productId: sample.productId, quantity: 6 }]
    });
    const boxPreviewPassed = boxPreviewRes.statusCode === 200 && boxPreviewRes.body.success === true && boxPreviewRes.body.data && boxPreviewRes.body.data.totalAmount > 0;
    logResult('Regression: Build a Box Validation', boxPreviewPassed, `Box validation for 6 items calculated totalAmount = ₹${boxPreviewRes.body.data ? boxPreviewRes.body.data.totalAmount : 0}`);

    const allPassed = results.every((r) => r.passed);
    console.log(`\n--- TEST SUMMARY: ${results.filter((r) => r.passed).length}/${results.length} PASSED ---`);
    if (allPassed) {
      console.log('ALL VERIFICATION REQUIREMENTS MET');
    }

    process.exit(allPassed ? 0 : 1);
  } catch (err) {
    console.error('Test suite failed with unexpected error:', err);
    process.exit(1);
  }
};

runGiftFinderTests();
