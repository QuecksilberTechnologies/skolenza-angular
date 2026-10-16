import { DatePipe } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { MessageService } from '@openng/optimus-ui/api';
import { of } from 'rxjs';

import { SettingsStore } from '../settings.store';
import BrandIdentity from './brand-identity';

class FakeTranslateLoader extends TranslateLoader {
  override getTranslation() {
    return of({});
  }
}

describe('BrandIdentity', () => {
  let component: BrandIdentity;
  let fixture: ComponentFixture<BrandIdentity>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrandIdentity],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        DatePipe,
        SettingsStore,
        provideTranslateService({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BrandIdentity);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
