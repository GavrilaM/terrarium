// ============================================
// TERRARIUM — Ecosystem Manager
// Manages creatures, food, environmental events
// ============================================

import { CONFIG } from './config.js';
import { Creature, createCreature } from './creature.js';
import { geneticDistance } from './genetics.js';
import { getCurrentEra, getRandomSpeciesType, SPECIES_TYPES } from './species.js';

const { ECOSYSTEM, EVENTS } = CONFIG;

/**
 * Food particle
 */
class Food {
    constructor(x, y) {
        this.pos = { x, y };
        this.energy = ECOSYSTEM.FOOD_ENERGY;
        this.size = ECOSYSTEM.FOOD_SIZE_MIN + Math.random() * (ECOSYSTEM.FOOD_SIZE_MAX - ECOSYSTEM.FOOD_SIZE_MIN);
        this.hue = 100 + Math.random() * 40;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.alive = true;
    }
}

/**
 * Environmental hazard zone (toxic, etc.)
 */
class HazardZone {
    constructor(x, y, type, duration, radius) {
        this.pos = { x, y };
        this.type = type;     // 'toxic', 'current'
        this.duration = duration;
        this.maxDuration = duration;
        this.radius = radius;
        this.alive = true;
        // For current type
        this.direction = { x: Math.random() - 0.5, y: Math.random() - 0.5 };
        const len = Math.sqrt(this.direction.x ** 2 + this.direction.y ** 2);
        if (len > 0) { this.direction.x /= len; this.direction.y /= len; }
    }
}

export class Ecosystem {
    constructor(canvasW, canvasH) {
        this.width = canvasW;
        this.height = canvasH;
        this.creatures = [];
        this.food = [];
        this.hazards = [];     // environmental hazard zones
        this.events = [];
        this.stats = {
            totalBorn: 0,
            totalDied: 0,
            totalStarved: 0,
            totalKilled: 0,
            totalOldAge: 0,
            maxGeneration: 0,
            speciesList: [],
            populationHistory: [],
        };

        // Evolution era
        this.currentEra = getCurrentEra(0);
        this.previousEra = null;

        // Environmental events timer
        this.nextEventTimer = EVENTS.MIN_INTERVAL + Math.random() * (EVENTS.MAX_INTERVAL - EVENTS.MIN_INTERVAL);
        this.activeEvent = null; // { type, message, timer }

        // Spatial grid
        this.gridSize = 100;
        this.grid = {};

        this._init();
    }

    _init() {
        for (let i = 0; i < ECOSYSTEM.INITIAL_CREATURES; i++) {
            const x = Math.random() * this.width;
            const y = Math.random() * this.height;
            this.creatures.push(createCreature(x, y));
            this.stats.totalBorn++;
        }

        for (let i = 0; i < ECOSYSTEM.INITIAL_FOOD; i++) {
            this._spawnFood();
        }

        this._updateSpecies();
    }

    /**
     * Main update
     */
    update(dt = 1) {
        this._buildGrid();

        // Update creatures
        for (const creature of this.creatures) {
            creature.update(this, this.width, this.height, dt);
        }

        // Apply environmental hazards to creatures
        this._applyHazards(dt);

        // Process dead creatures
        const deadCreatures = this.creatures.filter(c => !c.alive);
        for (const dead of deadCreatures) {
            this.stats.totalDied++;
            this._logDeath(dead);
        }
        this.creatures = this.creatures.filter(c => c.alive);

        // Remove eaten food
        this.food = this.food.filter(f => f.alive);

        // Update hazards
        this.hazards = this.hazards.filter(h => {
            h.duration -= dt;
            if (h.duration <= 0) h.alive = false;
            return h.alive;
        });

        // Spawn food
        if (this.food.length < ECOSYSTEM.MAX_FOOD && Math.random() < ECOSYSTEM.FOOD_SPAWN_RATE * dt) {
            this._spawnFood();
        }

        // Food pulse animation
        for (const f of this.food) { f.pulsePhase += 0.03 * dt; }

        // Species classification
        if (Math.random() < 0.02) this._updateSpecies();

        // Track max generation & era
        for (const c of this.creatures) {
            if (c.generation > this.stats.maxGeneration) {
                this.stats.maxGeneration = c.generation;
                this._addEvent('evolution', `⭐ Generation ${c.generation} reached! (${c.speciesName})`);
            }
        }

        // Era transition
        const newEra = getCurrentEra(this.stats.maxGeneration);
        if (newEra.id !== this.currentEra.id) {
            this.previousEra = this.currentEra;
            this.currentEra = newEra;
            this._addEvent('era', `🌟 ERA SHIFT: ${newEra.emoji} ${newEra.name}! — ${newEra.description}`);
        }

        // ★ Environmental events
        this._updateEnvironmentalEvents(dt);

        // ★ Auto-repopulation (prevent total extinction)
        this._autoRepopulate();

        // Population history
        if (Math.random() < 0.016) {
            this.stats.populationHistory.push(this.creatures.length);
            if (this.stats.populationHistory.length > 200) this.stats.populationHistory.shift();
        }
    }

