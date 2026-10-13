import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { CheckboxModule } from '@openng/optimus-ui/checkbox';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MultiSelectModule } from '@openng/optimus-ui/multiselect';
import { SelectModule } from '@openng/optimus-ui/select';
import { TextareaModule } from '@openng/optimus-ui/textarea';

import { Common, StaffProfessionalStructureApi } from '@core/services';
import { LookupStore } from '@core/stores';
import {
  SaveStaffPositionMaster,
  SaveInstitutionStaffCategory,
  InstitutionStaffCategory,
  SaveStaffProfessionalMaster,
  StaffPositionMaster,
  StaffProfessionalMaster,
  StaffProfessionalMasterType,
} from '@shared/interfaces';

type StructureTab = StaffProfessionalMasterType | 'categories' | 'positions';

@Component({
  selector: 'app-staff-professional-structure',
  imports: [
    ButtonModule,
    CardModule,
    CheckboxModule,
    FormsModule,
    InputTextModule,
    SelectModule,
    MultiSelectModule,
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
  readonly selectedTab = signal<StructureTab>('categories');
  readonly masters = signal<StaffProfessionalMaster[]>([]);
  readonly positions = signal<StaffPositionMaster[]>([]);
  readonly jobFamilies = signal<StaffProfessionalMaster[]>([]);
  readonly capabilities = signal<StaffProfessionalMaster[]>([]);
  readonly duties = signal<StaffProfessionalMaster[]>([]);
  readonly categories = signal<InstitutionStaffCategory[]>([]);
  readonly canonicalCategories = this.#lookups.staffCategories;
  readonly loading = signal(false);
  readonly statusOptions = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
  ];
  statusFilter: 'all' | 'active' | 'inactive' = 'active';

  masterForm: SaveStaffProfessionalMaster = this.emptyMaster();
  categoryForm: SaveInstitutionStaffCategory = this.emptyCategory();
  positionForm: SaveStaffPositionMaster = this.emptyPosition();

  ngOnInit(): void {
    this.#common.setPageHeaderInfo({
      pageTitle: 'Staff Professional Structure',
      pageDescription: 'Manage institution-owned job families, positions, capabilities and duties',
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
    if (tab === 'categories') {
      this.#api
        .getCategories(false)
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe({
          next: (response) => this.categories.set(response.isSucceeded ? response.data : []),
          error: (error) => this.#common.showMessage(error.message, 'error'),
          complete: () => this.loading.set(false),
        });
      return;
    }
    if (tab === 'positions') {
      this.#api
        .getPositions(undefined, false)
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe({
          next: (response) => this.positions.set(response.isSucceeded ? response.data : []),
          error: (error) => this.#common.showMessage(error.message, 'error'),
          complete: () => this.loading.set(false),
        });
      return;
    }
    this.#api
      .getMasters(tab, false)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => this.masters.set(response.isSucceeded ? response.data : []),
        error: (error) => this.#common.showMessage(error.message, 'error'),
        complete: () => this.loading.set(false),
      });
  }

  editMaster(item: StaffProfessionalMaster): void {
    this.masterForm = { ...item };
  }

  editCategory(item: InstitutionStaffCategory): void {
    this.categoryForm = { ...item, staffJobFamilyMasterIds: [...item.staffJobFamilyMasterIds] };
  }

  saveCategory(): void {
    if (
      !this.categoryForm.staffCategoryTypeId ||
      !this.categoryForm.code.trim() ||
      !this.categoryForm.name.trim()
    )
      return;
    this.#api
      .saveCategory(this.categoryForm)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          if (!response.isSucceeded) {
            this.#common.showMessage(response.message, 'error');
            return;
          }
          this.#api
            .setCategoryJobFamilies(response.data.id, this.categoryForm.staffJobFamilyMasterIds)
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe({
              next: (mappingResponse) => {
                this.#common.showMessage(
                  mappingResponse.message,
                  mappingResponse.isSucceeded ? 'success' : 'error',
                );
                if (mappingResponse.isSucceeded) {
                  this.resetForm();
                  this.loadSelected();
                }
              },
              error: (error) => this.#common.showMessage(error.message, 'error'),
            });
        },
        error: (error) => this.#common.showMessage(error.message, 'error'),
      });
  }

  setCategoryActive(item: InstitutionStaffCategory): void {
    this.#api
      .setCategoryActive(item.id, !item.isActive)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.#common.showMessage(response.message, response.isSucceeded ? 'success' : 'error');
          this.loadSelected();
        },
        error: (error) => this.#common.showMessage(error.message, 'error'),
      });
  }

  saveMaster(): void {
    const tab = this.selectedTab();
    if (typeof tab === 'string' || !this.masterForm.code.trim() || !this.masterForm.name.trim())
      return;
    this.#api
      .saveMaster(tab, this.masterForm)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.#common.showMessage(response.message, response.isSucceeded ? 'success' : 'error');
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
    if (typeof tab === 'string') return;
    this.#api
      .deleteMaster(tab, item.id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.#common.showMessage(response.message, response.isSucceeded ? 'success' : 'error');
          this.loadReferenceData();
          this.loadSelected();
        },
        error: (error) => this.#common.showMessage(error.message, 'error'),
      });
  }

  activateMaster(item: StaffProfessionalMaster): void {
    const tab = this.selectedTab();
    if (typeof tab === 'string') return;
    this.#api
      .saveMaster(tab, { ...item, isActive: true })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.#common.showMessage(response.message, response.isSucceeded ? 'success' : 'error');
          this.loadReferenceData();
          this.loadSelected();
        },
        error: (error) => this.#common.showMessage(error.message, 'error'),
      });
  }

  editPosition(item: StaffPositionMaster): void {
    this.positionForm = {
      ...item,
      institutionStaffCategoryMasterId: item.institutionStaffCategoryMasterId ?? 0,
      capabilities: item.capabilities.map((value, index) => ({
        id: value.id,
        isMandatory: value.isMandatory,
        displayOrder: (index + 1) * 10,
      })),
      duties: item.duties.map((value, index) => ({
        id: value.id,
        isMandatory: value.isMandatory,
        displayOrder: (index + 1) * 10,
      })),
    };
  }

  savePosition(): void {
    if (
      !this.positionForm.staffJobFamilyMasterId ||
      !this.positionForm.institutionStaffCategoryMasterId ||
      !this.positionForm.code.trim() ||
      !this.positionForm.name.trim()
    )
      return;
    this.#api
      .savePosition(this.positionForm)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.#common.showMessage(response.message, response.isSucceeded ? 'success' : 'error');
          if (response.isSucceeded) {
            this.resetForm();
            this.loadSelected();
          }
        },
        error: (error) => this.#common.showMessage(error.message, 'error'),
      });
  }

  onPositionCategoryChange(): void {
    if (
      !this.mappedJobFamilies().some(
        (family) => family.id === this.positionForm.staffJobFamilyMasterId,
      )
    ) {
      this.positionForm.staffJobFamilyMasterId = 0;
    }
  }

  deletePosition(item: StaffPositionMaster): void {
    this.#api
      .deletePosition(item.id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.#common.showMessage(response.message, response.isSucceeded ? 'success' : 'error');
          this.loadSelected();
        },
        error: (error) => this.#common.showMessage(error.message, 'error'),
      });
  }

  activatePosition(item: StaffPositionMaster): void {
    this.#api
      .savePosition({
        ...item,
        institutionStaffCategoryMasterId: item.institutionStaffCategoryMasterId ?? 0,
        isActive: true,
        capabilities: item.capabilities.map((value, index) => ({
          id: value.id,
          isMandatory: value.isMandatory,
          displayOrder: (index + 1) * 10,
        })),
        duties: item.duties.map((value, index) => ({
          id: value.id,
          isMandatory: value.isMandatory,
          displayOrder: (index + 1) * 10,
        })),
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.#common.showMessage(response.message, response.isSucceeded ? 'success' : 'error');
          this.loadSelected();
        },
        error: (error) => this.#common.showMessage(error.message, 'error'),
      });
  }

  toggleCapability(id: number, checked: boolean): void {
    this.positionForm.capabilities = this.toggleRequirement(
      this.positionForm.capabilities,
      id,
      checked,
    );
  }

  toggleDuty(id: number, checked: boolean): void {
    this.positionForm.duties = this.toggleRequirement(this.positionForm.duties, id, checked);
  }

  resetForm(): void {
    this.masterForm = this.emptyMaster();
    this.categoryForm = this.emptyCategory();
    this.positionForm = this.emptyPosition();
  }

  private loadReferenceData(): void {
    this.#api
      .getCategories()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((response) => {
        this.categories.set(response.isSucceeded ? response.data : []);
      });
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
          if (type === StaffProfessionalMasterType.JobFamily) this.jobFamilies.set(values);
          if (type === StaffProfessionalMasterType.Capability) this.capabilities.set(values);
          if (type === StaffProfessionalMasterType.DutyDefinition) this.duties.set(values);
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
      institutionStaffCategoryMasterId: 0,
      code: '',
      name: '',
      description: '',
      displayOrder: 10,
      isActive: true,
      capabilities: [],
      duties: [],
    };
  }

  private emptyCategory(): SaveInstitutionStaffCategory {
    return {
      staffCategoryTypeId: 0,
      code: '',
      name: '',
      description: '',
      displayOrder: 10,
      isActive: true,
      staffJobFamilyMasterIds: [],
    };
  }

  mappedJobFamilies(): StaffProfessionalMaster[] {
    const category = this.categories().find(
      (item) => item.id === this.positionForm.institutionStaffCategoryMasterId,
    );
    return category
      ? this.jobFamilies().filter((family) => category.staffJobFamilyMasterIds.includes(family.id))
      : [];
  }

  visibleCategories(): InstitutionStaffCategory[] {
    return this.filterByStatus(this.categories());
  }
  visibleMasters(): StaffProfessionalMaster[] {
    return this.filterByStatus(this.masters());
  }
  visiblePositions(): StaffPositionMaster[] {
    return this.filterByStatus(this.positions());
  }

  requirementSelected(values: { id: number }[], id: number): boolean {
    return values.some((value) => value.id === id);
  }

  requirementMandatory(values: { id: number; isMandatory: boolean }[], id: number): boolean {
    return values.find((value) => value.id === id)?.isMandatory ?? true;
  }

  setRequirementMandatory(
    values: { id: number; isMandatory: boolean; displayOrder: number }[],
    id: number,
    isMandatory: boolean,
  ): void {
    const item = values.find((value) => value.id === id);
    if (item) item.isMandatory = isMandatory;
  }

  private toggleRequirement(
    values: { id: number; isMandatory: boolean; displayOrder: number }[],
    id: number,
    checked: boolean,
  ) {
    return checked
      ? [...values, { id, isMandatory: true, displayOrder: (values.length + 1) * 10 }]
      : values.filter((value) => value.id !== id);
  }

  private filterByStatus<T extends { isActive: boolean }>(values: T[]): T[] {
    return this.statusFilter === 'all'
      ? values
      : values.filter((item) => item.isActive === (this.statusFilter === 'active'));
  }
}
