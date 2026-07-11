'use client';

import { useState, useEffect } from 'react';
import { useComplaints, Notice } from '@/hooks/useComplaints';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Pin, Trash2, Plus, Megaphone } from 'lucide-react';

export default function NoticeBoardPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { getNotices, createNotice, deleteNotice } = useComplaints();

  const [notices, setNotices] = useState<Notice[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isImportant, setIsImportant] = useState(false);

  const isAdmin = user && ['manager', 'admin'].includes(user.role);

  // Fetch notices
  const fetchNotices = async () => {
    setDataLoading(true);
    try {
      const response = await getNotices();
      setNotices(response.data);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to fetch notices',
        variant: 'destructive',
      });
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      toast({
        title: 'Validation failed',
        description: 'Notice title and content are required',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createNotice(title.trim(), content.trim(), isImportant);
      toast({
        title: 'Notice Posted',
        description: isImportant 
          ? 'Important notice posted and residents have been notified via email.' 
          : 'Notice has been posted successfully.',
      });
      setCreateDialogOpen(false);
      setTitle('');
      setContent('');
      setIsImportant(false);
      fetchNotices();
    } catch (err: any) {
      toast({
        title: 'Failed to post notice',
        description: err.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNotice = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notice?')) return;

    try {
      await deleteNotice(id);
      toast({
        title: 'Deleted',
        description: 'Notice has been removed from board.',
      });
      fetchNotices();
    } catch (err: any) {
      toast({
        title: 'Delete failed',
        description: err.message || 'Failed to delete notice',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notice Board</h1>
          <p className="text-gray-600 mt-1">Keep up with the latest announcements in the society</p>
        </div>
        {isAdmin && (
          <Button 
            onClick={() => setCreateDialogOpen(true)}
            className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            <Plus className="w-4 h-4" /> Post Announcement
          </Button>
        )}
      </div>

      {/* Notices List */}
      {dataLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-0 shadow-sm animate-pulse">
              <CardHeader className="h-16 bg-gray-200 rounded-t-lg" />
              <CardContent className="h-24 bg-gray-100 rounded-b-lg mt-1" />
            </Card>
          ))}
        </div>
      ) : notices.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border shadow-sm">
          <span className="text-5xl mb-4 block">📢</span>
          <h3 className="text-lg font-medium text-gray-900">No notices posted</h3>
          <p className="text-gray-500 mt-1">
            Check back later for announcements and society updates.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {notices.map((notice) => (
            <Card 
              key={notice._id} 
              className={`border-0 shadow-sm transition-all overflow-hidden ${
                notice.is_important 
                  ? 'ring-2 ring-blue-500 bg-gradient-to-r from-blue-50/50 to-white' 
                  : 'bg-white'
              }`}
            >
              <CardHeader className="pb-3 border-b border-gray-100/80">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      {notice.is_important && <Pin className="w-4 h-4 text-blue-600 fill-blue-600 rotate-45" />}
                      {notice.title}
                      {notice.is_important && (
                        <Badge className="bg-blue-600 text-white hover:bg-blue-600">Important</Badge>
                      )}
                    </CardTitle>
                    <p className="text-xs text-gray-500">
                      Posted by {notice.created_by?.name || 'Manager'} • {formatDate(notice.created_at)}
                    </p>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteNotice(notice._id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {notice.content}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Notice Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Post New Announcement</DialogTitle>
            <DialogDescription>
              Write an announcement to the notice board. Important announcements send immediate emails.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateNotice} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Notice Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Water Tank Cleaning Scheduled"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Notice Content</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Details of the announcement..."
                rows={6}
                required
              />
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox 
                id="isImportant" 
                checked={isImportant}
                onCheckedChange={(checked) => setIsImportant(!!checked)}
              />
              <Label htmlFor="isImportant" className="cursor-pointer text-sm font-medium leading-none">
                Mark as Pinned / Important (Sends email notification to residents)
              </Label>
            </div>
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                {isSubmitting ? 'Posting...' : 'Post Notice'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
