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
        INITIAL_FOOD: 60,
        MAX_CREATURES: 150,
        MAX_FOOD: 120,
        FOOD_SPAWN_RATE: 0.05,
        FOOD_ENERGY: 35,
        FOOD_SIZE_MIN: 3,
        FOOD_SIZE_MAX: 7,
    },

    // Creature defaults
    CREATURE: {
        SIZE_MIN: 4,
        SIZE_MAX: 18,
        SPEED_MIN: 0.3,
        SPEED_MAX: 2.5,
        // Health (HP) — separate from energy
        MAX_HP: 100,
        INITIAL_HP: 100,
        HP_REGEN: 0.005,               // HP regen per frame when energy > 50%
        // Energy (Stamina)
        INITIAL_ENERGY: 100,
        MAX_ENERGY: 150,
        ENERGY_DECAY: 0.012,            // passive energy drain
        ENERGY_MOVE_COST: 0.004,        // cost per movement
        ENERGY_SPRINT_COST: 0.04,       // cost for fleeing/chasing
        ENERGY_ATTACK_COST: 15,         // flat cost per attack
        ENERGY_LOW_SPEED_MULT: 0.4,     // speed multiplier when energy = 0
        // Reproduction
        REPRODUCTION_THRESHOLD: 80,
        REPRODUCTION_COST: 35,
        REPRODUCTION_COOLDOWN: 200,
        // Perception
        PERCEPTION_RADIUS: 140,
        FLEE_RADIUS: 60,
        MAX_AGE: 3000,
        // Steering
        WANDER_STRENGTH: 0.3,
        SEEK_STRENGTH: 1.5,
        FLEE_STRENGTH: 2.5,
        // Fullness / Satiety
        FULLNESS_MAX: 100,
        FULLNESS_INITIAL: 50,
        FULLNESS_DECAY: 0.025,
        FULLNESS_EAT_THRESHOLD: 50,
        FULLNESS_FULL_THRESHOLD: 85,
        FULLNESS_PLANT: 35,
        FULLNESS_MEAT: 50,              // meat is more filling than plants
        DIGEST_COOLDOWN: 40,
    },

    // Combat
    COMBAT: {
        INSTANT_KILL_RATIO: 0.7,        // prey < 70% predator size → instant kill
        FIGHT_MAX_RATIO: 1.3,           // prey < 130% predator size → fight
        // Above 130% → predator avoids
        ATTACK_DAMAGE: 20,              // base damage per hit
        SIZE_DAMAGE_MULT: 1.5,          // bigger = more damage
        COUNTER_DAMAGE_MULT: 0.3,       // prey hits back at 30% damage
        ATTACK_COOLDOWN: 30,            // frames between attacks
    },

    // Meat chunks
    MEAT: {
        BASE_CHUNKS: 3,                 // min chunks per death
        SIZE_BONUS_CHUNKS: 0.2,         // extra chunk per size unit
        CHUNK_ENERGY: 25,               // energy per meat chunk
        CHUNK_FULLNESS: 20,             // fullness per meat chunk
        CHUNK_SIZE_MIN: 3,
        CHUNK_SIZE_MAX: 6,
        DECAY_TIME: 500,                // frames before meat decays
        SCATTER_RADIUS: 25,             // how far chunks scatter
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
