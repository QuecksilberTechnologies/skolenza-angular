import { Clipboard } from '@angular/cdk/clipboard';
import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  linkedSignal,
  output,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { InputTextModule } from '@openng/optimus-ui/inputtext';

import { CustomColorsApi } from '@core/services/custom-colors-api';
import { RovingRadioGroup } from '@shared/directives';
import { ACCENT_COLORS } from '@shared/interfaces';
import {
  contrastTextColor,
  hexToRgbString,
  normalizeHex,
  parseRgbInput,
} from '@shared/utilities/color';

@Component({
  selector: 'app-color-picker-panel',
  imports: [ButtonModule, InputTextModule, RovingRadioGroup],
  templateUrl: './color-picker-panel.html',
  styleUrl: './color-picker-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorPickerPanel {
  readonly value = input<string>('');
  readonly colorPicked = output<string>();

  readonly #customColorsApi = inject(CustomColorsApi);
  readonly #clipboard = inject(Clipboard);
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  #copyTimeout: ReturnType<typeof setTimeout> | null = null;

  protected readonly presets = ACCENT_COLORS;
  protected readonly customColors = this.#customColorsApi.colors;
  /** Both fields track the selected color until the user edits them. */
  protected readonly hexInput = linkedSignal(() => this.value().toUpperCase());
  protected readonly rgbInput = linkedSignal(() => hexToRgbString(this.value()));
  protected readonly copied = signal(false);
  protected readonly showCustomForm = signal(false);
  protected readonly hoveredColor = signal<string | null>(null);

  protected readonly draftColor = computed(
    () => normalizeHex(this.hexInput()) ?? parseRgbInput(this.rgbInput()),
  );
  protected readonly isDuplicate = computed(() => {
    const hex = this.draftColor();
    return hex !== null && this.customColors().includes(hex);
  });
  protected readonly canAdd = computed(() => this.draftColor() !== null && !this.isDuplicate());
  protected readonly hasInvalidInput = computed(
    () => (this.hexInput() !== '' || this.rgbInput() !== '') && this.draftColor() === null,
  );

  protected readonly displayHex = computed(() => this.value().replace('#', '').toUpperCase());

  /** Footer follows the pointer/focus, falling back to the selected color. */
  protected readonly previewColor = computed(() => this.hoveredColor() ?? this.value());
  protected readonly previewHex = computed(() =>
    this.previewColor().replace('#', '').toUpperCase(),
  );
  protected readonly previewName = computed(() => {
    if (this.hoveredColor() === null) {
      return 'Selected color';
    }
    const preset = ACCENT_COLORS.find((color) => color.value === this.previewColor());
    return preset?.name ?? 'Custom color';
  });

  protected readonly hexField = viewChild<ElementRef<HTMLInputElement>>('hexField');

  protected readonly contrastTextColor = contrastTextColor;

  constructor() {
    if (this.#isBrowser) {
      this.#customColorsApi.load();
    }

    inject(DestroyRef).onDestroy(() => this.#clearCopyTimeout());
  }

  protected toggleCustomForm(): void {
    const opening = !this.showCustomForm();
    this.showCustomForm.set(opening);

    if (opening) {
      this.hexInput.set(this.value().toUpperCase());
      this.rgbInput.set(hexToRgbString(this.value()));
      queueMicrotask(() => this.focusHexField());
    }
  }

  protected onHexInput(value: string): void {
    this.hexInput.set(value);
    const hex = normalizeHex(value);
    this.rgbInput.set(hex ? hexToRgbString(hex) : '');
  }

  protected onRgbInput(value: string): void {
    this.rgbInput.set(value);
    const hex = parseRgbInput(value);
    this.hexInput.set(hex ? hex.toUpperCase() : '');
  }

  protected async addCustomColor(): Promise<void> {
    const hex = this.draftColor();
    if (!hex || this.isDuplicate()) {
      return;
    }

    await this.#customColorsApi.add(hex);
    this.showCustomForm.set(false);
    this.colorPicked.emit(hex);
  }

  protected removeCustomColor(hex: string): void {
    this.#customColorsApi.remove(hex);
  }

  protected focusHexField(): void {
    this.hexField()?.nativeElement.focus();
  }

  protected copyValue(): void {
    this.#clipboard.copy(this.value());
    this.copied.set(true);
    this.#clearCopyTimeout();
    this.#copyTimeout = setTimeout(() => this.copied.set(false), 1500);
  }

  #clearCopyTimeout(): void {
    if (this.#copyTimeout !== null) {
      clearTimeout(this.#copyTimeout);
      this.#copyTimeout = null;
    }
  }
}
