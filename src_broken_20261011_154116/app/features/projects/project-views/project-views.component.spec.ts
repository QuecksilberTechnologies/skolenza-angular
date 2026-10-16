import { DatePipe } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from '@openng/optimus-ui/api';
import { of } from 'rxjs';
import { vi } from 'vitest';

import ProjectViewsComponent from './project-views.component';

describe('ProjectViewsComponent', () => {
  let component: ProjectViewsComponent;
  let fixture: ComponentFixture<ProjectViewsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectViewsComponent],
      providers: [
        MessageService,
        DatePipe,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: Router,
          useValue: {
            navigate: vi.fn().mockResolvedValue(true),
            url: '/projects/overview',
            events: of(),
          },
        },
        { provide: ActivatedRoute, useValue: { params: of({}), queryParams: of({}) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectViewsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
