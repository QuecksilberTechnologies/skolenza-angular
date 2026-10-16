import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CardModule } from '@openng/optimus-ui/card';
import {
  Database,
  FileText,
  Image,
  LucideAngularModule,
  LucideIconData,
  Video,
} from 'lucide-angular';

import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { SuperAdminStorage } from '@shared/interfaces';

import { DashboardCardHeader } from '../dashboard-card-header/dashboard-card-header';

interface StorageCategory {
  label: string;
  usedGb: number;
  colorClass: string;
  bgClass: string;
  dotClass: string;
  icon: LucideIconData;
}

type CategoryStyle = Omit<StorageCategory, 'label' | 'usedGb'>;

const OTHER_STYLE: CategoryStyle = {
  colorClass: 'text-gray-500 dark:text-gray-400',
  bgClass: 'bg-gray-100 dark:bg-zinc-700',
  dotClass: 'bg-gray-400',
  icon: Database,
};

/** Styling per category name the API sends; anything unknown renders as "Other". */
const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  documents: {
    colorClass: 'text-blue-500 dark:text-blue-400',
    bgClass: 'bg-blue-50 dark:bg-blue-900/20',
    dotClass: 'bg-blue-400',
    icon: FileText,
  },
  media: {
    colorClass: 'text-violet-500 dark:text-violet-400',
    bgClass: 'bg-violet-50 dark:bg-violet-900/20',
    dotClass: 'bg-violet-400',
    icon: Image,
  },
  videos: {
    colorClass: 'text-amber-500 dark:text-amber-400',
    bgClass: 'bg-amber-50 dark:bg-amber-900/20',
    dotClass: 'bg-amber-400',
    icon: Video,
  },
};

@Component({
  selector: 'app-storage-status-card',
  imports: [CardModule, DashboardCardHeader, TableEmptyMessage, LucideAngularModule],
  templateUrl: './storage-status-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorageStatusCard {
  readonly title = input<string>();
  readonly storage = input<SuperAdminStorage | null>(null);
  /** The backend still fakes this card's values. */
  readonly placeholder = input(false);
  readonly loading = input(false);
  readonly refresh = output<void>();

  protected readonly skeletonRows = [1, 2, 3];

  protected readonly totalGb = computed(() => this.storage()?.capacityGigabytes ?? 0);
  protected readonly usedGb = computed(() => this.storage()?.usedGigabytes ?? 0);
  protected readonly Database = Database;

  protected readonly usedPercent = computed(() =>
    this.totalGb() ? Math.round((this.usedGb() / this.totalGb()) * 100) : 0,
  );
  protected readonly freeGb = computed(
    () => +Math.max(this.totalGb() - this.usedGb(), 0).toFixed(1),
  );

  /** SVG arc for the gauge (semicircle, 180 degrees) */
  protected readonly gaugeCircumference = Math.PI * 54;
  protected readonly gaugeDashArray = computed(() => {
    const filled = (Math.min(this.usedPercent(), 100) / 100) * this.gaugeCircumference;
    return `${filled} ${this.gaugeCircumference}`;
  });

  protected readonly gaugeStrokeClass = computed(() => {
    const pct = this.usedPercent();
    if (pct >= 80) return 'stroke-red-400';
    if (pct >= 60) return 'stroke-amber-400';
    return 'stroke-primary-400';
  });

  protected readonly categories = computed<StorageCategory[]>(() =>
    (this.storage()?.categories ?? []).map((category) => ({
      label: category.name,
      usedGb: category.usedGigabytes,
      ...(CATEGORY_STYLES[category.name.toLowerCase()] ?? OTHER_STYLE),
    })),
  );

  protected categoryPercent(usedGb: number): number {
    return this.totalGb() ? Math.round((usedGb / this.totalGb()) * 100) : 0;
  }

  protected formatGb(value: number): string {
    return value >= 1 ? `${value} GB` : `${(value * 1024).toFixed(0)} MB`;
  }
}
