import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DatePickerModule } from '@openng/optimus-ui/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { MultiSelectModule } from '@openng/optimus-ui/multiselect';

import { StatusDotSelect } from '@shared/components/status-dot-select/status-dot-select';
import { UserAvatar } from '@shared/components/user-avatar/user-avatar';
import { Project, ProjectPriority, ProjectStatus } from '@shared/interfaces';

export interface ProjectForm {
  name: FormControl<string>;
  status: FormControl<string>;
  priority: FormControl<string>;
  progress: FormControl<number>;
  team: FormControl<string[]>;
  startDate: FormControl<Date>;
  endDate: FormControl<Date>;
}

interface StaffMemberShort {
  staffMemberId: string;
  staffMemberFullName: string;
}

@Component({
  selector: 'app-new-project-dialog',
  imports: [
    UserAvatar,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    StatusDotSelect,
    MultiSelectModule,
    DatePickerModule,
    InputNumberModule,
    MessageModule,
    // JsonPipe,
  ],
  templateUrl: './new-project-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class NewProjectDialog implements OnInit {
  readonly #http = inject(HttpClient);
  readonly #ref = inject(DynamicDialogRef);
  readonly #config = inject(DynamicDialogConfig);
  readonly #destroyRef = inject(DestroyRef);
  readonly #fb = inject(NonNullableFormBuilder);
  readonly staffMembers = signal<StaffMemberShort[]>([]);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  protected isEditMode = false;
  protected projectId?: number;
  protected projectForm!: FormGroup<ProjectForm>;

  readonly statusOptions = [
    { label: 'Active', value: 'active', color: 'text-blue-400' },
    { label: 'Completed', value: 'completed', color: 'text-green-400' },
    { label: 'On Hold', value: 'on-hold', color: 'text-orange-400' },
  ];

  readonly priorityOptions = [
    { label: 'High', value: 'high', color: 'text-red-400' },
    { label: 'Medium', value: 'medium', color: 'text-amber-400' },
    { label: 'Low', value: 'low', color: 'text-blue-400' },
  ];

  constructor() {
    this.initForm();
  }

  ngOnInit() {
    this.fetchStaffMembers();
    this.patchForm();
  }

  initForm() {
    this.projectForm = this.#fb.group({
      name: ['', [Validators.required]],
      status: ['active', [Validators.required]],
      priority: ['medium', [Validators.required]],
      progress: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      team: [[] as string[]],
      startDate: [new Date(), [Validators.required]],
      endDate: [new Date(), [Validators.required]],
    });
  }

  patchForm() {
    const project = this.#config.data?.project as Project;
    if (project) {
      this.isEditMode = true;
      this.projectId = project.id;

      this.projectForm.patchValue({
        name: project.name,
        status: project.status,
        priority: project.priority,
        progress: project.progress,
        team: project.team ?? [],
        startDate: new Date(project.startDate),
        endDate: new Date(project.endDate),
      });
    }
  }

  isInvalid(controlName: string) {
    const control = this.projectForm.get(controlName);
    return control?.invalid && control.touched;
  }

  fetchStaffMembers() {
    this.isLoading.set(true);
    this.#http
      .get<{ data: StaffMemberShort[] }>('data/staff-members-short.json')
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (res) => {
          this.staffMembers.set(res.data);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false),
      });
  }

  onSubmit() {
    if (this.projectForm.valid) {
      const formValue = this.projectForm.value;

      const project: Partial<Project> = {
        ...formValue,
        status: formValue.status as ProjectStatus | undefined,
        priority: formValue.priority as ProjectPriority | undefined,
        team: formValue.team ?? [],
        startDate: formValue.startDate,
        endDate: formValue.endDate,
      };

      if (this.isEditMode && this.projectId) {
        project.id = this.projectId;
      }

      this.isSaving.set(true);
      setTimeout(() => {
        this.isSaving.set(false);
        this.#ref.close(project);
      }, 500);
    }
  }

  onCancel() {
    this.#ref.close();
  }
}
