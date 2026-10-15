const getDeliveryFeeConfig = () => {
  const fee = Number(process.env.DELIVERY_FEE);
  const threshold = Number(process.env.FREE_DELIVERY_THRESHOLD);

  return {
    deliveryFee: Number.isNaN(fee) || fee < 0 ? 50 : fee,
    freeDeliveryThreshold: Number.isNaN(threshold) || threshold < 0 ? 1000 : threshold
  };
};

const calculateDeliveryFee = (subtotal) => {
  if (!subtotal || subtotal <= 0) {
    return 0;
  }

  const { deliveryFee, freeDeliveryThreshold } = getDeliveryFeeConfig();
  if (subtotal >= freeDeliveryThreshold) {
    return 0;
  }

  return deliveryFee;
};

const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `COC-${timestamp}-${randomSuffix}`;
};

module.exports = {
  getDeliveryFeeConfig,
  calculateDeliveryFee,
  generateOrderNumber
};
