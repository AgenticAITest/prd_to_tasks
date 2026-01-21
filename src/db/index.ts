export {
  db,
  saveProject,
  loadProject,
  deleteProject,
  listProjects,
  addRecentProject,
  getRecentProjects,
  getSetting,
  setSetting,
  deleteSetting,
} from './database';

export type { DBProject, DBSettings, DBRecentProject } from './database';
