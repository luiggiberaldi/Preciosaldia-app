// [CONFIGURACIÓN] Comisión de efectivo REMOVIDA
// La tasa de efectivo ahora depende exclusivamente de la calibración manual del usuario

import { MessageService } from '../services/MessageService';

// Formateadores
export const formatBs = (val) => new Intl.NumberFormat('es-VE', { maximumFractionDigits: 0 }).format(Math.ceil(val));
export const formatUsd = (val) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

// [REDONDEO INTELIGENTE PARA EFECTIVO]
// Regla: Si decimal <= 0.20 -> Redondeo abajo (Floor)
//        Si decimal > 0.20  -> Redondeo arriba (Ceil)
export const smartCashRounding = (amount) => {
    const integer = Math.floor(amount);
    const decimal = amount - integer;
    return decimal <= 0.2001 ? integer : integer + 1; // Usamos 0.2001 para margen de error flotante
};

// Re-export deprecated function referencing the new service
export const generatePaymentMessage = (params) => {
    return MessageService.buildPaymentMessage(params);
};