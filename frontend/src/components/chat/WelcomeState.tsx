import React from 'react';
import { 
  Sparkles, 
  Layout, 
  ShoppingCart, 
  BarChart3, 
  FileText, 
  Gamepad2,
  MessageSquare,
  ArrowRight,
  Zap,
  Code2,
  Palette,
} from 'lucide-react';
import { useStore } from '../../store/useStore';

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  prompt: string;
}

const TEMPLATES: Template[] = [
  {
    id: 'landing',
    name: 'Landing Page',
    description: 'Modern marketing page with hero, features, and CTA',
    icon: Layout,
    color: 'from-blue-500 to-cyan-500',
    prompt: 'Create a modern landing page with a hero section, features grid, testimonials, and a call-to-action. Use a clean, professional design with smooth animations.',
  },
  {
    id: 'dashboard',
    name: 'Admin Dashboard',
    description: 'Analytics dashboard with charts and data tables',
    icon: BarChart3,
    color: 'from-purple-500 to-pink-500',
    prompt: 'Build an admin dashboard with a sidebar navigation, stats cards, a line chart showing monthly data, and a recent activity table. Include dark mode support.',
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce Store',
    description: 'Product listing with cart and checkout flow',
    icon: ShoppingCart,
    color: 'from-green-500 to-emerald-500',
    prompt: 'Create an e-commerce product page with a grid of products, each with image, title, price, and add to cart button. Include a shopping cart sidebar and checkout form.',
  },
  {
    id: 'blog',
    name: 'Blog Template',
    description: 'Article listing with featured posts and categories',
    icon: FileText,
    color: 'from-orange-500 to-amber-500',
    prompt: 'Build a blog homepage with a featured article hero, grid of recent posts with thumbnails, sidebar with categories and popular posts, and a newsletter signup.',
  },
  {
    id: 'chat',
    name: 'Chat Interface',
    description: 'Real-time messaging UI with conversations',
    icon: MessageSquare,
    color: 'from-indigo-500 to-violet-500',
    prompt: 'Create a chat application interface with a conversations sidebar, message thread with user avatars and timestamps, and a message input with emoji picker and attachment button.',
  },
  {
    id: 'game',
    name: 'Simple Game',
    description: 'Interactive browser game with score tracking',
    icon: Gamepad2,
    color: 'from-red-500 to-rose-500',
    prompt: 'Build a simple memory card matching game with a grid of cards that flip on click, a timer, move counter, and score display. Add win condition and restart button.',
  },
];

const EXAMPLE_PROMPTS = [
  "Build a todo app with drag-and-drop reordering and local storage",
  "Create a weather app that shows current conditions and 5-day forecast",
  "Make a portfolio website with project gallery and contact form",
  "Build a calculator with basic and scientific modes",
  "Create a recipe finder app with search and favorites",
];

interface WelcomeStateProps {
  onPromptSelect: (prompt: string) => void;
}

export const WelcomeState: React.FC<WelcomeStateProps> = ({ onPromptSelect }) => {
  const { currentProject } = useStore();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
      <div className="max-w-3xl w-full space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 shadow-lg shadow-primary/25 mb-2">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold">
            {currentProject ? `Let's build ${currentProject.name}` : 'What would you like to build?'}
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Describe your idea in plain English, or pick a template below to get started quickly.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span>Instant generation</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Code2 className="w-4 h-4 text-blue-500" />
            <span>Production-ready code</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Palette className="w-4 h-4 text-pink-500" />
            <span>Modern UI included</span>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Quick Start Templates
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {TEMPLATES.map((template) => {
              const Icon = template.icon;
              return (
                <button
                  key={template.id}
                  onClick={() => onPromptSelect(template.prompt)}
                  className="group relative p-4 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 text-left"
                >
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${template.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="font-semibold text-sm mb-1">{template.name}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
                  <ArrowRight className="absolute top-4 right-4 w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Example Prompts */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Example Prompts
          </h3>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((prompt, index) => (
              <button
                key={index}
                onClick={() => onPromptSelect(prompt)}
                className="px-3 py-2 rounded-lg bg-secondary/50 hover:bg-secondary text-sm text-left transition-colors hover:shadow-md"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Pro Tips
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Be specific about features, colors, and layout preferences</li>
            <li>• Mention any frameworks you want (React, Vue, vanilla JS)</li>
            <li>• Ask for modifications after the initial generation</li>
            <li>• Use the preview panel to see your app in real-time</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
