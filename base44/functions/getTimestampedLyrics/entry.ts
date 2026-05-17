import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SUNO_API_BASE = 'https://api.kie.ai/api/v1';
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, x-base44-token',
};

function toSeconds(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return n;
}

function normalizeWordTimestamp(word: any) {
    const text = String(word?.word ?? word?.text ?? word?.token ?? '').trim();
    if (!text) return null;

    const startMsCandidate = toSeconds(word?.startMs) ?? toSeconds(word?.start_ms) ?? toSeconds(word?.timeMs);
    const endMsCandidate = toSeconds(word?.endMs) ?? toSeconds(word?.end_ms);

    const startS =
        toSeconds(word?.startS) ??
        toSeconds(word?.start_s) ??
        (startMsCandidate !== null ? startMsCandidate / 1000 : null) ??
        toSeconds(word?.time) ??
        0;

    const endS =
        toSeconds(word?.endS) ??
        toSeconds(word?.end_s) ??
        (endMsCandidate !== null ? endMsCandidate / 1000 : null) ??
        Math.max(startS + 0.24, startS);

    return {
        word: text,
        startS,
        endS: Math.max(endS, startS),
    };
}

function joinWords(words: { word: string }[]) {
    return words.reduce((line, curr, idx) => {
        if (idx === 0) return curr.word;
        if (/^[,.;!?)]/.test(curr.word)) return `${line}${curr.word}`;
        if (/^'/.test(curr.word)) return `${line}${curr.word}`;
        return `${line} ${curr.word}`;
    }, '');
}

function buildLinesFromWords(alignedWords: Array<{ word: string; startS: number; endS: number }>) {
    if (!alignedWords.length) return [];

    const lines: Array<{
        text: string;
        time: number;
        startS: number;
        endS: number;
        words: Array<{ text: string; startS: number; endS: number }>;
    }> = [];

    let current: Array<{ word: string; startS: number; endS: number }> = [];
    for (let i = 0; i < alignedWords.length; i++) {
        const word = alignedWords[i];
        const prev = alignedWords[i - 1];
        const gap = prev ? Math.max(0, word.startS - prev.endS) : 0;
        const prevEndsSentence = prev ? /[.!?]$/.test(prev.word) : false;
        const shouldBreak =
            current.length >= 8 ||
            gap >= 1.15 ||
            (prevEndsSentence && gap >= 0.45);

        if (current.length > 0 && shouldBreak) {
            const first = current[0];
            const last = current[current.length - 1];
            lines.push({
                text: joinWords(current),
                time: first.startS,
                startS: first.startS,
                endS: last.endS,
                words: current.map(w => ({ text: w.word, startS: w.startS, endS: w.endS })),
            });
            current = [];
        }
        current.push(word);
    }

    if (current.length) {
        const first = current[0];
        const last = current[current.length - 1];
        lines.push({
            text: joinWords(current),
            time: first.startS,
            startS: first.startS,
            endS: last.endS,
            words: current.map(w => ({ text: w.word, startS: w.startS, endS: w.endS })),
        });
    }

    return lines;
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
        }

        const { taskId, audioId } = await req.json();

        if (!taskId || !audioId) {
            return Response.json({ error: 'taskId and audioId are required' }, { status: 400, headers: corsHeaders });
        }

        const apiKey = Deno.env.get('SUNO_API_KEY');
        if (!apiKey) {
            return Response.json({ error: 'SUNO_API_KEY not configured' }, { status: 500, headers: corsHeaders });
        }

        const response = await fetch(`${SUNO_API_BASE}/generate/get-timestamped-lyrics`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ taskId, audioId }),
        });

        const data = await response.json();

        if (data.code !== 200) {
            console.error('Suno API error:', data);
            return Response.json({ 
                error: data.msg || 'Failed to get timestamped lyrics',
                details: data
            }, { status: 400, headers: corsHeaders });
        }

        const rawPayload = data.data || {};
        const wordCandidates = Array.isArray(rawPayload.alignedWords)
            ? rawPayload.alignedWords
            : Array.isArray(rawPayload.words)
                ? rawPayload.words
                : [];

        const alignedWords = wordCandidates
            .map(normalizeWordTimestamp)
            .filter((word: any) => Boolean(word))
            .sort((a, b) => a.startS - b.startS);

        let karaokeLines = buildLinesFromWords(alignedWords);

        if (!karaokeLines.length && Array.isArray(rawPayload.lines)) {
            karaokeLines = rawPayload.lines
                .map((line: any) => {
                    const text = String(line?.text ?? line?.content ?? '').trim();
                    if (!text) return null;

                    const startS =
                        toSeconds(line?.startS) ??
                        toSeconds(line?.start_s) ??
                        (toSeconds(line?.startMs) ?? toSeconds(line?.start_ms) ?? 0) / 1000;

                    const endS =
                        toSeconds(line?.endS) ??
                        toSeconds(line?.end_s) ??
                        (toSeconds(line?.endMs) ?? toSeconds(line?.end_ms) ?? 0) / 1000;

                    return {
                        text,
                        time: startS,
                        startS,
                        endS: Math.max(endS, startS),
                        words: [],
                    };
                })
                .filter(Boolean)
                .sort((a, b) => a.time - b.time);
        }

        return Response.json({
            success: true,
            data: {
                ...rawPayload,
                alignedWords,
                karaokeLines,
                waveformData: rawPayload.waveformData ?? null,
                isStreamed: Boolean(rawPayload.isStreamed),
            },
        }, { headers: corsHeaders });

    } catch (error) {
        console.error('Error in getTimestampedLyrics:', error);
        return Response.json({ 
            error: error.message || 'Failed to get timestamped lyrics'
        }, { status: 500, headers: corsHeaders });
    }
});
