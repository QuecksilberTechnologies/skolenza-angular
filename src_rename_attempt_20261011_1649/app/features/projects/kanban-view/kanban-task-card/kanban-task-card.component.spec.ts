import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';

import KanbanTaskCardComponent from './kanban-task-card.component';

describe('KanbanTaskCardComponent', () => {
  let component: KanbanTaskCardComponent;
  let fixture: ComponentFixture<KanbanTaskCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KanbanTaskCardComponent],
      providers: [MessageService, DatePipe],
    }).compileComponents();

    fixture = TestBed.createComponent(KanbanTaskCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('task', {
      id: 1,
      title: 'Test Task',
      status: 'todo',
      priority: 'low',
    });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
