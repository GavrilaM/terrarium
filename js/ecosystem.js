// ============================================
// TERRARIUM — Ecosystem Manager
// Creatures, food, meat chunks, hazards, eras
// ============================================

import { CONFIG } from './config.js';
import { Creature, createCreature } from './creature.js';
import { geneticDistance } from './genetics.js';
import { getCurrentEra, getRandomSpeciesType, SPECIES_TYPES } from './species.js';

const { ECOSYSTEM, EVENTS, MEAT, WORLD } = CONFIG;

/**
 * Food particle (plant or meat)
 */
class Food {
    constructor(x, y, isMeat = false, energy = null) {
        this.pos = { x, y };
        this.isMeat = isMeat;
        this.energy = energy || (isMeat ? MEAT.CHUNK_ENERGY : ECOSYSTEM.FOOD_ENERGY);
        this.size = isMeat
            ? MEAT.CHUNK_SIZE_MIN + Math.random() * (MEAT.CHUNK_SIZE_MAX - MEAT.CHUNK_SIZE_MIN)
            : ECOSYSTEM.FOOD_SIZE_MIN + Math.random() * (ECOSYSTEM.FOOD_SIZE_MAX - ECOSYSTEM.FOOD_SIZE_MIN);
        this.hue = isMeat ? (350 + Math.random() * 20) % 360 : 100 + Math.random() * 40; // red for meat, green for plants
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.alive = true;
        this.decayTimer = isMeat ? MEAT.DECAY_TIME : Infinity; // meat decays
    }
}

/**
 * Hazard zone
 */
class HazardZone {
    constructor(x, y, type, duration, radius) {
        this.pos = { x, y };
        this.type = type;
        this.duration = duration;
        this.maxDuration = duration;
        this.radius = radius;
        this.alive = true;
        this.direction = { x: Math.random() - 0.5, y: Math.random() - 0.5 };
        const len = Math.sqrt(this.direction.x ** 2 + this.direction.y ** 2);
        if (len > 0) { this.direction.x /= len; this.direction.y /= len; }
    }
}

export class Ecosystem {
    constructor(canvasW, canvasH) {
        this.width = WORLD.WIDTH;
        this.height = WORLD.HEIGHT;
        this.creatures = [];
        this.food = [];
        this.hazards = [];
        this.events = [];
        this.stats = {
            totalBorn: 0, totalDied: 0,
            totalStarved: 0, totalKilled: 0, totalOldAge: 0,
            maxGeneration: 0,
            speciesList: [],
            populationHistory: [],
        };

        this.currentEra = getCurrentEra(0);
        this.previousEra = null;
        this.nextEventTimer = EVENTS.MIN_INTERVAL + Math.random() * (EVENTS.MAX_INTERVAL - EVENTS.MIN_INTERVAL);
        this.activeEvent = null;
        this.gridSize = 100;
        this.grid = {};

        this._init();
    }

    _init() {
        for (let i = 0; i < ECOSYSTEM.INITIAL_CREATURES; i++) {
            this.creatures.push(createCreature(Math.random() * this.width, Math.random() * this.height));
            this.stats.totalBorn++;
        }
        for (let i = 0; i < ECOSYSTEM.INITIAL_FOOD; i++) this._spawnFood();
        this._updateSpecies();
    }

