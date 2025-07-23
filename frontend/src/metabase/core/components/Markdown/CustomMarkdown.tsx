import React, { useEffect, RefObject, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import type { Components } from "react-markdown";

// Helper to extract JSON code blocks and replace with ECharts
function extractAndReplaceJsonWithECharts(markdown: string) {
  // Regex to match ```json ... ``` blocks
  const jsonBlockRegex = /```json\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  const elements: (string | { type: 'echarts', option: any })[] = [];

  while ((match = jsonBlockRegex.exec(markdown)) !== null) {
    // Push text before the JSON block
    if (match.index > lastIndex) {
      elements.push(markdown.slice(lastIndex, match.index));
    }
    try {
      const option = JSON.parse(match[1]);
      elements.push({ type: 'echarts', option });
    } catch (e) {
      // If JSON parsing fails, just render as text
      elements.push('```json\n' + match[1] + '```');
    }
    lastIndex = jsonBlockRegex.lastIndex;
  }
  // Push remaining text
  if (lastIndex < markdown.length) {
    elements.push(markdown.slice(lastIndex));
  }
  return elements;
}

interface MarkdownTextProps {
  markdown: string;
  markdownRef: RefObject<HTMLDivElement>;
}

const CustomMarkdownText: React.FC<MarkdownTextProps> = ({
  markdown,
  markdownRef,
}) => {
  const isHtml = useMemo(() => {
    const trimmed = markdown.trim();
    return (
      trimmed.startsWith("```html") ||
      trimmed.startsWith("<!DOCTYPE html>") ||
      trimmed.startsWith("<html")
    );
  }, [markdown]);

  const htmlContent = useMemo(() => {
    if (isHtml) {
      return markdown.replace(/^```html\n?|```$/g, "").replace(/\\n/g, '  \n').trim();
    }
    return "";
  }, [markdown, isHtml]);

  useEffect(() => {
    const handleCopy = (e: ClipboardEvent): void => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const selectedText = selection.toString();
      const markdownElement = markdownRef.current;

      if (
        markdownElement &&
        markdownElement.contains(selection.anchorNode as Node)
      ) {
        e.preventDefault();
        e.clipboardData?.setData("text/plain", selectedText);
      }
    };

    const markdownElement = markdownRef.current;
    if (markdownElement) {
      markdownElement.addEventListener("copy", handleCopy as EventListener);

      const width = markdownElement.offsetWidth;
      markdownElement.style.setProperty(
        "--markdown-editor-width",
        `${width}px`
      );

      const links = markdownElement.querySelectorAll("a");
      links.forEach((link) => {
        if (link.hostname !== window.location.hostname) {
          link.setAttribute("target", "_blank");
          link.setAttribute("rel", "noopener noreferrer");
        }
      });
    }

    return () => {
      if (markdownElement) {
        markdownElement.removeEventListener(
          "copy",
          handleCopy as EventListener
        );
      }
    };
  }, [markdownRef]);

  const components: Components = {
    h1: ({ children }) => (
      <h1 className="text-2xl font-medium text-[#1b1f23] mt-6 mb-3">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-xl font-medium text-[#1b1f23] mt-6 mb-3">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-lg font-medium text-[#1b1f23] mt-6 mb-3">
        {children}
      </h3>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#0366d6] hover:underline"
      >
        {children}
      </a>
    ),
    code({ node, inline, className, children, ...props }: any) {
      return inline ? (
        <code
          className="bg-[#f6f8fa] text-[#e83e8c] px-1 py-[2px] rounded text-[0.85rem]"
          {...props}
        >
          {children}
        </code>
      ) : (
        <pre className="bg-[#f6f8fa] p-2 rounded-md overflow-auto">
          <code className="text-[#24292f]" {...props}>
            {children}
          </code>
        </pre>
      );
    },
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-[#dfe2e5] bg-[#f6f8fa] text-[#6a737d] p-2 my-4">
        {children}
      </blockquote>
    ),
    ul: ({ children }) => <ul className="list-disc pl-8 mb-2">{children}</ul>,
    ol: ({ children }) => (
      <ol className="list-decimal pl-8 mb-2">{children}</ol>
    ),
    li: ({ children }) => <li className="mb-1 last:mb-0">{children}</li>,
    table: ({ children }) => (
      <div className="overflow-x-auto my-2">
        <table className="min-w-[350px] border-separate border-spacing-0 whitespace-nowrap">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-[#f8fbfc]">{children}</thead>,
    th: ({ children }) => (
      <th className="text-left px-2 py-1 border border-[#e2e3e5] font-medium">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-2 py-1 border border-[#e2e3e5]">{children}</td>
    ),
    hr: () => <hr className="h-px bg-[#e2e3e5] border-0 my-2" />,
    img: ({ src, alt }) => (
      <img src={src ?? ""} alt={alt ?? ""} className="max-w-[90%] h-auto" />
    ),
  };

  // Render raw HTML inside an iframe
  if (isHtml) {
    const iframeContent = `
      <html>
        <head>
        <style>
        /* Hide scrollbar buttons */
        ::-webkit-scrollbar-button {
          display: none;
        }

        /* Main scrollbar area */
        ::-webkit-scrollbar {
          background-color: transparent;
          width: 4px;
          height: 4px;
        }

        /* Scrollbar track */
        ::-webkit-scrollbar-track {
          background-color: transparent;
        }

        /* Scrollbar thumb */
        ::-webkit-scrollbar-thumb {
          background-color: #babac0;
          border-radius: 16px;
        }
        </style>
        <base target="_blank" /></head>
        <body style="margin:0;padding:0;">${htmlContent}</body>
      </html>
    `;

    return (
      <iframe
        title="HTML Preview"
        ref={markdownRef as RefObject<HTMLIFrameElement>}
        srcDoc={iframeContent}
        className="w-full h-[calc(100vh-285px)]"
        sandbox="allow-same-origin allow-popups allow-scripts allow-forms"
        tabIndex={0}
        allow="autoplay; fullscreen"
      />
    );
  }

  // Normal Markdown rendering with ECharts support
  const elements = extractAndReplaceJsonWithECharts(markdown);
  return (
    <div
      ref={markdownRef}
      className="flex flex-col gap-sm text-sm leading-[21px] text-[#2c2d33] p-md"
    >
      {elements.map((el, idx) => {
        if (typeof el === 'string') {
          // Render markdown as usual
          return (
            <ReactMarkdown
              key={idx}
              remarkPlugins={[remarkGfm, remarkBreaks]}
              components={components}
            >
              {el.replace(/\n/g, '  \n')}
            </ReactMarkdown>
          );
        } 
        return null;
      })}
    </div>
  );
};

export default CustomMarkdownText;
