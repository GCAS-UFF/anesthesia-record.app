import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { MonitorizacaoGraficoComponent } from './monitorizacao-grafico.component';

describe('MonitorizacaoGraficoComponent', () => {
  let component: MonitorizacaoGraficoComponent;
  let fixture: ComponentFixture<MonitorizacaoGraficoComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [MonitorizacaoGraficoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MonitorizacaoGraficoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
