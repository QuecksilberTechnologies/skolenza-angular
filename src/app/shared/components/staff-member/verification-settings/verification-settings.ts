import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import { TooltipModule } from '@openng/optimus-ui/tooltip';
import { finalize } from 'rxjs';

import { Common } from '@core/services/common';
import { StaffMembersApi } from '@core/services/staff-member-api';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { UserAvatar } from '@shared/components/user-avatar/user-avatar';
import {
  CompletionPercentage,
  GetAllPercentageReq,
  IStaffMember,
  LoginInfo,
  UpdateBulkReq,
} from '@shared/interfaces';
import { GetStaffMemberProgressColorPipe, GetProgressTonePipe } from '@shared/pipes';
import { PROFILE_TABS } from '@shared/utilities/common-data';

import { VerificationSettingsStore } from './verification-settings.store';

interface SectionMeta {
  icon: string;
  description: string;
}

/**
 * Icon and blurb per profile section - the API returns the section name alone. Keyed only by the
 * sections `PROFILE_ROUTES` actually has a tab for; the API's completion list also carries
 * work-configuration sections (Work Locations, Devices, Work Arrangement, Work Pattern, Overrides)
 * that live on their own pages outside the StaffMember Profile tabs and have no `tabInfoType` to save
 * against, so `#profileSections` filters those out before this map ever sees them.
 */
const SECTION_META: Readonly<Record<string, SectionMeta>> = {
  Overview: {
    icon: 'pi pi-user',
    description: 'Basic information, job details',
  },
  Bank: {
    icon: 'pi pi-building-columns',
    description: 'Bank account details',
  },
  Contact: {
    icon: 'pi pi-phone',
    description: 'Phone, email, address',
  },
  Experience: {
    icon: 'pi pi-briefcase',
    description: 'Work history, previous roles',
  },
  Insurance: {
    icon: 'pi pi-shield',
    description: 'Health, life insurance details',
  },
  Identity: {
    icon: 'pi pi-id-card',
    description: 'Government ID, documents',
  },
  Education: {
    icon: 'pi pi-graduation-cap',
    description: 'Degrees, certifications',
  },
  Dependent: {
    icon: 'pi pi-users',
    description: 'Family and dependants',
  },
};

const FALLBACK_SECTION_META: SectionMeta = {
  icon: 'pi pi-file',
  description: '',
};

const TAB_INFO_TYPE_BY_SECTION: Readonly<Record<string, number>> = {
  Overview: PROFILE_TABS.StaffMember,
  Bank: PROFILE_TABS.Bank,
  Contact: PROFILE_TABS.Contact,
  Experience: PROFILE_TABS.Experience,
  Identity: PROFILE_TABS.Identity,
  Education: PROFILE_TABS.Education,
  Dependent: PROFILE_TABS.Dependent,
  Insurance: PROFILE_TABS.Insurance,
};

@Component({
  selector: 'app-verification-settings',
  imports: [
    ToggleSwitchModule,
    ButtonModule,
    FormsModule,
    UserAvatar,
    TooltipModule,
    GetStaffMemberProgressColorPipe,
    GetProgressTonePipe,
    TableLoader,
  ],
  templateUrl: './verification-settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [VerificationSettingsStore],
})
export class VerificationSettings implements OnInit {
  readonly #staffMemberApi = inject(StaffMembersApi);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #verificationStore = inject(VerificationSettingsStore);
  readonly staffMember = input<IStaffMember>();
  readonly saveSettings = output();
  readonly closePopup = output();
  readonly closeCancelled = output();
  readonly completionPercentages = signal<CompletionPercentage[]>([]);
  readonly #initialCompletionPercentages = signal<CompletionPercentage[]>([]);
  protected readonly isLoading = this.#verificationStore.isLoadingPercentages;
  protected readonly isSaving = this.#verificationStore.isSavingBulkUpdate;
  protected loginInfo!: LoginInfo;

  protected readonly staffMemberFullName = computed(() =>
    [this.staffMember()?.firstName, this.staffMember()?.middleName, this.staffMember()?.lastName]
      .filter(Boolean)
      .join(' '),
  );

