import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';
import { LucideAngularModule, Mail } from 'lucide-angular';

import AuthSplitCard from '@shared/components/auth-split-card/auth-split-card';

@Component({
  selector: 'app-registration-email-check',
  imports: [AuthSplitCard, ButtonModule, LucideAngularModule],
  templateUrl: './registration-email-check.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class RegistrationEmailCheck {
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  readonly #destroyRef = inject(DestroyRef);
  protected email = signal<string>('');
  protected emailSent = signal(true);
  protected readonly heading = computed(() =>
    this.emailSent() ? 'Check your email' : 'Email could not be sent',
  );
  /** The address is the whole point of the sentence, so it needs a stand-in when none was passed. */
  protected readonly emailLabel = computed(() => this.email() || 'your email address');
  protected Mail = Mail;

  constructor() {
    // Get email from route state or query params
    this.#route.queryParams.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((params) => {
      if (params['email']) {
        this.email.set(params['email']);
      }
      // Only an explicit failure flag shows the error; old links without the param mean success.
      this.emailSent.set(params['emailSent'] !== false && params['emailSent'] !== 'false');
    });
  }

  navigateToLogin(): void {
    this.#router.navigate(['/auth/login']);
  }
}
