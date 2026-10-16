import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableInlineFilters } from './table-inline-filters';

describe('TableInlineFilters', () => {
  let component: TableInlineFilters;
  let fixture: ComponentFixture<TableInlineFilters>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableInlineFilters],
    }).compileComponents();

    fixture = TestBed.createComponent(TableInlineFilters);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
