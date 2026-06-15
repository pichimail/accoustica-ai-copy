// @ts-nocheck
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, Lightbulb, Wand2, Music, TrendingUp, 
  BarChart3, RefreshCw, Sparkles, CheckCircle2, AlertCircle
} from 'lucide-react';
import { base44 } from '@/api/exportClient';
import { toast } from 'sonner';
import { haptics } from '@/components/utils/haptics';
import BottomSheet from '@/components/mobile/BottomSheet';

export default function MusicTheoryAssistant({ open, onClose, track, onApplyFixes }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [isFixing, setIsFixing] = useState(false);
  const [activeTab, setActiveTab] = useState('analysis');

  const analyzeTrack = async () => {
    setIsAnalyzing(true);
    haptics.light();
    try {
      const { llmService } = await import('@/services/llmService');
      const response = await llmService.invoke({
        prompt: `Analyze this music track from a music theory perspective:
        Title: ${track.title}
        Genre: ${track.style}
        Prompt: ${track.prompt}
        ${track.lyrics ? `Lyrics: ${track.lyrics}` : ''}
        
        Provide comprehensive music theory analysis including:
        1. Chord progression analysis and suggestions
        2. Melodic structure and harmony recommendations
        3. Rhythmic complexity assessment
        4. Song structure analysis (verse, chorus, bridge, etc.)
        5. Key and scale analysis
        6. Identify any theoretical issues or areas for improvement
        7. Suggest specific fixes for each issue
        
        Be detailed and educational, explaining concepts clearly.`,
        response_json_schema: {
          type: "object",
          properties: {
            key: { type: "string" },
            scale: { type: "string" },
            chord_progression: { type: "string" },
            chord_suggestions: { type: "array", items: { type: "string" } },
            melodic_analysis: { type: "string" },
            harmony_suggestions: { type: "array", items: { type: "string" } },
            rhythmic_complexity: { type: "string" },
            rhythm_score: { type: "number" },
            song_structure: { type: "string" },
            structure_suggestions: { type: "array", items: { type: "string" } },
            issues: { 
              type: "array", 
              items: { 
                type: "object",
                properties: {
                  type: { type: "string" },
                  severity: { type: "string" },
                  description: { type: "string" },
                  fix: { type: "string" }
                }
              }
            },
            overall_score: { type: "number" },
            learning_tips: { type: "array", items: { type: "string" } }
          }
        }
      });

      setAnalysis(response);
      toast.success('Analysis complete!');
      haptics.success();
    } catch (error) {
      toast.error('Failed to analyze track');
      haptics.error();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyAiFixes = async () => {
    if (!analysis || !analysis.issues.length) {
      toast.info('No issues found to fix!');
      return;
    }

    setIsFixing(true);
    haptics.medium();
    try {
      const fixesPrompt = analysis.issues.map(issue => issue.fix).join('. ');
      
      const { llmService } = await import('@/services/llmService');
      const response = await llmService.invoke({
        prompt: `Generate an improved version prompt for this track, applying these music theory fixes:
        Original: ${track.prompt}
        Fixes needed: ${fixesPrompt}
        
        Create a new detailed prompt that incorporates all the fixes while maintaining the original style and feel.`,
        response_json_schema: {
          type: "object",
          properties: {
            improved_prompt: { type: "string" },
            changes_made: { type: "array", items: { type: "string" } }
          }
        }
      });

      toast.success('AI fixes generated!');
      haptics.success();
      onApplyFixes?.(response.improved_prompt);
    } catch (error) {
      toast.error('Failed to apply fixes');
      haptics.error();
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Music Theory Assistant" snapPoints={[0.95]}>
      <div className="space-y-6 pb-6">
        {!analysis ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4 border border-indigo-500/30">
              <BookOpen className="h-10 w-10 text-indigo-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">AI Music Theory Analysis</h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              Get expert music theory insights on your track including chord progressions, melody, rhythm, and structure
            </p>
            <Button
              onClick={analyzeTrack}
              disabled={isAnalyzing}
              size="lg"
              className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Analyze Track
                </>
              )}
            </Button>
          </motion.div>
        ) : (
          <>
            {/* Overall Score */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-2xl p-6 border border-indigo-500/20 text-center"
            >
              <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-2">
                {analysis.overall_score}/10
              </div>
              <p className="text-slate-300 font-medium">Music Theory Score</p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                  {analysis.key} {analysis.scale}
                </Badge>
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                  Rhythm: {analysis.rhythm_score}/10
                </Badge>
              </div>
            </motion.div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full bg-slate-800/50 grid grid-cols-4">
                <TabsTrigger value="analysis" className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-300">
                  <BarChart3 className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="chords" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300">
                  <Music className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="issues" className="data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-300">
                  <AlertCircle className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="learn" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300">
                  <BookOpen className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>

              <TabsContent value="analysis" className="space-y-4 mt-4">
                <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
                  <h4 className="font-semibold text-indigo-300 mb-2 flex items-center gap-2">
                    <Music className="h-4 w-4" />
                    Melodic Analysis
                  </h4>
                  <p className="text-slate-300 text-sm">{analysis.melodic_analysis}</p>
                </div>

                <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
                  <h4 className="font-semibold text-purple-300 mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Rhythmic Complexity
                  </h4>
                  <p className="text-slate-300 text-sm mb-3">{analysis.rhythmic_complexity}</p>
                  <div className="bg-slate-900/50 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                      style={{ width: `${analysis.rhythm_score * 10}%` }}
                    />
                  </div>
                </div>

                <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
                  <h4 className="font-semibold text-cyan-300 mb-2">Song Structure</h4>
                  <p className="text-slate-300 text-sm mb-3">{analysis.song_structure}</p>
                  {analysis.structure_suggestions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-400 font-medium">Suggestions:</p>
                      {analysis.structure_suggestions.map((suggestion, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                          <Lightbulb className="h-3 w-3 text-yellow-400 mt-0.5 flex-shrink-0" />
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="chords" className="space-y-4 mt-4">
                <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
                  <h4 className="font-semibold text-purple-300 mb-3">Current Progression</h4>
                  <div className="bg-slate-900/50 rounded-lg p-3 mb-4">
                    <code className="text-purple-400 text-sm">{analysis.chord_progression}</code>
                  </div>
                  
                  <h4 className="font-semibold text-pink-300 mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    AI Suggestions
                  </h4>
                  <div className="space-y-2">
                    {analysis.chord_suggestions.map((suggestion, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-pink-500/10 rounded-lg p-3 border border-pink-500/20"
                      >
                        <p className="text-slate-300 text-sm">{suggestion}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
                  <h4 className="font-semibold text-blue-300 mb-3">Harmony Recommendations</h4>
                  <div className="space-y-2">
                    {analysis.harmony_suggestions.map((suggestion, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                        {suggestion}
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="issues" className="space-y-4 mt-4">
                {analysis.issues.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-3" />
                    <p className="text-slate-300 font-medium">No issues found!</p>
                    <p className="text-slate-400 text-sm mt-1">Your track follows music theory well</p>
                  </div>
                ) : (
                  <>
                    {analysis.issues.map((issue, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={`rounded-xl p-4 border ${
                          issue.severity === 'high' 
                            ? 'bg-red-500/10 border-red-500/30' 
                            : issue.severity === 'medium'
                            ? 'bg-yellow-500/10 border-yellow-500/30'
                            : 'bg-blue-500/10 border-blue-500/30'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <AlertCircle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                            issue.severity === 'high' ? 'text-red-400' :
                            issue.severity === 'medium' ? 'text-yellow-400' : 'text-blue-400'
                          }`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-white">{issue.type}</h4>
                              <Badge className={`text-xs ${
                                issue.severity === 'high' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                                issue.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                                'bg-blue-500/20 text-blue-300 border-blue-500/30'
                              }`}>
                                {issue.severity}
                              </Badge>
                            </div>
                            <p className="text-slate-300 text-sm mb-3">{issue.description}</p>
                            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                              <p className="text-xs text-slate-400 mb-1 font-medium">Suggested Fix:</p>
                              <p className="text-sm text-green-400">{issue.fix}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    
                    <Button
                      onClick={applyAiFixes}
                      disabled={isFixing}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                    >
                      {isFixing ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Applying Fixes...
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-4 w-4 mr-2" />
                          AI Fix All Issues
                        </>
                      )}
                    </Button>
                  </>
                )}
              </TabsContent>

              <TabsContent value="learn" className="space-y-4 mt-4">
                <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl p-4 border border-amber-500/20">
                  <h4 className="font-semibold text-amber-300 mb-3 flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Learning Tips
                  </h4>
                  <div className="space-y-3">
                    {analysis.learning_tips.map((tip, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-3 bg-slate-900/30 rounded-lg p-3"
                      >
                        <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-amber-400 font-bold text-xs">{i + 1}</span>
                        </div>
                        <p className="text-slate-300 text-sm">{tip}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <Button
              variant="outline"
              onClick={analyzeTrack}
              className="w-full border-slate-700 hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Re-analyze Track
            </Button>
          </>
        )}
      </div>
    </BottomSheet>
  );
}