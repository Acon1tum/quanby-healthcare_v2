import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelfCheckComponent } from './self-check.component';

describe('SelfCheckComponent', () => {
  let component: SelfCheckComponent;
  let fixture: ComponentFixture<SelfCheckComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelfCheckComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelfCheckComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
