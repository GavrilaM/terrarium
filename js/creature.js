// ============================================
// TERRARIUM — Creature System
// Autonomous creature with species-driven behavior
// ============================================

import { CONFIG } from './config.js';
import { expressDNA, getDietLabel, crossover, mutate } from './genetics.js';
import { getSpeciesTypeFromDNA, generateSpeciesDNA, getRandomSpeciesType } from './species.js';

const { CREATURE } = CONFIG;

let creatureIdCounter = 0;

// ---- Vector2 Utilities ----

function vec2(x = 0, y = 0) { return { x, y }; }

function vec2Dist(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function vec2Normalize(v) {
    const len = Math.sqrt(v.x * v.x + v.y * v.y);
    return len === 0 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
}

function vec2Sub(a, b) { return { x: a.x - b.x, y: a.y - b.y }; }
function vec2Add(a, b) { return { x: a.x + b.x, y: a.y + b.y }; }
function vec2Scale(v, s) { return { x: v.x * s, y: v.y * s }; }

function vec2Limit(v, max) {
    const lenSq = v.x * v.x + v.y * v.y;
    if (lenSq > max * max) {
        const n = vec2Normalize(v);
        return { x: n.x * max, y: n.y * max };
    }
    return v;
}

// Behavior states
export const STATES = {
    WANDER: 'wander',
    SEEK_FOOD: 'seek_food',
    SEEK_MATE: 'seek_mate',
    FLEE: 'flee',
    FLOCK: 'flock',
    HUNT: 'hunt',
    EXPLORE: 'explore',
    CRITICAL_HUNGER: 'critical_hunger',
};

/**
 * Create a new creature — use this instead of `new Creature()` directly
 */
export function createCreature(x, y, speciesType = null, dna = null, generation = 0) {
    const st = speciesType || getRandomSpeciesType();
    const creatureDna = dna || generateSpeciesDNA(st);
    return new Creature(x, y, creatureDna, st, generation);
}

export class Creature {
    constructor(x, y, dna, speciesType, generation = 0) {
        this.id = creatureIdCounter++;
        this.pos = vec2(x, y);
        this.vel = vec2((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2);
        this.acc = vec2(0, 0);

        // Species identity
        this.speciesType = speciesType;
        this.behavior = speciesType.behavior;

        // DNA & Traits
        this.dna = dna;
        this.traits = expressDNA(this.dna);
        // Override traits with species constraints
        this.traits.size = speciesType.sizeRange[0] + this.dna[0] * (speciesType.sizeRange[1] - speciesType.sizeRange[0]);
        this.traits.speed = speciesType.speedRange[0] + this.dna[1] * (speciesType.speedRange[1] - speciesType.speedRange[0]);
        this.speciesName = speciesType.name;

        // State
        this.state = STATES.WANDER;
        this.energy = CREATURE.INITIAL_ENERGY;
        this.age = 0;
        this.generation = generation;
        this.alive = true;
        this.children = 0;
        this.reproductionCooldown = 0;

        // Death tracking
        this.causeOfDeath = null;
        this.killedBy = null;

        // Visuals
        this.glowPhase = Math.random() * Math.PI * 2;
        this.trail = [];
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.eatTimer = 0;
    }

    /**
     * Main update — called each frame
     */
    update(ecosystem, canvasW, canvasH, dt = 1) {
        if (!this.alive) return;

        this.age += dt;
        this.glowPhase += 0.03 * dt;
        this.pulsePhase += 0.05 * dt;
        if (this.reproductionCooldown > 0) this.reproductionCooldown -= dt;
        if (this.eatTimer > 0) this.eatTimer -= dt;

        // Energy decay
        const sizeCost = this.traits.size * 0.001;
        const speedCost = this.traits.speed * CREATURE.ENERGY_MOVE_COST;
        this.energy -= (CREATURE.ENERGY_DECAY + sizeCost + speedCost) * dt;

        // Die of starvation
        if (this.energy <= 0) {
            this.alive = false;
            this.causeOfDeath = 'starvation';
            return;
        }

        // Die of old age
        if (this.age >= CREATURE.MAX_AGE) {
            this.alive = false;
            this.causeOfDeath = 'old_age';
            return;
        }

        // ALWAYS pick up food you walk over (passive eating)
        this._passiveEat(ecosystem);

        // Decide behavior based on species personality
        this._decide(ecosystem);

        // Apply movement
        this.vel = vec2Add(this.vel, this.acc);
        this.vel = vec2Limit(this.vel, this.traits.speed);
        this.pos = vec2Add(this.pos, vec2Scale(this.vel, dt));
        this.acc = vec2(0, 0);

        // Wrap around edges
        if (this.pos.x < 0) this.pos.x = canvasW;
        if (this.pos.x > canvasW) this.pos.x = 0;
        if (this.pos.y < 0) this.pos.y = canvasH;
        if (this.pos.y > canvasH) this.pos.y = 0;

        // Trail
        this.trail.push({ x: this.pos.x, y: this.pos.y });
        if (this.trail.length > CONFIG.VISUALS.TRAIL_LENGTH) {
            this.trail.shift();
        }
    }

    /**
     * PASSIVE EATING — always eat food you walk over, regardless of state
     * This prevents the "refuses to eat" bug
     */
    _passiveEat(ecosystem) {
        if (this.speciesType.diet === 'carnivore') return; // carnivores don't eat plants

        const nearbyFood = ecosystem.getFoodNear(this.pos, this.traits.size + 8);
        for (const food of nearbyFood) {
            if (!food.alive) continue;
            this.energy = Math.min(CREATURE.MAX_ENERGY, this.energy + food.energy);
            ecosystem.removeFood(food);
            this.eatTimer = 10;
            return; // eat one at a time
        }
    }

    /**
     * Priority-based decision system
     * 
     * Priority 1: CRITICAL HUNGER (energy < 30%) → ALWAYS seek food
     * Priority 2: FLEE (threat within species-specific flee distance)
     * Priority 3: HUNGRY (energy < species hunger threshold) → Seek food
     * Priority 4: REPRODUCE (energy > threshold + cooldown done)
     * Priority 5: SPECIES BEHAVIOR (flock/hunt/explore)
     * Priority 6: WANDER
     */
    _decide(ecosystem) {
        const nearbyFood = ecosystem.getFoodNear(this.pos, this.traits.perceptionRange);
        const nearbyCreatures = ecosystem.getCreaturesNear(this.pos, this.traits.perceptionRange, this.id);
        const energyPercent = this.energy / CREATURE.MAX_ENERGY;

        // ===== PRIORITY 1: CRITICAL HUNGER (< 30% energy) =====
        if (energyPercent < 0.30) {
            this.state = STATES.CRITICAL_HUNGER;
            if (this._seekAnyFood(ecosystem, nearbyFood, nearbyCreatures)) return;
            // No food found — desperately wander
            this._wander();
            return;
        }

        // ===== PRIORITY 2: FLEE from threats =====
        const threats = this._identifyThreats(nearbyCreatures);
        const nearestThreat = this._nearest(threats);
        if (nearestThreat) {
            const threatDist = vec2Dist(this.pos, nearestThreat.pos);
            if (threatDist < this.behavior.fleeDistance) {
                this.state = STATES.FLEE;
                this._flee(nearestThreat.pos, this.behavior.fleeStrength);
                return;
            }
        }

        // ===== PRIORITY 3: HUNGRY (below species hunger threshold) =====
        if (energyPercent < this.behavior.hungerThreshold) {
            this.state = STATES.SEEK_FOOD;
            if (this._seekAnyFood(ecosystem, nearbyFood, nearbyCreatures)) return;
        }

        // ===== PRIORITY 4: REPRODUCE =====
        if (this.energy >= CREATURE.REPRODUCTION_THRESHOLD && this.reproductionCooldown <= 0) {
            // Only mate with same species type
            const mates = nearbyCreatures.filter(c =>
                c.alive &&
                c.speciesType.id === this.speciesType.id &&
                c.energy >= CREATURE.REPRODUCTION_THRESHOLD * 0.8 &&
                c.reproductionCooldown <= 0
            );
            const nearestMate = this._nearest(mates);
            if (nearestMate) {
                this.state = STATES.SEEK_MATE;
                this._seek(nearestMate.pos, this.behavior.seekFoodStrength);

                if (vec2Dist(this.pos, nearestMate.pos) < this.traits.size + nearestMate.traits.size + 5) {
                    const child = this.reproduce(nearestMate);
                    if (child) ecosystem.addCreature(child);
                }
                return;
            }
        }

        // ===== PRIORITY 5: SPECIES-SPECIFIC BEHAVIOR =====
        this._speciesBehavior(nearbyCreatures, nearbyFood, ecosystem);
    }

    /**
     * Species-specific idle behavior
     */
    _speciesBehavior(nearbyCreatures, nearbyFood, ecosystem) {
        const diet = this.speciesType.diet;

        // FLORAE: Flock with other Florae
        if (diet === 'herbivore' && this.behavior.socialDrive > 0.5) {
            const flock = nearbyCreatures.filter(c =>
                c.speciesType.id === 'florae' && c.alive
            );
            if (flock.length > 0) {
                this.state = STATES.FLOCK;
                // Move toward center of flock
                const center = this._centerOf(flock);
                const dist = vec2Dist(this.pos, center);
                if (dist > this.behavior.flockRadius * 0.3) {
                    this._seek(center, this.behavior.socialDrive * 0.5);
                } else {
                    this._wander(); // already close, gentle wander
                }
                return;
            }
        }

        // PREDAXI: Patrol and hunt proactively
        if (diet === 'carnivore' && this.behavior.aggression > 0.5) {
            const prey = nearbyCreatures.filter(c =>
                c.speciesType.id !== 'predaxi' &&
                c.traits.size < this.traits.size * 1.1 &&
                c.alive
            );
            const nearestPrey = this._nearest(prey);
            if (nearestPrey) {
                this.state = STATES.HUNT;
                this._seek(nearestPrey.pos, this.behavior.seekFoodStrength);

                // Attack if close enough
                if (vec2Dist(this.pos, nearestPrey.pos) < this.traits.size + nearestPrey.traits.size) {
                    this.energy = Math.min(CREATURE.MAX_ENERGY, this.energy + nearestPrey.energy * 0.5);
                    nearestPrey.alive = false;
                    nearestPrey.causeOfDeath = 'killed';
                    nearestPrey.killedBy = this;
                    this.eatTimer = 20;
                }
                return;
            }
        }

        // MIXOLITH: Explore far and wide
        if (diet === 'omnivore' && this.behavior.curiosity > 0.5) {
            this.state = STATES.EXPLORE;
            // Wander with wider range and occasionally change direction dramatically
            if (Math.random() < 0.02) {
                this.wanderAngle = Math.random() * Math.PI * 2;
            }
            this._wander(this.behavior.wanderStrength);
            return;
        }

        // Default: WANDER
        this.state = STATES.WANDER;
        this._wander();
    }

    /**
     * Seek any available food based on diet
     */
    _seekAnyFood(ecosystem, nearbyFood, nearbyCreatures) {
        const diet = this.speciesType.diet;

        // Herbivore: only plant food
        if (diet === 'herbivore') {
            return this._seekPlantFood(nearbyFood, ecosystem);
        }

        // Carnivore: hunt creatures
        if (diet === 'carnivore') {
            if (this._seekPrey(nearbyCreatures)) return true;
            return false; // carnivores don't eat plants
        }

        // Omnivore: try both — prefer easier option
        if (this._seekPlantFood(nearbyFood, ecosystem)) return true;
        if (this._seekPrey(nearbyCreatures)) return true;
        return false;
    }

    _seekPlantFood(nearbyFood, ecosystem) {
        const nearestFood = this._nearestFood(nearbyFood);
        if (!nearestFood) return false;

        this._seek(nearestFood.pos, this.behavior.seekFoodStrength);

        // Eat if close enough
        if (vec2Dist(this.pos, nearestFood.pos) < this.traits.size + nearestFood.size + 3) {
            this.energy = Math.min(CREATURE.MAX_ENERGY, this.energy + nearestFood.energy);
            ecosystem.removeFood(nearestFood);
            this.eatTimer = 12;
        }
        return true;
    }

    _seekPrey(nearbyCreatures) {
        const prey = nearbyCreatures.filter(c =>
            c.alive &&
            c.traits.size < this.traits.size * 1.1 &&
            c.speciesType.id !== this.speciesType.id // don't eat own species
        );
        const nearestPrey = this._nearest(prey);
        if (!nearestPrey) return false;

        this._seek(nearestPrey.pos, this.behavior.seekFoodStrength);

        // Attack if close
        if (vec2Dist(this.pos, nearestPrey.pos) < this.traits.size + nearestPrey.traits.size) {
            this.energy = Math.min(CREATURE.MAX_ENERGY, this.energy + nearestPrey.energy * 0.5);
            nearestPrey.alive = false;
            nearestPrey.causeOfDeath = 'killed';
            nearestPrey.killedBy = this;
            this.eatTimer = 20;
        }
        return true;
    }

    /**
     * Identify threats based on species
     */
    _identifyThreats(nearbyCreatures) {
        if (this.speciesType.diet === 'carnivore') {
            // Only flee from bigger carnivores
            return nearbyCreatures.filter(c =>
                c.speciesType.id === 'predaxi' &&
                c.traits.size > this.traits.size * 1.3
            );
        }
        // Herbivores/Omnivores flee from carnivores
        return nearbyCreatures.filter(c =>
            c.speciesType.diet === 'carnivore' &&
            c.traits.size > this.traits.size * 0.7
        );
    }

    // ---- Steering Behaviors ----

    _seek(targetPos, strength = CREATURE.SEEK_STRENGTH) {
        const desired = vec2Sub(targetPos, this.pos);
        const dn = vec2Normalize(desired);
        const steer = vec2Sub(vec2Scale(dn, this.traits.speed), this.vel);
        this.acc = vec2Add(this.acc, vec2Limit(steer, strength));
    }

    _flee(threatPos, strength = CREATURE.FLEE_STRENGTH) {
        const desired = vec2Sub(this.pos, threatPos);
        const dn = vec2Normalize(desired);
        const steer = vec2Sub(vec2Scale(dn, this.traits.speed), this.vel);
        this.acc = vec2Add(this.acc, vec2Limit(steer, strength));
    }

    _wander(strength) {
        const s = strength || this.behavior.wanderStrength || CREATURE.WANDER_STRENGTH;
        this.wanderAngle += (Math.random() - 0.5) * 0.5;
        this.acc = vec2Add(this.acc, {
            x: Math.cos(this.wanderAngle) * s,
            y: Math.sin(this.wanderAngle) * s,
        });
    }

    /**
     * Reproduce with another creature (same species)
     */
    reproduce(mate) {
        if (this.energy < CREATURE.REPRODUCTION_COST || mate.energy < CREATURE.REPRODUCTION_COST * 0.8) {
            return null;
        }

        this.energy -= CREATURE.REPRODUCTION_COST;
        mate.energy -= CREATURE.REPRODUCTION_COST * 0.8;
        this.reproductionCooldown = CREATURE.REPRODUCTION_COOLDOWN;
        mate.reproductionCooldown = CREATURE.REPRODUCTION_COOLDOWN;

        let childDNA = crossover(this.dna, mate.dna);
        childDNA = mutate(childDNA);

        const childGen = Math.max(this.generation, mate.generation) + 1;
        const offset = {
            x: (Math.random() - 0.5) * 30,
            y: (Math.random() - 0.5) * 30,
        };

        this.children++;
        mate.children++;

        // Child inherits parent species type (determined by DNA)
        const childSpecies = getSpeciesTypeFromDNA(childDNA);

        return new Creature(
            this.pos.x + offset.x,
            this.pos.y + offset.y,
            childDNA,
            childSpecies,
            childGen
        );
    }

    // ---- Helpers ----

    _nearest(entities) {
        let nearest = null, nearestDist = Infinity;
        for (const e of entities) {
            const d = vec2Dist(this.pos, e.pos);
            if (d < nearestDist) { nearestDist = d; nearest = e; }
        }
        return nearest;
    }

    _nearestFood(foodList) {
        let nearest = null, nearestDist = Infinity;
        for (const f of foodList) {
            const d = vec2Dist(this.pos, f.pos);
            if (d < nearestDist) { nearestDist = d; nearest = f; }
        }
        return nearest;
    }

    _centerOf(creatures) {
        let cx = 0, cy = 0;
        for (const c of creatures) { cx += c.pos.x; cy += c.pos.y; }
        return { x: cx / creatures.length, y: cy / creatures.length };
    }

    // ---- Visual Helpers ----

    getColor(alpha = 1) {
        return `hsla(${this.traits.hue}, ${this.traits.saturation}%, 65%, ${alpha})`;
    }

    getGlowColor(alpha = 0.3) {
        return `hsla(${this.traits.hue}, ${this.traits.saturation}%, 65%, ${alpha})`;
    }

    getDietLabel() {
        return getDietLabel(this.traits.diet);
    }
}
