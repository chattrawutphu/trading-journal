export const SUBSCRIPTION_TYPES = {
    BASIC: 'BASIC',
    PRO: 'PRO',
    PRO_PLUS: 'PRO_PLUS'
};

export const SUBSCRIPTION_FEATURES = {
    basic: {
        badge: 'Basic',
        // ...other feature configs
    },
    pro: {
        badge: 'Pro',
        // ...other feature configs
    },
    pro_plus: {
        badge: 'Pro+',
        // ...other feature configs
    }
};

export const BILLING_PERIODS = {
    MONTHLY: 'monthly',
    YEARLY: 'yearly'
};

export const SUBSCRIPTION_PLANS = {
    monthly: [
        {
            name: 'Basic',
            price: 'Free',
            features: [
                'Basic trading journal features',
                'Up to 100 trades per month',
                'Basic analytics',
                'Single account'
            ],
            type: SUBSCRIPTION_TYPES.BASIC
        },
        {
            name: 'Pro',
            price: '$19.99',
            period: 'month',
            features: [
                'Everything in Basic, plus:',
                'Unlimited trades',
                'Advanced analytics',
                'Multiple accounts',
                'Export data',
                'Priority support'
            ],
            type: SUBSCRIPTION_TYPES.PRO
        },
        {
            name: 'Pro+',
            price: '$49.99',
            period: 'month',
            features: [
                'Everything in Pro, plus:',
                'Premium analytics',
                'Dedicated account manager',
                'Custom integrations',
                'Early access to new features'
            ],
            type: SUBSCRIPTION_TYPES.PRO_PLUS
        }
    ],
    yearly: [
        {
            name: 'Basic',
            price: 'Free',
            features: [
                'Basic trading journal features',
                'Up to 100 trades per month',
                'Basic analytics',
                'Single account'
            ],
            type: SUBSCRIPTION_TYPES.BASIC
        },
        {
            name: 'Pro',
            price: '$199.99',
            period: 'year',
            originalPrice: '$239.88', // 12 x $19.99
            savings: '17% OFF',
            features: [
                'Everything in Basic, plus:',
                'Unlimited trades',
                'Advanced analytics',
                'Multiple accounts',
                'Export data',
                'Priority support',
                '2 months free', // โปรโมชั่นพิเศษ
                'Early access to new features'
            ],
            type: SUBSCRIPTION_TYPES.PRO,
            isPopular: true
        },
        {
            name: 'Pro+',
            price: '$499.99',
            period: 'year',
            originalPrice: '$599.88', // 12 x $49.99
            savings: '17% OFF',
            features: [
                'Everything in Pro, plus:',
                'Premium analytics',
                'Dedicated account manager',
                'Custom integrations',
                'Early access to new features',
                '2 months free', // โปรโมชั่นพิเศษ
                'Exclusive trading workshops',
                'Custom strategy development'
            ],
            type: SUBSCRIPTION_TYPES.PRO_PLUS
        }
    ]
};

// Keep only Depay Public Key configuration
export const DEPAY_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArGGMgVkctJi+CyUQGG2o
vVOeR3+NBrJVPIrNrMmDT0vBqbrIRUPB2076G1xutRCk9DmRdhsfhgssxqPHmeQw
VuNEH8Fs6tZxL5p5BGQdgIU6rwo3gKIoNrUQAvZ47pAiXSctMAH/YSk0ukE9Icf5
2lWnwbDxsVMTNVPo0LfVzbWzHYcuR9T2fU0nRvl3hAoOnHAWIAl0AukD77W/5Xdc
e6BuEiCNglwaLfPglzp23kDCJVv9ZVeUHtIDPr8W/aTXxQw7P6MxvFlUlFadibHo
at9Gp+y0ZooXNEeMRVrH70SR4lbZnonVyWywhe/4xq1TRXbRq9YTIi9kr1UC2ZVR
DQIDAQAB
-----END PUBLIC KEY-----`;

// Remove DepayFi configuration if not used elsewhere
// export const DEPAYFI_CONFIG = {
//     apiKey: process.env.DEPAYFI_API_KEY,
//     secretKey: process.env.DEPAYFI_SECRET_KEY,
//     paymentAddress: process.env.DEPAYFI_PAYMENT_ADDRESS
// };
