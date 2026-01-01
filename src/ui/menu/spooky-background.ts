/**
 * Spooky Background
 * All atmospheric background effects for the menu scene
 */

import Phaser from 'phaser';
import { FONTS, SIZES, PALETTE } from '@/config';
import { toDPR } from '@/systems/responsive';
import { createText } from '@/ui/ui-utils';

export class SpookyBackground {
  private scene: Phaser.Scene;
  private width: number;
  private height: number;
  private tweens: Phaser.Tweens.Tween[] = [];
  private timerEvents: Phaser.Time.TimerEvent[] = [];
  private gameObjects: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const { width, height } = this.scene.cameras.main;
    this.width = width;
    this.height = height;

    this.createBackground();
    this.createFloatingCursedElements();
    this.createFogLayers();
    this.createGlowingEyes();
    this.createFlickeringCandles();
    this.createGhostlyWisps();
  }

  private createBackground(): void {
    const { width, height } = this;

    // Deep dark gradient with purple/green tints
    const bg = this.scene.add.graphics();
    bg.fillGradientStyle(PALETTE.spooky.bgDark, PALETTE.spooky.bgDark, PALETTE.spooky.bgPurpleTint, PALETTE.spooky.bgGreenTint, 1);
    bg.fillRect(0, 0, width, height);
    this.gameObjects.push(bg);

    // Eerie ambient glow spots
    const glowSpots = [
      { x: width * 0.2, y: height * 0.3, color: PALETTE.spooky.glowPurple, size: 350 },
      { x: width * 0.8, y: height * 0.6, color: PALETTE.spooky.glowGreen, size: 300 },
      { x: width * 0.5, y: height * 0.8, color: PALETTE.spooky.glowDeepPurple, size: 400 },
    ];

    for (const spot of glowSpots) {
      const glow = this.scene.add.graphics();
      glow.fillStyle(spot.color, 0.15);
      glow.fillCircle(spot.x, spot.y, spot.size);
      this.gameObjects.push(glow);

      const tween = this.scene.tweens.add({
        targets: glow,
        alpha: 0.25,
        duration: Phaser.Math.Between(3000, 5000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 2000),
      });
      this.tweens.push(tween);
    }
  }

  private createFloatingCursedElements(): void {
    const { width, height } = this;

    // Floating skulls - larger and more visible with glow
    const skullPositions = [
      { x: 70, y: 160, size: 36 },
      { x: width - 70, y: 190, size: 42 },
      { x: 100, y: height - 140, size: 32 },
      { x: width - 90, y: height - 170, size: 38 },
      { x: width / 2 - 220, y: 110, size: 28 },
      { x: width / 2 + 220, y: 125, size: 30 },
    ];

    skullPositions.forEach((pos, i) => {
      // Glow behind skull - subtle
      const glow = this.scene.add.circle(pos.x, pos.y, pos.size * 0.6, PALETTE.spooky.skullGlow, 0.08);
      this.gameObjects.push(glow);

      const skull = createText(this.scene, pos.x, pos.y, '💀', {
        fontSize: `${pos.size}px`,
        fontFamily: FONTS.FAMILY,
      });
      skull.setOrigin(0.5, 0.5);
      skull.setAlpha(0.2);
      this.gameObjects.push(skull);

      // Float and rotate together
      this.tweens.push(this.scene.tweens.add({
        targets: [skull, glow],
        y: pos.y + Phaser.Math.Between(-30, 30),
        x: pos.x + Phaser.Math.Between(-20, 20),
        duration: Phaser.Math.Between(5000, 8000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: i * 400,
      }));

      // Skull rotation
      this.tweens.push(this.scene.tweens.add({
        targets: skull,
        angle: Phaser.Math.Between(-20, 20),
        duration: Phaser.Math.Between(4000, 6000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      }));

      // Glow pulse - subtle
      this.tweens.push(this.scene.tweens.add({
        targets: glow,
        alpha: 0.15,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: Phaser.Math.Between(2000, 3000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 2000),
      }));

      // Skull visibility pulse - subtle
      this.tweens.push(this.scene.tweens.add({
        targets: skull,
        alpha: 0.35,
        duration: SIZES.ANIM_PULSE_SLOW,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 2000),
      }));
    });

    // Floating cursed dice - larger and more visible
    for (let i = 0; i < 10; i++) {
      const x = Phaser.Math.Between(60, width - 60);
      const y = Phaser.Math.Between(100, height - 100);
      const size = Phaser.Math.Between(25, 45);

      const dice = this.scene.add.container(x, y);
      this.gameObjects.push(dice);

      // Outer glow
      const outerGlow = this.scene.add.rectangle(0, 0, size + 16, size + 16, PALETTE.spooky.diceOuterGlow, 0.1);
      dice.add(outerGlow);

      // Dice body with eerie glow
      const diceGlow = this.scene.add.rectangle(0, 0, size + 8, size + 8, PALETTE.spooky.diceGlow, 0.25);
      dice.add(diceGlow);

      const diceBg = this.scene.add.rectangle(0, 0, size, size, PALETTE.spooky.diceBg, 0.7);
      diceBg.setStrokeStyle(toDPR(2), PALETTE.spooky.diceBorder, 0.8);
      dice.add(diceBg);

      // Random pip pattern
      const pipCount = Phaser.Math.Between(1, 6);
      const pipSize = size * 0.13;
      const pipOffset = size * 0.26;

      const pipPositions: { x: number; y: number }[][] = [
        [{ x: 0, y: 0 }],
        [{ x: -pipOffset, y: -pipOffset }, { x: pipOffset, y: pipOffset }],
        [{ x: -pipOffset, y: -pipOffset }, { x: 0, y: 0 }, { x: pipOffset, y: pipOffset }],
        [{ x: -pipOffset, y: -pipOffset }, { x: pipOffset, y: -pipOffset }, { x: -pipOffset, y: pipOffset }, { x: pipOffset, y: pipOffset }],
        [{ x: -pipOffset, y: -pipOffset }, { x: pipOffset, y: -pipOffset }, { x: 0, y: 0 }, { x: -pipOffset, y: pipOffset }, { x: pipOffset, y: pipOffset }],
        [{ x: -pipOffset, y: -pipOffset }, { x: -pipOffset, y: 0 }, { x: -pipOffset, y: pipOffset }, { x: pipOffset, y: -pipOffset }, { x: pipOffset, y: 0 }, { x: pipOffset, y: pipOffset }],
      ];

      pipPositions[pipCount - 1].forEach(pip => {
        const pipCircle = this.scene.add.circle(pip.x, pip.y, pipSize, PALETTE.spooky.dicePip, 0.8);
        dice.add(pipCircle);
      });

      dice.setAlpha(Phaser.Math.FloatBetween(0.15, 0.25));
      dice.setAngle(Phaser.Math.Between(-30, 30));

      // Floating animation
      this.tweens.push(this.scene.tweens.add({
        targets: dice,
        y: y + Phaser.Math.Between(-40, 40),
        x: x + Phaser.Math.Between(-30, 30),
        angle: dice.angle + Phaser.Math.Between(-20, 20),
        duration: Phaser.Math.Between(5000, 9000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 3000),
      }));

      // Glow pulse
      this.tweens.push(this.scene.tweens.add({
        targets: diceGlow,
        alpha: 0.4,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: Phaser.Math.Between(2000, 4000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      }));
    }
  }

  private createFogLayers(): void {
    const { width, height } = this;

    // Create multiple fog layers that drift across
    for (let layer = 0; layer < 3; layer++) {
      const fogY = height * 0.3 + layer * height * 0.25;
      const fogHeight = 150 + layer * 50;

      for (let i = 0; i < 4; i++) {
        const fog = this.scene.add.graphics();
        const startX = (i - 1) * width * 0.5;
        this.gameObjects.push(fog);

        fog.fillStyle(PALETTE.spooky.fog, 0.03 + layer * 0.01);
        fog.fillEllipse(startX, fogY, width * 0.6, fogHeight);

        // Drift animation
        this.tweens.push(this.scene.tweens.add({
          targets: fog,
          x: fog.x + width * 0.3,
          duration: 15000 + layer * 5000,
          repeat: -1,
          ease: 'Linear',
          delay: i * 4000,
          onRepeat: () => {
            fog.x = -width * 0.3;
          },
        }));

        // Fade in/out
        this.tweens.push(this.scene.tweens.add({
          targets: fog,
          alpha: 0.6,
          duration: SIZES.ANIM_AMBIENT,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: Phaser.Math.Between(0, 3000),
        }));
      }
    }
  }

  private createGlowingEyes(): void {
    const { width } = this;

    // Pairs of eerie glowing eyes - some appear immediately, others delayed
    const eyePositions = [
      { x: 45, y: 450, size: 8, initialDelay: 500 },
      { x: width - 35, y: 400, size: 9, initialDelay: 2000 },
      { x: 120, y: 600, size: 6, initialDelay: 4000 },
      { x: width - 90, y: 550, size: 7, initialDelay: 1000 },
      { x: width / 2 - 380, y: 350, size: 6, initialDelay: 3000 },
      { x: width / 2 + 380, y: 380, size: 6, initialDelay: 5000 },
    ];

    eyePositions.forEach((pos) => {
      const spacing = pos.size * 3;

      // Left eye with multiple glow layers
      const leftOuterGlow = this.scene.add.circle(pos.x - spacing, pos.y, pos.size * 5, PALETTE.spooky.eyeOuterGlow, 0);
      const leftGlow = this.scene.add.circle(pos.x - spacing, pos.y, pos.size * 2.5, PALETTE.spooky.eyeGlow, 0);
      const leftEye = this.scene.add.circle(pos.x - spacing, pos.y, pos.size, PALETTE.spooky.eyeCore, 0);
      const leftPupil = this.scene.add.circle(pos.x - spacing, pos.y, pos.size * 0.35, PALETTE.spooky.eyePupil, 0);

      // Right eye with multiple glow layers
      const rightOuterGlow = this.scene.add.circle(pos.x + spacing, pos.y, pos.size * 5, PALETTE.spooky.eyeOuterGlow, 0);
      const rightGlow = this.scene.add.circle(pos.x + spacing, pos.y, pos.size * 2.5, PALETTE.spooky.eyeGlow, 0);
      const rightEye = this.scene.add.circle(pos.x + spacing, pos.y, pos.size, PALETTE.spooky.eyeCore, 0);
      const rightPupil = this.scene.add.circle(pos.x + spacing, pos.y, pos.size * 0.35, PALETTE.spooky.eyePupil, 0);

      const allParts = [leftOuterGlow, leftGlow, leftEye, leftPupil, rightOuterGlow, rightGlow, rightEye, rightPupil];
      allParts.forEach(part => this.gameObjects.push(part));

      // Function to show eyes
      const showEyes = () => {
        // Fade in with stagger
        this.tweens.push(this.scene.tweens.add({
          targets: [leftOuterGlow, rightOuterGlow],
          alpha: 0.2,
          duration: SIZES.ANIM_SLOW,
        }));
        this.tweens.push(this.scene.tweens.add({
          targets: [leftGlow, rightGlow],
          alpha: 0.5,
          duration: 350,
          delay: 50,
        }));
        this.tweens.push(this.scene.tweens.add({
          targets: [leftEye, rightEye],
          alpha: 1,
          duration: SIZES.ANIM_ENTRANCE,
          delay: 100,
        }));
        this.tweens.push(this.scene.tweens.add({
          targets: [leftPupil, rightPupil],
          alpha: 1,
          duration: SIZES.ANIM_NORMAL,
          delay: 150,
        }));
      };

      // Function to hide eyes and schedule next appearance
      const hideEyes = () => {
        this.tweens.push(this.scene.tweens.add({
          targets: allParts,
          alpha: 0,
          duration: SIZES.ANIM_FLASH,
          yoyo: true,
          repeat: Phaser.Math.Between(1, 3), // Blink
          onComplete: () => {
            this.tweens.push(this.scene.tweens.add({
              targets: allParts,
              alpha: 0,
              duration: SIZES.ANIM_ENTRANCE,
              onComplete: () => {
                // Schedule next appearance
                const timer = this.scene.time.delayedCall(Phaser.Math.Between(3000, 8000), () => {
                  showEyes();
                  const hideTimer = this.scene.time.delayedCall(Phaser.Math.Between(2000, 5000), hideEyes);
                  this.timerEvents.push(hideTimer);
                });
                this.timerEvents.push(timer);
              },
            }));
          },
        }));
      };

      // Initial appearance with specified delay
      const initialTimer = this.scene.time.delayedCall(pos.initialDelay, () => {
        showEyes();
        const hideTimer = this.scene.time.delayedCall(Phaser.Math.Between(2500, 4000), hideEyes);
        this.timerEvents.push(hideTimer);
      });
      this.timerEvents.push(initialTimer);
    });
  }

  private createFlickeringCandles(): void {
    const { width, height } = this;

    // Candle positions - corners and edges
    const candlePositions = [
      { x: 35, y: 280, size: 1 },
      { x: width - 35, y: 300, size: 0.9 },
      { x: 55, y: height - 200, size: 0.85 },
      { x: width - 55, y: height - 180, size: 0.95 },
      { x: 25, y: 520, size: 0.7 },
      { x: width - 25, y: 500, size: 0.75 },
    ];

    candlePositions.forEach((pos) => {
      const candleHeight = 20 * pos.size;
      const flameSize = 12 * pos.size;

      // Candle body (simple dark rectangle)
      const candleBody = this.scene.add.rectangle(pos.x, pos.y, 8 * pos.size, candleHeight, PALETTE.spooky.candleBody, 0.6);
      this.gameObjects.push(candleBody);

      // Flame outer glow (largest, dimmest)
      const flameGlow3 = this.scene.add.ellipse(pos.x, pos.y - candleHeight / 2 - flameSize * 0.8, flameSize * 3, flameSize * 4, PALETTE.spooky.flameOuter, 0.08);

      // Flame medium glow
      const flameGlow2 = this.scene.add.ellipse(pos.x, pos.y - candleHeight / 2 - flameSize * 0.7, flameSize * 2, flameSize * 2.5, PALETTE.spooky.flameMid, 0.15);

      // Flame inner glow
      const flameGlow1 = this.scene.add.ellipse(pos.x, pos.y - candleHeight / 2 - flameSize * 0.6, flameSize, flameSize * 1.5, PALETTE.spooky.flameInner, 0.3);

      // Flame core (brightest)
      const flameCore = this.scene.add.ellipse(pos.x, pos.y - candleHeight / 2 - flameSize * 0.5, flameSize * 0.4, flameSize * 0.8, PALETTE.spooky.flameCore, 0.6);

      const allFlame = [flameGlow3, flameGlow2, flameGlow1, flameCore];
      allFlame.forEach(f => this.gameObjects.push(f));

      // Flickering animation - rapid random changes
      const flickerTimer = this.scene.time.addEvent({
        delay: 50 + Math.random() * 50,
        callback: () => {
          const flicker = 0.7 + Math.random() * 0.3;
          const offsetX = (Math.random() - 0.5) * 3 * pos.size;
          const offsetY = (Math.random() - 0.5) * 2 * pos.size;

          allFlame.forEach((flame, i) => {
            flame.setAlpha(flame.alpha * flicker);
            flame.x = pos.x + offsetX * (1 - i * 0.2);
            flame.y = pos.y - candleHeight / 2 - flameSize * (0.5 + i * 0.1) + offsetY;
          });
        },
        loop: true,
      });
      this.timerEvents.push(flickerTimer);

      // Slower intensity pulse
      this.tweens.push(this.scene.tweens.add({
        targets: allFlame,
        alpha: { from: 0.1, to: 0.4 },
        scaleX: { from: 0.9, to: 1.1 },
        scaleY: { from: 0.95, to: 1.15 },
        duration: Phaser.Math.Between(400, 800),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      }));

      // Occasional dramatic flicker (nearly goes out)
      const dramaticFlickerTimer = this.scene.time.addEvent({
        delay: Phaser.Math.Between(3000, 8000),
        callback: () => {
          this.tweens.push(this.scene.tweens.add({
            targets: allFlame,
            alpha: 0.05,
            duration: SIZES.ANIM_FLASH,
            yoyo: true,
            repeat: Phaser.Math.Between(1, 3),
          }));
        },
        loop: true,
      });
      this.timerEvents.push(dramaticFlickerTimer);

      // Set depths so candles are in background
      candleBody.setDepth(1);
      allFlame.forEach(f => f.setDepth(1));
    });
  }

  private createGhostlyWisps(): void {
    const { width, height } = this;

    // Ghostly figures that float and fade
    const spawnGhost = () => {
      const startX = Phaser.Math.Between(50, width - 50);
      const startY = Phaser.Math.Between(height * 0.5, height * 0.85);
      const size = Phaser.Math.Between(24, 40);

      // Ghost container
      const ghost = this.scene.add.container(startX, startY);
      this.gameObjects.push(ghost);

      // Outer glow behind ghost
      const outerGlow = this.scene.add.circle(0, 0, size * 1.2, PALETTE.spooky.ghostGlow, 0.08);
      ghost.add(outerGlow);

      // Ghost emoji with ethereal effect
      const ghostEmoji = createText(this.scene, 0, 0, '👻', {
        fontSize: `${size}px`,
        fontFamily: FONTS.FAMILY,
      });
      ghostEmoji.setOrigin(0.5, 0.5);
      ghost.add(ghostEmoji);

      ghost.setAlpha(0);
      ghost.setDepth(2);

      // Random drift path - ghosts float upward
      const endX = startX + Phaser.Math.Between(-100, 100);
      const endY = startY + Phaser.Math.Between(-250, -100);
      const duration = Phaser.Math.Between(8000, 14000);

      // Fade in slowly
      this.tweens.push(this.scene.tweens.add({
        targets: ghost,
        alpha: 0.35,
        duration: SIZES.ANIM_PULSE,
        ease: 'Sine.easeIn',
      }));

      // Main movement - slow float upward
      this.tweens.push(this.scene.tweens.add({
        targets: ghost,
        x: endX,
        y: endY,
        duration: duration,
        ease: 'Sine.easeInOut',
      }));

      // Gentle horizontal wave motion
      this.tweens.push(this.scene.tweens.add({
        targets: ghost,
        x: `+=${Phaser.Math.Between(-40, 40)}`,
        duration: 3000,
        yoyo: true,
        repeat: Math.floor(duration / 6000),
        ease: 'Sine.easeInOut',
      }));

      // Subtle pulse/breathing effect
      this.tweens.push(this.scene.tweens.add({
        targets: [ghostEmoji, outerGlow],
        scaleX: 1.1,
        scaleY: 1.1,
        duration: Phaser.Math.Between(1500, 2500),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      }));

      // Glow pulse
      this.tweens.push(this.scene.tweens.add({
        targets: outerGlow,
        alpha: 0.15,
        duration: SIZES.ANIM_PULSE,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      }));

      // Fade out near end
      const fadeTimer = this.scene.time.delayedCall(duration - 2500, () => {
        this.tweens.push(this.scene.tweens.add({
          targets: ghost,
          alpha: 0,
          duration: SIZES.ANIM_PULSE_SLOW,
          ease: 'Sine.easeOut',
          onComplete: () => ghost.destroy(),
        }));
      });
      this.timerEvents.push(fadeTimer);
    };

    // Spawn ghosts periodically
    const spawnTimer = this.scene.time.addEvent({
      delay: Phaser.Math.Between(6000, 12000),
      callback: spawnGhost,
      loop: true,
    });
    this.timerEvents.push(spawnTimer);

    // Initial ghosts with staggered timing
    const initial1 = this.scene.time.delayedCall(2000, spawnGhost);
    const initial2 = this.scene.time.delayedCall(5000, spawnGhost);
    this.timerEvents.push(initial1, initial2);
  }

  /**
   * Clean up all resources
   */
  destroy(): void {
    // Stop all tweens
    this.tweens.forEach(tween => {
      if (tween.isPlaying()) {
        tween.stop();
      }
    });
    this.tweens = [];

    // Stop all timer events
    this.timerEvents.forEach(timer => {
      if (timer) {
        timer.destroy();
      }
    });
    this.timerEvents = [];

    // Destroy all game objects
    this.gameObjects.forEach(obj => {
      if (obj && !obj.scene) return; // Already destroyed
      obj.destroy();
    });
    this.gameObjects = [];
  }
}
