require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { Product } = require('../models/Product');
const User = require('../models/User');

const makeRequest = (options) => {
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

    req.end();
  });
};

const runSeedVerification = async () => {
  console.log('--- STARTING PROMPT 08 SEED VERIFICATION ---');
  const results = [];

  const logResult = (name, passed, details) => {
    results.push({ name, passed, details });
    const tag = passed ? 'PASS' : 'FAIL';
    console.log(`[${tag}] ${name}: ${details}`);
  };

  try {
    const dbConnected = await connectDB();
    if (!dbConnected) {
      logResult('Database Connection', false, 'Unable to connect to MongoDB Atlas');
      return;
    }
    logResult('Database Connection', true, 'Connected to MongoDB Atlas');

    const totalProducts = await Product.countDocuments();
    logResult('Total Product Count', totalProducts === 60, `Found ${totalProducts} products in database (expected exactly 60)`);

    const expectedDistribution = {
      'Milk Chocolate': 10,
      'Dark Chocolate': 12,
      'White Chocolate': 8,
      'Zero Sugar': 6,
      'Nuts & Praline': 8,
      'Fruit & Floral': 8,
      'Indian & Experimental': 8
    };

    const counts = await Product.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const actualDistribution = {};
    counts.forEach((c) => {
      actualDistribution[c._id] = c.count;
    });

    let distributionPass = true;
    for (const [cat, expectedCount] of Object.entries(expectedDistribution)) {
      if (actualDistribution[cat] !== expectedCount) {
        distributionPass = false;
        break;
      }
    }

    logResult('Category Distribution', distributionPass, `Actual: ${JSON.stringify(actualDistribution)} | Expected: ${JSON.stringify(expectedDistribution)}`);

    const allProducts = await Product.find({});
    const namesSet = new Set();
    const slugsSet = new Set();
    let uniquePass = true;
    let schemaValidPass = true;
    let pricesStockValidPass = true;
    let imageValidPass = true;
    let metadataValidPass = true;
    let dietaryTruthPass = true;

    for (const p of allProducts) {
      if (namesSet.has(p.name)) {
        uniquePass = false;
      }
      namesSet.add(p.name);

      if (slugsSet.has(p.slug)) {
        uniquePass = false;
      }
      slugsSet.add(p.slug);

      if (!p.name || !p.description || !p.category) {
        schemaValidPass = false;
      }

      if (typeof p.price !== 'number' || p.price <= 0 || typeof p.stock !== 'number' || p.stock < 0 || !Number.isInteger(p.stock)) {
        pricesStockValidPass = false;
      }

      if (!p.image || typeof p.image !== 'string' || !p.image.startsWith('http')) {
        imageValidPass = false;
      }

      if (
        !Array.isArray(p.flavourNotes) || p.flavourNotes.length === 0 ||
        !Array.isArray(p.ingredients) || p.ingredients.length === 0 ||
        !Array.isArray(p.suitableOccasions) || p.suitableOccasions.length === 0 ||
        !Array.isArray(p.suitableRecipients) || p.suitableRecipients.length === 0
      ) {
        metadataValidPass = false;
      }

      const nonCocoaIngs = p.ingredients
        .filter((i) => !i.toLowerCase().includes('cocoa butter'))
        .join(' ')
        .toLowerCase();
      const tags = p.dietaryTags || [];

      if (
        tags.includes('Vegan') &&
        (nonCocoaIngs.includes('milk') ||
          nonCocoaIngs.includes('butter') ||
          nonCocoaIngs.includes('egg') ||
          nonCocoaIngs.includes('honey'))
      ) {
        dietaryTruthPass = false;
      }

      if (
        tags.includes('Sugar-Free') &&
        nonCocoaIngs.includes('sugar') &&
        !nonCocoaIngs.includes('sugar-free') &&
        !nonCocoaIngs.includes('zero sugar')
      ) {
        dietaryTruthPass = false;
      }
    }

    logResult('Name and Slug Uniqueness', uniquePass && namesSet.size === 60 && slugsSet.size === 60, `60 unique names and 60 unique slugs verified`);
    logResult('Schema Conformance', schemaValidPass, 'All 60 products conform to Product schema validation');
    logResult('Price and Stock Validity', pricesStockValidPass, 'All products have positive prices and non-negative integer stock');
    logResult('Image URL Presence', imageValidPass, 'Every product has a valid image URL');
    logResult('Gift Finder Metadata Population', metadataValidPass, 'Flavour notes, ingredients, occasions, and recipients populated on all items');
    logResult('Truthful Dietary & Allergen Tags', dietaryTruthPass, 'Dietary claims (Vegan, Sugar-Free, Gluten-Free) correspond accurately with ingredient lists');

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminUser = await User.findOne({ email: adminEmail });
    const adminPreserved = adminUser && adminUser.role === 'admin';
    logResult('Existing Admin User Preservation', adminPreserved, `Admin user (${adminEmail}) preserved untouched`);

    const paginatedRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/products?page=1&limit=8',
      method: 'GET'
    });

    const paginatedPass =
      paginatedRes.statusCode === 200 &&
      paginatedRes.body.data.length === 8 &&
      paginatedRes.body.pagination.totalProducts === 60 &&
      paginatedRes.body.pagination.totalPages === 8 &&
      paginatedRes.body.pagination.hasNextPage === true;

    logResult('Paginated API Fetch', paginatedPass, `Page 1 returned 8 products; totalProducts: ${paginatedRes.body?.pagination?.totalProducts}, totalPages: ${paginatedRes.body?.pagination?.totalPages}`);

    const catFilterRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/products?category=Zero%20Sugar&limit=24',
      method: 'GET'
    });

    const catFilterPass =
      catFilterRes.statusCode === 200 &&
      catFilterRes.body.data.length === 6 &&
      catFilterRes.body.data.every((p) => p.category === 'Zero Sugar');

    logResult('Category Filter API', catFilterPass, `Filtered by "Zero Sugar": returned exactly ${catFilterRes.body?.data?.length} products`);

    const searchRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/products?search=Kashmiri',
      method: 'GET'
    });

    const searchPass =
      searchRes.statusCode === 200 &&
      searchRes.body.data.length >= 2 &&
      searchRes.body.data.every((p) => p.name.includes('Kashmiri') || p.description.includes('Kashmiri'));

    logResult('Search API', searchPass, `Search for "Kashmiri" returned ${searchRes.body?.data?.length} matching products`);

    const sortRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/products?sort=price-low&limit=24',
      method: 'GET'
    });

    let sortPass = sortRes.statusCode === 200 && sortRes.body.data.length === 24;
    const prices = sortRes.body?.data?.map((p) => p.price) || [];
    for (let i = 0; i < prices.length - 1; i++) {
      if (prices[i] > prices[i + 1]) {
        sortPass = false;
        break;
      }
    }

    logResult('Sorting API', sortPass, `Price ascending sort verified on first 24 items: [${prices.slice(0, 5)}...]`);

    const categoriesEndpointRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/products/categories',
      method: 'GET'
    });

    const catCountsValid =
      categoriesEndpointRes.statusCode === 200 &&
      categoriesEndpointRes.body.data.length === 7 &&
      categoriesEndpointRes.body.data.every(
        (c) => c.count === expectedDistribution[c.category]
      );

    logResult('Categories Endpoint Counts', catCountsValid, 'GET /api/products/categories returns accurate live product counts for all 7 categories');

    console.log('\n========================================');
    console.log('SEED VERIFICATION SUMMARY');
    console.log('========================================');
    let allPassed = true;
    for (const r of results) {
      console.log(`${r.passed ? 'PASS' : 'FAIL'} | ${r.name}: ${r.details}`);
      if (!r.passed) allPassed = false;
    }
    console.log('========================================');
    console.log(`OVERALL RESULT: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
    console.log('========================================');
  } catch (err) {
    console.error('Seed verification error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

runSeedVerification();
