// ============================================
// TERRARIUM — Gacha System
// Random species pulls with 3 rarity tiers
// ============================================

/**
 * GACHA SPECIES — 9 new species across 3 tiers
 */
export const GACHA_SPECIES = {
    // ⚪ COMMON TIER
    dustmite: {
        id: 'dustmite',
        name: 'Dustmite',
        emoji: '🪨',
        tier: 'common',
        description: 'Tiny and fast, thrives in large herds',
        diet: 'herbivore',
        hueRange: [30, 50],
        saturationRange: [20, 40],
        bodyShapeRange: [0.7, 1.0],
        sizeRange: [3, 8],
        speedRange: [1.0, 2.2],
        behavior: {
            hungerThreshold: 0.8,
            fleeDistance: 90,
            fleeStrength: 3.5,
            seekFoodStrength: 1.5,
            socialDrive: 0.95,
            flockRadius: 120,
            aggression: 0,
            curiosity: 0.3,
            wanderStrength: 0.15,
        },
    },
    shroomba: {
        id: 'shroomba',
        name: 'Shroomba',
        emoji: '🍄',
        tier: 'common',
        description: 'Slow but extremely tough, the tank of the ecosystem',
        diet: 'omnivore',
        hueRange: [280, 310],
        saturationRange: [30, 55],
        bodyShapeRange: [0.8, 1.0],
        sizeRange: [10, 18],
        speedRange: [0.2, 0.8],
        behavior: {
            hungerThreshold: 0.5,
            fleeDistance: 20,
            fleeStrength: 0.5,
            seekFoodStrength: 1.0,
            socialDrive: 0.3,
            flockRadius: 40,
            aggression: 0.2,
            curiosity: 0.1,
            wanderStrength: 0.1,
        },
    },
    glimmer: {
        id: 'glimmer',
        name: 'Glimmer',
        emoji: '✨',
        tier: 'common',
        description: 'Bioluminescent creature that attracts food particles nearby',
        diet: 'herbivore',
        hueRange: [55, 75],
        saturationRange: [70, 95],
        bodyShapeRange: [0.5, 0.8],
        sizeRange: [4, 10],
        speedRange: [0.5, 1.4],
        behavior: {
            hungerThreshold: 0.7,
            fleeDistance: 70,
            fleeStrength: 2.5,
            seekFoodStrength: 2.0,
            socialDrive: 0.6,
            flockRadius: 80,
            aggression: 0,
            curiosity: 0.6,
            wanderStrength: 0.3,
        },
    },

    // 🔵 RARE TIER
    venomaw: {
        id: 'venomaw',
        name: 'Venomaw',
        emoji: '🐍',
        tier: 'rare',
        description: 'Venomous predator with deadly poison attacks',
        diet: 'carnivore',
        hueRange: [85, 110],
        saturationRange: [60, 85],
        bodyShapeRange: [0.05, 0.3],
        sizeRange: [7, 15],
        speedRange: [1.5, 2.8],
        behavior: {
            hungerThreshold: 0.5,
            fleeDistance: 20,
            fleeStrength: 1.2,
            seekFoodStrength: 3.0,
            socialDrive: 0.05,
            flockRadius: 0,
            aggression: 0.95,
            curiosity: 0.7,
            wanderStrength: 0.5,
        },
    },
    crystalis: {
        id: 'crystalis',
        name: 'Crystalis',
        emoji: '💎',
        tier: 'rare',
        description: 'Crystal-armored creature, nearly impossible to kill',
        diet: 'omnivore',
        hueRange: [170, 200],
        saturationRange: [65, 90],
        bodyShapeRange: [0.4, 0.7],
        sizeRange: [8, 16],
        speedRange: [0.4, 1.2],
        behavior: {
            hungerThreshold: 0.6,
            fleeDistance: 25,
            fleeStrength: 0.8,
            seekFoodStrength: 1.8,
            socialDrive: 0.3,
            flockRadius: 50,
            aggression: 0.4,
            curiosity: 0.4,
            wanderStrength: 0.3,
        },
    },
    tidecaller: {
        id: 'tidecaller',
        name: 'Tidecaller',
        emoji: '🌊',
        tier: 'rare',
        description: 'Mystical creature that generates food as it moves',
        diet: 'herbivore',
        hueRange: [190, 220],
        saturationRange: [50, 75],
        bodyShapeRange: [0.5, 0.8],
        sizeRange: [6, 14],
        speedRange: [0.6, 1.6],
        behavior: {
            hungerThreshold: 0.85,
            fleeDistance: 60,
            fleeStrength: 2.5,
            seekFoodStrength: 1.2,
            socialDrive: 0.7,
            flockRadius: 90,
            aggression: 0,
            curiosity: 0.8,
            wanderStrength: 0.6,
        },
    },

    // 🟡 LEGENDARY TIER
    phoenixis: {
        id: 'phoenixis',
        name: 'Phoenixis',
        emoji: '🔥',
        tier: 'legendary',
        description: 'Revives once after death — the immortal predator',
        diet: 'carnivore',
        hueRange: [10, 40],
        saturationRange: [80, 100],
        bodyShapeRange: [0.15, 0.45],
        sizeRange: [10, 18],
        speedRange: [1.8, 3.0],
        behavior: {
            hungerThreshold: 0.45,
            fleeDistance: 15,
            fleeStrength: 0.8,
            seekFoodStrength: 3.0,
            socialDrive: 0.05,
            flockRadius: 0,
            aggression: 1.0,
            curiosity: 0.6,
            wanderStrength: 0.5,
        },
    },
    leviathan: {
        id: 'leviathan',
        name: 'Leviathan',
        emoji: '🐉',
        tier: 'legendary',
        description: 'Massive apex predator, 2x the size of normal creatures',
        diet: 'omnivore',
        hueRange: [260, 290],
        saturationRange: [70, 95],
        bodyShapeRange: [0.2, 0.5],
        sizeRange: [18, 30],
        speedRange: [0.8, 1.8],
        behavior: {
            hungerThreshold: 0.4,
            fleeDistance: 10,
            fleeStrength: 0.3,
            seekFoodStrength: 2.5,
            socialDrive: 0.0,
            flockRadius: 0,
            aggression: 0.85,
            curiosity: 0.3,
            wanderStrength: 0.4,
        },
    },
    sakurabane: {
        id: 'sakurabane',
        name: 'Sakurabane',
        emoji: '🌸',
        tier: 'legendary',
        description: 'Boosts reproduction of all nearby allies',
        diet: 'herbivore',
        hueRange: [320, 345],
        saturationRange: [55, 80],
        bodyShapeRange: [0.6, 0.9],
        sizeRange: [8, 16],
        speedRange: [0.5, 1.5],
        behavior: {
            hungerThreshold: 0.7,
            fleeDistance: 75,
            fleeStrength: 2.8,
            seekFoodStrength: 1.5,
            socialDrive: 1.0,
            flockRadius: 140,
            aggression: 0,
            curiosity: 0.5,
            wanderStrength: 0.2,
        },
    },
};

