import React from 'react';
import { UploadCloud, AlertCircle, CheckCircle, MessageCircle, FileText } from 'lucide-react';

const ICON_MAP = {
  upload: UploadCloud,
  exception: AlertCircle,
  match: CheckCircle,
  message: MessageCircle,
  report: FileText,
};

export default function ActivityFeed({ activities }) {
  return (
    <div className="bg-paper-raised border border-hairline p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6 border-b border-hairline pb-4">
        <h3 className="font-serif text-lg text-ink">Recent Activity Feed</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2 space-y-5">
        {!activities || activities.length === 0 ? (
          <div className="py-8 text-center text-xs font-sans text-ink-muted border border-dashed border-hairline bg-paper/30 p-4">
            No recent activity logged yet.
          </div>
        ) : (
          activities.map((activity) => {
            const Icon = ICON_MAP[activity.type] || FileText;
            return (
              <div key={activity.id} className="flex gap-4">
                <div className="w-8 h-8 shrink-0 flex items-center justify-center border border-hairline bg-paper/50">
                  <Icon size={14} className="text-ink-muted" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h4 className="text-sm font-sans font-medium text-ink truncate pr-4">{activity.client}</h4>
                    <span className="text-[10px] font-mono text-ink-muted shrink-0">{activity.timestamp}</span>
                  </div>
                  <p className="text-xs font-sans text-ink-muted leading-relaxed">
                    {activity.description}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
