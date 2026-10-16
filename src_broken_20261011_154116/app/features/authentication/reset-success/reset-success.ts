import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CheckCircle, LucideAngularModule } from 'lucide-angular';

import AuthCard from '@shared/components/auth-card/auth-card';

@Component({
  selector: 'app-reset-success',
  imports: [AuthCard, RouterModule, ButtonModule, LucideAngularModule],
  templateUrl: './reset-success.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ResetSuccess {
  protected Check = CheckCircle;
}
