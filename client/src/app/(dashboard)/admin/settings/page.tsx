'use client';

import { useState, useEffect } from 'react';
import { useComplaints } from '@/hooks/useComplaints';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Settings, Shield } from 'lucide-react';

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const { getSettings, updateSetting } = useComplaints();

  const [overdueDays, setOverdueDays] = useState<number>(3);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch settings
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await getSettings();
      if (response.success && response.data) {
        setOverdueDays(response.data.overdue_threshold_days || 3);
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to fetch settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (overdueDays < 1 || overdueDays > 30) {
      toast({
        title: 'Invalid value',
        description: 'Overdue threshold must be between 1 and 30 days.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      await updateSetting('overdue_threshold_days', overdueDays);
      toast({
        title: 'Settings Saved',
        description: 'Overdue threshold updated successfully.',
      });
      fetchSettings();
    } catch (err: any) {
      toast({
        title: 'Failed to update settings',
        description: err.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-600 mt-1">Configure parameters for society tracking services</p>
      </div>

      <div className="max-w-xl">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              General Tracking Settings
            </CardTitle>
            <CardDescription>
              Adjust threshold variables for complaints tracking and overdue escalation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4 py-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-10 bg-gray-100 rounded w-full"></div>
                <div className="h-10 bg-gray-200 rounded w-1/3"></div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="overdueDays">
                    Overdue Threshold (in Days)
                  </Label>
                  <Input
                    id="overdueDays"
                    type="number"
                    min={1}
                    max={30}
                    value={overdueDays}
                    onChange={(e) => setOverdueDays(parseInt(e.target.value) || 3)}
                    required
                  />
                  <p className="text-xs text-slate-500">
                    Complaints remaining open beyond this limit will be flagged as &quot;Overdue&quot; and bubble to the top of the complaints list.
                  </p>
                </div>

                <div className="pt-2">
                  <Button 
                    type="submit" 
                    disabled={saving}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
