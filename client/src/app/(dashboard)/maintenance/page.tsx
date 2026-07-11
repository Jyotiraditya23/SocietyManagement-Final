'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SOCIETY_NAME, MONTHLY_MAINTENANCE_AMOUNT } from '@/lib/constants';
import { CreditCard, Calendar, Plus, RefreshCw, CheckCircle, AlertCircle, TrendingUp, Users, FileText, Check } from 'lucide-react';

interface MaintenanceBill {
  _id: string;
  flat_no: string;
  month: number;
  year: number;
  amount: number;
  late_fee: number;
  total_amount: number;
  due_date: string;
  paid_date: string | null;
  status: 'pending' | 'paid' | 'overdue';
  user_id?: {
    name: string;
    email: string;
    phone: string;
  };
}

interface PaymentLog {
  _id: string;
  flat_no: string;
  amount: number;
  payment_date: string;
  transaction_id: string;
  payment_method: string;
  month: number;
  year: number;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function MaintenancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'manager' || user?.role === 'admin';

  // State
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState<MaintenanceBill[]>([]);
  const [history, setHistory] = useState<PaymentLog[]>([]);
  const [stats, setStats] = useState({
    totalCollected: 0,
    pendingAmount: 0,
    overdueCount: 0,
    totalRecords: 0
  });

  // Dialog State
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<MaintenanceBill | null>(null);
  const [payingSimulated, setPayingSimulated] = useState(false);
  const [payingRazorpay, setPayingRazorpay] = useState(false);

  // Manager Bill Generation state
  const [genMonth, setGenMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [genYear, setGenYear] = useState<string>(String(new Date().getFullYear()));
  const [genAmount, setGenAmount] = useState<string>(String(MONTHLY_MAINTENANCE_AMOUNT));
  const [genDueDate, setGenDueDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 15).toISOString().split('T')[0]
  );
  const [generating, setGenerating] = useState(false);

