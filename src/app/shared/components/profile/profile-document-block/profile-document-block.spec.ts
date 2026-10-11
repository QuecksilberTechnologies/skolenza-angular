import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileDocumentBlock } from './profile-document-block';

describe('ProfileDocumentBlock', () => {
  let component: ProfileDocumentBlock;
  let fixture: ComponentFixture<ProfileDocumentBlock>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileDocumentBlock],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileDocumentBlock);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it.each([2, '2'])('shows the PDF icon for fileType %j', (fileType) => {
    fixture.componentRef.setInput('fileType', fileType);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.pi-file-pdf')).not.toBeNull();
  });

  it('shows the image icon for any other fileType', () => {
    fixture.componentRef.setInput('fileType', 1);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.pi-image')).not.toBeNull();
  });
});
