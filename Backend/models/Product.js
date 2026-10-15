const mongoose = require('mongoose');

const APPROVED_CATEGORIES = [
  'Milk Chocolate',
  'Dark Chocolate',
  'White Chocolate',
  'Zero Sugar',
  'Nuts & Praline',
  'Fruit & Floral',
  'Indian & Experimental'
];

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [120, 'Product name cannot exceed 120 characters']
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0.01, 'Price must be a positive number']
    },
    category: {
      type: String,
      required: [true, 'Product category is required'],
      enum: {
        values: APPROVED_CATEGORIES,
        message: '{VALUE} is not a valid category'
      },
      trim: true
    },
    chocolateType: {
      type: String,
      trim: true,
      default: ''
    },
    cocoaPercentage: {
      type: Number,
      min: [0, 'Cocoa percentage cannot be less than 0'],
      max: [100, 'Cocoa percentage cannot exceed 100']
    },
    flavourNotes: {
      type: [String],
      default: []
    },
    sweetnessLevel: {
      type: String,
      trim: true,
      default: ''
    },
    ingredients: {
      type: [String],
      default: []
    },
    allergens: {
      type: [String],
      default: []
    },
    dietaryTags: {
      type: [String],
      default: []
    },
    suitableOccasions: {
      type: [String],
      default: []
    },
    suitableRecipients: {
      type: [String],
      default: []
    },
    image: {
      type: String,
      required: [true, 'Product image URL is required'],
      trim: true
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, 'Stock cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Stock must be an integer'
      }
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    isFeatured: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

productSchema.pre('validate', async function (next) {
  if (this.isModified('name') || !this.slug) {
    let baseSlug = slugify(this.name || '');
    if (!baseSlug) {
      baseSlug = 'product';
    }
    let candidateSlug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await mongoose.models.Product.findOne({
        slug: candidateSlug,
        _id: { $ne: this._id }
      });

      if (!existing) {
        break;
      }

      candidateSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    this.slug = candidateSlug;
  }
  next();
});

const Product = mongoose.model('Product', productSchema);

module.exports = {
  Product,
  APPROVED_CATEGORIES,
  slugify
};