  // Filter State (for Admin table)
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Load Data
  const loadData = async () => {
    try {
      setLoading(true);
      if (isAdmin) {
        const [billsRes, statsRes] = await Promise.all([
          api.get('/maintenance/all'),
          api.get('/maintenance/stats')
        ]);
        setBills(billsRes.data.data || []);
        setStats(statsRes.data.data || { totalCollected: 0, pendingAmount: 0, overdueCount: 0, totalRecords: 0 });
      } else {
        const [billsRes, historyRes] = await Promise.all([
          api.get('/maintenance'),
          api.get('/maintenance/history')
        ]);
        setBills(billsRes.data.data || []);
        setHistory(historyRes.data.data || []);
      }
    } catch (err: any) {
      toast({
        title: 'Error loading data',
        description: err.response?.data?.message || 'Could not fetch records.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Load Razorpay checkout script dynamically
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Trigger Razorpay Payment
  const handleRazorpayPayment = async (bill: MaintenanceBill) => {
    setPayingRazorpay(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast({
          title: 'Razorpay SDK failed to load',
          description: 'Are you connected to the internet?',
          variant: 'destructive'
        });
        setPayingRazorpay(false);
        return;
      }

      // Create order
      const orderRes = await api.post('/maintenance/create-order', { id: bill._id });
      const orderData = orderRes.data;

      if (!orderRes.data.success) {
        throw new Error(orderRes.data.message || 'Order creation failed');
      }

      if (orderData.is_simulated) {
        // If server returned simulated fallback, trigger direct simulation pay
        toast({
          title: 'Simulated Order Created',
          description: 'No active Razorpay keys. Proceeding with simulated checkout.',
        });
        await handleSimulatedPayment(bill);
        setPayingRazorpay(false);
        setPayDialogOpen(false);
        return;
      }

      // Open Razorpay Options
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: SOCIETY_NAME,
        description: `Maintenance for ${MONTH_NAMES[bill.month - 1]} ${bill.year}`,
        order_id: orderData.order_id,
        handler: async function (response: any) {
          try {
            const verifyRes = await api.post('/maintenance/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              maintenance_id: bill._id
            });

            if (verifyRes.data.success) {
              toast({
                title: 'Payment Successful',
                description: 'Your maintenance payment has been verified and recorded.'
              });
              setPayDialogOpen(false);
              loadData();
            }
          } catch (err: any) {
            toast({
              title: 'Verification Failed',
              description: err.response?.data?.message || 'Could not verify payment signature.',
              variant: 'destructive'
            });
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || ''
        },
        theme: {
          color: '#2563eb'
        }
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();

    } catch (err: any) {
      toast({
        title: 'Payment initialization failed',
        description: err.response?.data?.message || err.message || 'Error processing payment.',
        variant: 'destructive'
      });
    } finally {
      setPayingRazorpay(false);
    }
  };

  // Trigger Simulated Payment
  const handleSimulatedPayment = async (bill: MaintenanceBill) => {
    setPayingSimulated(true);
    try {
      const res = await api.post(`/maintenance/simulate-pay/${bill._id}`);
      if (res.data.success) {
        toast({
          title: 'Success!',
          description: 'Payment completed successfully (Simulated Payment).',
          variant: 'default'
        });
        setPayDialogOpen(false);
        loadData();
      }
    } catch (err: any) {
      toast({
        title: 'Simulation failed',
        description: err.response?.data?.message || 'Error executing direct payment.',
        variant: 'destructive'
      });
    } finally {
      setPayingSimulated(false);
    }
  };

  // Generate Monthly Bills (Admin)
  const handleGenerateBills = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await api.post('/maintenance/generate', {
        month: parseInt(genMonth),
        year: parseInt(genYear),
        amount: parseFloat(genAmount),
        due_date: genDueDate
      });

      if (res.data.success) {
        toast({
          title: 'Bills Generated',
          description: res.data.message
        });
        loadData();
      }
    } catch (err: any) {
      toast({
        title: 'Failed to generate bills',
        description: err.response?.data?.message || 'Could not process billing.',
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
    }
  };

  // Filter bills for Admin view
  const filteredBills = bills.filter(bill => {
    const matchesStatus = statusFilter === 'all' || bill.status === statusFilter;
    const residentName = bill.user_id?.name || '';
    const matchesSearch = 
      bill.flat_no.toLowerCase().includes(searchFilter.toLowerCase()) ||
      residentName.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading && bills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-slate-500 font-medium">Loading maintenance panel...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Maintenance Payments</h1>
          <p className="text-slate-500">Manage monthly maintenance logs and payouts for {SOCIETY_NAME} society</p>
        </div>
        <Button onClick={loadData} variant="outline" className="flex items-center gap-2 hover:bg-slate-100">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {isAdmin ? (
        /* MANAGER DASHBOARD VIEW */
        <div className="space-y-8">
          {/* Stats Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Card className="border-0 shadow-sm relative overflow-hidden bg-gradient-to-br from-emerald-50 to-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Total Collected</p>
                    <p className="text-3xl font-black text-emerald-600 mt-2">₹{stats.totalCollected.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm relative overflow-hidden bg-gradient-to-br from-amber-50 to-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Pending Amount</p>
                    <p className="text-3xl font-black text-amber-600 mt-2">₹{stats.pendingAmount.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="p-3 bg-amber-100 rounded-xl text-amber-600">
                    <CreditCard className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm relative overflow-hidden bg-gradient-to-br from-rose-50 to-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Overdue Invoices</p>
                    <p className="text-3xl font-black text-rose-600 mt-2">{stats.overdueCount}</p>
                  </div>
                  <div className="p-3 bg-rose-100 rounded-xl text-rose-600">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Generate Billing Box (2 columns) */}
            <Card className="lg:col-span-2 border-0 shadow-sm self-start">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Generate New Billing Period
                </CardTitle>
                <CardDescription>Issue standard ₹1,000 monthly bills to all residents</CardDescription>
              </CardHeader>
              <form onSubmit={handleGenerateBills}>
                <CardContent className="space-y-4 pt-0">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="genMonth">Billing Month</Label>
                      <Select value={genMonth} onValueChange={setGenMonth}>
                        <SelectTrigger id="genMonth">
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTH_NAMES.map((name, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="genYear">Billing Year</Label>
                      <Select value={genYear} onValueChange={setGenYear}>
                        <SelectTrigger id="genYear">
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {['2025', '2026', '2027', '2028'].map(year => (
                            <SelectItem key={year} value={year}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="genAmount">Billing Amount (₹)</Label>
                    <Input 
                      id="genAmount" 
                      type="number" 
                      value={genAmount}
                      onChange={(e) => setGenAmount(e.target.value)}
                      required 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="genDueDate">Due Date</Label>
                    <Input 
                      id="genDueDate" 
                      type="date" 
                      value={genDueDate}
                      onChange={(e) => setGenDueDate(e.target.value)}
                      required 
                    />
                  </div>

                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4" disabled={generating}>
                    {generating ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Generating Bills...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" /> Generate Bills
                      </>
                    )}
                  </Button>
                </CardContent>
              </form>
            </Card>

            {/* List of Bills (3 columns) */}
            <Card className="lg:col-span-3 border-0 shadow-sm">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
                <div>
                  <CardTitle className="text-lg font-bold">Billing Records</CardTitle>
                  <CardDescription>Status check across all society flats</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="mb-4">
                  <Input 
                    type="text" 
                    placeholder="Search by Resident Name or Flat..." 
                    value={searchFilter} 
                    onChange={(e) => setSearchFilter(e.target.value)}
                  />
                </div>
                {filteredBills.length === 0 ? (
                  <div className="text-center py-10">
                    <AlertCircle className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                    <p className="text-slate-500 font-medium">No matching billing records found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="font-semibold">Flat No</TableHead>
                          <TableHead className="font-semibold">Resident</TableHead>
                          <TableHead className="font-semibold">Month</TableHead>
                          <TableHead className="font-semibold">Amount</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBills.map((b) => (
                          <TableRow key={b._id} className="hover:bg-slate-50/50">
                            <TableCell className="font-bold text-slate-900">{b.flat_no}</TableCell>
                            <TableCell>
                              <div className="font-medium text-slate-800">{b.user_id?.name || 'N/A'}</div>
                              <div className="text-xs text-slate-400">{b.user_id?.phone || ''}</div>
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-slate-600">
                              {MONTH_NAMES[b.month - 1]} {b.year}
                            </TableCell>
                            <TableCell className="font-bold text-slate-900">₹{b.total_amount}</TableCell>
                            <TableCell>
                              {b.status === 'paid' && (
                                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">Paid</Badge>
                              )}
                              {b.status === 'pending' && (
                                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">Pending</Badge>
                              )}
                              {b.status === 'overdue' && (
                                <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 border-rose-200">Overdue</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* RESIDENT DASHBOARD VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Main Due Invoices (3 columns) */}
          <div className="lg:col-span-3 space-y-6">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-white font-bold flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-400" />
                  Your Active Invoice
                </CardTitle>
                <CardDescription className="text-slate-400">Current month society maintenance fees</CardDescription>
              </CardHeader>
              <CardContent className="pt-2 pb-6">
                {bills.filter(b => b.status !== 'paid').length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center gap-3">
                    <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-400 border border-emerald-500/20">
                      <Check className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">All Caught Up!</p>
                      <p className="text-sm text-slate-400">You have no pending maintenance bills for this month.</p>
                    </div>
                  </div>
                ) : (
                  (() => {
                    const activeBill = bills.filter(b => b.status !== 'paid')[0];
                    return (
                      <div className="space-y-6">
                        <div className="flex justify-between items-end border-b border-slate-700/60 pb-4">
                          <div>
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Billing Period</span>
                            <h3 className="text-2xl font-black text-white mt-1">
                              {MONTH_NAMES[activeBill.month - 1]} {activeBill.year}
                            </h3>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest block mb-1">Status</span>
                            {activeBill.status === 'pending' ? (
                              <Badge className="bg-amber-500 text-white border-0">Pending</Badge>
                            ) : (
                              <Badge className="bg-rose-500 text-white border-0">Overdue</Badge>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                          <div>
                            <span className="text-xs text-slate-400">Flat Number</span>
                            <p className="text-lg font-bold text-white mt-1">{activeBill.flat_no}</p>
                          </div>
                          <div>
                            <span className="text-xs text-slate-400">Due Date</span>
                            <p className="text-lg font-bold text-white mt-1">
                              {new Date(activeBill.due_date).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-slate-400">Late Penalty Fee</span>
                            <p className="text-lg font-bold text-rose-400 mt-1">₹{activeBill.late_fee}</p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-700/60">
                          <div>
                            <span className="text-xs text-slate-400">Total Payable Amount</span>
                            <p className="text-3xl font-black text-white mt-1">₹{activeBill.total_amount}</p>
                          </div>
                          
                          <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
                            <DialogTrigger asChild>
                              <Button 
                                onClick={() => setSelectedBill(activeBill)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-6 text-base font-bold shadow-lg shadow-blue-600/20"
                              >
                                Pay Maintenance
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-max-w-[425px]">
                              <DialogHeader>
                                <DialogTitle>Complete Maintenance Payment</DialogTitle>
                                <DialogDescription>
                                  Pay ₹{activeBill.total_amount} for flat {activeBill.flat_no} ({MONTH_NAMES[activeBill.month - 1]} {activeBill.year}).
                                </DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <Button 
                                  onClick={() => handleRazorpayPayment(activeBill)} 
                                  className="w-full py-6 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
                                  disabled={payingRazorpay || payingSimulated}
                                >
                                  {payingRazorpay ? (
                                    <>
                                      <RefreshCw className="h-4 w-4 animate-spin" /> Verifying Order...
                                    </>
                                  ) : (
                                    <>
                                      <CreditCard className="w-4 h-4" /> Pay via Card/UPI (Razorpay)
                                    </>
                                  )}
                                </Button>
                                
                                <div className="relative flex py-2 items-center">
                                  <div className="flex-grow border-t border-slate-200"></div>
                                  <span className="flex-shrink mx-4 text-xs font-semibold text-slate-400 uppercase">Or bypass for dev</span>
                                  <div className="flex-grow border-t border-slate-200"></div>
                                </div>

                                <Button 
                                  variant="outline" 
                                  onClick={() => handleSimulatedPayment(activeBill)}
                                  className="w-full py-6 text-sm font-semibold border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2"
                                  disabled={payingRazorpay || payingSimulated}
                                >
                                  {payingSimulated ? (
                                    <>
                                      <RefreshCw className="h-4 w-4 animate-spin" /> Processing Mock Pay...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="w-4 h-4 text-emerald-600" /> Simulated Quick Pay (One-Click Bypass)
                                    </>
                                  )}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    );
                  })()
                )}
              </CardContent>
            </Card>

            {/* Invoices List */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Your Invoices</CardTitle>
                <CardDescription>Overview of all generated bills for your flat</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {bills.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-slate-400 font-medium">No bills generated yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="font-semibold">Billing Month</TableHead>
                          <TableHead className="font-semibold">Amount</TableHead>
                          <TableHead className="font-semibold">Late Fee</TableHead>
                          <TableHead className="font-semibold">Total</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bills.map((b) => (
                          <TableRow key={b._id} className="hover:bg-slate-50/50">
                            <TableCell className="font-bold text-slate-800">
                              {MONTH_NAMES[b.month - 1]} {b.year}
                            </TableCell>
                            <TableCell className="text-slate-600 font-medium">₹{b.amount}</TableCell>
                            <TableCell className="text-rose-600 font-medium">₹{b.late_fee}</TableCell>
                            <TableCell className="font-bold text-slate-900">₹{b.total_amount}</TableCell>
                            <TableCell>
                              {b.status === 'paid' && (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Paid</Badge>
                              )}
                              {b.status === 'pending' && (
                                <Badge className="bg-amber-100 text-amber-800 border-amber-200">Pending</Badge>
                              )}
                              {b.status === 'overdue' && (
                                <Badge className="bg-rose-100 text-rose-800 border-rose-200">Overdue</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Payment History sidebar (2 columns) */}
          <Card className="lg:col-span-2 border-0 shadow-sm self-start">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Payment History
              </CardTitle>
              <CardDescription>Receipts and transaction log entries</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {history.length === 0 ? (
                <div className="text-center py-10">
                  <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-400 text-sm">No payment transactions recorded.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((h) => (
                    <div key={h._id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2 relative hover:bg-slate-100/50 transition-colors">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm text-slate-800">
                          {MONTH_NAMES[h.month - 1]} {h.year}
                        </span>
                        <span className="font-black text-emerald-600 text-sm">₹{h.amount}</span>
                      </div>
                      <div className="text-xs text-slate-400 space-y-1">
                        <div>
                          Transaction ID: <span className="font-mono text-slate-600 break-all">{h.transaction_id}</span>
                        </div>
                        <div>
                          Date: <span>{new Date(h.payment_date).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-[10px] font-semibold text-slate-500">
                          Method: <Badge className="bg-slate-200 text-slate-800 hover:bg-slate-200 border-0 text-[9px] uppercase px-1.5 py-0">{h.payment_method}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