    // ========================================
    // ENVIRONMENTAL EVENTS
    // ========================================

    _updateEnvironmentalEvents(dt) {
        this.nextEventTimer -= dt;
        if (this.nextEventTimer <= 0) {
            this._triggerRandomEvent();
            this.nextEventTimer = EVENTS.MIN_INTERVAL + Math.random() * (EVENTS.MAX_INTERVAL - EVENTS.MIN_INTERVAL);
        }

        // Update active event display timer
        if (this.activeEvent) {
            this.activeEvent.timer -= dt;
            if (this.activeEvent.timer <= 0) this.activeEvent = null;
        }
    }

    _triggerRandomEvent() {
        const roll = Math.random();

        if (roll < 0.35) {
            // 🌿 BLOOM — food explosion
            const cx = Math.random() * this.width;
            const cy = Math.random() * this.height;
            for (let i = 0; i < EVENTS.BLOOM_FOOD_COUNT; i++) {
                const fx = cx + (Math.random() - 0.5) * 200;
                const fy = cy + (Math.random() - 0.5) * 200;
                this.food.push(new Food(fx, fy));
            }
            this._addEvent('system', `🌿 Nutrient Bloom! Food abundance at (${Math.round(cx)}, ${Math.round(cy)})`);
            this.activeEvent = { type: 'bloom', message: '🌿 Nutrient Bloom!', timer: 120 };

        } else if (roll < 0.60) {
            // ☠️ TOXIC ZONE
            const cx = Math.random() * this.width;
            const cy = Math.random() * this.height;
            this.hazards.push(new HazardZone(cx, cy, 'toxic', EVENTS.TOXIC_DURATION, EVENTS.TOXIC_RADIUS));
            this._addEvent('system', `☠️ Toxic zone appeared at (${Math.round(cx)}, ${Math.round(cy)})!`);
            this.activeEvent = { type: 'toxic', message: '☠️ Toxic Zone Active', timer: EVENTS.TOXIC_DURATION };

        } else if (roll < 0.80) {
            // ⚡ MUTATION SURGE — mutate random creatures
            const count = Math.min(5, Math.ceil(this.creatures.length * 0.15));
            for (let i = 0; i < count; i++) {
                const idx = Math.floor(Math.random() * this.creatures.length);
                const c = this.creatures[idx];
                if (c && c.alive) {
                    // Random gene mutation
                    const gene = Math.floor(Math.random() * c.dna.length);
                    c.dna[gene] = Math.max(0, Math.min(1, c.dna[gene] + (Math.random() - 0.5) * 0.4));
                }
            }
            this._addEvent('evolution', `⚡ Mutation Surge! ${count} creatures mutated`);
            this.activeEvent = { type: 'mutation', message: '⚡ Mutation Surge!', timer: 90 };

        } else {
            // 🌊 CURRENT — push zone
            const cx = Math.random() * this.width;
            const cy = Math.random() * this.height;
            this.hazards.push(new HazardZone(cx, cy, 'current', EVENTS.CURRENT_DURATION, 120));
            this._addEvent('system', `🌊 Ocean current appeared!`);
            this.activeEvent = { type: 'current', message: '🌊 Ocean Current', timer: EVENTS.CURRENT_DURATION };
        }
    }

