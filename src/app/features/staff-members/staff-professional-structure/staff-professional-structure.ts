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
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { CheckboxModule } from '@openng/optimus-ui/checkbox';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MultiSelectModule } from '@openng/optimus-ui/multiselect';
import { SelectModule } from '@openng/optimus-ui/select';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { Subscription } from 'rxjs';

import { Common, StaffProfessionalStructureApi } from '@core/services';
import { LookupStore } from '@core/stores';
import { ListSkeleton } from '@shared/components';
import {
  SaveStaffPositionMaster,
  SaveInstitutionStaffCategory,
  InstitutionStaffCategory,
  SaveStaffProfessionalMaster,
  StaffPositionMaster,
  StaffProfessionalMaster,
  StaffProfessionalMasterType,
} from '@shared/interfaces';
import { escapeHtml } from '@shared/utilities/escape-html';
import { pendingCounter } from '@shared/utilities/pending-counter';

type StructureTab = StaffProfessionalMasterType | 'categories' | 'positions';

/** URL segment under `/app/staff/professional-structure/` for each tab. */
export const STRUCTURE_TAB_ROUTES: readonly { route: string; tab: StructureTab }[] = [
  { route: 'job-families', tab: StaffProfessionalMasterType.JobFamily },
  { route: 'staff-categories', tab: 'categories' },
  { route: 'capabilities', tab: StaffProfessionalMasterType.Capability },
  { route: 'duties', tab: StaffProfessionalMasterType.DutyDefinition },
  { route: 'positions', tab: 'positions' },
];

export type DependencyOption<T> = T & { disabled: boolean };

export function buildDependencyOptions<T extends { id: number; isActive: boolean }>(
  values: T[],
  selectedIds: ReadonlySet<number>,
): DependencyOption<T>[] {
  return values
    .filter((item) => item.isActive || selectedIds.has(item.id))
    .map((item) => ({ ...item, disabled: !item.isActive }));
}

