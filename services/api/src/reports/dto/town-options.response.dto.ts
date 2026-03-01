export class TownOptionDto {
  id!: string;
  name!: string;
  slug!: string;
}

export class TownOptionsResponseDto {
  rows!: TownOptionDto[];
}
