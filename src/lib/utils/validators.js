export const validateTradeForm = (form) => {
    const errors = {};

    // Required fields
    if (!form.symbol?.trim()) errors.symbol = 'Symbol is required';
    if (!form.entryDate) errors.entryDate = 'Entry date is required';
    if (!form.entryPrice || form.entryPrice <= 0) errors.entryPrice = 'Valid entry price is required';
    if (!form.amount || form.amount <= 0) errors.amount = 'Valid amount is required';

    // Status-specific validations
    if (form.status === 'CLOSED') {
        if (!form.exitDate) {
            errors.exitDate = 'Exit date is required for closed trades';
        } else if (new Date(form.exitDate) < new Date(form.entryDate)) {
            errors.exitDate = 'Exit date must be after entry date';
        }

        if (!form.exitPrice || form.exitPrice <= 0) {
            errors.exitPrice = 'Valid exit price is required for closed trades';
        }

        if (!form.pnl) errors.pnl = 'P&L is required for closed trades';
    }

    // Number validations
    if (form.quantity && form.quantity <= 0) {
        errors.quantity = 'Quantity must be positive';
    }

    // URL validation
    if (form.url && !isValidUrl(form.url)) {
        errors.url = 'Please enter a valid URL';
    }

    return errors;
};

export const isValidUrl = (string) => {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
};

export const getInputErrorClass = (error) => {
    return error ? 'border-red-500 focus:ring-red-500' : '';
};

export const getInputSuccessClass = (value, error) => {
    return value && !error ? 'border-green-500 focus:ring-green-500' : '';
};
