import { DatePipe, DecimalPipe, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';

import { Common, ThemeApi } from '@core/services';

import { DashboardHostStore } from './dashboard-host.store';
import { HostBarListCard } from './ui/host-bar-list-card';
import { HostChartCard } from './ui/host-chart-card';
import { HostDonutCard, HostDonutLegendItem } from './ui/host-donut-card';
import { HostKpi, HostKpiCards } from './ui/host-kpi-cards';
import { HostListCard, HostListItem } from './ui/host-list-card';

/** Axis tick formatter — keeps a 10,000 tick from eating the plot width. */
function compactNumber(value: number): string {
  if (Math.abs(value) >= 1000) return `${value / 1000}k`;
  return `${value}`;
}

/**
 * The largest country slice wears the live brand colour so the chart belongs to the app; the
 * rest come from this fixed order. Slices are categorical identity, so these are distinct hues
 * in fixed order — never a single-hue ramp. Five-long *contiguous* windows only: both `[0..4]`
 * and `[1..5]` clear the CVD and normal-vision gates in both modes against this card's real
 * surfaces (#ffffff / #18181b), while dropping an interior hue fails (aqua in both modes,
 * yellow in dark). Three light hues sit under 3:1 there, which the visible legend relieves.
 */
const COMPANION_HUES = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300'],
} as const;

/** `Other` is a residual, not a country, so it stays gray and always sorts last. */
const OTHER_HUE = '#898781';

/** Hue of the companion list's leading blue — the slice that lands beside the brand. */
const BLUE_LEAD_HUE = 214;

function hexHue(hex: string): number {
  const value = hex.replace('#', '');
  if (value.length !== 6) return BLUE_LEAD_HUE;
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  if (!delta) return 0;
  const hue =
    max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return (hue * 60 + 360) % 360;
}

/** Shortest way round the colour wheel. */
function hueDistance(a: number, b: number): number {
  const raw = Math.abs(a - b) % 360;
  return raw > 180 ? 360 - raw : raw;
}

