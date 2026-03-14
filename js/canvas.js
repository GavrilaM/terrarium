// ============================================
// TERRARIUM — Canvas Renderer
// Organic creatures, food, hazards, minimap
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
     * Clear (screen space — before camera)
     */
    clear() {
        const ctx = this.ctx;
        const grad = ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, CONFIG.CANVAS.BG_GRADIENT_TOP);
        grad.addColorStop(1, CONFIG.CANVAS.BG_GRADIENT_BOTTOM);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);
    }

    /**
     * Draw world boundary — terrarium glass edge
     */
    drawWorldBorder() {
        const ctx = this.ctx;
        const w = CONFIG.WORLD.WIDTH;
        const h = CONFIG.WORLD.HEIGHT;

        // Substrate floor
        ctx.fillStyle = 'rgba(4, 16, 36, 0.25)';
        ctx.fillRect(0, 0, w, h);

        // Background grid dots — sense of scale
        ctx.fillStyle = 'rgba(60, 130, 200, 0.04)';
        const spacing = 50;
        for (let gx = spacing; gx < w; gx += spacing) {
            for (let gy = spacing; gy < h; gy += spacing) {
                ctx.beginPath();
                ctx.arc(gx, gy, 1, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Glowing border
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.12)';
        ctx.lineWidth = 3;
        ctx.strokeRect(8, 8, w - 16, h - 16);

        // Outer edge shadow (vignette at edges)
        const edgeW = 60;
        // Top
        let grad = ctx.createLinearGradient(0, 0, 0, edgeW);
        grad.addColorStop(0, 'rgba(2, 10, 24, 0.6)');
        grad.addColorStop(1, 'rgba(2, 10, 24, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, edgeW);
        // Bottom
        grad = ctx.createLinearGradient(0, h, 0, h - edgeW);
        grad.addColorStop(0, 'rgba(2, 10, 24, 0.6)');
        grad.addColorStop(1, 'rgba(2, 10, 24, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, h - edgeW, w, edgeW);
        // Left
        grad = ctx.createLinearGradient(0, 0, edgeW, 0);
        grad.addColorStop(0, 'rgba(2, 10, 24, 0.6)');
        grad.addColorStop(1, 'rgba(2, 10, 24, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, edgeW, h);
        // Right
        grad = ctx.createLinearGradient(w, 0, w - edgeW, 0);
        grad.addColorStop(0, 'rgba(2, 10, 24, 0.6)');
        grad.addColorStop(1, 'rgba(2, 10, 24, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(w - edgeW, 0, edgeW, h);
    }

    // ========================================
    // FOOD
    // ========================================

    drawFood(foodList) {
        const ctx = this.ctx;
        for (const food of foodList) {
            if (!food.alive) continue;
            const pulse = 1 + Math.sin(food.pulsePhase) * 0.2;
            const size = food.size * pulse;

            if (food.isMeat) {
                const fadeAlpha = food.decayTimer > 100 ? 1 : food.decayTimer / 100;
                // Glow
                ctx.beginPath();
                ctx.arc(food.pos.x, food.pos.y, size * 2.5, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${food.hue}, 70%, 40%, ${0.06 * fadeAlpha})`;
                ctx.fill();
                // Irregular meat
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const angle = (i / 5) * Math.PI * 2 + food.pulsePhase * 0.3;
                    const r = size * (0.7 + Math.sin(angle * 3) * 0.3);
                    const px = food.pos.x + Math.cos(angle) * r;
                    const py = food.pos.y + Math.sin(angle) * r;
                    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fillStyle = `hsla(${food.hue}, 65%, 45%, ${0.85 * fadeAlpha})`;
                ctx.fill();
            } else {
                // Plant food — organic blob
                ctx.beginPath();
                ctx.arc(food.pos.x, food.pos.y, size * 2.5, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${food.hue}, 80%, 60%, 0.05)`;
                ctx.fill();

                // Main body with slight irregularity
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2;
                    const r = size * (0.85 + Math.sin(food.pulsePhase + i * 1.2) * 0.15);
                    const px = food.pos.x + Math.cos(angle) * r;
                    const py = food.pos.y + Math.sin(angle) * r;
                    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fillStyle = `hsla(${food.hue}, 80%, 60%, 0.75)`;
                ctx.fill();

                // Bright nucleus
                ctx.beginPath();
                ctx.arc(food.pos.x, food.pos.y, size * 0.35, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${food.hue}, 60%, 85%, 0.9)`;
                ctx.fill();
            }
        }
    }

    // ========================================
    // CREATURES — ORGANIC AMOEBA SHAPES
    // ========================================

    drawCreatures(creatures) {
        for (const c of creatures) {
            if (!c.alive) continue;
            this._drawCreature(this.ctx, c);
        }
    }

    /**
     * Draw single creature — organic blobby amoeba shape
     */
    _drawCreature(ctx, c) {
        const { traits, pos } = c;
        const glowPulse = 0.5 + Math.sin(c.glowPhase) * 0.3;
        const pulse = 1 + Math.sin(c.pulsePhase) * 0.05;
        const size = traits.size * pulse;
        const eatScale = c.eatTimer > 0 ? 1 + Math.sin(c.eatTimer * 0.5) * 0.15 : 1;
        const finalSize = size * eatScale;
        const angle = Math.atan2(c.vel.y, c.vel.x);

        // --- Gradient Trail ---
        if (c.trail.length > 2) {
            for (let i = 1; i < c.trail.length; i++) {
                const alpha = (i / c.trail.length) * 0.2;
                const w = (i / c.trail.length) * finalSize * 0.6;
                ctx.beginPath();
                ctx.arc(c.trail[i].x, c.trail[i].y, w, 0, Math.PI * 2);
                ctx.fillStyle = c.getGlowColor(alpha);
                ctx.fill();
            }
        }

        // --- Outer glow ---
        const glowSize = finalSize * (2.2 + glowPulse * 0.5);
        const glowGrad = ctx.createRadialGradient(
            pos.x, pos.y, finalSize * 0.3,
            pos.x, pos.y, glowSize
        );
        glowGrad.addColorStop(0, c.getGlowColor(CONFIG.VISUALS.GLOW_INTENSITY * glowPulse * 0.6));
        glowGrad.addColorStop(1, c.getGlowColor(0));
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, glowSize, 0, Math.PI * 2);
        ctx.fillStyle = glowGrad;
        ctx.fill();

        // --- Organic Body (amoeba blob with bezier curves) ---
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(angle);

        const roundness = traits.bodyShape;
        const bodyW = finalSize * (1.1 + (1 - roundness) * 0.6);
        const bodyH = finalSize * (0.6 + roundness * 0.5);
        const blobPoints = 8;

        // Generate blob control points
        ctx.beginPath();
        for (let i = 0; i <= blobPoints; i++) {
            const t = (i / blobPoints) * Math.PI * 2;
            const wobble = Math.sin(c.glowPhase * 2 + i * 1.5) * 0.12;
            const rX = bodyW * (1 + wobble);
            const rY = bodyH * (1 + wobble * 0.8);
            const px = Math.cos(t) * rX;
            const py = Math.sin(t) * rY;

            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                // Smooth with quadratic curves
                const prevT = ((i - 1) / blobPoints) * Math.PI * 2;
                const prevWobble = Math.sin(c.glowPhase * 2 + (i - 1) * 1.5) * 0.12;
                const cpX = Math.cos((prevT + t) / 2) * bodyW * (1.08 + prevWobble);
                const cpY = Math.sin((prevT + t) / 2) * bodyH * (1.08 + prevWobble * 0.8);
                ctx.quadraticCurveTo(cpX, cpY, px, py);
            }
        }
        ctx.closePath();

        // Fill — hit flash or normal
        if (c.hitFlash > 0) {
            ctx.fillStyle = `hsla(0, 90%, 60%, ${0.5 + c.hitFlash * 0.05})`;
        } else {
            // Gradient fill for depth
            const bodyGrad = ctx.createRadialGradient(-bodyW * 0.2, -bodyH * 0.2, 0, 0, 0, bodyW);
            bodyGrad.addColorStop(0, `hsla(${traits.hue}, ${traits.saturation}%, 75%, 0.9)`);
            bodyGrad.addColorStop(1, `hsla(${traits.hue}, ${traits.saturation}%, 45%, 0.7)`);
            ctx.fillStyle = bodyGrad;
        }
        ctx.fill();

        // Membrane glow edge
        ctx.strokeStyle = `hsla(${traits.hue}, ${traits.saturation}%, 70%, 0.25)`;
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // --- Inner organelles (nucleus + spots) ---
        // Nucleus
        const nucX = -bodyW * 0.1;
        const nucY = -bodyH * 0.1;
        const nucR = finalSize * 0.25;
        ctx.beginPath();
        ctx.arc(nucX, nucY, nucR, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${traits.hue}, ${traits.saturation + 10}%, 80%, 0.35)`;
        ctx.fill();

        // Organelle spots
        const spotCount = Math.max(2, Math.floor(traits.diet * 4));
        for (let s = 0; s < spotCount; s++) {
            const sa = (s / spotCount) * Math.PI * 2 + c.glowPhase * 0.5;
            const sr = finalSize * 0.3;
            const sx = Math.cos(sa) * sr;
            const sy = Math.sin(sa) * sr * (bodyH / bodyW);
            const spotR = finalSize * 0.06;
            ctx.beginPath();
            ctx.arc(sx, sy, spotR, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${(traits.hue + 30) % 360}, 60%, 70%, 0.3)`;
            ctx.fill();
        }

        // --- Eye(s) ---
        const eyeX = bodyW * 0.5;
        const eyeSize = Math.max(1.5, finalSize * 0.14);

        // Primary eye
        ctx.beginPath();
        ctx.arc(eyeX, -bodyH * 0.15, eyeSize, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eyeX + eyeSize * 0.25, -bodyH * 0.15, eyeSize * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = '#111';
        ctx.fill();

        // Predator: second eye
        if (traits.diet > 0.5) {
            ctx.beginPath();
            ctx.arc(eyeX, bodyH * 0.15, eyeSize * 0.9, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 200, 200, 0.85)';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(eyeX + eyeSize * 0.2, bodyH * 0.15, eyeSize * 0.4, 0, Math.PI * 2);
            ctx.fillStyle = '#200';
            ctx.fill();
        }

        // Pseudopod / flagellum for movement feel
        if (c.effectiveSpeed > 0.5) {
            const tailLen = finalSize * 0.6;
            const tailWave = Math.sin(c.glowPhase * 4) * 3;
            ctx.beginPath();
            ctx.moveTo(-bodyW, 0);
            ctx.quadraticCurveTo(-bodyW - tailLen * 0.5, tailWave, -bodyW - tailLen, tailWave * 1.5);
            ctx.strokeStyle = `hsla(${traits.hue}, ${traits.saturation}%, 65%, 0.3)`;
            ctx.lineWidth = Math.max(0.5, finalSize * 0.08);
            ctx.lineCap = 'round';
            ctx.stroke();
        }

        ctx.restore();

        // --- State indicator ---
        this._drawStateIndicator(ctx, c, pos, finalSize, glowPulse);

        // --- HP + Energy bars ---
        this._drawBars(ctx, c, pos, finalSize);
    }

    _drawStateIndicator(ctx, c, pos, size, pulse) {
        const y = pos.y - size - 6;
        let color = null, r = 2;

        switch (c.state) {
            case STATES.SEEK_MATE:
                color = `hsla(330, 80%, 70%, ${0.5 + pulse * 0.5})`; break;
            case STATES.CRITICAL_HUNGER:
                color = `hsla(0, 90%, 60%, ${0.5 + pulse * 0.5})`; r = 3; break;
            case STATES.HUNT:
                color = `hsla(10, 90%, 55%, ${0.6 + pulse * 0.4})`; break;
            case STATES.FIGHT:
                color = `hsla(0, 100%, 50%, ${0.7 + pulse * 0.3})`; r = 3; break;
            case STATES.DIGESTING:
                color = `hsla(120, 70%, 55%, ${0.5 + pulse * 0.3})`; break;
            case STATES.SCAVENGE:
                color = `hsla(30, 80%, 55%, ${0.5 + pulse * 0.3})`; break;
        }

        if (color) {
            ctx.beginPath();
            ctx.arc(pos.x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
        }
    }

    _drawBars(ctx, c, pos, size) {
        const hpPct = c.getHpPercent();
        const barW = size * 2.5;
        const barH = 2;
        const barX = pos.x - barW / 2;

        if (hpPct < 1) {
            const hpY = pos.y + size + 3;
            // Background
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(barX, hpY, barW, barH);
            // HP fill with rounded look
            const hpHue = hpPct > 0.5 ? 120 : (hpPct > 0.25 ? 40 : 0);
            ctx.fillStyle = `hsla(${hpHue}, 80%, 55%, 0.9)`;
            ctx.fillRect(barX, hpY, barW * hpPct, barH);
        }

        if (c.energy < CONFIG.CREATURE.MAX_ENERGY * 0.3) {
            const enY = pos.y + size + (hpPct < 1 ? 7 : 3);
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(barX, enY, barW, barH);
            ctx.fillStyle = `hsla(190, 80%, 55%, 0.7)`;
            ctx.fillRect(barX, enY, barW * c.getEnergyPercent(), barH);
        }
    }

    // ========================================
    // HAZARDS
    // ========================================

    drawHazards(hazards) {
        const ctx = this.ctx;
        for (const h of hazards) {
            if (!h.alive) continue;
            const fadeAlpha = Math.min(1, h.duration / (h.maxDuration * 0.2));

            if (h.type === 'toxic') {
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
                ctx.beginPath();
                ctx.arc(h.pos.x, h.pos.y, h.radius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 50, 70, ${0.3 * fadeAlpha})`;
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.stroke();
                ctx.setLineDash([]);
            } else if (h.type === 'current') {
                const grad = ctx.createRadialGradient(h.pos.x, h.pos.y, 0, h.pos.x, h.pos.y, 120);
                grad.addColorStop(0, `rgba(0, 180, 255, ${0.08 * fadeAlpha})`);
                grad.addColorStop(1, `rgba(0, 120, 200, 0)`);
                ctx.beginPath();
                ctx.arc(h.pos.x, h.pos.y, 120, 0, Math.PI * 2);
                ctx.fillStyle = grad;
                ctx.fill();
                // Arrow
                const al = 25, ax = h.pos.x + h.direction.x * al, ay = h.pos.y + h.direction.y * al;
                ctx.beginPath();
                ctx.moveTo(h.pos.x, h.pos.y);
                ctx.lineTo(ax, ay);
                ctx.strokeStyle = `rgba(0, 229, 255, ${0.4 * fadeAlpha})`;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
    }

    // ========================================
    // SELECTION
    // ========================================

    drawSelection(creature) {
        if (!creature || !creature.alive) return;
        const ctx = this.ctx;
        const size = creature.traits.size + 10;

        // Animated dashed ring
        const dashOffset = (Date.now() * 0.03) % 16;
        ctx.beginPath();
        ctx.arc(creature.pos.x, creature.pos.y, size, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${creature.traits.hue}, 80%, 70%, 0.5)`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.lineDashOffset = dashOffset;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;

        // Outer glow ring
        ctx.beginPath();
        ctx.arc(creature.pos.x, creature.pos.y, size + 3, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${creature.traits.hue}, 80%, 70%, 0.1)`;
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    // ========================================
    // MINIMAP
    // ========================================

    drawMinimap(creatures, food, camera, hazards) {
        const ctx = this.ctx;
        const ww = CONFIG.WORLD.WIDTH;
        const wh = CONFIG.WORLD.HEIGHT;

        // Minimap dimensions
        const mmW = 180;
        const mmH = (wh / ww) * mmW;
        const mmX = this.width - mmW - 16;
        const mmY = this.height - mmH - 16;
        const scaleX = mmW / ww;
        const scaleY = mmH / wh;

        // Background
        ctx.fillStyle = 'rgba(2, 10, 24, 0.8)';
        ctx.fillRect(mmX - 1, mmY - 1, mmW + 2, mmH + 2);
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(mmX - 1, mmY - 1, mmW + 2, mmH + 2);

        ctx.fillStyle = 'rgba(6, 20, 40, 0.6)';
        ctx.fillRect(mmX, mmY, mmW, mmH);

        // Hazards on minimap
        if (hazards) {
            for (const h of hazards) {
                if (!h.alive) continue;
                const hx = mmX + h.pos.x * scaleX;
                const hy = mmY + h.pos.y * scaleY;
                const hr = h.radius * scaleX;
                ctx.beginPath();
                ctx.arc(hx, hy, Math.max(2, hr), 0, Math.PI * 2);
                ctx.fillStyle = h.type === 'toxic' ? 'rgba(255, 50, 50, 0.2)' : 'rgba(0, 180, 255, 0.2)';
                ctx.fill();
            }
        }

        // Food dots
        for (const f of food) {
            if (!f.alive) continue;
            const fx = mmX + f.pos.x * scaleX;
            const fy = mmY + f.pos.y * scaleY;
            ctx.fillStyle = f.isMeat ? 'rgba(255, 100, 100, 0.4)' : 'rgba(120, 220, 120, 0.3)';
            ctx.fillRect(fx, fy, 1, 1);
        }

        // Creature dots
        for (const c of creatures) {
            if (!c.alive) continue;
            const cx = mmX + c.pos.x * scaleX;
            const cy = mmY + c.pos.y * scaleY;
            const r = Math.max(1.5, c.traits.size * scaleX * 0.5);
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${c.traits.hue}, ${c.traits.saturation}%, 65%, 0.8)`;
            ctx.fill();
        }

        // Viewport rectangle
        const vbounds = camera.getVisibleBounds();
        const vx = mmX + Math.max(0, vbounds.left) * scaleX;
        const vy = mmY + Math.max(0, vbounds.top) * scaleY;
        const vw = Math.min(ww, vbounds.right - Math.max(0, vbounds.left)) * scaleX;
        const vh = Math.min(wh, vbounds.bottom - Math.max(0, vbounds.top)) * scaleY;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(vx, vy, vw, vh);

        // Label
        ctx.fillStyle = 'rgba(200, 220, 240, 0.35)';
        ctx.font = '9px Outfit, sans-serif';
        ctx.fillText('MINIMAP', mmX + 4, mmY + 10);
    }
}
