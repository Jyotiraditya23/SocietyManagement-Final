'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useComplaints, Complaint } from '@/hooks/useComplaints';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, ClipboardList, RefreshCw, CheckCircle } from 'lucide-react';

export default function ComplaintsPage() {
  const { toast } = useToast();
  const { getMyComplaints } = useComplaints();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0 });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // Fetch complaints
  useEffect(() => {
    fetchComplaints(1);
  }, [statusFilter]);

  const fetchComplaints = async (page: number) => {
    setDataLoading(true);
    try {
      const status = statusFilter === 'all' ? undefined : statusFilter;
      const response = await getMyComplaints(page, 10, status);
      setComplaints(response.data);
      setPagination(response.pagination);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch complaints',
        variant: 'destructive',
      });
    } finally {
      setDataLoading(false);
    }
  };

  const openDetailDialog = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setDetailDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Open</Badge>;
      case 'in-progress':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">In Progress</Badge>;
      case 'resolved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Resolved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive" className="capitalize">High</Badge>;
      case 'medium':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 capitalize">Medium</Badge>;
      case 'low':
        return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 capitalize">Low</Badge>;
      default:
        return <Badge variant="outline" className="capitalize">{priority}</Badge>;
    }
  };

  const getStatusStats = () => {
    const stats = { open: 0, 'in-progress': 0, resolved: 0 };
    complaints.forEach((c) => {
      if (c.status in stats) stats[c.status as keyof typeof stats]++;
    });
    return stats;
  };

  const stats = getStatusStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Complaints</h1>
          <p className="text-gray-600 mt-1">View and track your complaints</p>
        </div>
        <Link href="/complaints/new">
          <Button className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
            <Plus className="w-4 h-4" /> New Complaint
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-xl">
                <ClipboardList className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Open</p>
                <p className="text-2xl font-bold text-amber-600">{stats.open}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <RefreshCw className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{stats['in-progress']}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Resolved</p>
                <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Table */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Complaint History</CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {dataLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-center gap-4 p-4 border rounded-lg">
                  <div className="h-12 w-12 bg-gray-200 rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : complaints.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-5xl mb-4 block">📭</span>
              <h3 className="text-lg font-medium text-gray-900">No complaints found</h3>
              <p className="text-gray-500 mt-1">
                {statusFilter !== 'all'
                  ? 'No complaints with this status.'
                  : "You haven't filed any complaints yet."}
              </p>
              <Link href="/complaints/new">
                <Button className="mt-4">File a Complaint</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complaints.map((complaint) => (
                    <TableRow key={complaint._id}>
                      <TableCell>
                        <Badge variant="outline">{complaint.category}</Badge>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="flex items-center gap-3">
                          {complaint.image_url && (
                            <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0">
                              <Image
                                src={complaint.image_url}
                                alt="Complaint"
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}
                          <p className="truncate">{complaint.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getPriorityBadge(complaint.priority)}</TableCell>
                      <TableCell>{getStatusBadge(complaint.status)}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(complaint.created_at)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDetailDialog(complaint)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-500">
                    Showing {(pagination.current - 1) * 10 + 1} to{' '}
                    {Math.min(pagination.current * 10, pagination.total)} of {pagination.total}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.current === 1}
                      onClick={() => fetchComplaints(pagination.current - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.current === pagination.pages}
                      onClick={() => fetchComplaints(pagination.current + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complaint Details</DialogTitle>
            <DialogDescription>
              Submitted on {selectedComplaint && formatDate(selectedComplaint.created_at)}
            </DialogDescription>
          </DialogHeader>
          {selectedComplaint && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 font-medium">Category:</span>
                  <Badge variant="outline">{selectedComplaint.category}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 font-medium">Priority:</span>
                  {getPriorityBadge(selectedComplaint.priority)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 font-medium">Status:</span>
                  {getStatusBadge(selectedComplaint.status)}
                </div>
              </div>

              {selectedComplaint.image_url && (
                <div className="relative w-full h-64 rounded-lg overflow-hidden border bg-black/5">
                  <Image
                    src={selectedComplaint.image_url}
                    alt="Complaint image"
                    fill
                    className="object-contain"
                  />
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Description</h4>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg border text-sm whitespace-pre-line">
                  {selectedComplaint.description}
                </p>
              </div>

              {/* Status History Timeline */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">Status History Timeline</h4>
                <div className="relative pl-6 border-l-2 border-slate-100 space-y-4 ml-3">
                  {selectedComplaint.status_history?.map((history, idx) => (
                    <div key={idx} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[31px] top-1 bg-white border-2 border-blue-600 rounded-full w-4 h-4 flex items-center justify-center">
                        <span className="bg-blue-600 rounded-full w-1.5 h-1.5" />
                      </span>
                      <div className="text-sm font-semibold text-slate-800 capitalize flex items-center gap-2">
                        {history.status}
                        {idx === selectedComplaint.status_history.length - 1 && (
                          <Badge className="bg-green-500 hover:bg-green-500 text-[10px] h-4 py-0 px-1.5">Current</Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {formatDate(history.timestamp)} • by {history.actor?.name || 'Resident'} ({history.actor?.role || 'resident'})
                      </div>
                      {history.note && (
                        <div className="text-sm text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-1.5">
                          {history.note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {selectedComplaint.resolved_by && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Resolved By</h4>
                  <p className="text-sm text-gray-900">
                    {selectedComplaint.resolved_by.name} ({selectedComplaint.resolved_by.email})
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
