import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, PLATFORM_ID, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { form, FormField, maxLength, minLength, required, submit } from '@angular/forms/signals';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { DatePickerModule } from '@openng/optimus-ui/datepicker';
import { DialogModule } from '@openng/optimus-ui/dialog';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { MultiSelectModule } from '@openng/optimus-ui/multiselect';
import { SelectModule } from '@openng/optimus-ui/select';
import { TableModule } from '@openng/optimus-ui/table';
import { TextareaModule } from '@openng/optimus-ui/textarea';

import { Common } from '@core/services';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { AssignPriority, Course, CourseLevel } from '@shared/interfaces';

import { CourseStore } from '../store/course.store';
import { LdRating } from '../ui/ld-rating';

const LEVELS: CourseLevel[] = ['Beginner', 'Intermediate', 'Advanced'];
const PRIORITIES: AssignPriority[] = ['High', 'Medium', 'Low'];

const slug = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'course';

@Component({
  selector: 'app-ld-admin',
  imports: [
    TableModule,
    ButtonModule,
    DialogModule,
    ConfirmDialogModule,
    SelectModule,
    MultiSelectModule,
    DatePickerModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    MessageModule,
    FormsModule,
    FormField,
    LdRating,
    TableLoader,
    TableEmptyMessage,
  ],
  providers: [CourseStore, ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="rounded-xl border border-border-light bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-base font-semibold text-gray-900 dark:text-zinc-100">Manage Courses</h2>
        <div class="flex gap-2">
          <p-button
            label="Import CSV"
            icon="pi pi-upload"
            severity="secondary"
            [outlined]="true"
            size="small"
            (onClick)="notImplemented('CSV import')"
          />
          <p-button
            label="Export"
            icon="pi pi-download"
            severity="secondary"
            [outlined]="true"
            size="small"
            (onClick)="exportCsv()"
          />
          <p-button
            label="Bulk Assign"
            icon="pi pi-send"
            severity="secondary"
            [outlined]="true"
            size="small"
            (onClick)="openBulkAssign()"
          />
          <p-button label="Add Course" icon="pi pi-plus" size="small" (onClick)="openForm()" />
        </div>
      </div>

      @if (store.isLoading()) {
        <app-table-loader />
      } @else if (!store.courses().length) {
        <app-table-empty-message
          icon="pi pi-objects-column"
          message="No courses"
          subMessage="Add your first course to the catalog."
        />
      } @else {
        <p-table
          [value]="store.courses()"
          [paginator]="store.courses().length > 10"
          [rows]="10"
          [rowHover]="true"
          responsiveLayout="scroll"
          styleClass="p-datatable-sm"
        >
          <ng-template pTemplate="header">
            <tr
              class="[&>th]:text-xs [&>th]:font-semibold [&>th]:tracking-wide [&>th]:text-gray-500 [&>th]:uppercase dark:[&>th]:text-zinc-400"
            >
              <th>Title</th>
              <th>Category</th>
              <th>Level</th>
              <th>Duration</th>
              <th>Rating</th>
              <th>Actions</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-course>
            <tr>
              <td>
                <span class="font-medium text-gray-900 dark:text-zinc-100">{{ course.title }}</span>
              </td>
              <td>{{ course.category }}</td>
              <td>{{ course.level }}</td>
              <td class="tabular-nums">{{ course.durationHours }}h</td>
              <td><app-ld-rating [value]="course.rating" /></td>
              <td>
                <div class="flex gap-1">
                  <p-button
                    icon="pi pi-pencil"
                    [text]="true"
                    size="small"
                    ariaLabel="Edit course"
                    pTooltip="Edit"
                    (onClick)="openForm(course)"
                  />
                  <p-button
                    icon="pi pi-trash"
                    [text]="true"
                    size="small"
                    severity="danger"
                    ariaLabel="Delete course"
                    pTooltip="Delete"
                    (onClick)="confirmDelete(course)"
                  />
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      }
    </div>

    <!-- Add / edit dialog -->
    <p-dialog
      [visible]="dialogVisible()"
      (visibleChange)="dialogVisible.set($event)"
      [modal]="true"
      [style]="{ width: '32rem' }"
      [header]="editing() ? 'Edit Course' : 'Add Course'"
    >
      <form (submit)="onSubmit(); $event.preventDefault()" class="grid grid-cols-1 gap-4">
        <div class="space-y-1">
          <label for="title" class="block text-sm font-medium">
            Title
            <span class="text-red-600 dark:text-red-400">*</span>
          </label>
          <input
            [formField]="courseForm.title"
            pInputText
            id="title"
            type="text"
            class="w-full"
            placeholder="Course title"
          />
          @if (courseForm.title().touched() && courseForm.title().errors().length) {
            <p-message severity="error" size="small" variant="simple">
              {{ courseForm.title().errors()[0].message }}
            </p-message>
          }
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <label for="category" class="block text-sm font-medium">
              Category
              <span class="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              [formField]="courseForm.category"
              pInputText
              id="category"
              type="text"
              class="w-full"
              placeholder="Category"
            />
            @if (courseForm.category().touched() && courseForm.category().errors().length) {
              <p-message severity="error" size="small" variant="simple">
                {{ courseForm.category().errors()[0].message }}
              </p-message>
            }
          </div>
          <div class="space-y-1">
            <label for="level" class="block text-sm font-medium">Level</label>
            <p-select
              [options]="levels"
              inputId="level"
              styleClass="w-full"
              [ngModel]="model().level"
              (ngModelChange)="model.set({ ...model(), level: $event })"
              [ngModelOptions]="{ standalone: true }"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <label for="instructor" class="block text-sm font-medium">
              Instructor
              <span class="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              [formField]="courseForm.instructor"
              pInputText
              id="instructor"
              type="text"
              class="w-full"
              placeholder="Instructor"
            />
            @if (courseForm.instructor().touched() && courseForm.instructor().errors().length) {
              <p-message severity="error" size="small" variant="simple">
                {{ courseForm.instructor().errors()[0].message }}
              </p-message>
            }
          </div>
          <div class="space-y-1">
            <label for="duration" class="block text-sm font-medium">Duration (h)</label>
            <p-inputnumber
              inputId="duration"
              styleClass="w-full"
              inputStyleClass="w-full"
              [min]="1"
              [max]="100"
              [ngModel]="model().durationHours"
              (ngModelChange)="model.set({ ...model(), durationHours: $event ?? 1 })"
              [ngModelOptions]="{ standalone: true }"
            />
          </div>
        </div>

        <div class="space-y-1">
          <label for="description" class="block text-sm font-medium">Description</label>
          <textarea
            [formField]="courseForm.description"
            pTextarea
            id="description"
            rows="3"
            class="w-full"
            placeholder="Short description"
          ></textarea>
          @if (courseForm.description().touched() && courseForm.description().errors().length) {
            <p-message severity="error" size="small" variant="simple">
              {{ courseForm.description().errors()[0].message }}
            </p-message>
          }
        </div>

        <div class="mt-2 flex justify-end gap-2">
          <p-button
            type="button"
            label="Cancel"
            severity="secondary"
            [outlined]="true"
            (onClick)="dialogVisible.set(false)"
          />
          <p-button type="submit" label="Save" icon="pi pi-check" />
        </div>
      </form>
    </p-dialog>

    <!-- Bulk assign dialog -->
    <p-dialog
      [visible]="bulkVisible()"
      (visibleChange)="bulkVisible.set($event)"
      [modal]="true"
      [style]="{ width: '30rem' }"
      header="Bulk Assign Courses"
    >
      <div class="grid grid-cols-1 gap-4">
        <div class="space-y-1">
          <label for="bulk-courses" class="block text-sm font-medium">Courses</label>
          <p-multiselect
            inputId="bulk-courses"
            [options]="store.courses()"
            optionLabel="title"
            optionValue="id"
            placeholder="Select courses"
            styleClass="w-full"
            [ngModel]="bulkCourseIds()"
            (ngModelChange)="bulkCourseIds.set($event)"
          />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <label for="bulk-priority" class="block text-sm font-medium">Priority</label>
            <p-select
              inputId="bulk-priority"
              [options]="priorities"
              styleClass="w-full"
              [ngModel]="bulkPriority()"
              (ngModelChange)="bulkPriority.set($event)"
            />
          </div>
          <div class="space-y-1">
            <label for="bulk-due" class="block text-sm font-medium">Due date</label>
            <p-datepicker
              inputId="bulk-due"
              styleClass="w-full"
              inputStyleClass="w-full"
              [appendTo]="'body'"
              [ngModel]="bulkDueDate()"
              (ngModelChange)="bulkDueDate.set($event)"
            />
          </div>
        </div>
        <div class="mt-2 flex justify-end gap-2">
          <p-button
            type="button"
            label="Cancel"
            severity="secondary"
            [outlined]="true"
            (onClick)="bulkVisible.set(false)"
          />
          <p-button
            type="button"
            label="Assign"
            icon="pi pi-check"
            [disabled]="!bulkCourseIds().length"
            (onClick)="confirmBulkAssign()"
          />
        </div>
      </div>
    </p-dialog>

    <p-confirmDialog [style]="{ width: '28rem' }" />
  `,
})
export default class LdAdmin {
  protected readonly store = inject(CourseStore);
  readonly #common = inject(Common);
  readonly #confirm = inject(ConfirmationService);
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly levels = LEVELS;
  protected readonly priorities = PRIORITIES;
  protected readonly dialogVisible = signal(false);
  protected readonly editing = signal<Course | null>(null);

  protected readonly bulkVisible = signal(false);
  protected readonly bulkCourseIds = signal<string[]>([]);
  protected readonly bulkPriority = signal<AssignPriority>('Medium');
  protected readonly bulkDueDate = signal<Date | null>(null);

  protected readonly model = signal({
    title: '',
    category: '',
    instructor: '',
    level: 'Beginner' as CourseLevel,
    durationHours: 1,
    description: '',
  });

  protected readonly courseForm = form(this.model, (s) => {
    required(s.title, { message: 'Title is required' });
    minLength(s.title, 3, { message: 'Title must be at least 3 characters' });
    maxLength(s.title, 80, { message: 'Title cannot exceed 80 characters' });
    required(s.category, { message: 'Category is required' });
    required(s.instructor, { message: 'Instructor is required' });
    maxLength(s.description, 300, { message: 'Description cannot exceed 300 characters' });
  });

  protected openForm(course?: Course): void {
    this.editing.set(course ?? null);
    this.model.set({
      title: course?.title ?? '',
      category: course?.category ?? '',
      instructor: course?.instructor ?? '',
      level: course?.level ?? 'Beginner',
      durationHours: course?.durationHours ?? 1,
      description: course?.description ?? '',
    });
    this.dialogVisible.set(true);
  }

  protected onSubmit(): void {
    submit(this.courseForm, async () => {
      const v = this.model();
      const existing = this.editing();
      const seed = slug(v.title);
      const course: Course = {
        id: existing?.id ?? `c-${Date.now()}`,
        title: v.title.trim(),
        instructor: v.instructor.trim(),
        category: v.category.trim(),
        level: v.level,
        durationHours: v.durationHours,
        rating: existing?.rating ?? 0,
        ratingCount: existing?.ratingCount ?? 0,
        enrolledCount: existing?.enrolledCount ?? 0,
        language: existing?.language ?? 'English',
        thumbnail: existing?.thumbnail ?? `https://picsum.photos/seed/${seed}/640/360`,
        banner: existing?.banner ?? `https://picsum.photos/seed/${seed}/1280/420`,
        tags: existing?.tags ?? [],
        skills: existing?.skills ?? [],
        description: v.description.trim(),
        sections: existing?.sections ?? [],
        resources: existing?.resources ?? [],
        reviews: existing?.reviews ?? [],
      };
      if (existing) {
        this.store.updateCourse(course);
      } else {
        this.store.addCourse(course);
      }
      this.dialogVisible.set(false);
    });
  }

  protected confirmDelete(course: Course): void {
    this.#confirm.confirm({
      message: `Delete "${course.title}"? This cannot be undone.`,
      header: 'Delete course',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Delete', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', outlined: true },
      accept: () => this.store.deleteCourse(course.id),
    });
  }

  protected exportCsv(): void {
    if (!this.#isBrowser) return;
    const header = ['Title', 'Category', 'Level', 'Duration (h)', 'Instructor', 'Rating'];
    const escape = (v: string | number): string => `"${String(v).replace(/"/g, '""')}"`;
    const rows = this.store
      .courses()
      .map((c) =>
        [c.title, c.category, c.level, c.durationHours, c.instructor, c.rating]
          .map(escape)
          .join(','),
      );
    const csv = [header.map(escape).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'courses.csv';
    link.click();
    URL.revokeObjectURL(url);
    this.#common.showMessage('Exported courses.csv', 'success');
  }

  protected openBulkAssign(): void {
    this.bulkCourseIds.set([]);
    this.bulkPriority.set('Medium');
    this.bulkDueDate.set(null);
    this.bulkVisible.set(true);
  }

  protected confirmBulkAssign(): void {
    const count = this.bulkCourseIds().length;
    if (!count) return;
    this.bulkVisible.set(false);
    this.#common.showMessage(
      `Assigned ${count} ${count === 1 ? 'course' : 'courses'} (${this.bulkPriority()} priority).`,
      'success',
    );
  }

  protected notImplemented(feature: string): void {
    this.#common.showMessage(`${feature} is not implemented in this demo.`, 'info');
  }
}