@Component({
  selector: 'app-dashboard-host',
  imports: [
    ButtonModule,
    HostBarListCard,
    HostChartCard,
    HostDonutCard,
    HostKpiCards,
    HostListCard,
  ],
  providers: [DashboardHostStore, DecimalPipe],
  templateUrl: './dashboard-host.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export default class DashboardHost {
  readonly #commonService = inject(Common);
  readonly #themeApi = inject(ThemeApi);
  readonly #datePipe = inject(DatePipe);
  readonly #decimalPipe = inject(DecimalPipe);
  readonly #platformId = inject(PLATFORM_ID);

  readonly store = inject(DashboardHostStore);

  constructor() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Dashboard',
      pageDescription:
        'All-in-one dashboard for owners to manage users, editions, licenses, and subscriptions.',
      pageIcon: 'pi pi-id-card',
      isBreadcrumbShow: false,
    });

    // A partial failure used to render an alert above the widgets, which pushed the whole page
    // down the moment loading resolved. The toaster is out of flow, so it costs no layout.
    effect(() => {
      const failed = this.store.failedSources();
      if (!failed.length) return;
      this.#commonService.showMessage(
        `Some data could not be loaded: ${failed.join(', ')}.`,
        'warn',
      );
    });
  }

  // ---------------------------------------------------------------- chart theme

  /** Resolve an Optimus palette token for canvas charts (a canvas cannot use CSS vars). */
  #paletteToken(token: string, fallback: string): string {
    if (!isPlatformBrowser(this.#platformId)) return fallback;
    return getComputedStyle(document.documentElement).getPropertyValue(token).trim() || fallback;
  }

  /** Resolve the live brand colour for canvas charts. */
  #brand(): string {
    return this.#paletteToken('--p-primary-color', '#f97316');
  }

  /** Low-alpha version of the brand colour for area fills. */
  #brandFill(color: string): string {
    const hex = color.replace('#', '');
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r},${g},${b},0.15)`;
    }
    if (color.startsWith('rgb(')) return color.replace('rgb(', 'rgba(').replace(')', ',0.15)');
    return 'rgba(249,115,22,0.15)';
  }

  /** Reads the reactive theme signal so charts recolour on toggle without a reload. */
  readonly #chartTheme = computed(() => {
    const dark = this.#themeApi.isDarkMode();
    return {
      tick: dark ? '#a1a1aa' : '#6b7280',
      grid: dark ? 'rgba(161,161,170,0.18)' : 'rgba(107,114,128,0.18)',
      // Ladder series are two steps of the same brand ramp, three stops apart, always
      // pairing one light with one dark step so they stay apart in either theme.
      first: dark
        ? this.#paletteToken('--p-primary-300', '#fdba74')
        : this.#paletteToken('--p-primary-600', '#ea580c'),
      second: dark
        ? this.#paletteToken('--p-primary-600', '#ea580c')
        : this.#paletteToken('--p-primary-300', '#fdba74'),
      /** The card surface behind a chart — doughnut slices ring themselves with it. */
      surface: dark ? '#18181b' : '#ffffff',
      tooltipBg: dark ? '#27272a' : '#ffffff',
      tooltipTitle: dark ? '#fafafa' : '#18181b',
      tooltipBody: dark ? '#d4d4d8' : '#3f3f46',
      tooltipBorder: dark ? '#3f3f46' : '#e4e4e7',
    };
  });

  /** Shared tooltip chrome — a bare Chart.js tooltip clashes with the card surfaces. */
  #tooltipStyle() {
    const theme = this.#chartTheme();
    return {
      backgroundColor: theme.tooltipBg,
      titleColor: theme.tooltipTitle,
      bodyColor: theme.tooltipBody,
      borderColor: theme.tooltipBorder,
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8,
      usePointStyle: true,
      displayColors: true,
    };
  }

  /** Keeps category labels horizontal — rotated labels collide once a chart holds 6+ bars. */
  #categoryAxis() {
    const theme = this.#chartTheme();
    return {
      ticks: {
        color: theme.tick,
        autoSkip: false,
        maxRotation: 0,
        minRotation: 0,
        font: { size: 11 },
        callback: function (this: { getLabelForValue(value: number): string }, value: number) {
          const label = this.getLabelForValue(value);
          return label.length > 12 ? `${label.slice(0, 11)}…` : label;
        },
      },
      grid: { display: false },
      border: { display: false },
    };
  }

  /** Full, untruncated category name in the tooltip title. */
  #fullLabelTitle = (items: { label?: string }[]) => items[0]?.label ?? '';

  readonly countOptions = computed(() => {
    const theme = this.#chartTheme();
    return {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { right: 4, top: 4 } },
      plugins: {
        legend: { display: false },
        tooltip: { ...this.#tooltipStyle(), callbacks: { title: this.#fullLabelTitle } },
      },
      scales: {
        x: this.#categoryAxis(),
        y: {
          beginAtZero: true,
          ticks: { color: theme.tick, precision: 0, font: { size: 11 } },
          grid: { color: theme.grid, drawTicks: false },
          border: { display: false },
        },
      },
    };
  });

  readonly ladderOptions = computed(() => {
    const theme = this.#chartTheme();
    const currency = this.store.planLadder().currency;
    return {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { right: 4, top: 4 } },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            color: theme.tick,
            usePointStyle: true,
            pointStyle: 'circle',
            boxWidth: 8,
            boxHeight: 8,
            padding: 16,
          },
        },
        tooltip: {
          ...this.#tooltipStyle(),
          callbacks: {
            title: this.#fullLabelTitle,
            label: (context: { dataset: { label?: string }; parsed: { y: number } }) =>
              `${context.dataset.label}: ${currency} ${this.#decimalPipe.transform(context.parsed.y)}`,
          },
        },
      },
      scales: {
        x: this.#categoryAxis(),
        y: {
          beginAtZero: true,
          ticks: {
            color: theme.tick,
            font: { size: 11 },
            maxTicksLimit: 6,
            callback: compactNumber,
          },
          grid: { color: theme.grid, drawTicks: false },
          border: { display: false },
        },
      },
    };
  });

  // ---------------------------------------------------------------- KPI strip

  readonly kpiCards = computed<HostKpi[]>(() => {
    const kpis = this.store.kpis();
    return [
      {
        key: 'institutions',
        label: 'Total Institutions',
        value: kpis.totalInstitutions,
        icon: 'pi pi-building',
        link: '/app/institutions',
      },
      {
        key: 'verified',
        label: 'Verified Institutions',
        value: kpis.verifiedInstitutions,
        icon: 'pi pi-verified',
        link: '/app/institutions',
      },
      {
        key: 'inactive',
        label: 'Inactive Institutions',
        value: kpis.inactiveInstitutions,
        icon: 'pi pi-ban',
        link: '/app/institutions',
      },
      {
        key: 'plans',
        label: 'Active Plans',
        value: kpis.activePlans,
        icon: 'pi pi-credit-card',
        link: '/app/subscriptions',
      },
    ];
  });

  // ---------------------------------------------------------------- institutions

  readonly institutionStatusSubtitle = computed(() => {
    const total = this.store.kpis().totalInstitutions;
    return `${total} institutions · verification and activation are independent flags`;
  });

  /** Flat slice list — `institutionsByCountry` already ranks, caps at six and folds the rest. */
  readonly #countryItems = computed(() => this.store.institutionsByCountry()[0]?.items ?? []);

  /**
   * Slot order follows rank, so the largest country takes the brand colour. The guard protects
   * the pair that actually touches on the ring — the brand and the window's lead hue — by
   * stepping past the blue when the brand is itself blue-ish. A brand near a *non-adjacent*
   * companion is accepted: the legend names every slice, so identity never rests on hue.
   */
  readonly #countryColors = computed(() => {
    const dark = this.#themeApi.isDarkMode();
    const hues = dark ? COMPANION_HUES.dark : COMPANION_HUES.light;
    const brand = this.#brand();
    const companions =
      hueDistance(hexHue(brand), BLUE_LEAD_HUE) < 40 ? hues.slice(1, 6) : hues.slice(0, 5);
    const slices = [brand, ...companions];
    return this.#countryItems().map((item, index) =>
      item.key === 'other' ? OTHER_HUE : slices[index % slices.length],
    );
  });

  readonly countryLegend = computed<HostDonutLegendItem[]>(() => {
    const colors = this.#countryColors();
    return this.#countryItems().map((item, index) => ({
      key: item.key,
      label: item.label,
      value: item.value,
      share: item.share,
      color: colors[index],
      code: item.code,
    }));
  });

  /** Sum of the slices, not the institution KPI — the hole must equal the ring. */
  readonly countryTotal = computed(() =>
    this.#countryItems().reduce((sum, item) => sum + item.value, 0),
  );

  readonly countryDonutData = computed(() => {
    const items = this.#countryItems();
    return {
      labels: items.map((item) => item.label),
      datasets: [
        {
          data: items.map((item) => item.value),
          backgroundColor: this.#countryColors(),
          // A surface-coloured ring is the gap between adjacent slices, not decoration — so a
          // lone slice gets none, or it reads as a notch cut out of a closed ring.
          borderColor: this.#chartTheme().surface,
          borderWidth: items.length > 1 ? 2 : 0,
          hoverOffset: 6,
        },
      ],
    };
  });

  readonly countryDonutOptions = computed(() => {
    const shares = new Map(this.#countryItems().map((item) => [item.label, item.share]));
    return {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        // The card renders its own legend below the canvas — it carries the flags.
        legend: { display: false },
        tooltip: {
          ...this.#tooltipStyle(),
          callbacks: {
            label: (context: { label: string; parsed: number }) =>
              `${context.label}: ${context.parsed} (${shares.get(context.label) ?? 0}%)`,
          },
        },
      },
    };
  });

  readonly recentInstitutionItems = computed<HostListItem[]>(() =>
    this.store.recentInstitutions().map((institution) => ({
      key: `institution-${institution.id}`,
      icon: 'pi pi-building',
      title: institution.companyName,
      subtitle: [institution.institutionCode, institution.companyEmailDomain].filter(Boolean).join(' · '),
      badges: [
        institution.isVerified
          ? ({ label: 'Verified', tone: 'success' } as const)
          : ({ label: 'Unverified', tone: 'warn' } as const),
        ...(institution.isActive ? [] : [{ label: 'Inactive', tone: 'muted' } as const]),
      ],
      link: '/app/institutions',
    })),
  );

  // ---------------------------------------------------------------- plans

  readonly ladderSubtitle = computed(() => {
    const ladder = this.store.planLadder();
    const base = 'Monthly and yearly list price per plan';
    return ladder.mixedCurrency ? `${base} · plans use mixed currencies` : base;
  });

  readonly ladderData = computed(() => {
    const ladder = this.store.planLadder();
    return {
      labels: ladder.labels,
      datasets: [
        {
          label: 'Monthly',
          data: ladder.monthly,
          backgroundColor: this.#chartTheme().first,
          borderRadius: 6,
          minBarLength: 2,
          maxBarThickness: 28,
          categoryPercentage: 0.7,
          barPercentage: 0.85,
        },
        {
          label: 'Yearly',
          data: ladder.yearly,
          backgroundColor: this.#chartTheme().second,
          borderRadius: 6,
          minBarLength: 2,
          maxBarThickness: 28,
          categoryPercentage: 0.7,
          barPercentage: 0.85,
        },
      ],
    };
  });

  readonly ladderSummary = computed(() => {
    const ladder = this.store.planLadder();
    return ladder.labels.map(
      (name, index) =>
        `${name}: monthly ${ladder.currency} ${ladder.monthly[index]}, yearly ${ladder.currency} ${ladder.yearly[index]}`,
    );
  });

  readonly planCatalogSubtitle = computed(() => {
    const catalog = this.store.planCatalog();
    return `${catalog.freeCount} free · ${catalog.paidCount} paid`;
  });

  readonly planCatalogItems = computed<HostListItem[]>(() =>
    this.store.planCatalog().rows.map((plan) => ({
      key: `plan-${plan.id}`,
      icon: 'pi pi-credit-card',
      title: plan.name,
      subtitle: `${plan.maxUsers} users · ${plan.moduleCount} modules`,
      meta: plan.isFree
        ? 'Free'
        : `${plan.currencyKey} ${this.#decimalPipe.transform(plan.monthlyPrice)}/mo`,
      badges: [
        ...(plan.isMostPopular ? [{ label: 'Most popular', tone: 'primary' } as const] : []),
        ...(plan.isCustom ? [{ label: 'Custom', tone: 'muted' } as const] : []),
      ],
      link: '/app/subscriptions',
    })),
  );

  // ---------------------------------------------------------------- host users

  readonly roleChartData = computed(() => {
    const byRole = this.store.hostUsersByRole();
    return {
      labels: byRole.labels,
      datasets: [
        {
          label: 'Host users',
          data: byRole.values,
          backgroundColor: this.#brand(),
          borderRadius: 6,
          minBarLength: 2,
          maxBarThickness: 28,
          categoryPercentage: 0.7,
          barPercentage: 0.85,
        },
      ],
    };
  });

  readonly roleSummary = computed(() => {
    const byRole = this.store.hostUsersByRole();
    return byRole.labels.map((label, index) => `${label}: ${byRole.values[index]} users`);
  });

  readonly signupChartData = computed(() => {
    const trend = this.store.hostSignupTrend();
    const brand = this.#brand();
    return {
      labels: trend.labels,
      datasets: [
        {
          label: 'New host users',
          data: trend.values,
          borderColor: brand,
          backgroundColor: this.#brandFill(brand),
          pointBackgroundColor: brand,
          fill: true,
          tension: 0.35,
        },
      ],
    };
  });

  readonly signupSummary = computed(() => {
    const trend = this.store.hostSignupTrend();
    return trend.labels.map((label, index) => `${label}: ${trend.values[index]} new host users`);
  });

  readonly activityItems = computed<HostListItem[]>(() =>
    this.store.recentHostActivity().map((row) => ({
      key: row.key,
      icon:
        row.entity === 'Role'
          ? 'pi pi-shield'
          : row.action === 'Added'
            ? 'pi pi-user-plus'
            : 'pi pi-user-edit',
      title: row.name,
      subtitle: [`${row.entity} ${row.action.toLowerCase()}`, row.detail]
        .filter(Boolean)
        .join(' · '),
      meta: this.#datePipe.transform(row.at, 'dd MMM yyyy, hh:mm a') ?? '',
      link: row.entity === 'Role' ? '/app/platform-roles' : '/app/platform-users',
    })),
  );

  reload(): void {
    this.store.reload();
  }
}
