import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';

@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.html',
  imports: [RouterLink, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class NotFound {
  private location = inject(Location);

  goBack(): void {
    this.location.back();
  }
}
