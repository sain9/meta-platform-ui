import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SchemaManager } from './schema-manager';

describe('SchemaManager', () => {
  let component: SchemaManager;
  let fixture: ComponentFixture<SchemaManager>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SchemaManager],
    }).compileComponents();

    fixture = TestBed.createComponent(SchemaManager);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
