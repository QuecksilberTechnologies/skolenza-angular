import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HiringPipelineCard } from './hiring-pipeline-card';

describe('HiringPipelineCard', () => {
  let fixture: ComponentFixture<HiringPipelineCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HiringPipelineCard] }).compileComponents();
    fixture = TestBed.createComponent(HiringPipelineCard);
  });

  it('shows each stage with its conversion from the previous one', async () => {
    fixture.componentRef.setInput('pipeline', {
      totalApplicants: 100,
      stages: [
        { stage: 'Applied', count: 100 },
        { stage: 'Screening', count: 50 },
      ],
    });
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Screening');
    expect(text).toContain('50%');
  });

  it('shows an empty state with no stages', async () => {
    fixture.componentRef.setInput('pipeline', null);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('No hiring data');
  });
});
