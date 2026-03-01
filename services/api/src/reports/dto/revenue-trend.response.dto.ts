export type RevenueTrendPointDto = {
  day: string;     // YYYY-MM-DD (UTC)
  revenue: number; // rounded
};

export class RevenueTrendResponseDto {
  generatedAt!: string;
  townId!: string | null;
  days!: number;
  points!: RevenueTrendPointDto[];
}
