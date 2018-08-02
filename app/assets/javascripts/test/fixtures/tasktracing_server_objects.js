// @flow
import type { ServerSkeletonTracingType, APIAnnotationType } from "admin/api_flow_types";

export const tracing: ServerSkeletonTracingType = {
  trees: [
    {
      nodes: [
        {
          id: 1,
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          radius: 120,
          viewport: 1,
          resolution: 1,
          bitDepth: 0,
          interpolation: false,
          createdTimestamp: 1528811979356,
        },
      ],
      edges: [],
      branchPoints: [],
      comments: [],
      treeId: 1,
      color: { r: 1, g: 0, b: 0, a: 1 },
      name: "",
      createdTimestamp: 1528811979356,
    },
  ],
  treeGroups: [],
  createdTimestamp: 1528811983951,
  activeNodeId: 1,
  editPosition: { x: 0, y: 0, z: 0 },
  editRotation: { x: 0, y: 0, z: 0 },
  zoomLevel: 2,
  version: 0,
  id: "e90133de-b2db-4912-8261-8b6f84f7edab",
};

export const annotation: APIAnnotationType = {
  modified: "2018-06-12 15:59",
  state: "Active",
  id: "5b1fd1cf97000027049c67ee",
  name: "",
  description: "",
  typ: "Task",
  task: {
    id: "5b1fd1cb97000027049c67ec",
    formattedHash: "9c67ec",
    projectName: "sampleProject",
    team: "Connectomics department",
    type: {
      id: "5b1e45faa000009d00abc2c6",
      summary: "sampleTaskType",
      description: "Description",
      team: "5b1e45f9a00000a000abc2c3",
      settings: {
        allowedModes: ["orthogonal", "oblique", "flight"],
        branchPointsAllowed: true,
        somaClickingAllowed: true,
      },
    },
    dataSet: "ROI2017_wkw",
    neededExperience: { domain: "oxalis", value: 1 },
    created: "2018-06-12 15:59",
    status: { open: 0, active: 1, finished: 0 },
    script: null,
    tracingTime: null,
    creationInfo: null,
    boundingBox: null,
    editPosition: [0, 0, 0],
    editRotation: [0, 0, 0],
  },
  stats: {},
  restrictions: { allowAccess: true, allowUpdate: true, allowFinish: true, allowDownload: true },
  formattedHash: "9c67ee",
  content: { id: "e90133de-b2db-4912-8261-8b6f84f7edab", typ: "skeleton" },
  dataSetName: "ROI2017_wkw",
  dataStore: { name: "localhost", url: "http://localhost:9000", typ: "webknossos-store" },
  isPublic: false,
  settings: {
    allowedModes: ["orthogonal", "oblique", "flight"],
    branchPointsAllowed: true,
    somaClickingAllowed: true,
  },
  tracingTime: null,
  tags: ["ROI2017_wkw", "skeleton"],
  user: {
    created: 12345678,
    id: "5b1e45faa00000a900abc2c5",
    email: "scmboy@scalableminds.com",
    firstName: "SCM",
    lastName: "Boy",
    isAnonymous: false,
    teams: [
      { id: "5b1e45f9a00000a000abc2c3", isTeamManager: true, name: "Connectomics department" },
    ],
  },
};
