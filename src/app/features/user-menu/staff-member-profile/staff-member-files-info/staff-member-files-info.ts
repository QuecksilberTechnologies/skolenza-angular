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
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { IconFieldModule } from '@openng/optimus-ui/iconfield';
import { InputIconModule } from '@openng/optimus-ui/inputicon';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { Common } from '@core/services';
import { ProfileEmpty } from '@shared/components/profile/profile-empty/profile-empty';
import { LoginInfo } from '@shared/interfaces';

import { FileUploadDialog } from './file-upload-dialog/file-upload-dialog';

interface FileItem {
  name: string;
  type: string;
  size: string;
  updatedOn: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  badgeBg: string;
}

@Component({
  selector: 'app-staff-member-files-info',
  imports: [
    ButtonModule,
    CardModule,
    FormsModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    ProfileEmpty,
    TooltipModule,
  ],
  templateUrl: './staff-member-files-info.html',
  providers: [DialogService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffMemberFilesInfo implements OnInit {
  readonly #dialogService = inject(DialogService);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly searchQuery = signal('');
  readonly files = signal<FileItem[]>([
    {
      name: 'Pan Card.jpg',
      type: 'JPG',
      size: '2.4 MB',
      updatedOn: '12 Nov, 2023',
      icon: 'pi-id-card',
      iconColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-50 dark:bg-blue-900/30',
      badgeBg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    },
    {
      name: 'Aadhar Card Front.png',
      type: 'PNG',
      size: '1.8 MB',
      updatedOn: '10 Nov, 2023',
      icon: 'pi-file-o',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      iconBg: 'bg-indigo-50 dark:bg-indigo-900/30',
      badgeBg: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    },
    {
      name: 'Offer Letter_Deepesh.pdf',
      type: 'PDF',
      size: '450 KB',
      updatedOn: '12 Nov, 2023',
      icon: 'pi-file-pdf',
      iconColor: 'text-red-600 dark:text-red-400',
      iconBg: 'bg-red-50 dark:bg-red-900/30',
      badgeBg: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    },
    {
      name: 'Salary_Structure_FY24.xlsx',
      type: 'XLSX',
      size: '32 KB',
      updatedOn: '01 Nov, 2023',
      icon: 'pi-file-excel',
      iconColor: 'text-green-600 dark:text-green-400',
      iconBg: 'bg-green-50 dark:bg-green-900/30',
      badgeBg: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    },
  ]);
  protected readonly loginInfo = signal<LoginInfo | undefined>(undefined);

  readonly filteredFiles = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.files();
    return this.files().filter(
      (f) => f.name.toLowerCase().includes(query) || f.type.toLowerCase().includes(query),
    );
  });

  async ngOnInit() {
    this.loginInfo.set(await this.#commonService.getLoginInfo());
  }

  openUploadDialog() {
    const ref = this.#dialogService.open(FileUploadDialog, {
      header: 'Upload Document',
      style: { width: '90vw', maxWidth: '40rem' },
      contentStyle: { overflow: 'visible' },
      modal: true,
      closable: true,
      focusOnShow: false,
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((result) => {
      if (!result) return;
      // TODO: Call upload API and refresh file list
    });
  }
}
