// ============================================
// TERRARIUM — UI Manager
// Dashboard stats, controls, event log
// ============================================

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
            speciesList: document.getElementById('species-list'),
            eventLog: document.getElementById('event-log'),
            speedSlider: document.getElementById('speed-slider'),
            speedValue: document.getElementById('speed-value'),
            creatureInfo: document.getElementById('creature-info'),
            creatureName: document.getElementById('creature-name'),
            creatureSpecies: document.getElementById('creature-species'),
            creatureGen: document.getElementById('creature-gen'),
            creatureEnergyBar: document.getElementById('creature-energy-bar'),
            creatureDiet: document.getElementById('creature-diet'),
            creatureAge: document.getElementById('creature-age'),
            creatureChildren: document.getElementById('creature-children'),
            creatureDnaVis: document.getElementById('creature-dna-vis'),
            toastContainer: document.getElementById('toast-container'),
        };

        this._lastEventCount = 0;
        this._setupListeners();
    }

    _setupListeners() {
        // Close creature info
        document.getElementById('close-creature-info')?.addEventListener('click', () => {
            this.deselectCreature();
        });

        // Speed slider
        this.els.speedSlider?.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            this.els.speedValue.textContent = val + 'x';
        });
    }

    /**
     * Update all UI elements — called each frame (throttled)
     */
    update(fps) {
        const stats = this.ecosystem.getStats();

        // Stats chips
        this.els.populationCount.textContent = stats.population;
        this.els.generationCount.textContent = stats.maxGeneration;
        this.els.speciesCount.textContent = stats.speciesCount;
        this.els.fpsCount.textContent = fps;

        // Species list
        this._updateSpeciesList(stats.speciesList);

        // Event log
        this._updateEventLog();

        // Selected creature info
        if (this.selectedCreature) {
            this._updateCreatureInfo();
        }
    }

    _updateSpeciesList(speciesList) {
        const container = this.els.speciesList;
        if (!container) return;

        // Only rebuild if changed
        if (this._lastSpeciesCount === speciesList.length && Math.random() > 0.05) return;
        this._lastSpeciesCount = speciesList.length;

        container.innerHTML = '';
        for (const species of speciesList.slice(0, 10)) {
            const item = document.createElement('div');
            item.className = 'species-item';
            item.innerHTML = `
                <span class="species-color" style="color: hsl(${species.hue}, ${species.saturation}%, 65%); background: hsl(${species.hue}, ${species.saturation}%, 65%)"></span>
                <span class="species-name">${species.name}</span>
                <span class="species-count">${species.count}</span>
            `;
            container.appendChild(item);
        }

        if (speciesList.length === 0) {
            container.innerHTML = '<div class="species-item"><span class="species-name" style="color: var(--text-muted)">No species yet</span></div>';
        }
    }

    _updateEventLog() {
        const container = this.els.eventLog;
        if (!container) return;

        const events = this.ecosystem.events;
        if (events.length === this._lastEventCount) return;
        this._lastEventCount = events.length;

        container.innerHTML = '';
        for (const event of events.slice(0, 15)) {
            const item = document.createElement('div');
            item.className = `event-item event-${event.type}`;

            let icon = '📋';
            if (event.type === 'birth') icon = '🧬';
            if (event.type === 'death') icon = '💀';
            if (event.type === 'evolution') icon = '⭐';
            if (event.type === 'extinction') icon = '☄️';
            if (event.type === 'system') icon = '🌱';

            item.innerHTML = `<span class="event-icon">${icon}</span> ${event.message}`;
            container.appendChild(item);
        }
    }

    /**
     * Select a creature to show its info
     */
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
        if (!c || !c.alive) {
            this.deselectCreature();
            return;
        }

        this.els.creatureName.textContent = `${c.speciesName} #${c.id}`;
        this.els.creatureSpecies.textContent = c.speciesName;
        this.els.creatureGen.textContent = c.generation;
        this.els.creatureEnergyBar.style.width = Math.max(0, (c.energy / 150) * 100) + '%';
        this.els.creatureDiet.textContent = c.getDietLabel();
        this.els.creatureAge.textContent = Math.floor(c.age / 60) + 's';
        this.els.creatureChildren.textContent = c.children;

        // DNA visualization
        this._drawDNA(c);
    }

    _drawDNA(creature) {
        const canvas = this.els.creatureDnaVis;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        const dna = creature.dna;
        const geneW = w / dna.length;

        for (let i = 0; i < dna.length; i++) {
            const val = dna[i];
            const hue = (val * 360) % 360;
            const barH = val * (h - 4);

            ctx.fillStyle = `hsla(${hue}, 70%, 55%, 0.8)`;
            ctx.fillRect(i * geneW + 1, h - barH - 2, geneW - 2, barH);
        }
    }

    /**
     * Get current speed multiplier
     */
    getSpeed() {
        return parseFloat(this.els.speedSlider?.value || 1);
    }

    /**
     * Show a toast notification
     */
    showToast(message, type = '') {
        const toast = document.createElement('div');
        toast.className = `toast ${type ? 'toast-' + type : ''}`;
        toast.textContent = message;
        this.els.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}
