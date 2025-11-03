/**
 * Public API Controller
 * Exposes workflows as public agents accessible via API keys
 *
 * Base Path: /api/public
 *
 * Authentication: Bearer token (API key) in Authorization header
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiKeyGuard } from './guards/api-key.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { PublicApiService } from './public-api.service';
import {
  ExecuteAgentDto,
  ApproveExecutionDto,
  RejectExecutionDto,
} from './dto/execute-agent.dto';

@Controller('public')
@UseGuards(ApiKeyGuard, RateLimitGuard)
export class PublicApiController {
  constructor(private readonly publicApiService: PublicApiService) {}

  /**
   * Execute an agent (workflow)
   * POST /api/public/agents/:workflowId/execute
   *
   * @param workflowId - ID of the workflow to execute
   * @param dto - Execution input data
   */
  @Post('agents/:workflowId/execute')
  @HttpCode(HttpStatus.ACCEPTED)
  async executeAgent(
    @Param('workflowId') workflowId: string,
    @Body() dto: ExecuteAgentDto,
    @Req() req: any,
  ) {
    const apiKeyId = req.apiKey.id;
    const userId = req.userId;

    return this.publicApiService.executeAgent(
      workflowId,
      userId,
      apiKeyId,
      dto,
    );
  }

  /**
   * Get execution status
   * GET /api/public/executions/:id/status
   *
   * @param id - Execution ID
   */
  @Get('executions/:id/status')
  async getExecutionStatus(@Param('id') id: string, @Req() req: any) {
    const workflowId = req.workflowId;
    return this.publicApiService.getExecutionStatus(id, workflowId);
  }

  /**
   * Get execution results
   * GET /api/public/executions/:id/results
   *
   * @param id - Execution ID
   */
  @Get('executions/:id/results')
  async getExecutionResults(@Param('id') id: string, @Req() req: any) {
    const workflowId = req.workflowId;
    return this.publicApiService.getExecutionResults(id, workflowId);
  }

  /**
   * Get pending approval data
   * GET /api/public/executions/:id/pending-approval
   *
   * @param id - Execution ID
   */
  @Get('executions/:id/pending-approval')
  async getPendingApproval(@Param('id') id: string, @Req() req: any) {
    const workflowId = req.workflowId;
    return this.publicApiService.getPendingApproval(id, workflowId);
  }

  /**
   * Approve execution content
   * POST /api/public/executions/:id/approve
   *
   * @param id - Execution ID
   * @param dto - Approval data with optional comment
   */
  @Post('executions/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approveExecution(
    @Param('id') id: string,
    @Body() dto: ApproveExecutionDto,
    @Req() req: any,
  ) {
    const workflowId = req.workflowId;
    const userId = req.userId;
    return this.publicApiService.approveExecution(
      id,
      workflowId,
      userId,
      dto.comment,
    );
  }

  /**
   * Reject execution content
   * POST /api/public/executions/:id/reject
   *
   * @param id - Execution ID
   * @param dto - Rejection data with optional comment
   */
  @Post('executions/:id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectExecution(
    @Param('id') id: string,
    @Body() dto: RejectExecutionDto,
    @Req() req: any,
  ) {
    const workflowId = req.workflowId;
    const userId = req.userId;
    return this.publicApiService.rejectExecution(
      id,
      workflowId,
      userId,
      dto.comment,
    );
  }
}
