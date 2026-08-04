import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Claim, ClaimDocument, ClaimStatus } from './schemas/claim.schema';

@Injectable()
export class ClaimsService {
  constructor(
    @InjectModel(Claim.name)
    private readonly claimModel: Model<ClaimDocument>,
  ) {}

  // =========================================================
  // CREATE CLAIM
  // =========================================================

  async create(data: {
    patient: string;
    name: string;
    email: string;
    claimAmount: number;
    description?: string;
    document?: string;
    documents?: Array<{
      filename: string;
      originalName: string;
      mimeType: string;
      size: number;
    }>;
    documentName?: string;
    documentOriginalName?: string;
    documentMimeType?: string;
    documentSize?: number;
  }) {
    if (!Types.ObjectId.isValid(data.patient)) {
      throw new BadRequestException('Invalid patient ID');
    }

    if (!data.name?.trim()) {
      throw new BadRequestException('Patient name is required');
    }

    if (!data.email?.trim()) {
      throw new BadRequestException('Email is required');
    }

    if (
      data.claimAmount === undefined ||
      data.claimAmount === null ||
      Number.isNaN(Number(data.claimAmount))
    ) {
      throw new BadRequestException('Claim amount must be a valid number');
    }

    if (Number(data.claimAmount) <= 0) {
      throw new BadRequestException('Claim amount must be greater than zero');
    }

    const claim = await this.claimModel.create({
      patient: new Types.ObjectId(data.patient),

      name: data.name.trim(),

      email: data.email.trim().toLowerCase(),

      claimAmount: Number(data.claimAmount),

      description: data.description?.trim(),

      // Internal generated filename/path.
      document: data.document,

      documents: data.documents?.map((document) => ({
        filename: document.filename,
        originalName: document.originalName,
        mimeType: document.mimeType,
        size: document.size,
      })),

      // User-friendly name shown in the UI.
      documentName: data.documentName?.trim() || undefined,

      // Original uploaded filename.
      documentOriginalName: data.documentOriginalName,

      documentMimeType: data.documentMimeType,

      documentSize: data.documentSize,

      status: ClaimStatus.PENDING,

      submissionDate: new Date(),
    });

    return claim;
  }

  // =========================================================
  // PATIENT: GET MY CLAIMS
  // =========================================================

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

  // =========================================================
  // INSURER: GET ALL CLAIMS
  // =========================================================

