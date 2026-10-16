import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CheckboxModule } from '@openng/optimus-ui/checkbox';
import { IconFieldModule } from '@openng/optimus-ui/iconfield';
import { InputIconModule } from '@openng/optimus-ui/inputicon';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';
import { TooltipModule } from '@openng/optimus-ui/tooltip';
import { finalize } from 'rxjs';

import { AssetsApi, Common, StaffMembersApi } from '@core/services';
import { UserAvatar } from '@shared/components/user-avatar/user-avatar';
import { Asset, AssignAssetReq, GetAllStaffMembersReq, IStaffMember } from '@shared/interfaces';

@Component({
  selector: 'app-assign-asset-popup',
  imports: [
    UserAvatar,
    FormsModule,
    ButtonModule,
    CheckboxModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    SkeletonModule,
    TooltipModule,
  ],
  templateUrl: './assign-asset-popup.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssignAssetPopup implements OnInit {
  readonly #staffMembersApi = inject(StaffMembersApi);
  readonly #assetsApi = inject(AssetsApi);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);

  readonly asset = input.required<Asset>();
  readonly userStaffMemberId = input.required<string>();

  readonly assetAssigned = output<void>();

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly staffMembers = signal<IStaffMember[]>([]);
  readonly searchTerm = signal('');
  readonly selectedIds = signal<string[]>([]);

  readonly hasMultipleUser = computed(() => this.asset().hasMultipleUser);

  readonly filteredStaffMembers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const all = this.staffMembers();
    if (!term) return all;
    return all.filter(
      (e) =>
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(term) ||
        e.officialEmail.toLowerCase().includes(term),
    );
  });

  readonly canSave = computed(() => this.selectedIds().length > 0 && !this.isSaving());

  ngOnInit() {
    this.loadStaffMembers();
  }

  private loadStaffMembers() {
    this.isLoading.set(true);
    const req: GetAllStaffMembersReq = {
      UserStaffMemberId: this.userStaffMemberId(),
      PageNumber: 1,
      PageSize: 500,
    };
    this.#staffMembersApi
      .getAllStaffMembers(req)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          if (res.isSucceeded) {
            this.staffMembers.set(res.data);
          } else {
            this.#commonService.showMessage(res.message, 'error');
          }
        },
        error: (err) => this.#commonService.showMessage(err.message, 'error'),
      });
  }

  isSelected(staffMemberId: string): boolean {
    return this.selectedIds().includes(staffMemberId);
  }

  isDisabled(staffMemberId: string): boolean {
    if (this.isSelected(staffMemberId)) return false;
    if (!this.hasMultipleUser() && this.selectedIds().length >= 1) return true;
    return false;
  }

  onToggleStaffMember(staffMemberId: string) {
    if (this.hasMultipleUser()) {
      const current = this.selectedIds();
      this.selectedIds.set(
        current.includes(staffMemberId)
          ? current.filter((id) => id !== staffMemberId)
          : [...current, staffMemberId],
      );
    } else {
      const current = this.selectedIds();
      this.selectedIds.set(current[0] === staffMemberId ? [] : [staffMemberId]);
    }
  }

  onSearchInput(event: Event) {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  onSave() {
    this.isSaving.set(true);
    const body: AssignAssetReq = {
      AssetId: this.asset().assetId,
      StaffMemberIds: this.selectedIds(),
    };
    this.#assetsApi
      .assignAsset(body)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          if (res.isSucceeded) {
            this.#commonService.showMessage('Asset assigned successfully', 'success');
            this.assetAssigned.emit();
          } else {
            this.#commonService.showMessage(res.message, 'error');
          }
        },
        error: (err) => this.#commonService.showMessage(err.message, 'error'),
      });
  }
}
