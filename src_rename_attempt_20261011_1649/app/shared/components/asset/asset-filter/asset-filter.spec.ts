import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';

import { AssetFilter } from './asset-filter';

describe('AssetFilter', () => {
  let component: AssetFilter;
  let fixture: ComponentFixture<AssetFilter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetFilter],
      providers: [MessageService, DatePipe],
    }).compileComponents();

    fixture = TestBed.createComponent(AssetFilter);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
