import { A11yModule } from '@angular/cdk/a11y';
import { ConnectedPosition, Overlay, OverlayModule } from '@angular/cdk/overlay';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { Popup } from '../popup/popup';
import { ColorPickerPanel } from './color-picker-panel';

/** The dashed "+" chip the appearance settings sit behind; a caller may replace it. */
const DEFAULT_TRIGGER_CLASS =
  'flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-zinc-300 text-zinc-400 transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:h-8 sm:w-8 dark:border-zinc-600';

@Component({
  selector: 'app-color-picker',
  imports: [A11yModule, OverlayModule, TooltipModule, Popup, ColorPickerPanel],
  templateUrl: './color-picker.html',
  // The trigger is the layout box the caller means to place, so the host gets out of the way.
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorPicker {
  readonly value = input<string>('#4287f5');
  readonly triggerAriaLabel = input<string>('Pick a custom color');
  /** Replaces the default chip styling wholesale - the trigger has to look local. */
  readonly triggerClass = input<string>(DEFAULT_TRIGGER_CLASS);
  /** Empty means no tooltip. */
  readonly tooltip = input<string>('');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly valueChange = output<string>();

  protected readonly open = signal(false);
  protected readonly closeOnScroll = inject(Overlay).scrollStrategies.reposition();
  protected readonly positions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 },
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -8 },
    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -8 },
  ];
  protected readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');

  protected close(): void {
    this.open.set(false);
    this.trigger()?.nativeElement.focus();
  }

  protected pick(hex: string): void {
    this.valueChange.emit(hex);
    this.close();
  }
}
