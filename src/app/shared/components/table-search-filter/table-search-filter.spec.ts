import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableSearchFilter } from './table-search-filter';

describe('TableSearchFilter', () => {
  let component: TableSearchFilter;
  let fixture: ComponentFixture<TableSearchFilter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableSearchFilter],
    }).compileComponents();

    fixture = TestBed.createComponent(TableSearchFilter);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
