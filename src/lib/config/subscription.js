export const SUBSCRIPTION_TYPES = {
  BASIC: 'basic',
  PRO: 'pro',
  PRO_PLUS: 'pro_plus'
};

export const SUBSCRIPTION_FEATURES = {
  [SUBSCRIPTION_TYPES.BASIC]: {
    name: 'Basic',
    badge: {
      text: 'Basic',
      bgColor: 'bg-gray-500',
      textColor: 'text-white'
    }
  },
  [SUBSCRIPTION_TYPES.PRO]: {
    name: 'Pro',
    badge: {
      text: 'PRO',
      bgColor: 'bg-blue-500',
      textColor: 'text-white'
    }
  },
  [SUBSCRIPTION_TYPES.PRO_PLUS]: {
    name: 'Pro+',
    badge: {
      text: 'PRO+',
      bgColor: 'bg-purple-500',
      textColor: 'text-white'
    }
  }
};
