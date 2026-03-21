import { Test, TestingModule } from '@nestjs/testing';
import { TownSettingsController } from './town-settings.controller';

describe('TownSettingsController', () => {
  let controller: TownSettingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TownSettingsController],
    }).compile();

    controller = module.get<TownSettingsController>(TownSettingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
