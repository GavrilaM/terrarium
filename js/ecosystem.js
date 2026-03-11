// ============================================
// TERRARIUM — Ecosystem Manager
// Manages creatures, food, spatial queries, eras
// ============================================

import { CONFIG } from './config.js';
import { Creature, createCreature } from './creature.js';
import { geneticDistance } from './genetics.js';
import { getCurrentEra, getRandomSpeciesType, SPECIES_TYPES } from './species.js';

const { ECOSYSTEM } = CONFIG;

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

export class Ecosystem {
    constructor(canvasW, canvasH) {
        this.width = canvasW;
        this.height = canvasH;
        this.creatures = [];
        this.food = [];
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

        // Spatial grid for performance
        this.gridSize = 100;
        this.grid = {};

        this._init();
    }

    _init() {
        // Spawn initial creatures — balanced species mix
        for (let i = 0; i < ECOSYSTEM.INITIAL_CREATURES; i++) {
            const x = Math.random() * this.width;
            const y = Math.random() * this.height;
            const creature = createCreature(x, y);
            this.creatures.push(creature);
            this.stats.totalBorn++;
        }

        // Spawn initial food
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

        // Update all creatures
        for (const creature of this.creatures) {
            creature.update(this, this.width, this.height, dt);
        }

        // Process dead creatures with detailed logging
        const deadCreatures = this.creatures.filter(c => !c.alive);
        for (const dead of deadCreatures) {
            this.stats.totalDied++;
            this._logDeath(dead);
        }
        this.creatures = this.creatures.filter(c => c.alive);

        // Remove eaten food
        this.food = this.food.filter(f => f.alive);

        // Spawn new food
        if (this.food.length < ECOSYSTEM.MAX_FOOD && Math.random() < ECOSYSTEM.FOOD_SPAWN_RATE * dt) {
            this._spawnFood();
        }

        // Update food pulse
        for (const f of this.food) {
            f.pulsePhase += 0.03 * dt;
        }

        // Update species classification periodically
        if (Math.random() < 0.02) {
            this._updateSpecies();
        }

        // Track max generation & era
        for (const c of this.creatures) {
            if (c.generation > this.stats.maxGeneration) {
                this.stats.maxGeneration = c.generation;
                this._addEvent('evolution', `⭐ Generation ${c.generation} reached! (${c.speciesName})`);
            }
        }

        // Check era transition
        const newEra = getCurrentEra(this.stats.maxGeneration);
        if (newEra.id !== this.currentEra.id) {
            this.previousEra = this.currentEra;
            this.currentEra = newEra;
            this._addEvent('era', `🌟 ERA SHIFT: ${newEra.emoji} ${newEra.name}! — ${newEra.description}`);
        }

        // Population history
        if (Math.random() < 0.016) {
            this.stats.populationHistory.push(this.creatures.length);
            if (this.stats.populationHistory.length > 200) {
                this.stats.populationHistory.shift();
            }
        }
    }

    /**
     * Log death with cause
     */
    _logDeath(creature) {
        const cause = creature.causeOfDeath || 'unknown';
        const species = creature.speciesName;
        const gen = creature.generation;
        const emoji = creature.speciesType?.emoji || '💀';

        switch (cause) {
            case 'starvation':
                this.stats.totalStarved++;
                this._addEvent('death', `${emoji} ${species} #${creature.id} starved (Gen ${gen}, age ${Math.floor(creature.age / 60)}s)`);
                break;
            case 'killed':
                this.stats.totalKilled++;
                const killerName = creature.killedBy
                    ? `${creature.killedBy.speciesName} #${creature.killedBy.id}`
                    : 'unknown predator';
                this._addEvent('death', `${emoji} ${species} #${creature.id} killed by ${killerName} (Gen ${gen})`);
                break;
            case 'old_age':
                this.stats.totalOldAge++;
                this._addEvent('death', `${emoji} ${species} #${creature.id} died of old age (Gen ${gen}, ${creature.children} children)`);
                break;
            case 'cataclysm':
                this._addEvent('death', `${emoji} ${species} #${creature.id} lost in cataclysm`);
                break;
            default:
                this._addEvent('death', `${emoji} ${species} #${creature.id} perished (Gen ${gen})`);
        }
    }

    // ---- Spatial Grid ----

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

    // ---- Spatial Queries ----

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

    // ---- Mutations ----

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

    removeFood(food) {
        food.alive = false;
    }

    _spawnFood() {
        this.food.push(new Food(Math.random() * this.width, Math.random() * this.height));
    }

    /**
     * User interaction: scatter food
     */
    spawnFoodAt(x, y, count = 5) {
        for (let i = 0; i < count; i++) {
            this.food.push(new Food(
                x + (Math.random() - 0.5) * 60,
                y + (Math.random() - 0.5) * 60
            ));
        }
        this._addEvent('system', `🌱 Food scattered at (${Math.round(x)}, ${Math.round(y)})`);
    }

    /**
     * User interaction: spawn specific species
     */
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

    /**
     * Extinction event
     */
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

    /**
     * Species classification — group by species type
     */
    _updateSpecies() {
        if (this.creatures.length === 0) {
            this.stats.speciesList = [];
            return;
        }

        const speciesMap = {};
        for (const c of this.creatures) {
            const key = c.speciesType.id;
            if (!speciesMap[key]) {
                speciesMap[key] = {
                    name: c.speciesType.name,
                    emoji: c.speciesType.emoji,
                    count: 0,
                    hue: c.traits.hue,
                    saturation: c.traits.saturation,
                    avgGen: 0,
                    diet: c.speciesType.diet,
                };
            }
            speciesMap[key].count++;
            speciesMap[key].avgGen += c.generation;
        }

        this.stats.speciesList = Object.values(speciesMap)
            .map(s => ({ ...s, avgGen: Math.round(s.avgGen / s.count) }))
            .sort((a, b) => b.count - a.count);
    }

    // ---- Event Log ----

    _addEvent(type, message) {
        this.events.unshift({ type, message, time: Date.now() });
        if (this.events.length > 80) this.events.pop();
    }

    // ---- User Click ----

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
        };
    }
}
