import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { MonitorizacaoSidebarComponent } from './monitorizacao-sidebar.component';

describe('MonitorizacaoSidebarComponent', () => {
  let component: MonitorizacaoSidebarComponent;
  let fixture: ComponentFixture<MonitorizacaoSidebarComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [MonitorizacaoSidebarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MonitorizacaoSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
