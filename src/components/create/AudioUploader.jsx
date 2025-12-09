import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Music, Loader2, Wand2, X } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function AudioUploader({ onAnalysisComplete, onStyleTransfer }) {
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast.error('Please upload an audio file');
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploadedFile({ name: file.name, url: file_url });
      toast.success('Audio uploaded!');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const analyzeAudio = async () => {
    if (!uploadedFile) return;

    setAnalyzing(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this audio file and extract: genre, mood, tempo (BPM), key, energy level (1-10), style tags. Return as JSON.`,
        file_urls: [uploadedFile.url],
        response_json_schema: {
          type: "object",
          properties: {
            genre: { type: "string" },
            mood: { type: "string" },
            tempo: { type: "number" },
            key: { type: "string" },
            energy: { type: "number" },
            style_tags: { type: "array", items: { type: "string" } }
          }
        }
      });

      setAnalysis(response);
      onAnalysisComplete?.(response);
      toast.success('Audio analyzed!');
    } catch (error) {
      toast.error('Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleStyleTransfer = () => {
    if (!uploadedFile || !analysis) return;
    onStyleTransfer?.(uploadedFile.url, analysis);
  };

  return (
    <div className="space-y-4 p-4 bg-slate-800/30 rounded-xl border border-slate-700">
      <div className="flex items-center justify-between">
        <Label className="text-slate-300">Audio Upload</Label>
        {uploadedFile && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setUploadedFile(null);
              setAnalysis(null);
            }}
            className="h-6 text-xs text-slate-400 hover:text-white"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {!uploadedFile ? (
        <label className="block cursor-pointer">
          <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-slate-600 transition-colors">
            <Upload className="h-8 w-8 text-slate-500 mx-auto mb-2" />
            <p className="text-sm text-slate-400 mb-1">Upload audio for style transfer</p>
            <p className="text-xs text-slate-500">MP3, WAV, M4A up to 10MB</p>
          </div>
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
            <Music className="h-5 w-5 text-violet-400" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{uploadedFile.name}</p>
              <p className="text-xs text-slate-400">Ready for analysis</p>
            </div>
          </div>

          {!analysis ? (
            <Button
              type="button"
              onClick={analyzeAudio}
              disabled={analyzing}
              className="w-full bg-violet-600 hover:bg-violet-700"
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Analyze Audio
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-800 p-2 rounded">
                  <span className="text-slate-500">Genre:</span>
                  <p className="text-white font-medium">{analysis.genre}</p>
                </div>
                <div className="bg-slate-800 p-2 rounded">
                  <span className="text-slate-500">Mood:</span>
                  <p className="text-white font-medium">{analysis.mood}</p>
                </div>
                <div className="bg-slate-800 p-2 rounded">
                  <span className="text-slate-500">Tempo:</span>
                  <p className="text-white font-medium">{analysis.tempo} BPM</p>
                </div>
                <div className="bg-slate-800 p-2 rounded">
                  <span className="text-slate-500">Energy:</span>
                  <p className="text-white font-medium">{analysis.energy}/10</p>
                </div>
              </div>

              {analysis.style_tags && (
                <div className="flex flex-wrap gap-1">
                  {analysis.style_tags.map((tag, i) => (
                    <span key={i} className="px-2 py-1 bg-violet-500/20 text-violet-300 text-xs rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <Button
                type="button"
                onClick={handleStyleTransfer}
                className="w-full bg-gradient-to-r from-violet-500 to-pink-500"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Use for Style Transfer
              </Button>
            </div>
          )}
        </motion.div>
      )}

      {uploading && (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-6 w-6 text-violet-400 animate-spin" />
        </div>
      )}
    </div>
  );
}