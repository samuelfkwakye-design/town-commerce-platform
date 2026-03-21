import { Test, TestingModule } from '@nestjs/testing';
import { TownSettingsService } from './town-settings.service';

describe('TownSettingsService', () => {
  let service: TownSettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TownSettingsService],
    }).compile();

    service = module.get<TownSettingsService>(TownSettingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
