import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ITicketAgentSummary } from '../../models';
import { AssignTicketPopup } from './assign-ticket-popup';

describe('AssignTicketPopup', () => {
  let component: AssignTicketPopup;
  let fixture: ComponentFixture<AssignTicketPopup>;

  const agents: ITicketAgentSummary[] = [
    { name: 'Sam Smith', initial: 'S', role: 'Support Lead', ticketCount: 0, online: true },
    { name: 'Jane Roe', initial: 'J', role: 'Agent', ticketCount: 5, online: true },
    { name: 'Sarah Davis', initial: 'S', role: 'Agent', ticketCount: 0, online: false },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssignTicketPopup],
    }).compileComponents();

    fixture = TestBed.createComponent(AssignTicketPopup);
    fixture.componentRef.setInput('agents', agents);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should filter agents by name', () => {
    component.searchTerm.set('jane');
    expect(component.filteredAgents()).toEqual([agents[1]]);
  });

  it('should filter agents by role', () => {
    component.searchTerm.set('lead');
    expect(component.filteredAgents()).toEqual([agents[0]]);
  });

  it('should treat currentAssignee as selected', () => {
    fixture.componentRef.setInput('currentAssignee', 'Jane Roe');
    expect(component.isSelected(agents[1])).toBe(true);
    expect(component.isSelected(agents[0])).toBe(false);
  });

  it('should expose currentAssignee as the selected listbox value', () => {
    fixture.componentRef.setInput('currentAssignee', 'Jane Roe');
    expect(component.selectedValues()).toEqual(['Jane Roe']);
  });

  it('should emit agentSelected when listbox values change to a new agent', () => {
    let received: ITicketAgentSummary | undefined;
    component.agentSelected.subscribe((agent) => (received = agent));
    component.onValuesChange(['Jane Roe']);
    expect(received).toBe(agents[1]);
  });

  it('should not emit when listbox values change to the current assignee', () => {
    fixture.componentRef.setInput('currentAssignee', 'Jane Roe');
    let count = 0;
    component.agentSelected.subscribe(() => count++);
    component.onValuesChange(['Jane Roe']);
    expect(count).toBe(0);
  });

  it('should emit unassigned on onUnassign', () => {
    let count = 0;
    component.unassigned.subscribe(() => count++);
    component.onUnassign();
    expect(count).toBe(1);
  });
});
