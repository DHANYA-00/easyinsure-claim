import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ClaimsService } from './claims.service';
import { Claim, ClaimSchema } from './schemas/claim.schema';
import { ClaimsController } from './claims.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Claim.name,
        schema: ClaimSchema,
      },
    ]),
  ],
  providers: [ClaimsService],
  exports: [ClaimsService],
  controllers: [ClaimsController],
})
export class ClaimsModule {}
