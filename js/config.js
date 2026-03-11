// ============================================
// TERRARIUM — Configuration & Constants
// ============================================

export const CONFIG = {
    // Canvas
    CANVAS: {
        BG_COLOR: '#020a18',
        BG_GRADIENT_TOP: '#020a18',
        BG_GRADIENT_BOTTOM: '#061428',
    },

    // Ecosystem
    ECOSYSTEM: {
        INITIAL_CREATURES: 20,
        INITIAL_FOOD: 40,
        MAX_CREATURES: 150,
        MAX_FOOD: 80,
        FOOD_SPAWN_RATE: 0.02,        // chance per frame to spawn food
        FOOD_ENERGY: 30,
        FOOD_SIZE_MIN: 3,
        FOOD_SIZE_MAX: 7,
    },

    // Creature defaults
    CREATURE: {
        SIZE_MIN: 4,
        SIZE_MAX: 18,
        SPEED_MIN: 0.3,
        SPEED_MAX: 2.5,
        INITIAL_ENERGY: 80,
        MAX_ENERGY: 150,
        ENERGY_DECAY: 0.04,            // energy lost per frame
        ENERGY_MOVE_COST: 0.01,        // additional cost per unit moved
        REPRODUCTION_THRESHOLD: 100,   // min energy to reproduce
        REPRODUCTION_COST: 50,         // energy cost to reproduce
        REPRODUCTION_COOLDOWN: 300,    // frames between reproductions
        PERCEPTION_RADIUS: 120,        // how far they can "see"
        FLEE_RADIUS: 60,               // distance to start fleeing
        MAX_AGE: 3000,                 // frames before natural death
        WANDER_STRENGTH: 0.3,
        SEEK_STRENGTH: 1.5,
        FLEE_STRENGTH: 2.5,
    },

    // Genetics
    GENETICS: {
        MUTATION_RATE: 0.15,            // chance per gene to mutate
        MUTATION_STRENGTH: 0.2,         // max change per mutation
        SPECIES_THRESHOLD: 0.35,        // DNA distance to be a different species
        DNA_LENGTH: 8,                  // number of genes
    },

    // Visuals
    VISUALS: {
        GLOW_INTENSITY: 0.4,
        PARTICLE_COUNT: 30,
        TRAIL_LENGTH: 5,
        AMBIENT_PARTICLE_COUNT: 50,
    },

    // Simulation
    SIM: {
        TARGET_FPS: 60,
        SPEED_MULTIPLIER: 1,
    },
};
