import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { MonitorizacaoTabelaComponent } from './monitorizacao-tabela.component';

describe('MonitorizacaoTabelaComponent', () => {
  let component: MonitorizacaoTabelaComponent;
  let fixture: ComponentFixture<MonitorizacaoTabelaComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [MonitorizacaoTabelaComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MonitorizacaoTabelaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
