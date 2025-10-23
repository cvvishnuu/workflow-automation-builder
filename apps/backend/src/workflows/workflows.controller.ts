/**
 * Workflows Controller
 * Handles HTTP requests for workflow management
 *
 * SOLID Principles Applied:
 * - Single Responsibility: Only handles HTTP request/response mapping
 * - Dependency Injection: Service injected through constructor
 * - Open/Closed: Easy to extend with new endpoints
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { User, AuthenticatedUser } from '../auth/user.decorator';

@ApiTags('workflows')
@ApiBearerAuth()
@Controller('workflows')
@UseGuards(ClerkAuthGuard)
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  /**
   * Create a new workflow
   * POST /api/v1/workflows
   */
  @Post()
  @ApiOperation({ summary: 'Create a new workflow' })
  @ApiResponse({ status: 201, description: 'Workflow created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid workflow definition' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @User() user: AuthenticatedUser,
    @Body() createWorkflowDto: CreateWorkflowDto
  ) {
    return this.workflowsService.create(user.userId, createWorkflowDto);
  }

  /**
   * Get all workflows for the authenticated user
   * GET /api/v1/workflows
   */
  @Get()
  @ApiOperation({ summary: 'Get all workflows' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'List of workflows' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @User() user: AuthenticatedUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number
  ) {
    return this.workflowsService.findAll(user.userId, page, limit);
  }

  /**
   * Get a specific workflow by ID
   * GET /api/v1/workflows/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a workflow by ID' })
  @ApiResponse({ status: 200, description: 'Workflow found' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @ApiResponse({ status: 403, description: 'Access forbidden' })
  async findOne(
    @User() user: AuthenticatedUser,
    @Param('id') id: string
  ) {
    return this.workflowsService.findOne(id, user.userId);
  }

  /**
   * Update a workflow
   * PATCH /api/v1/workflows/:id
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a workflow' })
  @ApiResponse({ status: 200, description: 'Workflow updated successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @ApiResponse({ status: 400, description: 'Invalid update data' })
  async update(
    @User() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() updateWorkflowDto: UpdateWorkflowDto
  ) {
    return this.workflowsService.update(id, user.userId, updateWorkflowDto);
  }

  /**
   * Delete a workflow
   * DELETE /api/v1/workflows/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a workflow' })
  @ApiResponse({ status: 204, description: 'Workflow deleted successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async remove(
    @User() user: AuthenticatedUser,
    @Param('id') id: string
  ) {
    await this.workflowsService.remove(id, user.userId);
  }
}
