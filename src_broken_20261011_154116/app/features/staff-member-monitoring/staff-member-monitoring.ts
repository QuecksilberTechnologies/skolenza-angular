import { DatePipe, DecimalPipe, NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { DatePickerModule } from '@openng/optimus-ui/datepicker';
import { DialogModule } from '@openng/optimus-ui/dialog';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { SelectModule } from '@openng/optimus-ui/select';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';
import { TabsModule } from '@openng/optimus-ui/tabs';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { Common } from '@core/services';
import { StatusBadge, type StatusTone, TableEmptyMessage, UserAvatar } from '@shared/components';
import {
  AgentConnectionStatus,
  AgentRegistration,
  FieldVisit,
  FieldVisitStatus,
  MonitoringPolicy,
} from '@shared/interfaces';

import { StaffMemberMonitoringStore, MonitoringTab } from './staffMember-monitoring.store';
import MonitoringPolicyDialog from './monitoring-policy-dialog/monitoring-policy-dialog';
import RegisterAgentDialog from './register-agent-dialog/register-agent-dialog';

const CONNECTION: Record<AgentConnectionStatus, { label: string; tone: StatusTone; icon: string }> =
  {
    Online: { label: 'Online', tone: 'success', icon: 'pi-check-circle' },
    Delayed: { label: 'Delayed', tone: 'warning', icon: 'pi-clock' },
    UploadFailure: { label: 'Upload failing', tone: 'danger', icon: 'pi-exclamation-triangle' },
    Unreachable: { label: 'Unreachable', tone: 'danger', icon: 'pi-ban' },
    Inactive: { label: 'Inactive', tone: 'neutral', icon: 'pi-minus-circle' },
    NeverConnected: { label: 'Never connected', tone: 'neutral', icon: 'pi-question-circle' },
  };

const NOT_REGISTERED = {
  label: 'Not registered',
  tone: 'neutral',
  icon: 'pi-minus-circle',
} as const;

const VISIT_STATUS: Record<FieldVisitStatus, { label: string; tone: StatusTone; icon: string }> = {
  Completed: { label: 'Completed', tone: 'success', icon: 'pi-check-circle' },
  InProgress: { label: 'In progress', tone: 'warning', icon: 'pi-spinner' },
  Missed: { label: 'Missed', tone: 'danger', icon: 'pi-times-circle' },
};

@Component({
  selector: 'app-staffMember-monitoring',
  imports: [
    DatePipe,
    DecimalPipe,
    NgOptimizedImage,
    FormsModule,
    ButtonModule,
    CardModule,
    DatePickerModule,
    DialogModule,
    SelectModule,
    SkeletonModule,
    TabsModule,
    TooltipModule,
    StatusBadge,
    TableEmptyMessage,
    UserAvatar,
  ],
  providers: [StaffMemberMonitoringStore],
  templateUrl: './staffMember-monitoring.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export default class StaffMemberMonitoring {
  readonly store = inject(StaffMemberMonitoringStore);
  readonly #document = inject(DOCUMENT);
  readonly #dialogService = inject(DialogService);
  readonly #destroyRef = inject(DestroyRef);

  protected readonly today = new Date();
  protected readonly skeletonTiles = Array.from({ length: 8 }, (_, i) => i);

  protected readonly selectedDate = computed(() => {
    const [y, m, d] = this.store.date().split('-').map(Number);
    return new Date(y, m - 1, d);
  });

  protected readonly connection = computed(() => {
    const status = this.store.agentStatus();
    return status ? CONNECTION[status.connectionStatus] : NOT_REGISTERED;
  });

  protected readonly fieldTime = computed(() => {
    const minutes = this.store.fieldMinutes();
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  });

  protected readonly viewerVisible = computed(() => this.store.selectedCapture() !== null);

  constructor() {
    inject(Common).setPageHeaderInfo({
      pageTitle: 'StaffMember Monitoring',
      pageDescription: 'Screenshots from the desktop agent and field work, per staffMember and day.',
      pageIcon: 'pi pi-desktop',
      isBreadcrumbShow: false,
    });
  }

  protected openPolicy(): void {
    const ref = this.#dialogService.open(MonitoringPolicyDialog, {
      header: 'Monitoring Policy',
      style: { width: '90vw', maxWidth: '44rem' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { policy: this.store.policy() },
    });

    ref?.onClose
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((policy: MonitoringPolicy | undefined) => {
        if (policy) this.store.setPolicy(policy);
      });
    this.#destroyRef.onDestroy(() => ref?.close());
  }

  protected openRegisterAgent(): void {
    const ref = this.#dialogService.open(RegisterAgentDialog, {
      header: 'Register Desktop Agent',
      style: { width: '90vw', maxWidth: '36rem' },
      modal: true,
      // Only Done/Cancel close it, so the one-time credential cannot be dismissed by accident.
      closable: false,
      focusOnShow: false,
      data: { staffMembers: this.store.staffMembers(), staffMemberId: this.store.staffMemberId() },
    });

    ref?.onClose
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((registration: AgentRegistration | undefined) => {
        // Keep only the policy; the credential must not outlive the dialog.
        if (registration) this.store.setPolicy(registration.policy);
      });
    this.#destroyRef.onDestroy(() => ref?.close());
  }

  protected visitStatus(status: FieldVisitStatus) {
    return VISIT_STATUS[status];
  }

  protected visitMinutes(visit: FieldVisit): number | null {
    if (!visit.checkOutUtc) return null;
    return Math.round(
      (new Date(visit.checkOutUtc).getTime() - new Date(visit.checkInUtc).getTime()) / 60000,
    );
  }

  protected mapsUrl(visit: FieldVisit): string {
    return `https://www.google.com/maps?q=${visit.latitude},${visit.longitude}`;
  }

  protected onTabChange(value: string | number | undefined): void {
    this.store.setTab(value as MonitoringTab);
  }

  protected onViewerVisibleChange(visible: boolean): void {
    if (visible) return;
    // Return focus to the tile of the capture last shown, which prev/next may have moved.
    const tileId = `capture-${this.store.selectedCaptureId()}`;
    this.store.closeCapture();
    queueMicrotask(() => this.#document.getElementById(tileId)?.focus());
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.viewerVisible()) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.store.previousCapture();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.store.nextCapture();
    }
  }
}