  /**
   * The displayed percentage, rounded once. The tone bands read the same number the label
   * shows, so 79.5 cannot render "80%" in the under-80 amber.
   */
  protected readonly completionPercent = computed(() => {
    const completion = this.staffMember()?.completionPercentage;
    return completion == null ? null : Math.round(completion);
  });

  readonly isDirty = computed(() => {
    const current = this.completionPercentages();
    const initial = this.#initialCompletionPercentages();

    return (
      current.length !== initial.length ||
      current.some(
        (section, index) =>
          Boolean(section.isInfoVerified) !== Boolean(initial[index]?.isInfoVerified) ||
          Boolean(section.isEditAllowed) !== Boolean(initial[index]?.isEditAllowed),
      )
    );
  });

  constructor() {
    effect(() => {
      const percentages = this.#copyPercentages(
        this.#verificationStore.completionPercentages(),
      ).filter((section) => section.sectionName in TAB_INFO_TYPE_BY_SECTION);
      this.completionPercentages.set(percentages);
      this.#initialCompletionPercentages.set(this.#copyPercentages(percentages));
    });
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();
    this.getAllPercentage();
  }

  protected sectionMeta(sectionName: string): SectionMeta {
    return SECTION_META[sectionName] ?? FALLBACK_SECTION_META;
  }

  async getAllPercentage() {
    const staffMemberId = this.staffMember()?.staffMemberId;
    if (!staffMemberId) {
      return;
    }

    const body: GetAllPercentageReq = { staffMemberId };

    this.#verificationStore.setIsLoadingPercentages(true);
    this.#verificationStore.setCompletionPercentages([]);

    this.#staffMemberApi
      .getAllPercentage(body)
      .pipe(
        finalize(() => this.#verificationStore.setIsLoadingPercentages(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.#verificationStore.setCompletionPercentages(res.isSucceeded ? res.data : []);
          if (!res.isSucceeded) {
            this.#commonService.showMessage(res.message, 'error');
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  updateSectionSetting(
    sectionName: string,
    setting: 'isInfoVerified' | 'isEditAllowed',
    value: boolean,
  ) {
    this.completionPercentages.update((sections) =>
      sections.map((section) =>
        section.sectionName === sectionName ? { ...section, [setting]: value } : section,
      ),
    );
  }

  onSave() {
    if (!this.isDirty() || this.isSaving()) {
      return;
    }

    const userStaffMemberId = this.loginInfo?.user?.staffMemberId ?? '';
    const staffMemberId = this.staffMember()?.staffMemberId ?? '';

    const mappedData = this.completionPercentages().map((section) => ({
      tabInfoType: TAB_INFO_TYPE_BY_SECTION[section.sectionName],
      isVerified: Boolean(section.isInfoVerified),
      isEditAllowed: Boolean(section.isEditAllowed),
    }));

    const body: UpdateBulkReq = {
      userStaffMemberId,
      staffMemberId,
      sections: mappedData,
      isActive: true,
    };

    this.#verificationStore.setIsSavingBulkUpdate(true);
    this.#staffMemberApi
      .updateBulk(body)
      .pipe(
        finalize(() => this.#verificationStore.setIsSavingBulkUpdate(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          if (res.isSucceeded) {
            this.saveSettings.emit();
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  onClose() {
    this.requestClose();
  }

  requestClose() {
    if (this.isSaving()) {
      return;
    }

    if (!this.isDirty()) {
      this.closePopup.emit();
      return;
    }

    this.#confirmationService.confirm({
      header: 'Discard changes?',
      message: 'Your unsaved verification settings will be lost.',
      icon: 'pi pi-exclamation-circle !text-amber-500 !text-xl',
      acceptLabel: 'Discard changes',
      rejectLabel: 'Keep editing',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.restoreInitialValues();
        this.closePopup.emit();
      },
      reject: () => this.closeCancelled.emit(),
    });
  }

  private restoreInitialValues() {
    this.completionPercentages.set(this.#copyPercentages(this.#initialCompletionPercentages()));
  }

  #copyPercentages(percentages: CompletionPercentage[]): CompletionPercentage[] {
    return percentages.map((percentage) => ({ ...percentage }));
  }
}
