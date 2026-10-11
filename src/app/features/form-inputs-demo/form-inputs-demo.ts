import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { form, submit, validateStandardSchema } from '@angular/forms/signals';
import type { AutoCompleteCompleteEvent } from '@openng/optimus-ui/autocomplete';
import { MessageModule } from '@openng/optimus-ui/message';

import { FormActionBar } from '@shared/components/form-action-bar/form-action-bar';
import { FormAutocomplete } from '@shared/components/form-inputs/form-autocomplete/form-autocomplete';
import { FormCheckbox } from '@shared/components/form-inputs/form-checkbox/form-checkbox';
import { FormColor } from '@shared/components/form-inputs/form-color/form-color';
import { FormDateRange } from '@shared/components/form-inputs/form-date-range/form-date-range';
import { FormDate } from '@shared/components/form-inputs/form-date/form-date';
import { FormEditor } from '@shared/components/form-inputs/form-editor/form-editor';
import { FormFile } from '@shared/components/form-inputs/form-file/form-file';
import { FormMultiSelect } from '@shared/components/form-inputs/form-multiselect/form-multiselect';
import { FormNumber } from '@shared/components/form-inputs/form-number/form-number';
import { FormPassword } from '@shared/components/form-inputs/form-password/form-password';
import type { RadioOption } from '@shared/components/form-inputs/form-radio-group/form-radio-group';
import { FormRadioGroup } from '@shared/components/form-inputs/form-radio-group/form-radio-group';
import { FormSelect } from '@shared/components/form-inputs/form-select/form-select';
import { FormSwitch } from '@shared/components/form-inputs/form-switch/form-switch';
import { FormText } from '@shared/components/form-inputs/form-text/form-text';
import { FormTextarea } from '@shared/components/form-inputs/form-textarea/form-textarea';
import { SectionCard } from '@shared/components/section-card/section-card';

import { FormInputsDemoModel, formInputsDemoSchema } from './form-inputs-demo.schema';

const DEPARTMENTS = [
  { id: 1, name: 'Engineering' },
  { id: 2, name: 'Finance' },
  { id: 3, name: 'People Operations' },
];

const SKILLS = [
  { id: 1, name: 'Angular' },
  { id: 2, name: 'TypeScript' },
  { id: 3, name: 'Accessibility' },
  { id: 4, name: 'Design systems' },
];

const MANAGERS = ['Priya Nair', 'Sam Okafor', 'Wei Zhang', 'Diego Alvarez'];

const EMPLOYMENT_TYPES: readonly RadioOption<string>[] = [
  { value: 'full-time', label: 'Full time', hint: 'Standard 40-hour week' },
  { value: 'contract', label: 'Contract', hint: 'Fixed-term engagement' },
  { value: 'intern', label: 'Intern', hint: 'Time-boxed, mentored' },
];

/** A second group on the same page, so two radio groups are shown not to fight over selection. */
const WORK_MODES: readonly RadioOption<string>[] = [
  { value: 'onsite', label: 'Onsite' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'remote', label: 'Remote' },
];

/**
 * Showcase page for the `app-form-*` set in `shared/components/form-inputs`.
 *
 * It is a real Signal Form over a real zod schema, not a static gallery, so the
 * error/hint slot and the label geometry can be judged in place. Every control
 * binds its own field, so the live model panel below updates without this page
 * relaying anything — the panel failing to move is how a broken binding shows up.
 *
 * The form deliberately does not carry `form-invalid-visible`. Optimus' CVA controls
 * write `p-invalid` once at init off the interop `NgControl` — which reports the field
 * invalid before anyone has touched it, and never updates — so opting the subtree back
 * into the invalid border paints half the form red on load. The `p-message` in each
 * field's message slot carries the error instead; see the note in `src/styles.css`.
 */
@Component({
  selector: 'app-form-inputs-demo',
  imports: [
    MessageModule,
    SectionCard,
    FormActionBar,
    FormText,
    FormTextarea,
    FormEditor,
    FormNumber,
    FormPassword,
    FormSelect,
    FormMultiSelect,
    FormRadioGroup,
    FormCheckbox,
    FormSwitch,
    FormDate,
    FormDateRange,
    FormFile,
    FormAutocomplete,
    FormColor,
  ],
  templateUrl: './form-inputs-demo.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class FormInputsDemo {
  protected readonly departments = DEPARTMENTS;
  protected readonly skills = SKILLS;
  protected readonly employmentTypes = EMPLOYMENT_TYPES;
  protected readonly workModes = WORK_MODES;

  protected readonly managerSuggestions = signal<string[]>([]);
  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly lastSubmission = signal<string | null>(null);

  protected readonly model = signal<FormInputsDemoModel>({
    fullName: '',
    email: '',
    phone: '',
    bio: '',
    headcount: null,
    password: '',
    departmentId: null,
    skillIds: [],
    employmentType: 'full-time',
    workMode: 'onsite',
    acceptTerms: false,
    isActive: true,
    joiningDate: null,
    projectWindow: null,
    resume: null,
    reportsTo: null,
    notes: '',
    brandColor: '#4287f5',
  });

  protected readonly f = form(this.model, (p) => validateStandardSchema(p, formInputsDemoSchema));

  /** Live view of the model, so the binding gaps are visible rather than implied. */
  protected readonly modelJson = computed(() =>
    JSON.stringify(
      this.model(),
      (_key, value: unknown) => (value instanceof File ? `File(${value.name})` : value),
      2,
    ),
  );

  protected onCompleteManagers(event: AutoCompleteCompleteEvent): void {
    const query = event.query.toLowerCase();
    this.managerSuggestions.set(MANAGERS.filter((name) => name.toLowerCase().includes(query)));
  }

  protected onCancel(): void {
    this.submitted.set(false);
    this.lastSubmission.set(null);
  }

  protected async onSubmit(): Promise<void> {
    this.submitted.set(true);
    this.saving.set(true);

    await submit(this.f, async () => {
      this.lastSubmission.set(this.modelJson());
    });

    this.saving.set(false);
  }
}
