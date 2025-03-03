
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

// [Analysis] Category list derived from API data patterns
const CATEGORIES = [
  { id: "all", label: "All Categories" },
  { id: "breakthrough_technologies", label: "Breakthrough Tech" },
  { id: "language_models", label: "Language Models" },
  { id: "robotics_automation", label: "Robotics & Automation" },
  { id: "industry_applications", label: "Industry Applications" },
  { id: "international_developments", label: "International News" },
  { id: "enterprise_ai", label: "Enterprise AI" },
  { id: "ai_ethics", label: "AI Ethics" },
  { id: "research", label: "Research" },
  { id: "startups", label: "Startups" },
];

interface NewsCategoriesProps {
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
}

const NewsCategories = ({
  selectedCategory,
  onCategoryChange,
}: NewsCategoriesProps) => {
  // [Analysis] Handle toggling category selection
  const handleCategoryClick = (categoryId: string) => {
    if (categoryId === "all" || selectedCategory === categoryId) {
      onCategoryChange(null);
    } else {
      onCategoryChange(categoryId);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 py-2">
      {CATEGORIES.map((category) => (
        <motion.div
          key={category.id}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            variant={
              (category.id === "all" && !selectedCategory) ||
              selectedCategory === category.id
                ? "default"
                : "outline"
            }
            size="sm"
            onClick={() => handleCategoryClick(category.id)}
            className="text-xs sm:text-sm"
          >
            {category.label}
          </Button>
        </motion.div>
      ))}
    </div>
  );
};

export default NewsCategories;
