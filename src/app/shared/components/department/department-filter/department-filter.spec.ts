import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';

import { DepartmentFilter } from './department-filter';

describe('DepartmentFilter', () => {
  let component: DepartmentFilter;
  let fixture: ComponentFixture<DepartmentFilter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DepartmentFilter],
      providers: [MessageService, DatePipe],
    }).compileComponents();

    fixture = TestBed.createComponent(DepartmentFilter);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
