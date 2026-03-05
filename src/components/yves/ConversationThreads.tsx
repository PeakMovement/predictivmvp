import { useMemo } from 'react';
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';
import { InsightBox } from '@/components/InsightBox';
import { InsightHistoryItem } from '@/api/yves';

interface ConversationThreadsProps {
  insights: InsightHistoryItem[];
}

interface GroupedInsights {
  label: string;
  insights: InsightHistoryItem[];
}

export function ConversationThreads({ insights }: ConversationThreadsProps) {
  const groupedInsights = useMemo(() => {
    const groups: { [key: string]: InsightHistoryItem[] } = {};

    insights.forEach((insight) => {
      const date = new Date(insight.created_at);
      let groupKey: string;

      if (isToday(date)) {
        groupKey = 'Today';
      } else if (isYesterday(date)) {
        groupKey = 'Yesterday';
      } else if (isThisWeek(date)) {
        groupKey = 'This Week';
      } else if (isThisMonth(date)) {
        groupKey = 'This Month';
      } else {
        groupKey = format(date, 'MMMM yyyy');
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(insight);
    });

    const sortedGroups: GroupedInsights[] = Object.entries(groups).map(([label, groupInsights]) => ({
      label,
      insights: groupInsights,
    }));

    const groupOrder = ['Today', 'Yesterday', 'This Week', 'This Month'];
    sortedGroups.sort((a, b) => {
      const aIndex = groupOrder.indexOf(a.label);
      const bIndex = groupOrder.indexOf(b.label);

      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }

      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;

      const aDate = new Date(a.insights[0].created_at);
      const bDate = new Date(b.insights[0].created_at);
      return bDate.getTime() - aDate.getTime();
    });

    return sortedGroups;
  }, [insights]);

  return (
    <div className="space-y-6">
      {groupedInsights.map((group) => (
        <div key={group.label} className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              {group.label}
            </h3>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="space-y-3">
            {group.insights.map((insight) => (
              <InsightBox
                key={insight.id}
                query={insight.query}
                response={insight.response}
                timestamp={insight.created_at}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
