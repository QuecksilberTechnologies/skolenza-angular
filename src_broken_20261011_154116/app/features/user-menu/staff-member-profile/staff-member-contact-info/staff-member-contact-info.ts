import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { finalize } from 'rxjs';

import { Common, StaffMemberContactsAPI, ProfileAccessApi } from '@core/services';
import { LookupStore } from '@core/stores';
import { ProfileBlockActions } from '@shared/components/profile/profile-block-actions/profile-block-actions';
import { ProfileEmpty } from '@shared/components/profile/profile-empty/profile-empty';
import { ProfileHeader } from '@shared/components/profile/profile-header/profile-header';
import { ProfileInfoBlock } from '@shared/components/profile/profile-info-block/profile-info-block';
import { ProfileInfoCard } from '@shared/components/profile/profile-info-card/profile-info-card';
import { ProfileLoader } from '@shared/components/profile/profile-loader/profile-loader';
import {
  DeleteStaffMemberContactReq,
  StaffMemberContact,
  GetStaffMemberContactReq,
  LoginInfo,
} from '@shared/interfaces';
import { GetRelationNamePipe } from '@shared/pipes';
import { PROFILE_TABS } from '@shared/utilities/common-data';

import StaffMemberContactForm from './staffMember-contact-form/staffMember-contact-form';

@Component({
  selector: 'app-staffMember-contact-info',
  imports: [
    CardModule,
    FormsModule,
    ConfirmDialogModule,
    ProfileEmpty,
    ProfileLoader,
    ProfileInfoBlock,
    ProfileHeader,
    ProfileBlockActions,
    GetRelationNamePipe,
    ProfileInfoCard,
  ],
  templateUrl: './staffMember-contact-info.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffMemberContactInfo implements OnInit {
  readonly #staffMemberContactsAPI = inject(StaffMemberContactsAPI);
  readonly #profileAccessApi = inject(ProfileAccessApi);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #commonService = inject(Common);
  readonly #dialogService = inject(DialogService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #route = inject(ActivatedRoute);
  readonly #lookupStore = inject(LookupStore);
  readonly profileHeader = viewChild<ProfileHeader>('profileHeader');
  readonly staffMemberContacts = computed(() => this.#staffMemberContactsAPI.staffMemberContacts());
  readonly completionPercentage = computed(() => this.#staffMemberContactsAPI.completionPercentage());
  readonly relationsOptions = this.#lookupStore.relations;
  readonly profileEmptyMessage = 'No contact information found';
  readonly profileEmptyDescription = "We couldn't find any contact details to display.";
  readonly profileEmptyTabIcon = 'pi pi-address-book';
  // True from the start: ngOnInit awaits the session before the request goes out.
  readonly isLoading = signal(true);
  readonly isVerifying = computed(() => this.#profileAccessApi.isVerifying());
  readonly isEditing = computed(() => this.#profileAccessApi.isEditing());
  protected tabInfoType = PROFILE_TABS.Contact;
  protected loginInfo: LoginInfo | undefined;

  constructor() {
    this.#staffMemberContactsAPI.setStaffMemberContacts([]);
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();
    await this.getStaffMemberContacts();
  }

  async getStaffMemberContacts() {
    const body: GetStaffMemberContactReq = {
      StaffMemberId: this.#getTargetStaffMemberId(),
      UserStaffMemberId: this.loginInfo?.user?.staffMemberId ?? '',
    };

    this.isLoading.set(true);
    this.#staffMemberContactsAPI.setStaffMemberContacts([]);

    this.#staffMemberContactsAPI
      .getStaffMemberContacts(body)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          if (res.isSucceeded) {
            this.#staffMemberContactsAPI.setStaffMemberContacts(res.data ?? []);
            this.#staffMemberContactsAPI.setCompletionPercentage(res.completionPercentage);
          } else {
            this.#staffMemberContactsAPI.setStaffMemberContacts([]);
            this.#commonService.showMessage(res.message, 'error');
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  getContactType(contact: StaffMemberContact) {
    switch (Number(contact.contactType)) {
      case 1:
        return 'Rental';
      case 2:
        return 'Permanent';
      case 3:
        return 'Temporary';
      default:
        return 'Unknown';
    }
  }

  async addEditContact(staffMemberContact?: StaffMemberContact) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(StaffMemberContactForm, {
      header: staffMemberContact ? 'Edit Contact' : 'Add Contact',
      style: { width: '90vw', maxWidth: '50rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { staffMemberContact },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(async (data) => {
      if (!data) {
        return;
      }
      await this.getStaffMemberContacts();
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  async removeContact(contact: StaffMemberContact) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to delete this contact? This action cannot be undone.`,
      header: 'Delete Contact',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Delete Contact',
      rejectLabel: 'Keep Contact',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.deleteContactProcess(contact);
      },
    });
  }

  deleteContactProcess(contact: StaffMemberContact) {
    const body: DeleteStaffMemberContactReq = {
      Id: contact.id,
    };

    this.#staffMemberContactsAPI
      .deleteStaffMemberContact(body)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: async (res) => {
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          if (res.isSucceeded) {
            this.#staffMemberContactsAPI.removeContactSignal(contact.id);
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  #getTargetStaffMemberId(): string {
    return (
      this.#route.snapshot.queryParamMap.get('staffMemberId') ?? this.loginInfo?.user?.staffMemberId ?? ''
    );
  }

  updateVerifyStatus(status: boolean, id: number) {
    this.getStaffMemberContacts();
    this.#staffMemberContactsAPI.toggleVerifySignal(status, id);
  }

  updateEditStatus(status: boolean) {
    this.getStaffMemberContacts();
    this.#staffMemberContactsAPI.toggleEditSignal(status);
  }
}
