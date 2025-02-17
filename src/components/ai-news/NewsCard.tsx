
import { memo } from 'react';
import { Card } from "@/components/ui/card";
import { NewsCardContent } from './NewsCardContent';
import { NewsCardMedia } from './NewsCardMedia';
import { NewsCardComments } from './NewsCardComments';
import { format } from 'date-fns';

interface NewsCardProps {
  item: any;
  summaries: Record<string, string>;
  loadingSummaries: Record<string, boolean>;
  onGenerateSummary: (id: string) => void;
  isCompact?: boolean;
  isFeatured?: boolean;
}

function NewsCard({ 
  item, 
  summaries, 
  loadingSummaries, 
  onGenerateSummary,
  isCompact = false,
  isFeatured = false 
}: NewsCardProps) {
  const formattedDate = format(new Date(item.date), 'MMMM d, yyyy');
  const isDailyBrief = item.template_type === 'daily_brief';

  if (isDailyBrief) {
    return (
      <Card className="flex flex-col h-full hover:shadow-md transition-shadow duration-200">
        <div className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-semibold">
              {item.title}
            </h3>
            <span className="text-sm text-muted-foreground">
              {formattedDate}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {item.description}
          </p>
          <NewsCardComments 
            item={item}
            className="mt-auto"
          />
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-full group hover:shadow-md transition-shadow duration-200">
      <div className="flex flex-col h-full">
        <NewsCardMedia
          imageUrl={item.image_url}
          title={item.title}
          isFeatured={isFeatured}
          isCompact={isCompact}
        />
        <NewsCardContent
          item={item}
          summaries={summaries}
          loadingSummaries={loadingSummaries}
          onGenerateSummary={onGenerateSummary}
          isCompact={isCompact}
        />
      </div>
    </Card>
  );
}

export default memo(NewsCard);
