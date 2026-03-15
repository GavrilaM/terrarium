// ============================================
// TERRARIUM — Main Entry Point
// Game loop, camera, event handling
// ============================================

import { CONFIG } from './config.js';
import { Ecosystem } from './ecosystem.js';
import { Renderer } from './canvas.js';
import { Camera } from './camera.js';
import { ParticleSystem } from './particles.js';
import { UIManager } from './ui.js';

class Terrarium {
    constructor() {
        this.canvas = document.getElementById('terrarium-canvas');
        this.renderer = new Renderer(this.canvas);
        this.camera = new Camera(this.renderer.width, this.renderer.height);
        this.ecosystem = new Ecosystem(this.renderer.width, this.renderer.height);
        this.particles = new ParticleSystem();
        this.ui = new UIManager(this.ecosystem);

        // FPS tracking
        this.lastTime = performance.now();
        this.frameCount = 0;
        this.fps = 60;
        this.fpsUpdateTime = 0;

        // Interaction state
        this.interactionMode = null;
        this.prevAliveSet = new Set(this.ecosystem.creatures.map(c => c.id));

        // Init
        this.particles.initAmbient(CONFIG.WORLD.WIDTH, CONFIG.WORLD.HEIGHT);
        this._setupEventListeners();
        this._start();
    }

    _setupEventListeners() {
        // Resize
        window.addEventListener('resize', () => {
            this.renderer.resize();
            this.camera.resize(this.renderer.width, this.renderer.height);
            // Note: ecosystem uses WORLD dimensions, not screen
        });

        // ★ MOUSE — pan, zoom, click
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0 && !this.interactionMode) {
                // Left click without interaction mode → start pan
                this.camera.startPan(e.clientX, e.clientY);
                this._panMoved = false;
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.camera.isPanning) {
                this.camera.pan(e.clientX, e.clientY);
                this._panMoved = true;
            }
        });

        this.canvas.addEventListener('mouseup', (e) => {
            const wasPanning = this.camera.isPanning;
            this.camera.endPan();

            // If we didn't pan far (just clicked), handle click
            if (!this._panMoved) {
                const worldPos = this.camera.screenToWorld(e.clientX, e.clientY);
                this._handleCanvasClick(worldPos.x, worldPos.y, e.clientX, e.clientY);
            }
        });

        // ★ MOUSE WHEEL — zoom
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -1 : 1;
            this.camera.zoomAt(e.clientX, e.clientY, delta);
        }, { passive: false });

        // ★ TOUCH — pan, pinch zoom
        let lastTouchDist = 0;
        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.camera.startPan(e.touches[0].clientX, e.touches[0].clientY);
                this._panMoved = false;
            } else if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                lastTouchDist = Math.sqrt(dx * dx + dy * dy);
            }
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length === 1 && this.camera.isPanning) {
                this.camera.pan(e.touches[0].clientX, e.touches[0].clientY);
                this._panMoved = true;
            } else if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const delta = (dist - lastTouchDist) * 0.02;
                const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                this.camera.zoomAt(cx, cy, delta);
                lastTouchDist = dist;
            }
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            if (e.touches.length === 0) {
                this.camera.endPan();
                if (!this._panMoved && e.changedTouches.length > 0) {
                    const t = e.changedTouches[0];
                    const worldPos = this.camera.screenToWorld(t.clientX, t.clientY);
                    this._handleCanvasClick(worldPos.x, worldPos.y, t.clientX, t.clientY);
                }
            }
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
            for (let i = 0; i < 5; i++) {
                this.particles.addBurst(
                    Math.random() * CONFIG.WORLD.WIDTH,
                    Math.random() * CONFIG.WORLD.HEIGHT,
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

    _handleCanvasClick(worldX, worldY) {
        if (this.interactionMode === 'food') {
            this.ecosystem.spawnFoodAt(worldX, worldY, 5);
            this.particles.addBurst(worldX, worldY, 8, 120, 'birth');
            this.ui.showToast('🌱 Food scattered!');
            return;
        }

        if (this.interactionMode === 'creature') {
            const newCreature = this.ecosystem.spawnCreatureAt(worldX, worldY);
            if (newCreature) {
                this.particles.addBurst(worldX, worldY, 12, newCreature.traits.hue, 'birth');
                this.ui.showToast(`🧬 ${newCreature.speciesName} introduced!`, 'birth');
            } else {
                this.ui.showToast('⚠️ Max population reached!');
            }
            return;
        }

        // Default: select creature (using world coordinates)
        const creature = this.ecosystem.getCreatureAt(worldX, worldY);
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
        this.canvas.style.cursor = this.interactionMode ? 'crosshair' : 'grab';
    }

    /**
     * Main game loop
     */
    _start() {
        // Set initial cursor
        this.canvas.style.cursor = 'grab';

        const loop = (timestamp) => {
            const dt = Math.min((timestamp - this.lastTime) / 16.67, 3);
            this.lastTime = timestamp;

            const speed = this.ui.getSpeed();
            const effectiveDt = dt * speed;

            // FPS
            this.frameCount++;
            if (this.frameCount % 30 === 0) {
                const elapsed = timestamp - (this.fpsUpdateTime || timestamp);
                this.fps = elapsed > 0 ? Math.round(30000 / elapsed) : 60;
                this.fpsUpdateTime = timestamp;
            }

            // --- UPDATE ---
            this.ecosystem.update(effectiveDt);
            this.camera.update();
            this.particles.update(CONFIG.WORLD.WIDTH, CONFIG.WORLD.HEIGHT, effectiveDt);
            this._checkLifeEvents();

            // --- RENDER ---
            // 1. Clear (screen space)
            this.renderer.clear();

            // 2. Apply camera transform
            this.camera.applyTransform(this.renderer.ctx);

            // 3. Draw world (world space)
            this.renderer.drawWorldBorder();
            this.particles.draw(this.renderer.ctx);
            this.renderer.drawHazards(this.ecosystem.hazards);
            this.renderer.drawFood(this.ecosystem.food);
            this.renderer.drawCreatures(this.ecosystem.creatures);

            // Selection
            if (this.ui.selectedCreature) {
                this.renderer.drawSelection(this.ui.selectedCreature);
            }

            // 4. Restore camera transform
            this.camera.restoreTransform(this.renderer.ctx);

            // 5. Minimap (screen space — stays fixed)
            this.renderer.drawMinimap(
                this.ecosystem.creatures,
                this.ecosystem.food,
                this.camera,
                this.ecosystem.hazards
            );

            // --- UI UPDATE (throttled) ---
            if (this.frameCount % 10 === 0) {
                this.ui.update(this.fps);
            }

            requestAnimationFrame(loop);
        };

        requestAnimationFrame(loop);
    }

    /**
     * Check for birth/death events for particles
     */
    _checkLifeEvents() {
        const currentAlive = new Set();
        for (const c of this.ecosystem.creatures) {
            currentAlive.add(c.id);
            if (!this.prevAliveSet.has(c.id)) {
                this.particles.addBurst(c.pos.x, c.pos.y, 8, c.traits.hue, 'birth');
            }
        }
        this.prevAliveSet = currentAlive;
    }
}

// --- Boot ---
window.addEventListener('DOMContentLoaded', () => {
    new Terrarium();
});
