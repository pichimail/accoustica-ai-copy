// @ts-nocheck
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X, Save, Upload } from 'lucide-react';
import { base44 } from '@/api/exportClient';
import { toast } from 'sonner';
import { haptics } from '@/components/utils/haptics';

export default function TrackEditDialog({ open, onClose, track, onSave }) {
  const [title, setTitle] = useState(track?.title || '');
  const [style, setStyle] = useState(track?.style || '');
  const [prompt, setPrompt] = useState(track?.prompt || '');
  const [coverImage, setCoverImage] = useState(track?.cover_image_url || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const hasChanges = () => {
    return title !== track?.title || 
           style !== track?.style || 
           prompt !== track?.prompt || 
           coverImage !== track?.cover_image_url;
  };

  const handleClose = () => {
    if (hasChanges()) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    haptics.medium();
    try {
      await base44.entities.Track.update(track.id, {
        title,
        style,
        prompt,
        cover_image_url: coverImage,
      });
      
      toast.success('Track updated successfully');
      haptics.success();
      onSave?.();
      onClose();
    } catch (error) {
      toast.error('Failed to update track');
      haptics.error();
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setCoverImage(file_url);
      toast.success('Image uploaded');
    } catch (error) {
      toast.error('Failed to upload image');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Track Details</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Cover Image */}
            <div>
              <Label className="text-slate-300 mb-2 block">Cover Image</Label>
              <div className="flex items-center gap-3">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
                  <img 
                    src={coverImage || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200'} 
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                </div>
                <label className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button type="button" variant="outline" size="sm" className="w-full" asChild>
                    <span className="cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Image
                    </span>
                  </Button>
                </label>
              </div>
            </div>

            {/* Title */}
            <div>
              <Label className="text-slate-300 mb-2 block">Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Track title"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            {/* Artist/Style */}
            <div>
              <Label className="text-slate-300 mb-2 block">Artist / Style</Label>
              <Input
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                placeholder="Artist or style"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            {/* Description */}
            <div>
              <Label className="text-slate-300 mb-2 block">Description</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Track description"
                className="bg-slate-800 border-slate-700 text-white min-h-[80px]"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1 border-slate-700 text-slate-300"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !hasChanges()}
                className="flex-1 bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Close Dialog */}
      <Dialog open={showConfirmClose} onOpenChange={setShowConfirmClose}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Discard Changes?</DialogTitle>
          </DialogHeader>
          <p className="text-slate-400 text-sm">
            You have unsaved changes. Do you want to discard them?
          </p>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmClose(false)}
              className="flex-1"
            >
              Keep Editing
            </Button>
            <Button
              onClick={() => {
                setShowConfirmClose(false);
                onClose();
              }}
              className="flex-1 bg-red-500 hover:bg-red-600"
            >
              Discard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}