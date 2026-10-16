import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';

import { AssetStats } from './asset-stats';

describe('AssetStats', () => {
  let component: AssetStats;
  let fixture: ComponentFixture<AssetStats>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetStats],
      providers: [MessageService], // 👈 add this
    }).compileComponents();

    fixture = TestBed.createComponent(AssetStats);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
