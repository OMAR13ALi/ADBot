import { TestBed } from '@angular/core/testing';

import { AdBot } from './ad-bot';

describe('AdBot', () => {
  let service: AdBot;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdBot);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
