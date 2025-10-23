/**
 * Workflows Service
 * Implements business logic for workflow management
 *
 * SOLID Principles Applied:
 * - Single Responsibility: Only handles workflow CRUD operations
 * - Dependency Injection: Receives PrismaService through constructor
 * - Interface Segregation: Clean, focused public API
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { Workflow } from '@workflow/shared-types';

@Injectable()
export class WorkflowsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new workflow
   * @param userId - ID of the user creating the workflow
   * @param createWorkflowDto - Workflow data
   * @returns Created workflow
   */
  async create(userId: string, createWorkflowDto: CreateWorkflowDto): Promise<Workflow> {
    // Validate workflow definition structure
    this.validateWorkflowDefinition(createWorkflowDto.definition);

    const workflow = await this.prisma.workflow.create({
      data: {
        name: createWorkflowDto.name,
        description: createWorkflowDto.description,
        definition: createWorkflowDto.definition as any,
        userId,
      },
    });

    return this.mapToWorkflow(workflow);
  }

  /**
   * Get all workflows for a user with pagination
   * @param userId - ID of the user
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10)
   * @returns Paginated list of workflows
   */
  async findAll(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [workflows, total] = await Promise.all([
      this.prisma.workflow.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.workflow.count({ where: { userId } }),
    ]);

    return {
      data: workflows.map((w) => this.mapToWorkflow(w)),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single workflow by ID
   * @param id - Workflow ID
   * @param userId - ID of the user
   * @returns Workflow
   * @throws NotFoundException if workflow doesn't exist
   * @throws ForbiddenException if user doesn't own the workflow
   */
  async findOne(id: string, userId: string): Promise<Workflow> {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }

    if (workflow.userId !== userId) {
      throw new ForbiddenException('You do not have access to this workflow');
    }

    return this.mapToWorkflow(workflow);
  }

  /**
   * Update a workflow
   * @param id - Workflow ID
   * @param userId - ID of the user
   * @param updateWorkflowDto - Updated workflow data
   * @returns Updated workflow
   */
  async update(
    id: string,
    userId: string,
    updateWorkflowDto: UpdateWorkflowDto
  ): Promise<Workflow> {
    // Verify ownership
    await this.findOne(id, userId);

    // Validate definition if provided
    if (updateWorkflowDto.definition) {
      this.validateWorkflowDefinition(updateWorkflowDto.definition);
    }

    const workflow = await this.prisma.workflow.update({
      where: { id },
      data: {
        ...updateWorkflowDto,
        definition: updateWorkflowDto.definition as any,
      },
    });

    return this.mapToWorkflow(workflow);
  }

  /**
   * Delete a workflow
   * @param id - Workflow ID
   * @param userId - ID of the user
   */
  async remove(id: string, userId: string): Promise<void> {
    // Verify ownership
    await this.findOne(id, userId);

    await this.prisma.workflow.delete({
      where: { id },
    });
  }

  /**
   * Validate workflow definition structure
   * Ensures it has required fields and valid structure
   * @private
   */
  private validateWorkflowDefinition(definition: any): void {
    if (!definition.nodes || !Array.isArray(definition.nodes)) {
      throw new BadRequestException('Workflow definition must include nodes array');
    }

    if (!definition.edges || !Array.isArray(definition.edges)) {
      throw new BadRequestException('Workflow definition must include edges array');
    }

    if (definition.nodes.length === 0) {
      throw new BadRequestException('Workflow must have at least one node');
    }

    // Validate that all nodes have required fields
    for (const node of definition.nodes) {
      if (!node.nodeId || !node.type) {
        throw new BadRequestException('Each node must have nodeId and type');
      }
    }

    // Validate that edges reference existing nodes
    const nodeIds = new Set(definition.nodes.map((n: any) => n.nodeId));
    for (const edge of definition.edges) {
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
        throw new BadRequestException('Edge references non-existent node');
      }
    }
  }

  /**
   * Map Prisma workflow to domain model
   * Converts dates and JSON fields to proper types
   * @private
   */
  private mapToWorkflow(workflow: any): Workflow {
    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      definition: workflow.definition as any,
      isActive: workflow.isActive,
      userId: workflow.userId,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
    };
  }
}
