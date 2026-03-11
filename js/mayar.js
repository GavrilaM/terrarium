// ============================================
// TERRARIUM — Mayar Payment Integration
// Premium features via Mayar payment gateway
// ============================================

// Mayar Sandbox API
const MAYAR_CONFIG = {
    // Replace with your actual API key from https://web.mayar.club/api-keys
    API_KEY: 'YOUR_MAYAR_SANDBOX_API_KEY',
    BASE_URL: 'https://api.mayar.club/hl/v1', // Sandbox URL
};

/**
 * Create an invoice for a premium feature purchase
 * @param {string} name - Product name
 * @param {number} amount - Amount in IDR
 * @param {string} email - Customer email
 * @returns {Promise<Object>} Invoice data with payment link
 */
export async function createInvoice(name, amount, email) {
    try {
        const response = await fetch(`${MAYAR_CONFIG.BASE_URL}/invoice/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MAYAR_CONFIG.API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name,
                amount,
                email,
                description: `Terrarium Premium: ${name}`,
                redirectUrl: window.location.href,
            }),
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Mayar API error:', error);
        return null;
    }
}

/**
 * Check invoice status
 * @param {string} invoiceId - Invoice ID to check
 * @returns {Promise<Object>} Invoice status data
 */
export async function checkInvoiceStatus(invoiceId) {
    try {
        const response = await fetch(`${MAYAR_CONFIG.BASE_URL}/invoice/${invoiceId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${MAYAR_CONFIG.API_KEY}`,
            },
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Mayar API error:', error);
        return null;
    }
}

/**
 * Premium features catalog
 */
export const PREMIUM_FEATURES = {
    BIOME_DEEP_OCEAN: {
        id: 'biome_deep_ocean',
        name: 'Deep Ocean Biome',
        price: 15000,
        description: 'Unlock the deep ocean environment with bioluminescent flora',
    },
    BIOME_VOLCANIC: {
        id: 'biome_volcanic',
        name: 'Volcanic Biome',
        price: 15000,
        description: 'Unlock volcanic vents with heat-resistant species',
    },
    RARE_SPECIES: {
        id: 'rare_species',
        name: 'Rare Species Pack',
        price: 10000,
        description: 'Introduce 3 rare species with unique DNA patterns',
    },
    SPEED_BOOST: {
        id: 'speed_boost',
        name: 'Time Warp',
        price: 5000,
        description: 'Unlock 5x and 10x simulation speed',
    },
};
