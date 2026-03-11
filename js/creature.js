// ============================================
// TERRARIUM — Creature System
// Autonomous creature with DNA-driven behavior
// ============================================

import { CONFIG } from './config.js';
import { expressDNA, getDietLabel, generateSpeciesName, crossover, mutate, generateRandomDNA } from './genetics.js';

const { CREATURE } = CONFIG;

let creatureIdCounter = 0;

/**
 * Vector2 utility
 */
function vec2(x = 0, y = 0) {
    return { x, y };
}

function vec2Dist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function vec2Normalize(v) {
    const len = Math.sqrt(v.x * v.x + v.y * v.y);
    if (len === 0) return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
}

function vec2Sub(a, b) {
    return { x: a.x - b.x, y: a.y - b.y };
}

function vec2Add(a, b) {
    return { x: a.x + b.x, y: a.y + b.y };
}

function vec2Scale(v, s) {
    return { x: v.x * s, y: v.y * s };
}

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
    EATING: 'eating',
};

export class Creature {
    constructor(x, y, dna = null, generation = 0) {
        this.id = creatureIdCounter++;
        this.pos = vec2(x, y);
        this.vel = vec2((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2);
        this.acc = vec2(0, 0);

        // DNA & Traits
        this.dna = dna || generateRandomDNA();
        this.traits = expressDNA(this.dna);
        this.speciesName = generateSpeciesName(this.dna);

        // State
        this.state = STATES.WANDER;
        this.energy = CREATURE.INITIAL_ENERGY;
        this.age = 0;
        this.generation = generation;
        this.alive = true;
        this.children = 0;
        this.reproductionCooldown = 0;

        // Visuals
        this.glowPhase = Math.random() * Math.PI * 2;
        this.trail = [];
        this.targetAngle = Math.random() * Math.PI * 2;
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.pulsePhase = Math.random() * Math.PI * 2;

        // Eating animation
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

        // Die of old age or starvation
        if (this.energy <= 0 || this.age >= CREATURE.MAX_AGE) {
            this.alive = false;
            return;
        }

        // Decide behavior
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
     * Decide current behavior based on state
     */
    _decide(ecosystem) {
        const nearbyFood = ecosystem.getFoodNear(this.pos, this.traits.perceptionRange);
        const nearbyCreatures = ecosystem.getCreaturesNear(this.pos, this.traits.perceptionRange, this.id);

        // Check for threats (carnivores if we are herbivore, or bigger creatures)
        const threats = nearbyCreatures.filter(c => {
            if (c.traits.diet > 0.5 && this.traits.diet < 0.5) return true;
            if (c.traits.size > this.traits.size * 1.3 && c.traits.diet > 0.3) return true;
            return false;
        });

        const nearestThreat = this._nearest(threats);

        // FLEE if threat is close
        if (nearestThreat && vec2Dist(this.pos, nearestThreat.pos) < CREATURE.FLEE_RADIUS) {
            this.state = STATES.FLEE;
            this._flee(nearestThreat.pos);
            return;
        }

        // SEEK_FOOD if hungry
        if (this.energy < CREATURE.REPRODUCTION_THRESHOLD * 0.7) {
            if (this.traits.diet < 0.5) {
                // Herbivore — seek plant food
                const nearestFood = this._nearestFood(nearbyFood);
                if (nearestFood) {
                    this.state = STATES.SEEK_FOOD;
                    this._seek(nearestFood.pos);

                    // Eat if close enough
                    if (vec2Dist(this.pos, nearestFood.pos) < this.traits.size + nearestFood.size) {
                        this.energy = Math.min(CREATURE.MAX_ENERGY, this.energy + nearestFood.energy);
                        ecosystem.removeFood(nearestFood);
                        this.eatTimer = 15;
                    }
                    return;
                }
            } else {
                // Carnivore/Omnivore — hunt smaller creatures
                const prey = nearbyCreatures.filter(c =>
                    c.traits.size < this.traits.size * 0.9 && c.alive
                );
                const nearestPrey = this._nearest(prey);
                if (nearestPrey) {
                    this.state = STATES.SEEK_FOOD;
                    this._seek(nearestPrey.pos);

                    // Attack if close
                    if (vec2Dist(this.pos, nearestPrey.pos) < this.traits.size + nearestPrey.traits.size) {
                        this.energy = Math.min(CREATURE.MAX_ENERGY, this.energy + nearestPrey.energy * 0.5);
                        nearestPrey.alive = false;
                        this.eatTimer = 20;
                    }
                    return;
                }

                // Omnivore fallback — eat plant food too
                if (this.traits.diet < 0.66) {
                    const nearestFood = this._nearestFood(nearbyFood);
                    if (nearestFood) {
                        this.state = STATES.SEEK_FOOD;
                        this._seek(nearestFood.pos);
                        if (vec2Dist(this.pos, nearestFood.pos) < this.traits.size + nearestFood.size) {
                            this.energy = Math.min(CREATURE.MAX_ENERGY, this.energy + nearestFood.energy);
                            ecosystem.removeFood(nearestFood);
                            this.eatTimer = 15;
                        }
                        return;
                    }
                }
            }
        }

        // SEEK_MATE if enough energy and cooldown done
        if (this.energy >= CREATURE.REPRODUCTION_THRESHOLD && this.reproductionCooldown <= 0) {
            const mates = nearbyCreatures.filter(c =>
                c.alive && c.energy >= CREATURE.REPRODUCTION_THRESHOLD * 0.8 &&
                c.reproductionCooldown <= 0
            );
            const nearestMate = this._nearest(mates);
            if (nearestMate) {
                this.state = STATES.SEEK_MATE;
                this._seek(nearestMate.pos);

                // Reproduce if close
                if (vec2Dist(this.pos, nearestMate.pos) < this.traits.size + nearestMate.traits.size) {
                    const child = this.reproduce(nearestMate);
                    if (child) {
                        ecosystem.addCreature(child);
                    }
                }
                return;
            }
        }

        // Default: WANDER
        this.state = STATES.WANDER;
        this._wander();
    }

    /**
     * Steering behaviors
     */
    _seek(targetPos) {
        const desired = vec2Sub(targetPos, this.pos);
        const dn = vec2Normalize(desired);
        const steer = vec2Sub(vec2Scale(dn, this.traits.speed), this.vel);
        this.acc = vec2Add(this.acc, vec2Scale(vec2Limit(steer, CREATURE.SEEK_STRENGTH), 1));
    }

    _flee(threatPos) {
        const desired = vec2Sub(this.pos, threatPos);
        const dn = vec2Normalize(desired);
        const steer = vec2Sub(vec2Scale(dn, this.traits.speed), this.vel);
        this.acc = vec2Add(this.acc, vec2Scale(vec2Limit(steer, CREATURE.FLEE_STRENGTH), 1));
    }

    _wander() {
        this.wanderAngle += (Math.random() - 0.5) * 0.5;
        const wanderForce = {
            x: Math.cos(this.wanderAngle) * CREATURE.WANDER_STRENGTH,
            y: Math.sin(this.wanderAngle) * CREATURE.WANDER_STRENGTH,
        };
        this.acc = vec2Add(this.acc, wanderForce);
    }

    /**
     * Reproduce with another creature
     */
    reproduce(mate) {
        if (this.energy < CREATURE.REPRODUCTION_COST || mate.energy < CREATURE.REPRODUCTION_COST * 0.8) {
            return null;
        }

        // Pay energy cost
        this.energy -= CREATURE.REPRODUCTION_COST;
        mate.energy -= CREATURE.REPRODUCTION_COST * 0.8;
        this.reproductionCooldown = CREATURE.REPRODUCTION_COOLDOWN;
        mate.reproductionCooldown = CREATURE.REPRODUCTION_COOLDOWN;

        // Create offspring DNA
        let childDNA = crossover(this.dna, mate.dna);
        childDNA = mutate(childDNA);

        const childGen = Math.max(this.generation, mate.generation) + 1;

        // Spawn near parents
        const offset = {
            x: (Math.random() - 0.5) * 30,
            y: (Math.random() - 0.5) * 30,
        };

        this.children++;
        mate.children++;

        return new Creature(
            this.pos.x + offset.x,
            this.pos.y + offset.y,
            childDNA,
            childGen
        );
    }

    /**
     * Helpers
     */
    _nearest(entities) {
        let nearest = null;
        let nearestDist = Infinity;
        for (const e of entities) {
            const d = vec2Dist(this.pos, e.pos);
            if (d < nearestDist) {
                nearestDist = d;
                nearest = e;
            }
        }
        return nearest;
    }

    _nearestFood(foodList) {
        let nearest = null;
        let nearestDist = Infinity;
        for (const f of foodList) {
            const d = vec2Dist(this.pos, f.pos);
            if (d < nearestDist) {
                nearestDist = d;
                nearest = f;
            }
        }
        return nearest;
    }

    /**
     * Get the primary HSL color string
     */
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
