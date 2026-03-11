// ============================================
// TERRARIUM — Particle System
// Ambient particles and creature effects
// ============================================

export class ParticleSystem {
    constructor() {
        this.particles = [];
        this.ambientParticles = [];
    }

    /**
     * Initialize ambient floating particles
     */
    initAmbient(canvasW, canvasH, count = 50) {
        this.ambientParticles = [];
        for (let i = 0; i < count; i++) {
            this.ambientParticles.push({
                x: Math.random() * canvasW,
                y: Math.random() * canvasH,
                size: 0.5 + Math.random() * 2,
                speedX: (Math.random() - 0.5) * 0.2,
                speedY: -0.1 - Math.random() * 0.3,
                opacity: 0.1 + Math.random() * 0.3,
                phase: Math.random() * Math.PI * 2,
                hue: 180 + Math.random() * 60,
            });
        }
    }

    /**
     * Add burst particles (birth/death/eat events)
     */
    addBurst(x, y, count, hue, type = 'birth') {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
            const speed = 0.5 + Math.random() * 2;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 1 + Math.random() * 3,
                life: 1.0,
                decay: 0.01 + Math.random() * 0.02,
                hue,
                type,
            });
        }
    }

    /**
     * Update all particles
     */
    update(canvasW, canvasH, dt = 1) {
        // Update ambient particles
        for (const p of this.ambientParticles) {
            p.x += p.speedX * dt;
            p.y += p.speedY * dt;
            p.phase += 0.02 * dt;
            p.opacity = 0.1 + Math.sin(p.phase) * 0.15;

            // Wrap
            if (p.y < -10) p.y = canvasH + 10;
            if (p.x < -10) p.x = canvasW + 10;
            if (p.x > canvasW + 10) p.x = -10;
        }

        // Update burst particles
        for (const p of this.particles) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.98;
            p.vy *= 0.98;
            p.life -= p.decay * dt;
            p.size *= 0.99;
        }

        // Remove dead particles
        this.particles = this.particles.filter(p => p.life > 0);
    }

    /**
     * Draw all particles
     */
    draw(ctx) {
        // Ambient particles
        for (const p of this.ambientParticles) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.opacity})`;
            ctx.fill();
        }

        // Burst particles
        for (const p of this.particles) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, 80%, 65%, ${p.life * 0.8})`;
            ctx.fill();
        }
    }
}
