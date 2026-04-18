import { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

const remarkPlugins = [remarkGfm];
const rehypePlugins = [rehypeHighlight];

const components = {
  a({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  },
};

export default memo(function MarkdownContent({ content, className }: MarkdownContentProps) {
  const cls = useMemo(() => `markdown-content ${className ?? ''}`, [className]);
  return (
    <div className={cls}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
