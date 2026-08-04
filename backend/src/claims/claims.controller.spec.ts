import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ClaimsController } from './claims.controller';
import { ClaimsService } from './claims.service';

describe('ClaimsController', () => {
  let controller: ClaimsController;
  let claimsService: { create: jest.Mock };

  beforeEach(async () => {
    claimsService = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClaimsController],
      providers: [
        { provide: ClaimsService, useValue: claimsService },
        {
          provide: JwtService,
          useValue: { verify: jest.fn(), sign: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<ClaimsController>(ClaimsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should pass uploaded documents to the claims service', async () => {
    claimsService.create.mockResolvedValue({ _id: 'claim-1' });

    const request = {
      user: {
        sub: 'patient-id',
        email: 'patient@example.com',
        role: 'PATIENT',
      },
    };

    const files = [
      {
        filename: 'claim-1.pdf',
        originalname: 'claim-1.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      },
      {
        filename: 'claim-2.png',
        originalname: 'claim-2.png',
        mimetype: 'image/png',
        size: 2048,
      },
    ];

    await controller.create(
      {
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        claimAmount: 1200,
        description: 'Medical treatment',
        documentName: 'Treatment summary',
      },
      files as any,
      request as any,
    );

    expect(claimsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        patient: 'patient-id',
        document: 'claim-1.pdf',
        documents: expect.arrayContaining([
          expect.objectContaining({ filename: 'claim-1.pdf' }),
          expect.objectContaining({ filename: 'claim-2.png' }),
        ]),
      }),
    );
  });
});
