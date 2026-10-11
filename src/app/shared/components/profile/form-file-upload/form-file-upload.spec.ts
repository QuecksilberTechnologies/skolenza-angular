import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FileSelectEvent } from '@openng/optimus-ui/fileupload';

import { FormFileUpload } from './form-file-upload';

describe('FormFileUpload', () => {
  let component: FormFileUpload;
  let fixture: ComponentFixture<FormFileUpload>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormFileUpload],
    }).compileComponents();

    fixture = TestBed.createComponent(FormFileUpload);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emits only a file that passed validation', () => {
    const emitted: (File | null)[] = [];
    component.selectedFile.subscribe((file) => emitted.push(file));
    const file = new File(['x'], 'scan.pdf', { type: 'application/pdf' });

    component.onSelectFile({ files: [file], currentFiles: [file] } as unknown as FileSelectEvent);
    component.onSelectFile({ files: [file], currentFiles: [] } as unknown as FileSelectEvent);

    expect(emitted).toEqual([file, null]);
  });
});
