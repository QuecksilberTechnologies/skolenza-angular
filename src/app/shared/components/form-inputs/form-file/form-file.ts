import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Field } from '@angular/forms/signals';
import { FileUploadModule } from '@openng/optimus-ui/fileupload';
import type { FileSelectEvent } from '@openng/optimus-ui/fileupload';

import { FormFieldShell } from '../form-field-shell/form-field-shell';

/**
 * File picker in `mode="basic"` with `[auto]="false"` — the file is handed to
 * the form, never uploaded by the control itself. The submit handler owns the
 * request, same as every other field.
 *
 * Distinct from `shared/components/profile/form-file-upload`, which is the
 * profile document uploader: it renders its own preview row and knows about
 * already-stored files. Setting {@link dragDrop} borrows that uploader's card
 * visuals (icon, "Drag & Drop or Choose file", inline preview) but stays on
 * this component's Signal Forms wiring, since the field never carries an
 * already-stored file the way the profile uploader's does.
 *
 * The control has no single labellable input, so the shell renders its caption
 * as a `<span>` and the wrapper carries `role="group"` + `aria-labelledby`.
 *
 * `p-fileupload` is the only control here with no `ControlValueAccessor` at all,
 * so `[formField]` cannot bind it and the selection is written to the field by
 * hand. Two consequences worth knowing:
 *
 * - The binding is one-way. `p-fileupload` keeps its own file list, so resetting
 *   the field does not clear the filename the button shows.
 * - Basic mode renders no clear affordance; a user replaces the file rather than
 *   removing it. {@link onClear} only fires if something calls the control's own
 *   `clear()`.
 * - A rejected pick (over {@link maxFileSize}, wrong {@link accept}) leaves the
 *   field alone rather than clearing it — Optimus still emits `onSelect` in that
 *   case, with an empty list.
 *
 * {@link maxFileSize} stays Optimus's own rejection rather than a schema rule —
 * duplicating the byte limit into zod buys nothing the template does not already
 * state.
 */
@Component({
  selector: 'app-form-file',
  imports: [FileUploadModule, FormFieldShell],
  templateUrl: './form-file.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormFile {
  readonly field = input.required<Field<File | File[] | null>>();
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly required = input(false, { transform: booleanAttribute });
  readonly hint = input<string>();
  /** See `FormFieldShell.hintIcon`. */
  readonly hintIcon = input(false, { transform: booleanAttribute });
  readonly submitted = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly accept = input('image/*,application/pdf');
  readonly multiple = input(false, { transform: booleanAttribute });
  /** Bytes. Optimus rejects anything larger before it reaches the form. */
  readonly maxFileSize = input(5_000_000);
  readonly chooseLabel = input('Choose file');
  /** Renders the profile page's drag-and-drop card instead of the basic Choose button. */
  readonly dragDrop = input(false, { transform: booleanAttribute });

  protected choose(event: unknown, callback: () => void): void {
    callback();
  }

  protected onSelect(event: FileSelectEvent): void {
    const files = event.currentFiles;
    // Optimus empties its own list before validating, then emits `onSelect` even when
    // every candidate was rejected. Writing that through would silently drop a file the
    // user had already picked, so an empty selection is treated as "nothing changed".
    if (files.length === 0) {
      return;
    }

    this.#write(this.multiple() ? files : files[0]);
  }

  protected onClear(): void {
    this.#write(null);
  }

  #write(value: File | File[] | null): void {
    const state = this.field()();
    state.value.set(value);
    state.markAsDirty();
    state.markAsTouched();
  }
}
