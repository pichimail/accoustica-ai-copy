// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Users, Search, ArrowLeft, Crown, UserCog, Ban, 
  CheckCircle2, RefreshCw, Loader2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function AdminUsersPage() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      if (userData.role !== 'admin') {
        navigate(createPageUrl('Home'));
        return;
      }
      setUser(userData);
    };
    fetchUser();
  }, [navigate]);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['adminPlans'],
    queryFn: () => base44.entities.Plan.list(),
    enabled: !!user,
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }) => {
      await base44.entities.User.update(userId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setDialogOpen(false);
      toast.success('User updated successfully');
    },
  });

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || u.account_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getPlanName = (planId) => {
    if (!planId) return 'Free';
    const plan = plans.find(p => p.id === planId);
    return plan?.name || 'Unknown';
  };

  const handleToggleStatus = (targetUser) => {
    const newStatus = targetUser.account_status === 'suspended' ? 'active' : 'suspended';
    updateUserMutation.mutate({
      userId: targetUser.id,
      data: { account_status: newStatus }
    });
  };

  const handleChangePlan = (targetUser, planId) => {
    updateUserMutation.mutate({
      userId: targetUser.id,
      data: { plan_id: planId }
    });
  };

  const handleResetUsage = (targetUser) => {
    updateUserMutation.mutate({
      userId: targetUser.id,
      data: { 
        daily_usage: 0, 
        monthly_usage: 0,
        last_usage_reset: new Date().toISOString().split('T')[0],
        monthly_reset_date: new Date().toISOString().split('T')[0],
      }
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link to={createPageUrl('AdminDashboard')}>
            <Button variant="ghost" className="text-slate-400 hover:text-white mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Manage Users</h1>
              <p className="text-slate-400">{users.length} total users</p>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col md:flex-row gap-4 mb-6"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-40 bg-slate-800/50 border-slate-700 text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-slate-300 focus:text-white focus:bg-slate-700">All Status</SelectItem>
              <SelectItem value="active" className="text-slate-300 focus:text-white focus:bg-slate-700">Active</SelectItem>
              <SelectItem value="suspended" className="text-slate-300 focus:text-white focus:bg-slate-700">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Users Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400">User</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400">Plan</TableHead>
                    <TableHead className="text-slate-400">Usage</TableHead>
                    <TableHead className="text-slate-400">Tracks</TableHead>
                    <TableHead className="text-slate-400">Last Active</TableHead>
                    <TableHead className="text-slate-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.id} className="border-slate-700">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-700">
                            <img
                              src={u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.full_name || 'User'}`}
                              alt={u.full_name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="font-medium text-white">{u.full_name}</p>
                            <p className="text-sm text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          u.account_status === 'suspended' 
                            ? 'bg-red-500/20 text-red-400 border-red-500/30'
                            : 'bg-green-500/20 text-green-400 border-green-500/30'
                        }>
                          {u.account_status === 'suspended' ? 'Suspended' : 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30">
                          <Crown className="h-3 w-3 mr-1" />
                          {getPlanName(u.plan_id)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="text-white">{u.daily_usage || 0} today</p>
                          <p className="text-slate-400">{u.monthly_usage || 0} this month</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-white">{u.total_tracks || 0}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-400">{formatDate(u.last_active)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedUser(u);
                              setDialogOpen(true);
                            }}
                            className="text-slate-400 hover:text-white"
                          >
                            <UserCog className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleStatus(u)}
                            className={u.account_status === 'suspended' 
                              ? 'text-green-400 hover:text-green-300'
                              : 'text-red-400 hover:text-red-300'
                            }
                          >
                            {u.account_status === 'suspended' 
                              ? <CheckCircle2 className="h-4 w-4" />
                              : <Ban className="h-4 w-4" />
                            }
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </motion.div>

        {/* Edit User Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription className="text-slate-400">
                Manage user settings for {selectedUser?.full_name}
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Plan</label>
                  <Select
                    value={selectedUser.plan_id || ''}
                    onValueChange={(value) => handleChangePlan(selectedUser, value)}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Select plan" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {plans.map((plan) => (
                        <SelectItem 
                          key={plan.id} 
                          value={plan.id}
                          className="text-slate-300 focus:text-white focus:bg-slate-600"
                        >
                          {plan.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  onClick={() => handleResetUsage(selectedUser)}
                  className="w-full bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset Usage Counters
                </Button>
              </div>
            )}
            <DialogFooter>
              <Button 
                variant="ghost" 
                onClick={() => setDialogOpen(false)}
                className="text-slate-400"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}