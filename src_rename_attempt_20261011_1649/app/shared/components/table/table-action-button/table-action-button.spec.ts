import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableActionButton } from './table-action-button';

describe('TableActionButton', () => {
  let component: TableActionButton;
  let fixture: ComponentFixture<TableActionButton>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableActionButton],
    }).compileComponents();

    fixture = TestBed.createComponent(TableActionButton);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
