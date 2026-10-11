import { FormControl } from '@angular/forms';

export interface CreateNewPasswordReq {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface CreateNewPasswordForm {
  password: FormControl<string>;
  confirmPassword: FormControl<string>;
}

export interface UpdatePasswordForm {
  oldPassword: FormControl<string>;
  newPassword: FormControl<string>;
  confirmNewPassword: FormControl<string>;
}
