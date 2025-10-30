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
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
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
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
              <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                    ul: ({ children }) => <ul className="my-2 space-y-1 list-disc list-inside">{children}</ul>,
                    ol: ({ children }) => <ol className="my-2 space-y-1 list-decimal list-inside">{children}</ol>,
                    li: ({ children }) => <li className="ml-2">{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong>,
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