@Component({
  selector: 'app-staff-professional-structure',
  imports: [
    ButtonModule,
    CardModule,
    CheckboxModule,
    ConfirmDialogModule,
    FormsModule,
    InputTextModule,
    ListSkeleton,
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
  readonly #confirmationService = inject(ConfirmationService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #lookups = inject(LookupStore);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);

  readonly masterTypes = StaffProfessionalMasterType;
  readonly selectedTab = signal<StructureTab>(StaffProfessionalMasterType.JobFamily);
  readonly masters = signal<StaffProfessionalMaster[]>([]);
  readonly positions = signal<StaffPositionMaster[]>([]);
  readonly jobFamilies = signal<StaffProfessionalMaster[]>([]);
  readonly capabilities = signal<StaffProfessionalMaster[]>([]);
  readonly duties = signal<StaffProfessionalMaster[]>([]);
  readonly categories = signal<InstitutionStaffCategory[]>([]);
  readonly canonicalCategories = this.#lookups.staffCategories;
  readonly #listLoad = pendingCounter();
  readonly #save = pendingCounter();
  #selectedLoad?: Subscription;
  readonly loading = this.#listLoad.active;
  readonly saving = this.#save.active;
  readonly statusOptions = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
  ];
  statusFilter: 'all' | 'active' | 'inactive' = 'all';

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
    this.#route.paramMap.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((params) => {
      const match = STRUCTURE_TAB_ROUTES.find((item) => item.route === params.get('tab'));
      if (!match) {
        void this.#router.navigate(['..', STRUCTURE_TAB_ROUTES[0].route], {
          relativeTo: this.#route,
          replaceUrl: true,
        });
        return;
      }
      this.selectTab(match.tab);
    });
  }

  openTab(tab: StructureTab): void {
    if (tab === this.selectedTab()) return;
    const route = STRUCTURE_TAB_ROUTES.find((item) => item.tab === tab)?.route;
    void this.#router.navigate(['..', route], { relativeTo: this.#route });
  }

  selectTab(tab: StructureTab): void {
    this.selectedTab.set(tab);
    // Job Families, Capabilities and Duties share `masters`; clear it so the next tab shows a
    // loading state instead of the previous tab's rows.
    this.masters.set([]);
    this.resetForm();
    this.loadSelected();
  }

  loadSelected(): void {
    const tab = this.selectedTab();
    // Cancel the previous tab's request so a late response cannot fill this tab.
    this.#selectedLoad?.unsubscribe();
    if (tab === 'categories') {
      this.#selectedLoad = this.#api
        .getCategories(false)
        .pipe(this.#listLoad.track, takeUntilDestroyed(this.#destroyRef))
        .subscribe({
          next: (response) => this.categories.set(response.isSucceeded ? response.data : []),
          error: (error) => this.#common.showMessage(error.message, 'error'),
        });
      return;
    }
    if (tab === 'positions') {
      this.#selectedLoad = this.#api
        .getPositions(undefined, false)
        .pipe(this.#listLoad.track, takeUntilDestroyed(this.#destroyRef))
        .subscribe({
          next: (response) => this.positions.set(response.isSucceeded ? response.data : []),
          error: (error) => this.#common.showMessage(error.message, 'error'),
        });
      return;
    }
    this.#selectedLoad = this.#api
      .getMasters(tab, false)
      .pipe(this.#listLoad.track, takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => this.masters.set(response.isSucceeded ? response.data : []),
        error: (error) => this.#common.showMessage(error.message, 'error'),
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
      .pipe(this.#save.track, takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          if (!response.isSucceeded) {
            this.#common.showMessage(response.message, 'error');
            return;
          }
          this.#api
            .setCategoryJobFamilies(response.data.id, this.categoryForm.staffJobFamilyMasterIds)
            .pipe(this.#save.track, takeUntilDestroyed(this.#destroyRef))
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

  confirmCategoryActive(item: InstitutionStaffCategory): void {
    this.confirmStatusChange(item.name, item.isActive, () => this.setCategoryActive(item));
  }

  saveMaster(): void {
    const tab = this.selectedTab();
    if (typeof tab === 'string' || !this.masterForm.code.trim() || !this.masterForm.name.trim())
      return;
    this.#api
      .saveMaster(tab, this.masterForm)
      .pipe(this.#save.track, takeUntilDestroyed(this.#destroyRef))
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

  confirmMasterActive(item: StaffProfessionalMaster): void {
    // The backend DELETE endpoints soft-deactivate (isActive = false); nothing is hard-deleted.
    this.confirmStatusChange(item.name, item.isActive, () =>
      item.isActive ? this.deleteMaster(item) : this.activateMaster(item),
    );
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
      .pipe(this.#save.track, takeUntilDestroyed(this.#destroyRef))
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

  confirmPositionActive(item: StaffPositionMaster): void {
    this.confirmStatusChange(item.name, item.isActive, () =>
      item.isActive ? this.deletePosition(item) : this.activatePosition(item),
    );
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
      .getCategories(false)
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
        .getMasters(type, false)
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

  categoryJobFamilyOptions(): DependencyOption<StaffProfessionalMaster>[] {
    return this.dependencyOptions(
      this.jobFamilies(),
      new Set(this.categoryForm.staffJobFamilyMasterIds),
    );
  }

  positionCategoryOptions(): DependencyOption<InstitutionStaffCategory>[] {
    return this.dependencyOptions(
      this.categories(),
      new Set([this.positionForm.institutionStaffCategoryMasterId]),
    );
  }

  positionJobFamilyOptions(): DependencyOption<StaffProfessionalMaster>[] {
    return this.dependencyOptions(
      this.mappedJobFamilies(),
      new Set([this.positionForm.staffJobFamilyMasterId]),
    );
  }

  capabilityOptions(): DependencyOption<StaffProfessionalMaster>[] {
    return this.dependencyOptions(
      this.capabilities(),
      new Set(this.positionForm.capabilities.map((item) => item.id)),
    );
  }

  dutyOptions(): DependencyOption<StaffProfessionalMaster>[] {
    return this.dependencyOptions(
      this.duties(),
      new Set(this.positionForm.duties.map((item) => item.id)),
    );
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

  private dependencyOptions<T extends { id: number; isActive: boolean }>(
    values: T[],
    selectedIds: ReadonlySet<number>,
  ): DependencyOption<T>[] {
    return buildDependencyOptions(values, selectedIds);
  }

  private confirmStatusChange(name: string, isActive: boolean, accept: () => void): void {
    const action = isActive ? 'Deactivate' : 'Activate';
    this.#confirmationService.confirm({
      // The dialog renders `message` via [innerHTML], so the record name is escaped before use.
      message: `${action} <strong>${escapeHtml(name)}</strong>?${
        isActive ? ' It will no longer be available for new dependent selections.' : ''
      }`,
      header: `${action} this record`,
      icon: 'pi pi-exclamation-circle text-amber-500! text-2xl!',
      acceptLabel: action,
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: isActive ? 'p-button-danger' : 'p-button-primary',
      rejectButtonStyleClass: 'p-button-secondary',
      accept,
    });
  }
}
