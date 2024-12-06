
export const mockPayment = {
  async processStripePayment(amount) {
    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return {
      success: true,
      transactionId: `str_${Date.now()}`,
      paymentMethod: {
        type: 'card',
        brand: 'visa',
        last4: '4242'
      }
    };
  },

  async processMetaMaskPayment(amount) {
    // Simulate MetaMask popup and transaction
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      success: true,
      transactionId: `eth_${Date.now()}`,
      paymentMethod: {
        type: 'crypto',
        brand: 'ethereum',
        address: '0x1234...abcd'
      }
    };
  }
};