// ============================================
// TERRARIUM — Main Entry Point
// Game loop, initialization, event handling
// ============================================

import { CONFIG } from './config.js';
import { Ecosystem } from './ecosystem.js';
import { Renderer } from './canvas.js';
import { ParticleSystem } from './particles.js';
import { UIManager } from './ui.js';

class Terrarium {
    constructor() {
        this.canvas = document.getElementById('terrarium-canvas');
        this.renderer = new Renderer(this.canvas);
        this.ecosystem = new Ecosystem(this.renderer.width, this.renderer.height);
        this.particles = new ParticleSystem();
        this.ui = new UIManager(this.ecosystem);

        // FPS tracking
        this.lastTime = performance.now();
        this.frameCount = 0;
        this.fps = 60;
        this.fpsUpdateTime = 0;

        // Interaction state
        this.interactionMode = null; // 'food', 'creature' or null
        this.prevAliveSet = new Set(this.ecosystem.creatures.map(c => c.id));

        // Init
        this.particles.initAmbient(this.renderer.width, this.renderer.height);
        this._setupEventListeners();
        this._start();
    }

    _setupEventListeners() {
        // Resize
        window.addEventListener('resize', () => {
            this.renderer.resize();
            this.ecosystem.resize(this.renderer.width, this.renderer.height);
            this.particles.initAmbient(this.renderer.width, this.renderer.height);
        });

        // Canvas click
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this._handleCanvasClick(x, y);
        });

        // Control buttons
        document.getElementById('btn-add-food')?.addEventListener('click', () => {
            this.interactionMode = this.interactionMode === 'food' ? null : 'food';
            this._updateButtonStates();
        });

        document.getElementById('btn-add-creature')?.addEventListener('click', () => {
            this.interactionMode = this.interactionMode === 'creature' ? null : 'creature';
            this._updateButtonStates();
        });

        document.getElementById('btn-extinction')?.addEventListener('click', () => {
            this.ecosystem.triggerExtinction(0.5);
            this.ui.showToast('☄️ Cataclysm event triggered!', 'death');

            // Particles for extinction
            for (let i = 0; i < 5; i++) {
                this.particles.addBurst(
                    Math.random() * this.renderer.width,
                    Math.random() * this.renderer.height,
                    15, 0, 'death'
                );
            }
        });

        // Keyboard shortcuts
        window.addEventListener('keydown', (e) => {
            if (e.key === 'f') {
                this.interactionMode = 'food';
                this._updateButtonStates();
            } else if (e.key === 'c') {
                this.interactionMode = 'creature';
                this._updateButtonStates();
            } else if (e.key === 'Escape') {
                this.interactionMode = null;
                this.ui.deselectCreature();
                this._updateButtonStates();
            }
        });
    }

    _handleCanvasClick(x, y) {
        if (this.interactionMode === 'food') {
            this.ecosystem.spawnFoodAt(x, y, 5);
            this.particles.addBurst(x, y, 8, 120, 'birth');
            this.ui.showToast('🌱 Food scattered!');
            return;
        }

        if (this.interactionMode === 'creature') {
            const newCreature = this.ecosystem.spawnCreatureAt(x, y);
            if (newCreature) {
                this.particles.addBurst(x, y, 12, newCreature.traits.hue, 'birth');
                this.ui.showToast(`🧬 ${newCreature.speciesName} introduced!`, 'birth');
            } else {
                this.ui.showToast('⚠️ Max population reached!');
            }
            return;
        }

        // Default: select creature
        const creature = this.ecosystem.getCreatureAt(x, y);
        if (creature) {
            this.ui.selectCreature(creature);
        } else {
            this.ui.deselectCreature();
        }
    }

    _updateButtonStates() {
        const foodBtn = document.getElementById('btn-add-food');
        const creatureBtn = document.getElementById('btn-add-creature');

        foodBtn?.classList.toggle('active', this.interactionMode === 'food');
        creatureBtn?.classList.toggle('active', this.interactionMode === 'creature');

        // Change cursor
        this.canvas.style.cursor = this.interactionMode ? 'crosshair' : 'default';
    }

    /**
     * Main game loop
     */
    _start() {
        const loop = (timestamp) => {
            // Delta time
            const dt = Math.min((timestamp - this.lastTime) / 16.67, 3); // cap at 3x speed
            this.lastTime = timestamp;

            // Speed multiplier from UI
            const speed = this.ui.getSpeed();
            const effectiveDt = dt * speed;

            // FPS counter
            this.frameCount++;
            this.fpsUpdateTime += timestamp - (this.lastTime - dt * 16.67);
            if (this.frameCount % 30 === 0) {
                this.fps = Math.round(1000 / (dt * 16.67) * dt);
            }

            // --- UPDATE ---
            this.ecosystem.update(effectiveDt);
            this.particles.update(this.renderer.width, this.renderer.height, effectiveDt);

            // Check for births/deaths to trigger particles
            this._checkLifeEvents();

            // --- RENDER ---
            this.renderer.clear();
            this.particles.draw(this.renderer.ctx);
            this.renderer.drawFood(this.ecosystem.food);
            this.renderer.drawCreatures(this.ecosystem.creatures);

            // Selection
            if (this.ui.selectedCreature) {
                this.renderer.drawSelection(this.ui.selectedCreature);
            }

            // --- UI UPDATE (throttled) ---
            if (this.frameCount % 10 === 0) {
                this.ui.update(this.fps);
            }

            requestAnimationFrame(loop);
        };

        requestAnimationFrame(loop);
    }

    /**
     * Check for birth/death events to trigger particles
     */
    _checkLifeEvents() {
        const currentAlive = new Set();
        for (const c of this.ecosystem.creatures) {
            currentAlive.add(c.id);

            // New creature (birth particle)
            if (!this.prevAliveSet.has(c.id)) {
                this.particles.addBurst(c.pos.x, c.pos.y, 8, c.traits.hue, 'birth');
            }
        }

        // Dead creatures (death particle)
        for (const id of this.prevAliveSet) {
            if (!currentAlive.has(id)) {
                // We don't have position of dead creature anymore, skip
            }
        }

        this.prevAliveSet = currentAlive;
    }
}

// --- Boot ---
window.addEventListener('DOMContentLoaded', () => {
    new Terrarium();
});
