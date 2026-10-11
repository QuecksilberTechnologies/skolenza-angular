import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  form,
  FormField,
  minLength,
  pattern,
  required,
  submit,
  validate,
} from '@angular/forms/signals';
import { BadgeModule } from '@openng/optimus-ui/badge';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { IconFieldModule } from '@openng/optimus-ui/iconfield';
import { InputIconModule } from '@openng/optimus-ui/inputicon';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';

import { Common } from '@core/services';
import { UserAvatar } from '@shared/components/user-avatar/user-avatar';
import { TrimInput } from '@shared/directives';
import { HostUser } from '@shared/interfaces';
import { EMAIL_PATTERN, PERSON_NAME_PATTERN } from '@shared/utilities/validation-regex';

import { HostProfileModel, HostProfileStore } from './host-profile.store';

/** The mobile field accepts spaced input, but the API only takes bare digits. */
const stripSpaces = (value: string) => value.replace(/\s/g, '');

const modelFrom = (hostUser: HostUser | null): HostProfileModel => ({
  name: hostUser?.name ?? '',
  email: hostUser?.email ?? '',
  mobileNumber: hostUser?.mobileNumber ?? '',
});

const isUntouched = (model: HostProfileModel) => !model.name && !model.email && !model.mobileNumber;

@Component({
  selector: 'app-host-profile',
  imports: [
    UserAvatar,
    DatePipe,
    FormsModule,
    FormField,
    BadgeModule,
    ButtonModule,
    CardModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    MessageModule,
    TrimInput,
  ],
  providers: [HostProfileStore],
  templateUrl: './host-profile.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class HostProfile {
  readonly store = inject(HostProfileStore);
  readonly #commonService = inject(Common);

  protected readonly supportEmail = 'support@skolenza.in';

  /** The host record hydrates asynchronously, so the form reseeds when it lands — but
   *  only while it is still empty, or a host who started typing during the fetch would
   *  have their input replaced by the response. */
  protected readonly model = linkedSignal<HostUser | null, HostProfileModel>({
    source: () => this.store.hostUser(),
    computation: (hostUser, previous) =>
      previous && !isUntouched(previous.value) ? previous.value : modelFrom(hostUser),
  });

  protected readonly profileForm = form(this.model, (s) => {
    required(s.name, { message: 'Name is required' });
    minLength(s.name, 3, { message: 'Name must be at least 3 characters' });
    pattern(s.name, PERSON_NAME_PATTERN, {
      message: 'Name must start with a letter and use only letters, spaces or hyphens.',
    });
    required(s.email, { message: 'Email is required' });
    pattern(s.email, EMAIL_PATTERN, { message: 'Enter a valid email address' });
    required(s.mobileNumber, { message: 'Mobile number is required' });
    validate(s.mobileNumber, ({ value }) => {
      const digits = value().replace(/\s/g, '');
      if (!digits) return null;
      return /^[0-9]{10}$/.test(digits)
        ? null
        : { kind: 'mobileNumber', message: 'Enter a valid 10-digit mobile number' };
    });
  });

  protected readonly isDirty = computed(() => {
    const hostUser = this.store.hostUser();
    const model = this.model();
    return (
      !!hostUser &&
      (model.name.trim() !== hostUser.name ||
        model.email.trim() !== hostUser.email ||
        stripSpaces(model.mobileNumber) !== stripSpaces(hostUser.mobileNumber))
    );
  });

  constructor() {
    this.setPageHeaderInfo();
  }

  setPageHeaderInfo() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Host Profile',
      pageDescription: 'View and update your host account details',
      pageIcon: 'pi pi-user',
      isBreadcrumbShow: false,
    });
  }

  protected resetForm() {
    this.model.set(modelFrom(this.store.hostUser()));
  }

  protected onSubmit() {
    submit(this.profileForm, async () => {
      const model = this.model();
      this.store.save({ ...model, mobileNumber: stripSpaces(model.mobileNumber) });
    });
  }
}
