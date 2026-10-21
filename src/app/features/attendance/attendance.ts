import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { DatePickerModule } from '@openng/optimus-ui/datepicker';
import { SelectModule } from '@openng/optimus-ui/select';
import { TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';
import { TooltipModule } from '@openng/optimus-ui/tooltip';
import { finalize } from 'rxjs';

import { Common } from '@core/services';
import { UserAvatar } from '@shared/components/user-avatar/user-avatar';
import {
  StaffMemberStatistic,
  LoginInfo,
  SearchPipe,
  TableEmptyMessage,
  TableLoader,
  TableSearchInput,
  TableInlineFilters,
} from '@shared/index';
import { isAdminSession } from '@shared/utilities/login-info';

import { AttendanceAPI } from './attendance-api';
import { AttendanceStatsLoader } from './attendance-stats-loader/attendance-stats-loader';
import { AttendanceStats } from './attendance-stats/attendance-stats';
import { AttendanceRecord, AttendanceStatus, StaffMemberShort } from './attendance.model';

@Component({
  selector: 'app-attendance',
  imports: [
    UserAvatar,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    DatePipe,
    DecimalPipe,
    FormsModule,
    SelectModule,
    DatePickerModule,
    TooltipModule,
    SearchPipe,
    TableSearchInput,
    TableLoader,
    TableEmptyMessage,
    AttendanceStats,
    AttendanceStatsLoader,
    TableInlineFilters,
  ],
  templateUrl: './attendance.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Attendance implements OnInit {
  readonly #commonService = inject(Common);
  readonly #attendanceAPI = inject(AttendanceAPI);
  readonly #destroyRef = inject(DestroyRef);
  readonly isLoading = signal(false);
  readonly attendanceRecords = signal<AttendanceRecord[]>([]);
  readonly selectedMonth = signal(new Date());
  readonly staffMembers = signal<StaffMemberShort[]>([]);
  readonly selectedStaffMemberId = signal<string | null>(null);
  readonly isAdmin = signal(false);
  protected loginInfo!: LoginInfo;
  protected searchText = '';
  readonly staffMembersStatistics = signal<StaffMemberStatistic | null>(null);

  readonly statusOptions = [
    { label: 'All statuses', value: null },
    { label: 'Present', value: AttendanceStatus.Present },
    { label: 'Absent', value: AttendanceStatus.Absent },
    { label: 'Half Day', value: AttendanceStatus.HalfDay },
    { label: 'On Leave', value: AttendanceStatus.OnLeave },
    { label: 'Holiday', value: AttendanceStatus.Holiday },
    { label: 'Weekend', value: AttendanceStatus.Weekend },
  ];

  readonly selectedStatus = signal<AttendanceStatus | null>(null);

  readonly selectedStaffMember = computed(() => {
    const id = this.selectedStaffMemberId();
    if (!id) return null;
    return this.staffMembers().find((e) => e.staffMemberId === id) ?? null;
  });

  readonly filteredRecords = computed(() => {
    const records = this.attendanceRecords();
    const status = this.selectedStatus();
    if (status === null) return records;
    return records.filter((r) => r.status === status);
  });

  readonly stats = computed(() => {
    const records = this.attendanceRecords();
    return {
      present: records.filter((r) => r.status === AttendanceStatus.Present).length,
      absent: records.filter((r) => r.status === AttendanceStatus.Absent).length,
      halfDay: records.filter((r) => r.status === AttendanceStatus.HalfDay).length,
      onLeave: records.filter((r) => r.status === AttendanceStatus.OnLeave).length,
      total: records.length,
    };
  });

  constructor() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Attendance',
      pageDescription: 'View and track your attendance records.',
      pageIcon: 'pi pi-clock',
      isBreadcrumbShow: false,
    });
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();
    this.isAdmin.set(isAdminSession(this.loginInfo));
    if (this.isAdmin()) {
      this.loadStaffMembers();
    }
    this.loadAttendance();
  }

  loadAttendance() {
    this.isLoading.set(true);
    this.#attendanceAPI
      .getAttendance()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.attendanceRecords.set(res.isSucceeded ? res.data : []);
          if (!res.isSucceeded) {
            this.#commonService.showMessage(res.message, 'error');
          }
        },
        error: (err) => {
          console.error(err);
        },
      });
  }

  onMonthChange() {
    this.loadAttendance();
  }

  onStaffMemberChange(staffMemberId: string | null) {
    this.selectedStaffMemberId.set(staffMemberId);
    this.loadAttendance();
  }

  loadStaffMembers() {
    this.#attendanceAPI
      .getStaffMembersShort()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (res) => {
          if (res.isSucceeded) {
            this.staffMembers.set(res.data);
          }
        },
      });
  }

  getStatusSeverity(
    status: AttendanceStatus,
  ): 'success' | 'danger' | 'warn' | 'info' | 'secondary' | 'contrast' {
    switch (status) {
      case AttendanceStatus.Present:
        return 'success';
      case AttendanceStatus.Absent:
        return 'danger';
      case AttendanceStatus.HalfDay:
        return 'warn';
      case AttendanceStatus.OnLeave:
        return 'info';
      case AttendanceStatus.Holiday:
        return 'contrast';
      case AttendanceStatus.Weekend:
        return 'secondary';
      default:
        return 'secondary';
    }
  }

  getStatusLabel(status: AttendanceStatus): string {
    switch (status) {
      case AttendanceStatus.Present:
        return 'Present';
      case AttendanceStatus.Absent:
        return 'Absent';
      case AttendanceStatus.HalfDay:
        return 'Half Day';
      case AttendanceStatus.OnLeave:
        return 'On Leave';
      case AttendanceStatus.Holiday:
        return 'Holiday';
      case AttendanceStatus.Weekend:
        return 'Weekend';
      default:
        return 'Unknown';
    }
  }

  searchTerm(value: string) {
    this.searchText = value;
  }
}
