import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Bot } from 'lucide-react';

interface InsightBoxProps {
  query: string;
  response: string;
  timestamp: string;
}

export function InsightBox({ query, response, timestamp }: InsightBoxProps) {
  const timeAgo = formatDistanceToNow(new Date(timestamp), { addSuffix: true });

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
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {response}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
