/**
 * Blessing Choice Panel
 * Popup-style panel for blessing selection after Mode 1
 * Similar to end-screen-overlay sizing approach
 */

import Phaser from 'phaser';
import { FONTS, PALETTE, COLORS, SIZES, TIMING, FLASH, LAYOUT } from '@/config';
import { createText } from '@/ui/ui-utils';
import { BLESSING_CONFIGS, type BlessingId } from '@/systems/blessings';
import { getImplementedBlessings } from '@/data/blessings';
import { toDPR, getGameplayLayout } from '@/systems/responsive';

interface BlessingPanelLayout {
  panelWidth: number;
  panelHeight: number;
  panelX: number;
  panelY: number;
  titleY: number;
  subtitleY: number;
  chooseLabelY: number;
  cardsAreaY: number;
  buttonY: number;
  cardWidth: number;
  cardHeight: number;
  cardSpacing: number;
  combinedScale: number;
}

/**
 * Calculate blessing panel layout - popup style with content-driven height
 * Uses combinedScale from responsive system for viewport-based scaling
 */
function getBlessingPanelLayout(
  scene: Phaser.Scene
): BlessingPanelLayout {
  const L = LAYOUT.blessingPanel;
  const { width: screenWidth, height: screenHeight } = scene.cameras.main;

  // Get combinedScale from the responsive system (single source of truth)
  const { combinedScale } = getGameplayLayout(scene).viewport;

  // Helper to scale CSS pixels to device pixels with viewport scaling
  const scale = (cssValue: number): number => Math.round(toDPR(cssValue) * combinedScale);

  // Scale layout values
  const panelWidth = scale(L.PANEL_WIDTH);
  const panelPadding = scale(L.PANEL_PADDING);
  const titleHeight = scale(L.TITLE_HEIGHT);
  const subtitleHeight = scale(L.SUBTITLE_HEIGHT);
  const gapTitleToSubtitle = scale(L.GAP_TITLE_TO_SUBTITLE);
  const gapSubtitleToChoose = scale(L.GAP_SUBTITLE_TO_CHOOSE);
  const gapChooseToCards = scale(L.GAP_CHOOSE_TO_CARDS);
  const gapCardsToButton = scale(L.GAP_CARDS_TO_BUTTON);
  const continueButtonHeight = scale(L.CONTINUE_BUTTON_HEIGHT);
  const cardHeight = scale(L.CARD_HEIGHT);
  const cardSpacing = scale(L.CARD_SPACING);
  const cardPadding = scale(L.CARD_PADDING);

  // Calculate content height
  let contentHeight = 0;

  // Title group
  contentHeight += titleHeight;
  contentHeight += gapTitleToSubtitle;
  contentHeight += subtitleHeight;
  contentHeight += gapSubtitleToChoose;

  // "Choose Your Blessing" label (use body font height)
  const chooseLabelHeight = scale(16);
  contentHeight += chooseLabelHeight;
  contentHeight += gapChooseToCards;

  // 4 cards with spacing
  const totalCardsHeight = 4 * cardHeight + 3 * cardSpacing;
  contentHeight += totalCardsHeight;
  contentHeight += gapCardsToButton;

  // Button
  contentHeight += continueButtonHeight;

  // Panel dimensions
  const panelHeight = contentHeight + panelPadding * 2;

  // Center panel on screen
  const panelX = (screenWidth - panelWidth) / 2;
  const panelY = (screenHeight - panelHeight) / 2;

  // Calculate Y positions (relative to screen, not panel)
  let y = panelY + panelPadding;

  const titleY = y + titleHeight / 2;
  y += titleHeight + gapTitleToSubtitle;

  const subtitleY = y + subtitleHeight / 2;
  y += subtitleHeight + gapSubtitleToChoose;

  const chooseLabelY = y + chooseLabelHeight / 2;
  y += chooseLabelHeight + gapChooseToCards;

  const cardsAreaY = y;
  y += totalCardsHeight + gapCardsToButton;

  const buttonY = y + continueButtonHeight / 2;

  // Card dimensions (full width minus padding)
  const cardWidth = panelWidth - cardPadding * 2;

  return {
    panelWidth,
    panelHeight,
    panelX,
    panelY,
    titleY,
    subtitleY,
    chooseLabelY,
    cardsAreaY,
    buttonY,
    cardWidth,
    cardHeight,
    cardSpacing,
    combinedScale,
  };
}

