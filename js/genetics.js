// ============================================
// TERRARIUM — Genetics System
// DNA mixing, mutation, species classification
// ============================================

import { CONFIG } from './config.js';

const { GENETICS } = CONFIG;

/**
 * Generate a random DNA array
 * Each gene is a value between 0 and 1
 * Gene mapping:
 *   0: size
 *   1: speed
 *   2: hue (color)
 *   3: saturation
 *   4: diet tendency (0=herbivore, 1=carnivore)
 *   5: perception range
 *   6: body shape (roundness)
 *   7: social tendency (0=solitary, 1=social)
 */
export function generateRandomDNA() {
    const dna = new Float32Array(GENETICS.DNA_LENGTH);
    for (let i = 0; i < GENETICS.DNA_LENGTH; i++) {
        dna[i] = Math.random();
    }
    return dna;
}

/**
 * Crossover two parent DNAs to produce offspring DNA
 * Uses uniform crossover with random gene selection from each parent
 */
export function crossover(parentA, parentB) {
    const child = new Float32Array(GENETICS.DNA_LENGTH);
    // Random crossover point
    const crossPoint = Math.floor(Math.random() * GENETICS.DNA_LENGTH);

    for (let i = 0; i < GENETICS.DNA_LENGTH; i++) {
        if (i < crossPoint) {
            child[i] = parentA[i];
        } else {
            child[i] = parentB[i];
        }
        // Occasionally blend instead of picking one
        if (Math.random() < 0.3) {
            const t = Math.random();
            child[i] = parentA[i] * t + parentB[i] * (1 - t);
        }
    }

    return child;
}

/**
 * Mutate a DNA array in-place
 * Each gene has a chance to be slightly altered
 */
export function mutate(dna) {
    for (let i = 0; i < dna.length; i++) {
        if (Math.random() < GENETICS.MUTATION_RATE) {
            const delta = (Math.random() - 0.5) * 2 * GENETICS.MUTATION_STRENGTH;
            dna[i] = Math.max(0, Math.min(1, dna[i] + delta));
        }
    }
    return dna;
}

/**
 * Calculate genetic distance between two DNAs (Euclidean)
 * Returns a value between 0 (identical) and ~sqrt(DNA_LENGTH) (maximally different)
 * Normalized to 0-1 range
 */
export function geneticDistance(dnaA, dnaB) {
    let sum = 0;
    for (let i = 0; i < GENETICS.DNA_LENGTH; i++) {
        const diff = dnaA[i] - dnaB[i];
        sum += diff * diff;
    }
    return Math.sqrt(sum / GENETICS.DNA_LENGTH);
}

/**
 * Express DNA as phenotype traits
 */
export function expressDNA(dna) {
    const { CREATURE } = CONFIG;

    return {
        size: CREATURE.SIZE_MIN + dna[0] * (CREATURE.SIZE_MAX - CREATURE.SIZE_MIN),
        speed: CREATURE.SPEED_MIN + dna[1] * (CREATURE.SPEED_MAX - CREATURE.SPEED_MIN),
        hue: Math.floor(dna[2] * 360),
        saturation: 50 + dna[3] * 50,              // 50-100%
        diet: dna[4],                                // 0=herbivore, 0.5=omnivore, 1=carnivore
        perceptionRange: 60 + dna[5] * 120,          // 60-180
        bodyShape: dna[6],                            // 0=elongated, 1=round
        socialTendency: dna[7],                       // 0=solitary, 1=social
    };
}

/**
 * Get diet label from diet value
 */
export function getDietLabel(dietValue) {
    if (dietValue < 0.33) return 'Herbivore';
    if (dietValue < 0.66) return 'Omnivore';
    return 'Carnivore';
}

/**
 * Generate a species name based on dominant traits
 */
const prefixes = ['Lux', 'Nox', 'Aqu', 'Ign', 'Cryo', 'Bio', 'Neo', 'Proto', 'Xeno', 'Zyth',
                   'Vor', 'Phos', 'Umbr', 'Sol', 'Luna', 'Tera', 'Vex', 'Flux', 'Dex', 'Kry'];
const suffixes = ['aria', 'eon', 'ith', 'odon', 'ella', 'ix', 'ora', 'ium', 'ax', 'us',
                   'ova', 'enna', 'ida', 'alis', 'entis', 'opus', 'yra', 'una', 'ata', 'ica'];

export function generateSpeciesName(dna) {
    const pIdx = Math.floor(dna[2] * prefixes.length) % prefixes.length;
    const sIdx = Math.floor((dna[0] + dna[1]) * suffixes.length) % suffixes.length;
    return prefixes[pIdx] + suffixes[sIdx];
}
