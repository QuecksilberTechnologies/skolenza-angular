import { ComponentFixture, TestBed } from '@angular/core/testing';

import GanttViewComponent from './gantt-view.component';

describe('GanttViewComponent', () => {
  let component: GanttViewComponent;
  let fixture: ComponentFixture<GanttViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GanttViewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GanttViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
