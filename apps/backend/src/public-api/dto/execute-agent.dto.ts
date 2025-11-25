/**
 * DTOs for Public API
 */

import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for executing an agent via public API
 */
export class ExecuteAgentDto {
  @IsObject()
  @IsNotEmpty()
  input: Record<string, any>; // Agent input data (e.g., CSV data, campaign prompt)

  @IsString()
  @IsOptional()
  @MaxLength(200)
  description?: string; // Optional description for this execution
}

/**
 * DTO for approving execution content
 */
export class ApproveExecutionDto {
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  comment?: string; // Optional approval comment
}

/**
 * DTO for rejecting execution content
 */
export class RejectExecutionDto {
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  comment?: string; // Optional rejection comment
}

/**
 * DTO for rejecting and regenerating a single message
 */
export class RejectMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  rejectReason: string; // Reason for rejection - used to improve regeneration
}

/**
 * DTO for updating a single message
 */
export class UpdateMessageDto {
  @IsString()
  @IsNotEmpty()
  updatedMessage: string; // The edited message text

  @IsBoolean()
  @IsOptional()
  recheckCompliance?: boolean; // Whether to rerun compliance check on edited message
}
