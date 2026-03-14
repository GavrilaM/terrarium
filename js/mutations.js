// ============================================
// TERRARIUM — Mutation System
// Species-specific mutation trees + tier evolution
// ============================================

import { CONFIG } from './config.js';

/**
 * Mutation definitions per species type
 * Each mutation has: visual rendering data, stat modifiers, and requirements
 */
export const MUTATION_CATALOG = {

    // ===============================
    // 🌿 FLORAE (Herbivore) Mutations
    // ===============================
    florae: [
        {
            id: 'long_tail',
            name: 'Long Tail',
            emoji: '🦎',
            description: 'Elongated tail for faster movement',
            tier: 1,
            visual: { type: 'tail', color: null, length: 0.8 },
            stats: { speedMult: 1.25, sizeMod: 0 },
        },
        {
            id: 'shell',
            name: 'Hard Shell',
            emoji: '🛡️',
            description: 'Protective shell — more HP, slower',
            tier: 1,
            visual: { type: 'shell', color: null, thickness: 0.3 },
            stats: { hpMult: 1.4, speedMult: 0.85 },
        },
        {
            id: 'wide_eyes',
            name: 'Wide Eyes',
            emoji: '👁️',
            description: 'Enhanced perception range',
            tier: 1,
            visual: { type: 'big_eyes', scale: 1.8 },
            stats: { perceptionMult: 1.5 },
        },
        {
            id: 'spore_release',
            name: 'Spore Release',
            emoji: '🍀',
            description: 'Drops food when dies',
            tier: 2,
            visual: { type: 'spores', color: null },
            stats: { deathSporesCount: 3 },
        },
        {
            id: 'camouflage',
            name: 'Camouflage',
            emoji: '🫧',
            description: 'Semi-transparent — harder for predators to detect',
            tier: 2,
            visual: { type: 'camo', opacity: 0.4 },
            stats: { stealthMult: 0.5 },  // detectability reduced by 50%
        },
        {
            id: 'thick_roots',
            name: 'Root Anchors',
            emoji: '🌱',
            description: 'Absorb nearby plant food passively',
            tier: 3,
            visual: { type: 'roots', count: 3 },
            stats: { passiveEatRadius: 2.0 },
        },
    ],

    // ===============================
    // 🔴 PREDAXI (Carnivore) Mutations
    // ===============================
    predaxi: [
        {
            id: 'dash_fin',
            name: 'Dash Fin',
            emoji: '🦈',
            description: 'Burst speed when hunting',
            tier: 1,
            visual: { type: 'fin', position: 'top' },
            stats: { dashSpeed: 1.8, dashCost: 20 },
        },
        {
            id: 'fangs',
            name: 'Sharp Fangs',
            emoji: '🦷',
            description: 'Increased attack damage',
            tier: 1,
            visual: { type: 'fangs', size: 1.3 },
            stats: { attackMult: 1.4 },
        },
        {
            id: 'echolocation',
            name: 'Echolocation',
            emoji: '🎯',
            description: 'Detect prey from much farther + see camouflaged',
            tier: 1,
            visual: { type: 'radar', pulseRate: 2.0 },
            stats: { perceptionMult: 1.8, detectCamo: true },
        },
        {
            id: 'venom',
            name: 'Venom Glands',
            emoji: '☠️',
            description: 'Poison damage over time after attack',
            tier: 2,
            visual: { type: 'venom_glow', hue: 280 },
            stats: { venomDamage: 0.3, venomDuration: 60 },
        },
        {
            id: 'pack_signal',
            name: 'Pack Signal',
            emoji: '👥',
            description: 'Nearby predaxi converge on prey',
            tier: 2,
            visual: { type: 'aura', color: 'red', radius: 80 },
            stats: { packRadius: 80 },
        },
        {
            id: 'armored_head',
            name: 'Armored Head',
            emoji: '🪖',
            description: 'Take less counter-damage in fights',
            tier: 3,
            visual: { type: 'armor_head', thickness: 0.2 },
            stats: { counterDmgReduction: 0.5 },
        },
    ],

    // ===============================
    // 🟡 MIXOLITH (Omnivore) Mutations
    // ===============================
    mixolith: [
        {
            id: 'adaptive_gut',
            name: 'Adaptive Gut',
            emoji: '🔄',
            description: 'More fullness from all food types',
            tier: 1,
            visual: { type: 'glow_gut', hue: 50 },
            stats: { fullnessMult: 1.4 },
        },
        {
            id: 'scavenger_nose',
            name: 'Scavenger Nose',
            emoji: '🧲',
            description: 'Detect meat chunks from far away',
            tier: 1,
            visual: { type: 'antenna', length: 0.6 },
            stats: { meatDetectMult: 2.5 },
        },
        {
            id: 'thick_membrane',
            name: 'Thick Membrane',
            emoji: '💪',
            description: 'Faster HP regeneration',
            tier: 1,
            visual: { type: 'thick_border', width: 2 },
            stats: { hpRegenMult: 2.0 },
        },
        {
            id: 'mimicry',
            name: 'Mimicry',
            emoji: '🪞',
            description: 'Change color to blend — predators ignore',
            tier: 2,
            visual: { type: 'color_shift', rate: 0.02 },
            stats: { stealthMult: 0.4 },
        },
        {
            id: 'problem_solver',
            name: 'Problem Solver',
            emoji: '🧠',
            description: 'Better decision making, bigger nucleus',
            tier: 2,
            visual: { type: 'big_nucleus', scale: 1.5 },
            stats: { perceptionMult: 1.3, fleeBoost: 1.3 },
        },
        {
            id: 'symbiote',
            name: 'Symbiote',
            emoji: '🤝',
            description: 'Nearby same-species gain small HP regen',
            tier: 3,
            visual: { type: 'heal_aura', radius: 40, hue: 160 },
            stats: { healAuraRadius: 40, healAuraAmount: 0.02 },
        },
    ],
};

