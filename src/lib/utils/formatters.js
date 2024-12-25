// src/lib/utils/formatters.js

export function formatCurrency(value) {
    if (value === null || value === undefined) return '$0';

    // Convert to number if it's a string
    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    // Check if the number has decimal places
    const hasDecimal = numValue % 1 !== 0;

    // Format with appropriate decimal places
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: hasDecimal ? 2 : 0,
        maximumFractionDigits: 2
    }).format(numValue);
}

// Alias for formatCurrency
export const formatMoney = formatCurrency;

export const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(d);
};

export function formatPnL(pnl) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(pnl);
}