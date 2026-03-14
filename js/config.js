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

    // World (larger than screen — camera pans over this)
    WORLD: {
        WIDTH: 3000,
        HEIGHT: 2000,
        EDGE_MARGIN: 20,                // soft boundary thickness
        EDGE_FORCE: 0.8,               // how hard creatures bounce off edges
    },

    // Camera
    CAMERA: {
        ZOOM_MIN: 0.25,
        ZOOM_MAX: 2.5,
        ZOOM_SPEED: 0.08,
        PAN_SPEED: 1,
        SMOOTH_FACTOR: 0.12,           // lerp smoothing
    },

    // Ecosystem
    ECOSYSTEM: {
        INITIAL_CREATURES: 5,            // ★ start small
        INITIAL_FOOD: 40,
        MAX_CREATURES: 120,
        MAX_FOOD: 100,
        FOOD_SPAWN_RATE: 0.05,
        FOOD_ENERGY: 35,
        FOOD_SIZE_MIN: 3,
        FOOD_SIZE_MAX: 7,
        // Carrying capacity
        CARRY_CAPACITY_RATIO: 2.5,      // ideal food:creature ratio
        MIN_REPRO_POP: 0,              // min pop before repro allowed
        // Overcrowding
        OVERCROWD_RADIUS: 60,          // check density in this radius
        OVERCROWD_THRESHOLD: 5,        // > this many = stress
        OVERCROWD_ENERGY_DRAIN: 0.08,  // energy drain per frame when overcrowded
        OVERCROWD_HP_DRAIN: 0.01,      // HP drain per frame when overcrowded
        // Dynamic reproduction cost
        REPRO_BASE_COST: 35,
        REPRO_POP_SCALE: 0.25,         // extra cost per creature alive
    },

    // Creature defaults
    CREATURE: {
        SIZE_MIN: 4,
        SIZE_MAX: 18,
        SPEED_MIN: 0.3,
        SPEED_MAX: 2.5,
        MAX_HP: 100,
        INITIAL_HP: 100,
        HP_REGEN: 0.005,
        INITIAL_ENERGY: 100,
        MAX_ENERGY: 150,
        ENERGY_DECAY: 0.012,
        ENERGY_MOVE_COST: 0.004,
        ENERGY_SPRINT_COST: 0.04,
        ENERGY_ATTACK_COST: 15,
        ENERGY_LOW_SPEED_MULT: 0.4,
        REPRODUCTION_THRESHOLD: 80,
        REPRODUCTION_COST: 35,
        REPRODUCTION_COOLDOWN: 200,
        PERCEPTION_RADIUS: 140,
        FLEE_RADIUS: 60,
        MAX_AGE: 3000,
        WANDER_STRENGTH: 0.3,
        SEEK_STRENGTH: 1.5,
        FLEE_STRENGTH: 2.5,
        // Fullness
        FULLNESS_MAX: 100,
        FULLNESS_INITIAL: 50,
        FULLNESS_DECAY: 0.025,
        FULLNESS_EAT_THRESHOLD: 50,
        FULLNESS_FULL_THRESHOLD: 85,
        FULLNESS_PLANT: 35,
        FULLNESS_MEAT: 50,
        DIGEST_COOLDOWN: 40,
        // Stuck detection
        STUCK_SPEED_THRESHOLD: 0.15,   // if speed < this → creature is stuck
        STUCK_WANDER_BOOST: 2.0,       // extra wander when stuck
    },

    // Combat
    COMBAT: {
        INSTANT_KILL_RATIO: 0.7,
        FIGHT_MAX_RATIO: 1.3,
        ATTACK_DAMAGE: 20,
        SIZE_DAMAGE_MULT: 1.5,
        COUNTER_DAMAGE_MULT: 0.3,
        ATTACK_COOLDOWN: 30,
    },

    // Meat chunks
    MEAT: {
        BASE_CHUNKS: 3,
        SIZE_BONUS_CHUNKS: 0.2,
        CHUNK_ENERGY: 25,
        CHUNK_FULLNESS: 20,
        CHUNK_SIZE_MIN: 3,
        CHUNK_SIZE_MAX: 6,
        DECAY_TIME: 500,
        SCATTER_RADIUS: 25,
    },

    // Environmental Events
    EVENTS: {
        MIN_INTERVAL: 600,
        MAX_INTERVAL: 1800,
        BLOOM_FOOD_COUNT: 20,
        TOXIC_DURATION: 300,
        TOXIC_RADIUS: 80,
        TOXIC_DAMAGE: 0.5,
        CURRENT_DURATION: 200,
        CURRENT_STRENGTH: 0.8,
    },

    // Genetics
    GENETICS: {
        MUTATION_RATE: 0.15,
        MUTATION_STRENGTH: 0.2,
        SPECIES_THRESHOLD: 0.35,
        DNA_LENGTH: 8,
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
