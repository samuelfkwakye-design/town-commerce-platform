import { Test, TestingModule } from '@nestjs/testing';
import { TownProductsService } from './town-products.service';

describe('TownProductsService', () => {
  let service: TownProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TownProductsService],
    }).compile();

    service = module.get<TownProductsService>(TownProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
