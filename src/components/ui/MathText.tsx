import 'katex/dist/katex.min.css';
import katex from 'katex';

export const MathText = ({ content }: { content: string }) => {
    const renderSegment = (segment: string, index: number) => {
        // Check for LaTeX delimiters: $...$
        if (segment.startsWith('$') && segment.endsWith('$')) {
            try {
                const latex = segment.slice(1, -1);
                const html = katex.renderToString(latex, { throwOnError: false });
                return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
            } catch (e) {
                return <span key={index} className="text-red-600 font-mono text-xs">{segment}</span>;
            }
        }
        return <span key={index}>{segment}</span>;
    };

    // Split by $...$ but keep delimiters
    const parts = content.split(/(\$[^$]+\$)/g);

    return (
        <span className="inline-block leading-relaxed font-medium text-terminal-text">
            {parts.map((part, i) => renderSegment(part, i))}
        </span>
    );
};
