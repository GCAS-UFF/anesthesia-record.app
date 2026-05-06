import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientListPage } from './patient-list.page';

describe('PatientListPage', () => {
  let component: PatientListPage;
  let fixture: ComponentFixture<PatientListPage>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(PatientListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
