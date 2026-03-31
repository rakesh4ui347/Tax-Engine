import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ReciprocityKey {
  fromState: string;
  toState: string;
}

@Injectable()
export class ReciprocityService implements OnModuleInit {
  private readonly logger = new Logger(ReciprocityService.name);
  private reciprocitySet: Set<string> = new Set();
  private loadedAt: Date | null = null;
  private readonly cacheTTLMs = 60 * 60 * 1000; // 1 hour

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.loadReciprocityData();
  }

  private async loadReciprocityData() {
    try {
      const agreements = await this.prisma.stateReciprocityAgreement.findMany({
        where: {
          effectiveTo: null, // No end date = still active
        },
      });

      this.reciprocitySet.clear();

      const now = new Date();
      for (const agreement of agreements) {
        if (agreement.effectiveTo && agreement.effectiveTo < now) continue;
        if (agreement.effectiveFrom > now) continue;

        // Key format: "RESIDENT_STATE:WORK_STATE"
        // meaning: resident in fromState, working in toState
        this.reciprocitySet.add(`${agreement.fromState}:${agreement.toState}`);
      }

      this.loadedAt = new Date();
      this.logger.log(
        `Loaded ${this.reciprocitySet.size} reciprocity agreements`,
      );
    } catch (error) {
      this.logger.error('Failed to load reciprocity data', error);
    }
  }

  private async ensureFresh() {
    if (
      !this.loadedAt ||
      Date.now() - this.loadedAt.getTime() > this.cacheTTLMs
    ) {
      await this.loadReciprocityData();
    }
  }

  /**
   * Returns true if the employee, resident in `residentState` and working in
   * `workState`, qualifies for reciprocity (i.e., only withhold for resident state).
   *
   * @param residentState - 2-letter state code where employee lives
   * @param workState - 2-letter state code where employee works
   * @param asOf - Date to check reciprocity for (defaults to now)
   */
  async hasReciprocity(
    residentState: string,
    workState: string,
    asOf?: Date,
  ): Promise<boolean> {
    if (residentState === workState) return false;

    await this.ensureFresh();

    // Check if there is a reciprocity agreement allowing resident state taxation
    // fromState = resident state, toState = work state
    return this.reciprocitySet.has(`${residentState}:${workState}`);
  }

  async getAgreementsForState(state: string) {
    await this.ensureFresh();
    const agreements: ReciprocityKey[] = [];
    for (const key of this.reciprocitySet) {
      const [from, to] = key.split(':');
      if (from === state || to === state) {
        agreements.push({ fromState: from, toState: to });
      }
    }
    return agreements;
  }

  async invalidateCache() {
    this.loadedAt = null;
    await this.loadReciprocityData();
  }
}
