// Exchanges entry point
import { binanceExchange } from './binance';

// Exchange type constants
export const EXCHANGE_TYPES = {
    BINANCE_FUTURES: 'BINANCE_FUTURES',
    // Add more exchange types here
};

// Exchange factory
export function getExchange(type) {
    switch (type) {
        case EXCHANGE_TYPES.BINANCE_FUTURES:
            return binanceExchange;
        default:
            throw new Error(`Unsupported exchange type: ${type}`);
    }
}

// Export individual exchanges
export { binanceExchange }; 