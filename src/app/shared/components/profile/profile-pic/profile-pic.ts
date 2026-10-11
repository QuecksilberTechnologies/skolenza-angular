import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { BlockUIModule } from '@openng/optimus-ui/blockui';
import { ButtonModule } from '@openng/optimus-ui/button';
import { PanelModule } from '@openng/optimus-ui/panel';
import { ProgressSpinnerModule } from '@openng/optimus-ui/progressspinner';

import { Common } from '@core/services/common';
import { StaffMemberBasicAPI } from '@core/services/staff-member-basic-api';
import { AvatarColor } from '@shared/directives';
import { ProfileImage } from '@shared/interfaces';

@Component({
  selector: 'app-profile-pic',
  imports: [BlockUIModule, PanelModule, ProgressSpinnerModule, ButtonModule, AvatarColor],
  templateUrl: './profile-pic.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePic {
  readonly staffMemberName = input.required<string>();

  readonly updateProfile = output<{
    id: number;
    file?: File;
  }>();

  readonly #staffMemberBasicAPI = inject(StaffMemberBasicAPI);
  readonly #commonService = inject(Common);
  readonly isProfilePicLoading = signal(false);
  readonly profileImage = signal<ProfileImage | null>(null);
  readonly previewUrl = signal<string | ArrayBuffer | null>(null);

  constructor() {
    // Reset states
    this.#staffMemberBasicAPI.setProfileImage(null);

    effect(() => {
      this.profileImage.set(this.#staffMemberBasicAPI.profileImage());
    });

    effect(() => {
      this.isProfilePicLoading.set(this.#staffMemberBasicAPI.isProfilePicLoading());
    });
  }

  onFileSelected(event: Event, profileImg: ProfileImage) {
    const input = event.target as HTMLInputElement | null;

    const file = input?.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.#commonService.showMessage('Only image file are allowed!', 'error');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!file.type || !validTypes.includes(file.type)) {
      const msg = 'Invalid file format. Allowed: JPG, PNG only.';
      this.#commonService.showMessage(msg, 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.previewUrl.set(reader.result);
    };
    reader.onerror = () => {
      this.#commonService.showMessage('Failed to preview the selected image.', 'error');
    };
    reader.readAsDataURL(file);

    this.updateProfile.emit({ id: profileImg.id, file });
  }

  removeImage(profileImg: ProfileImage) {
    this.updateProfile.emit({ id: profileImg.id });
  }
}
