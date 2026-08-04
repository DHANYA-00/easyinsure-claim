import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { HydratedDocument, Types } from 'mongoose';

export type ClaimDocument = HydratedDocument<Claim>;

export enum ClaimStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Schema()
export class Claim {
  @Prop({
    required: true,
    type: Types.ObjectId,
    ref: 'User',
  })
  patient!: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
  })
  name!: string;

  @Prop({
    required: true,
    lowercase: true,
    trim: true,
  })
  email!: string;

  @Prop({
    required: true,
    min: 0,
  })
  claimAmount!: number;

  @Prop({
    required: false,
    trim: true,
  })
  description?: string;

  // Internal generated filename.
  @Prop()
  document?: string;

  @Prop({
    type: [
      {
        filename: { type: String, required: true },
        originalName: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
      },
    ],
  })
  documents?: Array<{
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
  }>;

  // Name shown to the insurer/patient.
  @Prop({
    trim: true,
  })
  documentName?: string;

  @Prop()
  documentOriginalName?: string;

  @Prop()
  documentMimeType?: string;

  @Prop()
  documentSize?: number;

  @Prop({
    required: true,
    enum: ClaimStatus,
    default: ClaimStatus.PENDING,
  })
  status!: ClaimStatus;

  @Prop({
    default: Date.now,
  })
  submissionDate!: Date;

  @Prop({
    min: 0,
  })
  approvedAmount?: number;

  @Prop({
    trim: true,
  })
  insurerComments?: string;
}

export const ClaimSchema = SchemaFactory.createForClass(Claim);
