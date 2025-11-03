/**
 * DTOs for Public API
 */

import { IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

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
