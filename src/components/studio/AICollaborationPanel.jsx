import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Music, Lightbulb, CheckCircle2, Loader2, Copy, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function AICollaborationPanel({ track }) {
  const [generating, setGenerating] = useState(false);
  const [lyricsPrompt, setLyricsPrompt] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [summary, setSummary] = useState(null);

  const generateLyricsSuggestion = async () => {
    if (!lyricsPrompt.trim()) {
      toast.error('Please describe what lyrics you need');
      return;
    }

    setGenerating(true);
    try {
      const { llmService } = await import('@/services/llmService');
      const response = await llmService.invoke({
        prompt: `You are a professional songwriter. Based on this request: "${lyricsPrompt}", generate creative lyrics suggestions. Provide 3 different variations that are unique and emotionally resonant. Format as JSON array with fields: lyrics (string), style (string), mood (string).`,
        response_json_schema: {
          type: 'object',
          properties: {
            suggestions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  lyrics: { type: 'string' },
                  style: { type: 'string' },
                  mood: { type: 'string' },
                },
              },
            },
          },
        },
      });

      setSuggestions(response.suggestions || []);
      toast.success('AI suggestions generated!');
    } catch (error) {
      toast.error('Failed to generate suggestions');
    } finally {
      setGenerating(false);
    }
  };

  const generateFeedback = async () => {
    setGenerating(true);
    try {
      const { llmService } = await import('@/services/llmService');
      const response = await llmService.invoke({
        prompt: `Analyze this music track for a collaborative session: Title: "${track.title}", Style: "${track.style}", Prompt: "${track.prompt}". Provide constructive feedback on: 1) Track structure and arrangement, 2) Genre/style consistency, 3) Areas for improvement, 4) Strengths. Be specific and actionable.`,
        add_context_from_internet: false,
      });

      setFeedback(response);
      toast.success('AI feedback generated!');
    } catch (error) {
      toast.error('Failed to generate feedback');
    } finally {
      setGenerating(false);
    }
  };

  const generateSessionSummary = async () => {
    setGenerating(true);
    try {
      const { llmService } = await import('@/services/llmService');
      const response = await llmService.invoke({
        prompt: `Create a session summary for this collaborative music project: Track: "${track.title}", Style: "${track.style}". Generate: 1) Session overview, 2) Key decisions made, 3) Action items for next session, 4) Technical notes. Format professionally.`,
        response_json_schema: {
          type: 'object',
          properties: {
            overview: { type: 'string' },
            decisions: { type: 'array', items: { type: 'string' } },
            action_items: { type: 'array', items: { type: 'string' } },
            technical_notes: { type: 'string' },
          },
        },
      });

      setSummary(response);
      toast.success('Session summary created!');
    } catch (error) {
      toast.error('Failed to generate summary');
    } finally {
      setGenerating(false);
    }
  };

  const copySuggestion = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <Card className="bg-slate-900/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-400" />
          AI Collaboration Tools
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="lyrics" className="space-y-4">
          <TabsList className="bg-slate-800 border border-slate-700 grid grid-cols-3">
            <TabsTrigger value="lyrics" className="data-[state=active]:bg-violet-500/20">
              <Music className="h-4 w-4 mr-2" />
              Co-Write
            </TabsTrigger>
            <TabsTrigger value="feedback" className="data-[state=active]:bg-violet-500/20">
              <Lightbulb className="h-4 w-4 mr-2" />
              Feedback
            </TabsTrigger>
            <TabsTrigger value="summary" className="data-[state=active]:bg-violet-500/20">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Summary
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lyrics" className="space-y-4">
            <div>
              <Textarea
                placeholder="Describe the lyrics you need... (e.g., 'uplifting chorus about overcoming challenges')"
                value={lyricsPrompt}
                onChange={(e) => setLyricsPrompt(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
              />
              <Button
                onClick={generateLyricsSuggestion}
                disabled={generating || !lyricsPrompt.trim()}
                className="w-full mt-2 bg-violet-600 hover:bg-violet-700"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Suggestions
                  </>
                )}
              </Button>
            </div>

            <ScrollArea className="h-[400px]">
              <AnimatePresence>
                {suggestions.length > 0 && (
                  <div className="space-y-3">
                    {suggestions.map((suggestion, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-slate-800/50 rounded-lg border border-slate-700"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex gap-2">
                            <Badge variant="outline" className="bg-violet-500/20 text-violet-400 border-violet-500/30">
                              {suggestion.style}
                            </Badge>
                            <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                              {suggestion.mood}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copySuggestion(suggestion.lyrics)}
                            className="h-7 w-7 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-slate-300 text-sm whitespace-pre-wrap">
                          {suggestion.lyrics}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="feedback" className="space-y-4">
            <Button
              onClick={generateFeedback}
              disabled={generating}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Get AI Feedback
                </>
              )}
            </Button>

            {feedback && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <ThumbsUp className="h-4 w-4 text-green-400" />
                    <h4 className="text-white font-medium">AI Feedback</h4>
                  </div>
                  <p className="text-slate-300 text-sm whitespace-pre-wrap">{feedback}</p>
                </div>
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="summary" className="space-y-4">
            <Button
              onClick={generateSessionSummary}
              disabled={generating}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Generate Summary
                </>
              )}
            </Button>

            {summary && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                  <h4 className="text-white font-medium mb-2">Session Overview</h4>
                  <p className="text-slate-300 text-sm">{summary.overview}</p>
                </div>

                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                  <h4 className="text-white font-medium mb-2">Key Decisions</h4>
                  <ul className="space-y-1">
                    {summary.decisions?.map((decision, idx) => (
                      <li key={idx} className="text-slate-300 text-sm flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                        {decision}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                  <h4 className="text-white font-medium mb-2">Action Items</h4>
                  <ul className="space-y-1">
                    {summary.action_items?.map((item, idx) => (
                      <li key={idx} className="text-slate-300 text-sm flex items-start gap-2">
                        <span className="text-violet-400">→</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {summary.technical_notes && (
                  <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                    <h4 className="text-white font-medium mb-2">Technical Notes</h4>
                    <p className="text-slate-300 text-sm">{summary.technical_notes}</p>
                  </div>
                )}
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}