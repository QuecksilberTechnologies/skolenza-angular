import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Common } from '@core/services';
import { AuthStore } from '@core/stores';

import OkrDetail from './okr-detail';
import { OkrDetailStore } from './okr-detail.store';

describe('OkrDetail', () => {
  let component: OkrDetail;
  let fixture: ComponentFixture<OkrDetail>;
  let storeMock: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    storeMock = {
      okr: vi.fn().mockReturnValue(null),
      extras: vi.fn().mockReturnValue(null),
      isLoading: vi.fn().mockReturnValue(false),
      hasLoadError: vi.fn().mockReturnValue(false),
      reload: vi.fn(),
      comments: vi.fn().mockReturnValue([]),
      attachments: vi.fn().mockReturnValue([]),
      setOkrId: vi.fn(),
      addComment: vi.fn(),
      downloadAttachment: vi.fn(),
      uploadAttachment: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [OkrDetail],
    })
      .overrideComponent(OkrDetail, {
        set: { providers: [{ provide: OkrDetailStore, useValue: storeMock }] },
      })
      .overrideProvider(Common, {
        useValue: { setPageHeaderInfo: vi.fn(), setBreadcrumbItems: vi.fn() },
      })
      .overrideProvider(AuthStore, { useValue: { roleTypeId: () => 1 } })
      .overrideProvider(Router, { useValue: { navigate: vi.fn(), navigateByUrl: vi.fn() } })
      .overrideProvider(ActivatedRoute, {
        useValue: {
          paramMap: of(convertToParamMap({ id: 'okr-1' })),
          snapshot: { queryParamMap: convertToParamMap({ from: 'team' }) },
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(OkrDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('sets the OKR id from the route paramMap', () => {
    expect(storeMock['setOkrId']).toHaveBeenCalledWith('okr-1');
  });

  it('addComment delegates to the store', () => {
    component.addComment('nice work');
    expect(storeMock['addComment']).toHaveBeenCalledWith('nice work');
  });

  it('download delegates to the store', () => {
    const att = { id: 'a', fileName: 'f.pdf' } as never;
    component.download(att);
    expect(storeMock['downloadAttachment']).toHaveBeenCalledWith(att);
  });

  it('back returns to the originating list scope from the query param', () => {
    const router = TestBed.inject(Router);
    component.back();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/app/okr/team');
  });

  it('openLinkedGoal preserves the origin so back keeps working', () => {
    const router = TestBed.inject(Router);
    component.openLinkedGoal('okr-2');
    expect(router.navigate).toHaveBeenCalledWith(['/app/okr', 'okr-2'], {
      queryParams: { from: 'team' },
    });
  });
});
