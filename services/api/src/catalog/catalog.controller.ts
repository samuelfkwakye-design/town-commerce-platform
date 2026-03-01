import { Controller, Get, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CatalogQueryDto } from './dto/catalog.query.dto';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  async getCatalog(@Query() q: CatalogQueryDto) {
    return this.catalogService.getCatalog(q);
  }
}
