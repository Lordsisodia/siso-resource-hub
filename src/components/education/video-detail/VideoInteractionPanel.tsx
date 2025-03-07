
import { Brain, MessageCircle, ListChecks } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VideoAnalysis } from '../VideoAnalysis';
import { VideoChat } from '../VideoChat';
import { VideoTakeaways } from '../VideoTakeaways';

// [Analysis] Define explicit interface for component props to fix TypeScript error
interface VideoInteractionPanelProps {
  videoId: string;
  activeTab: string;
}

export const VideoInteractionPanel: React.FC<VideoInteractionPanelProps> = ({ videoId, activeTab }: VideoInteractionPanelProps) => {
  return (
    <Tabs defaultValue={activeTab} className="space-y-6">
      <TabsList className="w-full grid grid-cols-3 lg:w-[400px] bg-white/5">
        <TabsTrigger 
          value="analysis" 
          className="gap-2 data-[state=active]:bg-siso-red data-[state=active]:text-white"
        >
          <Brain className="h-4 w-4" />
          AI Analysis
        </TabsTrigger>
        <TabsTrigger 
          value="chat" 
          className="gap-2 data-[state=active]:bg-siso-red data-[state=active]:text-white"
        >
          <MessageCircle className="h-4 w-4" />
          Chat
        </TabsTrigger>
        <TabsTrigger 
          value="takeaways" 
          className="gap-2 data-[state=active]:bg-siso-red data-[state=active]:text-white"
        >
          <ListChecks className="h-4 w-4" />
          Key Takeaways
        </TabsTrigger>
      </TabsList>

      <TabsContent value="analysis">
        <VideoAnalysis videoId={videoId} />
      </TabsContent>

      <TabsContent value="chat">
        <VideoChat videoId={videoId} />
      </TabsContent>

      <TabsContent value="takeaways">
        <VideoTakeaways videoId={videoId} />
      </TabsContent>
    </Tabs>
  );
};
