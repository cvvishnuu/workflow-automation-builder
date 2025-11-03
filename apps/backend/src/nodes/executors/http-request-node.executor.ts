/**
 * HTTP Request Node Executor
 * Makes HTTP requests to external APIs
 */

import { Injectable, HttpException } from '@nestjs/common';
import { BaseNodeExecutor } from './base-node.executor';
import { ExecutionContext, NodeExecutionResult } from './node-executor.interface';
import { HttpRequestNodeConfig } from '@workflow/shared-types';

@Injectable()
export class HttpRequestNodeExecutor extends BaseNodeExecutor {
  /**
   * Execute HTTP request
   */
  protected async executeInternal(
    node: HttpRequestNodeConfig,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const { url, method, headers, body, timeout = 30000 } = node.config;

    try {
      // Replace variables in URL if needed
      const processedUrl = this.replaceVariables(url, context);

      // Process body with variables if needed
      const processedBody = body ? this.replaceVariables(body, context) : undefined;

      // Make HTTP request using native fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(processedUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: processedBody ? JSON.stringify(JSON.parse(processedBody)) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse response
      let responseData: unknown;
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      // Check if request was successful
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          output: { status: response.status, data: responseData },
        };
      }

      return {
        success: true,
        output: {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          data: responseData,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'HTTP request failed',
      };
    }
  }

  /**
   * Validate HTTP request node configuration
   */
  validate(node: HttpRequestNodeConfig): boolean {
    super.validate(node);

    if (!node.config?.url) {
      throw new Error('HTTP request node must have a URL');
    }

    if (!node.config?.method) {
      throw new Error('HTTP request node must have a method');
    }

    return true;
  }
}
