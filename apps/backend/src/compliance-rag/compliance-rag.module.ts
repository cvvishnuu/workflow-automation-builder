import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ComplianceRAGService } from './compliance-rag.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [ComplianceRAGService],
  exports: [ComplianceRAGService],
})
export class ComplianceRAGModule {}
