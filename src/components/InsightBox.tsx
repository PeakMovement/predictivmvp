import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { formatYvesResponse } from '@/lib/formatYvesResponse';

interface InsightBoxProps {
  query: string;
  response: string;
  timestamp: string;
}

export function InsightBox({ query, response, timestamp }: InsightBoxProps) {
  const timeAgo = formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  const formattedResponse = formatYvesResponse(response);

  return (
    <Card className="mb-4 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100 break-words">
              {query}
            </CardTitle>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{timeAgo}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <Bot className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4 sm:p-5">
              <div className="text-sm text-gray-700 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                  components={{
                    // Paragraphs with proper spacing
                    p: ({ children }) => (
                      <p className="mb-4 last:mb-0 leading-relaxed">
                        {children}
                      </p>
                    ),
                    // Unordered lists with bullets
                    ul: ({ children }) => (
                      <ul className="my-3 space-y-2 list-disc list-outside ml-5">
                        {children}
                      </ul>
                    ),
                    // Ordered lists with numbers
                    ol: ({ children }) => (
                      <ol className="my-3 space-y-2 list-decimal list-outside ml-5">
                        {children}
                      </ol>
                    ),
                    // List items with proper spacing
                    li: ({ children }) => (
                      <li className="pl-1 leading-relaxed">
                        {children}
                      </li>
                    ),
                    // Bold text - emphasized
                    strong: ({ children }) => (
                      <strong className="font-semibold text-gray-900 dark:text-gray-100">
                        {children}
                      </strong>
                    ),
                    // Italic text - subtle emphasis
                    em: ({ children }) => (
                      <em className="italic text-gray-800 dark:text-gray-200">
                        {children}
                      </em>
                    ),
                    // Headings
                    h1: ({ children }) => (
                      <h1 className="text-lg font-bold mb-3 mt-4 first:mt-0 text-gray-900 dark:text-gray-100">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-base font-bold mb-2 mt-3 first:mt-0 text-gray-900 dark:text-gray-100">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-sm font-semibold mb-2 mt-3 first:mt-0 text-gray-900 dark:text-gray-100">
                        {children}
                      </h3>
                    ),
                    // Code blocks
                    code: ({ className, children }) => {
                      const isInline = !className;
                      if (isInline) {
                        return (
                          <code className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-mono text-xs">
                            {children}
                          </code>
                        );
                      }
                      return (
                        <code className="block p-3 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-mono text-xs overflow-x-auto my-2">
                          {children}
                        </code>
                      );
                    },
                    // Blockquotes
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-3 italic text-gray-600 dark:text-gray-400">
                        {children}
                      </blockquote>
                    ),
                    // Links
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {children}
                      </a>
                    ),
                  }}
                >
                  {formattedResponse}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
