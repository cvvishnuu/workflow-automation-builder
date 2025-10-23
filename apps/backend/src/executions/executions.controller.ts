/**
 * Executions Controller
 * Handles HTTP requests for workflow execution
 */

import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WorkflowEngineService } from './workflow-engine.service';
import { ExecuteWorkflowDto } from './dto/execute-workflow.dto';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { User, AuthenticatedUser } from '../auth/user.decorator';

@ApiTags('executions')
@ApiBearerAuth()
@Controller('executions')
export class ExecutionsController {
  constructor(private readonly workflowEngine: WorkflowEngineService) {}

  /**
   * Execute a workflow (TEST ENDPOINT - NO AUTH)
   * POST /api/v1/executions/test
   */
  @Post('test')
  @ApiOperation({ summary: 'Execute a workflow without authentication (testing only)' })
  @ApiResponse({ status: 201, description: 'Execution started successfully' })
  async executeTest(@Body() executeWorkflowDto: ExecuteWorkflowDto) {
    // Hardcode user ID for testing
    const testUserId = 'bdade79d-6df8-4313-8b40-f3de9fc1cc2e';
    return this.workflowEngine.executeWorkflow(
      executeWorkflowDto.workflowId,
      testUserId,
      executeWorkflowDto.input
    );
  }

  /**
   * Execute a workflow
   * POST /api/v1/executions
   */
  @Post()
  @UseGuards(ClerkAuthGuard)
  @ApiOperation({ summary: 'Execute a workflow' })
  @ApiResponse({ status: 201, description: 'Execution started successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async execute(
    @User() user: AuthenticatedUser,
    @Body() executeWorkflowDto: ExecuteWorkflowDto
  ) {
    return this.workflowEngine.executeWorkflow(
      executeWorkflowDto.workflowId,
      user.userId,
      executeWorkflowDto.input
    );
  }

  /**
   * Get executions for a workflow
   * GET /api/v1/executions/workflow/:workflowId
   */
  @Get('workflow/:workflowId')
  @UseGuards(ClerkAuthGuard)
  @ApiOperation({ summary: 'Get executions for a workflow' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of executions' })
  async getExecutions(
    @User() user: AuthenticatedUser,
    @Param('workflowId') workflowId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number
  ) {
    return this.workflowEngine.getExecutions(workflowId, user.userId, page, limit);
  }

  /**
   * Get pending approval data for an execution
   * GET /api/v1/executions/:id/pending-approval
   */
  @Get(':id/pending-approval')
  @UseGuards(ClerkAuthGuard)
  @ApiOperation({ summary: 'Get content awaiting approval' })
  @ApiResponse({ status: 200, description: 'Approval data retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  @ApiResponse({ status: 400, description: 'Execution is not pending approval' })
  async getPendingApproval(
    @User() user: AuthenticatedUser,
    @Param('id') id: string
  ) {
    const execution = await this.workflowEngine.getExecution(id, user.userId);

    if (execution.status !== 'pending_approval') {
      return {
        statusCode: 400,
        message: 'Execution is not pending approval',
        status: execution.status,
      };
    }

    // Return approval data from execution output
    // The output contains a nested approvalData field with the structured format
    const outputData = execution.output as any;

    return {
      executionId: execution.id,
      workflowId: execution.workflowId,
      status: execution.status,
      approvalData: outputData?.approvalData || outputData,
      startedAt: execution.startedAt,
    };
  }

  /**
   * Approve content and resume workflow
   * POST /api/v1/executions/:id/approve
   */
  @Post(':id/approve')
  @UseGuards(ClerkAuthGuard)
  @ApiOperation({ summary: 'Approve content and resume workflow execution' })
  @ApiResponse({ status: 200, description: 'Content approved, workflow resumed' })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  @ApiResponse({ status: 400, description: 'Execution is not pending approval' })
  async approveExecution(
    @User() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { comment?: string }
  ) {
    await this.workflowEngine.resumeExecution(id, user.userId, true, body.comment);
    return {
      message: 'Content approved successfully, workflow will resume',
      executionId: id,
    };
  }

  /**
   * Reject content and stop workflow
   * POST /api/v1/executions/:id/reject
   */
  @Post(':id/reject')
  @UseGuards(ClerkAuthGuard)
  @ApiOperation({ summary: 'Reject content and stop workflow execution' })
  @ApiResponse({ status: 200, description: 'Content rejected, workflow stopped' })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  @ApiResponse({ status: 400, description: 'Execution is not pending approval' })
  async rejectExecution(
    @User() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { comment?: string }
  ) {
    await this.workflowEngine.resumeExecution(id, user.userId, false, body.comment);
    return {
      message: 'Content rejected, workflow stopped',
      executionId: id,
    };
  }

  /**
   * Get execution by ID
   * GET /api/v1/executions/:id
   */
  @Get(':id')
  @UseGuards(ClerkAuthGuard)
  @ApiOperation({ summary: 'Get execution details' })
  @ApiResponse({ status: 200, description: 'Execution found' })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  async getExecution(
    @User() user: AuthenticatedUser,
    @Param('id') id: string
  ) {
    return this.workflowEngine.getExecution(id, user.userId);
  }

  /**
   * Cancel a running execution
   * DELETE /api/v1/executions/:id
   */
  @Delete(':id')
  @UseGuards(ClerkAuthGuard)
  @ApiOperation({ summary: 'Cancel a running execution' })
  @ApiResponse({ status: 200, description: 'Execution cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  @ApiResponse({ status: 400, description: 'Execution is not running' })
  async cancelExecution(
    @User() user: AuthenticatedUser,
    @Param('id') id: string
  ) {
    await this.workflowEngine.cancelExecution(id, user.userId);
    return { message: 'Execution cancelled successfully' };
  }
}
