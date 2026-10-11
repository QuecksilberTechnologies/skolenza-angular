import { Listbox, Option } from '@angular/aria/listbox';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { IconFieldModule } from '@openng/optimus-ui/iconfield';
import { InputIconModule } from '@openng/optimus-ui/inputicon';
import { InputTextModule } from '@openng/optimus-ui/inputtext';

import { UserAvatar } from '@shared/components/user-avatar/user-avatar';

import { ITicketAgentSummary } from '../../models';

@Component({
  selector: 'app-assign-ticket-popup',
  imports: [UserAvatar, IconFieldModule, InputIconModule, InputTextModule, Listbox, Option],
  templateUrl: './assign-ticket-popup.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssignTicketPopup {
  readonly agents = input.required<ITicketAgentSummary[]>();
  readonly currentAssignee = input<string | null>(null);
  readonly agentSelected = output<ITicketAgentSummary>();
  readonly unassigned = output<void>();
  readonly searchTerm = signal('');

  readonly selectedValues = computed<string[]>(() => {
    const name = this.currentAssignee();
    return name ? [name] : [];
  });

  readonly filteredAgents = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const agents = this.agents();
    if (!term) return agents;
    return agents.filter(
      (a) => a.name.toLowerCase().includes(term) || a.role.toLowerCase().includes(term),
    );
  });

  isSelected(agent: ITicketAgentSummary): boolean {
    return this.currentAssignee() === agent.name;
  }

  onValuesChange(values: string[]) {
    if (values.length === 0) return;
    const name = values[0];
    if (name === this.currentAssignee()) return;
    const agent = this.agents().find((a) => a.name === name);
    if (agent) this.agentSelected.emit(agent);
  }

  onUnassign() {
    this.unassigned.emit();
  }

  onSearchInput(event: Event) {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  agentRowClass(selected: boolean): string {
    const base =
      'flex items-center gap-2.5 w-full px-3 py-2 text-left transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';
    return selected
      ? `${base} bg-primary-50 dark:bg-primary-900/10`
      : `${base} hover:bg-zinc-50 dark:hover:bg-zinc-800`;
  }
}
