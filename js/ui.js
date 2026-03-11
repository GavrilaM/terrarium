// ============================================
// TERRARIUM — UI Manager
// Dashboard, controls, event log, eras, fullness
// ============================================

import { CONFIG } from './config.js';

export class UIManager {
    constructor(ecosystem) {
        this.ecosystem = ecosystem;
        this.selectedCreature = null;

        // Cache DOM elements
        this.els = {
            populationCount: document.getElementById('population-count'),
            generationCount: document.getElementById('generation-count'),
            speciesCount: document.getElementById('species-count'),
            fpsCount: document.getElementById('fps-count'),
            eraEmoji: document.getElementById('era-emoji'),
            eraName: document.getElementById('era-name'),
            eraBadge: document.getElementById('era-badge'),
            activeEventBanner: document.getElementById('active-event-banner'),
            speciesList: document.getElementById('species-list'),
            eventLog: document.getElementById('event-log'),
            speedSlider: document.getElementById('speed-slider'),
            speedValue: document.getElementById('speed-value'),
            creatureInfo: document.getElementById('creature-info'),
            creatureName: document.getElementById('creature-name'),
            creatureSpecies: document.getElementById('creature-species'),
            creatureState: document.getElementById('creature-state'),
            creatureGen: document.getElementById('creature-gen'),
            creatureEnergyBar: document.getElementById('creature-energy-bar'),
            creatureFullnessBar: document.getElementById('creature-fullness-bar'),
            creatureDiet: document.getElementById('creature-diet'),
            creatureAge: document.getElementById('creature-age'),
            creatureChildren: document.getElementById('creature-children'),
            creatureDnaVis: document.getElementById('creature-dna-vis'),
            toastContainer: document.getElementById('toast-container'),
        };

        this._lastEventCount = 0;
        this._lastEraId = null;
        this._setupListeners();
    }

    _setupListeners() {
        document.getElementById('close-creature-info')?.addEventListener('click', () => {
            this.deselectCreature();
        });

        this.els.speedSlider?.addEventListener('input', (e) => {
            this.els.speedValue.textContent = parseFloat(e.target.value) + 'x';
        });
    }

    update(fps) {
        const stats = this.ecosystem.getStats();

        // Stats
        this.els.populationCount.textContent = stats.population;
        this.els.generationCount.textContent = stats.maxGeneration;
        this.els.speciesCount.textContent = stats.speciesCount;
        this.els.fpsCount.textContent = fps;

        // Era
        if (stats.currentEra && stats.currentEra.id !== this._lastEraId) {
            this._lastEraId = stats.currentEra.id;
            this.els.eraEmoji.textContent = stats.currentEra.emoji;
            this.els.eraName.textContent = stats.currentEra.name;
            this.els.eraBadge?.classList.remove('era-transition');
            void this.els.eraBadge?.offsetWidth;
            this.els.eraBadge?.classList.add('era-transition');
        }

        // Active environmental event banner
        if (this.els.activeEventBanner) {
            if (stats.activeEvent) {
                this.els.activeEventBanner.textContent = stats.activeEvent.message;
                this.els.activeEventBanner.className = `active-event-banner event-${stats.activeEvent.type}`;
                this.els.activeEventBanner.style.display = 'block';
            } else {
                this.els.activeEventBanner.style.display = 'none';
            }
        }

        this._updateSpeciesList(stats.speciesList);
        this._updateEventLog();

        if (this.selectedCreature) this._updateCreatureInfo();
    }

    _updateSpeciesList(speciesList) {
        const c = this.els.speciesList;
        if (!c) return;
        if (this._lastSpeciesCount === speciesList.length && Math.random() > 0.05) return;
        this._lastSpeciesCount = speciesList.length;

        c.innerHTML = '';
        for (const sp of speciesList.slice(0, 10)) {
            const item = document.createElement('div');
            item.className = 'species-item';
            item.innerHTML = `
                <span class="species-emoji">${sp.emoji || '🧬'}</span>
                <span class="species-color" style="color: hsl(${sp.hue}, ${sp.saturation}%, 65%); background: hsl(${sp.hue}, ${sp.saturation}%, 65%)"></span>
                <span class="species-name">${sp.name}</span>
                <span class="species-count">${sp.count}</span>
            `;
            c.appendChild(item);
        }
        if (speciesList.length === 0) {
            c.innerHTML = '<div class="species-item"><span class="species-name" style="color: var(--text-muted)">No species yet</span></div>';
        }
    }

