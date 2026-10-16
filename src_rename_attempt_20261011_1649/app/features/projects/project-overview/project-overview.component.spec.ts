import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { MessageService } from '@openng/optimus-ui/api';
import { of } from 'rxjs';

import ProjectOverviewComponent from './project-overview.component';

class FakeTranslateLoader extends TranslateLoader {
  override getTranslation() {
    return of({});
  }
}

describe('ProjectOverviewComponent', () => {
  let component: ProjectOverviewComponent;
  let fixture: ComponentFixture<ProjectOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectOverviewComponent],
      providers: [
        MessageService,
        DatePipe,
        provideTranslateService({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
