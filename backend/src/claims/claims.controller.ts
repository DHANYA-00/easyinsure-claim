import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { ClaimsService } from './claims.service';
import { ClaimStatus } from './schemas/claim.schema';

@Controller('claims')
export class ClaimsController {
  constructor(
    private readonly claimsService: ClaimsService,
  ) {}

  @Post()
  async create(
    @Body()
    body: {
      patient: string;
      name: string;
      email: string;
      claimAmount: number;
      description: string;
      document?: string;
    },
  ) {
    return this.claimsService.create(body);
  }

  @Get('my')
  async findMyClaims(
    @Query('patientId') patientId: string,
  ) {
    return this.claimsService.findByPatient(patientId);
  }

  @Get()
  async findAll(
    @Query('status') status?: ClaimStatus,
    @Query('minAmount') minAmount?: string,
    @Query('maxAmount') maxAmount?: string,
  ) {
    return this.claimsService.findAll({
      status,
      minAmount:
        minAmount !== undefined
          ? Number(minAmount)
          : undefined,
      maxAmount:
        maxAmount !== undefined
          ? Number(maxAmount)
          : undefined,
    });
  }

  @Patch(':id/review')
  async review(
    @Param('id') id: string,
    @Body()
    body: {
      status: ClaimStatus;
      approvedAmount?: number;
      insurerComments?: string;
    },
  ) {
    return this.claimsService.review(
      id,
      body.status,
      body.approvedAmount,
      body.insurerComments,
    );
  }
}
