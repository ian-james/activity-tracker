import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DayOfWeek, CompletionType, ScheduleFrequency } from '../types';

export interface ActivityTemplate {
  id: string;
  name: string;
  points: number;
  days: DayOfWeek[] | null;
  category_id: number | null;
  completion_type: CompletionType;
  rating_scale: number | null;
  schedule_frequency: ScheduleFrequency;
  biweekly_start_date: string | null;
}

interface TemplatesContextType {
  templates: ActivityTemplate[];
  addTemplate: (template: Omit<ActivityTemplate, 'id'>) => void;
  updateTemplate: (id: string, template: Omit<ActivityTemplate, 'id'>) => void;
  deleteTemplate: (id: string) => void;
}

const TemplatesContext = createContext<TemplatesContextType | undefined>(undefined);

const DEFAULT_TEMPLATES: ActivityTemplate[] = [
  { id: '1', name: 'Workout', points: 25, days: null, category_id: null, completion_type: 'energy_quality', rating_scale: null, schedule_frequency: 'weekly', biweekly_start_date: null },
  { id: '2', name: 'Cycling', points: 25, days: ['mon', 'wed', 'fri'], category_id: null, completion_type: 'energy_quality', rating_scale: null, schedule_frequency: 'weekly', biweekly_start_date: null },
  { id: '3', name: 'Yoga', points: 25, days: ['tue', 'thu'], category_id: null, completion_type: 'energy_quality', rating_scale: null, schedule_frequency: 'weekly', biweekly_start_date: null },
  { id: '4', name: 'Take Vitamins', points: 5, days: null, category_id: null, completion_type: 'checkbox', rating_scale: null, schedule_frequency: 'weekly', biweekly_start_date: null },
  { id: '5', name: 'Meal Prep', points: 10, days: ['sun'], category_id: null, completion_type: 'energy_quality', rating_scale: null, schedule_frequency: 'weekly', biweekly_start_date: null },
  { id: '6', name: 'Read 30 mins', points: 10, days: null, category_id: null, completion_type: 'energy_quality', rating_scale: null, schedule_frequency: 'weekly', biweekly_start_date: null },
];

// Migration function to add new fields to old templates
function migrateTemplates(templates: any[]): ActivityTemplate[] {
  return templates.map(template => ({
    ...template,
    completion_type: template.completion_type || 'checkbox',
    rating_scale: template.rating_scale || null,
    schedule_frequency: template.schedule_frequency || 'weekly',
    biweekly_start_date: template.biweekly_start_date || null,
  }));
}

export function TemplatesProvider({ children }: { children: ReactNode }) {
  const [templates, setTemplates] = useState<ActivityTemplate[]>(() => {
    const stored = localStorage.getItem('activityTemplates');
    if (stored) {
      try {
        const parsedTemplates = JSON.parse(stored);
        return migrateTemplates(parsedTemplates);
      } catch {
        return DEFAULT_TEMPLATES;
      }
    }
    return DEFAULT_TEMPLATES;
  });

  useEffect(() => {
    localStorage.setItem('activityTemplates', JSON.stringify(templates));
  }, [templates]);

  const addTemplate = (template: Omit<ActivityTemplate, 'id'>) => {
    const newTemplate: ActivityTemplate = {
      ...template,
      id: Date.now().toString(),
    };
    setTemplates((prev) => [...prev, newTemplate]);
  };

  const updateTemplate = (id: string, template: Omit<ActivityTemplate, 'id'>) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...template, id } : t))
    );
  };

  const deleteTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <TemplatesContext.Provider value={{ templates, addTemplate, updateTemplate, deleteTemplate }}>
      {children}
    </TemplatesContext.Provider>
  );
}

export function useTemplates() {
  const context = useContext(TemplatesContext);
  if (context === undefined) {
    throw new Error('useTemplates must be used within a TemplatesProvider');
  }
  return context;
}
