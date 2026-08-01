import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Claim,
  ClaimDocument,
  ClaimStatus,
} from './schemas/claim.schema';

@Injectable()
export class ClaimsService {
  constructor(
    @InjectModel(Claim.name)
    private readonly claimModel: Model<ClaimDocument>,
  ) {}

  async create(data: {
    patient: string;
    name: string;
    email: string;
    claimAmount: number;
    description: string;
    document?: string;
  }) {
    return this.claimModel.create({
      ...data,
      patient: new Types.ObjectId(data.patient),
      status: ClaimStatus.PENDING,
      submissionDate: new Date(),
    });
  }

  async findByPatient(patientId: string) {
    return this.claimModel
      .find({
        patient: new Types.ObjectId(patientId),
      })
      .sort({ submissionDate: -1 })
      .exec();
  }

  async findAll(filters?: {
    status?: ClaimStatus;
    minAmount?: number;
    maxAmount?: number;
  }) {
    const query: Record<string, unknown> = {};

    if (filters?.status) {
      query.status = filters.status;
    }

    if (
      filters?.minAmount !== undefined ||
      filters?.maxAmount !== undefined
    ) {
      query.claimAmount = {};

      if (filters.minAmount !== undefined) {
        (query.claimAmount as Record<string, number>).$gte =
          filters.minAmount;
      }

      if (filters.maxAmount !== undefined) {
        (query.claimAmount as Record<string, number>).$lte =
          filters.maxAmount;
      }
    }

    return this.claimModel
      .find(query)
      .sort({ submissionDate: -1 })
      .exec();
  }

  async review(
    claimId: string,
    status: ClaimStatus,
    approvedAmount?: number,
    insurerComments?: string,
  ) {
    const claim = await this.claimModel.findById(claimId);

    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    claim.status = status;
    claim.approvedAmount = approvedAmount;
    claim.insurerComments = insurerComments;

    return claim.save();
  }
}
