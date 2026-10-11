import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { IconFieldModule } from '@openng/optimus-ui/iconfield';
import { InputIconModule } from '@openng/optimus-ui/inputicon';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { firstValueFrom } from 'rxjs';

import { UserAvatar } from '@shared/components/user-avatar/user-avatar';

import { ISupportAgent } from '../../models';

interface IStaffMemberShort {
  staffMemberId: string;
  staffMemberFullName: string;
  officialEmail?: string;
  designationName: string;
  departmentName: string;
  profileImageLink?: string;
}

@Component({
  selector: 'app-ticket-agent-add-dialog',
  imports: [
    UserAvatar,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
  ],
  templateUrl: './ticket-agent-add-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TicketAgentAddDialog implements OnInit {
  readonly #fb = inject(FormBuilder);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dialogConfig = inject(DynamicDialogConfig);
  readonly #http = inject(HttpClient);

  protected allStaffMembers = signal<IStaffMemberShort[]>([]);
  protected searchTerm = signal<string>('');
  protected selectedStaffMember = signal<IStaffMemberShort | null>(null);
  protected isSaving = signal<boolean>(false);
  protected agentForm!: FormGroup;
  protected isEdit = signal<boolean>(false);

  protected filteredStaffMembers = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const existingAgents = (this.#dialogConfig.data?.agents as ISupportAgent[]) ?? [];
    const editingAgent = this.#dialogConfig.data?.agent as ISupportAgent;

    // Filter out people already in the team, except if it's the one we are editing
    const existingEmails = existingAgents
      .filter((a) => a.email !== editingAgent?.email)
      .map((a) => a.email);

    const list = this.allStaffMembers().filter(
      (emp) => !existingEmails.includes(emp.officialEmail ?? ''),
    );

    if (!term) return list.slice(0, 4);
    return list.filter(
      (emp) =>
        emp.staffMemberFullName.toLowerCase().includes(term) ||
        (emp.officialEmail && emp.officialEmail.toLowerCase().includes(term)) ||
        emp.departmentName.toLowerCase().includes(term),
    );
  });

  async ngOnInit() {
    this.agentForm = this.#fb.group({
      staffMemberId: [null, Validators.required],
      department: [{ value: '', disabled: true }],
      designation: [{ value: '', disabled: true }],
    });

    await this.loadStaffMembers();

    const editAgent = this.#dialogConfig.data?.agent as ISupportAgent;
    if (editAgent) {
      this.isEdit.set(true);
      const emp: IStaffMemberShort = {
        staffMemberId: String(editAgent.id),
        staffMemberFullName: editAgent.agentName,
        officialEmail: editAgent.email,
        departmentName: editAgent.department,
        designationName: editAgent.designation,
      };
      this.selectStaffMember(emp);
    }
  }

  async loadStaffMembers() {
    try {
      const res = await firstValueFrom(
        this.#http.get<{ data: IStaffMemberShort[] }>('data/staff-members-short.json'),
      );
      const staffMembers = res.data.map((emp) => ({
        staffMemberId: emp.staffMemberId,
        staffMemberFullName: emp.staffMemberFullName,
        officialEmail:
          emp.officialEmail ||
          `${emp.staffMemberFullName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        designationName: emp.designationName,
        departmentName: emp.departmentName,
        profileImageLink: emp.profileImageLink,
      }));
      this.allStaffMembers.set(staffMembers);
    } catch (error) {
      console.error('Failed to load staffMembers', error);
    }
  }

  onSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
  }

  selectStaffMember(emp: IStaffMemberShort) {
    this.selectedStaffMember.set(emp);
    this.agentForm.patchValue({
      staffMemberId: emp.staffMemberId,
      department: emp.departmentName,
      designation: emp.designationName,
    });
  }

  isInvalid(controlName: string) {
    const control = this.agentForm.get(controlName);
    return control?.invalid && control.touched;
  }

  onCreate() {
    if (this.agentForm.invalid) {
      this.agentForm.markAllAsTouched();
      return;
    }
    this.isSaving.set(true);

    const emp = this.selectedStaffMember()!;
    const editAgent = this.#dialogConfig.data?.agent as ISupportAgent;

    const result: ISupportAgent = {
      id: editAgent ? editAgent.id : Math.floor(Math.random() * 1000) + 100,
      agentName: emp.staffMemberFullName,
      email: emp.officialEmail || '',
      department: emp.departmentName,
      designation: emp.designationName,
    };

    setTimeout(() => {
      this.isSaving.set(false);
      this.#dialogRef.close(result);
    }, 500);
  }

  onCancel(): void {
    this.#dialogRef.close();
  }
}
