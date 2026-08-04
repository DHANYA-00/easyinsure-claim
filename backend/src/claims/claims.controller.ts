import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { AnyFilesInterceptor } from '@nestjs/platform-express';

import { Request } from 'express';
import type { Response } from 'express';

import { diskStorage } from 'multer';

import { extname, join } from 'path';

import { randomUUID } from 'crypto';

import { ClaimsService } from './claims.service';

import { CreateClaimDto } from './dto/create-claim.dto';
import { ReviewClaimDto } from './dto/review-claim.dto';

import { ClaimStatus } from './schemas/claim.schema';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { Roles } from '../auth/decorators/roles.decorator';

import { RolesGuard } from '../auth/guards/roles.guard';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}

@Controller('claims')
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  // ---------------------------------------------------------
  // PATIENT: CREATE CLAIM + DOCUMENT
  // ---------------------------------------------------------

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PATIENT')
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: diskStorage({
        destination: './uploads/claims',

        filename: (_request, file, callback) => {
          const extension = extname(file.originalname).toLowerCase();

          const filename = `${randomUUID()}${extension}`;

          callback(null, filename);
        },
      }),

      limits: {
        fileSize: 5 * 1024 * 1024,
        files: 50,
      },

      fileFilter: (_request, file, callback) => {
        const allowedMimeTypes = [
          'application/pdf',
          'image/jpeg',
          'image/png',
        ];

        if (!allowedMimeTypes.includes(file.mimetype)) {
          return callback(
            new BadRequestException(
              'Only PDF, JPEG and PNG files are allowed',
            ),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  async create(
    @Body() createClaimDto: CreateClaimDto,

    @UploadedFiles()
    files: Array<Express.Multer.File>,

    @Req()
    request: AuthenticatedRequest,
  ) {
    const normalizedFiles = files || [];

    if (!normalizedFiles.length) {
      throw new BadRequestException('Claim document is required');
    }

    const documents = normalizedFiles.map((file) => ({
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    }));

    const primaryDocument = documents[0];

    return this.claimsService.create({
      ...createClaimDto,

      patient: request.user.sub,

      document: primaryDocument.filename,

      documents,

      documentOriginalName: primaryDocument.originalName,

      documentMimeType: primaryDocument.mimeType,

      documentSize: primaryDocument.size,
    });
  }

  // ---------------------------------------------------------
  // PATIENT: MY CLAIMS
  // ---------------------------------------------------------

  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PATIENT')
  async findMyClaims(
    @Req()
    request: AuthenticatedRequest,
  ) {
    return this.claimsService.findByPatient(request.user.sub);
  }

  // ---------------------------------------------------------
  // INSURER: GET CLAIM DETAILS
  // ---------------------------------------------------------

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSURER')
  async findOne(@Param('id') id: string) {
    return this.claimsService.findById(id);
  }

  // ---------------------------------------------------------
  // PATIENT / INSURER: DOCUMENT
  // ---------------------------------------------------------

  @Get(':id/document')
  @UseGuards(JwtAuthGuard)
  async getDocument(
    @Param('id') id: string,

    @Req()
    request: AuthenticatedRequest,

    @Res()
    response: Response,
  ) {
    const { document } = await this.claimsService.getDocumentForUser(
      id,
      request.user.sub,
      request.user.role,
    );

    const filePath = join(
      process.cwd(),
      'uploads',
      'claims',
      document.filename,
    );

    response.setHeader(
      'Content-Type',
      document.mimeType || 'application/octet-stream',
    );

    response.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(
        document.originalName || document.filename,
      )}"`,
    );

    return response.sendFile(filePath, (error) => {
      if (error && !response.headersSent) {
        response.status(404).json({
          message: 'Document file not found',
        });
      }
    });
  }

  @Get(':id/documents/:documentIndex')
  @UseGuards(JwtAuthGuard)
  async getDocumentByIndex(
    @Param('id') id: string,
    @Param('documentIndex') documentIndex: string,

    @Req()
    request: AuthenticatedRequest,

    @Res()
    response: Response,
  ) {
    const index = Number(documentIndex);
    const { document } = await this.claimsService.getDocumentForUser(
      id,
      request.user.sub,
      request.user.role,
      index,
    );

    const filePath = join(
      process.cwd(),
      'uploads',
      'claims',
      document.filename,
    );

    response.setHeader(
      'Content-Type',
      document.mimeType || 'application/octet-stream',
    );

    response.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(
        document.originalName || document.filename,
      )}"`,
    );

    return response.sendFile(filePath, (error) => {
      if (error && !response.headersSent) {
        response.status(404).json({
          message: 'Document file not found',
        });
      }
    });
  }

  // ---------------------------------------------------------
  // INSURER: ALL CLAIMS
  // ---------------------------------------------------------

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSURER')
  async findAll(
    @Query('status')
    status?: ClaimStatus,

    @Query('minAmount')
    minAmount?: string,

    @Query('maxAmount')
    maxAmount?: string,

    @Query('fromDate')
    fromDate?: string,

    @Query('toDate')
    toDate?: string,
  ) {
    return this.claimsService.findAll({
      status,

      minAmount: minAmount !== undefined ? Number(minAmount) : undefined,

      maxAmount: maxAmount !== undefined ? Number(maxAmount) : undefined,

      fromDate,

      toDate,
    });
  }

  // ---------------------------------------------------------
  // INSURER: REVIEW CLAIM
  // ---------------------------------------------------------

  @Patch(':id/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSURER')
  async review(
    @Param('id') id: string,

    @Body()
    reviewClaimDto: ReviewClaimDto,
  ) {
    return this.claimsService.review(
      id,
      reviewClaimDto.status,
      reviewClaimDto.approvedAmount,
      reviewClaimDto.insurerComments,
    );
  }
}