// ===============================
// EVOLUTION TIERS
// ===============================

export const EVOLUTION_TIERS = [
    {
        tier: 0,
        name: 'Primordial',
        emoji: '🦠',
        mutationSlots: 0,
        requirements: null, // starting tier
    },
    {
        tier: 1,
        name: 'Adapted',
        emoji: '🧬',
        mutationSlots: 1,
        requirements: { survivalFrames: 500, offspring: 0 },
    },
    {
        tier: 2,
        name: 'Evolved',
        emoji: '🔬',
        mutationSlots: 2,
        requirements: { survivalFrames: 1500, offspring: 2 },
    },
    {
        tier: 3,
        name: 'Apex',
        emoji: '⭐',
        mutationSlots: 3,
        requirements: { survivalFrames: 3000, offspring: 5 },
    },
];

/**
 * Check if creature qualifies for tier up
 */
export function checkTierUp(creature) {
    const currentTier = creature.evolutionTier || 0;
    const nextTierDef = EVOLUTION_TIERS[currentTier + 1];
    if (!nextTierDef) return null; // already max

    const req = nextTierDef.requirements;
    if (creature.age >= req.survivalFrames && creature.children >= req.offspring) {
        return nextTierDef;
    }
    return null;
}

/**
 * Get available mutations for a creature based on species and tier
 */
export function getAvailableMutations(creature) {
    const speciesId = creature.speciesType?.id;
    const catalog = MUTATION_CATALOG[speciesId];
    if (!catalog) return [];

    const currentTier = creature.evolutionTier || 0;
    const hasMutations = creature.mutations || [];
    const hasIds = new Set(hasMutations.map(m => m.id));

    return catalog.filter(mut =>
        mut.tier <= currentTier && !hasIds.has(mut.id)
    );
}

/**
 * Roll a random mutation for a creature
 * Returns mutation definition or null
 */
export function rollMutation(creature) {
    const available = getAvailableMutations(creature);
    if (available.length === 0) return null;

    const maxSlots = EVOLUTION_TIERS[creature.evolutionTier || 0]?.mutationSlots || 0;
    if ((creature.mutations || []).length >= maxSlots) return null;

    // Weighted random — higher tier mutations are rarer
    const weights = available.map(m => m.tier === 1 ? 3 : m.tier === 2 ? 2 : 1);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * totalWeight;

    for (let i = 0; i < available.length; i++) {
        roll -= weights[i];
        if (roll <= 0) return available[i];
    }
    return available[available.length - 1];
}

/**
 * Apply mutation stat modifiers to creature
 */
export function applyMutationStats(creature) {
    const muts = creature.mutations || [];

    // Reset multipliers
    creature.mutSpeedMult = 1;
    creature.mutHpMult = 1;
    creature.mutAttackMult = 1;
    creature.mutPerceptionMult = 1;
    creature.mutFullnessMult = 1;
    creature.mutHpRegenMult = 1;
    creature.mutStealthMult = 1;
    creature.mutCounterReduction = 0;
    creature.mutDashSpeed = 0;
    creature.mutDashCost = 0;
    creature.mutVenomDamage = 0;
    creature.mutVenomDuration = 0;
    creature.mutPackRadius = 0;
    creature.mutPassiveEatRadius = 1;
    creature.mutMeatDetectMult = 1;
    creature.mutDeathSpores = 0;
    creature.mutDetectCamo = false;
    creature.mutHealAura = 0;
    creature.mutHealAuraRadius = 0;
    creature.mutFleeBoost = 1;

    for (const m of muts) {
        const s = m.stats;
        if (s.speedMult) creature.mutSpeedMult *= s.speedMult;
        if (s.hpMult) creature.mutHpMult *= s.hpMult;
        if (s.attackMult) creature.mutAttackMult *= s.attackMult;
        if (s.perceptionMult) creature.mutPerceptionMult *= s.perceptionMult;
        if (s.fullnessMult) creature.mutFullnessMult *= s.fullnessMult;
        if (s.hpRegenMult) creature.mutHpRegenMult *= s.hpRegenMult;
        if (s.stealthMult) creature.mutStealthMult = Math.min(creature.mutStealthMult, s.stealthMult);
        if (s.counterDmgReduction) creature.mutCounterReduction = Math.max(creature.mutCounterReduction, s.counterDmgReduction);
        if (s.dashSpeed) { creature.mutDashSpeed = s.dashSpeed; creature.mutDashCost = s.dashCost || 15; }
        if (s.venomDamage) { creature.mutVenomDamage = s.venomDamage; creature.mutVenomDuration = s.venomDuration || 60; }
        if (s.packRadius) creature.mutPackRadius = s.packRadius;
        if (s.passiveEatRadius) creature.mutPassiveEatRadius = s.passiveEatRadius;
        if (s.meatDetectMult) creature.mutMeatDetectMult = s.meatDetectMult;
        if (s.deathSporesCount) creature.mutDeathSpores = s.deathSporesCount;
        if (s.detectCamo) creature.mutDetectCamo = true;
        if (s.healAuraAmount) { creature.mutHealAura = s.healAuraAmount; creature.mutHealAuraRadius = s.healAuraRadius || 40; }
        if (s.fleeBoost) creature.mutFleeBoost *= s.fleeBoost;
    }
}

/**
 * Get tier definition by tier number
 */
export function getTierDef(tier) {
    return EVOLUTION_TIERS[tier] || EVOLUTION_TIERS[0];
}
