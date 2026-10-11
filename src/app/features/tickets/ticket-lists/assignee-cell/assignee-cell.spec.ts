import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ITicket } from '../../models';
import { AssigneeCell } from './assignee-cell';

describe('AssigneeCell', () => {
  let component: AssigneeCell;
  let fixture: ComponentFixture<AssigneeCell>;

  const ticket = { id: 1, assignedTo: '', assignedToInitial: '' } as unknown as ITicket;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssigneeCell],
    }).compileComponents();

    fixture = TestBed.createComponent(AssigneeCell);
    fixture.componentRef.setInput('ticket', ticket);
    fixture.componentRef.setInput('agents', []);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