    /**
     * Apply environmental hazards to creatures
     */
    _applyHazards(dt) {
        for (const hazard of this.hazards) {
            if (!hazard.alive) continue;

            for (const c of this.creatures) {
                if (!c.alive) continue;
                const dx = c.pos.x - hazard.pos.x;
                const dy = c.pos.y - hazard.pos.y;
                const distSq = dx * dx + dy * dy;
                const radiusSq = hazard.radius * hazard.radius;

                if (distSq <= radiusSq) {
                    if (hazard.type === 'toxic') {
                        c.energy -= EVENTS.TOXIC_DAMAGE * dt;
                        if (c.energy <= 0) {
                            c.alive = false;
                            c.causeOfDeath = 'toxic';
                        }
                    } else if (hazard.type === 'current') {
                        c.pos.x += hazard.direction.x * EVENTS.CURRENT_STRENGTH * dt;
                        c.pos.y += hazard.direction.y * EVENTS.CURRENT_STRENGTH * dt;
                    }
                }
            }
        }
    }

    /**
     * Auto-repopulate if population drops too low
     */
    _autoRepopulate() {
        if (this.creatures.length < 5) {
            const needed = 5 - this.creatures.length;
            for (let i = 0; i < needed; i++) {
                const x = Math.random() * this.width;
                const y = Math.random() * this.height;
                const creature = createCreature(x, y);
                this.creatures.push(creature);
                this.stats.totalBorn++;
            }
            if (needed > 0) {
                this._addEvent('system', `🌱 Life finds a way! ${needed} new organisms emerged`);
            }
        }
    }

    // ========================================
    // DEATH LOGGING
    // ========================================

    _logDeath(creature) {
        const cause = creature.causeOfDeath || 'unknown';
        const species = creature.speciesName;
        const gen = creature.generation;
        const emoji = creature.speciesType?.emoji || '💀';

        switch (cause) {
            case 'starvation':
                this.stats.totalStarved++;
                this._addEvent('death', `${emoji} ${species} #${creature.id} starved (Gen ${gen})`);
                break;
            case 'killed':
                this.stats.totalKilled++;
                const killerName = creature.killedBy
                    ? `${creature.killedBy.speciesName} #${creature.killedBy.id}`
                    : 'unknown';
                this._addEvent('death', `${emoji} ${species} #${creature.id} killed by ${killerName}`);
                break;
            case 'old_age':
                this.stats.totalOldAge++;
                this._addEvent('death', `${emoji} ${species} #${creature.id} died of old age (${creature.children} offspring)`);
                break;
            case 'toxic':
                this.stats.totalDied++;
                this._addEvent('death', `${emoji} ${species} #${creature.id} poisoned by toxic zone`);
                break;
            case 'cataclysm':
                this._addEvent('death', `${emoji} ${species} #${creature.id} lost in cataclysm`);
                break;
            default:
                this._addEvent('death', `${emoji} ${species} #${creature.id} perished (Gen ${gen})`);
        }
    }

    // ========================================
    // SPATIAL GRID
    // ========================================

    _buildGrid() {
        this.grid = {};
        for (const creature of this.creatures) {
            const key = this._gridKey(creature.pos);
            if (!this.grid[key]) this.grid[key] = [];
            this.grid[key].push(creature);
        }
    }

    _gridKey(pos) {
        return `${Math.floor(pos.x / this.gridSize)},${Math.floor(pos.y / this.gridSize)}`;
    }

    _getNearbyCells(pos, radius) {
        const results = [];
        const cellRadius = Math.ceil(radius / this.gridSize);
        const cx = Math.floor(pos.x / this.gridSize);
        const cy = Math.floor(pos.y / this.gridSize);
        for (let dx = -cellRadius; dx <= cellRadius; dx++) {
            for (let dy = -cellRadius; dy <= cellRadius; dy++) {
                const key = `${cx + dx},${cy + dy}`;
                if (this.grid[key]) results.push(...this.grid[key]);
            }
        }
        return results;
    }

    // ========================================
    // SPATIAL QUERIES
    // ========================================

    getCreaturesNear(pos, radius, excludeId = -1) {
        return this._getNearbyCells(pos, radius).filter(c => {
            if (c.id === excludeId || !c.alive) return false;
            const dx = c.pos.x - pos.x, dy = c.pos.y - pos.y;
            return (dx * dx + dy * dy) <= radius * radius;
        });
    }

