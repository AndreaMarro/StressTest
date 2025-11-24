import 'katex/dist/katex.min.css';
import katex from 'katex';

export const MathText = ({ content }: { content: string }) => {
    const renderSegment = (segment: string, key: string) => {
        // Check for LaTeX delimiters: $...$
        if (segment.startsWith('$') && segment.endsWith('$')) {
            const latex = segment.slice(1, -1);
            const html = katex.renderToString(latex, { throwOnError: false });
            return <span key={key} dangerouslySetInnerHTML={{ __html: html }} />;
        }
        return <span key={key}>{segment}</span>;
    };

    // Split by $...$ but keep delimiters
    // Also sanitize common LaTeX errors before splitting
    const sanitizedContent = content.replace(/\\cdotp/g, '\\cdot');
    const parts = sanitizedContent.split(/(\$[^$]+\$)/g);

    return (
        <span className="inline-block leading-relaxed font-medium text-terminal-text">
            {parts.map((part, i) => {
                // Create stable key using index and content hash
                const key = `${i}-${part.substring(0, 20)}`;
                return renderSegment(part, key);
            })}
        </span>
    );
};
