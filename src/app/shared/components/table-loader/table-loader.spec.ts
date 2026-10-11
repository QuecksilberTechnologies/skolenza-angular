import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableLoader } from './table-loader';

describe('TableLoader', () => {
  let component: TableLoader;
  let fixture: ComponentFixture<TableLoader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableLoader],
    }).compileComponents();

    fixture = TestBed.createComponent(TableLoader);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
