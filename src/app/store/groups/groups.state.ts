import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { Group } from '../../models/group.model';

export interface GroupsState extends EntityState<Group> {
  selectedGroupId: string | null;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export const groupsAdapter: EntityAdapter<Group> = createEntityAdapter<Group>({
  selectId: (group: Group) => group.id,
  sortComparer: (a: Group, b: Group) => a.name.localeCompare(b.name)
});

export const initialGroupsState: GroupsState = groupsAdapter.getInitialState({
  selectedGroupId: null,
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  error: null,
  lastUpdated: null,
});