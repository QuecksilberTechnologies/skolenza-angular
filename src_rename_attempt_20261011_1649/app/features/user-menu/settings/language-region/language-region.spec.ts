import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { of } from 'rxjs';

import { SettingsStore } from '../settings.store';
import LanguageRegion from './language-region';

class FakeTranslateLoader extends TranslateLoader {
  override getTranslation() {
    return of({});
  }
}

describe('LanguageRegion', () => {
  let component: LanguageRegion;
  let fixture: ComponentFixture<LanguageRegion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LanguageRegion],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        SettingsStore,
        provideTranslateService({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LanguageRegion);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
