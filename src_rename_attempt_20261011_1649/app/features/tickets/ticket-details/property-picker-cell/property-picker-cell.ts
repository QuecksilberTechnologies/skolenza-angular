import { Listbox, Option } from '@angular/aria/listbox';
import { Menu, MenuTrigger } from '@angular/aria/menu';
import { Overlay, OverlayModule } from '@angular/cdk/overlay';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

import { Popup } from '@shared/index';

export interface PropertyOption {
  value: string;
  pillClass: string;
  dotClass: string;
}

@Component({
  selector: 'app-property-picker-cell',
  imports: [Popup, Menu, MenuTrigger, Listbox, Option, OverlayModule],
  templateUrl: './property-picker-cell.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropertyPickerCell {
  readonly currentValue = input.required<string>();
  readonly options = input.required<PropertyOption[]>();
  readonly label = input.required<string>();

  readonly valueChange = output<string>();

  protected readonly menuRef = viewChild<Menu<unknown>>(Menu);
  protected readonly trigger = viewChild<MenuTrigger<unknown>>(MenuTrigger);
  protected readonly closeOnScroll = inject(Overlay).scrollStrategies.close();

  protected readonly currentOption = computed(() =>
    this.options().find((o) => o.value === this.currentValue()),
  );

  protected readonly selectedValues = computed<string[]>(() => [this.currentValue()]);

  protected onValuesChange(values: string[]): void {
    if (values.length === 0) return;
    const next = values[0];
    if (next === this.currentValue()) {
      this.trigger()?.close();
      return;
    }
    this.valueChange.emit(next);
    this.trigger()?.close();
  }

  protected isSelected(value: string): boolean {
    return value === this.currentValue();
  }
}
