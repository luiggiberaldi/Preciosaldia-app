import { useState, useEffect } from 'react';

// CLAVE MAESTRA SECRETA (En un entorno real estaría ofuscada o validada en servidor, 
// pero siguiendo la directiva "Offline First" y "Sin Backend", vive aquí).
const MASTER_SECRET_KEY = "VENEZUELA_PRO_2026_GLOBAL";

export function useSecurity() {
    const [deviceId, setDeviceId] = useState('');
    const [isPremium, setIsPremium] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isDemo, setIsDemo] = useState(false); // [NEW]
    const [demoExpires, setDemoExpires] = useState(null); // [NEW]

    useEffect(() => {
        // 1. Obtener o Generar Device ID
        let storedId = localStorage.getItem('device_id');
        if (!storedId) {
            // Generar ID formato TASAS-XXXX
            const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
            storedId = `TASAS-${randomPart}`;
            localStorage.setItem('device_id', storedId);
        }
        setDeviceId(storedId);

        // 2. Verificar Licencia
        checkLicense(storedId);
    }, []);

    const generateActivationCode = async (devId) => {
        // [BLINDAJE] Si no hay crypto.subtle (Contexto no seguro o navegador viejo), usaremos un hash simple
        if (!window.crypto || !window.crypto.subtle) {
            console.warn("⚠️ Crypto API no disponible. Usando fallback inseguro.");
            // Fallback: Simple hash de string (DJB2 o similar simple)
            let hash = 5381;
            const str = devId + MASTER_SECRET_KEY;
            for (let i = 0; i < str.length; i++) {
                hash = ((hash << 5) + hash) + str.charCodeAt(i);
            }
            // Hex de 8 caracteres
            const hex = (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
            return `ACTIV-${hex.substring(0, 4)}-${hex.substring(4, 8)}`;
        }

        // Genera el hash SHA-256 de (deviceId + SECRET)
        const encoder = new TextEncoder();
        const data = encoder.encode(devId + MASTER_SECRET_KEY);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

        // Tomamos los primeros 8 caracteres para que sea fácil de escribir
        return `ACTIV-${hashHex.substring(0, 4)}-${hashHex.substring(4, 8)}`;
    };

    const checkLicense = async (currentDeviceId) => {
        let storedToken = localStorage.getItem('premium_token');

        if (!storedToken) {
            setIsPremium(false);
            setLoading(false);
            return;
        }

        // Validar token esperado
        const validTokenStr = await generateActivationCode(currentDeviceId);

        // Lógica Híbrida: String (Lifetime) vs JSON (Temporal/Demo)
        try {
            // Intentar parsear como JSON (Formato Nuevo Demo)
            const tokenObj = JSON.parse(storedToken);

            if (tokenObj && tokenObj.code && tokenObj.expires) {
                // Es un token temporal
                if (tokenObj.code === validTokenStr) {
                    if (Date.now() < tokenObj.expires) {
                        setIsPremium(true);
                        setIsDemo(true);
                        setDemoExpires(tokenObj.expires);
                    } else {
                        // Expiró
                        console.warn("Licencia Demo Expirada");

                        // [NEW] Mensaje de Expiración (Solo si acabamos de detectar que expiró)
                        if (isPremium) { // Evitar spam si ya estaba expirado
                            // [AUDIT FIX] Demo expirado, limpiar silenciosamente
                            // El PremiumGuard se encargará de mostrar la UI de paywall
                            localStorage.removeItem('premium_token');
                        }

                        localStorage.removeItem('premium_token');
                        setIsPremium(false);
                        setIsDemo(false);
                    }
                } else {
                    setIsPremium(false);
                }
            } else {
                // JSON inválido -> Asumir fallo o formato viejo
                setIsPremium(false);
            }
        } catch (e) {
            // No es JSON, asumimos que es el formato String antiguo (Lifetime License)
            if (storedToken === validTokenStr) {
                setIsPremium(true);
                setIsDemo(false);
            } else {
                setIsPremium(false);
            }
        }
        setLoading(false);
    };

    const unlockApp = async (inputCode) => {
        const validCode = await generateActivationCode(deviceId);

        if (inputCode.trim().toUpperCase() === validCode) {
            // Si es el dispositivo de DEMOSTRACIÓN (Portafolio), forzamos caducidad en 24h
            if (deviceId === 'TASAS-DEMO') {
                // [NEW] Verificar si ya se usó el demo antes
                if (localStorage.getItem('demo_used_history')) {
                    return { success: false, status: 'DEMO_USED' };
                }

                const expires = Date.now() + (24 * 60 * 60 * 1000);
                const demoToken = {
                    code: validCode,
                    expires: expires,
                    isDemo: true
                };
                localStorage.setItem('premium_token', JSON.stringify(demoToken));

                // [NEW] Marcar demo como usado permanentemente
                localStorage.setItem('demo_used_history', 'true');

                setIsDemo(true);
                setDemoExpires(expires);

                return { success: true, status: 'DEMO_ACTIVATED' };
            } else {
                // Licencia estándar de por vida
                localStorage.setItem('premium_token', validCode);
                setIsDemo(false);
            }

            setIsPremium(true);
            return { success: true, status: 'PREMIUM_ACTIVATED' };
        }
        return { success: false, status: 'INVALID_CODE' };
    };

    /**
     * Solo para el panel de admin: Genera el código para un CLIENTE (otro ID)
     */
    const generateCodeForClient = async (clientDeviceId) => {
        return await generateActivationCode(clientDeviceId);
    };

    return {
        deviceId,
        isPremium,
        loading,
        unlockApp,
        generateCodeForClient,
        isDemo,
        demoExpires
    };
}
