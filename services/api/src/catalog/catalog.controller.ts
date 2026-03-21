import { Controller, Get, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CatalogQueryDto } from './dto/catalog.query.dto';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}
  @Get('popular')
  getPopular(
    @Query('townSlug') townSlug: string,
    @Query('limit') limit?: string,
  ) {
    return this.catalogService.getPopularProducts(
      townSlug,
      limit ? Number(limit) : 6,
    );
  }
    @Get('also-bought')
  getAlsoBought(
    @Query('townSlug') townSlug: string,
    @Query('townProductId') townProductId: string,
    @Query('limit') limit?: string,
  ) {
    return this.catalogService.getAlsoBoughtProducts(
      townSlug,
      townProductId,
      limit ? Number(limit) : 6,
    );
  }
  @Get()
  async getCatalog(@Query() q: CatalogQueryDto) {
    return this.catalogService.getCatalog(q);
  }
}
