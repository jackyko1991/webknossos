import type { ServerSkeletonTracing, APIAnnotation } from "types/api_flow_types";
export const tracing: ServerSkeletonTracing = {
  typ: "Skeleton",
  trees: [
    {
      nodes: [
        {
          id: 1,
          position: {
            x: 0,
            y: 0,
            z: 0,
          },
          rotation: {
            x: 0,
            y: 0,
            z: 0,
          },
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
      color: {
        r: 1,
        g: 0,
        b: 0,
        a: 1,
      },
      name: "",
      isVisible: true,
      createdTimestamp: 1528811979356,
    },
  ],
  dataSetName: "ROI2017_wkw",
  treeGroups: [],
  createdTimestamp: 1528811983951,
  userBoundingBoxes: [],
  activeNodeId: 1,
  editPosition: {
    x: 0,
    y: 0,
    z: 0,
  },
  editRotation: {
    x: 0,
    y: 0,
    z: 0,
  },
  zoomLevel: 2,
  version: 0,
  id: "e90133de-b2db-4912-8261-8b6f84f7edab",
};
export const annotation: APIAnnotation = {
  modified: 1529066010230,
  state: "Active",
  id: "5b1fd1cf97000027049c67ee",
  name: "",
  description: "",
  typ: "Task",
  task: {
    id: "5b1fd1cb97000027049c67ec",
    formattedHash: "9c67ec",
    projectName: "sampleProject",
    projectId: "dummy-project-id",
    team: "Connectomics department",
    type: {
      id: "5b1e45faa000009d00abc2c6",
      summary: "sampleTaskType",
      description: "Description",
      teamId: "5b1e45f9a00000a000abc2c3",
      teamName: "Connectomics department",
      settings: {
        allowedModes: ["orthogonal", "oblique", "flight"],
        branchPointsAllowed: true,
        somaClickingAllowed: true,
        volumeInterpolationAllowed: false,
        mergerMode: false,
        resolutionRestrictions: {},
      },
      recommendedConfiguration: null,
      tracingType: "skeleton",
    },
    dataSet: "ROI2017_wkw",
    neededExperience: {
      domain: "oxalis",
      value: 1,
    },
    created: 1529066010230,
    status: {
      open: 0,
      active: 1,
      finished: 0,
    },
    script: null,
    tracingTime: null,
    creationInfo: null,
    boundingBox: null,
    editPosition: [0, 0, 0],
    editRotation: [0, 0, 0],
  },
  stats: {},
  restrictions: {
    allowAccess: true,
    allowUpdate: true,
    allowFinish: true,
    allowDownload: true,
  },
  formattedHash: "9c67ee",
  annotationLayers: [
    {
      name: "Skeleton",
      tracingId: "e90133de-b2db-4912-8261-8b6f84f7edab",
      typ: "Skeleton",
    },
  ],
  dataSetName: "ROI2017_wkw",
  organization: "Connectomics Department",
  dataStore: {
    name: "localhost",
    url: "http://localhost:9000",
    isScratch: false,
    isForeign: false,
    isConnector: false,
    allowsUpload: true,
  },
  tracingStore: {
    name: "localhost",
    url: "http://localhost:9000",
  },
  visibility: "Internal",
  settings: {
    allowedModes: ["orthogonal", "oblique", "flight"],
    branchPointsAllowed: true,
    somaClickingAllowed: true,
    volumeInterpolationAllowed: false,
    mergerMode: false,
    resolutionRestrictions: {},
  },
  tracingTime: null,
  tags: ["ROI2017_wkw", "skeleton"],
  owner: {
    id: "5b1e45faa00000a900abc2c5",
    email: "sample@scm.io",
    firstName: "Sample",
    lastName: "User",
    isAnonymous: false,
    isAdmin: true,
    isDatasetManager: true,
    teams: [
      {
        id: "5b1e45f9a00000a000abc2c3",
        name: "Connectomics department",
        isTeamManager: true,
      },
    ],
  },
  meshes: [],
  teams: [
    {
      id: "5b1e45f9a00000a000abc2c3",
      name: "Connectomics department",
      organization: "Connectomics department",
    },
  ],
};
