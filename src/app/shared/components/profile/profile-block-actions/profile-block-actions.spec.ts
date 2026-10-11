import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileBlockActions } from './profile-block-actions';

describe('ProfileBlockActions', () => {
  let component: ProfileBlockActions;
  let fixture: ComponentFixture<ProfileBlockActions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileBlockActions],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileBlockActions);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows a labelled Add button instead of the pencil in add mode', async () => {
    fixture.componentRef.setInput('editMode', 'add');
    fixture.componentRef.setInput('itemLabel', 'PAN Card');
    fixture.componentRef.setInput('isRemove', false);
    await fixture.whenStable();

    const buttons = [...fixture.nativeElement.querySelectorAll('button')] as HTMLButtonElement[];
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual(['Add PAN Card']);
    expect(buttons[0].textContent).toContain('Add');
  });

  it('locks the staffMember when editing is not allowed, but never an admin or manager', async () => {
    fixture.componentRef.setInput('isEditAllowed', false);
    fixture.componentRef.setInput('isShowPercentage', false);
    const editButton = () => fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    fixture.componentRef.setInput('roleTypeId', 2);
    await fixture.whenStable();
    expect(editButton().disabled).toBe(true);

    for (const roleTypeId of [1, 3]) {
      fixture.componentRef.setInput('roleTypeId', roleTypeId);
      await fixture.whenStable();
      expect(editButton().disabled).toBe(false);
    }
  });
});
