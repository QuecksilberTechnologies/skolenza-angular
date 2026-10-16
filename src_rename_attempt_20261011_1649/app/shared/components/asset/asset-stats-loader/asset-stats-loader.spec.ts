import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';

import { AssetStatsLoader } from './asset-stats-loader';

describe('AssetStatsLoader', () => {
  let component: AssetStatsLoader;
  let fixture: ComponentFixture<AssetStatsLoader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetStatsLoader],
      providers: [MessageService], // 👈 add this
    }).compileComponents();

    fixture = TestBed.createComponent(AssetStatsLoader);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
