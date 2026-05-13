import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DadosVitaisSectionComponent } from './dados-vitais-section.component';

describe('DadosVitaisSectionComponent', () => {
  let component: DadosVitaisSectionComponent;
  let fixture: ComponentFixture<DadosVitaisSectionComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [DadosVitaisSectionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DadosVitaisSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
