
import { useQuery } from '@tanstack/react-query';
import { useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tool } from '@/components/tools/types';
import { Sidebar } from '@/components/Sidebar';
import { toast } from 'react-hot-toast';
import { ToolsPageHeader } from '@/components/tools/ToolsPageHeader';
import { MainContent } from '@/components/tools/layout/MainContent';
import { ChatAssistant } from '@/components/tools/layout/ChatAssistant';

export default function Tools() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('rating');

  // Memoize categories to prevent unnecessary re-renders
  const categories = useMemo(() => [
    { id: 'all', label: 'All Tools' },
    { id: 'featured', label: 'Featured' },
    { id: 'development', label: 'Development' },
    { id: 'database', label: 'Database' },
    { id: 'automation', label: 'Automation' },
    { id: 'GPT Builder', label: 'GPT Builder' },
  ], []);

  // Use useQuery with stable config to prevent unnecessary re-fetches
  const { data: tools, isLoading, error } = useQuery({
    queryKey: ['core_tools'],
    queryFn: async () => {
      console.log('Fetching tools from core_tools table...');
      const { data, error } = await supabase
        .from('core_tools')
        .select('*');
      
      if (error) {
        console.error('Error fetching tools:', error);
        toast.error('Failed to load tools. Please try again later.');
        throw error;
      }
      
      return data.map(tool => ({
        ...tool,
        youtube_videos: tool.youtube_videos 
          ? JSON.parse(JSON.stringify(tool.youtube_videos))
          : null
      })) as Tool[];
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    cacheTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });

  // Memoize sort function to prevent unnecessary re-renders
  const sortTools = useCallback((tools: Tool[]) => {
    return [...tools].sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'popular':
          return (b.downloads_count || 0) - (a.downloads_count || 0);
        default:
          return 0;
      }
    });
  }, [sortBy]);

  // Memoize filtered tools to prevent unnecessary re-calculations
  const filteredTools = useMemo(() => {
    if (!tools) return [];
    
    let filtered = tools.filter(tool => {
      const matchesSearch = !searchQuery || 
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = 
        selectedCategory === 'all' || 
        (selectedCategory === 'featured' && tool.rating && tool.rating >= 4.5) ||
        tool.category.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });

    return sortTools(filtered);
  }, [tools, searchQuery, selectedCategory, sortTools]);

  // Memoize category stats to prevent unnecessary re-calculations
  const categoryStats = useMemo(() => {
    if (!tools) return {};
    return categories.reduce((acc, category) => {
      acc[category.label] = tools.filter(tool => 
        category.id === 'all' ? true : 
        category.id === 'featured' ? (tool.rating && tool.rating >= 4.5) :
        tool.category.toLowerCase() === category.id.toLowerCase()
      ).length;
      return acc;
    }, {} as { [key: string]: number });
  }, [tools, categories]);

  if (error) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="p-8">
          <div className="text-red-500">
            Failed to load tools. Please try again later.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <ToolsPageHeader 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          totalTools={tools?.length}
          categoryStats={categoryStats}
        />

        <MainContent 
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          sortBy={sortBy}
          onSortChange={setSortBy}
          filteredTools={filteredTools}
          isLoading={isLoading}
          categoryStats={categoryStats}
        />

        <ChatAssistant />
      </div>
    </div>
  );
}
