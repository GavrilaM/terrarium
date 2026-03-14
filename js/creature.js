// ============================================
// TERRARIUM — Creature System
// HP + Energy + Fullness + Size-based Combat
// ============================================

import { CONFIG } from './config.js';
import { expressDNA, getDietLabel, crossover, mutate } from './genetics.js';
import { getSpeciesTypeFromDNA, generateSpeciesDNA, getRandomSpeciesType } from './species.js';
import { checkTierUp, rollMutation, applyMutationStats, getTierDef } from './mutations.js';

const { CREATURE, COMBAT, WORLD, ECOSYSTEM } = CONFIG;

let creatureIdCounter = 0;

// ---- Vector2 Utilities ----
function vec2(x = 0, y = 0) { return { x, y }; }
function vec2Dist(a, b) { const dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
function vec2Normalize(v) { const l = Math.sqrt(v.x * v.x + v.y * v.y); return l === 0 ? { x: 0, y: 0 } : { x: v.x / l, y: v.y / l }; }
function vec2Sub(a, b) { return { x: a.x - b.x, y: a.y - b.y }; }
function vec2Add(a, b) { return { x: a.x + b.x, y: a.y + b.y }; }
function vec2Scale(v, s) { return { x: v.x * s, y: v.y * s }; }
function vec2Limit(v, max) {
    const sq = v.x * v.x + v.y * v.y;
    if (sq > max * max) { const n = vec2Normalize(v); return { x: n.x * max, y: n.y * max }; }
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
    FIGHT: 'fight',
    EXPLORE: 'explore',
    CRITICAL_HUNGER: 'critical_hunger',
    DIGESTING: 'digesting',
    SCAVENGE: 'scavenge',
};

/**
 * Factory — create creature with species type
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

        // Species
        this.speciesType = speciesType;
        this.behavior = speciesType.behavior;

        // DNA & Traits
        this.dna = dna;
        this.traits = expressDNA(this.dna);
        this.traits.size = speciesType.sizeRange[0] + this.dna[0] * (speciesType.sizeRange[1] - speciesType.sizeRange[0]);
        this.traits.speed = speciesType.speedRange[0] + this.dna[1] * (speciesType.speedRange[1] - speciesType.speedRange[0]);
        this.speciesName = speciesType.name;

        // ★ HP — health points (life force, 0 = death → meat chunks)
        this.hp = CREATURE.INITIAL_HP;
        this.maxHp = CREATURE.MAX_HP;

        // ★ ENERGY — stamina (movement, attacks, sprinting)
        this.energy = CREATURE.INITIAL_ENERGY;

        // ★ FULLNESS — stomach capacity
        this.fullness = CREATURE.FULLNESS_INITIAL;
        this.digestCooldown = 0;

        // State
        this.state = STATES.WANDER;
        this.age = 0;
        this.generation = generation;
        this.alive = true;
        this.children = 0;
        this.reproductionCooldown = 0;

        // Combat
        this.attackCooldown = 0;
        this.combatTarget = null;

        // Death tracking
        this.causeOfDeath = null;
        this.killedBy = null;

        // ★ MUTATIONS & EVOLUTION
        this.mutations = [];
        this.evolutionTier = 0;
        this.tierUpChecked = false;
        this.venomTimer = 0;        // poison DoT from venom attack
        this.venomSource = null;

        // Mutation stat multipliers (set by applyMutationStats)
        this.mutSpeedMult = 1;
        this.mutHpMult = 1;
        this.mutAttackMult = 1;
        this.mutPerceptionMult = 1;
        this.mutFullnessMult = 1;
        this.mutHpRegenMult = 1;
        this.mutStealthMult = 1;
        this.mutCounterReduction = 0;
        this.mutDashSpeed = 0;
        this.mutDashCost = 0;
        this.mutVenomDamage = 0;
        this.mutVenomDuration = 0;
        this.mutPackRadius = 0;
        this.mutPassiveEatRadius = 1;
        this.mutMeatDetectMult = 1;
        this.mutDeathSpores = 0;
        this.mutDetectCamo = false;
        this.mutHealAura = 0;
        this.mutHealAuraRadius = 0;
        this.mutFleeBoost = 1;

        // Apply HP multiplier from initial mutations (if inherited)
        this.maxHp = CREATURE.MAX_HP * this.mutHpMult;
        this.hp = this.maxHp;

        // Visuals
        this.glowPhase = Math.random() * Math.PI * 2;
        this.trail = [];
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.eatTimer = 0;
        this.hitFlash = 0;
        this.tierUpFlash = 0;  // visual flash when tier up
    }

    // ---- Computed Properties ----

    get isHungry() { return this.fullness < CREATURE.FULLNESS_EAT_THRESHOLD; }
    get isFull() { return this.fullness >= CREATURE.FULLNESS_FULL_THRESHOLD; }
    get isCriticalHunger() { return this.fullness < 15; }
    get canEat() { return this.digestCooldown <= 0 && !this.isFull; }
    get hasEnergy() { return this.energy > 10; }
    get canAttack() { return this.attackCooldown <= 0 && this.energy >= CREATURE.ENERGY_ATTACK_COST; }

    /**
     * Effective speed — reduced when out of energy
     */
    get effectiveSpeed() {
        const base = this.traits.speed * this.mutSpeedMult;
        if (this.energy <= 0) return base * CREATURE.ENERGY_LOW_SPEED_MULT;
        return base;
    }

    /**
     * Main update
     */
    update(ecosystem, canvasW, canvasH, dt = 1) {
        if (!this.alive) return;

        this.age += dt;
        this.glowPhase += 0.03 * dt;
        this.pulsePhase += 0.05 * dt;
        if (this.reproductionCooldown > 0) this.reproductionCooldown -= dt;
        if (this.digestCooldown > 0) this.digestCooldown -= dt;
        if (this.attackCooldown > 0) this.attackCooldown -= dt;
        if (this.eatTimer > 0) this.eatTimer -= dt;
        if (this.hitFlash > 0) this.hitFlash -= dt;
        if (this.tierUpFlash > 0) this.tierUpFlash -= dt;
        if (this.venomTimer > 0) {
            this.hp -= this.venomSource?.mutVenomDamage || 0.3;
            this.venomTimer -= dt;
            this.hitFlash = 2;
        }

        // ★ Fullness decays (getting hungry)
        const hungerRate = this.speciesType.diet === 'carnivore' ? 0.6 : 1.0;
        this.fullness = Math.max(0, this.fullness - CREATURE.FULLNESS_DECAY * hungerRate * dt);

        // ★ Energy decay (passive stamina drain)
        const sizeCost = this.traits.size * 0.0005;
        this.energy -= (CREATURE.ENERGY_DECAY + sizeCost) * dt;
        this.energy = Math.max(0, this.energy);

        // ★ HP regen when well-fed and has energy (boosted by mutations)
        if (this.hp < this.maxHp && this.energy > CREATURE.MAX_ENERGY * 0.5 && this.fullness > 30) {
            this.hp = Math.min(this.maxHp, this.hp + CREATURE.HP_REGEN * this.mutHpRegenMult * dt);
        }

        // ★ Starvation damage — when fullness = 0 for too long, HP slowly drops
        if (this.fullness <= 0 && this.energy <= 0) {
            this.hp -= 0.05 * dt;
        }

        // ★ Death check — HP <= 0
        if (this.hp <= 0) {
            this.alive = false;
            if (!this.causeOfDeath) this.causeOfDeath = 'starvation';
            return;
        }

        // Die of old age
        if (this.age >= CREATURE.MAX_AGE) {
            this.alive = false;
            this.causeOfDeath = 'old_age';
            return;
        }

        // Passive eating (walk over food)
        if (this.canEat && !this.isFull) this._passiveEat(ecosystem);

        // ★ EVOLUTION TIER CHECK (every ~200 frames)
        if (Math.floor(this.age) % 200 === 0 && !this.tierUpChecked) {
            this._checkEvolution(ecosystem);
            this.tierUpChecked = true;
        }
        if (Math.floor(this.age) % 200 !== 0) this.tierUpChecked = false;

        // ★ Heal Aura mutation effect
        if (this.mutHealAura > 0) {
            const allies = ecosystem.getCreaturesNear(this.pos, this.mutHealAuraRadius, this.id)
                .filter(c => c.speciesType.id === this.speciesType.id && c.hp < c.maxHp);
            for (const ally of allies) {
                ally.hp = Math.min(ally.maxHp, ally.hp + this.mutHealAura * dt);
            }
        }

        // ★ Overcrowding stress
        this._checkOvercrowding(ecosystem);

        // Decide behavior
        this._decide(ecosystem);

        // Apply movement with energy-aware speed
        this.vel = vec2Add(this.vel, this.acc);
        this.vel = vec2Limit(this.vel, this.effectiveSpeed);
        this.pos = vec2Add(this.pos, vec2Scale(this.vel, dt));
        this.acc = vec2(0, 0);

        // Movement energy cost
        const speed = Math.sqrt(this.vel.x * this.vel.x + this.vel.y * this.vel.y);
        this.energy -= speed * CREATURE.ENERGY_MOVE_COST * dt;
        this.energy = Math.max(0, this.energy);

        // ★ BOUNDARY BOUNCE — no more teleporting!
        const margin = WORLD.EDGE_MARGIN;
        const force = WORLD.EDGE_FORCE;
        if (this.pos.x < margin) { this.pos.x = margin; this.vel.x = Math.abs(this.vel.x) * force; }
        if (this.pos.x > WORLD.WIDTH - margin) { this.pos.x = WORLD.WIDTH - margin; this.vel.x = -Math.abs(this.vel.x) * force; }
        if (this.pos.y < margin) { this.pos.y = margin; this.vel.y = Math.abs(this.vel.y) * force; }
        if (this.pos.y > WORLD.HEIGHT - margin) { this.pos.y = WORLD.HEIGHT - margin; this.vel.y = -Math.abs(this.vel.y) * force; }

        // Trail
        this.trail.push({ x: this.pos.x, y: this.pos.y });
        if (this.trail.length > CONFIG.VISUALS.TRAIL_LENGTH) this.trail.shift();
    }

    /**
     * Overcrowding stress — too many creatures nearby = energy + HP drain
     */
    _checkOvercrowding(ecosystem) {
        const nearby = ecosystem.getCreaturesNear(this.pos, ECOSYSTEM.OVERCROWD_RADIUS, this.id);
        if (nearby.length > ECOSYSTEM.OVERCROWD_THRESHOLD) {
            const excess = nearby.length - ECOSYSTEM.OVERCROWD_THRESHOLD;
            this.energy = Math.max(0, this.energy - ECOSYSTEM.OVERCROWD_ENERGY_DRAIN * excess);
            this.hp -= ECOSYSTEM.OVERCROWD_HP_DRAIN * excess;
        }
    }

    /**
     * Check evolution tier advancement + roll mutations
     */
    _checkEvolution(ecosystem) {
        const nextTier = checkTierUp(this);
        if (nextTier) {
            this.evolutionTier = nextTier.tier;
            this.tierUpFlash = 30; // visual celebration

            // Roll a new mutation on tier-up!
            const newMut = rollMutation(this);
            if (newMut) {
                this.mutations.push(newMut);
                applyMutationStats(this);
                this.maxHp = CREATURE.MAX_HP * this.mutHpMult;
                this.hp = Math.min(this.hp, this.maxHp);

                ecosystem._addEvent?.('evolution',
                    `${this.speciesType?.emoji || '🧬'} ${this.speciesName} #${this.id} evolved to ${nextTier.emoji} ${nextTier.name}! Got: ${newMut.emoji} ${newMut.name}`
                );
            } else {
                ecosystem._addEvent?.('evolution',
                    `${this.speciesType?.emoji || '🧬'} ${this.speciesName} #${this.id} evolved to ${nextTier.emoji} ${nextTier.name}!`
                );
            }
        }
    }

    // ---- EATING ----

    _passiveEat(ecosystem) {
        if (this.speciesType.diet === 'carnivore') return;
        const nearby = ecosystem.getFoodNear(this.pos, this.traits.size + 5);
        for (const food of nearby) {
            if (!food.alive || food.isMeat) continue; // carnivores don't passive-eat plants; herbivores don't eat meat
            this._eatFood(food, ecosystem);
            return;
        }
    }

    _eatFood(food, ecosystem) {
        const fillAmount = food.isMeat ? CREATURE.FULLNESS_MEAT : CREATURE.FULLNESS_PLANT;
        this.energy = Math.min(CREATURE.MAX_ENERGY, this.energy + food.energy);
        this.fullness = Math.min(CREATURE.FULLNESS_MAX, this.fullness + fillAmount);
        this.digestCooldown = CREATURE.DIGEST_COOLDOWN;
        ecosystem.removeFood(food);
        this.eatTimer = 12;
    }

    // ---- COMBAT ----

    /**
     * Evaluate combat outcome based on size ratio
     * Returns: 'instant_kill', 'fight', or 'avoid'
     */
    evaluatePrey(prey) {
        const sizeRatio = prey.traits.size / this.traits.size;
        if (sizeRatio < COMBAT.INSTANT_KILL_RATIO) return 'instant_kill';
        if (sizeRatio < COMBAT.FIGHT_MAX_RATIO) return 'fight';
        return 'avoid';
    }

    /**
     * Instant kill — swallow small prey, spawn meat chunks
     */
    instantKill(prey, ecosystem) {
        this.energy -= CREATURE.ENERGY_ATTACK_COST * 0.5; // cheaper than fighting
        prey.alive = false;
        prey.causeOfDeath = 'killed';
        prey.killedBy = this;
        ecosystem.spawnMeatChunks(prey); // ★ MEAT CHUNKS
        this.eatTimer = 15;
        this.attackCooldown = COMBAT.ATTACK_COOLDOWN * 0.5;
    }

    /**
     * Attack in a fight — deals damage to prey, prey may fight back
     */
    attackCreature(prey) {
        if (!this.canAttack) return;

        this.energy -= CREATURE.ENERGY_ATTACK_COST;
        this.attackCooldown = COMBAT.ATTACK_COOLDOWN;

        // Damage based on size
        const damage = COMBAT.ATTACK_DAMAGE * (this.traits.size / 10) * COMBAT.SIZE_DAMAGE_MULT;
        prey.hp -= damage;
        prey.hitFlash = 8;

        // Counter-attack from prey
        const counterDmg = COMBAT.ATTACK_DAMAGE * (prey.traits.size / 10) * COMBAT.COUNTER_DAMAGE_MULT;
        this.hp -= counterDmg;
        this.hitFlash = 5;

        // Prey energy cost for defending
        prey.energy = Math.max(0, prey.energy - CREATURE.ENERGY_ATTACK_COST * 0.3);
    }

    /**
     * Take damage from external sources (toxic, etc.)
     */
    takeDamage(amount, cause = 'unknown') {
        this.hp -= amount;
        this.hitFlash = 5;
        if (this.hp <= 0) {
            this.alive = false;
            this.causeOfDeath = cause;
        }
    }

    // ---- DECISION SYSTEM ----

    _decide(ecosystem) {
        const nearbyFood = ecosystem.getFoodNear(this.pos, this.traits.perceptionRange);
        const nearbyCreatures = ecosystem.getCreaturesNear(this.pos, this.traits.perceptionRange, this.id);

        // ===== P1: CRITICAL HUNGER → force eat anything =====
        if (this.isCriticalHunger) {
            this.state = STATES.CRITICAL_HUNGER;
            if (this._seekAnyFood(ecosystem, nearbyFood, nearbyCreatures)) return;
            this._wander();
            return;
        }

        // ===== P2: DIGESTING =====
        if (this.digestCooldown > CREATURE.DIGEST_COOLDOWN * 0.5) {
            this.state = STATES.DIGESTING;
            this._wander(this.behavior.wanderStrength * 0.5);
            return;
        }

        // ===== P3: FLEE from threats =====
        const threats = this._identifyThreats(nearbyCreatures);
        const nearestThreat = this._nearest(threats);
        if (nearestThreat) {
            const d = vec2Dist(this.pos, nearestThreat.pos);
            if (d < this.behavior.fleeDistance) {
                this.state = STATES.FLEE;
                this._flee(nearestThreat.pos, this.behavior.fleeStrength);
                // Sprint costs extra energy
                this.energy = Math.max(0, this.energy - CREATURE.ENERGY_SPRINT_COST);
                return;
            }
        }

        // ===== P4: HUNGRY → seek food =====
        if (this.isHungry && this.canEat) {
            this.state = STATES.SEEK_FOOD;
            if (this._seekAnyFood(ecosystem, nearbyFood, nearbyCreatures)) return;
        }

        // ===== P5: REPRODUCE =====
        if (this.energy >= CREATURE.REPRODUCTION_THRESHOLD &&
            this.reproductionCooldown <= 0 &&
            this.fullness > 30 &&
            this.hp > this.maxHp * 0.5) {
            const mates = nearbyCreatures.filter(c =>
                c.alive && c.speciesType.id === this.speciesType.id &&
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

        // ===== P6: SPECIES BEHAVIOR =====
        this._speciesBehavior(nearbyCreatures, nearbyFood, ecosystem);
    }

    _speciesBehavior(nearbyCreatures, nearbyFood, ecosystem) {
        const diet = this.speciesType.diet;

        // FLORAE: Flock
        if (diet === 'herbivore' && this.behavior.socialDrive > 0.5) {
            const flock = nearbyCreatures.filter(c => c.speciesType.id === 'florae' && c.alive);
            if (flock.length > 0) {
                this.state = STATES.FLOCK;
                const center = this._centerOf(flock);
                if (vec2Dist(this.pos, center) > this.behavior.flockRadius * 0.3) {
                    this._seek(center, this.behavior.socialDrive * 0.5);
                } else {
                    this._wander();
                }
                return;
            }
        }

        // PREDAXI: Hunt (with size-based combat!)
        if (diet === 'carnivore' && this.behavior.aggression > 0.5 && !this.isFull && this.hasEnergy) {
            // First check for meat chunks (scavenge = free food!)
            const meatNearby = nearbyFood.filter(f => f.isMeat && f.alive);
            if (meatNearby.length > 0 && this.canEat) {
                const nearestMeat = this._nearestFood(meatNearby);
                if (nearestMeat) {
                    this.state = STATES.SCAVENGE;
                    this._seek(nearestMeat.pos, this.behavior.seekFoodStrength);
                    if (vec2Dist(this.pos, nearestMeat.pos) < this.traits.size + nearestMeat.size + 3) {
                        this._eatFood(nearestMeat, ecosystem);
                    }
                    return;
                }
            }

            // Hunt living prey
            const prey = nearbyCreatures.filter(c =>
                c.speciesType.id !== 'predaxi' && c.alive
            );
            const nearestPrey = this._nearest(prey);
            if (nearestPrey) {
                const outcome = this.evaluatePrey(nearestPrey);

                if (outcome === 'avoid') {
                    // Too big — don't bother
                } else if (outcome === 'instant_kill') {
                    this.state = STATES.HUNT;
                    this._seek(nearestPrey.pos, this.behavior.seekFoodStrength);
                    this.energy = Math.max(0, this.energy - CREATURE.ENERGY_SPRINT_COST);
                    if (vec2Dist(this.pos, nearestPrey.pos) < this.traits.size + nearestPrey.traits.size) {
                        this.instantKill(nearestPrey, ecosystem);
                    }
                    return;
                } else {
                    // FIGHT — attack to weaken
                    this.state = STATES.FIGHT;
                    this._seek(nearestPrey.pos, this.behavior.seekFoodStrength);
                    this.energy = Math.max(0, this.energy - CREATURE.ENERGY_SPRINT_COST);
                    if (vec2Dist(this.pos, nearestPrey.pos) < this.traits.size + nearestPrey.traits.size + 3) {
                        this.attackCreature(nearestPrey);
                        if (!nearestPrey.alive || nearestPrey.hp <= 0) {
                            nearestPrey.alive = false;
                            nearestPrey.causeOfDeath = 'killed';
                            nearestPrey.killedBy = this;
                            ecosystem.spawnMeatChunks(nearestPrey);
                        }
                    }
                    return;
                }
            }
        }

        // MIXOLITH: Explore + opportunistic scavenging
        if (diet === 'omnivore' && this.behavior.curiosity > 0.5) {
            // Check for meat first (scavenge)
            const meatNearby = nearbyFood.filter(f => f.isMeat && f.alive);
            if (meatNearby.length > 0 && this.canEat && this.isHungry) {
                const nearestMeat = this._nearestFood(meatNearby);
                if (nearestMeat) {
                    this.state = STATES.SCAVENGE;
                    this._seek(nearestMeat.pos, this.behavior.seekFoodStrength);
                    if (vec2Dist(this.pos, nearestMeat.pos) < this.traits.size + nearestMeat.size + 3) {
                        this._eatFood(nearestMeat, ecosystem);
                    }
                    return;
                }
            }

            this.state = STATES.EXPLORE;
            if (Math.random() < 0.02) this.wanderAngle = Math.random() * Math.PI * 2;
            this._wander(this.behavior.wanderStrength);
            return;
        }

        this.state = STATES.WANDER;
        this._wander();
    }

    _seekAnyFood(ecosystem, nearbyFood, nearbyCreatures) {
        if (!this.canEat && !this.isCriticalHunger) return false;
        const diet = this.speciesType.diet;

        if (diet === 'herbivore') return this._seekPlantFood(nearbyFood, ecosystem);
        if (diet === 'carnivore') {
            // Prefer scavenging meat chunks over hunting
            if (this._seekMeatChunks(nearbyFood, ecosystem)) return true;
            return this._seekPrey(nearbyCreatures, ecosystem);
        }
        // Omnivore
        if (this._seekPlantFood(nearbyFood, ecosystem)) return true;
        if (this._seekMeatChunks(nearbyFood, ecosystem)) return true;
        return this._seekPrey(nearbyCreatures, ecosystem);
    }

    _seekPlantFood(nearbyFood, ecosystem) {
        const plants = nearbyFood.filter(f => !f.isMeat && f.alive);
        const nearest = this._nearestFood(plants);
        if (!nearest) return false;
        this._seek(nearest.pos, this.behavior.seekFoodStrength);
        if (vec2Dist(this.pos, nearest.pos) < this.traits.size + nearest.size + 3) {
            this._eatFood(nearest, ecosystem);
        }
        return true;
    }

    _seekMeatChunks(nearbyFood, ecosystem) {
        const meat = nearbyFood.filter(f => f.isMeat && f.alive);
        const nearest = this._nearestFood(meat);
        if (!nearest) return false;
        this.state = STATES.SCAVENGE;
        this._seek(nearest.pos, this.behavior.seekFoodStrength);
        if (vec2Dist(this.pos, nearest.pos) < this.traits.size + nearest.size + 3) {
            this._eatFood(nearest, ecosystem);
        }
        return true;
    }

    _seekPrey(nearbyCreatures, ecosystem) {
        const prey = nearbyCreatures.filter(c =>
            c.alive && c.speciesType.id !== this.speciesType.id
        );
        const nearestPrey = this._nearest(prey);
        if (!nearestPrey) return false;

        const outcome = this.evaluatePrey(nearestPrey);
        if (outcome === 'avoid') return false;

        this.state = outcome === 'instant_kill' ? STATES.HUNT : STATES.FIGHT;
        this._seek(nearestPrey.pos, this.behavior.seekFoodStrength);
        this.energy = Math.max(0, this.energy - CREATURE.ENERGY_SPRINT_COST);

        if (vec2Dist(this.pos, nearestPrey.pos) < this.traits.size + nearestPrey.traits.size + 3) {
            if (outcome === 'instant_kill') {
                this.instantKill(nearestPrey, ecosystem);
            } else {
                this.attackCreature(nearestPrey);
                if (nearestPrey.hp <= 0) {
                    nearestPrey.alive = false;
                    nearestPrey.causeOfDeath = 'killed';
                    nearestPrey.killedBy = this;
                    ecosystem.spawnMeatChunks(nearestPrey);
                }
            }
        }
        return true;
    }

    _identifyThreats(nearbyCreatures) {
        if (this.speciesType.diet === 'carnivore') {
            return nearbyCreatures.filter(c =>
                c.speciesType.id === 'predaxi' && c.traits.size > this.traits.size * 1.3
            );
        }
        return nearbyCreatures.filter(c =>
            c.speciesType.diet === 'carnivore' && c.traits.size > this.traits.size * 0.5
        );
    }

    // ---- Steering ----

    _seek(targetPos, strength = CREATURE.SEEK_STRENGTH) {
        const d = vec2Sub(targetPos, this.pos);
        const steer = vec2Sub(vec2Scale(vec2Normalize(d), this.effectiveSpeed), this.vel);
        this.acc = vec2Add(this.acc, vec2Limit(steer, strength));
    }

    _flee(threatPos, strength = CREATURE.FLEE_STRENGTH) {
        const d = vec2Sub(this.pos, threatPos);
        const steer = vec2Sub(vec2Scale(vec2Normalize(d), this.effectiveSpeed), this.vel);
        this.acc = vec2Add(this.acc, vec2Limit(steer, strength));
    }

    _wander(strength) {
        const s = strength || this.behavior.wanderStrength || CREATURE.WANDER_STRENGTH;
        // ★ Stuck detection — if barely moving, change direction more aggressively
        const spd = Math.sqrt(this.vel.x * this.vel.x + this.vel.y * this.vel.y);
        if (spd < CREATURE.STUCK_SPEED_THRESHOLD) {
            this.wanderAngle += (Math.random() - 0.5) * 2.0; // big direction change
            const boost = CREATURE.STUCK_WANDER_BOOST;
            this.acc = vec2Add(this.acc, { x: Math.cos(this.wanderAngle) * boost, y: Math.sin(this.wanderAngle) * boost });
        } else {
            this.wanderAngle += (Math.random() - 0.5) * 0.5;
            this.acc = vec2Add(this.acc, { x: Math.cos(this.wanderAngle) * s, y: Math.sin(this.wanderAngle) * s });
        }
    }

    // ---- Reproduction ----

    reproduce(mate) {
        if (this.energy < CREATURE.REPRODUCTION_THRESHOLD || mate.energy < CREATURE.REPRODUCTION_THRESHOLD * 0.8) return null;

        this.energy -= CREATURE.REPRODUCTION_COST;
        mate.energy -= CREATURE.REPRODUCTION_COST * 0.8;
        this.reproductionCooldown = CREATURE.REPRODUCTION_COOLDOWN;
        mate.reproductionCooldown = CREATURE.REPRODUCTION_COOLDOWN;

        let childDNA = crossover(this.dna, mate.dna);
        childDNA = mutate(childDNA);
        const childGen = Math.max(this.generation, mate.generation) + 1;
        const offset = { x: (Math.random() - 0.5) * 30, y: (Math.random() - 0.5) * 30 };
        this.children++;
        mate.children++;

        const child = new Creature(this.pos.x + offset.x, this.pos.y + offset.y, childDNA, getSpeciesTypeFromDNA(childDNA), childGen);

        // ★ Inherit some mutations from parents (50% chance each)
        const parentMuts = [...this.mutations, ...mate.mutations];
        const inherited = new Set();
        for (const m of parentMuts) {
            if (!inherited.has(m.id) && Math.random() < 0.5) {
                child.mutations.push(m);
                inherited.add(m.id);
            }
        }
        if (child.mutations.length > 0) applyMutationStats(child);
        child.maxHp = CREATURE.MAX_HP * child.mutHpMult;
        child.hp = child.maxHp;

        // Child might get a new random mutation on birth (10% chance)
        if (Math.random() < 0.1 && child.mutations.length < (getTierDef(child.evolutionTier)?.mutationSlots || 0)) {
            const newMut = rollMutation(child);
            if (newMut) {
                child.mutations.push(newMut);
                applyMutationStats(child);
                child.maxHp = CREATURE.MAX_HP * child.mutHpMult;
                child.hp = child.maxHp;
            }
        }

        return child;
    }

    // ---- Helpers ----

    _nearest(entities) {
        let near = null, nd = Infinity;
        for (const e of entities) { const d = vec2Dist(this.pos, e.pos); if (d < nd) { nd = d; near = e; } }
        return near;
    }

    _nearestFood(foodList) {
        let near = null, nd = Infinity;
        for (const f of foodList) { const d = vec2Dist(this.pos, f.pos); if (d < nd) { nd = d; near = f; } }
        return near;
    }

    _centerOf(creatures) {
        let cx = 0, cy = 0;
        for (const c of creatures) { cx += c.pos.x; cy += c.pos.y; }
        return { x: cx / creatures.length, y: cy / creatures.length };
    }

    // ---- Visuals ----

    getColor(alpha = 1) { return `hsla(${this.traits.hue}, ${this.traits.saturation}%, 65%, ${alpha})`; }
    getGlowColor(alpha = 0.3) { return `hsla(${this.traits.hue}, ${this.traits.saturation}%, 65%, ${alpha})`; }
    getDietLabel() { return getDietLabel(this.traits.diet); }
    getFullnessPercent() { return Math.round((this.fullness / CREATURE.FULLNESS_MAX) * 100); }
    getHpPercent() { return Math.max(0, this.hp / this.maxHp); }
    getEnergyPercent() { return Math.max(0, this.energy / CREATURE.MAX_ENERGY); }
}
