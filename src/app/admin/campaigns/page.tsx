'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/trpc/client';
import { keepPreviousData } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | undefined;

export default function AdminCampaignsPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<CampaignStatus>(undefined);

  // Debounce search input to avoid spamming the database
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset to first page when search query or status filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  const { data, isLoading } = trpc.campaign.list.useQuery(
    { page, pageSize, search: debouncedSearch || undefined, status },
    { placeholderData: keepPreviousData }
  );

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <div className="container mx-auto py-10 space-y-8 max-w-5xl">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
        <p className="text-muted-foreground">Manage your influencer campaigns and monitor budgets.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-xl border shadow-sm">
        <Input
          placeholder="Search campaigns..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select
          value={status || 'all'}
          onValueChange={(val) => setStatus(val === 'all' ? undefined : (val as CampaignStatus))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-xl shadow-sm bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Title</TableHead>
              <TableHead>Platforms</TableHead>
              <TableHead>Payout / 1k</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && !data ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">
                  Loading campaigns...
                </TableCell>
              </TableRow>
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  No campaigns found.
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((campaign) => (
                <TableRow key={campaign.id} className="transition-colors hover:bg-muted/50">
                  <TableCell className="font-medium">{campaign.title}</TableCell>
                  <TableCell className="capitalize">{campaign.platforms?.join(', ')}</TableCell>
                  <TableCell>${(Number(campaign.payoutPer1kViews) / 100).toFixed(2)}</TableCell>
                  <TableCell>${(Number(campaign.totalBudget) / 100).toFixed(2)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold
                      ${campaign.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : ''}
                      ${campaign.status === 'draft' ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' : ''}
                      ${campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : ''}
                      ${campaign.status === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : ''}
                    `}>
                      {campaign.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (page > 1) setPage(p => p - 1);
                }}
                className={page === 1 ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>
            <PaginationItem className="text-sm font-medium px-4">
              Page {page} of {totalPages}
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (page < totalPages) setPage(p => p + 1);
                }}
                className={page === totalPages ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
