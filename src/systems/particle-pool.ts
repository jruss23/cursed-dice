/**
 * Particle Pool
 * Reusable pool of circle particles to avoid create/destroy overhead
 */

import Phaser from 'phaser';
import { PALETTE } from '@/config';

const POOL_SIZE = 30; // Max particles we'll ever need at once

export class ParticlePool {
  private scene: Phaser.Scene;
  private pool: Phaser.GameObjects.Arc[] = [];
  private activeParticles: Set<Phaser.GameObjects.Arc> = new Set();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createPool();
  }

  /**
   * Pre-create all particles (hidden)
   */
  private createPool(): void {
    for (let i = 0; i < POOL_SIZE; i++) {
      const particle = this.scene.add.circle(0, 0, 5, PALETTE.white, 0);
      particle.setVisible(false);
      particle.setActive(false);
      this.pool.push(particle);
    }
  }

  /**
   * Get a particle from the pool
   */
  private acquire(): Phaser.GameObjects.Arc | null {
    const particle = this.pool.find(p => !p.active);
    if (particle) {
      particle.setActive(true);
      particle.setVisible(true);
      this.activeParticles.add(particle);
      return particle;
    }
    return null; // Pool exhausted
  }

  /**
   * Return a particle to the pool
   */
  private release(particle: Phaser.GameObjects.Arc): void {
    particle.setActive(false);
    particle.setVisible(false);
    particle.setAlpha(0);
    this.activeParticles.delete(particle);
  }

  /**
   * Emit particles in a burst pattern
   */
  emit(x: number, y: number, count: number, color: number): void {
    for (let i = 0; i < count; i++) {
      const particle = this.acquire();
      if (!particle) break; // Pool exhausted

      const angle = (i / count) * Math.PI * 2;
      const distance = Phaser.Math.Between(60, 120);
      const size = Phaser.Math.Between(4, 10);

      // Reset particle state
      particle.setPosition(x, y);
      particle.setRadius(size);
      particle.setFillStyle(color, 0.8);
      particle.setAlpha(0.8);
      particle.setScale(1);

      // Animate and return to pool when done
      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: Phaser.Math.Between(400, 800),
        ease: 'Quad.easeOut',
        onComplete: () => this.release(particle),
      });
    }
  }

  /**
   * Get pool stats for debugging
   */
  getStats(): { total: number; active: number; available: number } {
    return {
      total: POOL_SIZE,
      active: this.activeParticles.size,
      available: POOL_SIZE - this.activeParticles.size,
    };
  }

  /**
   * Clean up the pool
   */
  destroy(): void {
    this.pool.forEach(p => p.destroy());
    this.pool = [];
    this.activeParticles.clear();
  }
}
