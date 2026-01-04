/**
 * Spooky Background
 * All atmospheric background effects for the menu scene
 */

import Phaser from 'phaser';
import { SIZES, PALETTE } from '@/config';
import { toDPR, getGameplayLayout } from '@/systems/responsive';

export class SpookyBackground {
  private scene: Phaser.Scene;
  private width: number;
  private height: number;
  private tweens: Phaser.Tweens.Tween[] = [];
  private timerEvents: Phaser.Time.TimerEvent[] = [];
  private gameObjects: Phaser.GameObjects.GameObject[] = [];
  private skullPositions: { x: number; y: number; size: number }[] = [];
  /** Combined scale factor (0.75-1.4) from responsive system */
  private combinedScale: number;

  /** Scale CSS pixels to device pixels with combinedScale */
  private scale(cssValue: number): number {
    return Math.round(toDPR(cssValue) * this.combinedScale);
  }

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const { width, height } = this.scene.cameras.main;
    this.width = width;
    this.height = height;

    // Get combinedScale from responsive system (single source of truth)
    this.combinedScale = getGameplayLayout(scene).viewport.combinedScale;

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

    // Eerie ambient glow spots (sizes in CSS pixels)
    const glowSpots = [
      { x: width * 0.2, y: height * 0.3, color: PALETTE.spooky.glowPurple, size: this.scale(200) },
      { x: width * 0.8, y: height * 0.6, color: PALETTE.spooky.glowGreen, size: this.scale(180) },
      { x: width * 0.5, y: height * 0.8, color: PALETTE.spooky.glowDeepPurple, size: this.scale(220) },
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
    // All positions and sizes in CSS pixels, scaled
    this.skullPositions = [
      { x: this.scale(50), y: this.scale(100), size: this.scale(45) },
      { x: width - this.scale(50), y: this.scale(120), size: this.scale(52) },
      { x: this.scale(70), y: height - this.scale(90), size: this.scale(40) },
      { x: width - this.scale(60), y: height - this.scale(110), size: this.scale(48) },
      { x: width * 0.25, y: this.scale(70), size: this.scale(38) },
      { x: width * 0.75, y: this.scale(80), size: this.scale(42) },
    ];

    this.skullPositions.forEach((pos, i) => {
      // Glow behind skull - subtle
      const glow = this.scene.add.circle(pos.x, pos.y, pos.size * 0.6, PALETTE.spooky.skullGlow, 0.08);
      this.gameObjects.push(glow);

      const skull = this.scene.add.image(pos.x, pos.y, 'skull');
      skull.setOrigin(0.5, 0.5);
      // Scale image to match desired size (base image is 128px)
      skull.setScale(pos.size / 128);
      skull.setAlpha(0.2);
      this.gameObjects.push(skull);

      // Float and rotate together
      const floatY = this.scale(20);
      const floatX = this.scale(15);
      this.tweens.push(this.scene.tweens.add({
        targets: [skull, glow],
        y: pos.y + Phaser.Math.Between(-floatY, floatY),
        x: pos.x + Phaser.Math.Between(-floatX, floatX),
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
    const diceMargin = this.scale(40);
    const diceMarginY = this.scale(60);
    for (let i = 0; i < 10; i++) {
      const x = Phaser.Math.Between(diceMargin, width - diceMargin);
      const y = Phaser.Math.Between(diceMarginY, height - diceMarginY);
      const size = this.scale(Phaser.Math.Between(18, 32));
      const glowPadding = this.scale(6);

      const dice = this.scene.add.container(x, y);
      this.gameObjects.push(dice);

      // Outer glow
      const outerGlow = this.scene.add.rectangle(0, 0, size + glowPadding * 2, size + glowPadding * 2, PALETTE.spooky.diceOuterGlow, 0.1);
      dice.add(outerGlow);

      // Dice body with eerie glow
      const diceGlow = this.scene.add.rectangle(0, 0, size + glowPadding, size + glowPadding, PALETTE.spooky.diceGlow, 0.25);
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
      const diceFloatY = this.scale(25);
      const diceFloatX = this.scale(20);
      this.tweens.push(this.scene.tweens.add({
        targets: dice,
        y: y + Phaser.Math.Between(-diceFloatY, diceFloatY),
        x: x + Phaser.Math.Between(-diceFloatX, diceFloatX),
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
      const fogHeight = this.scale(90 + layer * 30);

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
    const { width, height } = this;

    // Pairs of eerie glowing eyes - some appear immediately, others delayed
    // Positions use percentage-based placement to stay in corners/edges
    const eyePositions = [
      { x: this.scale(30), y: height * 0.5, size: this.scale(5), initialDelay: 500 },
      { x: width - this.scale(25), y: height * 0.45, size: this.scale(6), initialDelay: 2000 },
      { x: this.scale(80), y: height * 0.75, size: this.scale(4), initialDelay: 4000 },
      { x: width - this.scale(60), y: height * 0.7, size: this.scale(5), initialDelay: 1000 },
      { x: width * 0.15, y: height * 0.4, size: this.scale(4), initialDelay: 3000 },
      { x: width * 0.85, y: height * 0.42, size: this.scale(4), initialDelay: 5000 },
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

    // Candle positions - corners and edges (using percentage-based Y positions)
    const candlePositions = [
      { x: this.scale(25), y: height * 0.32, size: 1 },
      { x: width - this.scale(25), y: height * 0.35, size: 0.9 },
      { x: this.scale(40), y: height * 0.78, size: 0.85 },
      { x: width - this.scale(40), y: height * 0.75, size: 0.95 },
      { x: this.scale(18), y: height * 0.58, size: 0.7 },
      { x: width - this.scale(18), y: height * 0.55, size: 0.75 },
    ];

    candlePositions.forEach((pos) => {
      const candleHeight = this.scale(14) * pos.size;
      const flameSize = this.scale(8) * pos.size;

      // Candle body (simple dark rectangle)
      const candleWidth = this.scale(5) * pos.size;
      const candleBody = this.scene.add.rectangle(pos.x, pos.y, candleWidth, candleHeight, PALETTE.spooky.candleBody, 0.6);
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
    const { width, height, combinedScale } = this;

    // Helper to scale CSS pixels to device pixels with combinedScale
    const scaleSize = (cssValue: number): number => Math.round(toDPR(cssValue) * combinedScale);

    // Ghostly figures that float and fade
    // Spawn in left or right third, float toward vertical center
    const leftThird = width * 0.33;
    const rightThird = width * 0.66;
    const activeGhosts: Phaser.GameObjects.Container[] = [];
    const MIN_GHOST_DISTANCE = scaleSize(100); // Minimum pixels between ghosts

    const spawnGhost = () => {
      // Margin to keep ghosts fully on screen (half of max ghost size + padding)
      const margin = scaleSize(50);

      // Spawn in left third or right third (not middle)
      const onLeft = Math.random() < 0.5;
      const startX = onLeft
        ? Phaser.Math.Between(margin, leftThird - margin)
        : Phaser.Math.Between(rightThird + margin, width - margin);

      // Spawn anywhere vertically
      const inTopHalf = Math.random() < 0.5;
      const startY = inTopHalf
        ? Phaser.Math.Between(margin, height * 0.4)
        : Phaser.Math.Between(height * 0.6, height - margin);

      // Check distance from existing ghosts
      const tooCloseToGhost = activeGhosts.some((other) => {
        if (!other.active) return false;
        const dx = other.x - startX;
        const dy = other.y - startY;
        return Math.sqrt(dx * dx + dy * dy) < MIN_GHOST_DISTANCE;
      });

      // Check distance from skulls
      const tooCloseToSkull = this.skullPositions.some((skull) => {
        const dx = skull.x - startX;
        const dy = skull.y - startY;
        return Math.sqrt(dx * dx + dy * dy) < MIN_GHOST_DISTANCE;
      });

      if (tooCloseToGhost || tooCloseToSkull) return; // Skip this spawn

      // Ghost size in CSS pixels (45-75), scaled to device pixels
      const size = scaleSize(Phaser.Math.Between(45, 75));

      // Ghost container
      const ghost = this.scene.add.container(startX, startY);
      activeGhosts.push(ghost);
      this.gameObjects.push(ghost);

      // Outer glow behind ghost
      const outerGlow = this.scene.add.circle(0, 0, size * 1.2, PALETTE.spooky.ghostGlow, 0.08);
      ghost.add(outerGlow);

      // Ghost image with ethereal effect
      const ghostImage = this.scene.add.image(0, 0, 'ghost');
      ghostImage.setOrigin(0.5, 0.5);
      // Scale image to match desired size (base image is 128px)
      const scale = size / 128;
      ghostImage.setScale(scale);
      ghost.add(ghostImage);

      ghost.setAlpha(0);
      ghost.setDepth(2);

      // Float toward vertical center (down if top, up if bottom)
      const driftX = scaleSize(40);
      const driftY = scaleSize(100);
      const endX = startX + Phaser.Math.Between(-driftX, driftX);
      const endY = inTopHalf
        ? startY + Phaser.Math.Between(driftY * 0.8, driftY * 1.8)  // Float down
        : startY - Phaser.Math.Between(driftY * 0.8, driftY * 1.8); // Float up
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
      const waveAmount = scaleSize(25);
      this.tweens.push(this.scene.tweens.add({
        targets: ghost,
        x: `+=${Phaser.Math.Between(-waveAmount, waveAmount)}`,
        duration: 3000,
        yoyo: true,
        repeat: Math.floor(duration / 6000),
        ease: 'Sine.easeInOut',
      }));

      // Subtle pulse/breathing effect (scale the container)
      this.tweens.push(this.scene.tweens.add({
        targets: ghost,
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
          onComplete: () => {
            const idx = activeGhosts.indexOf(ghost);
            if (idx !== -1) activeGhosts.splice(idx, 1);
            ghost.destroy();
          },
        }));
      });
      this.timerEvents.push(fadeTimer);
    };

    // Spawn ghosts periodically (faster spawning)
    const spawnTimer = this.scene.time.addEvent({
      delay: Phaser.Math.Between(3000, 5000),
      callback: spawnGhost,
      loop: true,
    });
    this.timerEvents.push(spawnTimer);

    // Initial ghosts with staggered timing (spawn quickly)
    const initial1 = this.scene.time.delayedCall(500, spawnGhost);
    const initial2 = this.scene.time.delayedCall(1500, spawnGhost);
    const initial3 = this.scene.time.delayedCall(2500, spawnGhost);
    this.timerEvents.push(initial1, initial2, initial3);
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
