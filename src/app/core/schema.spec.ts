import { TestBed } from '@angular/core/testing';
import { Schema } from './schema';

describe('Schema', () => {
  let service: Schema;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Schema);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