    _updateEventLog() {
        const c = this.els.eventLog;
        if (!c) return;
        const events = this.ecosystem.events;
        if (events.length === this._lastEventCount) return;
        this._lastEventCount = events.length;

        c.innerHTML = '';
        for (const event of events.slice(0, 20)) {
            const item = document.createElement('div');
            item.className = `event-item event-${event.type}`;
            item.textContent = event.message;
            c.appendChild(item);
        }
    }

    selectCreature(creature) {
        this.selectedCreature = creature;
        this.els.creatureInfo.classList.remove('hidden');
        this._updateCreatureInfo();
    }

    deselectCreature() {
        this.selectedCreature = null;
        this.els.creatureInfo.classList.add('hidden');
    }

    _updateCreatureInfo() {
        const c = this.selectedCreature;
        if (!c || !c.alive) { this.deselectCreature(); return; }

        const { CREATURE } = CONFIG;
        const emoji = c.speciesType?.emoji || '🧬';

        this.els.creatureName.textContent = `${emoji} ${c.speciesName} #${c.id}`;
        this.els.creatureSpecies.textContent = `${c.speciesName} (${c.speciesType?.diet || 'unknown'})`;
        this.els.creatureState.textContent = this._formatState(c.state);
        this.els.creatureGen.textContent = c.generation;

        // ★ Energy bar — use CONFIG value, not hardcoded
        const energyPercent = Math.max(0, c.energy / CREATURE.MAX_ENERGY);
        this.els.creatureEnergyBar.style.width = (energyPercent * 100) + '%';
        if (energyPercent < 0.3) {
            this.els.creatureEnergyBar.style.background = 'linear-gradient(90deg, #ff4444, #ff6666)';
        } else if (energyPercent < 0.6) {
            this.els.creatureEnergyBar.style.background = 'linear-gradient(90deg, #ffaa00, #ffcc44)';
        } else {
            this.els.creatureEnergyBar.style.background = 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))';
        }

        // ★ Fullness bar
        if (this.els.creatureFullnessBar) {
            const fullPercent = Math.max(0, c.fullness / CREATURE.FULLNESS_MAX);
            this.els.creatureFullnessBar.style.width = (fullPercent * 100) + '%';
            if (fullPercent > 0.7) {
                this.els.creatureFullnessBar.style.background = 'linear-gradient(90deg, #69f0ae, #00e5ff)';
            } else if (fullPercent > 0.3) {
                this.els.creatureFullnessBar.style.background = 'linear-gradient(90deg, #ffaa00, #ffcc44)';
            } else {
                this.els.creatureFullnessBar.style.background = 'linear-gradient(90deg, #ff4444, #ff6666)';
            }
        }

        this.els.creatureDiet.textContent = c.getDietLabel();
        this.els.creatureAge.textContent = Math.floor(c.age / 60) + 's';
        this.els.creatureChildren.textContent = c.children;

        this._drawDNA(c);
    }

    _formatState(state) {
        const labels = {
            'wander': '🚶 Wandering',
            'seek_food': '🍽️ Seeking Food',
            'seek_mate': '💕 Seeking Mate',
            'flee': '🏃 Fleeing!',
            'flock': '👥 Flocking',
            'hunt': '🎯 Hunting',
            'explore': '🔍 Exploring',
            'critical_hunger': '⚠️ STARVING!',
            'digesting': '😋 Digesting',
        };
        return labels[state] || state;
    }

    _drawDNA(creature) {
        const canvas = this.els.creatureDnaVis;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        const geneW = w / creature.dna.length;
        for (let i = 0; i < creature.dna.length; i++) {
            const val = creature.dna[i];
            ctx.fillStyle = `hsla(${(val * 360) % 360}, 70%, 55%, 0.8)`;
            ctx.fillRect(i * geneW + 1, h - val * (h - 4) - 2, geneW - 2, val * (h - 4));
        }
    }

    getSpeed() {
        return parseFloat(this.els.speedSlider?.value || 1);
    }

    showToast(message, type = '') {
        const toast = document.createElement('div');
        toast.className = `toast ${type ? 'toast-' + type : ''}`;
        toast.textContent = message;
        this.els.toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
}
