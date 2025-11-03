/**
 * API Keys Controller
 * Admin endpoints for managing API keys
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';

@ApiTags('API Keys')
@ApiBearerAuth()
@Controller('api-keys')
@UseGuards(ClerkAuthGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new API key' })
  create(@Body() createApiKeyDto: CreateApiKeyDto, @Req() req: any) {
    return this.apiKeysService.create(req.userId, {
      ...createApiKeyDto,
      expiresAt: createApiKeyDto.expiresAt
        ? new Date(createApiKeyDto.expiresAt)
        : undefined,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all API keys for the authenticated user' })
  findAll(@Req() req: any) {
    return this.apiKeysService.findAll(req.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single API key by ID' })
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.apiKeysService.findOne(req.userId, id);
  }

  @Get(':id/usage')
  @ApiOperation({ summary: 'Get usage statistics for an API key' })
  getUsageStats(@Param('id') id: string, @Req() req: any) {
    return this.apiKeysService.getUsageStats(req.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an API key' })
  update(
    @Param('id') id: string,
    @Body() updateApiKeyDto: UpdateApiKeyDto,
    @Req() req: any,
  ) {
    return this.apiKeysService.update(req.userId, id, updateApiKeyDto);
  }

  @Post(':id/regenerate')
  @ApiOperation({ summary: 'Regenerate an API key (creates new key, invalidates old)' })
  regenerate(@Param('id') id: string, @Req() req: any) {
    return this.apiKeysService.regenerate(req.userId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an API key' })
  remove(@Param('id') id: string, @Req() req: any) {
    return this.apiKeysService.remove(req.userId, id);
  }
}
