import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';
import {
  Banknote,
  Briefcase,
  Building,
  CalendarCheck2,
  Contact,
  Droplet,
  ExternalLink,
  HeartHandshake,
  Home,
  LucideAngularModule,
  MapPin,
  PhoneCall,
  Smartphone,
  UserCheck,
  UserCog,
  Users,
  UserX,
} from 'lucide-angular';
import { finalize } from 'rxjs';

import { Common, StaffMembersApi } from '@core/services';
import { LookupStore } from '@core/stores';
import { GetStaffMemberSummaryReq, IStaffMember, SummaryStaffMemberInfo } from '@shared/interfaces';
import { GetRelationNamePipe, GetRoleTypePipe } from '@shared/pipes';

import { AvatarPopupHeader } from './avatar-popup-header/avatar-popup-header';
import { AvatarPopupItem } from './avatar-popup-item/avatar-popup-item';

@Component({
  selector: 'app-avatar-popup',
  imports: [
    DatePipe,
    AvatarPopupItem,
    AvatarPopupHeader,
    GetRelationNamePipe,
    GetRoleTypePipe,
    SkeletonModule,
    RouterLink,
    LucideAngularModule,
  ],
  templateUrl: './avatar-popup.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarPopup implements OnInit {
  readonly #staffMemberApi = inject(StaffMembersApi);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #lookupStore = inject(LookupStore);

  readonly staffMember = input.required<IStaffMember>();
  readonly staffMemberSummary = input<SummaryStaffMemberInfo | null>();
  /** Lets the list cache the summary, so reopening this popup costs no request. */
  readonly summaryLoaded = output<SummaryStaffMemberInfo>();
  readonly isLoading = signal(false);
  readonly summary = signal<SummaryStaffMemberInfo | null>(null);
  readonly relationsOptions = this.#lookupStore.relations;

  readonly UserCog = UserCog;
  readonly Contact = Contact;
  readonly Building = Building;
  readonly Briefcase = Briefcase;
  readonly UserCheck = UserCheck;
  readonly CalendarCheck2 = CalendarCheck2;
  readonly Banknote = Banknote;
  readonly HeartHandshake = HeartHandshake;
  readonly Users = Users;
  readonly PhoneCall = PhoneCall;
  readonly Smartphone = Smartphone;
  readonly Droplet = Droplet;
  readonly MapPin = MapPin;
  readonly Home = Home;
  readonly ExternalLink = ExternalLink;
  readonly UserX = UserX;

  ngOnInit() {
    const existing = this.staffMemberSummary();
    if (existing && Object.keys(existing).length > 0) {
      this.summary.set(existing);
      return;
    }

    this.fetchSummary();
  }

  private fetchSummary() {
    const staffMember = this.staffMember();
    const req: GetStaffMemberSummaryReq = {
      StaffMemberId: staffMember.staffMemberId,
      IsActive: staffMember.isActive,
    };

    this.isLoading.set(true);
    this.#staffMemberApi
      .getStaffMemberSummary(req)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          if (res.isSucceeded && res.data) {
            this.summary.set(res.data);
            this.summaryLoaded.emit(res.data);
          }
        },
        error: (err) => this.#commonService.showMessage(err.message, 'error'),
      });
  }
}
