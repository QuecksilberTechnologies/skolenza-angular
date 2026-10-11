import { OverlayModule } from '@angular/cdk/overlay';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';
import { distinctUntilChanged, finalize, skip } from 'rxjs';

import { Common } from '@core/services/common';
import { StaffMemberBasicAPI } from '@core/services/staff-member-basic-api';
import { AuthStore, CheckInStore } from '@core/stores';
import { GetProfileImageReq, GetProfileSummaryReq, LoginInfo } from '@shared/interfaces';

import { IdCardPopover } from '../id-card-popover/id-card-popover';
import { ProfilePic } from '../profile-pic/profile-pic';
import { ProfileSummaryBlockShimmer } from '../profile-summary-block-shimmer/profile-summary-block-shimmer';
import { ProfileSummaryBlock } from '../profile-summary-block/profile-summary-block';

@Component({
  selector: 'app-profile-summary',
  imports: [
    ProfilePic,
    ButtonModule,
    OverlayModule,
    ProfileSummaryBlock,
    ProfileSummaryBlockShimmer,
    IdCardPopover,
  ],
  templateUrl: './profile-summary.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileSummary implements OnInit {
  readonly #staffMemberBasicAPI = inject(StaffMemberBasicAPI);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #route = inject(ActivatedRoute);
  readonly #authStore = inject(AuthStore);
  readonly checkInStore = inject(CheckInStore);
  readonly isHost = this.#authStore.isHost;
  readonly isProfileSummaryLoading = computed(() =>
    this.#staffMemberBasicAPI.isProfileSummaryLoading(),
  );
  readonly profileSummary = computed(() => this.#staffMemberBasicAPI.profileSummary());
  readonly showIdCard = signal(false);
  readonly idCardPopover = viewChild<IdCardPopover>('idCardPopover');
  protected readonly idCardTrigger = viewChild<ElementRef<HTMLButtonElement>>('idCardTrigger');
  protected loginInfo!: LoginInfo;

  readonly #currentTime = signal(new Date());
  readonly currentTimeDisplay = computed(() => {
    return this.#currentTime().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  });

  constructor() {
    const intervalId = setInterval(() => this.#currentTime.set(new Date()), 1000);
    this.#destroyRef.onDestroy(() => clearInterval(intervalId));
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();
    await this.loadProfileData();

    // Reload only when fragment value changes (e.g., switching from staffMember profile to self profile via top-right menu)
    this.#route.fragment
      .pipe(skip(1), distinctUntilChanged(), takeUntilDestroyed(this.#destroyRef))
      .subscribe(async () => {
        await this.loadProfileData();
      });
  }

  async loadProfileData() {
    await this.getProfileImages();
    await this.getProfileSummary();
  }

  async getProfileImages() {
    const body: GetProfileImageReq = {
      StaffMemberId: this.#getTargetStaffMemberId(),
      IsActive: true,
    };

    this.#staffMemberBasicAPI.setIsProfilePicLoading(true);
    this.#staffMemberBasicAPI.setProfileImage(null);

    this.#staffMemberBasicAPI
      .getProfileImages(body)
      .pipe(
        finalize(() => this.#staffMemberBasicAPI.setIsProfilePicLoading(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          if (res.isSucceeded && res.data) {
            this.#staffMemberBasicAPI.setProfileImage(res.data);
          } else {
            this.#staffMemberBasicAPI.setProfileImage(null);
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  async getProfileSummary() {
    const body: GetProfileSummaryReq = {
      StaffMemberId: this.#getTargetStaffMemberId(),
      IsActive: true,
    };

    this.#staffMemberBasicAPI.setIsProfileSummaryLoading(true);
    this.#staffMemberBasicAPI.setProfileSummary(null);

    this.#staffMemberBasicAPI
      .getProfileSummary(body)
      .pipe(
        finalize(() => this.#staffMemberBasicAPI.setIsProfileSummaryLoading(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          if (res.isSucceeded) {
            this.#staffMemberBasicAPI.setProfileSummary(res.data);
          } else {
            this.#commonService.showMessage(res.message, 'error');
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  updateProfile($event: { id: number; file?: File }) {
    const fd = new FormData();
    fd.append('Id', $event.id?.toString() ?? '');
    fd.append('ProfileImage', $event.file ?? '');
    fd.append('FileName', $event.file?.name ?? '');
    fd.append('IsActive', $event.file ? 'true' : 'false');

    this.#staffMemberBasicAPI.setIsProfilePicLoading(true);
    this.#staffMemberBasicAPI
      .updateProfileImages(fd)
      .pipe(
        finalize(() => this.#staffMemberBasicAPI.setIsProfilePicLoading(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          if (res.isSucceeded) {
            this.getProfileImages();
            this.#syncProfileImageToStore($event.file);
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  #syncProfileImageToStore(file?: File): void {
    // Only sync when updating the logged-in user's own profile
    if (this.#route.snapshot.queryParamMap.has('staffMemberId')) return;

    if (file) {
      // Read the file as a data URL to update the avatar immediately,
      // then the next getProfileImages call will provide the server URL
      const body: GetProfileImageReq = {
        StaffMemberId: this.loginInfo?.user?.staffMemberId ?? '',
        IsActive: true,
      };
      this.#staffMemberBasicAPI
        .getProfileImages(body)
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe((res) => {
          if (res.isSucceeded && res.data) {
            this.#authStore.updateProfileImageLink(res.data.filePath);
          }
        });
    } else {
      // Image was removed
      this.#authStore.updateProfileImageLink('');
    }
  }

  #getTargetStaffMemberId(): string {
    return (
      this.#route.snapshot.queryParamMap.get('staffMemberId') ?? this.loginInfo?.user?.staffMemberId ?? ''
    );
  }

  toggleIdCard() {
    if (this.showIdCard()) {
      this.showIdCard.set(false);
      return;
    }
    this.idCardPopover()?.loadData(this.profileSummary());
    this.showIdCard.set(true);
  }

  focusIdCardTrigger() {
    this.idCardTrigger()?.nativeElement.focus();
  }
}
