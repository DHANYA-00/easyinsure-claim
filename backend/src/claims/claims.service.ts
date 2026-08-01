import {
  BadRequestException,
  ForbiddenException,
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

  // ---------------------------------------------------------
  // CREATE CLAIM
  // ---------------------------------------------------------

  async create(data: {
    patient: string;
    name: string;
    email: string;
    claimAmount: number;
    description: string;
    document?: string;
    documentOriginalName?: string;
    documentMimeType?: string;
    documentSize?: number;
  }) {
    if (!Types.ObjectId.isValid(data.patient)) {
      throw new BadRequestException('Invalid patient ID');
    }

    return this.claimModel.create({
      patient: new Types.ObjectId(data.patient),

      name: data.name,
      email: data.email,
      claimAmount: data.claimAmount,
      description: data.description,

      document: data.document,
      documentOriginalName: data.documentOriginalName,
      documentMimeType: data.documentMimeType,
      documentSize: data.documentSize,

      status: ClaimStatus.PENDING,
      submissionDate: new Date(),
    });
  }

  // ---------------------------------------------------------
  // PATIENT: GET MY CLAIMS
  // ---------------------------------------------------------

  async findByPatient(patientId: string) {
    if (!Types.ObjectId.isValid(patientId)) {
      throw new BadRequestException('Invalid patient ID');
    }

    return this.claimModel
      .find({
        patient: new Types.ObjectId(patientId),
      })
      .sort({
        submissionDate: -1,
      })
      .exec();
  }

  // ---------------------------------------------------------
  // INSURER: GET ALL CLAIMS
  // ---------------------------------------------------------

  async findAll(filters?: {
    status?: ClaimStatus;
    minAmount?: number;
    maxAmount?: number;
    fromDate?: string;
    toDate?: string;
  }) {
    const query: Record<string, unknown> = {};

    // Status filter
    if (filters?.status) {
      query.status = filters.status;
    }

    // Amount filter
    if (
      filters?.minAmount !== undefined ||
      filters?.maxAmount !== undefined
    ) {
      const amountQuery: Record<string, number> = {};

      if (filters.minAmount !== undefined) {
        if (Number.isNaN(filters.minAmount)) {
          throw new BadRequestException(
            'minAmount must be a valid number',
          );
        }

        if (filters.minAmount < 0) {
          throw new BadRequestException(
            'minAmount cannot be negative',
          );
        }

        amountQuery.$gte = filters.minAmount;
      }

      if (filters.maxAmount !== undefined) {
        if (Number.isNaN(filters.maxAmount)) {
          throw new BadRequestException(
            'maxAmount must be a valid number',
          );
        }

        if (filters.maxAmount < 0) {
          throw new BadRequestException(
            'maxAmount cannot be negative',
          );
        }

        amountQuery.$lte = filters.maxAmount;
      }

      if (
        filters.minAmount !== undefined &&
        filters.maxAmount !== undefined &&
        filters.minAmount > filters.maxAmount
      ) {
        throw new BadRequestException(
          'minAmount cannot be greater than maxAmount',
        );
      }

      query.claimAmount = amountQuery;
    }

    // Date filter
    if (filters?.fromDate || filters?.toDate) {
      const dateQuery: Record<string, Date> = {};

      if (filters.fromDate) {
        const startDate = new Date(filters.fromDate);

        if (Number.isNaN(startDate.getTime())) {
          throw new BadRequestException(
            'fromDate must be a valid date',
          );
        }

        startDate.setHours(0, 0, 0, 0);

        dateQuery.$gte = startDate;
      }

      if (filters.toDate) {
        const endDate = new Date(filters.toDate);

        if (Number.isNaN(endDate.getTime())) {
          throw new BadRequestException(
            'toDate must be a valid date',
          );
        }

        endDate.setHours(23, 59, 59, 999);

        dateQuery.$lte = endDate;
      }

      if (filters.fromDate && filters.toDate) {
        const startDate = new Date(filters.fromDate);
        const endDate = new Date(filters.toDate);

        if (startDate > endDate) {
          throw new BadRequestException(
            'fromDate cannot be later than toDate',
          );
        }
      }

      query.submissionDate = dateQuery;
    }

    return this.claimModel
      .find(query)
      .sort({
        submissionDate: -1,
      })
      .exec();
  }

  // ---------------------------------------------------------
  // GET SINGLE CLAIM
  // ---------------------------------------------------------

  async findById(claimId: string) {
    if (!Types.ObjectId.isValid(claimId)) {
      throw new BadRequestException('Invalid claim ID');
    }

    const claim = await this.claimModel.findById(claimId);

    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    return claim;
  }

  // ---------------------------------------------------------
  // DOCUMENT ACCESS CHECK
  // ---------------------------------------------------------

  async getDocumentForUser(
    claimId: string,
    userId: string,
    role: string,
  ) {
    const claim = await this.findById(claimId);

    if (!claim.document) {
      throw new NotFoundException(
        'No document attached to this claim',
      );
    }

    const isOwner =
      claim.patient.toString() === userId;

    const isInsurer = role === 'INSURER';

    if (!isOwner && !isInsurer) {
      throw new ForbiddenException(
        'You do not have permission to access this document',
      );
    }

    return claim;
  }

  // ---------------------------------------------------------
  // INSURER: REVIEW CLAIM
  // ---------------------------------------------------------

  async review(
    claimId: string,
    status: ClaimStatus,
    approvedAmount?: number,
    insurerComments?: string,
  ) {
    const claim = await this.findById(claimId);

    // Prevent reviewing an already finalized claim
    if (
      claim.status !== ClaimStatus.PENDING
    ) {
      throw new BadRequestException(
        'Only pending claims can be reviewed',
      );
    }

    // Validate approved amount
    if (
      approvedAmount !== undefined &&
      approvedAmount < 0
    ) {
      throw new BadRequestException(
        'Approved amount cannot be negative',
      );
    }

    // Approval requires amount
    if (
      status === ClaimStatus.APPROVED &&
      approvedAmount === undefined
    ) {
      throw new BadRequestException(
        'Approved amount is required when approving a claim',
      );
    }

    // Approved amount cannot exceed requested amount
    if (
      approvedAmount !== undefined &&
      approvedAmount > claim.claimAmount
    ) {
      throw new BadRequestException(
        'Approved amount cannot exceed the claim amount',
      );
    }

    // Rejected claim cannot have approved amount
    if (
      status === ClaimStatus.REJECTED &&
      approvedAmount !== undefined
    ) {
      throw new BadRequestException(
        'Rejected claims cannot have an approved amount',
      );
    }

    claim.status = status;

    if (status === ClaimStatus.APPROVED) {
      claim.approvedAmount = approvedAmount;
    } else {
      claim.approvedAmount = undefined;
    }

    claim.insurerComments =
      insurerComments?.trim();

    return claim.save();
  }
}