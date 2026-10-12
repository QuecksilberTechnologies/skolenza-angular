import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { CheckboxModule } from '@openng/optimus-ui/checkbox';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { SelectModule } from '@openng/optimus-ui/select';
import { TextareaModule } from '@openng/optimus-ui/textarea';

import { Common, StaffProfessionalStructureApi } from '@core/services';
import { LookupStore } from '@core/stores';
import {
  SaveStaffPositionMaster,
  SaveStaffProfessionalMaster,
  StaffPositionMaster,
  StaffProfessionalMaster,
  StaffProfessionalMasterType,
} from '@shared/interfaces';

type StructureTab = StaffProfessionalMasterType | 'positions';

@Component({
  selector: 'app-staff-professional-structure',
  imports: [
    ButtonModule,
    CardModule,
    CheckboxModule,
    FormsModule,
    InputTextModule,
    SelectModule,
    TextareaModule,
  ],
  templateUrl: './staff-professional-structure.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffProfessionalStructure implements OnInit {
  readonly #api = inject(StaffProfessionalStructureApi);
  readonly #common = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #lookups = inject(LookupStore);

  readonly masterTypes = StaffProfessionalMasterType;
  readonly selectedTab = signal<StructureTab>(
    StaffProfessionalMasterType.JobFamily,
  );
  readonly masters = signal<StaffProfessionalMaster[]>([]);
  readonly positions = signal<StaffPositionMaster[]>([]);
  readonly jobFamilies = signal<StaffProfessionalMaster[]>([]);
  readonly capabilities = signal<StaffProfessionalMaster[]>([]);
  readonly duties = signal<StaffProfessionalMaster[]>([]);
  readonly categories = this.#lookups.staffCategories;
  readonly loading = signal(false);

  masterForm: SaveStaffProfessionalMaster = this.emptyMaster();
  positionForm: SaveStaffPositionMaster = this.emptyPosition();

  ngOnInit(): void {
    this.#common.setPageHeaderInfo({
      pageTitle: 'Staff Professional Structure',
      pageDescription:
        'Manage institution-owned job families, positions, capabilities and duties',
      pageIcon: 'pi pi-sitemap',
      isBreadcrumbShow: true,
    });
    this.#common.setBreadcrumbItems([
      { label: 'Staff Directory', routerLink: '/app/staff' },
      { label: 'Professional Structure' },
    ]);

    this.loadReferenceData();
    this.loadSelected();
  }

  selectTab(tab: StructureTab): void {
    this.selectedTab.set(tab);
    this.resetForm();
    this.loadSelected();
  }

  loadSelected(): void {
    const tab = this.selectedTab();
    this.loading.set(true);
    if (tab === 'positions') {
      this.#api
        .getPositions(undefined, false)
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe({
          next: (response) =>
            this.positions.set(response.isSucceeded ? response.data : []),
          error: (error) => this.#common.showMessage(error.message, 'error'),
          complete: () => this.loading.set(false),
        });
      return;
    }
    this.#api
      .getMasters(tab, false)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) =>
          this.masters.set(response.isSucceeded ? response.data : []),
        error: (error) => this.#common.showMessage(error.message, 'error'),
        complete: () => this.loading.set(false),
      });
  }

  editMaster(item: StaffProfessionalMaster): void {
    this.masterForm = { ...item };
  }

  saveMaster(): void {
    const tab = this.selectedTab();
    if (
      tab === 'positions' ||
      !this.masterForm.code.trim() ||
      !this.masterForm.name.trim()
    )
      return;
    this.#api
      .saveMaster(tab, this.masterForm)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.#common.showMessage(
            response.message,
            response.isSucceeded ? 'success' : 'error',
          );
          if (response.isSucceeded) {
            this.resetForm();
            this.loadReferenceData();
            this.loadSelected();
          }
        },
        error: (error) => this.#common.showMessage(error.message, 'error'),
      });
  }

  deleteMaster(item: StaffProfessionalMaster): void {
    const tab = this.selectedTab();
    if (tab === 'positions') return;
    this.#api
      .deleteMaster(tab, item.id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.#common.showMessage(
            response.message,
            response.isSucceeded ? 'success' : 'error',
          );
          this.loadReferenceData();
          this.loadSelected();
        },
        error: (error) => this.#common.showMessage(error.message, 'error'),
      });
  }

  editPosition(item: StaffPositionMaster): void {
    this.positionForm = {
      ...item,
      capabilityIds: item.capabilities.map((value) => value.id),
      dutyDefinitionIds: item.duties.map((value) => value.id),
    };
  }

  savePosition(): void {
    if (
      !this.positionForm.staffJobFamilyMasterId ||
      !this.positionForm.staffCategoryId ||
      !this.positionForm.code.trim() ||
      !this.positionForm.name.trim()
    )
      return;
    this.#api
      .savePosition(this.positionForm)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.#common.showMessage(
            response.message,
            response.isSucceeded ? 'success' : 'error',
          );
          if (response.isSucceeded) {
            this.resetForm();
            this.loadSelected();
          }
        },
        error: (error) => this.#common.showMessage(error.message, 'error'),
      });
  }

  deletePosition(item: StaffPositionMaster): void {
    this.#api
      .deletePosition(item.id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.#common.showMessage(
            response.message,
            response.isSucceeded ? 'success' : 'error',
          );
          this.loadSelected();
        },
        error: (error) => this.#common.showMessage(error.message, 'error'),
      });
  }

  toggleCapability(id: number, checked: boolean): void {
    this.positionForm.capabilityIds = this.toggleId(
      this.positionForm.capabilityIds,
      id,
      checked,
    );
  }

  toggleDuty(id: number, checked: boolean): void {
    this.positionForm.dutyDefinitionIds = this.toggleId(
      this.positionForm.dutyDefinitionIds,
      id,
      checked,
    );
  }

  resetForm(): void {
    this.masterForm = this.emptyMaster();
    this.positionForm = this.emptyPosition();
  }

  private loadReferenceData(): void {
    for (const type of [
      StaffProfessionalMasterType.JobFamily,
      StaffProfessionalMasterType.Capability,
      StaffProfessionalMasterType.DutyDefinition,
    ]) {
      this.#api
        .getMasters(type)
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe((response) => {
          const values = response.isSucceeded ? response.data : [];
          if (type === StaffProfessionalMasterType.JobFamily)
            this.jobFamilies.set(values);
          if (type === StaffProfessionalMasterType.Capability)
            this.capabilities.set(values);
          if (type === StaffProfessionalMasterType.DutyDefinition)
            this.duties.set(values);
        });
    }
  }

  private emptyMaster(): SaveStaffProfessionalMaster {
    return {
      code: '',
      name: '',
      description: '',
      displayOrder: 10,
      isActive: true,
      requiresCertification: false,
      certificationValidityRequired: false,
      defaultFrequency: '',
      requiresEvidence: false,
    };
  }

  private emptyPosition(): SaveStaffPositionMaster {
    return {
      staffJobFamilyMasterId: 0,
      staffCategoryId: 0,
      code: '',
      name: '',
      description: '',
      displayOrder: 10,
      isActive: true,
      capabilityIds: [],
      dutyDefinitionIds: [],
    };
  }

  private toggleId(values: number[], id: number, checked: boolean): number[] {
    return checked
      ? [...new Set([...values, id])]
      : values.filter((value) => value !== id);
  }
}
