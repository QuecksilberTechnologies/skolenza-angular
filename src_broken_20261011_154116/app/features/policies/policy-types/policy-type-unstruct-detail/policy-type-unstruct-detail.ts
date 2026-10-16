import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from '@openng/optimus-ui/button';
import { finalize } from 'rxjs';

import { Common, PolicyTypeApi } from '@core/services';
import { TableLoader } from '@shared/index';
import {
  GetPolicyTypeUnstructReq,
  IPolicyTypeUnstructDetail,
  PolicyType,
} from '@shared/interfaces';

@Component({
  selector: 'app-policy-type-unstruct-detail',
  imports: [ButtonModule, TableLoader],
  templateUrl: './policy-type-unstruct-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PolicyTypeUnstructDetail implements OnInit {
  readonly #policyTypeApi = inject(PolicyTypeApi);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly policyType = input<PolicyType>();
  readonly closePopup = output();
  readonly unstructDetails = signal<IPolicyTypeUnstructDetail[]>([]);
  readonly isLoading = signal(false);

  constructor() {
    effect(() => {
      this.unstructDetails.set(this.#policyTypeApi.policyTypeUnstructDetails());
    });

    effect(() => {
      this.isLoading.set(this.#policyTypeApi.isLoadingUnstruct());
    });
  }

  ngOnInit() {
    this.getUnstructDetails();
  }

  getUnstructDetails() {
    const pt = this.policyType();
    if (!pt?.id) {
      return;
    }

    const body: GetPolicyTypeUnstructReq = {
      PolicyTypeId: pt.id,
      PolicyTypeEnumVal: pt.policyTypeEnumVal,
      IsActive: true,
    };

    this.#policyTypeApi.setIsLoadingUnstruct(true);
    this.#policyTypeApi.setPolicyTypeUnstructDetails([]);

    this.#policyTypeApi
      .getPolicyTypeUnstructDetails(body)
      .pipe(
        finalize(() => this.#policyTypeApi.setIsLoadingUnstruct(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.#policyTypeApi.setPolicyTypeUnstructDetails(res.isSucceeded ? res.data : []);
          if (!res.isSucceeded) {
            this.#commonService.showMessage(res.message, 'error');
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  onClose() {
    this.closePopup.emit();
  }
}
