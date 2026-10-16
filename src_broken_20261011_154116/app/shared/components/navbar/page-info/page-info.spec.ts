import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';

import { PageInfo } from './page-info';

describe('PageInfo', () => {
  let component: PageInfo;
  let fixture: ComponentFixture<PageInfo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageInfo],
      providers: [MessageService, DatePipe],
    }).compileComponents();

    fixture = TestBed.createComponent(PageInfo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
