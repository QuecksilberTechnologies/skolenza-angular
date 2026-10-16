import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';

import { Common } from '@core/services';
import { AuthStore } from '@core/stores';
import { IOkrAttachment } from '@shared/interfaces';

import { resolveOkrOrigin } from '../okr-nav';
import { OkrAttachments } from './okr-attachments/okr-attachments';
import { OkrComments } from './okr-comments/okr-comments';
import { OkrDetailStore } from './okr-detail.store';
import { OkrKeyResults } from './okr-key-results/okr-key-results';
import { OkrLinkedGoals } from './okr-linked-goals/okr-linked-goals';
import { OkrSummary } from './okr-summary/okr-summary';
import { OkrTimeline } from './okr-timeline/okr-timeline';

@Component({
  selector: 'app-okr-detail',
  imports: [
    CardModule,
    ButtonModule,
    SkeletonModule,
    OkrSummary,
    OkrKeyResults,
    OkrTimeline,
    OkrLinkedGoals,
    OkrAttachments,
    OkrComments,
  ],
  providers: [OkrDetailStore],
  templateUrl: './okr-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class OkrDetail implements OnInit {
  readonly store = inject(OkrDetailStore);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #commonService = inject(Common);
  readonly #authStore = inject(AuthStore);
  readonly #destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    // paramMap (not snapshot) so navigating between linked OKRs reloads in place.
    this.#route.paramMap.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((params) => {
      this.store.setOkrId(params.get('id') ?? '');
    });

    this.#commonService.setPageHeaderInfo({
      pageTitle: 'OKR Details',
      pageDescription: 'Full objective breakdown, progress and activity',
      pageIcon: 'pi pi-flag',
      isBreadcrumbShow: true,
    });

    this.#commonService.setBreadcrumbItems([
      { label: 'OKRs', routerLink: '/app/okr/dashboard' },
      { label: 'OKR Details' },
    ]);
  }

  get canManage(): boolean {
    const role = this.#authStore.roleTypeId();
    return role === 1 || role === 3;
  }

  get #from(): string | null {
    return this.#route.snapshot.queryParamMap.get('from');
  }

  edit(): void {
    const okr = this.store.okr();
    if (okr) {
      this.#router.navigate(['/app/okr', okr.id, 'edit'], { queryParams: { from: this.#from } });
    }
  }

  back(): void {
    this.#router.navigateByUrl(resolveOkrOrigin(this.#from));
  }

  openLinkedGoal(id: string): void {
    this.#router.navigate(['/app/okr', id], { queryParams: { from: this.#from } });
  }

  download(attachment: IOkrAttachment): void {
    this.store.downloadAttachment(attachment);
  }

  onUpload(file: File): void {
    this.store.uploadAttachment(file);
  }

  addComment(message: string): void {
    this.store.addComment(message);
  }
}
