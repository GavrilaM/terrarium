// ============================================
// TERRARIUM — Species System
// 3 distinct species with unique personalities
// Inspired by SPORE's creature design
// ============================================

/**
 * SPECIES TYPES
 * Each species has fixed behavioral weights that define their personality.
 * DNA still controls physical traits (size, speed) but behavior is species-locked.
 */
export const SPECIES_TYPES = {
    FLORAE: {
        id: 'florae',
        name: 'Florae',
        emoji: '🌿',
        description: 'Peaceful herbivores that flock together',
        // Appearance
        hueRange: [100, 145],      // green spectrum
        saturationRange: [55, 85],
        bodyShapeRange: [0.6, 1.0], // rounder bodies
        sizeRange: [5, 14],
        speedRange: [0.4, 1.5],
        // Behavior weights
        behavior: {
            hungerThreshold: 0.75,   // start eating early (cautious)
            fleeDistance: 80,         // flee from far away (skittish)
            fleeStrength: 3.0,       // run fast from predators
            seekFoodStrength: 1.8,   // strong food seeking
            socialDrive: 0.8,        // loves to flock
            flockRadius: 100,        // how close they flock
            aggression: 0,           // never attacks
            curiosity: 0.2,          // doesn't explore much
            wanderStrength: 0.2,     // stays near food/group
        },
        // Diet
        diet: 'herbivore',           // only eats plant food
    },

    PREDAXI: {
        id: 'predaxi',
        name: 'Predaxi',
        emoji: '🔴',
        description: 'Aggressive carnivore hunters',
        // Appearance
        hueRange: [0, 30],          // red-orange spectrum
        saturationRange: [60, 90],
        bodyShapeRange: [0.1, 0.4], // elongated predator bodies
        sizeRange: [8, 18],
        speedRange: [1.2, 2.5],
        // Behavior weights
        behavior: {
            hungerThreshold: 0.6,    // tolerates more hunger before eating
            fleeDistance: 30,         // almost never flees
            fleeStrength: 1.0,       // slow to flee
            seekFoodStrength: 2.5,   // very aggressive hunting
            socialDrive: 0.1,        // solitary
            flockRadius: 0,          // doesn't flock
            aggression: 0.9,         // very aggressive
            curiosity: 0.5,          // moderate exploration
            wanderStrength: 0.4,     // patrols territory
        },
        // Diet
        diet: 'carnivore',           // hunts other creatures
    },

    MIXOLITH: {
        id: 'mixolith',
        name: 'Mixolith',
        emoji: '🔵',
        description: 'Adaptive omnivore explorers',
        // Appearance
        hueRange: [200, 250],       // blue-cyan spectrum
        saturationRange: [50, 80],
        bodyShapeRange: [0.35, 0.65], // medium body shape
        sizeRange: [5, 13],
        speedRange: [0.6, 2.0],
        // Behavior weights
        behavior: {
            hungerThreshold: 0.65,   // balanced hunger awareness
            fleeDistance: 50,         // moderate flee distance
            fleeStrength: 2.0,       // decent escape speed
            seekFoodStrength: 1.5,   // balanced food seeking
            socialDrive: 0.4,        // sometimes social
            flockRadius: 60,         // moderate flocking
            aggression: 0.3,         // somewhat aggressive
            curiosity: 0.9,          // loves to explore
            wanderStrength: 0.5,     // wanders far
        },
        // Diet
        diet: 'omnivore',            // eats anything
    },
};

/**
 * EVOLUTION ERAS — SPORE-inspired progression
 * Era changes based on max generation reached
 */
export const EVOLUTION_ERAS = [
    {
        id: 'primordial',
        name: 'Primordial Soup',
        emoji: '🦠',
        genRange: [0, 5],
        description: 'The dawn of life. Simple organisms drift and feed.',
        bgTint: [2, 10, 24],         // darkest
    },
    {
        id: 'cell_age',
        name: 'Cell Age',
        emoji: '🧫',
        genRange: [6, 15],
        description: 'Cells become more complex. Predators emerge.',
        bgTint: [4, 14, 30],         // slightly brighter
    },
    {
        id: 'organism_age',
        name: 'Organism Age',
        emoji: '🐛',
        genRange: [16, 30],
        description: 'Specialized organisms with distinct behaviors.',
        bgTint: [6, 18, 36],         // more depth
    },
    {
        id: 'colony_age',
        name: 'Colony Age',
        emoji: '🏘️',
        genRange: [31, Infinity],
        description: 'Social structures form. Cooperation and rivalry.',
        bgTint: [8, 22, 42],         // most vibrant
    },
];

/**
 * Get the current era based on max generation
 */
export function getCurrentEra(maxGeneration) {
    for (let i = EVOLUTION_ERAS.length - 1; i >= 0; i--) {
        if (maxGeneration >= EVOLUTION_ERAS[i].genRange[0]) {
            return EVOLUTION_ERAS[i];
        }
    }
    return EVOLUTION_ERAS[0];
}

/**
 * Get a random species type for spawning
 * Weighted: more herbivores to sustain ecosystem
 */
export function getRandomSpeciesType() {
    const roll = Math.random();
    if (roll < 0.50) return SPECIES_TYPES.FLORAE;     // 50% herbivores
    if (roll < 0.75) return SPECIES_TYPES.MIXOLITH;    // 25% omnivores
    return SPECIES_TYPES.PREDAXI;                       // 25% carnivores
}

/**
 * Generate species-appropriate DNA
 */
export function generateSpeciesDNA(speciesType) {
    const st = speciesType;
    const dna = new Float32Array(8);

    // Gene 0: size — within species range
    dna[0] = Math.random(); // will be mapped by species range in expressDNA

    // Gene 1: speed
    dna[1] = Math.random();

    // Gene 2: hue — locked to species color range
    const hueNorm = (st.hueRange[0] + Math.random() * (st.hueRange[1] - st.hueRange[0])) / 360;
    dna[2] = hueNorm;

    // Gene 3: saturation — locked to species range
    dna[3] = (st.saturationRange[0] + Math.random() * (st.saturationRange[1] - st.saturationRange[0]) - 50) / 50;

    // Gene 4: diet — locked to species
    if (st.diet === 'herbivore') dna[4] = Math.random() * 0.2;       // 0-0.2
    else if (st.diet === 'carnivore') dna[4] = 0.8 + Math.random() * 0.2; // 0.8-1.0
    else dna[4] = 0.3 + Math.random() * 0.35;                         // 0.3-0.65

    // Gene 5: perception — general randomness
    dna[5] = Math.random();

    // Gene 6: body shape — locked to species range
    dna[6] = st.bodyShapeRange[0] + Math.random() * (st.bodyShapeRange[1] - st.bodyShapeRange[0]);

    // Gene 7: social tendency
    dna[7] = Math.max(0, Math.min(1, st.behavior.socialDrive + (Math.random() - 0.5) * 0.3));

    return dna;
}

/**
 * Determine species type from DNA (for offspring)
 * Checks which species range the hue/diet falls into
 */
export function getSpeciesTypeFromDNA(dna) {
    const diet = dna[4];
    if (diet < 0.33) return SPECIES_TYPES.FLORAE;
    if (diet > 0.66) return SPECIES_TYPES.PREDAXI;
    return SPECIES_TYPES.MIXOLITH;
}
