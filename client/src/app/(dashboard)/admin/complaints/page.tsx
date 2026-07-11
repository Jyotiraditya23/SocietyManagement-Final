'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useComplaints, Complaint } from '@/hooks/useComplaints';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  DialogFooter,
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
import { ClipboardList, RefreshCw, CheckCircle, AlertTriangle, Calendar } from 'lucide-react';

export default function AdminComplaintsPage() {
  const { toast } = useToast();
  const { getAllComplaints, updateComplaintStatus, updateComplaintPriority } = useComplaints();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [stats, setStats] = useState({ open: 0, 'in-progress': 0, resolved: 0, overdue: 0 });
  const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0 });
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');

  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [newPriority, setNewPriority] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState('');
  const [dataLoading, setDataLoading] = useState(true);
  const [updateLoading, setUpdateLoading] = useState(false);

  // Fetch complaints when filters change
  useEffect(() => {
    fetchComplaints(1);
  }, [statusFilter, categoryFilter, dateFilter]);

  const fetchComplaints = async (page: number) => {
    setDataLoading(true);
    try {
      const status = statusFilter === 'all' ? undefined : statusFilter;
      const category = categoryFilter === 'all' ? undefined : categoryFilter;
      const date = dateFilter || undefined;
      
      const response = await getAllComplaints(page, 10, status, category, date);
      setComplaints(response.data);
      setStats({
        open: response.stats?.open || 0,
        'in-progress': response.stats?.['in-progress'] || 0,
        resolved: response.stats?.resolved || 0,
        overdue: response.stats?.overdue || 0
      });
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

  const openUpdateDialog = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setNewStatus(complaint.status);
    setNewPriority(complaint.priority);
    setAdminNotes(complaint.admin_notes || '');
    setUpdateDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedComplaint) return;

    setUpdateLoading(true);
    try {
      // Update status if changed
      if (newStatus !== selectedComplaint.status || adminNotes !== selectedComplaint.admin_notes) {
        await updateComplaintStatus(
          selectedComplaint._id,
          newStatus as 'open' | 'in-progress' | 'resolved',
          adminNotes
        );
      }

      // Update priority if changed
      if (newPriority !== selectedComplaint.priority) {
        await updateComplaintPriority(
          selectedComplaint._id,
          newPriority as 'low' | 'medium' | 'high'
        );
      }

      toast({
        title: 'Updated Successfully',
        description: 'Complaint record has been updated.',
      });

      setUpdateDialogOpen(false);
      fetchComplaints(pagination.current);
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error.message || 'Failed to update complaint',
        variant: 'destructive',
      });
    } finally {
      setUpdateLoading(false);
    }
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

  const getTimeAgo = (dateString: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
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

  const clearFilters = () => {
    setStatusFilter('all');
    setCategoryFilter('all');
    setDateFilter('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">All Complaints</h1>
        <p className="text-gray-600 mt-1">Manage and resolve complaints from residents</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card
          className={`cursor-pointer transition-all border-0 shadow-sm ${statusFilter === 'all' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-xl">
                <span className="text-2xl text-blue-600">📋</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold">{stats.open + stats['in-progress'] + stats.resolved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all border-0 shadow-sm ${statusFilter === 'open' ? 'ring-2 ring-amber-500' : ''}`}
          onClick={() => setStatusFilter('open')}
        >
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
        <Card
          className={`cursor-pointer transition-all border-0 shadow-sm ${statusFilter === 'in-progress' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => setStatusFilter('in-progress')}
        >
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
        <Card className="border-0 shadow-sm bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-red-700 font-medium">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Toolbar */}
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="pt-6 flex flex-wrap gap-4 items-end">
          <div className="space-y-2 flex-1 min-w-[200px]">
            <Label>Filter by Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 flex-1 min-w-[200px]">
            <Label>Filter by Category</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Plumbing">Plumbing</SelectItem>
                <SelectItem value="Electrical">Electrical</SelectItem>
                <SelectItem value="Lift/Elevator">Lift / Elevator</SelectItem>
                <SelectItem value="Security/Parking">Security / Parking</SelectItem>
                <SelectItem value="Cleaning/Garbage">Cleaning / Garbage</SelectItem>
                <SelectItem value="Others">Others</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 flex-1 min-w-[200px]">
            <Label className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-gray-400" /> Filter by Date</Label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-slate-200 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          {(statusFilter !== 'all' || categoryFilter !== 'all' || dateFilter !== '') && (
            <Button variant="outline" onClick={clearFilters}>
              Reset Filters
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Complaints Table */}
      <Card>
        <CardHeader>
          <CardTitle>Complaint List</CardTitle>
          <CardDescription>
            Manage issues, set priority level, and resolve complaints. Overdue items are listed at the top.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dataLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
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
                No complaints matching your filter criteria.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resident</TableHead>
                    <TableHead>Flat</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complaints.map((complaint) => (
                    <TableRow 
                      key={complaint._id} 
                      className={`cursor-pointer hover:bg-gray-50 ${complaint.is_overdue ? 'bg-red-50/50 hover:bg-red-50' : ''}`}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium flex items-center gap-1.5">
                            {complaint.user_id.name}
                            {complaint.is_overdue && (
                              <Badge variant="destructive" className="text-[10px] h-4 py-0 px-1.5 font-bold animate-pulse">
                                Overdue
                              </Badge>
                            )}
                          </p>
                          <p className="text-sm text-gray-500">{complaint.user_id.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{complaint.flat_no}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100">{complaint.category}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="flex items-center gap-2">
                          {complaint.image_url && (
                            <div className="relative w-8 h-8 rounded overflow-hidden flex-shrink-0 border">
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
                      <TableCell>
                        <div>
                          <p className="text-sm">{getTimeAgo(complaint.created_at)}</p>
                          <p className="text-xs text-gray-400">{formatDate(complaint.created_at)}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openUpdateDialog(complaint)}
                        >
                          Manage
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

      {/* Update/Manage Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Complaint</DialogTitle>
            <DialogDescription>
              Set severity level, update progress status, and add response notes.
            </DialogDescription>
          </DialogHeader>
          {selectedComplaint && (
            <div className="space-y-5">
              {/* Complaint Info */}
              <div className="bg-gray-50 p-4 rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-800">{selectedComplaint.user_id.name}</p>
                  <p className="text-xs text-gray-500">Flat {selectedComplaint.flat_no} • {selectedComplaint.category}</p>
                  <p className="text-[11px] text-gray-400 mt-1">Submitted: {formatDate(selectedComplaint.created_at)}</p>
                </div>
                <div className="flex flex-col gap-1.5 items-end">
                  {getStatusBadge(selectedComplaint.status)}
                  {selectedComplaint.is_overdue && (
                    <Badge variant="destructive" className="text-[10px] py-0 font-bold">Overdue</Badge>
                  )}
                </div>
              </div>

              {/* Image */}
              {selectedComplaint.image_url && (
                <div className="relative w-full h-48 rounded-lg overflow-hidden border bg-black/5">
                  <Image
                    src={selectedComplaint.image_url}
                    alt="Complaint image"
                    fill
                    className="object-contain"
                  />
                </div>
              )}

              {/* Description */}
              <div>
                <Label className="text-gray-500 text-xs">Resident Description</Label>
                <p className="mt-1 text-sm text-gray-900 bg-white p-3 rounded-lg border whitespace-pre-line">
                  {selectedComplaint.description}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Priority Selection */}
                <div className="space-y-2">
                  <Label htmlFor="priority">Set Priority Level</Label>
                  <Select value={newPriority} onValueChange={setNewPriority}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Update */}
                <div className="space-y-2">
                  <Label htmlFor="status">Update Status</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved (Close)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Admin Notes */}
              <div className="space-y-2">
                <Label htmlFor="adminNotes">Note / Action Details</Label>
                <Textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Explain actions taken (resident will see this log and receive email notification)"
                  rows={3}
                />
              </div>

              {/* History Timeline */}
              <div>
                <Label className="text-gray-500 text-xs block mb-2">Lifecycle History Logs</Label>
                <div className="relative pl-6 border-l-2 border-slate-100 space-y-4 ml-3">
                  {selectedComplaint.status_history?.map((history, idx) => (
                    <div key={idx} className="relative text-xs">
                      <span className="absolute -left-[31px] top-1 bg-white border-2 border-blue-600 rounded-full w-4 h-4 flex items-center justify-center">
                        <span className="bg-blue-600 rounded-full w-1.5 h-1.5" />
                      </span>
                      <div className="font-semibold text-slate-800 capitalize flex items-center gap-2">
                        {history.status}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {formatDate(history.timestamp)} • by {history.actor?.name || 'User'} ({history.actor?.role})
                      </div>
                      {history.note && (
                        <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 mt-1">
                          {history.note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setUpdateDialogOpen(false)}
              disabled={updateLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateLoading}>
              {updateLoading ? 'Updating...' : 'Save Updates'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