    update(dt = 1) {
        this._buildGrid();

        // Update creatures
        for (const c of this.creatures) c.update(this, this.width, this.height, dt);

        // Apply hazards
        this._applyHazards(dt);

        // Process deaths → spawn meat chunks
        const dead = this.creatures.filter(c => !c.alive);
        for (const d of dead) {
            this.stats.totalDied++;
            this._logDeath(d);
            // Meat chunks already spawned by combat system, but ensure for non-combat deaths too
            if (d.causeOfDeath !== 'killed') {
                this.spawnMeatChunks(d);
            }
        }
        this.creatures = this.creatures.filter(c => c.alive);

        // Update food (decay meat)
        this.food = this.food.filter(f => {
            if (!f.alive) return false;
            if (f.isMeat) {
                f.decayTimer -= dt;
                if (f.decayTimer <= 0) return false;
            }
            f.pulsePhase += 0.03 * dt;
            return true;
        });

        // Spawn plant food
        if (this.food.filter(f => !f.isMeat).length < ECOSYSTEM.MAX_FOOD && Math.random() < ECOSYSTEM.FOOD_SPAWN_RATE * dt) {
            this._spawnFood();
        }

        // Species classification
        if (Math.random() < 0.02) this._updateSpecies();

        // Track generation & era
        for (const c of this.creatures) {
            if (c.generation > this.stats.maxGeneration) {
                this.stats.maxGeneration = c.generation;
                this._addEvent('evolution', `⭐ Generation ${c.generation} reached! (${c.speciesName})`);
            }
        }

        const newEra = getCurrentEra(this.stats.maxGeneration);
        if (newEra.id !== this.currentEra.id) {
            this.previousEra = this.currentEra;
            this.currentEra = newEra;
            this._addEvent('era', `🌟 ERA SHIFT: ${newEra.emoji} ${newEra.name}! — ${newEra.description}`);
        }

        this._updateEnvironmentalEvents(dt);
        this._autoRepopulate();

        if (Math.random() < 0.016) {
            this.stats.populationHistory.push(this.creatures.length);
            if (this.stats.populationHistory.length > 200) this.stats.populationHistory.shift();
        }
    }

    // ========================================
    // ★ MEAT CHUNK SPAWNING
    // ========================================

