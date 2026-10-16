import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { of } from 'rxjs';

import { SettingsStore } from '../settings.store';
import NotificationsSettings from './notifications-settings';

class FakeTranslateLoader extends TranslateLoader {
  override getTranslation() {
    return of({});
  }
}

describe('NotificationsSettings', () => {
  let component: NotificationsSettings;
  let fixture: ComponentFixture<NotificationsSettings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationsSettings],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        SettingsStore,
        provideTranslateService({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationsSettings);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
