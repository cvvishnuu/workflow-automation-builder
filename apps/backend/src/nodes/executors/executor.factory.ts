/**
 * Executor Factory
 * Creates appropriate executor instances based on node type
 *
 * SOLID Principles Applied:
 * - Open/Closed: New node types can be added by registering new executors
 * - Strategy Pattern: Dynamically selects executor based on node type
 * - Dependency Injection: Executors injected through constructor
 */

import { Injectable } from '@nestjs/common';
import { NodeType } from '@workflow/shared-types';
import { INodeExecutor } from './node-executor.interface';
import { TriggerNodeExecutor } from './trigger-node.executor';
import { HttpRequestNodeExecutor } from './http-request-node.executor';
import { ConditionalNodeExecutor } from './conditional-node.executor';
import { DataTransformNodeExecutor } from './data-transform-node.executor';
import { DelayNodeExecutor } from './delay-node.executor';
import { EmailNodeExecutor } from './email-node.executor';
import { GoogleCalendarNodeExecutor } from './google-calendar-node.executor';
import { WhatsAppNodeExecutor } from './whatsapp-node.executor';
import { ManualApprovalNodeExecutor } from './manual-approval-node.executor';
import { CSVUploadNodeExecutor } from '../../bfsi/executors/csv-upload.executor';
import { AIContentGeneratorNodeExecutor } from '../../bfsi/executors/ai-content-generator.executor';
import { ComplianceCheckerNodeExecutor } from '../../bfsi/executors/compliance-checker.executor';
import { ComplianceReportNodeExecutor } from '../../bfsi/executors/compliance-report.executor';

@Injectable()
export class ExecutorFactory {
  private executors: Map<NodeType, INodeExecutor>;

  constructor(
    private readonly triggerExecutor: TriggerNodeExecutor,
    private readonly httpRequestExecutor: HttpRequestNodeExecutor,
    private readonly conditionalExecutor: ConditionalNodeExecutor,
    private readonly dataTransformExecutor: DataTransformNodeExecutor,
    private readonly delayExecutor: DelayNodeExecutor,
    private readonly emailExecutor: EmailNodeExecutor,
    private readonly googleCalendarExecutor: GoogleCalendarNodeExecutor,
    private readonly whatsappExecutor: WhatsAppNodeExecutor,
    private readonly manualApprovalExecutor: ManualApprovalNodeExecutor,
    private readonly csvUploadExecutor: CSVUploadNodeExecutor,
    private readonly aiContentGeneratorExecutor: AIContentGeneratorNodeExecutor,
    private readonly complianceCheckerExecutor: ComplianceCheckerNodeExecutor,
    private readonly complianceReportExecutor: ComplianceReportNodeExecutor
  ) {
    // Register all available executors
    this.executors = new Map<NodeType, INodeExecutor>([
      [NodeType.TRIGGER, triggerExecutor],
      [NodeType.HTTP_REQUEST, httpRequestExecutor],
      [NodeType.CONDITIONAL, conditionalExecutor],
      [NodeType.DATA_TRANSFORM, dataTransformExecutor],
      [NodeType.DELAY, delayExecutor],
      [NodeType.EMAIL, emailExecutor],
      [NodeType.GOOGLE_CALENDAR, googleCalendarExecutor],
      [NodeType.WHATSAPP, whatsappExecutor],
      [NodeType.MANUAL_APPROVAL, manualApprovalExecutor],
      [NodeType.CSV_UPLOAD, csvUploadExecutor],
      [NodeType.AI_CONTENT_GENERATOR, aiContentGeneratorExecutor],
      [NodeType.COMPLIANCE_CHECKER, complianceCheckerExecutor],
      [NodeType.COMPLIANCE_REPORT, complianceReportExecutor],
    ]);
  }

  /**
   * Get executor for a specific node type
   * @param nodeType - Type of node
   * @returns Executor instance
   * @throws Error if node type is not supported
   */
  getExecutor(nodeType: NodeType): INodeExecutor {
    const executor = this.executors.get(nodeType);

    if (!executor) {
      throw new Error(`No executor found for node type: ${nodeType}`);
    }

    return executor;
  }

  /**
   * Register a new executor (allows for runtime extension)
   * @param nodeType - Node type
   * @param executor - Executor instance
   */
  registerExecutor(nodeType: NodeType, executor: INodeExecutor): void {
    this.executors.set(nodeType, executor);
  }

  /**
   * Check if executor exists for node type
   * @param nodeType - Node type
   * @returns true if executor exists
   */
  hasExecutor(nodeType: NodeType): boolean {
    return this.executors.has(nodeType);
  }
}
