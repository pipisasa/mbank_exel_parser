import { Test, TestingModule } from '@nestjs/testing';
import { ReestrService } from './reestr.service';

describe('ReestrService', () => {
  let service: ReestrService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReestrService],
    }).compile();

    service = module.get<ReestrService>(ReestrService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
