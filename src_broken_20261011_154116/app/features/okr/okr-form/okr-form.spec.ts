import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { vi } from 'vitest';

import { Common, OkrApi } from '@core/services';

import OkrForm from './okr-form';

describe('OkrForm', () => {
  let component: OkrForm;
  let fixture: ComponentFixture<OkrForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OkrForm],
    })
      .overrideProvider(Common, { useValue: { setPageHeaderInfo: vi.fn(), showMessage: vi.fn() } })
      .overrideProvider(OkrApi, {
        useValue: { getOkr: vi.fn(), addOkr: vi.fn(), updateOkr: vi.fn() },
      })
      .overrideProvider(Router, { useValue: { navigate: vi.fn(), navigateByUrl: vi.fn() } })
      .overrideProvider(ActivatedRoute, {
        useValue: {
          snapshot: {
            data: { mode: 'create' },
            paramMap: { get: () => null },
            queryParamMap: { get: () => null },
          },
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(OkrForm);
    component = fixture.componentInstance;
    // No detectChanges: assert component/form logic without rendering [formField] controls.
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts in create mode with one key result', () => {
    expect(component.isEdit()).toBe(false);
    expect(component.weightTotal()).toBe(0);
  });

  it('addKeyResult / removeKeyResult mutate the model', () => {
    component.addKeyResult();
    expect(component.f.keyResults().value()).toHaveLength(2);
    component.removeKeyResult(1);
    expect(component.f.keyResults().value()).toHaveLength(1);
  });

  it('flags the form invalid when required fields are empty', () => {
    expect(component.f().valid()).toBe(false);
  });

  it('rejects key-result weights that do not total 100', () => {
    // single empty KR has weight 0 → weightSum error on the keyResults field
    const errors = component.f.keyResults().errors();
    expect(errors.some((e) => e.kind === 'weightSum' || e.kind === 'noKeyResult')).toBe(true);
  });

  it('cancel falls back to the dashboard when no origin is present', () => {
    const router = TestBed.inject(Router);
    component.cancel();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/app/okr/dashboard');
  });
});
