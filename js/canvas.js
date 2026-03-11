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
     * Draw all food sources (plants + meat chunks)
     */
    drawFood(foodList) {
        const ctx = this.ctx;

        for (const food of foodList) {
            if (!food.alive) continue;

            const pulse = 1 + Math.sin(food.pulsePhase) * 0.2;
            const size = food.size * pulse;

            if (food.isMeat) {
                // ★ MEAT CHUNK — irregular red/pink shape
                const fadeAlpha = food.decayTimer > 100 ? 1 : food.decayTimer / 100;

                // Red glow
                ctx.beginPath();
                ctx.arc(food.pos.x, food.pos.y, size * 2.5, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${food.hue}, 70%, 40%, ${0.06 * fadeAlpha})`;
                ctx.fill();

                // Irregular meat shape
                ctx.beginPath();
                const sides = 5;
                for (let i = 0; i < sides; i++) {
                    const angle = (i / sides) * Math.PI * 2 + food.pulsePhase * 0.3;
                    const r = size * (0.7 + Math.sin(angle * 3) * 0.3);
                    const px = food.pos.x + Math.cos(angle) * r;
                    const py = food.pos.y + Math.sin(angle) * r;
                    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fillStyle = `hsla(${food.hue}, 65%, 45%, ${0.85 * fadeAlpha})`;
                ctx.fill();

                // Bright center
                ctx.beginPath();
                ctx.arc(food.pos.x, food.pos.y, size * 0.3, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${food.hue}, 50%, 70%, ${0.7 * fadeAlpha})`;
                ctx.fill();
            } else {
                // PLANT FOOD — round green
                ctx.beginPath();
                ctx.arc(food.pos.x, food.pos.y, size * 3, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${food.hue}, 80%, 60%, 0.06)`;
                ctx.fill();

                ctx.beginPath();
                ctx.arc(food.pos.x, food.pos.y, size, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${food.hue}, 80%, 65%, 0.8)`;
                ctx.fill();

                ctx.beginPath();
                ctx.arc(food.pos.x, food.pos.y, size * 0.4, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${food.hue}, 60%, 85%, 0.9)`;
                ctx.fill();
            }
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
        // ★ Hit flash — flash red when taking damage
        if (c.hitFlash > 0) {
            ctx.fillStyle = `hsla(0, 90%, 60%, ${0.5 + c.hitFlash * 0.05})`;
        } else {
            ctx.fillStyle = c.getColor(0.85);
        }
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
        } else if (c.state === STATES.CRITICAL_HUNGER) {
            // Flashing red warning
            ctx.beginPath();
            ctx.arc(pos.x, pos.y - finalSize - 5, 3, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(0, 90%, 60%, ${0.5 + glowPulse * 0.5})`;
            ctx.fill();
        } else if (c.state === STATES.HUNT) {
            // Red crosshair
            ctx.beginPath();
            ctx.arc(pos.x, pos.y - finalSize - 5, 2, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(10, 90%, 55%, ${0.6 + glowPulse * 0.4})`;
            ctx.fill();
        } else if (c.state === STATES.DIGESTING) {
            // Green dot (satisfied)
            ctx.beginPath();
            ctx.arc(pos.x, pos.y - finalSize - 5, 2, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(120, 70%, 55%, ${0.5 + glowPulse * 0.3})`;
            ctx.fill();
        }

        // --- HP bar (show when damaged) + Energy bar (show when low) ---
        const hpPct = c.getHpPercent();
        const barW = finalSize * 2.5;
        const barH = 2;
        const barX = pos.x - barW / 2;

        if (hpPct < 1) {
            // HP bar (red)
            const hpY = pos.y + finalSize + 3;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(barX, hpY, barW, barH);
            const hpHue = hpPct > 0.5 ? 120 : (hpPct > 0.25 ? 40 : 0);
            ctx.fillStyle = `hsla(${hpHue}, 80%, 55%, 0.9)`;
            ctx.fillRect(barX, hpY, barW * hpPct, barH);
        }

        if (c.energy < CONFIG.CREATURE.MAX_ENERGY * 0.3) {
            // Energy bar (cyan, below HP)
            const enY = pos.y + finalSize + (hpPct < 1 ? 7 : 3);
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(barX, enY, barW, barH);
            ctx.fillStyle = `hsla(190, 80%, 55%, 0.7)`;
            ctx.fillRect(barX, enY, barW * c.getEnergyPercent(), barH);
        }
    }

    /**
     * Draw environmental hazard zones
     */
    drawHazards(hazards) {
        const ctx = this.ctx;
        for (const h of hazards) {
            if (!h.alive) continue;
            const fadeAlpha = Math.min(1, h.duration / (h.maxDuration * 0.2)); // fade near end

            if (h.type === 'toxic') {
                // Pulsing red/purple danger zone
                const pulse = 1 + Math.sin(Date.now() * 0.005) * 0.1;
                const r = h.radius * pulse;

                const grad = ctx.createRadialGradient(h.pos.x, h.pos.y, 0, h.pos.x, h.pos.y, r);
                grad.addColorStop(0, `rgba(255, 50, 50, ${0.12 * fadeAlpha})`);
                grad.addColorStop(0.6, `rgba(180, 30, 80, ${0.06 * fadeAlpha})`);
                grad.addColorStop(1, `rgba(100, 0, 60, 0)`);
                ctx.beginPath();
                ctx.arc(h.pos.x, h.pos.y, r, 0, Math.PI * 2);
                ctx.fillStyle = grad;
                ctx.fill();

                // Border ring
                ctx.beginPath();
                ctx.arc(h.pos.x, h.pos.y, h.radius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 50, 70, ${0.3 * fadeAlpha})`;
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.stroke();
                ctx.setLineDash([]);

            } else if (h.type === 'current') {
                // Flowing cyan arrows
                const grad = ctx.createRadialGradient(h.pos.x, h.pos.y, 0, h.pos.x, h.pos.y, 120);
                grad.addColorStop(0, `rgba(0, 180, 255, ${0.08 * fadeAlpha})`);
                grad.addColorStop(1, `rgba(0, 120, 200, 0)`);
                ctx.beginPath();
                ctx.arc(h.pos.x, h.pos.y, 120, 0, Math.PI * 2);
                ctx.fillStyle = grad;
                ctx.fill();

                // Direction indicator
                const arrowLen = 25;
                const ax = h.pos.x + h.direction.x * arrowLen;
                const ay = h.pos.y + h.direction.y * arrowLen;
                ctx.beginPath();
                ctx.moveTo(h.pos.x, h.pos.y);
                ctx.lineTo(ax, ay);
                ctx.strokeStyle = `rgba(0, 229, 255, ${0.4 * fadeAlpha})`;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
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
