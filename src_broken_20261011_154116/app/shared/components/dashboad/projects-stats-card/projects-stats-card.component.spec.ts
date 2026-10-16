import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectsStatsCardComponent } from './projects-stats-card.component';

describe('ProjectsStatsCardComponent', () => {
  let component: ProjectsStatsCardComponent;
  let fixture: ComponentFixture<ProjectsStatsCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectsStatsCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectsStatsCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
