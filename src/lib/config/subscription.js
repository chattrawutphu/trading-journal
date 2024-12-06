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
