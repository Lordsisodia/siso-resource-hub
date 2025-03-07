
export interface Category {
  id: string;
  name: string;
  description: string;
  image_url?: string;
}

export type ContentCategory = 
  | 'ai_research'
  | 'breakthrough_technologies'
  | 'industry_applications'
  | 'policy_ethics'
  | 'products_launches'
  | 'tutorial_guides';

export type TechnicalComplexity = 
  | 'basic'
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'expert'
  | 'mixed';

export type ArticleImpact = 
  | 'low'
  | 'medium'
  | 'high'
  | 'revolutionary';

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  content: string;
  categories?: string[];
  url: string;
  image_url?: string;
  thumbnail_url?: string;
  source: string;
  source_icon?: string;
  date?: string;
  published_at?: string;
  author?: string;
  views?: number;
  comments?: number;
  likes?: number;
  saves?: number;
  featured?: boolean;
  sentiment?: 'positive' | 'negative' | 'neutral';
  summary?: string;
  has_summary?: boolean;
  position?: number;
  
  // Enhanced duplicate detection fields
  isDuplicate?: boolean;
  duplicateOf?: string;
  similarity?: number;
  duplicateGroup?: string;
  similarArticles?: string[];
  
  // Add missing properties used in components
  impact?: ArticleImpact;
  bookmarks?: number;
  reading_time?: number;
  estimated_reading_time?: number;
  source_credibility?: string;
  technical_complexity?: TechnicalComplexity;
  article_type?: string;
  category?: string;
  tags?: string[];
  template_type?: string;
  sources?: string[];

  // AI analysis properties
  ai_importance_score?: number;
  ai_analysis_id?: string;
  has_ai_analysis?: boolean;
  analysis_date?: string;
  
  // AI analysis content structure - enhanced for richer information
  ai_analysis?: AIAnalysis;
}

export interface Summary {
  id: string;
  article_id: string;
  summary: string;
  created_at: string;
}

export interface Views {
  id: string;
  article_id: string;
  count: number;
  created_at: string;
}

// Updated EnhancedNewsItem interface - fixed comments to be optional number
export interface EnhancedNewsItem extends NewsItem {
  sections: ArticleSection[];
  key_takeaways?: string[];
  related_articles?: NewsItem[];
  table_of_contents?: {
    id: string;
    title: string;
    level: number;
  }[];
  technical_details?: Record<string, any>;
  
  // Important: We're intentionally NOT including 'comments' here to avoid conflicts
  // with the base NewsItem interface's 'comments?: number' property
}

// Updated ArticleSection interface
export interface ArticleSection {
  id: string;
  article_id: string;
  title: string;
  content: string;
  section_order: number;
  order_index?: number;
  importance_level?: 'low' | 'medium' | 'high';
  technical_complexity?: TechnicalComplexity;
  subsection_type?: string;
  category?: string;
  source_references?: Record<string, any>;
  key_details?: string[];
  implications?: string[];
  created_at?: string;
  updated_at?: string;
  last_updated?: string;
  reading_time_minutes?: number;
  overview?: string;
  bullet_points?: string[];
  related_topics?: string[];
  key_figures?: Record<string, any>;
  is_featured?: boolean;
  metadata?: Record<string, any>;
  ai_analysis?: {
    market_impact: any;
    technical_predictions: any[];
    related_technologies: any[];
    business_implications: any;
  };
  detailed_metadata?: {
    research_papers: any[];
    industry_reports: any[];
    expert_quotes: any[];
    market_data: any[];
  };
  implementation_timeline?: {
    short_term: any[];
    medium_term: any[];
    long_term: any[];
  };
  market_analysis?: {
    market_size: any;
    growth_projections: any;
    competitive_landscape: any[];
    investment_metrics: Record<string, any>;
  };
}

// Add NewsComment interface for consistency
export interface NewsComment {
  id: string;
  content: string;
  created_at: string;
  user_email: string;
  updated_at: string;
  news_id: string;
}

// [Analysis] Enhanced structure for AI analysis to provide more business context
export interface NewsAnalysis {
  id: string;
  article_id: string;
  summary: string;
  key_points: string[];
  technical_significance: string;
  market_impact: string;
  source_credibility: string;
  ai_importance_score: number;
  metadata: Record<string, any>;
  created_at: string;
}

export interface AIAnalysis {
  // Original fields
  market_impact?: string;
  technical_predictions?: string[];
  related_technologies?: string[];
  business_implications?: string;
  key_points?: string[];
  confidence_score?: number;
  summary?: string;
  industry_impacts?: Record<string, string>;
  recommended_actions?: string[];
  
  // [Analysis] Enhanced fields for agency owners
  agency_relevance_score?: number;
  implementation_timeline?: {
    short_term: string[];
    medium_term: string[];
    long_term: string[];
  };
  market_opportunity?: {
    score: number;
    description: string;
    potential_revenue_impact: string;
    target_client_industries: string[];
  };
  competitive_analysis?: {
    current_adoption: string;
    market_leaders: string[];
    differentiation_opportunities: string[];
  };
  client_messaging?: {
    value_propositions: string[];
    key_selling_points: string[];
    objection_handling: Record<string, string>;
    case_study_ideas: string[];
  };
  implementation_details?: {
    resource_requirements: string[];
    technical_complexity: string;
    integration_challenges: string[];
    tech_stack_recommendations: string[];
  };
  cost_benefit_analysis?: {
    estimated_implementation_cost: string;
    potential_roi_metrics: string[];
    time_to_value: string;
    scalability_factors: string[];
  };
}
