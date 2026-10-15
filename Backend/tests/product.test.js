require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { Product, APPROVED_CATEGORIES } = require('../models/Product');
const User = require('../models/User');

const makeRequest = (options, postData) => {
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
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
};

const runProductVerification = async () => {
  console.log('--- STARTING PROMPT 05 PRODUCT API VERIFICATION ---');
  const results = [];
  const createdProductIds = [];
  const createdUserEmails = [];

  const logResult = (name, passed, details) => {
    results.push({ name, passed, details });
    const tag = passed ? 'PASS' : 'FAIL';
    console.log(`[${tag}] ${name}: ${details}`);
  };

  try {
    const dbConnected = await connectDB();
    if (!dbConnected) {
      logResult('Database Connection', false, 'Unable to connect to MongoDB');
      return;
    }
    logResult('Database Connection', true, 'Connected to MongoDB Atlas');

    const healthRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET'
    });
    if (healthRes.statusCode === 200 && healthRes.body && healthRes.body.status === 'healthy') {
      logResult('Health Endpoint', true, 'GET /api/health returned 200 OK and healthy status');
    } else {
      logResult('Health Endpoint', false, `Status ${healthRes.statusCode}`);
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      logResult('Admin Credentials Check', false, 'ADMIN_EMAIL or ADMIN_PASSWORD missing from .env');
      return;
    }

    const adminLoginRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        email: adminEmail,
        password: adminPassword
      }
    );

    if (adminLoginRes.statusCode !== 200 || !adminLoginRes.body.token) {
      logResult('Admin Authentication', false, `Login failed: HTTP ${adminLoginRes.statusCode}`);
      return;
    }
    const adminToken = adminLoginRes.body.token;
    logResult('Admin Authentication', true, 'Successfully authenticated as provisioned admin');

    const customerEmail = `prod_test_cust_${Date.now()}@cocora.test`;
    createdUserEmails.push(customerEmail);

    const custRegRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        name: 'Test Customer',
        email: customerEmail,
        password: 'Password123!'
      }
    );

    let customerToken = custRegRes.body?.token;
    if (!customerToken) {
      await User.updateOne({ email: customerEmail }, { isEmailVerified: true });
      const loginRes = await makeRequest(
        {
          hostname: 'localhost',
          port: 5000,
          path: '/api/auth/login',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        },
        { email: customerEmail, password: 'Password123!' }
      );
      customerToken = loginRes.body?.token;
    }

    if (!customerToken) {
      logResult('Customer Setup', false, 'Failed to create test customer account');
      return;
    }
    logResult('Customer Setup', true, 'Created test customer for authorization checks');

    const testProductPayload1 = {
      name: 'Single Origin Madagascar 72%',
      description: 'Single origin Madagascar dark chocolate with natural red berry acidity.',
      price: 349,
      category: 'Dark Chocolate',
      chocolateType: 'Dark',
      cocoaPercentage: 72,
      flavourNotes: ['Red Berries', 'Citrus', 'Floral Honey'],
      sweetnessLevel: 'Low',
      ingredients: ['Cocoa Beans', 'Cane Sugar', 'Cocoa Butter'],
      allergens: [],
      dietaryTags: ['Vegan', 'Gluten-Free', 'Single-Origin'],
      suitableOccasions: ['Gifting', 'Self Indulgence', 'Tasting'],
      suitableRecipients: ['Connoisseur', 'Partner', 'Friend'],
      image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b',
      stock: 50,
      isAvailable: true,
      isFeatured: true
    };

    const createProductRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/products',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        }
      },
      testProductPayload1
    );

    let testProductId1 = null;
    if (createProductRes.statusCode === 201 && createProductRes.body.data && createProductRes.body.data._id) {
      testProductId1 = createProductRes.body.data._id;
      createdProductIds.push(testProductId1);

      const dbProduct = await Product.findById(testProductId1);
      const isSavedInDb = dbProduct && dbProduct.name === testProductPayload1.name;
      const slugGenerated = dbProduct && dbProduct.slug === 'single-origin-madagascar-72';

      if (isSavedInDb && slugGenerated) {
        logResult('Admin Product Creation & DB Persistence', true, `Product saved in MongoDB with auto-generated slug: "${dbProduct.slug}"`);
      } else {
        logResult('Admin Product Creation & DB Persistence', false, 'Product created via API but verification in MongoDB failed');
      }
    } else {
      logResult('Admin Product Creation & DB Persistence', false, `HTTP ${createProductRes.statusCode}: ${JSON.stringify(createProductRes.body)}`);
    }

    const publicListRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/products',
      method: 'GET'
    });

    if (
      publicListRes.statusCode === 200 &&
      publicListRes.body.success === true &&
      Array.isArray(publicListRes.body.data) &&
      publicListRes.body.pagination
    ) {
      const foundInList = publicListRes.body.data.some((p) => p._id === testProductId1);
      logResult('Public Collection Endpoint', foundInList, 'GET /api/products returns products list and pagination metadata');
    } else {
      logResult('Public Collection Endpoint', false, `HTTP ${publicListRes.statusCode}`);
    }

    const dummyProductsData = [
      { name: 'Velvet Milk Truffle', price: 199, category: 'Milk Chocolate', isFeatured: false },
      { name: 'Roasted Almond Crunch', price: 249, category: 'Nuts & Praline', isFeatured: false },
      { name: 'Kashmiri Saffron White', price: 399, category: 'Indian & Experimental', isFeatured: true },
      { name: 'Keto Stevia Dark 85%', price: 299, category: 'Zero Sugar', isFeatured: false },
      { name: 'Raspberry Rose Bonbon', price: 279, category: 'Fruit & Floral', isFeatured: true },
      { name: 'Pure White Vanilla Bean', price: 229, category: 'White Chocolate', isFeatured: false },
      { name: 'Pistachio Cardamom Bar', price: 349, category: 'Indian & Experimental', isFeatured: false },
      { name: 'Classic Dark 60%', price: 179, category: 'Dark Chocolate', isFeatured: false },
      { name: 'Hazelnuts Gianduja Block', price: 449, category: 'Nuts & Praline', isFeatured: true }
    ];

    for (const item of dummyProductsData) {
      const createdItem = await Product.create({
        ...item,
        description: `Delightful ${item.name} handcrafted by master chocolatiers.`,
        image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b',
        stock: 25,
        isAvailable: true
      });
      createdProductIds.push(createdItem._id.toString());
    }

    const page1Res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/products?page=1&limit=8',
      method: 'GET'
    });

    const page2Res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/products?page=2&limit=8',
      method: 'GET'
    });

    const paginationPass =
      page1Res.statusCode === 200 &&
      page1Res.body.data.length === 8 &&
      page1Res.body.pagination.currentPage === 1 &&
      page1Res.body.pagination.limit === 8 &&
      page1Res.body.pagination.hasNextPage === true &&
      page2Res.statusCode === 200 &&
      page2Res.body.data.length >= 2 &&
      page2Res.body.pagination.currentPage === 2 &&
      page2Res.body.pagination.hasPrevPage === true;

    logResult(
      'Pagination & Limit Verification',
      paginationPass,
      `Page 1 returned 8 items (hasNext: true), Page 2 returned ${page2Res.body?.data?.length} items (hasPrev: true)`
    );

    const clampRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/products?limit=100',
      method: 'GET'
    });

    const limitClamped = clampRes.statusCode === 200 && clampRes.body.pagination.limit === 24;
    logResult('Page Limit Clamping', limitClamped, 'Limit 100 clamped to maximum 24');

    const catFilterRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/products?category=Indian%20%26%20Experimental',
      method: 'GET'
    });

    const allMatchCat =
      catFilterRes.statusCode === 200 &&
      catFilterRes.body.data.length > 0 &&
      catFilterRes.body.data.every((p) => p.category === 'Indian & Experimental');

    logResult('Category Filtering', allMatchCat, `Filtered by "Indian & Experimental": ${catFilterRes.body?.data?.length} products returned`);

    const invalidCatRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/products?category=NonExistentCategory',
      method: 'GET'
    });

    const invalidCatRejected = invalidCatRes.statusCode === 400 && invalidCatRes.body.success === false;
    logResult('Invalid Category Query Handling', invalidCatRejected, 'HTTP 400 returned for unknown category query');

    const searchRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/products?search=Madagascar',
      method: 'GET'
    });

    const searchPass =
      searchRes.statusCode === 200 &&
      searchRes.body.data.length >= 1 &&
      searchRes.body.data.every((p) => p.name.includes('Madagascar') || p.description.includes('Madagascar'));

    logResult('Name & Keyword Search', searchPass, `Search for "Madagascar" returned ${searchRes.body?.data?.length} matching product(s)`);

    const priceFilterRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/products?minPrice=200&maxPrice=350',
      method: 'GET'
    });

    const priceFilterPass =
      priceFilterRes.statusCode === 200 &&
      priceFilterRes.body.data.length > 0 &&
      priceFilterRes.body.data.every((p) => p.price >= 200 && p.price <= 350);

    logResult('Price Range Filtering', priceFilterPass, `Range 200-350 returned ${priceFilterRes.body?.data?.length} items within bounds`);

    const invalidPriceRangeRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/products?minPrice=500&maxPrice=200',
      method: 'GET'
    });

    const invalidRangePass = invalidPriceRangeRes.statusCode === 400 && invalidPriceRangeRes.body.success === false;
    logResult('Invalid Price Range Rejection', invalidRangePass, 'HTTP 400 returned when minPrice > maxPrice');

    const sortLowRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/products?sort=price-low&limit=10',
      method: 'GET'
    });

    let isAscending = true;
    const lowPrices = sortLowRes.body?.data?.map((p) => p.price) || [];
    for (let i = 0; i < lowPrices.length - 1; i++) {
      if (lowPrices[i] > lowPrices[i + 1]) {
        isAscending = false;
        break;
      }
    }

    const sortHighRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/products?sort=price-high&limit=10',
      method: 'GET'
    });

    let isDescending = true;
    const highPrices = sortHighRes.body?.data?.map((p) => p.price) || [];
    for (let i = 0; i < highPrices.length - 1; i++) {
      if (highPrices[i] < highPrices[i + 1]) {
        isDescending = false;
        break;
      }
    }

    logResult('Price Sorting (low-to-high & high-to-low)', isAscending && isDescending, `Ascending prices: [${lowPrices.slice(0, 4)}...], Descending prices: [${highPrices.slice(0, 4)}...]`);

    const categoriesEndpointRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/products/categories',
      method: 'GET'
    });

    const catEndPass =
      categoriesEndpointRes.statusCode === 200 &&
      Array.isArray(categoriesEndpointRes.body.data) &&
      categoriesEndpointRes.body.data.length === 7 &&
      APPROVED_CATEGORIES.every((cat) => categoriesEndpointRes.body.data.some((item) => item.category === cat && typeof item.count === 'number'));

    logResult('Categories Endpoint', catEndPass, 'GET /api/products/categories returned all 7 approved categories with product counts');

    const featuredEndpointRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/products/featured',
      method: 'GET'
    });

    const featuredPass =
      featuredEndpointRes.statusCode === 200 &&
      Array.isArray(featuredEndpointRes.body.data) &&
      featuredEndpointRes.body.data.length > 0 &&
      featuredEndpointRes.body.data.every((p) => p.isFeatured === true && p.isAvailable === true);

    logResult('Featured Endpoint', featuredPass, `GET /api/products/featured returned ${featuredEndpointRes.body?.data?.length} available featured products`);

    const singleProdRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/products/${testProductId1}`,
      method: 'GET'
    });

    const singleProdPass =
      singleProdRes.statusCode === 200 &&
      singleProdRes.body.success === true &&
      singleProdRes.body.data._id === testProductId1 &&
      singleProdRes.body.data.name === testProductPayload1.name;

    logResult('Single Product by ID', singleProdPass, `GET /api/products/:id returned correct product for ${testProductId1}`);

    const malformedIdRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/products/invalid-id-xyz',
      method: 'GET'
    });

    const nonExistentId = new mongoose.Types.ObjectId();
    const nonExistentIdRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/products/${nonExistentId}`,
      method: 'GET'
    });

    const notFoundPass =
      malformedIdRes.statusCode === 404 &&
      malformedIdRes.body.message === 'Product not found' &&
      nonExistentIdRes.statusCode === 404 &&
      nonExistentIdRes.body.message === 'Product not found';

    logResult('Invalid & Nonexistent ID Handling', notFoundPass, 'Both invalid ObjectId and nonexistent ObjectId returned HTTP 404 Not Found');

    const unauthPostRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/products',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { name: 'Hacked Product' }
    );

    const unauthPutRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/products/${testProductId1}`,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      },
      { name: 'Hacked Edit' }
    );

    const unauthDelRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/products/${testProductId1}`,
      method: 'DELETE'
    });

    const unauthPass =
      unauthPostRes.statusCode === 401 &&
      unauthPutRes.statusCode === 401 &&
      unauthDelRes.statusCode === 401;

    logResult('Unauthenticated Mutations Rejection (401)', unauthPass, 'POST, PUT, DELETE without token all rejected with HTTP 401');

    const custPostRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/products',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`
        }
      },
      { name: 'Customer Product Attempt' }
    );

    const custPutRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/products/${testProductId1}`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`
        }
      },
      { name: 'Customer Edit Attempt' }
    );

    const custDelRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/products/${testProductId1}`,
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${customerToken}`
      }
    });

    const custPass =
      custPostRes.statusCode === 403 &&
      custPutRes.statusCode === 403 &&
      custDelRes.statusCode === 403;

    logResult('Customer Mutations Rejection (403)', custPass, 'POST, PUT, DELETE with customer token all rejected with HTTP 403 Forbidden');

    const updateRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/products/${testProductId1}`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        }
      },
      {
        name: 'Single Origin Madagascar 75% Reserve',
        price: 399,
        stock: 40
      }
    );

    const updatedDoc = await Product.findById(testProductId1);
    const updatePass =
      updateRes.statusCode === 200 &&
      updatedDoc &&
      updatedDoc.price === 399 &&
      updatedDoc.stock === 40 &&
      updatedDoc.slug === 'single-origin-madagascar-75-reserve';

    logResult('Admin Product Update', updatePass, `Updated price to 399, stock to 40, and slug re-generated to "${updatedDoc?.slug}"`);

    const invalidPriceRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/products',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        }
      },
      {
        name: 'Bad Price Bar',
        description: 'Test description',
        price: -50,
        category: 'Milk Chocolate',
        image: 'https://images.unsplash.com/test'
      }
    );

    const invalidStockRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/products',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        }
      },
      {
        name: 'Bad Stock Bar',
        description: 'Test description',
        price: 200,
        category: 'Milk Chocolate',
        image: 'https://images.unsplash.com/test',
        stock: -10
      }
    );

    const invalidCatBodyRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/products',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        }
      },
      {
        name: 'Bad Category Bar',
        description: 'Test description',
        price: 200,
        category: 'Junk Food',
        image: 'https://images.unsplash.com/test'
      }
    );

    const validationPass =
      invalidPriceRes.statusCode === 400 &&
      invalidStockRes.statusCode === 400 &&
      invalidCatBodyRes.statusCode === 400;

    logResult('Payload Validation (Price, Stock, Category)', validationPass, 'Negative price, negative stock, and invalid category rejected with HTTP 400');

    const duplicateSlug1 = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/products',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        }
      },
      {
        name: 'Artisan Dark Praline',
        description: 'First edition dark praline bar.',
        price: 299,
        category: 'Nuts & Praline',
        image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b'
      }
    );

    const duplicateSlug2 = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/products',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        }
      },
      {
        name: 'Artisan Dark Praline',
        description: 'Second edition dark praline bar with duplicate name.',
        price: 319,
        category: 'Nuts & Praline',
        image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b'
      }
    );

    let dupSlugPass = false;
    if (duplicateSlug1.body?.data?._id && duplicateSlug2.body?.data?._id) {
      createdProductIds.push(duplicateSlug1.body.data._id);
      createdProductIds.push(duplicateSlug2.body.data._id);

      const slug1 = duplicateSlug1.body.data.slug;
      const slug2 = duplicateSlug2.body.data.slug;

      dupSlugPass =
        duplicateSlug1.statusCode === 201 &&
        duplicateSlug2.statusCode === 201 &&
        slug1 === 'artisan-dark-praline' &&
        slug2 === 'artisan-dark-praline-1';

      logResult('Duplicate Slug Safe Handling', dupSlugPass, `Slug 1: "${slug1}", Slug 2: "${slug2}" created without collision`);
    } else {
      logResult('Duplicate Slug Safe Handling', false, 'Failed to create products for duplicate slug test');
    }

    const deleteRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/products/${testProductId1}`,
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${adminToken}`
      }
    });

    const deletedFromDb = await Product.findById(testProductId1);
    const deletePass = deleteRes.statusCode === 200 && deletedFromDb === null;
    logResult('Admin Product Deletion', deletePass, `Product ${testProductId1} successfully removed from MongoDB`);

    if (createdProductIds.length > 0) {
      const deleteResult = await Product.deleteMany({ _id: { $in: createdProductIds } });
      logResult('Test Products Cleanup', true, `Removed ${deleteResult.deletedCount} temporary test products from database`);
    }

    if (createdUserEmails.length > 0) {
      const userDelResult = await User.deleteMany({ email: { $in: createdUserEmails } });
      logResult('Test Customer Cleanup', true, `Removed ${userDelResult.deletedCount} temporary test customer(s) from database`);
    }

    const adminUser = await User.findOne({ email: adminEmail });
    const adminPreserved = adminUser && adminUser.role === 'admin';
    logResult('Existing Admin User Preservation', adminPreserved, `Admin account (${adminEmail}) preserved untouched with role: admin`);

    console.log('\n========================================');
    console.log('PRODUCT API VERIFICATION SUMMARY');
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
    console.error('Test execution error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

runProductVerification();