/**
 * GACHA TIERS — pricing & drop rates
 */
export const GACHA_TIERS = {
    common: {
        id: 'common',
        name: 'Common',
        color: '#9e9e9e',
        glowColor: 'rgba(158, 158, 158, 0.3)',
        price: 5000,
        emoji: '⚪',
        drops: [
            { speciesId: 'dustmite', weight: 40 },
            { speciesId: 'shroomba', weight: 35 },
            { speciesId: 'glimmer',  weight: 25 },
        ],
    },
    rare: {
        id: 'rare',
        name: 'Rare',
        color: '#448aff',
        glowColor: 'rgba(68, 138, 255, 0.3)',
        price: 15000,
        emoji: '🔵',
        drops: [
            { speciesId: 'venomaw',    weight: 40 },
            { speciesId: 'crystalis',  weight: 35 },
            { speciesId: 'tidecaller', weight: 25 },
        ],
    },
    legendary: {
        id: 'legendary',
        name: 'Legendary',
        color: '#ffd740',
        glowColor: 'rgba(255, 215, 64, 0.3)',
        price: 30000,
        emoji: '🟡',
        drops: [
            { speciesId: 'phoenixis',   weight: 40 },
            { speciesId: 'leviathan',   weight: 25 },
            { speciesId: 'sakurabane',  weight: 35 },
        ],
    },
};

/**
 * Perform a gacha pull — returns a random species from the tier
 */
export function gachaPull(tierKey) {
    const tier = GACHA_TIERS[tierKey];
    if (!tier) return null;

    const totalWeight = tier.drops.reduce((sum, d) => sum + d.weight, 0);
    let roll = Math.random() * totalWeight;

    for (const drop of tier.drops) {
        roll -= drop.weight;
        if (roll <= 0) {
            return GACHA_SPECIES[drop.speciesId];
        }
    }

    // Fallback
    return GACHA_SPECIES[tier.drops[0].speciesId];
}

/**
 * Get user's collected species from localStorage
 */
export function getCollection() {
    return JSON.parse(localStorage.getItem('terrarium_gacha_collection') || '[]');
}

/**
 * Add a species to user's collection
 */
export function addToCollection(speciesId) {
    const collection = getCollection();
    collection.push({
        speciesId,
        obtainedAt: Date.now(),
    });
    localStorage.setItem('terrarium_gacha_collection', JSON.stringify(collection));
}

/**
 * Check if user has collected a specific species
 */
export function hasSpecies(speciesId) {
    return getCollection().some(c => c.speciesId === speciesId);
}
