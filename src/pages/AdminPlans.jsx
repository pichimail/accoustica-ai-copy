// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Crown, ArrowLeft, Plus, Edit2, Trash2, Loader2,
  Zap, Calendar, Clock, Users
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const defaultPlan = {
  name: '',
  description: '',
  daily_limit: 5,
  monthly_limit: 100,
  max_duration: 4,
  concurrent_jobs: 1,
  features: [],
  is_active: true,
  price_monthly: 0,
  model_access: ['V4', 'V4_5'],
  priority: 10,
};

export default function AdminPlansPage() {
  const [user, setUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState(defaultPlan);
  const [newFeature, setNewFeature] = useState('');
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

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['adminPlansPage'],
    queryFn: () => base44.entities.Plan.list('priority'),
    enabled: !!user,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['adminUsersForPlans'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user,
  });

  const createPlanMutation = useMutation({
    mutationFn: (data) => base44.entities.Plan.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPlansPage'] });
      setDialogOpen(false);
      setFormData(defaultPlan);
      toast.success('Plan created successfully');
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Plan.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPlansPage'] });
      setDialogOpen(false);
      setEditingPlan(null);
      setFormData(defaultPlan);
      toast.success('Plan updated successfully');
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: (id) => base44.entities.Plan.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPlansPage'] });
      toast.success('Plan deleted');
    },
  });

  const openEditDialog = (plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name || '',
      description: plan.description || '',
      daily_limit: plan.daily_limit || 5,
      monthly_limit: plan.monthly_limit || 100,
      max_duration: plan.max_duration || 4,
      concurrent_jobs: plan.concurrent_jobs || 1,
      features: plan.features || [],
      is_active: plan.is_active !== false,
      price_monthly: plan.price_monthly || 0,
      model_access: plan.model_access || ['V4', 'V4_5'],
      priority: plan.priority || 10,
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingPlan(null);
    setFormData(defaultPlan);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editingPlan) {
      updatePlanMutation.mutate({ id: editingPlan.id, data: formData });
    } else {
      createPlanMutation.mutate(formData);
    }
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData({
        ...formData,
        features: [...formData.features, newFeature.trim()],
      });
      setNewFeature('');
    }
  };

  const removeFeature = (index) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index),
    });
  };

  const getUsersCount = (planId) => {
    return users.filter(u => u.plan_id === planId).length;
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
      <div className="max-w-6xl mx-auto">
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <Crown className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Manage Plans</h1>
                <p className="text-slate-400">{plans.length} plans</p>
              </div>
            </div>
            <Button 
              onClick={openCreateDialog}
              className="bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Plan
            </Button>
          </div>
        </motion.div>

        {/* Plans Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {plans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`bg-slate-800/50 border-slate-700 relative overflow-hidden ${
                  !plan.is_active ? 'opacity-60' : ''
                }`}>
                  {!plan.is_active && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-slate-600/50 text-slate-400">Inactive</Badge>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Crown className="h-5 w-5 text-yellow-400" />
                      {plan.name}
                    </CardTitle>
                    {plan.description && (
                      <p className="text-sm text-slate-400">{plan.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-3xl font-bold text-white">
                      ${plan.price_monthly || 0}
                      <span className="text-lg text-slate-400 font-normal">/mo</span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-2">
                          <Zap className="h-4 w-4" /> Daily Limit
                        </span>
                        <span className="text-white">{plan.daily_limit}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-2">
                          <Calendar className="h-4 w-4" /> Monthly Limit
                        </span>
                        <span className="text-white">{plan.monthly_limit}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-2">
                          <Clock className="h-4 w-4" /> Max Duration
                        </span>
                        <span className="text-white">{plan.max_duration} min</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-2">
                          <Users className="h-4 w-4" /> Users
                        </span>
                        <span className="text-white">{getUsersCount(plan.id)}</span>
                      </div>
                    </div>

                    {plan.features && plan.features.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {plan.features.map((feature, i) => (
                          <Badge key={i} variant="outline" className="bg-slate-700/50 text-slate-300 border-slate-600 text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(plan)}
                        className="flex-1 bg-slate-700/50 border-slate-600 text-white hover:bg-slate-700"
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm('Delete this plan?')) {
                            deletePlanMutation.mutate(plan.id);
                          }
                        }}
                        className="bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPlan ? 'Edit Plan' : 'Create Plan'}</DialogTitle>
              <DialogDescription className="text-slate-400">
                {editingPlan ? 'Update plan settings' : 'Add a new subscription plan'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-slate-300">Plan Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                    placeholder="e.g., Pro"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-slate-300">Description</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                    placeholder="Brief description"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Daily Limit</Label>
                  <Input
                    type="number"
                    value={formData.daily_limit}
                    onChange={(e) => setFormData({ ...formData, daily_limit: parseInt(e.target.value) || 0 })}
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Monthly Limit</Label>
                  <Input
                    type="number"
                    value={formData.monthly_limit}
                    onChange={(e) => setFormData({ ...formData, monthly_limit: parseInt(e.target.value) || 0 })}
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Max Duration (min)</Label>
                  <Input
                    type="number"
                    value={formData.max_duration}
                    onChange={(e) => setFormData({ ...formData, max_duration: parseInt(e.target.value) || 0 })}
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Concurrent Jobs</Label>
                  <Input
                    type="number"
                    value={formData.concurrent_jobs}
                    onChange={(e) => setFormData({ ...formData, concurrent_jobs: parseInt(e.target.value) || 1 })}
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Price/Month ($)</Label>
                  <Input
                    type="number"
                    value={formData.price_monthly}
                    onChange={(e) => setFormData({ ...formData, price_monthly: parseFloat(e.target.value) || 0 })}
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Priority</Label>
                  <Input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 10 })}
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <div>
                  <p className="font-medium text-white">Active</p>
                  <p className="text-sm text-slate-400">Plan is available for users</p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              <div>
                <Label className="text-slate-300">Features</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="Add a feature"
                  />
                  <Button type="button" onClick={addFeature} variant="outline" className="bg-slate-700 border-slate-600">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.features.map((feature, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="bg-slate-700/50 text-slate-300 border-slate-600 cursor-pointer hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400"
                      onClick={() => removeFeature(i)}
                    >
                      {feature} ×
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-slate-400">
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!formData.name || createPlanMutation.isPending || updatePlanMutation.isPending}
                className="bg-violet-500 hover:bg-violet-600"
              >
                {(createPlanMutation.isPending || updatePlanMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingPlan ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}