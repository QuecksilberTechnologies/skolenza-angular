import { DatePipe } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { MessageService } from '@openng/optimus-ui/api';
import { of } from 'rxjs';

import { SettingsStore } from '../settings.store';
import { SettingActions } from './setting-actions';

class FakeTranslateLoader extends TranslateLoader {
  override getTranslation() {
    return of({});
  }
}

describe('SettingActions', () => {
  let component: SettingActions;
  let fixture: ComponentFixture<SettingActions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingActions],
      providers: [
        provideTranslateService({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader },
        }),
        MessageService,
        DatePipe,
        provideHttpClient(),
        provideHttpClientTesting(),
        SettingsStore,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingActions);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
