import { DatePipe } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';

import { AssignAssetPopup } from './assign-asset-popup';

describe('AssignAssetPopup', () => {
  let component: AssignAssetPopup;
  let fixture: ComponentFixture<AssignAssetPopup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssignAssetPopup],
      providers: [MessageService, DatePipe, provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(AssignAssetPopup);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('asset', { hasMultipleUser: false });
    fixture.componentRef.setInput('userStaffMemberId', '1');
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
