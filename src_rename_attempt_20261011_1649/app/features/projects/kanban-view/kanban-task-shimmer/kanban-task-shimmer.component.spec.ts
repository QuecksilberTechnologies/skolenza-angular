import { ComponentFixture, TestBed } from '@angular/core/testing';

import KanbanTaskShimmerComponent from './kanban-task-shimmer.component';

describe('KanbanTaskShimmerComponent', () => {
  let component: KanbanTaskShimmerComponent;
  let fixture: ComponentFixture<KanbanTaskShimmerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KanbanTaskShimmerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(KanbanTaskShimmerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
