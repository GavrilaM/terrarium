// ============================================
// TERRARIUM — Ecosystem Manager
// Manages creatures, food, spatial queries
// ============================================

import { CONFIG } from './config.js';
import { Creature } from './creature.js';
import { generateRandomDNA, geneticDistance } from './genetics.js';

const { ECOSYSTEM } = CONFIG;

/**
 * Food particle
 */
class Food {
    constructor(x, y) {
        this.pos = { x, y };
        this.energy = ECOSYSTEM.FOOD_ENERGY;
        this.size = ECOSYSTEM.FOOD_SIZE_MIN + Math.random() * (ECOSYSTEM.FOOD_SIZE_MAX - ECOSYSTEM.FOOD_SIZE_MIN);
        this.hue = 100 + Math.random() * 40; // green-ish
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
            maxGeneration: 0,
            speciesList: [],
            populationHistory: [],
        };

        // Spatial grid for performance
        this.gridSize = 100;
        this.grid = {};

        this._init();
    }

    _init() {
        // Spawn initial creatures
        for (let i = 0; i < ECOSYSTEM.INITIAL_CREATURES; i++) {
            const x = Math.random() * this.width;
            const y = Math.random() * this.height;
            this.creatures.push(new Creature(x, y));
            this.stats.totalBorn++;
        }

        // Spawn initial food
        for (let i = 0; i < ECOSYSTEM.INITIAL_FOOD; i++) {
            this._spawnFood();
        }

        this._updateSpecies();
    }

    /**
     * Main update — called each frame
     */
    update(dt = 1) {
        // Rebuild spatial grid
        this._buildGrid();

        // Update all creatures
        for (const creature of this.creatures) {
            creature.update(this, this.width, this.height, dt);
        }

        // Remove dead creatures
        const deadCreatures = this.creatures.filter(c => !c.alive);
        for (const dead of deadCreatures) {
            this.stats.totalDied++;
            this._addEvent('death', `${dead.speciesName} has perished (Gen ${dead.generation})`);
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

        // Track max generation
        for (const c of this.creatures) {
            if (c.generation > this.stats.maxGeneration) {
                this.stats.maxGeneration = c.generation;
                if (c.generation > 1) {
                    this._addEvent('evolution', `Generation ${c.generation} reached! (${c.speciesName})`);
                }
            }
        }

        // Population history (sample every ~60 frames)
        if (Math.random() < 0.016) {
            this.stats.populationHistory.push(this.creatures.length);
            if (this.stats.populationHistory.length > 200) {
                this.stats.populationHistory.shift();
            }
        }
    }

    /**
     * Spatial grid management
     */
    _buildGrid() {
        this.grid = {};

        for (const creature of this.creatures) {
            const key = this._gridKey(creature.pos);
            if (!this.grid[key]) this.grid[key] = [];
            this.grid[key].push(creature);
        }
    }

    _gridKey(pos) {
        const gx = Math.floor(pos.x / this.gridSize);
        const gy = Math.floor(pos.y / this.gridSize);
        return `${gx},${gy}`;
    }

    _getNearbyCells(pos, radius) {
        const results = [];
        const cellRadius = Math.ceil(radius / this.gridSize);
        const cx = Math.floor(pos.x / this.gridSize);
        const cy = Math.floor(pos.y / this.gridSize);

        for (let dx = -cellRadius; dx <= cellRadius; dx++) {
            for (let dy = -cellRadius; dy <= cellRadius; dy++) {
                const key = `${cx + dx},${cy + dy}`;
                if (this.grid[key]) {
                    results.push(...this.grid[key]);
                }
            }
        }
        return results;
    }

    /**
     * Spatial queries (used by Creature for decision-making)
     */
    getCreaturesNear(pos, radius, excludeId = -1) {
        const nearby = this._getNearbyCells(pos, radius);
        return nearby.filter(c => {
            if (c.id === excludeId || !c.alive) return false;
            const dx = c.pos.x - pos.x;
            const dy = c.pos.y - pos.y;
            return (dx * dx + dy * dy) <= radius * radius;
        });
    }

    getFoodNear(pos, radius) {
        // Simple distance check (food isn't in grid for simplicity)
        return this.food.filter(f => {
            if (!f.alive) return false;
            const dx = f.pos.x - pos.x;
            const dy = f.pos.y - pos.y;
            return (dx * dx + dy * dy) <= radius * radius;
        });
    }

    /**
     * Mutation methods
     */
    addCreature(creature) {
        if (this.creatures.length < ECOSYSTEM.MAX_CREATURES) {
            this.creatures.push(creature);
            this.stats.totalBorn++;
            if (creature.generation > 1 && Math.random() < 0.3) {
                this._addEvent('birth', `New ${creature.speciesName} born! (Gen ${creature.generation})`);
            }
            return true;
        }
        return false;
    }

    removeFood(food) {
        food.alive = false;
    }

    /**
     * Spawn food at random position
     */
    _spawnFood() {
        const x = Math.random() * this.width;
        const y = Math.random() * this.height;
        this.food.push(new Food(x, y));
    }

    /**
     * Spawn food at specific position (user interaction)
     */
    spawnFoodAt(x, y, count = 5) {
        for (let i = 0; i < count; i++) {
            const fx = x + (Math.random() - 0.5) * 60;
            const fy = y + (Math.random() - 0.5) * 60;
            this.food.push(new Food(fx, fy));
        }
        this._addEvent('system', `Food scattered at (${Math.round(x)}, ${Math.round(y)})`);
    }

    /**
     * Spawn a random creature at position (user interaction)
     */
    spawnCreatureAt(x, y) {
        if (this.creatures.length < ECOSYSTEM.MAX_CREATURES) {
            const creature = new Creature(x, y);
            this.creatures.push(creature);
            this.stats.totalBorn++;
            this._addEvent('birth', `New ${creature.speciesName} introduced!`);
            return creature;
        }
        return null;
    }

    /**
     * Extinction event — kill random percentage
     */
    triggerExtinction(severity = 0.5) {
        const killCount = Math.floor(this.creatures.length * severity);
        for (let i = 0; i < killCount; i++) {
            const idx = Math.floor(Math.random() * this.creatures.length);
            if (this.creatures[idx]) {
                this.creatures[idx].alive = false;
            }
        }
        this._addEvent('extinction', `☄️ Cataclysm! ${killCount} creatures perished!`);
    }

    /**
     * Species classification — group by genetic similarity
     */
    _updateSpecies() {
        if (this.creatures.length === 0) {
            this.stats.speciesList = [];
            return;
        }

        // Simple clustering: group by species name (derived from DNA)
        const speciesMap = {};
        for (const c of this.creatures) {
            if (!speciesMap[c.speciesName]) {
                speciesMap[c.speciesName] = {
                    name: c.speciesName,
                    count: 0,
                    hue: c.traits.hue,
                    saturation: c.traits.saturation,
                    avgGen: 0,
                };
            }
            speciesMap[c.speciesName].count++;
            speciesMap[c.speciesName].avgGen += c.generation;
        }

        this.stats.speciesList = Object.values(speciesMap)
            .map(s => ({ ...s, avgGen: Math.round(s.avgGen / s.count) }))
            .sort((a, b) => b.count - a.count);
    }

    /**
     * Event log
     */
    _addEvent(type, message) {
        this.events.unshift({ type, message, time: Date.now() });
        if (this.events.length > 50) this.events.pop();
    }

    /**
     * Get creature at position (for user click)
     */
    getCreatureAt(x, y) {
        for (const c of this.creatures) {
            const dx = c.pos.x - x;
            const dy = c.pos.y - y;
            if (dx * dx + dy * dy <= (c.traits.size + 5) * (c.traits.size + 5)) {
                return c;
            }
        }
        return null;
    }

    /**
     * Resize handler
     */
    resize(w, h) {
        this.width = w;
        this.height = h;
    }

    /**
     * Get stats for UI
     */
    getStats() {
        return {
            population: this.creatures.length,
            maxGeneration: this.stats.maxGeneration,
            speciesCount: this.stats.speciesList.length,
            speciesList: this.stats.speciesList,
            totalBorn: this.stats.totalBorn,
            totalDied: this.stats.totalDied,
            foodCount: this.food.length,
        };
    }
}
