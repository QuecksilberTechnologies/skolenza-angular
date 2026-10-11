import { Location } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { Observable } from 'rxjs';

import { AuthApi, Common } from '@core/services';

/** Module and operation names are plain words, sometimes hyphenated ('Subscription-Plan'). Anything
 *  else came from a hand-written URL, not a guard, so it is dropped rather than echoed back onto a
 *  trusted in-app page. No '.' or '/' on purpose: those are what turn an echoed param into a
 *  usable lure. */
const SAFE_NAME = /^[A-Za-z][A-Za-z0-9 \-&']{0,49}$/;

@Component({
  selector: 'app-access-denied',
  templateUrl: './access-denied.html',
  imports: [ButtonModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AccessDenied {
  readonly #location = inject(Location);
  readonly #authApi = inject(AuthApi);
  readonly #commonService = inject(Common);
  readonly #translateService = inject(TranslateService);
  readonly #params = toSignal(inject(ActivatedRoute).queryParamMap);
  // Not `#heading`: Angular rejects `viewChild` on an ES private field (NG1053).
  protected readonly heading = viewChild.required<ElementRef<HTMLHeadingElement>>('heading');

  /** `stream`, not `instant`: the settings store calls `TranslateService.use()` on a language
   *  change, and the shell header is written once rather than re-rendered through a pipe. */
  readonly #headerTitle = toSignal(
    this.#translateService.stream('accessDenied.title') as Observable<string>,
  );
  readonly #headerDescription = toSignal(
    this.#translateService.stream('accessDenied.headerDescription') as Observable<string>,
  );

  /** The permission guards pass what they denied; a direct visit or a reload without them falls
   *  back to the generic line rather than naming nothing. Module and operation names come from the
   *  backend untranslated, so they travel as interpolation params. */
  protected readonly reason = computed(() => {
    const params = this.#params();
    const module = safeName(params?.get('module'));
    const operation = safeName(params?.get('operation'));

    if (module && operation) {
      return {
        key: 'accessDenied.reasonModuleOperation',
        params: { module, operation: operation.toLowerCase() },
      };
    }

    if (module) {
      return { key: 'accessDenied.reasonModule', params: { module } };
    }

    return { key: 'accessDenied.reasonGeneric', params: {} };
  });

  constructor() {
    // The shell header is a root signal each page writes; without this it would keep showing the
    // title and breadcrumbs of the page the guard turned the user away from.
    effect(() => {
      this.#commonService.setPageHeaderInfo({
        pageTitle: this.#headerTitle() ?? '',
        pageDescription: this.#headerDescription() ?? '',
        pageIcon: 'pi pi-lock',
        isBreadcrumbShow: false,
      });
    });
    this.#commonService.resetBreadcrumbItems();

    // The guard redirect is a silent URL swap; moving focus to the heading is what tells a screen
    // reader that the destination changed.
    afterNextRender(() => this.heading().nativeElement.focus());
  }

  goBack(): void {
    this.#location.back();
  }

  goToDashboard(): void {
    void this.#authApi.redirectToDashboard();
  }
}

/** Backend keys are hyphenated; the sentence they land in is not. */
function safeName(value: string | null | undefined): string | null {
  return value && SAFE_NAME.test(value) ? value.replaceAll('-', ' ') : null;
}
