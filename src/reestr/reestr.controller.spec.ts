import { Test, TestingModule } from '@nestjs/testing';
import { ReestrController } from './reestr.controller';

describe('ReestrController', () => {
  let controller: ReestrController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReestrController],
    }).compile();

    controller = module.get<ReestrController>(ReestrController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
