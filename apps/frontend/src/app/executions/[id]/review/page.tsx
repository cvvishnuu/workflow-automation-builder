'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { executionsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface ApprovalRow {
  customerId: string;
  name: string;
  phone: string;
  email?: string;
  generated_content: string;
  compliance_status?: string;
  [key: string]: any;
}

interface ApprovalData {
  executionId: string;
  workflowId: string;
  status: string;
  approvalData: {
    rows: ApprovalRow[];
    metadata: {
      totalRows: number;
      title: string;
      description: string;
      allowBulkApproval: boolean;
      requireComment: boolean;
    };
    displayFields: string[];
  };
  startedAt: string;
}

export default function ApprovalReviewPage() {
  const params = useParams();
  const router = useRouter();
  const executionId = params.id as string;

  const [data, setData] = useState<ApprovalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApprovalData();
  }, [executionId]);

  async function fetchApprovalData() {
    try {
      setLoading(true);
      const result = await executionsApi.getPendingApproval(executionId);
      setData(result);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch approval data:', err);
      setError(err.response?.data?.message || 'Failed to load approval data');
    } finally {
      setLoading(false);
    }
  }

  function toggleRow(index: number) {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  }

  function toggleAllRows() {
    if (selectedRows.size === data?.approvalData.rows.length) {
      setSelectedRows(new Set());
    } else {
      const allRows = new Set(data?.approvalData.rows.map((_, i) => i) || []);
      setSelectedRows(allRows);
    }
  }

  async function handleApprove() {
    if (!data) return;

    const requireComment = data.approvalData.metadata.requireComment;
    if (requireComment && !comment.trim()) {
      setError('Comment is required for approval');
      return;
    }

    try {
      setProcessing(true);
      await executionsApi.approve(executionId, comment);

      // Redirect back to workflows page
      router.push('/workflows');
    } catch (err: any) {
      console.error('Failed to approve:', err);
      setError(err.response?.data?.message || 'Failed to approve content');
      setProcessing(false);
    }
  }

  async function handleReject() {
    if (!data) return;

    const requireComment = data.approvalData.metadata.requireComment;
    if (requireComment && !comment.trim()) {
      setError('Comment is required for rejection');
      return;
    }

    try {
      setProcessing(true);
      await executionsApi.reject(executionId, comment);

      // Redirect back to workflows page
      router.push('/workflows');
    } catch (err: any) {
      console.error('Failed to reject:', err);
      setError(err.response?.data?.message || 'Failed to reject content');
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">{error}</p>
            <Button onClick={() => router.push('/workflows')} className="mt-4">
              Back to Workflows
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const { rows, metadata, displayFields } = data.approvalData;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{metadata.title}</h1>
        <p className="text-muted-foreground">{metadata.description}</p>
        <div className="flex gap-2 mt-2">
          <Badge variant="outline">
            {rows.length} {rows.length === 1 ? 'item' : 'items'} pending review
          </Badge>
          <Badge variant={data.status === 'pending_approval' ? 'default' : 'secondary'}>
            {data.status}
          </Badge>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 border border-red-500 bg-red-50 text-red-900 rounded-md">
          {error}
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Generated Content Review</CardTitle>
            {metadata.allowBulkApproval && rows.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAllRows}
              >
                {selectedRows.size === rows.length ? 'Deselect All' : 'Select All'}
              </Button>
            )}
          </div>
          <CardDescription>
            Review the AI-generated content before sending to customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    {metadata.allowBulkApproval && (
                      <th className="px-4 py-3 text-left">
                        <Checkbox
                          checked={selectedRows.size === rows.length && rows.length > 0}
                          onCheckedChange={toggleAllRows}
                        />
                      </th>
                    )}
                    {displayFields.map((field) => (
                      <th key={field} className="px-4 py-3 text-left font-semibold">
                        {field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={index} className="border-t hover:bg-muted/50">
                      {metadata.allowBulkApproval && (
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={selectedRows.has(index)}
                            onCheckedChange={() => toggleRow(index)}
                          />
                        </td>
                      )}
                      {displayFields.map((field) => (
                        <td key={field} className="px-4 py-3">
                          {field === 'generated_content' ? (
                            <div className="max-w-md whitespace-pre-wrap text-sm">
                              {row[field]}
                            </div>
                          ) : field === 'compliance_status' ? (
                            <Badge variant={row[field] === 'passed' ? 'default' : 'destructive'}>
                              {row[field]}
                            </Badge>
                          ) : (
                            <span className="text-sm">{row[field]}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>
            Review Comments {metadata.requireComment && <span className="text-red-500">*</span>}
          </CardTitle>
          <CardDescription>
            {metadata.requireComment
              ? 'Please provide a comment with your decision'
              : 'Optionally add comments for your approval/rejection'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Enter your comments here..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            className="w-full"
          />
        </CardContent>
      </Card>

      <div className="flex gap-4 justify-end">
        <Button
          variant="outline"
          onClick={() => router.push('/workflows')}
          disabled={processing}
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={handleReject}
          disabled={processing}
        >
          {processing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Rejecting...
            </>
          ) : (
            <>
              <XCircle className="mr-2 h-4 w-4" />
              Reject Content
            </>
          )}
        </Button>
        <Button
          onClick={handleApprove}
          disabled={processing}
        >
          {processing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Approving...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve & Continue
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
