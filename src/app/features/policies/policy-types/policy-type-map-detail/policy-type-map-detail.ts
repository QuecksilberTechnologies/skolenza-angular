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

import { Common, PolicyTypeInsuranceMapApi } from '@core/services';
import { TableLoader } from '@shared/index';
import {
  GetPolicyTypeInsuranceMapDetailReq,
  IPolicyTypeInsuranceMapDetail,
  LoginInfo,
  PolicyType,
} from '@shared/interfaces';

@Component({
  selector: 'app-policy-type-map-detail',
  imports: [ButtonModule, TableLoader],
  templateUrl: './policy-type-map-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PolicyTypeMapDetail implements OnInit {
  readonly #policyTypeInsuranceMapApi = inject(PolicyTypeInsuranceMapApi);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly policyType = input<PolicyType>();
  readonly closePopup = output();
  readonly policyTypeInsuranceMapDetails = signal<IPolicyTypeInsuranceMapDetail[]>([]);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  protected loginInfo!: LoginInfo;

  constructor() {
    effect(() => {
      this.policyTypeInsuranceMapDetails.set(
        this.#policyTypeInsuranceMapApi.policyTypeInsuranceMapDetails(),
      );
    });

    effect(() => {
      this.isLoading.set(this.#policyTypeInsuranceMapApi.isLoading());
    });
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();
    this.getPolicyTypeInsuranceMapDetails();
  }

  async getPolicyTypeInsuranceMapDetails() {
    const policyTypeId = this.policyType()?.id;
    if (!policyTypeId) {
      return;
    }

    const body: GetPolicyTypeInsuranceMapDetailReq = {
      PolicyTypeId: policyTypeId,
      IsActive: true,
    };

    this.#policyTypeInsuranceMapApi.setIsLoading(true);
    this.#policyTypeInsuranceMapApi.setPolicyTypeInsuranceMapDetails([]);

    this.#policyTypeInsuranceMapApi
      .getPolicyTypeInsuranceMapDetails(body)
      .pipe(
        finalize(() => this.#policyTypeInsuranceMapApi.setIsLoading(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: async (res) => {
          this.#policyTypeInsuranceMapApi.setPolicyTypeInsuranceMapDetails(
            res.isSucceeded ? res.data : [],
          );
          if (!res.isSucceeded) {
            this.#commonService.showMessage(res.message, 'error');
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  onSave() {
    this.#commonService.showMessage(
      'This operation is not yet implemented. Please check back later.',
      'warn',
    );
  }

  onCloss() {
    this.closePopup.emit();
  }
}
