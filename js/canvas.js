// ============================================
// TERRARIUM — Canvas Renderer
// Draws creatures, food, environment, effects
// ============================================

import { CONFIG } from './config.js';
import { STATES } from './creature.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.canvas.style.width = window.innerWidth + 'px';
        this.canvas.style.height = window.innerHeight + 'px';
        this.ctx.scale(dpr, dpr);
        this.width = window.innerWidth;
        this.height = window.innerHeight;
    }

    /**
     * Clear and draw background
     */
    clear() {
        const ctx = this.ctx;

        // Dark gradient background
        const grad = ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, CONFIG.CANVAS.BG_GRADIENT_TOP);
        grad.addColorStop(1, CONFIG.CANVAS.BG_GRADIENT_BOTTOM);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);
    }

    /**
     * Draw all food sources
     */
    drawFood(foodList) {
        const ctx = this.ctx;

        for (const food of foodList) {
            if (!food.alive) continue;

            const pulse = 1 + Math.sin(food.pulsePhase) * 0.2;
            const size = food.size * pulse;

            // Glow
            ctx.beginPath();
            ctx.arc(food.pos.x, food.pos.y, size * 3, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${food.hue}, 80%, 60%, 0.06)`;
            ctx.fill();

            // Core
            ctx.beginPath();
            ctx.arc(food.pos.x, food.pos.y, size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${food.hue}, 80%, 65%, 0.8)`;
            ctx.fill();

            // Bright center
            ctx.beginPath();
            ctx.arc(food.pos.x, food.pos.y, size * 0.4, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${food.hue}, 60%, 85%, 0.9)`;
            ctx.fill();
        }
    }

    /**
     * Draw all creatures
     */
    drawCreatures(creatures) {
        const ctx = this.ctx;

        for (const creature of creatures) {
            if (!creature.alive) continue;
            this._drawCreature(ctx, creature);
        }
    }

    /**
     * Draw a single creature with bioluminescent aesthetic
     */
    _drawCreature(ctx, c) {
        const { traits, pos } = c;
        const glowPulse = 0.5 + Math.sin(c.glowPhase) * 0.3;
        const pulse = 1 + Math.sin(c.pulsePhase) * 0.05;
        const size = traits.size * pulse;

        // Eating animation
        const eatScale = c.eatTimer > 0 ? 1 + Math.sin(c.eatTimer * 0.5) * 0.15 : 1;
        const finalSize = size * eatScale;

        // --- Trail ---
        if (c.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(c.trail[0].x, c.trail[0].y);
            for (let i = 1; i < c.trail.length; i++) {
                ctx.lineTo(c.trail[i].x, c.trail[i].y);
            }
            ctx.strokeStyle = c.getGlowColor(0.15);
            ctx.lineWidth = finalSize * 0.5;
            ctx.lineCap = 'round';
            ctx.stroke();
        }

        // --- Outer glow ---
        const glowSize = finalSize * (2.5 + glowPulse);
        const glowGrad = ctx.createRadialGradient(
            pos.x, pos.y, finalSize * 0.5,
            pos.x, pos.y, glowSize
        );
        glowGrad.addColorStop(0, c.getGlowColor(CONFIG.VISUALS.GLOW_INTENSITY * glowPulse));
        glowGrad.addColorStop(1, c.getGlowColor(0));
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, glowSize, 0, Math.PI * 2);
        ctx.fillStyle = glowGrad;
        ctx.fill();

        // --- Body ---
        ctx.save();
        ctx.translate(pos.x, pos.y);

        // Rotate towards velocity direction
        const angle = Math.atan2(c.vel.y, c.vel.x);
        ctx.rotate(angle);

        // Body shape based on DNA
        const roundness = traits.bodyShape;
        const bodyW = finalSize * (1.2 + (1 - roundness) * 0.8); // elongated if low roundness
        const bodyH = finalSize * (0.7 + roundness * 0.5);

        ctx.beginPath();
        ctx.ellipse(0, 0, bodyW, bodyH, 0, 0, Math.PI * 2);
        ctx.fillStyle = c.getColor(0.85);
        ctx.fill();

        // Inner highlight
        ctx.beginPath();
        ctx.ellipse(-bodyW * 0.15, -bodyH * 0.15, bodyW * 0.5, bodyH * 0.4, 0, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${traits.hue}, ${traits.saturation}%, 80%, 0.3)`;
        ctx.fill();

        // --- Eye(s) ---
        const eyeX = bodyW * 0.5;
        const eyeSize = Math.max(1.5, finalSize * 0.15);

        // Upper eye
        ctx.beginPath();
        ctx.arc(eyeX, -bodyH * 0.2, eyeSize, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eyeX + eyeSize * 0.2, -bodyH * 0.2, eyeSize * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#111';
        ctx.fill();

        // Carnivore indicator: second eye or fang
        if (traits.diet > 0.5) {
            ctx.beginPath();
            ctx.arc(eyeX, bodyH * 0.2, eyeSize, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 200, 200, 0.9)';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(eyeX + eyeSize * 0.2, bodyH * 0.2, eyeSize * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = '#300';
            ctx.fill();
        }

        ctx.restore();

        // --- State indicator (subtle) ---
        if (c.state === STATES.SEEK_MATE) {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y - finalSize - 5, 2, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(330, 80%, 70%, ${0.5 + glowPulse * 0.5})`;
            ctx.fill();
        }

        // --- Energy bar (only if selected or low energy) ---
        if (c.energy < CONFIG.CREATURE.INITIAL_ENERGY * 0.3) {
            const barW = finalSize * 2;
            const barH = 2;
            const barX = pos.x - barW / 2;
            const barY = pos.y + finalSize + 4;
            const fillW = barW * (c.energy / CONFIG.CREATURE.MAX_ENERGY);

            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(barX, barY, barW, barH);

            const energyHue = c.energy > 30 ? 120 : 0;
            ctx.fillStyle = `hsla(${energyHue}, 80%, 55%, 0.8)`;
            ctx.fillRect(barX, barY, fillW, barH);
        }
    }

    /**
     * Draw selection ring around a creature
     */
    drawSelection(creature) {
        if (!creature || !creature.alive) return;
        const ctx = this.ctx;
        const size = creature.traits.size + 8;

        ctx.beginPath();
        ctx.arc(creature.pos.x, creature.pos.y, size, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${creature.traits.hue}, 80%, 70%, 0.6)`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}