export interface BlessingChoiceCallbacks {
  onSelect: (blessingId: BlessingId) => void;
  onCancel?: () => void;
}

// Which blessings are currently implemented (driven by data/blessings.ts)
const IMPLEMENTED_BLESSINGS: Set<BlessingId> = new Set(
  getImplementedBlessings().map(b => b.id)
);

export class BlessingChoicePanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private callbacks: BlessingChoiceCallbacks;
  private selectedCard: Phaser.GameObjects.Container | null = null;
  private selectedBlessingId: BlessingId | null = null;
  private continueButton: Phaser.GameObjects.Rectangle | null = null;
  private continueButtonText: Phaser.GameObjects.Text | null = null;
  private continueButtonGlow: Phaser.GameObjects.Rectangle | null = null;
  private layout: BlessingPanelLayout;

  constructor(scene: Phaser.Scene, callbacks: BlessingChoiceCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(200);

    // Calculate layout using responsive system
    this.layout = getBlessingPanelLayout(this.scene);

    this.create();
  }

  /** Scale CSS pixels to device pixels with viewport scaling */
  private scale(cssValue: number): number {
    return Math.round(toDPR(cssValue) * this.layout.combinedScale);
  }

  private create(): void {
    const { width, height } = this.scene.cameras.main;
    const L = this.layout;

    // Dark overlay (full screen)
    const overlay = this.scene.add.rectangle(
      width / 2, height / 2,
      width, height,
      COLORS.OVERLAY, 0.9
    );
    overlay.setInteractive(); // Block clicks behind
    this.container.add(overlay);

    // Panel center position
    const panelCenterX = L.panelX + L.panelWidth / 2;
    const panelCenterY = L.panelY + L.panelHeight / 2;

    // Main panel background
    const panelBg = this.scene.add.rectangle(
      panelCenterX, panelCenterY,
      L.panelWidth, L.panelHeight,
      PALETTE.purple[900], 0.98
    );
    panelBg.setStrokeStyle(this.scale(SIZES.PANEL_BORDER_WIDTH), PALETTE.purple[500], 0.8);
    this.container.add(panelBg);

    // Corner accents
    const cornerSize = this.scale(SIZES.PANEL_CORNER_SIZE);
    const cornerInset = this.scale(SIZES.PANEL_CORNER_INSET);
    const corners = [
      { x: L.panelX + cornerInset, y: L.panelY + cornerInset, ax: 1, ay: 1 },
      { x: L.panelX + L.panelWidth - cornerInset, y: L.panelY + cornerInset, ax: -1, ay: 1 },
      { x: L.panelX + L.panelWidth - cornerInset, y: L.panelY + L.panelHeight - cornerInset, ax: -1, ay: -1 },
      { x: L.panelX + cornerInset, y: L.panelY + L.panelHeight - cornerInset, ax: 1, ay: -1 },
    ];
    corners.forEach(corner => {
      const accent = this.scene.add.graphics();
      accent.lineStyle(this.scale(2), PALETTE.purple[400], 0.6);
      accent.beginPath();
      accent.moveTo(corner.x, corner.y + cornerSize * corner.ay);
      accent.lineTo(corner.x, corner.y);
      accent.lineTo(corner.x + cornerSize * corner.ax, corner.y);
      accent.strokePath();
      this.container.add(accent);
    });

    // Title
    const title = createText(this.scene, panelCenterX, L.titleY, 'The Curse Weakens...', {
      fontSize: FONTS.SIZE_SUBHEADING,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_WARNING,
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);
    this.container.add(title);

    // Narrative subtitle
    const subtitle = createText(this.scene, panelCenterX, L.subtitleY,
      'Choose a blessing for the trials ahead.', {
        fontSize: FONTS.SIZE_SMALL,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_SECONDARY,
      });
    subtitle.setOrigin(0.5, 0.5);
    this.container.add(subtitle);

    // "Choose Your Blessing" label above cards
    const chooseLabel = createText(this.scene, panelCenterX, L.chooseLabelY, 'Choose Your Blessing', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_ACCENT,
      fontStyle: 'bold',
    });
    chooseLabel.setOrigin(0.5, 0.5);
    this.container.add(chooseLabel);

    // Cards - 4 compact rows
    const blessingIds: BlessingId[] = ['abundance', 'mercy', 'sanctuary', 'sixth'];
    const cardStartX = L.panelX + (L.panelWidth - L.cardWidth) / 2;
    blessingIds.forEach((id, index) => {
      const cardY = L.cardsAreaY + index * (L.cardHeight + L.cardSpacing);
      const isImplemented = IMPLEMENTED_BLESSINGS.has(id);
      this.createBlessingCard(cardStartX, cardY, L.cardWidth, L.cardHeight, id, isImplemented);
    });

    // Continue button (disabled until blessing selected)
    this.createContinueButton(panelCenterX, L.buttonY);

    // Entrance animation
    this.container.setAlpha(0);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: SIZES.ANIM_ENTRANCE,
      ease: 'Quad.easeOut',
    });
  }

  /** Card layout for blessing selection with full descriptions */
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

    // Outer glow (gold for implemented, muted for unimplemented)
    const glowPadding = this.scale(6);
    const outerGlow = this.scene.add.rectangle(
      cardWidth / 2, cardHeight / 2,
      cardWidth + glowPadding, cardHeight + glowPadding,
      isImplemented ? PALETTE.gold[500] : PALETTE.neutral[600],
      isImplemented ? 0.08 : 0.04
    );
    card.add(outerGlow);

    // Card background
    const cardBg = this.scene.add.rectangle(
      cardWidth / 2, cardHeight / 2,
      cardWidth, cardHeight,
      isImplemented ? PALETTE.purple[800] : PALETTE.neutral[800],
      isImplemented ? 0.95 : 0.7
    );
    cardBg.setStrokeStyle(this.scale(2), isImplemented ? PALETTE.gold[600] : PALETTE.neutral[600], isImplemented ? 0.5 : 0.3);
    card.add(cardBg);

    // Corner accents (gold for implemented cards)
    if (isImplemented) {
      const cornerSize = this.scale(SIZES.PANEL_CORNER_SIZE);
      const cornerInset = this.scale(SIZES.PANEL_CORNER_INSET);
      const corners = [
        { cx: cornerInset, cy: cornerInset, ax: 1, ay: 1 },
        { cx: cardWidth - cornerInset, cy: cornerInset, ax: -1, ay: 1 },
        { cx: cardWidth - cornerInset, cy: cardHeight - cornerInset, ax: -1, ay: -1 },
        { cx: cornerInset, cy: cardHeight - cornerInset, ax: 1, ay: -1 },
      ];
      corners.forEach(corner => {
        const accent = this.scene.add.graphics();
        accent.lineStyle(this.scale(2), PALETTE.gold[500], 0.6);
        accent.beginPath();
        accent.moveTo(corner.cx, corner.cy + cornerSize * corner.ay);
        accent.lineTo(corner.cx, corner.cy);
        accent.lineTo(corner.cx + cornerSize * corner.ax, corner.cy);
        accent.strokePath();
        card.add(accent);
      });
    }

    // Selection glow (hidden by default, shown when selected)
    const cardGlow = this.scene.add.rectangle(
      cardWidth / 2, cardHeight / 2,
      cardWidth + 4, cardHeight + 4,
      PALETTE.green[500], 0
    );
    card.add(cardGlow);
    card.sendToBack(cardGlow);
    card.sendToBack(outerGlow);

    // Layout: Icon | "Name: Subtitle" on first line, Description on second
    const iconX = this.scale(26);
    const textStartX = this.scale(50);

    // Icon (centered vertically)
    const icon = createText(this.scene, iconX, cardHeight / 2, config.icon, {
      fontSize: FONTS.SIZE_BODY,
      fontFamily: FONTS.FAMILY,
    });
    icon.setOrigin(0.5, 0.5);
    if (!isImplemented) icon.setAlpha(0.5);
    card.add(icon);

    // Name (purple/accent) + Subtitle (white) on same line
    const blessingName = config.name.replace('Blessing of ', '');
    const nameY = this.scale(18);
    const nameText = createText(this.scene, textStartX, nameY, `${blessingName}: `, {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: isImplemented ? COLORS.TEXT_ACCENT : COLORS.TEXT_MUTED,
      fontStyle: 'bold',
    });
    nameText.setOrigin(0, 0.5);
    card.add(nameText);

    const subtitleText = createText(this.scene, textStartX + nameText.width, nameY, config.subtitle, {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: isImplemented ? COLORS.TEXT_PRIMARY : COLORS.TEXT_MUTED,
      fontStyle: 'bold',
    });
    subtitleText.setOrigin(0, 0.5);
    card.add(subtitleText);

    // Full description below (for implemented blessings)
    const descY = this.scale(34);
    const descWidth = cardWidth - textStartX - this.scale(10);
    if (isImplemented) {
      const desc = createText(this.scene, textStartX, descY, config.description, {
        fontSize: FONTS.SIZE_SMALL,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_SECONDARY,
        wordWrap: { width: descWidth },
      });
      desc.setOrigin(0, 0);
      card.add(desc);
    } else {
      // Just show subtitle for unimplemented
      const desc = createText(this.scene, textStartX, descY, config.subtitle, {
        fontSize: FONTS.SIZE_SMALL,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_DISABLED,
      });
      desc.setOrigin(0, 0);
      card.add(desc);
    }

    // "Coming Soon" badge on right for unimplemented
    if (!isImplemented) {
      const badgeX = cardWidth - this.scale(32);
      const badgeY = cardHeight / 2;
      const comingSoonBg = this.scene.add.rectangle(
        badgeX, badgeY,
        this.scale(48), this.scale(18),
        PALETTE.neutral[700], 0.9
      );
      comingSoonBg.setStrokeStyle(this.scale(1), PALETTE.neutral[500], 0.5);
      card.add(comingSoonBg);

      const comingSoon = createText(this.scene, badgeX, badgeY, 'SOON', {
        fontSize: FONTS.SIZE_NANO,
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
          cardBg.setStrokeStyle(this.scale(2), PALETTE.gold[500], 0.8);
          outerGlow.setAlpha(0.15);
        }
      });

      cardBg.on('pointerout', () => {
        if (this.selectedCard !== card) {
          cardBg.setFillStyle(PALETTE.purple[800], 0.95);
          cardBg.setStrokeStyle(this.scale(2), PALETTE.gold[600], 0.5);
          outerGlow.setAlpha(0.08);
        }
      });

      cardBg.on('pointerdown', () => {
        this.selectBlessing(card, cardBg, cardGlow, outerGlow, blessingId, y);
      });
    }
  }

  private selectBlessing(
    card: Phaser.GameObjects.Container,
    cardBg: Phaser.GameObjects.Rectangle,
    cardGlow: Phaser.GameObjects.Rectangle,
    outerGlow: Phaser.GameObjects.Rectangle,
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
        outerGlow: Phaser.GameObjects.Rectangle;
        y: number;
      };
      if (prevData) {
        prevData.bg.setFillStyle(PALETTE.purple[800], 0.95);
        prevData.bg.setStrokeStyle(this.scale(2), PALETTE.gold[600], 0.5);
        prevData.outerGlow.setAlpha(0.08);
        this.scene.tweens.add({
          targets: prevData.glow,
          alpha: 0,
          duration: SIZES.ANIM_QUICK,
        });
      }
    }

    // Select this card
    this.selectedCard = card;
    this.selectedBlessingId = blessingId;
    card.setData('selectData', { bg: cardBg, glow: cardGlow, outerGlow, y: originalY });

    // Use gold/yellow for selection to match card theme
    cardBg.setFillStyle(PALETTE.gold[800], 1);
    cardBg.setStrokeStyle(this.scale(2), PALETTE.gold[400], 1);
    outerGlow.setFillStyle(PALETTE.gold[400]);
    outerGlow.setAlpha(0.2);

    // Selection glow uses gold
    cardGlow.setFillStyle(PALETTE.gold[500]);
    this.scene.tweens.add({
      targets: cardGlow,
      alpha: 0.15,
      duration: SIZES.ANIM_NORMAL,
    });

    // Enable the Continue button
    this.enableContinueButton();
  }

  private deselectCurrentCard(): void {
    if (!this.selectedCard) return;

    const prevData = this.selectedCard.getData('selectData') as {
      bg: Phaser.GameObjects.Rectangle;
      glow: Phaser.GameObjects.Rectangle;
      outerGlow: Phaser.GameObjects.Rectangle;
      y: number;
    };
    if (prevData) {
      prevData.bg.setFillStyle(PALETTE.purple[800], 0.95);
      prevData.bg.setStrokeStyle(this.scale(2), PALETTE.gold[600], 0.5);
      prevData.outerGlow.setFillStyle(PALETTE.gold[500]);
      prevData.outerGlow.setAlpha(0.08);
      this.scene.tweens.add({
        targets: prevData.glow,
        alpha: 0,
        duration: SIZES.ANIM_QUICK,
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
    this.continueButton.setStrokeStyle(this.scale(2), PALETTE.neutral[500], 0.4);
    this.continueButtonText.setColor(COLORS.TEXT_DISABLED);

    // Fade out glow
    this.scene.tweens.add({
      targets: this.continueButtonGlow,
      alpha: 0,
      duration: SIZES.ANIM_NORMAL,
    });
  }

  private createContinueButton(x: number, y: number): void {
    const btnWidth = this.scale(LAYOUT.blessingPanel.CONTINUE_BUTTON_WIDTH);
    const btnHeight = this.scale(LAYOUT.blessingPanel.CONTINUE_BUTTON_HEIGHT);

    // Button glow (hidden until enabled)
    this.continueButtonGlow = this.scene.add.rectangle(x, y, btnWidth + this.scale(8), btnHeight + this.scale(8), PALETTE.green[500], 0);
    this.container.add(this.continueButtonGlow);

    // Button background (disabled state)
    this.continueButton = this.scene.add.rectangle(x, y, btnWidth, btnHeight, PALETTE.neutral[700], 0.6);
    this.continueButton.setStrokeStyle(this.scale(2), PALETTE.neutral[500], 0.4);
    this.container.add(this.continueButton);

    // Button text
    this.continueButtonText = createText(this.scene, x, y, 'CONTINUE', {
      fontSize: FONTS.SIZE_SMALL,
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
    this.continueButton.setStrokeStyle(this.scale(2), PALETTE.green[500], 0.8);
    this.continueButtonText.setColor(COLORS.TEXT_SUCCESS);

    // Add glow
    this.scene.tweens.add({
      targets: this.continueButtonGlow,
      alpha: 0.15,
      duration: SIZES.ANIM_NORMAL,
    });

    // Make interactive
    this.continueButton.setInteractive({ useHandCursor: true });

    // Hover effects
    this.continueButton.on('pointerover', () => {
      this.continueButton?.setFillStyle(PALETTE.green[600], 1);
      this.continueButton?.setStrokeStyle(this.scale(2), PALETTE.green[400], 1);
      this.continueButtonGlow?.setAlpha(0.25);
    });

    this.continueButton.on('pointerout', () => {
      this.continueButton?.setFillStyle(PALETTE.green[700], 0.95);
      this.continueButton?.setStrokeStyle(this.scale(2), PALETTE.green[500], 0.8);
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

    // Quick flash effect then fade to black (green to match button)
    this.scene.cameras.main.flash(TIMING.CAMERA_FLASH_NORMAL, FLASH.GREEN.r, FLASH.GREEN.g, FLASH.GREEN.b);

    // Fade camera directly to black (keeps dark overlay intact)
    this.scene.cameras.main.fadeOut(TIMING.ENTRANCE, 0, 0, 0);
    this.scene.cameras.main.once('camerafadeoutcomplete', () => {
      // Call onSelect which triggers scene.restart()
      // Don't call this.destroy() - scene restart handles cleanup
      // Calling destroy after restart can cause issues with stale scene references
      this.callbacks.onSelect(blessingId);
    });
  }

  public destroy(): void {
    this.container.destroy();
  }
}
