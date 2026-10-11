import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { MessageService } from '@openng/optimus-ui/api';
import { of } from 'rxjs';

import { AdminDashboardStats } from './admin-dashboard-stats';

class FakeTranslateLoader extends TranslateLoader {
  override getTranslation() {
    return of({});
  }
}

describe('AdminDashboardStats', () => {
  let component: AdminDashboardStats;
  let fixture: ComponentFixture<AdminDashboardStats>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDashboardStats],
      providers: [
        MessageService,
        DatePipe,
        provideTranslateService({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDashboardStats);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
