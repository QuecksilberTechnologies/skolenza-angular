import { ApplicationRef, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import { By } from '@angular/platform-browser';
import { FileUpload } from '@openng/optimus-ui/fileupload';

import { FormFile } from './form-file';

@Component({
  imports: [FormFile],
  template: `
    <app-form-file
      inputId="resume"
      label="Resume"
      [multiple]="multiple()"
      [field]="f.resume"
      [submitted]="false"
    />
  `,
})
class HostComponent {
  readonly multiple = signal(false);
  readonly model = signal<{ resume: File | File[] | null }>({ resume: null });
  readonly f = form(this.model);
}

/**
 * `p-fileupload` is the only control in the set with no `ControlValueAccessor`, so the
 * selection is written to the field by hand. These tests drive Optimus' own outputs.
 */
describe('FormFile', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const stabilize = () => TestBed.inject(ApplicationRef).whenStable();
  const upload = () => fixture.debugElement.query(By.directive(FileUpload)).componentInstance;

  const pdf = (name: string) => new File(['%PDF'], name, { type: 'application/pdf' });

  const select = async (...files: File[]) => {
    upload().onSelect.emit({ originalEvent: new Event('change'), files, currentFiles: files });
    await stabilize();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    await stabilize();
  });

  it('writes the single selected file to the field', async () => {
    const file = pdf('cv.pdf');
    await select(file);

    expect(host.model().resume).toBe(file);
  });

  it('writes the whole list when multiple is set', async () => {
    host.multiple.set(true);
    await stabilize();

    const files = [pdf('a.pdf'), pdf('b.pdf')];
    await select(...files);

    expect(host.model().resume).toEqual(files);
  });

  it('marks the field dirty and touched on selection', async () => {
    await select(pdf('cv.pdf'));

    expect(host.f.resume().dirty()).toBe(true);
    expect(host.f.resume().touched()).toBe(true);
  });

  it('leaves a good file alone when the next pick is rejected', async () => {
    const file = pdf('cv.pdf');
    await select(file);

    // Optimus empties its own list before validating and still emits `onSelect`,
    // so a rejected pick arrives as an empty selection.
    await select();

    expect(host.model().resume).toBe(file);
  });

  it('clears the field when the control is cleared', async () => {
    await select(pdf('cv.pdf'));

    upload().onClear.emit(new Event('click'));
    await stabilize();

    expect(host.model().resume).toBeNull();
  });
});
