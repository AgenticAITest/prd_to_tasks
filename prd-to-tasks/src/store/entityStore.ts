import { create } from 'zustand';
import type {
  Entity,
  Field,
  Relationship,
  EntitySuggestion,
} from '@/types/entity';
import { generateId } from '@/lib/utils';
import { useProjectStore } from '@/store/projectStore';

export type ExtractionMode = 'idle' | 'extracting' | 'reviewing' | 'confirmed';

interface EntityState {
  // Entity data
  entities: Entity[];
  relationships: Relationship[];
  suggestions: EntitySuggestion[];

  // Pending AI extraction (for review before confirmation)
  pendingEntities: Entity[];
  pendingRelationships: Relationship[];
  pendingSuggestions: EntitySuggestion[];
  extractionMode: ExtractionMode;

  // Selected state
  selectedEntityId: string | null;
  selectedFieldId: string | null;

  // Processing state
  isExtracting: boolean;
  extractionProgress: number;
  error: string | null;

  // Entity actions
  setEntities: (entities: Entity[]) => void;
  addEntity: (entity: Omit<Entity, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateEntity: (entityId: string, updates: Partial<Entity>) => void;
  removeEntity: (entityId: string) => void;

  // Field actions
  addField: (entityId: string, field: Omit<Field, 'id'>) => void;
  updateField: (entityId: string, fieldId: string, updates: Partial<Field>) => void;
  removeField: (entityId: string, fieldId: string) => void;
  reorderFields: (entityId: string, fieldIds: string[]) => void;

  // Relationship actions
  setRelationships: (relationships: Relationship[]) => void;
  addRelationship: (relationship: Omit<Relationship, 'id'>) => void;
  updateRelationship: (relationshipId: string, updates: Partial<Relationship>) => void;
  removeRelationship: (relationshipId: string) => void;

  // Suggestions
  setSuggestions: (suggestions: EntitySuggestion[]) => void;
  applySuggestion: (suggestionIndex: number) => void;
  dismissSuggestion: (suggestionIndex: number) => void;

  // Selection
  selectEntity: (entityId: string | null) => void;
  selectField: (fieldId: string | null) => void;

  // Processing state
  setExtracting: (extracting: boolean, progress?: number) => void;
  setError: (error: string | null) => void;

  // AI Extraction workflow
  setExtractionMode: (mode: ExtractionMode) => void;
  setPendingExtraction: (
    entities: Entity[],
    relationships: Relationship[],
    suggestions: EntitySuggestion[]
  ) => void;
  confirmExtraction: () => void;
  discardExtraction: () => void;

  // Clear
  clearEntities: () => void;

  // Computed
  getEntityById: (entityId: string) => Entity | undefined;
  getEntityByName: (name: string) => Entity | undefined;
  getRelationshipsForEntity: (entityId: string) => Relationship[];
  getSelectedEntity: () => Entity | undefined;
}

export const useEntityStore = create<EntityState>()((set, get) => ({
  // Initial state
  entities: [],
  relationships: [],
  suggestions: [],
  pendingEntities: [],
  pendingRelationships: [],
  pendingSuggestions: [],
  extractionMode: 'idle',
  selectedEntityId: null,
  selectedFieldId: null,
  isExtracting: false,
  extractionProgress: 0,
  error: null,

  // Entity actions
  setEntities: (entities: Entity[]) => {
    set({ entities });
  },

  addEntity: (entity: Omit<Entity, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newEntity: Entity = {
      ...entity,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    set(state => ({
      entities: [...state.entities, newEntity],
    }));
  },

  updateEntity: (entityId: string, updates: Partial<Entity>) => {
    set(state => ({
      entities: state.entities.map(e =>
        e.id === entityId
          ? { ...e, ...updates, updatedAt: new Date() }
          : e
      ),
    }));
  },

  removeEntity: (entityId: string) => {
    set(state => ({
      entities: state.entities.filter(e => e.id !== entityId),
      relationships: state.relationships.filter(
        r => r.from.entity !== entityId && r.to.entity !== entityId
      ),
      selectedEntityId: state.selectedEntityId === entityId ? null : state.selectedEntityId,
    }));
  },

  // Field actions
  addField: (entityId: string, field: Omit<Field, 'id'>) => {
    const newField: Field = {
      ...field,
      id: generateId(),
    };

    set(state => ({
      entities: state.entities.map(e =>
        e.id === entityId
          ? { ...e, fields: [...e.fields, newField], updatedAt: new Date() }
          : e
      ),
    }));
  },

  updateField: (entityId: string, fieldId: string, updates: Partial<Field>) => {
    set(state => ({
      entities: state.entities.map(e =>
        e.id === entityId
          ? {
              ...e,
              fields: e.fields.map(f =>
                f.id === fieldId ? { ...f, ...updates } : f
              ),
              updatedAt: new Date(),
            }
          : e
      ),
    }));
  },

  removeField: (entityId: string, fieldId: string) => {
    set(state => ({
      entities: state.entities.map(e =>
        e.id === entityId
          ? {
              ...e,
              fields: e.fields.filter(f => f.id !== fieldId),
              updatedAt: new Date(),
            }
          : e
      ),
      selectedFieldId: state.selectedFieldId === fieldId ? null : state.selectedFieldId,
    }));
  },

  reorderFields: (entityId: string, fieldIds: string[]) => {
    set(state => ({
      entities: state.entities.map(e => {
        if (e.id !== entityId) return e;
        const fieldMap = new Map(e.fields.map(f => [f.id, f]));
        const reorderedFields = fieldIds
          .map(id => fieldMap.get(id))
          .filter((f): f is Field => f !== undefined);
        return { ...e, fields: reorderedFields, updatedAt: new Date() };
      }),
    }));
  },

  // Relationship actions
  setRelationships: (relationships: Relationship[]) => {
    set({ relationships });
  },

  addRelationship: (relationship: Omit<Relationship, 'id'>) => {
    const newRelationship: Relationship = {
      ...relationship,
      id: generateId(),
    };

    set(state => ({
      relationships: [...state.relationships, newRelationship],
    }));
  },

  updateRelationship: (relationshipId: string, updates: Partial<Relationship>) => {
    set(state => ({
      relationships: state.relationships.map(r =>
        r.id === relationshipId ? { ...r, ...updates } : r
      ),
    }));
  },

  removeRelationship: (relationshipId: string) => {
    set(state => ({
      relationships: state.relationships.filter(r => r.id !== relationshipId),
    }));
  },

  // Suggestions
  setSuggestions: (suggestions: EntitySuggestion[]) => {
    set({ suggestions });
  },

  applySuggestion: (suggestionIndex: number) => {
    const suggestion = get().suggestions[suggestionIndex];
    if (!suggestion) return;

    // Apply the suggestion based on type
    // This would need to be implemented based on the specific suggestion type
    // For now, just remove the suggestion
    set(state => ({
      suggestions: state.suggestions.filter((_, i) => i !== suggestionIndex),
    }));
  },

  dismissSuggestion: (suggestionIndex: number) => {
    set(state => ({
      suggestions: state.suggestions.filter((_, i) => i !== suggestionIndex),
    }));
  },

  // Selection
  selectEntity: (entityId: string | null) => {
    set({ selectedEntityId: entityId, selectedFieldId: null });
  },

  selectField: (fieldId: string | null) => {
    set({ selectedFieldId: fieldId });
  },

  // Processing state
  setExtracting: (extracting: boolean, progress?: number) => {
    set({
      isExtracting: extracting,
      extractionProgress: progress ?? (extracting ? 0 : 100),
    });
  },

  setError: (error: string | null) => {
    set({ error, isExtracting: false, extractionMode: 'idle' });
  },

  // AI Extraction workflow
  setExtractionMode: (mode: ExtractionMode) => {
    set({ extractionMode: mode });
  },

  setPendingExtraction: (
    entities: Entity[],
    relationships: Relationship[],
    suggestions: EntitySuggestion[]
  ) => {
    set({
      pendingEntities: entities,
      pendingRelationships: relationships,
      pendingSuggestions: suggestions,
      extractionMode: 'reviewing',
      isExtracting: false,
      extractionProgress: 100,
    });
  },

  confirmExtraction: () => {
    const { pendingEntities, pendingRelationships, pendingSuggestions } = get();
    set({
      entities: pendingEntities,
      relationships: pendingRelationships,
      suggestions: pendingSuggestions,
      pendingEntities: [],
      pendingRelationships: [],
      pendingSuggestions: [],
      extractionMode: 'confirmed',
      selectedEntityId: pendingEntities.length > 0 ? pendingEntities[0].id : null,
    });
    // Mark project dirty so save actions become enabled
    useProjectStore.getState().setDirty(true);
  },

  discardExtraction: () => {
    set({
      pendingEntities: [],
      pendingRelationships: [],
      pendingSuggestions: [],
      extractionMode: 'idle',
      isExtracting: false,
      extractionProgress: 0,
    });
  },

  // Clear
  clearEntities: () => {
    set({
      entities: [],
      relationships: [],
      suggestions: [],
      pendingEntities: [],
      pendingRelationships: [],
      pendingSuggestions: [],
      extractionMode: 'idle',
      selectedEntityId: null,
      selectedFieldId: null,
      error: null,
    });
  },

  // Computed
  getEntityById: (entityId: string) => {
    return get().entities.find(e => e.id === entityId);
  },

  getEntityByName: (name: string) => {
    return get().entities.find(
      e => e.name.toLowerCase() === name.toLowerCase()
    );
  },

  getRelationshipsForEntity: (entityId: string) => {
    const entity = get().entities.find(e => e.id === entityId);
    if (!entity) return [];

    return get().relationships.filter(
      r => r.from.entity === entity.name || r.to.entity === entity.name
    );
  },

  getSelectedEntity: () => {
    const { selectedEntityId, entities } = get();
    if (!selectedEntityId) return undefined;
    return entities.find(e => e.id === selectedEntityId);
  },
}));
