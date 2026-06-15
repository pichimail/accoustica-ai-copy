import React, { useState } from 'react';
import { base44 } from '@/api/exportClient';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function StyleBooster({ onStyleBoosted }) {
  const [styleInput, setStyleInput] = useState('');
  const [isBoosting, setIsBoosting] = useState(false);
  const [boostedResult, setBoostedResult] = useState('');

  const handleBoost = async () => {
    if (!styleInput.trim()) {
      toast.error('Please enter a style description');
      return;
    }

    setIsBoosting(true);
    try {
      const response = await base44.functions.invoke('boostMusicStyle', {
        content: styleInput,
      });

      if (response.data.success) {
        const result = response.data.result;
        setBoostedResult(result);
        onStyleBoosted?.(result);
        toast.success('Style enhanced successfully!');
      } else {
        toast.error('Failed to enhance style');
      }
    } catch (error) {
      console.error('Style boost error:', error);
      toast.error('Failed to enhance style');
    } finally {
      setIsBoosting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <label className="text-sm text-slate-400 mb-2 block">
            Boost Your Style (V4.5+ Feature)
          </label>
          <Textarea
            placeholder="e.g., Pop, Mysterious"
            value={styleInput}
            onChange={(e) => setStyleInput(e.target.value)}
            className="bg-slate-800/50 border-slate-700 text-white min-h-20"
          />
        </div>
        <Button
          onClick={handleBoost}
          disabled={isBoosting || !styleInput.trim()}
          className="mt-7 bg-violet-500 hover:bg-violet-600"
        >
          {isBoosting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
        </Button>
      </div>

      {boostedResult && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <p className="text-sm text-slate-400 mb-2">Enhanced Style:</p>
          <p className="text-white">{boostedResult}</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={() => {
              navigator.clipboard.writeText(boostedResult);
              toast.success('Copied to clipboard');
            }}
          >
            Copy to Style Field
          </Button>
        </div>
      )}
    </div>
  );
}