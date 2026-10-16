import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FileDropZone } from './file-drop-zone';

describe('FileDropZone', () => {
  let fixture: ComponentFixture<FileDropZone>;
  let component: FileDropZone;

  const dragEvent = (init: Partial<Record<keyof DragEvent, unknown>> = {}) =>
    ({ preventDefault: vi.fn(), ...init }) as unknown as DragEvent;

  const render = async () => {
    await TestBed.inject(ApplicationRef).whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FileDropZone] }).compileComponents();
    fixture = TestBed.createComponent(FileDropZone);
    component = fixture.componentInstance;
    await render();
  });

  it('shows the drop prompt while a file is dragged over it', async () => {
    const event = dragEvent();
    component['onDragOver'](event);
    const el = await render();

    expect(event.preventDefault).toHaveBeenCalled();
    expect(el.textContent).toContain('Drop your file to upload');
  });

  it('stays in the dragging state when the pointer crosses onto a child', () => {
    const zone = document.createElement('div');
    const child = document.createElement('span');
    zone.append(child);
    component['onDragOver'](dragEvent());

    component['onDragLeave'](dragEvent({ currentTarget: zone, relatedTarget: child }));
    expect(component['isDragging']()).toBe(true);

    component['onDragLeave'](dragEvent({ currentTarget: zone, relatedTarget: null }));
    expect(component['isDragging']()).toBe(false);
  });

  it('emits the dropped files and leaves the dragging state', () => {
    const dropped = vi.fn();
    component.dropped.subscribe(dropped);
    const files = [new File(['x'], 'a.csv')] as unknown as FileList;

    component['onDragOver'](dragEvent());
    component['onDrop'](dragEvent({ dataTransfer: { files } }));

    expect(dropped).toHaveBeenCalledWith(files);
    expect(component['isDragging']()).toBe(false);
  });

  it('ignores drags and drops while disabled', () => {
    fixture.componentRef.setInput('disabled', true);
    const dropped = vi.fn();
    component.dropped.subscribe(dropped);
    const event = dragEvent({ dataTransfer: { files: [new File(['x'], 'a.csv')] } });

    component['onDragOver'](event);
    component['onDrop'](event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(component['isDragging']()).toBe(false);
    expect(dropped).not.toHaveBeenCalled();
  });

  it('shows the hint and passes accept to the picker', async () => {
    fixture.componentRef.setInput('hint', 'Up to 5 MB');
    fixture.componentRef.setInput('accept', '.csv');
    const el = await render();

    expect(el.textContent).toContain('Up to 5 MB');
    expect(el.querySelector('input[type="file"]')?.getAttribute('accept')).toBe('.csv');
  });
});
