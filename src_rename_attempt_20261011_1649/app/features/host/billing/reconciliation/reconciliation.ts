import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { MessageModule } from '@openng/optimus-ui/message';

import { Common } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import { HOST_BILLING_MODULE, HostReconciliationSummary } from '@shared/interfaces';
import { fieldErrorMessage, showFieldError } from '@shared/utilities/field-error';

import { ReconciliationStore } from './reconciliation.store';
import { WebhookRetryModel, webhookRetrySchema } from './webhook-retry.schema';

type TileTone = 'warning' | 'error';

interface ReconciliationTile {
  key: keyof Omit<HostReconciliationSummary, 'generatedAt'>;
  label: string;
  hint: string;
  icon: string;
  /** Colour a non-zero count takes. Tiles without a tone are informational, never an issue. */
  tone?: TileTone;
}

/** Light-theme `-700`/`-600` and dark-theme `-400` text, the AA-safe semantic pairs. */
const TONE_TEXT: Record<TileTone, string> = {
  warning: 'text-amber-700 dark:text-amber-400',
  error: 'text-red-600 dark:text-red-400',
};

/** Fixed order: the payment pipeline first, then the webhook inbox, then refunds. */
const TILES: readonly ReconciliationTile[] = [
  {
    key: 'stalePendingOrders',
    label: 'Stale pending orders',
    hint: 'Orders still pending past the payment timeout',
    icon: 'pi pi-hourglass',
    tone: 'warning',
  },
  {
    key: 'failedPaymentAttempts',
    label: 'Failed payment attempts',
    hint: 'Attempts the gateway rejected',
    icon: 'pi pi-times-circle',
    tone: 'error',
  },
  {
    key: 'failedWebhookEvents',
    label: 'Failed webhook events',
    hint: 'Events that could not be processed',
    icon: 'pi pi-exclamation-triangle',
    tone: 'error',
  },
  {
    key: 'pendingWebhookEvents',
    label: 'Pending webhook events',
    hint: 'Events waiting to be processed',
    icon: 'pi pi-inbox',
    tone: 'warning',
  },
  {
    key: 'requestedRefunds',
    label: 'Requested refunds',
    hint: 'Refunds queued for the gateway',
    icon: 'pi pi-replay',
  },
];

@Component({
  selector: 'app-reconciliation',
  imports: [DatePipe, ButtonModule, CardModule, InputNumberModule, MessageModule, FormField],
  providers: [ReconciliationStore],
  templateUrl: './reconciliation.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Reconciliation {
  readonly #commonService = inject(Common);
  readonly #featurePageStore = inject(FeaturePageStore);

  readonly store = inject(ReconciliationStore);

  protected readonly moduleCode = HOST_BILLING_MODULE.reconciliation;

  protected readonly tiles = computed(() => {
    const summary = this.store.summary();
    return TILES.map((tile) => {
      const count = summary ? summary[tile.key] : null;
      return { ...tile, count, toneClass: count && tile.tone ? TONE_TEXT[tile.tone] : '' };
    });
  });

  /** True once loaded with every issue tile at zero; refunds alone never block it. */
  protected readonly isAllClear = computed(() => {
    const summary = this.store.summary();
    return !!summary && TILES.every((tile) => !tile.tone || summary[tile.key] === 0);
  });

  protected readonly canRetry = computed(() =>
    this.#featurePageStore.canPerform(this.moduleCode, 'Update'),
  );

  protected readonly model = signal<WebhookRetryModel>({ eventId: null });
  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, webhookRetrySchema);
  });
  protected readonly submitted = signal(false);

  protected readonly showEventIdError = computed(() =>
    showFieldError(this.f.eventId, this.submitted()),
  );
  protected readonly eventIdError = computed(() => fieldErrorMessage(this.f.eventId));

  constructor() {
    effect(() => this.setPageHeaderInfo());
  }

  setPageHeaderInfo() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: this.#featurePageStore.displayNameOf(this.moduleCode) ?? 'Reconciliation',
      pageDescription: 'Track payment and webhook issues that need attention',
      pageIcon: 'pi pi-sync',
      isBreadcrumbShow: false,
    });
  }

  async onRetry(event: Event) {
    event.preventDefault();
    this.submitted.set(true);
    this.f().markAsTouched();

    const eventId = this.model().eventId;
    if (this.f().invalid() || eventId === null) return;

    const retried = await this.store.retryWebhook(eventId);
    if (retried) {
      this.model.set({ eventId: null });
      this.submitted.set(false);
      this.f().reset();
    }
  }
}
