import { formatBs, formatUsd } from '../utils/calculatorUtils';

/**
 * Service responsible for constructing user-facing messages.
 */
export const MessageService = {
    /**
     * Builds the payment message string.
     * @param {object} params
     * @param {number|string} params.amountTop
     * @param {number|string} params.amountBot
     * @param {string} params.from
     * @param {string} params.to
     * @param {object} params.selectedAccount - Account details object
     * @param {boolean} params.showReference
     * @param {object} params.rates
     * @param {Array} params.currencies
     * @param {string} params.tone - 'formal' | 'casual' | 'direct'
     * @param {string} params.clientName
     * @param {string} params.mainCurrency - 'auto' | 'BS' | 'USD' | 'EUR'
     * @returns {string}
     */
    buildPaymentMessage: ({ amountTop, amountBot, from, to, selectedAccount, showReference = true, rates, currencies, tone = 'casual', clientName = '', mainCurrency = 'auto' }) => {

        // Helper Safe Parse
        const safeParse = (val) => (!val || val === '.') ? 0 : parseFloat(val.toString().replace(/,/g, '.'));

        const valTop = safeParse(amountTop);
        const valBot = safeParse(amountBot);

        const rateTo = currencies.find(c => c.id === to)?.rate;
        const rateFrom = currencies.find(c => c.id === from)?.rate;

        const isBsAccount = selectedAccount.currency === 'VES';
        const automaticRefRate = isBsAccount ? rates.bcv.price : rates.usdt.price;

        // Calcular Total Real
        let totalBsRaw = 0;
        if (to === 'VES') totalBsRaw = valBot;
        else if (from === 'VES') totalBsRaw = valTop;
        else totalBsRaw = valTop * rateFrom; // Divisa a Divisa

        const totalUsdRaw = totalBsRaw / automaticRefRate;

        const strBs = formatBs(totalBsRaw);
        const strUsd = formatUsd(totalUsdRaw);
        const strEur = formatUsd(totalUsdRaw * (rates.euro.price / rates.bcv.price)); // Aprox Eur value

        // Header Formatting based on Preferences
        let amountStr = '';

        // Determine Main Currency to Show
        let showAsBs = false;
        if (mainCurrency === 'auto') showAsBs = isBsAccount;
        else if (mainCurrency === 'BS') showAsBs = true;
        // else USD/EUR

        if (showAsBs) {
            amountStr = `*${strBs} Bs*`;
            if (showReference) amountStr += ` (Ref: ${strUsd} $)`;
        } else {
            // Foreign Currency Display
            const symbol = mainCurrency === 'EUR' ? 'EUR' : 'USDT'; // Default to USDT for foreign
            const valToShow = mainCurrency === 'EUR' ? strEur : strUsd;

            amountStr = `*${valToShow} ${symbol}*`;

            // Ref in Bs logic
            if (showReference) {
                const refBs = formatBs(totalUsdRaw * automaticRefRate);
                amountStr += ` (Ref: ${refBs} Bs)`;
            }
        }

        // TONE LOGIC
        let greeting = '';
        let intro = '';

        const namePart = clientName ? ` ${clientName}` : '';

        switch (tone) {
            case 'formal':
                greeting = `Estimado(a)${namePart},`;
                intro = `por favor realice el pago de ${amountStr} a la siguiente cuenta:`;
                break;
            case 'direct':
                greeting = 'DETALLES DE PAGO';
                intro = `Cliente: ${clientName || 'No especificado'}\nMonto: ${amountStr}`;
                break;
            case 'casual':
            default:
                greeting = `Hola${namePart},`;
                intro = `el total es ${amountStr}. Aquí tienes los datos de pago:`;
                break;
        }

        if (!selectedAccount) {
            // Fallback más limpio si falla la data
            return `${greeting} ${intro}\n\n[Datos de cuenta no cargados]\n\nGenerado con TasasAlDía`;
        }

        let details = '';
        // Support both nested .data (legacy/clean) and flat properties (WalletView implementation)
        const d = selectedAccount.data || selectedAccount;

        if (selectedAccount.type === 'pago_movil') {
            details = `*Pago Móvil*\nBanco: ${d.bankName || d.bank || 'Banco'}\nTel: ${d.phone || ''}\nCI: ${d.docId || d.id || ''}`;
        } else if (selectedAccount.type === 'transfer') {
            const tipo = d.accountType === 'C' ? 'Corriente' : 'Ahorro';
            details = `*Transferencia Bancaria*\nBanco: ${d.bankName || d.bank || ''}\nCuenta: ${d.accountNumber || ''}\nTipo: ${tipo}\nTitular: ${d.holder || ''}\nCI/RIF: ${d.docId || d.id || ''}`;
        } else if (selectedAccount.type === 'binance') {
            details = `*Binance Pay*\nEmail: ${d.email || ''}\nID: ${d.payId || 'No especificado'}`;
        }

        // Handle 'transferencia' type from WalletView (it maps to 'transfer' logic but type string might be different)
        if (selectedAccount.type === 'transferencia') {
            const tipo = d.accountType === 'C' ? 'Corriente' : 'Ahorro';
            details = `*Transferencia Bancaria*\nBanco: ${d.bankName || d.bank || ''}\nCuenta: ${d.accountNumber || ''}\nTipo: ${tipo}\nTitular: ${d.holder || ''}\nCI/RIF: ${d.docId || d.id || ''}`;
        }

        // Final Assembly
        if (tone === 'direct') {
            return `${greeting}\n\n${intro}\n\n${details}\n\nTasasAlDía`;
        }

        return `${greeting} ${intro}\n\n${details}\n\nGenerado con TasasAlDía`;
    }
};
