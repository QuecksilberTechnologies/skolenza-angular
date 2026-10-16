import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';

import { AssetDetail } from './asset-detail';

describe('AssetDetail', () => {
  let component: AssetDetail;
  let fixture: ComponentFixture<AssetDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetDetail],
      providers: [MessageService], // 👈 add this
    }).compileComponents();

    fixture = TestBed.createComponent(AssetDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
