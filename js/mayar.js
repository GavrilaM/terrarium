// ============================================
// TERRARIUM — Mayar Payment Integration
// Premium features via Mayar payment gateway
// ============================================

// Mayar Sandbox API
const MAYAR_CONFIG = {
    API_KEY: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI3Nzg3NmQ1ZS1kMWFiLTQ3NWEtOTUwNi1kNTlmZWZhNDYwOTQiLCJhY2NvdW50SWQiOiIwYWRiNTRmZC05NGJkLTQ0YzItOGM1Yi03YmUxZTFlMDM4MTMiLCJjcmVhdGVkQXQiOiIxNzczMjU0MTE5ODAwIiwicm9sZSI6ImRldmVsb3BlciIsInN1YiI6IjEwMG1iZjMwQGdtYWlsLmNvbSIsIm5hbWUiOiJ0ZXJhIiwibGluayI6InRlcmEtMTIzIiwiaXNTZWxmRG9tYWluIjpudWxsLCJpYXQiOjE3NzMyNTQxMTl9.d5eviJkwDq6ZGF1v0QIMVYH6fgAdVgIsGMjOysK1LocTOBw9QqLZsJEvQAII5Xh_xVFTm9oWFAhalKq_1SAzTXUBxOqNAxALqkCaeLXv53R084mf9gkLWhu7C4C3cFLutGdhUjS-fTqxMQ2k5sgP9h9kT9ho9LyQD4EJv-xsgxy7Fj4vigV1nn40hHNFKcLl25PBKXc9KznAPrLd2Q5-6Sa0RVa0v_sd4PpP02qCNSJtsHEMv6BAblEyANdE3n8yvGMzud-9DuArzb92iIb9CSX9Jn38kDo4uMc2iUy2WaD1W79YTIq9jM3yK0fr4Aoj_lPyTQmVqIEq79nrXGinAw',
    BASE_URL: 'https://api.mayar.club/hl/v1', // Sandbox URL
};

/**
 * Biome catalog for marketplace
 */
export const BIOME_CATALOG = {
    sand: {
        id: 'biome_sand',
        name: 'Sand Biome',
        price: 15000,
        description: 'Scorching deserts with heat-resistant species and sandy dunes',
    },
    grass: {
        id: 'biome_grass',
        name: 'Grass Biome',
        price: 15000,
        description: 'Lush green plains with abundant plant life and thriving herbivores',
    },
    sakura: {
        id: 'biome_sakura',
        name: 'Sakura Biome',
        price: 15000,
        description: 'Cherry blossom gardens with gentle breezes and graceful creatures',
    },
};

/**
 * Create a payment link for a biome purchase
 * @param {string} biomeKey - Key from BIOME_CATALOG (sand, grass, sakura)
 * @param {string} email - Customer email
 * @returns {Promise<Object>} Response with payment link
 */
export async function createBiomePayment(biomeKey, email, mobile) {
    const biome = BIOME_CATALOG[biomeKey];
    if (!biome) {
        console.error('Invalid biome key:', biomeKey);
        return null;
    }

    try {
        const response = await fetch(`${MAYAR_CONFIG.BASE_URL}/payment/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MAYAR_CONFIG.API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: biome.name,
                amount: biome.price,
                email: email,
                mobile: mobile,
                description: `Terrarium Marketplace: ${biome.name} — ${biome.description}`,
                redirectUrl: window.location.origin + '/marketplace.html?payment=success&biome=' + biomeKey,
            }),
        });

        const data = await response.json();
        console.log('Mayar API response:', data);
        return data;
    } catch (error) {
        console.error('Mayar API error:', error);
        return { error: error.message };
    }
}

/**
 * Create a payment link for a gacha pull
 * @param {string} tierKey - Gacha tier (common, rare, legendary)
 * @param {string} tierName - Display name
 * @param {number} price - Amount in IDR
 * @param {string} email - Customer email
 * @param {string} mobile - Customer phone
 * @returns {Promise<Object>} Response with payment link
 */
export async function createGachaPayment(tierKey, tierName, price, email, mobile) {
    try {
        const response = await fetch(`${MAYAR_CONFIG.BASE_URL}/payment/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MAYAR_CONFIG.API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: `Gacha Pull: ${tierName}`,
                amount: price,
                email: email,
                mobile: mobile,
                description: `Terrarium Gacha — ${tierName} tier species pull`,
                redirectUrl: window.location.origin + '/marketplace.html?payment=success&gacha=' + tierKey,
            }),
        });

        const data = await response.json();
        console.log('Mayar Gacha API response:', data);
        return data;
    } catch (error) {
        console.error('Mayar Gacha API error:', error);
        return { error: error.message };
    }
}