  async findAll(filters?: {
    status?: ClaimStatus;
    minAmount?: number;
    maxAmount?: number;
    fromDate?: string;
    toDate?: string;
  }) {
    const query: Record<string, unknown> = {};

    // -------------------------------------------------------
    // STATUS FILTER
    // -------------------------------------------------------

    if (filters?.status) {
      query.status = filters.status;
    }

    // -------------------------------------------------------
    // AMOUNT FILTER
    // -------------------------------------------------------

    if (filters?.minAmount !== undefined || filters?.maxAmount !== undefined) {
      const amountQuery: Record<string, number> = {};

      if (filters.minAmount !== undefined) {
        if (Number.isNaN(filters.minAmount)) {
          throw new BadRequestException('minAmount must be a valid number');
        }

        if (filters.minAmount < 0) {
          throw new BadRequestException('minAmount cannot be negative');
        }

        amountQuery.$gte = filters.minAmount;
      }

      if (filters.maxAmount !== undefined) {
        if (Number.isNaN(filters.maxAmount)) {
          throw new BadRequestException('maxAmount must be a valid number');
        }

        if (filters.maxAmount < 0) {
          throw new BadRequestException('maxAmount cannot be negative');
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

    // -------------------------------------------------------
    // DATE FILTER
    // -------------------------------------------------------

    if (filters?.fromDate || filters?.toDate) {
      const dateQuery: Record<string, Date> = {};

      if (filters.fromDate) {
        const startDate = new Date(filters.fromDate);

        if (Number.isNaN(startDate.getTime())) {
          throw new BadRequestException('fromDate must be a valid date');
        }

        startDate.setHours(0, 0, 0, 0);

        dateQuery.$gte = startDate;
      }

      if (filters.toDate) {
        const endDate = new Date(filters.toDate);

        if (Number.isNaN(endDate.getTime())) {
          throw new BadRequestException('toDate must be a valid date');
        }

        endDate.setHours(23, 59, 59, 999);

        dateQuery.$lte = endDate;
      }

      if (filters.fromDate && filters.toDate) {
        const startDate = new Date(filters.fromDate);

        const endDate = new Date(filters.toDate);

        if (startDate > endDate) {
          throw new BadRequestException('fromDate cannot be later than toDate');
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

  // =========================================================
  // GET SINGLE CLAIM
  // =========================================================

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

  // =========================================================
  // DOCUMENT ACCESS CHECK
  // =========================================================

  async getDocumentForUser(
    claimId: string,
    userId: string,
    role: string,
    documentIndex = 0,
  ) {
    const claim = await this.findById(claimId);

    const documents =
      Array.isArray(claim.documents) && claim.documents.length > 0
        ? claim.documents
        : claim.document
          ? [
              {
                filename: claim.document,
                originalName:
                  claim.documentOriginalName ||
                  claim.documentName ||
                  claim.document,
                mimeType: claim.documentMimeType || 'application/octet-stream',
                size: claim.documentSize || 0,
              },
            ]
          : [];

    const document = documents[documentIndex] || documents[0];

    if (!document) {
      throw new NotFoundException('No document attached to this claim');
    }

    const isOwner = claim.patient.toString() === userId;

    const isInsurer = role === 'INSURER';

    if (!isOwner && !isInsurer) {
      throw new ForbiddenException(
        'You do not have permission to access this document',
      );
    }

    return {
      claim,
      document,
    };
  }

  // =========================================================
  // INSURER: REVIEW CLAIM
  // =========================================================

  async review(
    claimId: string,
    status: ClaimStatus,
    approvedAmount?: number,
    insurerComments?: string,
  ) {
    const claim = await this.findById(claimId);

    // -------------------------------------------------------
    // ONLY PENDING CLAIMS CAN BE REVIEWED
    // -------------------------------------------------------

    if (claim.status !== ClaimStatus.PENDING) {
      throw new BadRequestException('Only pending claims can be reviewed');
    }

    // -------------------------------------------------------
    // VALIDATE APPROVED AMOUNT
    // -------------------------------------------------------

    if (approvedAmount !== undefined && approvedAmount < 0) {
      throw new BadRequestException('Approved amount cannot be negative');
    }

    // -------------------------------------------------------
    // APPROVAL REQUIRES AMOUNT
    // -------------------------------------------------------

    if (status === ClaimStatus.APPROVED && approvedAmount === undefined) {
      throw new BadRequestException(
        'Approved amount is required when approving a claim',
      );
    }

    // -------------------------------------------------------
    // APPROVED AMOUNT CANNOT EXCEED CLAIM AMOUNT
    // -------------------------------------------------------

    if (approvedAmount !== undefined && approvedAmount > claim.claimAmount) {
      throw new BadRequestException(
        'Approved amount cannot exceed the claim amount',
      );
    }

    // -------------------------------------------------------
    // REJECTED CLAIM CANNOT HAVE APPROVED AMOUNT
    // -------------------------------------------------------

    if (status === ClaimStatus.REJECTED && approvedAmount !== undefined) {
      throw new BadRequestException(
        'Rejected claims cannot have an approved amount',
      );
    }

    // -------------------------------------------------------
    // UPDATE CLAIM
    // -------------------------------------------------------

    claim.status = status;

    if (status === ClaimStatus.APPROVED) {
      claim.approvedAmount = approvedAmount;
    } else {
      claim.approvedAmount = undefined;
    }

    claim.insurerComments = insurerComments?.trim();

    return claim.save();
  }
}
