import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { TecnicaAnestesicaSectionComponent } from './tecnica-anestesica-section.component';

describe('TecnicaAnestesicaSectionComponent', () => {
  let component: TecnicaAnestesicaSectionComponent;
  let fixture: ComponentFixture<TecnicaAnestesicaSectionComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [TecnicaAnestesicaSectionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TecnicaAnestesicaSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