    spawnMeatChunks(deadCreature) {
        const chunkCount = Math.max(2, Math.floor(MEAT.BASE_CHUNKS + deadCreature.traits.size * MEAT.SIZE_BONUS_CHUNKS));
        for (let i = 0; i < chunkCount; i++) {
            const mx = deadCreature.pos.x + (Math.random() - 0.5) * MEAT.SCATTER_RADIUS * 2;
            const my = deadCreature.pos.y + (Math.random() - 0.5) * MEAT.SCATTER_RADIUS * 2;
            this.food.push(new Food(mx, my, true));
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
        if (this.activeEvent) {
            this.activeEvent.timer -= dt;
            if (this.activeEvent.timer <= 0) this.activeEvent = null;
        }
    }

    _triggerRandomEvent() {
        const roll = Math.random();
        if (roll < 0.35) {
            const cx = Math.random() * this.width, cy = Math.random() * this.height;
            for (let i = 0; i < EVENTS.BLOOM_FOOD_COUNT; i++) {
                this.food.push(new Food(cx + (Math.random() - 0.5) * 200, cy + (Math.random() - 0.5) * 200));
            }
            this._addEvent('system', `🌿 Nutrient Bloom at (${Math.round(cx)}, ${Math.round(cy)})`);
            this.activeEvent = { type: 'bloom', message: '🌿 Nutrient Bloom!', timer: 120 };
        } else if (roll < 0.60) {
            const cx = Math.random() * this.width, cy = Math.random() * this.height;
            this.hazards.push(new HazardZone(cx, cy, 'toxic', EVENTS.TOXIC_DURATION, EVENTS.TOXIC_RADIUS));
            this._addEvent('system', `☠️ Toxic zone at (${Math.round(cx)}, ${Math.round(cy)})`);
            this.activeEvent = { type: 'toxic', message: '☠️ Toxic Zone Active', timer: EVENTS.TOXIC_DURATION };
        } else if (roll < 0.80) {
            const count = Math.min(5, Math.ceil(this.creatures.length * 0.15));
            for (let i = 0; i < count; i++) {
                const idx = Math.floor(Math.random() * this.creatures.length);
                if (this.creatures[idx]?.alive) {
                    const gene = Math.floor(Math.random() * this.creatures[idx].dna.length);
                    this.creatures[idx].dna[gene] = Math.max(0, Math.min(1, this.creatures[idx].dna[gene] + (Math.random() - 0.5) * 0.4));
                }
            }
            this._addEvent('evolution', `⚡ Mutation Surge! ${count} creatures mutated`);
            this.activeEvent = { type: 'mutation', message: '⚡ Mutation Surge!', timer: 90 };
        } else {
            const cx = Math.random() * this.width, cy = Math.random() * this.height;
            this.hazards.push(new HazardZone(cx, cy, 'current', EVENTS.CURRENT_DURATION, 120));
            this._addEvent('system', `🌊 Ocean current appeared!`);
            this.activeEvent = { type: 'current', message: '🌊 Ocean Current', timer: EVENTS.CURRENT_DURATION };
        }
    }

    _applyHazards(dt) {
        for (const h of this.hazards) {
            if (!h.alive) continue;
            for (const c of this.creatures) {
                if (!c.alive) continue;
                const dx = c.pos.x - h.pos.x, dy = c.pos.y - h.pos.y;
                if (dx * dx + dy * dy <= h.radius * h.radius) {
                    if (h.type === 'toxic') {
                        c.takeDamage(EVENTS.TOXIC_DAMAGE * dt, 'toxic');
                    } else if (h.type === 'current') {
                        c.pos.x += h.direction.x * EVENTS.CURRENT_STRENGTH * dt;
                        c.pos.y += h.direction.y * EVENTS.CURRENT_STRENGTH * dt;
                    }
                }
            }
        }
        this.hazards = this.hazards.filter(h => { h.duration -= dt; h.alive = h.duration > 0; return h.alive; });
    }

    _autoRepopulate() {
        if (this.creatures.length < 5) {
            const needed = 5 - this.creatures.length;
            for (let i = 0; i < needed; i++) {
                this.creatures.push(createCreature(Math.random() * this.width, Math.random() * this.height));
                this.stats.totalBorn++;
            }
            if (needed > 0) this._addEvent('system', `🌱 Life finds a way! ${needed} new organisms emerged`);
        }
    }

    // ========================================
    // DEATH LOGGING
    // ========================================

    _logDeath(creature) {
        const cause = creature.causeOfDeath || 'unknown';
        const sp = creature.speciesName;
        const gen = creature.generation;
        const emoji = creature.speciesType?.emoji || '💀';

        switch (cause) {
            case 'starvation':
                this.stats.totalStarved++;
                this._addEvent('death', `${emoji} ${sp} #${creature.id} starved (Gen ${gen})`);
                break;
            case 'killed': {
                this.stats.totalKilled++;
                const killer = creature.killedBy ? `${creature.killedBy.speciesName} #${creature.killedBy.id}` : 'unknown';
                this._addEvent('death', `${emoji} ${sp} #${creature.id} killed by ${killer} → 🥩 meat dropped`);
                break;
            }
            case 'old_age':
                this.stats.totalOldAge++;
                this._addEvent('death', `${emoji} ${sp} #${creature.id} died of old age (${creature.children} offspring)`);
                break;
            case 'toxic':
                this._addEvent('death', `${emoji} ${sp} #${creature.id} poisoned by toxic zone`);
                break;
            case 'cataclysm':
                this._addEvent('death', `${emoji} ${sp} #${creature.id} lost in cataclysm`);
                break;
            default:
                this._addEvent('death', `${emoji} ${sp} #${creature.id} perished (Gen ${gen})`);
        }
    }

    // ========================================
    // SPATIAL GRID
    // ========================================

    _buildGrid() {
        this.grid = {};
        for (const c of this.creatures) {
            const key = `${Math.floor(c.pos.x / this.gridSize)},${Math.floor(c.pos.y / this.gridSize)}`;
            if (!this.grid[key]) this.grid[key] = [];
            this.grid[key].push(c);
        }
    }

    _getNearbyCells(pos, radius) {
        const results = [];
        const cr = Math.ceil(radius / this.gridSize);
        const cx = Math.floor(pos.x / this.gridSize), cy = Math.floor(pos.y / this.gridSize);
        for (let dx = -cr; dx <= cr; dx++)
            for (let dy = -cr; dy <= cr; dy++) {
                const key = `${cx + dx},${cy + dy}`;
                if (this.grid[key]) results.push(...this.grid[key]);
            }
        return results;
    }

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
    // PUBLIC
    // ========================================

    addCreature(creature) {
        // ★ Carrying capacity check — block reproduction when overcrowded
        const foodCount = this.food.filter(f => !f.isMeat).length;
        const carryingCap = Math.max(10, foodCount * ECOSYSTEM.CARRY_CAPACITY_RATIO);
        const atCapacity = this.creatures.length >= Math.min(ECOSYSTEM.MAX_CREATURES, carryingCap);

        if (!atCapacity) {
            this.creatures.push(creature);
            this.stats.totalBorn++;
            if (creature.generation > 0 && Math.random() < 0.2) {
                this._addEvent('birth', `${creature.speciesType?.emoji || '🧬'} New ${creature.speciesName} born! (Gen ${creature.generation})`);
            }
            return true;
        }
        return false;
    }

    /**
     * Get dynamic reproduction cost based on population
     */
    getReproCost() {
        return ECOSYSTEM.REPRO_BASE_COST + this.creatures.length * ECOSYSTEM.REPRO_POP_SCALE;
    }

    removeFood(food) { food.alive = false; }

    _spawnFood() { this.food.push(new Food(Math.random() * this.width, Math.random() * this.height)); }

    spawnFoodAt(x, y, count = 5) {
        for (let i = 0; i < count; i++)
            this.food.push(new Food(x + (Math.random() - 0.5) * 60, y + (Math.random() - 0.5) * 60));
        this._addEvent('system', `🌱 Food scattered at (${Math.round(x)}, ${Math.round(y)})`);
    }

    spawnCreatureAt(x, y, speciesType = null) {
        if (this.creatures.length < ECOSYSTEM.MAX_CREATURES) {
            const c = createCreature(x, y, speciesType);
            this.creatures.push(c);
            this.stats.totalBorn++;
            this._addEvent('birth', `${c.speciesType?.emoji || '🧬'} New ${c.speciesName} introduced!`);
            return c;
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
        const map = {};
        for (const c of this.creatures) {
            const k = c.speciesType.id;
            if (!map[k]) map[k] = { name: c.speciesType.name, emoji: c.speciesType.emoji, count: 0, hue: c.traits.hue, saturation: c.traits.saturation, avgGen: 0, diet: c.speciesType.diet, tier3Count: 0 };
            map[k].count++; map[k].avgGen += c.generation;
            if (c.evolutionTier >= 3) map[k].tier3Count++;
            
            // Local graduation trigger inside tick
            if (c.evolutionTier >= 3 && map[k].count >= 5 && !this.graduatedSpecies) {
                this.graduatedSpecies = map[k];
            }
        }
        this.stats.speciesList = Object.values(map).map(s => ({ ...s, avgGen: Math.round(s.avgGen / s.count) })).sort((a, b) => b.count - a.count);
    }

    _addEvent(type, message) {
        this.events.unshift({ type, message, time: Date.now() });
        if (this.events.length > 80) this.events.pop();
    }

    getCreatureAt(x, y) {
        for (const c of this.creatures) {
            const dx = c.pos.x - x, dy = c.pos.y - y;
            if (dx * dx + dy * dy <= (c.traits.size + 15) ** 2) return c;
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
            totalBorn: this.stats.totalBorn, totalDied: this.stats.totalDied,
            totalStarved: this.stats.totalStarved, totalKilled: this.stats.totalKilled, totalOldAge: this.stats.totalOldAge,
            foodCount: this.food.filter(f => !f.isMeat).length,
            meatCount: this.food.filter(f => f.isMeat).length,
            currentEra: this.currentEra,
            activeEvent: this.activeEvent,
            hazards: this.hazards,
            graduatedSpecies: this.graduatedSpecies,
        };
    }
}
