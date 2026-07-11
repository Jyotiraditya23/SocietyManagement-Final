'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useComplaints, Complaint, Notice } from '@/hooks/useComplaints';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SOCIETY_NAME } from '@/lib/constants';
import {
  Users,
  MessageSquare,
  FileText,
  Settings,
  AlertTriangle,
  Calendar,
  MapPin,
  Shield,
  Plus,
  ArrowRight,
  Pin,
  RefreshCw,
  CheckCircle,
  Megaphone
} from 'lucide-react';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { getMyComplaints, getAllComplaints, getNotices } = useComplaints();

  const [dataLoading, setDataLoading] = useState(true);
  
  // Admin stats
  const [stats, setStats] = useState({
    open: 0,
    'in-progress': 0,
    resolved: 0,
    categories: {} as Record<string, number>,
    overdue: 0
  });

  // Resident stats
  const [myComplaints, setMyComplaints] = useState<Complaint[]>([]);
  const [recentNotices, setRecentNotices] = useState<Notice[]>([]);

  const isAdmin = user && ['manager', 'admin'].includes(user.role);

  useEffect(() => {
    if (!authLoading && user) {
      fetchDashboardData();
    }
  }, [user, authLoading]);

  const fetchDashboardData = async () => {
    setDataLoading(true);
    try {
      if (isAdmin) {
        // Fetch all complaints to get global statistics
        const response = await getAllComplaints(1, 5);
        if (response.stats) {
          setStats({
            open: response.stats.open || 0,
            'in-progress': response.stats['in-progress'] || 0,
            resolved: response.stats.resolved || 0,
            categories: response.stats.categories || {},
            overdue: response.stats.overdue || 0
          });
        }
      } else {
        // Resident view
        const complaintsResponse = await getMyComplaints(1, 5);
        setMyComplaints(complaintsResponse.data);

        const noticesResponse = await getNotices();
        setRecentNotices(noticesResponse.data.slice(0, 3)); // show top 3 notices
      }
    } catch (err: any) {
      toast({
        title: 'Error loading dashboard',
        description: err.message || 'Please reload the page.',
        variant: 'destructive',
      });
    } finally {
      setDataLoading(false);
    }
  };

  if (authLoading || dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin"></div>
      </div>
    );
  }

  // Get current hour for greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

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

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {greeting}, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Flat {user?.flat_no} • {SOCIETY_NAME}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1.5 text-sm font-medium bg-white">
            <Calendar className="w-4 h-4 mr-1.5 text-slate-400" />
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}
          </Badge>
          {isAdmin && (
            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 px-3 py-1.5">
              <Shield className="w-4 h-4 mr-1.5" />
              {user?.role === 'manager' ? 'Manager' : 'Admin'}
            </Badge>
          )}
        </div>
      </div>

      {isAdmin ? (
        /* Admin Dashboard View */
        <div className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-100 rounded-xl">
                    <MessageSquare className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Open Complaints</p>
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

            <Card className="border-0 shadow-sm bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-100 rounded-xl">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-red-700 font-semibold">Overdue</p>
                    <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Category Breakdown (3 columns) */}
            <Card className="lg:col-span-3 border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Complaints by Category</CardTitle>
                <CardDescription>Visual breakdown of registered issues in the society</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {['Plumbing', 'Electrical', 'Lift/Elevator', 'Security/Parking', 'Cleaning/Garbage', 'Others'].map((cat) => {
                  const count = stats.categories[cat] || 0;
                  const total = Object.values(stats.categories).reduce((a, b) => a + b, 0) || 1;
                  const percentage = Math.round((count / total) * 100);

                  return (
                    <div key={cat} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-slate-700">{cat}</span>
                        <span className="text-slate-500 font-bold">{count} issues ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Quick Actions (2 columns) */}
            <Card className="lg:col-span-2 border-0 shadow-sm bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col justify-between">
              <CardHeader>
                <CardTitle className="text-lg text-white">Admin Quick Actions</CardTitle>
                <CardDescription className="text-slate-400">Shortcuts to manage tracking dashboards</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0 pb-6">
                <Link href="/admin/complaints">
                  <Button variant="secondary" className="w-full justify-between bg-slate-800 hover:bg-slate-700 text-white border-0 py-5">
                    <span className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-blue-400" />
                      Complaints Dashboard
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </Button>
                </Link>
                <Link href="/admin/users">
                  <Button variant="secondary" className="w-full justify-between bg-slate-800 hover:bg-slate-700 text-white border-0 py-5">
                    <span className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-400" />
                      Manage Users
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </Button>
                </Link>
                <Link href="/notices">
                  <Button variant="secondary" className="w-full justify-between bg-slate-800 hover:bg-slate-700 text-white border-0 py-5">
                    <span className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-400" />
                      Post Announcement
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </Button>
                </Link>
                <Link href="/admin/settings">
                  <Button variant="secondary" className="w-full justify-between bg-slate-800 hover:bg-slate-700 text-white border-0 py-5">
                    <span className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-blue-400" />
                      System Settings
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* Resident Dashboard View */
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Main Content (3 columns) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Active Complaints */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg">Recent Complaints</CardTitle>
                  <CardDescription>Latest complaints filed by you</CardDescription>
                </div>
                <Link href="/complaints/new">
                  <Button size="sm" className="gap-1">
                    <Plus className="w-3.5 h-3.5" /> File New
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-4">
                {myComplaints.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">You have no active complaints.</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {myComplaints.map((c) => (
                      <div key={c._id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                        <div className="min-w-0 flex-1 pr-4">
                          <p className="font-semibold text-slate-800 text-sm truncate">{c.description}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{c.category} • {new Date(c.created_at).toLocaleDateString('en-IN')}</p>
                        </div>
                        <div>
                          {getStatusBadge(c.status)}
                        </div>
                      </div>
                    ))}
                    <div className="pt-3 text-center">
                      <Link href="/complaints" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1 font-semibold">
                        View All My Complaints <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Announcements (2 columns) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Notices Board Widget */}
            <Card className="border-0 shadow-sm bg-gradient-to-br from-white to-slate-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-blue-600" />
                  Latest Notices
                </CardTitle>
                <CardDescription>Recent updates from society committee</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                {recentNotices.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-500">No notices posted recently.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentNotices.map((n) => (
                      <div key={n._id} className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm space-y-1">
                        <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1">
                          {n.is_important && <Pin className="w-3 h-3 text-blue-600 fill-blue-600 rotate-45" />}
                          {n.title}
                          {n.is_important && (
                            <span className="text-[9px] bg-blue-100 text-blue-700 px-1 py-0.2 rounded font-bold">Important</span>
                          )}
                        </h4>
                        <p className="text-xs text-slate-500 line-clamp-2">{n.content}</p>
                        <p className="text-[10px] text-slate-400 pt-1">{new Date(n.created_at).toLocaleDateString('en-IN')}</p>
                      </div>
                    ))}
                    <div className="pt-2 text-center">
                      <Link href="/notices" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1 font-semibold">
                        Open Notice Board <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
