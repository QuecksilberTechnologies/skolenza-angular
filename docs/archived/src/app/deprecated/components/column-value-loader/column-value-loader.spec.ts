import { ComponentFixture, TestBed } from '@angular/core/testing';
import ColumnValueLoaderComponent from './column-value-loader';

describe('ColumnValueLoaderComponent', () => {
  let component: ColumnValueLoaderComponent;
  let fixture: ComponentFixture<ColumnValueLoaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColumnValueLoaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ColumnValueLoaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
