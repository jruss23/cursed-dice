/**
 * Blessing Choice Panel
 * Displays 3 blessing options for player to choose after Mode 1
 */

import Phaser from 'phaser';
import { FONTS, PALETTE, COLORS, SIZES, getViewportMetrics } from '@/config';
import { BLESSING_CONFIGS, type BlessingId } from '@/systems/blessings/types';
import { MODE_CONFIGS } from '@/systems/game-progression';

export interface BlessingChoiceCallbacks {
  onSelect: (blessingId: BlessingId) => void;
  onCancel?: () => void;
}

// Which blessings are currently implemented
const IMPLEMENTED_BLESSINGS: Set<BlessingId> = new Set(['expansion']);

export class BlessingChoicePanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private callbacks: BlessingChoiceCallbacks;
  private selectedCard: Phaser.GameObjects.Container | null = null;
  private selectedBlessingId: BlessingId | null = null;
  private continueButton: Phaser.GameObjects.Rectangle | null = null;
  private continueButtonText: Phaser.GameObjects.Text | null = null;
  private continueButtonGlow: Phaser.GameObjects.Rectangle | null = null;

  constructor(scene: Phaser.Scene, callbacks: BlessingChoiceCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(200);

    this.create();
  }

  private create(): void {
    const { width, height } = this.scene.cameras.main;
    const metrics = getViewportMetrics(this.scene);
    const isMobile = metrics.isMobile;

    // Dark overlay
    const overlay = this.scene.add.rectangle(
      width / 2, height / 2,
      width, height,
      0x000000, 0.9
    );
    overlay.setInteractive(); // Block clicks behind
    this.container.add(overlay);

    // Main panel - full screen on mobile, constrained on desktop
    const panelWidth = isMobile ? width - 20 : Math.min(920, width - 40);
    const panelHeight = isMobile ? height - 20 : Math.min(580, height - 40);

    // Panel background with glow
    const outerGlow = this.scene.add.rectangle(
      width / 2, height / 2,
      panelWidth + 16, panelHeight + 16,
      PALETTE.purple[500], 0.12
    );
    this.container.add(outerGlow);

    const panelBg = this.scene.add.rectangle(
      width / 2, height / 2,
      panelWidth, panelHeight,
      PALETTE.purple[900], 0.98
    );
    panelBg.setStrokeStyle(SIZES.PANEL_BORDER_WIDTH, PALETTE.purple[500], 0.8);
    this.container.add(panelBg);

    // Title area - more compact on mobile
    const titleY = height / 2 - panelHeight / 2 + (isMobile ? 22 : 30);

    const title = this.createText(width / 2, titleY, 'Choose Your Blessing', {
      fontSize: isMobile ? '22px' : FONTS.SIZE_HEADING,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);
    this.container.add(title);

    // Subtitle
    const subtitle = this.createText(width / 2, titleY + (isMobile ? 22 : 28), isMobile ? 'Aids you for the rest of your run' : 'This blessing will aid you for the rest of your run', {
      fontSize: isMobile ? '14px' : FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SECONDARY,
    });
    subtitle.setOrigin(0.5, 0.5);
    this.container.add(subtitle);

    // Next curse warning box (with padding from subtitle)
    const curseBoxY = titleY + (isMobile ? 75 : 90);
    const curseBoxWidth = panelWidth - (isMobile ? 20 : 60);
    const curseBoxHeight = isMobile ? 55 : 60;

    const curseBox = this.scene.add.rectangle(
      width / 2, curseBoxY,
      curseBoxWidth, curseBoxHeight,
      PALETTE.red[800], 0.4
    );
    curseBox.setStrokeStyle(1, PALETTE.red[500], 0.5);
    this.container.add(curseBox);

    // Get next curse info (Mode 2)
    const nextCurse = MODE_CONFIGS[2];

    // Row 1: Warning icons + title all on same line
    const row1Y = curseBoxY - (isMobile ? 12 : 10);
    const iconOffset = isMobile ? 25 : 35;

    const curseIconLeft = this.createText(width / 2 - curseBoxWidth / 2 + iconOffset, row1Y, '⚠️', {
      fontSize: isMobile ? '18px' : '24px',
      fontFamily: FONTS.FAMILY,
    });
    curseIconLeft.setOrigin(0.5, 0.5);
    this.container.add(curseIconLeft);

    const curseIconRight = this.createText(width / 2 + curseBoxWidth / 2 - iconOffset, row1Y, '⚠️', {
      fontSize: isMobile ? '18px' : '24px',
      fontFamily: FONTS.FAMILY,
    });
    curseIconRight.setOrigin(0.5, 0.5);
    this.container.add(curseIconRight);

    const curseTitle = this.createText(width / 2, row1Y, `NEXT: ${nextCurse.name}`, {
      fontSize: isMobile ? '15px' : FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_DANGER,
      fontStyle: 'bold',
    });
    curseTitle.setOrigin(0.5, 0.5);
    this.container.add(curseTitle);

    // Row 2: Description (with extra spacing - "double return")
    const row2Y = curseBoxY + (isMobile ? 14 : 12);
    const curseDesc = this.createText(width / 2, row2Y, nextCurse.description, {
      fontSize: isMobile ? '13px' : FONTS.SIZE_TINY,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_WARNING,
    });
    curseDesc.setOrigin(0.5, 0.5);
    this.container.add(curseDesc);

    // Cards area - vertical on mobile, horizontal on desktop
    const blessingIds: BlessingId[] = ['expansion', 'sacrifice', 'insurance'];

    if (isMobile) {
      // Mobile: 3 rows, 1 column - horizontal cards with full info
      const cardWidth = panelWidth - 30;
      const cardHeight = 170;
      const cardSpacing = 8;
      const cardsStartY = curseBoxY + curseBoxHeight / 2 + 18;

      blessingIds.forEach((id, index) => {
        const cardX = (width - cardWidth) / 2;
        const cardY = cardsStartY + index * (cardHeight + cardSpacing);
        const isImplemented = IMPLEMENTED_BLESSINGS.has(id);
        this.createBlessingCardMobile(cardX, cardY, cardWidth, cardHeight, id, isImplemented);
      });
    } else {
      // Desktop: 1 row, 3 columns
      const cardAreaY = curseBoxY + curseBoxHeight / 2 + 25;
      const cardWidth = 270;
      const cardHeight = 320;
      const cardSpacing = 20;
      const totalCardsWidth = cardWidth * 3 + cardSpacing * 2;
      const cardsStartX = (width - totalCardsWidth) / 2;

      blessingIds.forEach((id, index) => {
        const cardX = cardsStartX + index * (cardWidth + cardSpacing);
        const isImplemented = IMPLEMENTED_BLESSINGS.has(id);
        this.createBlessingCard(cardX, cardAreaY, cardWidth, cardHeight, id, isImplemented);
      });
    }

    // Continue button (disabled until blessing selected)
    const buttonY = height / 2 + panelHeight / 2 - 45;
    this.createContinueButton(width / 2, buttonY);

    // Glow pulse animation
    this.scene.tweens.add({
      targets: outerGlow,
      alpha: 0.2,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Entrance animation
    this.container.setAlpha(0);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 300,
      ease: 'Quad.easeOut',
    });
  }

  private createBlessingCard(
    x: number,
    y: number,
    cardWidth: number,
    cardHeight: number,
    blessingId: BlessingId,
    isImplemented: boolean
  ): void {
    const config = BLESSING_CONFIGS[blessingId];
    const card = this.scene.add.container(x, y);
    this.container.add(card);

    // Card background - dimmer if not implemented
    const cardBg = this.scene.add.rectangle(
      cardWidth / 2, cardHeight / 2,
      cardWidth, cardHeight,
      isImplemented ? PALETTE.purple[800] : PALETTE.neutral[800],
      isImplemented ? 0.95 : 0.7
    );
    cardBg.setStrokeStyle(2, isImplemented ? PALETTE.purple[500] : PALETTE.neutral[600], 0.6);
    card.add(cardBg);

    // Card glow (hidden by default, only for implemented)
    const cardGlow = this.scene.add.rectangle(
      cardWidth / 2, cardHeight / 2,
      cardWidth + 8, cardHeight + 8,
      PALETTE.green[500], 0
    );
    card.add(cardGlow);
    card.sendToBack(cardGlow);

    let yPos = 28;

    // Icon (large, centered) - dimmer if not implemented
    const icon = this.createText(cardWidth / 2, yPos, config.icon, {
      fontSize: '42px',
      fontFamily: FONTS.FAMILY,
    });
    icon.setOrigin(0.5, 0.5);
    if (!isImplemented) icon.setAlpha(0.5);
    card.add(icon);
    yPos += 40;

    // Name
    const name = this.createText(cardWidth / 2, yPos, config.name, {
      fontSize: FONTS.SIZE_BODY,
      fontFamily: FONTS.FAMILY,
      color: isImplemented ? COLORS.TEXT_PRIMARY : COLORS.TEXT_MUTED,
      fontStyle: 'bold',
    });
    name.setOrigin(0.5, 0.5);
    card.add(name);
    yPos += 20;

    // Subtitle
    const subtitle = this.createText(cardWidth / 2, yPos, config.subtitle, {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: isImplemented ? COLORS.TEXT_ACCENT : COLORS.TEXT_DISABLED,
    });
    subtitle.setOrigin(0.5, 0.5);
    card.add(subtitle);
    yPos += 25;

    // Divider
    const divider = this.scene.add.rectangle(
      cardWidth / 2, yPos,
      cardWidth - 40, 1,
      isImplemented ? PALETTE.purple[500] : PALETTE.neutral[600],
      0.4
    );
    card.add(divider);
    yPos += 18;

    // Description
    const desc = this.createText(cardWidth / 2, yPos, config.description, {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: isImplemented ? COLORS.TEXT_SECONDARY : COLORS.TEXT_DISABLED,
      wordWrap: { width: cardWidth - 30 },
      align: 'center',
    });
    desc.setOrigin(0.5, 0);
    card.add(desc);
    yPos += 50;

    // Benefits list
    config.benefits.forEach((benefit) => {
      const bulletText = this.createText(20, yPos, `+ ${benefit}`, {
        fontSize: FONTS.SIZE_SMALL,
        fontFamily: FONTS.FAMILY,
        color: isImplemented ? COLORS.TEXT_SUCCESS : COLORS.TEXT_DISABLED,
        wordWrap: { width: cardWidth - 40 },
      });
      bulletText.setOrigin(0, 0);
      card.add(bulletText);
      yPos += bulletText.height + 6;
    });

    // "Coming Soon" badge for unimplemented cards
    const bottomY = cardHeight - 30;

    if (isImplemented) {
      // Make interactive only if implemented
      cardBg.setInteractive({ useHandCursor: true });

      // Hover effects
      cardBg.on('pointerover', () => {
        if (this.selectedCard !== card) {
          cardBg.setFillStyle(PALETTE.purple[700], 1);
          cardBg.setStrokeStyle(2, PALETTE.purple[400], 0.8);
          this.scene.tweens.add({
            targets: card,
            y: y - 5,
            duration: 150,
            ease: 'Quad.easeOut',
          });
        }
      });

      cardBg.on('pointerout', () => {
        if (this.selectedCard !== card) {
          cardBg.setFillStyle(PALETTE.purple[800], 0.95);
          cardBg.setStrokeStyle(2, PALETTE.purple[500], 0.6);
          this.scene.tweens.add({
            targets: card,
            y: y,
            duration: 150,
            ease: 'Quad.easeOut',
          });
        }
      });

      // Click to select
      cardBg.on('pointerdown', () => {
        this.selectBlessing(card, cardBg, cardGlow, blessingId, y);
      });
    } else {
      // "Coming Soon" badge
      const comingSoonBg = this.scene.add.rectangle(
        cardWidth / 2, bottomY,
        100, 24,
        PALETTE.neutral[700], 0.8
      );
      comingSoonBg.setStrokeStyle(1, PALETTE.neutral[500], 0.5);
      card.add(comingSoonBg);

      const comingSoon = this.createText(cardWidth / 2, bottomY, 'COMING SOON', {
        fontSize: '10px',
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_MUTED,
        fontStyle: 'bold',
      });
      comingSoon.setOrigin(0.5, 0.5);
      card.add(comingSoon);
    }
  }

  /** Mobile-optimized horizontal card layout */
  private createBlessingCardMobile(
    x: number,
    y: number,
    cardWidth: number,
    cardHeight: number,
    blessingId: BlessingId,
    isImplemented: boolean
  ): void {
    const config = BLESSING_CONFIGS[blessingId];
    const card = this.scene.add.container(x, y);
    this.container.add(card);

    // Card background
    const cardBg = this.scene.add.rectangle(
      cardWidth / 2, cardHeight / 2,
      cardWidth, cardHeight,
      isImplemented ? PALETTE.purple[800] : PALETTE.neutral[800],
      isImplemented ? 0.95 : 0.7
    );
    cardBg.setStrokeStyle(1, isImplemented ? PALETTE.purple[500] : PALETTE.neutral[600], 0.6);
    card.add(cardBg);

    // Card glow (hidden by default)
    const cardGlow = this.scene.add.rectangle(
      cardWidth / 2, cardHeight / 2,
      cardWidth + 6, cardHeight + 6,
      PALETTE.green[500], 0
    );
    card.add(cardGlow);
    card.sendToBack(cardGlow);

    // Horizontal layout: Icon on left | Vertically centered text content
    const iconX = 45;
    const textStartX = 80;

    // Calculate content height to center vertically
    const lineHeights = {
      name: 22,
      subtitle: 18,
      description: 16,
      benefit: 16,
      badge: 24,
      spacing: 6,
    };

    const maxBenefits = Math.min(2, config.benefits.length);
    let totalContentHeight = lineHeights.name + lineHeights.spacing +
                             lineHeights.subtitle + lineHeights.spacing +
                             lineHeights.description + lineHeights.spacing +
                             (maxBenefits * lineHeights.benefit) + ((maxBenefits - 1) * 4);

    if (!isImplemented) {
      totalContentHeight += lineHeights.spacing + lineHeights.badge;
    }

    // Start Y position to center content
    const startY = (cardHeight - totalContentHeight) / 2;
    let currentY = startY;

    // Icon (centered vertically in card)
    const icon = this.createText(iconX, cardHeight / 2, config.icon, {
      fontSize: '36px',
      fontFamily: FONTS.FAMILY,
    });
    icon.setOrigin(0.5, 0.5);
    if (!isImplemented) icon.setAlpha(0.5);
    card.add(icon);

    // Name
    const name = this.createText(textStartX, currentY + lineHeights.name / 2, config.name, {
      fontSize: '20px',
      fontFamily: FONTS.FAMILY,
      color: isImplemented ? COLORS.TEXT_PRIMARY : COLORS.TEXT_MUTED,
      fontStyle: 'bold',
    });
    name.setOrigin(0, 0.5);
    card.add(name);
    currentY += lineHeights.name + lineHeights.spacing;

    // Subtitle
    const subtitle = this.createText(textStartX, currentY + lineHeights.subtitle / 2, config.subtitle, {
      fontSize: '14px',
      fontFamily: FONTS.FAMILY,
      color: isImplemented ? COLORS.TEXT_ACCENT : COLORS.TEXT_DISABLED,
    });
    subtitle.setOrigin(0, 0.5);
    card.add(subtitle);
    currentY += lineHeights.subtitle + lineHeights.spacing;

    // Description
    const desc = this.createText(textStartX, currentY + lineHeights.description / 2, config.description, {
      fontSize: '13px',
      fontFamily: FONTS.FAMILY,
      color: isImplemented ? COLORS.TEXT_SECONDARY : COLORS.TEXT_DISABLED,
      wordWrap: { width: cardWidth - textStartX - 25 },
    });
    desc.setOrigin(0, 0.5);
    card.add(desc);
    currentY += lineHeights.description + lineHeights.spacing;

    // Benefits
    for (let i = 0; i < maxBenefits; i++) {
      const benefit = this.createText(textStartX, currentY + lineHeights.benefit / 2, `+ ${config.benefits[i]}`, {
        fontSize: '13px',
        fontFamily: FONTS.FAMILY,
        color: isImplemented ? COLORS.TEXT_SUCCESS : COLORS.TEXT_DISABLED,
      });
      benefit.setOrigin(0, 0.5);
      card.add(benefit);
      currentY += lineHeights.benefit + (i < maxBenefits - 1 ? 4 : 0);
    }

    // "Coming Soon" badge at bottom of content for unimplemented
    if (!isImplemented) {
      currentY += lineHeights.spacing;
      const badgeY = currentY + lineHeights.badge / 2;
      const comingSoonBg = this.scene.add.rectangle(
        cardWidth / 2, badgeY,
        100, 20,
        PALETTE.neutral[700], 0.9
      );
      comingSoonBg.setStrokeStyle(1, PALETTE.neutral[500], 0.5);
      card.add(comingSoonBg);

      const comingSoon = this.createText(cardWidth / 2, badgeY, 'COMING SOON', {
        fontSize: '11px',
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_MUTED,
        fontStyle: 'bold',
      });
      comingSoon.setOrigin(0.5, 0.5);
      card.add(comingSoon);
    } else {
      // Make interactive
      cardBg.setInteractive({ useHandCursor: true });

      cardBg.on('pointerover', () => {
        if (this.selectedCard !== card) {
          cardBg.setFillStyle(PALETTE.purple[700], 1);
          cardBg.setStrokeStyle(1, PALETTE.purple[400], 0.8);
        }
      });

      cardBg.on('pointerout', () => {
        if (this.selectedCard !== card) {
          cardBg.setFillStyle(PALETTE.purple[800], 0.95);
          cardBg.setStrokeStyle(1, PALETTE.purple[500], 0.6);
        }
      });

      cardBg.on('pointerdown', () => {
        this.selectBlessing(card, cardBg, cardGlow, blessingId, y);
      });
    }
  }

  private selectBlessing(
    card: Phaser.GameObjects.Container,
    cardBg: Phaser.GameObjects.Rectangle,
    cardGlow: Phaser.GameObjects.Rectangle,
    blessingId: BlessingId,
    originalY: number
  ): void {
    // If clicking the same card, toggle it off (deselect)
    if (this.selectedCard === card) {
      this.deselectCurrentCard();
      this.disableContinueButton();
      return;
    }

    // Deselect previous
    if (this.selectedCard) {
      const prevData = this.selectedCard.getData('selectData') as {
        bg: Phaser.GameObjects.Rectangle;
        glow: Phaser.GameObjects.Rectangle;
        y: number;
      };
      if (prevData) {
        prevData.bg.setFillStyle(PALETTE.purple[800], 0.95);
        prevData.bg.setStrokeStyle(2, PALETTE.purple[500], 0.6);
        this.scene.tweens.add({
          targets: prevData.glow,
          alpha: 0,
          duration: 150,
        });
      }
    }

    // Select this card
    this.selectedCard = card;
    this.selectedBlessingId = blessingId;
    card.setData('selectData', { bg: cardBg, glow: cardGlow, y: originalY });

    cardBg.setFillStyle(PALETTE.green[800], 1);
    cardBg.setStrokeStyle(3, PALETTE.green[400], 1);

    this.scene.tweens.add({
      targets: cardGlow,
      alpha: 0.15,
      duration: 200,
    });

    // Enable the Continue button
    this.enableContinueButton();
  }

  private deselectCurrentCard(): void {
    if (!this.selectedCard) return;

    const prevData = this.selectedCard.getData('selectData') as {
      bg: Phaser.GameObjects.Rectangle;
      glow: Phaser.GameObjects.Rectangle;
      y: number;
    };
    if (prevData) {
      prevData.bg.setFillStyle(PALETTE.purple[800], 0.95);
      prevData.bg.setStrokeStyle(2, PALETTE.purple[500], 0.6);
      this.scene.tweens.add({
        targets: prevData.glow,
        alpha: 0,
        duration: 150,
      });
    }

    this.selectedCard = null;
    this.selectedBlessingId = null;
  }

  private disableContinueButton(): void {
    if (!this.continueButton || !this.continueButtonText || !this.continueButtonGlow) return;

    // Remove interactivity and listeners
    this.continueButton.disableInteractive();
    this.continueButton.removeAllListeners();

    // Update styling to disabled state
    this.continueButton.setFillStyle(PALETTE.neutral[700], 0.6);
    this.continueButton.setStrokeStyle(2, PALETTE.neutral[500], 0.4);
    this.continueButtonText.setColor(COLORS.TEXT_DISABLED);

    // Fade out glow
    this.scene.tweens.add({
      targets: this.continueButtonGlow,
      alpha: 0,
      duration: 200,
    });
  }

  private createContinueButton(x: number, y: number): void {
    const btnWidth = 200;
    const btnHeight = 50;

    // Button glow (hidden until enabled)
    this.continueButtonGlow = this.scene.add.rectangle(x, y, btnWidth + 10, btnHeight + 10, PALETTE.green[500], 0);
    this.container.add(this.continueButtonGlow);

    // Button background (disabled state)
    this.continueButton = this.scene.add.rectangle(x, y, btnWidth, btnHeight, PALETTE.neutral[700], 0.6);
    this.continueButton.setStrokeStyle(2, PALETTE.neutral[500], 0.4);
    this.container.add(this.continueButton);

    // Button text
    this.continueButtonText = this.createText(x, y, 'CONTINUE', {
      fontSize: FONTS.SIZE_BODY,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_DISABLED,
      fontStyle: 'bold',
    });
    this.continueButtonText.setOrigin(0.5, 0.5);
    this.container.add(this.continueButtonText);
  }

  private enableContinueButton(): void {
    if (!this.continueButton || !this.continueButtonText || !this.continueButtonGlow) return;

    // Update styling to enabled state
    this.continueButton.setFillStyle(PALETTE.green[700], 0.95);
    this.continueButton.setStrokeStyle(2, PALETTE.green[500], 0.8);
    this.continueButtonText.setColor(COLORS.TEXT_SUCCESS);

    // Add glow
    this.scene.tweens.add({
      targets: this.continueButtonGlow,
      alpha: 0.15,
      duration: 200,
    });

    // Make interactive
    this.continueButton.setInteractive({ useHandCursor: true });

    // Hover effects
    this.continueButton.on('pointerover', () => {
      this.continueButton?.setFillStyle(PALETTE.green[600], 1);
      this.continueButton?.setStrokeStyle(2, PALETTE.green[400], 1);
      this.continueButtonGlow?.setAlpha(0.25);
    });

    this.continueButton.on('pointerout', () => {
      this.continueButton?.setFillStyle(PALETTE.green[700], 0.95);
      this.continueButton?.setStrokeStyle(2, PALETTE.green[500], 0.8);
      this.continueButtonGlow?.setAlpha(0.15);
    });

    this.continueButton.on('pointerdown', () => {
      if (this.selectedBlessingId) {
        this.confirmChoice(this.selectedBlessingId);
      }
    });
  }

  private confirmChoice(blessingId: BlessingId): void {
    // Disable interactions on all children
    this.container.each((child: Phaser.GameObjects.GameObject) => {
      if ('disableInteractive' in child) {
        (child as Phaser.GameObjects.Rectangle).disableInteractive();
      }
    });

    // Flash effect
    this.scene.cameras.main.flash(200, 100, 255, 100);

    // Fade container slightly, then fade camera to black
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0.3,
      duration: 200,
      ease: 'Quad.easeIn',
      onComplete: () => {
        // Fade camera to black before loading next scene
        this.scene.cameras.main.fadeOut(400, 0, 0, 0);
        this.scene.cameras.main.once('camerafadeoutcomplete', () => {
          this.callbacks.onSelect(blessingId);
          this.destroy();
        });
      },
    });
  }

  private createText(
    x: number,
    y: number,
    content: string,
    style: Phaser.Types.GameObjects.Text.TextStyle
  ): Phaser.GameObjects.Text {
    const text = this.scene.add.text(x, y, content, style);
    text.setResolution(window.devicePixelRatio * 2);
    return text;
  }

  public destroy(): void {
    this.container.destroy();
  }
}
