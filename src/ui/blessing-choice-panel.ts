/**
 * Blessing Choice Panel
 * Displays 4 blessing options for player to choose after Mode 1
 * Mobile-only layout (game is always 430px width via CSS lock)
 */

import Phaser from 'phaser';
import { FONTS, PALETTE, COLORS, SIZES, FLASH, LAYOUT } from '@/config';
import { createText } from '@/ui/ui-utils';
import { BLESSING_CONFIGS, type BlessingId } from '@/systems/blessings/types';
import { getImplementedBlessings } from '@/data/blessings';
import { toDPR } from '@/systems/responsive';

interface BlessingPanelLayout {
  panelWidth: number;
  panelHeight: number;
  titleY: number;
  subtitleY: number;
  chooseLabelY: number;
  cardsAreaY: number;
  buttonY: number;
  cardWidth: number;
  cardHeight: number;
  cardSpacing: number;
}

/**
 * Calculate blessing panel layout
 * Uses LAYOUT.blessingPanel as source of truth
 * Note: screenWidth/screenHeight are already in device pixels from scene.cameras.main
 * All LAYOUT values are scaled to device pixels via toDPR()
 */
function getBlessingPanelLayout(
  screenWidth: number,
  screenHeight: number
): BlessingPanelLayout {
  const L = LAYOUT.blessingPanel;

  // Scale layout values to device pixels
  const panelMargin = toDPR(L.PANEL_MARGIN);
  const titlePadding = toDPR(L.TITLE_PADDING);
  const gapTitleToSubtitle = toDPR(L.GAP_TITLE_TO_SUBTITLE);
  const gapSubtitleToChoose = toDPR(L.GAP_SUBTITLE_TO_CHOOSE);
  const gapChooseToCards = toDPR(L.GAP_CHOOSE_TO_CARDS);
  const gapButtonFromBottom = toDPR(L.GAP_BUTTON_FROM_BOTTOM);
  const continueButtonHeight = toDPR(L.CONTINUE_BUTTON_HEIGHT);
  const cardWidthMargin = toDPR(L.CARD_WIDTH_MARGIN);
  const cardHeight = toDPR(L.CARD_HEIGHT);
  const cardSpacing = toDPR(L.CARD_SPACING);

  // Panel dimensions (fills screen with margin)
  const panelWidth = screenWidth - panelMargin;
  const panelHeight = screenHeight - panelMargin;

  // Panel is centered on screen
  const panelTop = (screenHeight - panelHeight) / 2;
  const panelBottom = panelTop + panelHeight;

  // Title at top of panel with padding
  const titleY = panelTop + titlePadding;

  // Subtitle below title
  const subtitleY = titleY + gapTitleToSubtitle;

  // "Choose Your Blessing" label
  const chooseLabelY = subtitleY + gapSubtitleToChoose;

  // Cards area starts after choose label
  const cardsAreaY = chooseLabelY + gapChooseToCards;

  // Continue button near bottom of panel
  const buttonY = panelBottom - gapButtonFromBottom - continueButtonHeight / 2;

  // Card dimensions
  const cardWidth = panelWidth - cardWidthMargin;

  return {
    panelWidth,
    panelHeight,
    titleY,
    subtitleY,
    chooseLabelY,
    cardsAreaY,
    buttonY,
    cardWidth,
    cardHeight,
    cardSpacing,
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

    // Calculate layout
    const { width, height } = this.scene.cameras.main;
    this.layout = getBlessingPanelLayout(width, height);

    this.create();
  }

  private create(): void {
    const { width, height } = this.scene.cameras.main;
    const L = this.layout;

    // Dark overlay
    const overlay = this.scene.add.rectangle(
      width / 2, height / 2,
      width, height,
      COLORS.OVERLAY, 0.9
    );
    overlay.setInteractive(); // Block clicks behind
    this.container.add(overlay);

    // Main panel background
    const panelBg = this.scene.add.rectangle(
      width / 2, height / 2,
      L.panelWidth, L.panelHeight,
      PALETTE.purple[900], 0.98
    );
    panelBg.setStrokeStyle(toDPR(SIZES.PANEL_BORDER_WIDTH), PALETTE.purple[500], 0.8);
    this.container.add(panelBg);

    // Title
    const title = createText(this.scene, width / 2, L.titleY, 'The Curse Weakens...', {
      fontSize: FONTS.SIZE_LARGE,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_WARNING,
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);
    this.container.add(title);

    // Narrative subtitle
    const subtitle = createText(this.scene, width / 2, L.subtitleY,
      'The first seal is broken. Darker trials await.', {
        fontSize: FONTS.SIZE_SMALL,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_PRIMARY,
      });
    subtitle.setOrigin(0.5, 0.5);
    this.container.add(subtitle);

    // "Choose Your Blessing" label above cards
    const chooseLabel = createText(this.scene, width / 2, L.chooseLabelY, 'Choose Your Blessing', {
      fontSize: FONTS.SIZE_BODY,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_ACCENT,
      fontStyle: 'bold',
    });
    chooseLabel.setOrigin(0.5, 0.5);
    this.container.add(chooseLabel);

    // Cards - 4 compact rows
    const blessingIds: BlessingId[] = ['abundance', 'mercy', 'sanctuary', 'sixth'];
    blessingIds.forEach((id, index) => {
      const cardX = (width - L.cardWidth) / 2;
      const cardY = L.cardsAreaY + index * (L.cardHeight + L.cardSpacing);
      const isImplemented = IMPLEMENTED_BLESSINGS.has(id);
      this.createBlessingCard(cardX, cardY, L.cardWidth, L.cardHeight, id, isImplemented);
    });

    // Continue button (disabled until blessing selected)
    this.createContinueButton(width / 2, L.buttonY);

    // Entrance animation
    this.container.setAlpha(0);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: SIZES.ANIM_ENTRANCE,
      ease: 'Quad.easeOut',
    });
  }

  /** Compact card layout for blessing selection */
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

    // Card background
    const cardBg = this.scene.add.rectangle(
      cardWidth / 2, cardHeight / 2,
      cardWidth, cardHeight,
      isImplemented ? PALETTE.purple[800] : PALETTE.neutral[800],
      isImplemented ? 0.95 : 0.7
    );
    cardBg.setStrokeStyle(toDPR(1), isImplemented ? PALETTE.purple[500] : PALETTE.neutral[600], 0.6);
    card.add(cardBg);

    // Card glow (hidden by default)
    const cardGlow = this.scene.add.rectangle(
      cardWidth / 2, cardHeight / 2,
      cardWidth + 4, cardHeight + 4,
      PALETTE.green[500], 0
    );
    card.add(cardGlow);
    card.sendToBack(cardGlow);

    // Compact layout: Icon | "Name: Subtitle" + Description
    // Scale positions to device pixels
    const iconX = toDPR(28);
    const textStartX = toDPR(54);

    // Icon (centered vertically)
    const icon = createText(this.scene, iconX, cardHeight / 2, config.icon, {
      fontSize: FONTS.SIZE_BODY,
      fontFamily: FONTS.FAMILY,
    });
    icon.setOrigin(0.5, 0.5);
    if (!isImplemented) icon.setAlpha(0.5);
    card.add(icon);

    // Name (purple) + Subtitle (white) on same line
    const blessingName = config.name.replace('Blessing of ', '');
    const nameY = toDPR(18);
    const nameText = createText(this.scene, textStartX, nameY, `${blessingName}: `, {
      fontSize: FONTS.SIZE_BODY,
      fontFamily: FONTS.FAMILY,
      color: isImplemented ? COLORS.TEXT_ACCENT : COLORS.TEXT_MUTED,
      fontStyle: 'bold',
    });
    nameText.setOrigin(0, 0.5);
    card.add(nameText);

    const subtitleText = createText(this.scene, textStartX + nameText.width, nameY, config.subtitle, {
      fontSize: FONTS.SIZE_BODY,
      fontFamily: FONTS.FAMILY,
      color: isImplemented ? COLORS.TEXT_PRIMARY : COLORS.TEXT_MUTED,
      fontStyle: 'bold',
    });
    subtitleText.setOrigin(0, 0.5);
    card.add(subtitleText);

    // Description (directly below title, no gap)
    const descY = toDPR(34);
    if (isImplemented) {
      const descWidth = cardWidth - textStartX - toDPR(10);
      const desc = createText(this.scene, textStartX, descY, config.description, {
        fontSize: FONTS.SIZE_SMALL,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_SECONDARY,
        wordWrap: { width: descWidth },
      });
      desc.setOrigin(0, 0);
      card.add(desc);
    } else {
      // Show just subtitle for unimplemented
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
      const badgeX = cardWidth - toDPR(35);
      const badgeY = cardHeight / 2;
      const comingSoonBg = this.scene.add.rectangle(
        badgeX, badgeY,
        toDPR(50), toDPR(20),
        PALETTE.neutral[700], 0.9
      );
      comingSoonBg.setStrokeStyle(toDPR(1), PALETTE.neutral[500], 0.5);
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
          cardBg.setStrokeStyle(toDPR(1), PALETTE.purple[400], 0.8);
        }
      });

      cardBg.on('pointerout', () => {
        if (this.selectedCard !== card) {
          cardBg.setFillStyle(PALETTE.purple[800], 0.95);
          cardBg.setStrokeStyle(toDPR(1), PALETTE.purple[500], 0.6);
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
        prevData.bg.setStrokeStyle(toDPR(2), PALETTE.purple[500], 0.6);
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
    card.setData('selectData', { bg: cardBg, glow: cardGlow, y: originalY });

    cardBg.setFillStyle(PALETTE.green[800], 1);
    cardBg.setStrokeStyle(toDPR(3), PALETTE.green[400], 1);

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
      y: number;
    };
    if (prevData) {
      prevData.bg.setFillStyle(PALETTE.purple[800], 0.95);
      prevData.bg.setStrokeStyle(toDPR(2), PALETTE.purple[500], 0.6);
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
    this.continueButton.setStrokeStyle(toDPR(2), PALETTE.neutral[500], 0.4);
    this.continueButtonText.setColor(COLORS.TEXT_DISABLED);

    // Fade out glow
    this.scene.tweens.add({
      targets: this.continueButtonGlow,
      alpha: 0,
      duration: SIZES.ANIM_NORMAL,
    });
  }

  private createContinueButton(x: number, y: number): void {
    const btnWidth = toDPR(LAYOUT.blessingPanel.CONTINUE_BUTTON_WIDTH);
    const btnHeight = toDPR(LAYOUT.blessingPanel.CONTINUE_BUTTON_HEIGHT);

    // Button glow (hidden until enabled)
    this.continueButtonGlow = this.scene.add.rectangle(x, y, btnWidth + toDPR(10), btnHeight + toDPR(10), PALETTE.green[500], 0);
    this.container.add(this.continueButtonGlow);

    // Button background (disabled state)
    this.continueButton = this.scene.add.rectangle(x, y, btnWidth, btnHeight, PALETTE.neutral[700], 0.6);
    this.continueButton.setStrokeStyle(toDPR(2), PALETTE.neutral[500], 0.4);
    this.container.add(this.continueButton);

    // Button text
    this.continueButtonText = createText(this.scene, x, y, 'CONTINUE', {
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
    this.continueButton.setStrokeStyle(toDPR(2), PALETTE.green[500], 0.8);
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
      this.continueButton?.setStrokeStyle(toDPR(2), PALETTE.green[400], 1);
      this.continueButtonGlow?.setAlpha(0.25);
    });

    this.continueButton.on('pointerout', () => {
      this.continueButton?.setFillStyle(PALETTE.green[700], 0.95);
      this.continueButton?.setStrokeStyle(toDPR(2), PALETTE.green[500], 0.8);
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
    this.scene.cameras.main.flash(150, FLASH.GREEN.r, FLASH.GREEN.g, FLASH.GREEN.b);

    // Fade camera directly to black (keeps dark overlay intact)
    this.scene.cameras.main.fadeOut(300, 0, 0, 0);
    this.scene.cameras.main.once('camerafadeoutcomplete', () => {
      this.callbacks.onSelect(blessingId);
      this.destroy();
    });
  }

  public destroy(): void {
    this.container.destroy();
  }
}
