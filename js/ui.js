// ============================================
// TERRARIUM — UI Manager
// Dashboard, controls, HP/Energy/Fullness bars
// ============================================

import { CONFIG } from './config.js';

export class UIManager {
    constructor(ecosystem) {
        this.ecosystem = ecosystem;
        this.selectedCreature = null;

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
            creatureHpBar: document.getElementById('creature-hp-bar'),
            creatureEnergyBar: document.getElementById('creature-energy-bar'),
            creatureFullnessBar: document.getElementById('creature-fullness-bar'),
            creatureDiet: document.getElementById('creature-diet'),
            creatureAge: document.getElementById('creature-age'),
            creatureChildren: document.getElementById('creature-children'),
            creatureTier: document.getElementById('creature-tier'),
            creatureMutations: document.getElementById('creature-mutations'),
            creatureDnaVis: document.getElementById('creature-dna-vis'),
            toastContainer: document.getElementById('toast-container'),
            gradModal: document.getElementById('graduation-modal'),
            gradSpeciesName: document.getElementById('grad-species-name'),
            btnContinueSandbox: document.getElementById('btn-continue-sandbox'),
        };

        this._lastEventCount = 0;
        this._lastEraId = null;
        this._graduationShown = false;
        this._setupListeners();
    }

    _setupListeners() {
        document.getElementById('close-creature-info')?.addEventListener('click', () => this.deselectCreature());
        this.els.speedSlider?.addEventListener('input', (e) => {
            this.els.speedValue.textContent = parseFloat(e.target.value) + 'x';
        });

        this.els.btnContinueSandbox?.addEventListener('click', () => {
            if (this.els.gradModal) this.els.gradModal.classList.add('hidden');
        });
    }

    _showGraduationModal(species) {
        if (!this.els.gradModal || !this.els.gradSpeciesName) return;
        this.els.gradSpeciesName.textContent = `${species.emoji} ${species.name}`;
        this.els.gradModal.classList.remove('hidden');
    }

    update(fps) {
        const stats = this.ecosystem.getStats();

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

        // Active event
        if (this.els.activeEventBanner) {
            if (stats.activeEvent) {
                this.els.activeEventBanner.textContent = stats.activeEvent.message;
                this.els.activeEventBanner.className = `active-event-banner event-${stats.activeEvent.type}`;
                this.els.activeEventBanner.style.display = 'block';
            } else {
                this.els.activeEventBanner.style.display = 'none';
            }
        }

        // Graduation Trigger
        if (stats.graduatedSpecies && !this._graduationShown) {
            this._showGraduationModal(stats.graduatedSpecies);
            this._graduationShown = true;
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
        if (this.ecosystem.events.length === this._lastEventCount) return;
        this._lastEventCount = this.ecosystem.events.length;

        c.innerHTML = '';
        for (const ev of this.ecosystem.events.slice(0, 20)) {
            const item = document.createElement('div');
            item.className = `event-item event-${ev.type}`;
            item.textContent = ev.message;
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

        // ★ HP bar (red when low, green when high)
        if (this.els.creatureHpBar) {
            const hpPct = c.getHpPercent();
            this.els.creatureHpBar.style.width = (hpPct * 100) + '%';
            if (hpPct < 0.3) {
                this.els.creatureHpBar.style.background = 'linear-gradient(90deg, #ff4444, #ff6666)';
            } else if (hpPct < 0.6) {
                this.els.creatureHpBar.style.background = 'linear-gradient(90deg, #ffaa00, #ffcc44)';
            } else {
                this.els.creatureHpBar.style.background = 'linear-gradient(90deg, #69f0ae, #00e676)';
            }
        }

        // ★ Energy bar (cyan)
        const energyPct = c.getEnergyPercent();
        this.els.creatureEnergyBar.style.width = (energyPct * 100) + '%';
        if (energyPct < 0.3) {
            this.els.creatureEnergyBar.style.background = 'linear-gradient(90deg, #ff4444, #ff6666)';
        } else {
            this.els.creatureEnergyBar.style.background = 'linear-gradient(90deg, #00e5ff, #448aff)';
        }

        // ★ Fullness bar (green when full, red when hungry)
        if (this.els.creatureFullnessBar) {
            const fullPct = Math.max(0, c.fullness / CREATURE.FULLNESS_MAX);
            this.els.creatureFullnessBar.style.width = (fullPct * 100) + '%';
            if (fullPct > 0.7) {
                this.els.creatureFullnessBar.style.background = 'linear-gradient(90deg, #69f0ae, #00e5ff)';
            } else if (fullPct > 0.3) {
                this.els.creatureFullnessBar.style.background = 'linear-gradient(90deg, #ffaa00, #ffcc44)';
            } else {
                this.els.creatureFullnessBar.style.background = 'linear-gradient(90deg, #ff4444, #ff6666)';
            }
        }

        this.els.creatureDiet.textContent = c.getDietLabel();
        this.els.creatureAge.textContent = Math.floor(c.age / 60) + 's';
        this.els.creatureChildren.textContent = c.children;

        // ★ Evolution details
        const tierDef = import('./mutations.js').then(m => {
            const def = m.getTierDef(c.evolutionTier || 0);
            if (this.els.creatureTier) {
                this.els.creatureTier.innerHTML = `${def.emoji} ${def.name} <span style="font-size:0.8em;color:var(--text-muted)">(T${def.tier})</span>`;
            }
        });
        
        if (this.els.creatureMutations) {
            this.els.creatureMutations.innerHTML = '';
            const muts = c.mutations || [];
            if (muts.length === 0) {
                this.els.creatureMutations.innerHTML = '<div class="mutation-item" style="color:var(--text-muted);font-size:0.85rem">No mutations yet</div>';
            } else {
                for (const m of muts) {
                    const el = document.createElement('div');
                    el.className = 'mutation-item';
                    el.title = m.description;
                    el.innerHTML = `<span class="mut-emoji">${m.emoji}</span><span class="mut-name">${m.name}</span>`;
                    this.els.creatureMutations.appendChild(el);
                }
            }
        }

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
            'fight': '⚔️ Fighting!',
            'explore': '🔍 Exploring',
            'critical_hunger': '⚠️ STARVING!',
            'digesting': '😋 Digesting',
            'scavenge': '🥩 Scavenging',
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

    getSpeed() { return parseFloat(this.els.speedSlider?.value || 1); }

    showToast(msg, type = '') {
        const t = document.createElement('div');
        t.className = `toast ${type ? 'toast-' + type : ''}`;
        t.textContent = msg;
        this.els.toastContainer.appendChild(t);
        setTimeout(() => t.remove(), 3000);
    }
}
