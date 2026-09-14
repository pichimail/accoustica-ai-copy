export function createPageUrl(pageName: string) {
    return '/' + pageName.replace(/ /g, '-');
}

export const getTrackStatusLabel = (status: string) => {
    const map: Record<string, string> = {
        queued: 'Queued for Generation',
        generating: 'Generating your track...',
        ready: 'Ready',
        failed: 'Generation Failed',
    };
    return map[status] || 'Unknown';
};
