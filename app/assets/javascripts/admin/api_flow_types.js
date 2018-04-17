/**
 * api_flow_types.js
 * @flow
 */
import type { SkeletonTracingStatsType } from "oxalis/model/accessors/skeletontracing_accessor";
import type { Vector3, Vector6 } from "oxalis/constants";
import type { DataLayerType, SettingsType, BoundingBoxObjectType } from "oxalis/store";

export type APIMessageType = { ["info" | "warning" | "error"]: string };

export type APIDataSourceType = {
  +id: {
    +name: string,
    +team: string,
  },
  +status?: string,
  +dataLayers: Array<DataLayerType>,
  +scale: Vector3,
};

export type APIDataStoreType = {
  +name: string,
  +url: string,
  +typ: "webknossos-store" | "nd-store",
  +accessToken?: string,
};

export type APITeamType = {
  +id: string,
  +name: string,
  +organization: string,
};

export type APIDatasetType = {
  +allowedTeams: Array<APITeamType>,
  +created: number,
  +dataSource: APIDataSourceType,
  +dataStore: APIDataStoreType,
  +description: ?string,
  +isActive: boolean,
  +isEditable: boolean,
  +isPublic: boolean,
  +name: string,
  +displayName: string,
  +owningOrganization: string,
  +sourceType: "wkw" | "knossos",
};

export type APIDataSourceWithMessagesType = {
  +dataSource?: APIDataSourceType,
  +messages: Array<APIMessageType>,
};

export type APITeamMembershipType = {
  +id: string,
  +name: string,
  +isTeamManager: boolean,
};

export type ExperienceMapType = { +[string]: number };

export type APIUserType = {
  +email: string,
  +experiences: ExperienceMapType,
  +firstName: string,
  +lastName: string,
  +id: string,
  +isAdmin: boolean,
  +isActive: boolean,
  +isAnonymous: boolean,
  +isEditable: boolean,
  +lastActivity: number,
  +teams: Array<APITeamMembershipType>,
  +organization: string,
};

export type APITimeIntervalType = {
  paymentInterval: {
    month: number,
    year: number,
  },
  durationInSeconds: number,
};
export type APIUserLoggedTimeType = {
  loggedTime: Array<APITimeIntervalType>,
};

export type APIRestrictionsType = {
  +allowAccess: boolean,
  +allowUpdate: boolean,
  +allowFinish: boolean,
  +allowDownload: boolean,
};

export type APIAllowedModeType = "orthogonal" | "oblique" | "flight" | "volume";

export type APISettingsType = {
  +allowedModes: Array<APIAllowedModeType>,
  +preferredMode?: APIAllowedModeType,
  +branchPointsAllowed: boolean,
  +somaClickingAllowed: boolean,
};

export const APITracingTypeEnum = {
  Explorational: "Explorational",
  Task: "Task",
  View: "View",
  CompoundTask: "CompoundTask",
  CompoundProject: "CompoundProject",
  CompoundTaskType: "CompoundTaskType",
};

export type APITracingType = $Keys<typeof APITracingTypeEnum>;

export type APITaskTypeType = {
  +id: string,
  +summary: string,
  +description: string,
  +team: string,
  +settings: SettingsType,
};

export type TaskStatusType = { +open: number, +active: number, +finished: number };

export type APIScriptType = {
  +id: string,
  +name: string,
  +owner: APIUserType,
  +gist: string,
};

type APIProjectTypeBase = {
  +name: string,
  +team: string,
  +priority: number,
  +paused: boolean,
  +expectedTime: number,
  +numberOfOpenAssignments: number,
};

export type APIProjectType = APIProjectTypeBase & {
  +id: string,
  +owner: APIUserType,
};

export type APIProjectUpdaterType = APIProjectTypeBase & {
  +id: string,
  +owner: string,
};

export type APIProjectCreatorType = APIProjectTypeBase & {
  +owner: string,
};

export type APITaskType = {
  +boundingBox: BoundingBoxObjectType,
  +boundingBoxVec6: Vector6,
  +created: string,
  +creationInfo: ?string,
  +dataSet: string,
  +editPosition: Vector3,
  +editRotation: Vector3,
  +formattedHash: string,
  +id: string,
  +neededExperience: {
    +domain: string,
    +value: number,
  },
  +projectName: string,
  +script: ?APIScriptType,
  +status: TaskStatusType,
  +team: string,
  +tracingTime: number,
  +type: APITaskTypeType,
  +directLinks?: Array<string>,
};

export type APIAnnotationType = {
  +content: {
    +id: string,
    +typ: string,
  },
  +dataSetName: string,
  +dataStore: APIDataStoreType,
  +description: string,
  +formattedHash: string,
  +modified: string,
  +id: string,
  +isPublic: boolean,
  +name: string,
  +restrictions: APIRestrictionsType,
  +settings: APISettingsType,
  +state: string,
  +stats: SkeletonTracingStatsType,
  +tags: Array<string>,
  +task: APITaskType,
  +tracingTime: number,
  +typ: APITracingType,
  +user?: APIUserType,
};

export type APITaskWithAnnotationType = APITaskType & {
  +annotation: APIAnnotationType,
};

export type APIDatastoreType = {
  +name: string,
  +url: string,
  +typ: string,
};

export type NDStoreConfigType = {
  +name: string,
  +team: string,
  +server: string,
  +token: string,
};

export type DatasetConfigType = {
  +name: string,
  +organization: string,
  +datastore: string,
  +zipFile: File,
};

export type APITimeTrackingType = {
  time: string,
  timestamp: number,
  annotation: string,
  _id: string,
  task_id: string,
  project_name: string,
  tasktype_id: string,
  tasktype_summary: string,
};

export type APIProjectProgressReportType = {
  +projectName: string,
  +paused: boolean,
  +totalTasks: number,
  +totalInstances: number,
  +openInstances: number,
  +finishedInstances: number,
  +inProgressInstances: number,
};

export type APIOpenTasksReportType = {
  +id: string,
  +user: string,
  +totalAssignments: number,
  +assignmentsByProjects: { [projectName: string]: number },
};

export type APIOrganizationType = {
  +id: string,
  +name: string,
  +teams: Array<string>,
  +organizationTeam: string,
};

export type APIBuildInfoType = {
  webknossos: {
    name: string,
    commitHash: string,
    scalaVersion: string,
    version: string,
    sbtVersion: string,
    commitDate: string,
  },
  "webknossos-wrap": {
    builtAtMillis: string,
    name: string,
    commitHash: string,
    scalaVersion: string,
    version: string,
    sbtVersion: string,
    builtAtString: string,
  },
};

export type APIFeatureToggles = {
  +discussionBoard: boolean,
};

export default {};
