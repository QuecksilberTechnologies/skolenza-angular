import { DatePipe } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';

import { ProjectBoardStore } from '../project-board.store';
import KanbanViewComponent from './kanban-view.component';

describe('KanbanViewComponent', () => {
  let component: KanbanViewComponent;
  let fixture: ComponentFixture<KanbanViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KanbanViewComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        DatePipe,
        ProjectBoardStore,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(KanbanViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
