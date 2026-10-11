import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChildren,
} from '@angular/core';
import { InputTextModule } from '@openng/optimus-ui/inputtext';

import { Common } from '@core/services';
import { LogoVariantConfig, LogoVariantKey } from '@shared/interfaces';

import { SettingsStore } from '../settings.store';

@Component({
  selector: 'app-brand-identity',
  imports: [InputTextModule],
  templateUrl: './brand-identity.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class BrandIdentity {
  readonly #store = inject(SettingsStore);
  readonly #common = inject(Common);
  readonly brandIdentity = this.#store.brandIdentity;
  readonly logoPreviews = this.#store.logoPreviews;
  readonly fileInputs = viewChildren<ElementRef<HTMLInputElement>>('fileInput');
  readonly variants: LogoVariantConfig[] = [
    {
      key: 'darkSmall',
      label: 'Dark Small',
      description: 'Sidebar · dark theme · collapsed',
      bgClass: 'bg-zinc-800',
    },
    {
      key: 'darkLarge',
      label: 'Dark Large',
      description: 'Sidebar · dark theme · expanded',
      bgClass: 'bg-zinc-800',
    },
    {
      key: 'lightSmall',
      label: 'Light Small',
      description: 'Sidebar · light theme · collapsed',
      bgClass: 'bg-white dark:bg-zinc-200',
    },
    {
      key: 'lightLarge',
      label: 'Light Large',
      description: 'Sidebar · light theme · expanded',
      bgClass: 'bg-white dark:bg-zinc-200',
    },
    {
      key: 'favicon',
      label: 'Favicon',
      description: 'Browser tab icon · 32×32 recommended',
      bgClass: 'bg-white dark:bg-zinc-200',
      accept: 'image/x-icon,image/png,image/svg+xml',
    },
  ];
  readonly activeVariant = signal<LogoVariantKey | null>(null);
  readonly draggingVariant = signal<LogoVariantKey | null>(null);

  readonly activePreview = computed(() => {
    const key = this.activeVariant();
    if (!key) return null;
    return this.logoPreviews()[key];
  });

  onNameChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.#store.updateBrandIdentity({ organizationName: input.value });
  }

  onFileSelected(event: Event, variant: LogoVariantKey) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.processFile(file, variant);
    }
  }

  onDragOver(event: DragEvent, variant: LogoVariantKey) {
    event.preventDefault();
    this.draggingVariant.set(variant);
  }

  onDragLeave(variant: LogoVariantKey) {
    if (this.draggingVariant() === variant) {
      this.draggingVariant.set(null);
    }
  }

  onDrop(event: DragEvent, variant: LogoVariantKey) {
    event.preventDefault();
    this.draggingVariant.set(null);
    const file = event.dataTransfer?.files[0];
    if (file) {
      this.processFile(file, variant);
    }
  }

  removePreview(variant: LogoVariantKey, index: number) {
    this.#store.setLogoPreview(variant, null, null);
    this.#store.applyBrandLogo(variant, null);
    const inputs = this.fileInputs();
    if (inputs[index]) {
      inputs[index].nativeElement.value = '';
    }
  }

  private processFile(file: File, variant: LogoVariantKey) {
    if (variant === 'favicon') {
      if (!file.type.match(/^image\/(x-icon|vnd\.microsoft\.icon|png|svg\+xml)$/)) {
        this.#common.showMessage('Use ICO, PNG or SVG format', 'error');
        return;
      }
    } else if (!file.type.match(/^image\/(png|jpeg|svg\+xml)$/)) {
      this.#common.showMessage('Use PNG, JPG or SVG format', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this.#common.showMessage('File must be under 2MB', 'error');
      return;
    }

    this.#store.setLogoPreview(variant, URL.createObjectURL(file), file.name);

    const reader = new FileReader();
    reader.onload = () => this.#store.applyBrandLogo(variant, reader.result as string);
    reader.readAsDataURL(file);
  }
}
