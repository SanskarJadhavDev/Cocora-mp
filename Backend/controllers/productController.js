const mongoose = require('mongoose');
const { Product, APPROVED_CATEGORIES } = require('../models/Product');

const sanitizeStringArray = (input) => {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof input === 'string') {
    return input.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

const getProducts = async (req, res, next) => {
  try {
    let page = 1;
    if (req.query.page !== undefined) {
      const parsedPage = Number(req.query.page);
      if (!Number.isInteger(parsedPage) || parsedPage < 1) {
        return res.status(400).json({
          success: false,
          message: 'Page must be a positive integer'
        });
      }
      page = parsedPage;
    }

    let limit = 8;
    if (req.query.limit !== undefined) {
      const parsedLimit = Number(req.query.limit);
      if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
        return res.status(400).json({
          success: false,
          message: 'Limit must be a positive integer'
        });
      }
      limit = Math.min(parsedLimit, 24);
    }

    const filter = { isAvailable: true };

    if (req.query.category) {
      const cat = req.query.category.trim();
      if (!APPROVED_CATEGORIES.includes(cat)) {
        return res.status(400).json({
          success: false,
          message: `Invalid category filter. Allowed categories: ${APPROVED_CATEGORIES.join(', ')}`
        });
      }
      filter.category = cat;
    }

    if (req.query.search) {
      const searchTerm = req.query.search.trim();
      if (searchTerm) {
        filter.$or = [
          { name: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
          { flavourNotes: { $regex: searchTerm, $options: 'i' } }
        ];
      }
    }

    let parsedMin = null;
    if (req.query.minPrice !== undefined && req.query.minPrice !== '') {
      parsedMin = Number(req.query.minPrice);
      if (Number.isNaN(parsedMin) || parsedMin < 0) {
        return res.status(400).json({
          success: false,
          message: 'minPrice must be a non-negative number'
        });
      }
    }

    let parsedMax = null;
    if (req.query.maxPrice !== undefined && req.query.maxPrice !== '') {
      parsedMax = Number(req.query.maxPrice);
      if (Number.isNaN(parsedMax) || parsedMax < 0) {
        return res.status(400).json({
          success: false,
          message: 'maxPrice must be a non-negative number'
        });
      }
    }

    if (parsedMin !== null && parsedMax !== null && parsedMin > parsedMax) {
      return res.status(400).json({
        success: false,
        message: 'minPrice cannot be greater than maxPrice'
      });
    }

    if (parsedMin !== null || parsedMax !== null) {
      filter.price = {};
      if (parsedMin !== null) {
        filter.price.$gte = parsedMin;
      }
      if (parsedMax !== null) {
        filter.price.$lte = parsedMax;
      }
    }

    let sortOption = 'newest';
    if (req.query.sort) {
      const allowedSorts = ['featured', 'price-low', 'price-high', 'name', 'newest'];
      if (!allowedSorts.includes(req.query.sort)) {
        return res.status(400).json({
          success: false,
          message: `Invalid sort option. Allowed sorts: ${allowedSorts.join(', ')}`
        });
      }
      sortOption = req.query.sort;
    }

    const sortMap = {
      featured: { isFeatured: -1, createdAt: -1 },
      'price-low': { price: 1, _id: 1 },
      'price-high': { price: -1, _id: -1 },
      name: { name: 1 },
      newest: { createdAt: -1 }
    };

    const sortCriteria = sortMap[sortOption];
    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit) || 1;
    const skip = (page - 1) * limit;

    const products = await Product.find(filter)
      .sort(sortCriteria)
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      data: products,
      pagination: {
        currentPage: page,
        limit,
        totalProducts,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    next(error);
  }
};

const getCategories = async (req, res, next) => {
  try {
    const counts = await Product.aggregate([
      { $match: { isAvailable: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const countMap = {};
    counts.forEach((item) => {
      countMap[item._id] = item.count;
    });

    const data = APPROVED_CATEGORIES.map((cat) => ({
      category: cat,
      count: countMap[cat] || 0
    }));

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

const getFeaturedProducts = async (req, res, next) => {
  try {
    const featured = await Product.find({
      isAvailable: true,
      isFeatured: true
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: featured
    });
  } catch (error) {
    next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      description,
      price,
      category,
      chocolateType,
      cocoaPercentage,
      flavourNotes,
      sweetnessLevel,
      ingredients,
      allergens,
      dietaryTags,
      suitableOccasions,
      suitableRecipients,
      image,
      stock,
      isAvailable,
      isFeatured
    } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Product name is required'
      });
    }

    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Product description is required'
      });
    }

    if (price === undefined || price === null || price === '') {
      return res.status(400).json({
        success: false,
        message: 'Product price is required'
      });
    }

    const numPrice = Number(price);
    if (Number.isNaN(numPrice) || numPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be a positive number'
      });
    }

    if (!category || typeof category !== 'string' || !APPROVED_CATEGORIES.includes(category.trim())) {
      return res.status(400).json({
        success: false,
        message: `Valid category is required. Allowed categories: ${APPROVED_CATEGORIES.join(', ')}`
      });
    }

    if (!image || typeof image !== 'string' || !image.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Product image URL is required'
      });
    }

    let parsedStock = 0;
    if (stock !== undefined && stock !== null && stock !== '') {
      const numStock = Number(stock);
      if (!Number.isInteger(numStock) || numStock < 0) {
        return res.status(400).json({
          success: false,
          message: 'Stock must be a non-negative integer'
        });
      }
      parsedStock = numStock;
    }

    let parsedCocoa;
    if (cocoaPercentage !== undefined && cocoaPercentage !== null && cocoaPercentage !== '') {
      const numCocoa = Number(cocoaPercentage);
      if (Number.isNaN(numCocoa) || numCocoa < 0 || numCocoa > 100) {
        return res.status(400).json({
          success: false,
          message: 'Cocoa percentage must be a number between 0 and 100'
        });
      }
      parsedCocoa = numCocoa;
    }

    const productData = {
      name: name.trim(),
      description: description.trim(),
      price: numPrice,
      category: category.trim(),
      chocolateType: typeof chocolateType === 'string' ? chocolateType.trim() : '',
      cocoaPercentage: parsedCocoa,
      flavourNotes: sanitizeStringArray(flavourNotes),
      sweetnessLevel: typeof sweetnessLevel === 'string' ? sweetnessLevel.trim() : '',
      ingredients: sanitizeStringArray(ingredients),
      allergens: sanitizeStringArray(allergens),
      dietaryTags: sanitizeStringArray(dietaryTags),
      suitableOccasions: sanitizeStringArray(suitableOccasions),
      suitableRecipients: sanitizeStringArray(suitableRecipients),
      image: image.trim(),
      stock: parsedStock,
      isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
      isFeatured: isFeatured !== undefined ? Boolean(isFeatured) : false
    };

    const product = await Product.create(productData);

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const {
      name,
      description,
      price,
      category,
      chocolateType,
      cocoaPercentage,
      flavourNotes,
      sweetnessLevel,
      ingredients,
      allergens,
      dietaryTags,
      suitableOccasions,
      suitableRecipients,
      image,
      stock,
      isAvailable,
      isFeatured
    } = req.body;

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Product name cannot be empty'
        });
      }
      product.name = name.trim();
    }

    if (description !== undefined) {
      if (typeof description !== 'string' || !description.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Product description cannot be empty'
        });
      }
      product.description = description.trim();
    }

    if (price !== undefined) {
      const numPrice = Number(price);
      if (Number.isNaN(numPrice) || numPrice <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Price must be a positive number'
        });
      }
      product.price = numPrice;
    }

    if (category !== undefined) {
      if (typeof category !== 'string' || !APPROVED_CATEGORIES.includes(category.trim())) {
        return res.status(400).json({
          success: false,
          message: `Valid category is required. Allowed categories: ${APPROVED_CATEGORIES.join(', ')}`
        });
      }
      product.category = category.trim();
    }

    if (image !== undefined) {
      if (typeof image !== 'string' || !image.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Product image URL cannot be empty'
        });
      }
      product.image = image.trim();
    }

    if (stock !== undefined) {
      const numStock = Number(stock);
      if (!Number.isInteger(numStock) || numStock < 0) {
        return res.status(400).json({
          success: false,
          message: 'Stock must be a non-negative integer'
        });
      }
      product.stock = numStock;
    }

    if (cocoaPercentage !== undefined) {
      if (cocoaPercentage === null || cocoaPercentage === '') {
        product.cocoaPercentage = undefined;
      } else {
        const numCocoa = Number(cocoaPercentage);
        if (Number.isNaN(numCocoa) || numCocoa < 0 || numCocoa > 100) {
          return res.status(400).json({
            success: false,
            message: 'Cocoa percentage must be a number between 0 and 100'
          });
        }
        product.cocoaPercentage = numCocoa;
      }
    }

    if (chocolateType !== undefined) {
      product.chocolateType = typeof chocolateType === 'string' ? chocolateType.trim() : '';
    }

    if (sweetnessLevel !== undefined) {
      product.sweetnessLevel = typeof sweetnessLevel === 'string' ? sweetnessLevel.trim() : '';
    }

    if (flavourNotes !== undefined) {
      product.flavourNotes = sanitizeStringArray(flavourNotes);
    }

    if (ingredients !== undefined) {
      product.ingredients = sanitizeStringArray(ingredients);
    }

    if (allergens !== undefined) {
      product.allergens = sanitizeStringArray(allergens);
    }

    if (dietaryTags !== undefined) {
      product.dietaryTags = sanitizeStringArray(dietaryTags);
    }

    if (suitableOccasions !== undefined) {
      product.suitableOccasions = sanitizeStringArray(suitableOccasions);
    }

    if (suitableRecipients !== undefined) {
      product.suitableRecipients = sanitizeStringArray(suitableRecipients);
    }

    if (isAvailable !== undefined) {
      product.isAvailable = Boolean(isAvailable);
    }

    if (isFeatured !== undefined) {
      product.isFeatured = Boolean(isFeatured);
    }

    await product.save();

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getCategories,
  getFeaturedProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
