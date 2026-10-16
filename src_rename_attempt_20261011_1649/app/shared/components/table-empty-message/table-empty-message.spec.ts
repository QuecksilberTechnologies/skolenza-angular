import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableEmptyMessage } from './table-empty-message';

describe('TableEmptyMessage', () => {
  let component: TableEmptyMessage;
  let fixture: ComponentFixture<TableEmptyMessage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableEmptyMessage],
    }).compileComponents();

    fixture = TestBed.createComponent(TableEmptyMessage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
