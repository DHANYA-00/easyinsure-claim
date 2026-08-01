import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import {
  FileInterceptor,
} from '@nestjs/platform-express';

import { Request } from 'express';
import type { Response } from 'express';

import { diskStorage } from 'multer';

import { extname, join } from 'path';

import { randomUUID } from 'crypto';

import { ClaimsService } from './claims.service';

import { CreateClaimDto } from './dto/create-claim.dto';
import { ReviewClaimDto } from './dto/review-claim.dto';

import {
  ClaimStatus,
} from './schemas/claim.schema';

import {
  JwtAuthGuard,
} from '../auth/guards/jwt-auth.guard';

import {
  Roles,
} from '../auth/decorators/roles.decorator';

import {
  RolesGuard,
} from '../auth/guards/roles.guard';

import {
  Body,
} from '@nestjs/common';

interface AuthenticatedRequest
  extends Request {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}

@Controller('claims')
export class ClaimsController {
  constructor(
    private readonly claimsService: ClaimsService,
  ) {}

  // ---------------------------------------------------------
  // PATIENT: CREATE CLAIM + DOCUMENT
  // ---------------------------------------------------------

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PATIENT')
  @UseInterceptors(
    FileInterceptor('document', {
      storage: diskStorage({
        destination: './uploads/claims',

        filename: (
          _request,
          file,
          callback,
        ) => {
          const extension = extname(
            file.originalname,
          ).toLowerCase();

          const filename =
            `${randomUUID()}${extension}`;

          callback(null, filename);
        },
      }),

      limits: {
        fileSize: 5 * 1024 * 1024,
      },

      fileFilter: (
        _request,
        file,
        callback,
      ) => {
        const allowedMimeTypes = [
          'application/pdf',
          'image/jpeg',
          'image/png',
        ];

        if (
          !allowedMimeTypes.includes(
            file.mimetype,
          )
        ) {
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

    @UploadedFile()
    file: Express.Multer.File,

    @Req()
    request: AuthenticatedRequest,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Claim document is required',
      );
    }

    return this.claimsService.create({
      ...createClaimDto,

      patient: request.user.sub,

      document: file.filename,

      documentOriginalName:
        file.originalname,

      documentMimeType:
        file.mimetype,

      documentSize:
        file.size,
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
    return this.claimsService.findByPatient(
      request.user.sub,
    );
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
    const claim =
      await this.claimsService.getDocumentForUser(
        id,
        request.user.sub,
        request.user.role,
      );

    const filePath = join(
      process.cwd(),
      'uploads',
      'claims',
      claim.document!,
    );

    response.setHeader(
      'Content-Type',
      claim.documentMimeType ||
        'application/octet-stream',
    );

    response.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(
        claim.documentOriginalName ||
          claim.document!,
      )}"`,
    );

    return response.sendFile(
      filePath,
      (error) => {
        if (error && !response.headersSent) {
          response
            .status(404)
            .json({
              message:
                'Document file not found',
            });
        }
      },
    );
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

      minAmount:
        minAmount !== undefined
          ? Number(minAmount)
          : undefined,

      maxAmount:
        maxAmount !== undefined
          ? Number(maxAmount)
          : undefined,

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