    getFoodNear(pos, radius) {
        return this.food.filter(f => {
            if (!f.alive) return false;
            const dx = f.pos.x - pos.x, dy = f.pos.y - pos.y;
            return (dx * dx + dy * dy) <= radius * radius;
        });
    }

    // ========================================
    // PUBLIC METHODS
    // ========================================

    addCreature(creature) {
        if (this.creatures.length < ECOSYSTEM.MAX_CREATURES) {
            this.creatures.push(creature);
            this.stats.totalBorn++;
            if (creature.generation > 0 && Math.random() < 0.2) {
                const emoji = creature.speciesType?.emoji || '🧬';
                this._addEvent('birth', `${emoji} New ${creature.speciesName} born! (Gen ${creature.generation})`);
            }
            return true;
        }
        return false;
    }

    removeFood(food) { food.alive = false; }

    _spawnFood() {
        this.food.push(new Food(Math.random() * this.width, Math.random() * this.height));
    }

    spawnFoodAt(x, y, count = 5) {
        for (let i = 0; i < count; i++) {
            this.food.push(new Food(x + (Math.random() - 0.5) * 60, y + (Math.random() - 0.5) * 60));
        }
        this._addEvent('system', `🌱 Food scattered at (${Math.round(x)}, ${Math.round(y)})`);
    }

    spawnCreatureAt(x, y, speciesType = null) {
        if (this.creatures.length < ECOSYSTEM.MAX_CREATURES) {
            const creature = createCreature(x, y, speciesType);
            this.creatures.push(creature);
            this.stats.totalBorn++;
            const emoji = creature.speciesType?.emoji || '🧬';
            this._addEvent('birth', `${emoji} New ${creature.speciesName} introduced!`);
            return creature;
        }
        return null;
    }

    triggerExtinction(severity = 0.5) {
        const killCount = Math.floor(this.creatures.length * severity);
        for (let i = 0; i < killCount; i++) {
            const idx = Math.floor(Math.random() * this.creatures.length);
            if (this.creatures[idx]) {
                this.creatures[idx].alive = false;
                this.creatures[idx].causeOfDeath = 'cataclysm';
            }
        }
        this._addEvent('extinction', `☄️ Cataclysm! ${killCount} creatures perished!`);
    }

    _updateSpecies() {
        if (this.creatures.length === 0) { this.stats.speciesList = []; return; }
        const speciesMap = {};
        for (const c of this.creatures) {
            const key = c.speciesType.id;
            if (!speciesMap[key]) {
                speciesMap[key] = {
                    name: c.speciesType.name, emoji: c.speciesType.emoji,
                    count: 0, hue: c.traits.hue, saturation: c.traits.saturation,
                    avgGen: 0, diet: c.speciesType.diet,
                };
            }
            speciesMap[key].count++;
            speciesMap[key].avgGen += c.generation;
        }
        this.stats.speciesList = Object.values(speciesMap)
            .map(s => ({ ...s, avgGen: Math.round(s.avgGen / s.count) }))
            .sort((a, b) => b.count - a.count);
    }

    _addEvent(type, message) {
        this.events.unshift({ type, message, time: Date.now() });
        if (this.events.length > 80) this.events.pop();
    }

    getCreatureAt(x, y) {
        for (const c of this.creatures) {
            const dx = c.pos.x - x, dy = c.pos.y - y;
            const hitRadius = c.traits.size + 15;
            if (dx * dx + dy * dy <= hitRadius * hitRadius) return c;
        }
        return null;
    }

    resize(w, h) { this.width = w; this.height = h; }

    getStats() {
        return {
            population: this.creatures.length,
            maxGeneration: this.stats.maxGeneration,
            speciesCount: this.stats.speciesList.length,
            speciesList: this.stats.speciesList,
            totalBorn: this.stats.totalBorn,
            totalDied: this.stats.totalDied,
            totalStarved: this.stats.totalStarved,
            totalKilled: this.stats.totalKilled,
            totalOldAge: this.stats.totalOldAge,
            foodCount: this.food.length,
            currentEra: this.currentEra,
            activeEvent: this.activeEvent,
            hazards: this.hazards,
        };
    }
}
