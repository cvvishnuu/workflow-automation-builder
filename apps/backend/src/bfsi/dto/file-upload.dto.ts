/**
 * DTOs for File Upload API
 */

import { IsString, IsOptional, IsBoolean, IsArray, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FileUploadResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  filename: string;

  @ApiProperty()
  fileHash: string;

  @ApiProperty()
  mimeType: string;

  @ApiProperty()
  fileSize: number;

  @ApiProperty()
  rowCount: number;

  @ApiProperty()
  columnCount: number;

  @ApiProperty()
  columns: string[];

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty()
  createdAt: Date;
}

export class AnonymizeFileDto {
  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  detectEmail?: boolean;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  detectPhone?: boolean;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  detectPAN?: boolean;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  detectAadhaar?: boolean;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  detectName?: boolean;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  customFields?: string[];

  @ApiProperty({ required: false, default: 100 })
  @IsOptional()
  @IsNumber()
  batchSize?: number;
}
