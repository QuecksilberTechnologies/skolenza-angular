import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CheckCircle, LucideAngularModule } from 'lucide-angular';

import AuthSplitCard from '@shared/components/auth-split-card/auth-split-card';

@Component({
  selector: 'app-reset-success',
  imports: [AuthSplitCard, RouterModule, ButtonModule, LucideAngularModule],
  templateUrl: './reset-success.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ResetSuccess {
  protected Check = CheckCircle;
}
