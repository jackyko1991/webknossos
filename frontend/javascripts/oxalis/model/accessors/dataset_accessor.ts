import _ from "lodash";
import memoizeOne from "memoize-one";
import type {
  APIAllowedMode,
  APIDataLayer,
  APIDataset,
  APIMaybeUnimportedDataset,
  APISegmentationLayer,
  ElementClass,
} from "types/api_flow_types";
import type {
  Settings,
  DataLayerType,
  DatasetConfiguration,
  BoundingBoxObject,
  OxalisState,
  ActiveMappingInfo,
} from "oxalis/store";
import ErrorHandling from "libs/error_handling";
import type { Vector3, Vector4, ViewMode } from "oxalis/constants";
import constants, { ViewModeValues, Vector3Indicies, MappingStatusEnum } from "oxalis/constants";
import { aggregateBoundingBox, maxValue } from "libs/utils";
import { formatExtentWithLength, formatNumberToLength } from "libs/format_utils";
import messages from "messages";
import { DataLayer } from "types/schemas/datasource.types";
import BoundingBox from "../bucket_data_handling/bounding_box";
import { M4x4, Matrix4x4, V3 } from "libs/mjs";
import { Identity4x4 } from "./flycam_accessor";
import { convertToDenseResolution, ResolutionInfo } from "../helpers/resolution_info";

function _getResolutionInfo(resolutions: Array<Vector3>): ResolutionInfo {
  return new ResolutionInfo(resolutions);
}

// Don't use memoizeOne here, since we want to cache the resolutions for all layers
// (which are not that many).
export const getResolutionInfo = _.memoize(_getResolutionInfo);

function _getResolutionInfoByLayer(dataset: APIDataset): Record<string, ResolutionInfo> {
  const infos: Record<string, ResolutionInfo> = {};

  for (const layer of dataset.dataSource.dataLayers) {
    infos[layer.name] = getResolutionInfo(layer.resolutions);
  }

  return infos;
}

export const getResolutionInfoByLayer = _.memoize(_getResolutionInfoByLayer);

export function getDenseResolutionsForLayerName(dataset: APIDataset, layerName: string) {
  return getResolutionInfoByLayer(dataset)[layerName].getDenseResolutions();
}

export const getResolutionUnion = memoizeOne((dataset: APIDataset): Array<Vector3[]> => {
  /*
   * Returns a list of existent mags per mag level. For example:
   * [
   *    [[1, 1, 1]],
   *    [[2, 2, 2], [2, 2, 1]],
   *    [[4, 4, 4], [4, 4, 1]],
   *    [[8, 8, 8], [8, 8, 2]],
   * ]
   */
  const resolutionUnionDict: { [key: number]: Vector3[] } = {};

  for (const layer of dataset.dataSource.dataLayers) {
    for (const resolution of layer.resolutions) {
      const key = maxValue(resolution);

      if (resolutionUnionDict[key] == null) {
        resolutionUnionDict[key] = [resolution];
      } else {
        resolutionUnionDict[key].push(resolution);
      }
    }
  }

  for (const keyStr of Object.keys(resolutionUnionDict)) {
    const key = Number(keyStr);
    resolutionUnionDict[key] = _.uniqWith(resolutionUnionDict[key], V3.isEqual);
  }

  const keys = Object.keys(resolutionUnionDict)
    .sort((a, b) => Number(a) - Number(b))
    .map((el) => Number(el));

  return keys.map((key) => resolutionUnionDict[key]);
});

export function getWidestResolutions(dataset: APIDataset): Vector3[] {
  const allLayerResolutions = dataset.dataSource.dataLayers.map((layer) =>
    convertToDenseResolution(layer.resolutions),
  );

  return _.maxBy(allLayerResolutions, (resolutions) => resolutions.length) || [];
}

export const getSomeResolutionInfoForDataset = memoizeOne((dataset: APIDataset): ResolutionInfo => {
  const resolutionUnion = getResolutionUnion(dataset);
  const areMagsDistinct = resolutionUnion.every((mags) => mags.length <= 1);

  if (areMagsDistinct) {
    return new ResolutionInfo(resolutionUnion.map((mags) => mags[0]));
  } else {
    return new ResolutionInfo(getWidestResolutions(dataset));
  }
});

function _getMaxZoomStep(dataset: APIDataset | null | undefined): number {
  const minimumZoomStepCount = 1;

  if (!dataset) {
    return minimumZoomStepCount;
  }

  const maxZoomstep = Math.max(
    minimumZoomStepCount,
    _.max(_.flattenDeep(getResolutionUnion(dataset))) || minimumZoomStepCount,
  );

  return maxZoomstep;
}

export const getMaxZoomStep = memoizeOne(_getMaxZoomStep);
export function getDataLayers(dataset: APIDataset): DataLayerType[] {
  return dataset.dataSource.dataLayers;
}

function _getResolutionInfoOfVisibleSegmentationLayer(state: OxalisState): ResolutionInfo {
  const segmentationLayer = getVisibleSegmentationLayer(state);

  if (!segmentationLayer) {
    return new ResolutionInfo([]);
  }

  return getResolutionInfo(segmentationLayer.resolutions);
}

export const getResolutionInfoOfVisibleSegmentationLayer = memoizeOne(
  _getResolutionInfoOfVisibleSegmentationLayer,
);
export function getLayerByName(
  dataset: APIDataset,
  layerName: string,
  alsoMatchFallbackLayer: boolean = false,
): DataLayerType {
  const dataLayers = getDataLayers(dataset);
  const hasUniqueNames = _.uniqBy(dataLayers, "name").length === dataLayers.length;
  ErrorHandling.assert(hasUniqueNames, messages["dataset.unique_layer_names"]);
  const layer = dataLayers.find(
    (l) =>
      l.name === layerName ||
      (alsoMatchFallbackLayer && "fallbackLayer" in l && l.fallbackLayer === layerName),
  );

  if (!layer) {
    throw new Error(`Layer "${layerName}" not found`);
  }

  return layer;
}

export function getSegmentationLayerByName(
  dataset: APIDataset,
  layerName: string,
): APISegmentationLayer {
  const layer = getLayerByName(dataset, layerName);

  if (layer.category !== "segmentation") {
    throw new Error(`The requested layer with name ${layerName} is not a segmentation layer.`);
  }

  return layer;
}
export function getMappings(dataset: APIDataset, layerName: string): string[] {
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'mappings' does not exist on type 'APIDat... Remove this comment to see the full error message
  return getLayerByName(dataset, layerName).mappings || [];
}
export function isRgb(dataset: APIDataset, layerName: string): boolean {
  return (
    getLayerByName(dataset, layerName).category === "color" &&
    getByteCount(dataset, layerName) === 3
  );
}
export function getByteCountFromLayer(layerInfo: DataLayerType): number {
  return getBitDepth(layerInfo) / 8;
}
export function getByteCount(dataset: APIDataset, layerName: string): number {
  return getByteCountFromLayer(getLayerByName(dataset, layerName));
}
export function getElementClass(dataset: APIDataset, layerName: string): ElementClass {
  return getLayerByName(dataset, layerName).elementClass;
}
export function getDefaultIntensityRangeOfLayer(
  dataset: APIDataset,
  layerName: string,
): [number, number] {
  const maxFloatValue = 3.40282347e38;
  // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
  const maxDoubleValue = 1.79769313486232e308;
  const elementClass = getElementClass(dataset, layerName);

  switch (elementClass) {
    case "uint8":
    case "uint24":
      // Since uint24 layers are multi-channel, their intensity ranges are equal to uint8
      return [0, 2 ** 8 - 1];

    case "uint16":
      return [0, 2 ** 16 - 1];

    case "uint32":
      return [0, 2 ** 32 - 1];

    case "uint64":
      return [0, 2 ** 64 - 1];

    // We do not fully support signed int data;
    case "int16":
      return [0, 2 ** 15 - 1];

    case "int32":
      return [0, 2 ** 31 - 1];

    case "int64":
      return [0, 2 ** 63 - 1];

    case "float":
      return [0, maxFloatValue];

    case "double":
      return [0, maxDoubleValue];

    default:
      return [0, 255];
  }
}
export type Boundary = {
  lowerBoundary: Vector3;
  upperBoundary: Vector3;
};

/*
   The returned Boundary denotes a half-open interval. This means that the lowerBoundary
   is included in the bounding box and the upper boundary is *not* included.
*/
export function getLayerBoundaries(dataset: APIDataset, layerName: string): Boundary {
  const { topLeft, width, height, depth } = getLayerByName(dataset, layerName).boundingBox;
  const lowerBoundary = topLeft;
  const upperBoundary = [topLeft[0] + width, topLeft[1] + height, topLeft[2] + depth] as Vector3;
  return {
    lowerBoundary,
    upperBoundary,
  };
}

export function getLayerBoundingBox(dataset: APIDataset, layerName: string): BoundingBox {
  const { lowerBoundary, upperBoundary } = getLayerBoundaries(dataset, layerName);
  return new BoundingBox({
    min: lowerBoundary,
    max: upperBoundary,
  });
}

export function getBoundaries(dataset: APIDataset): Boundary {
  const lowerBoundary = [Infinity, Infinity, Infinity];
  const upperBoundary = [-Infinity, -Infinity, -Infinity];
  const layers = getDataLayers(dataset);

  for (const dataLayer of layers) {
    const layerBoundaries = getLayerBoundaries(dataset, dataLayer.name);

    for (const i of Vector3Indicies) {
      lowerBoundary[i] = Math.min(lowerBoundary[i], layerBoundaries.lowerBoundary[i]);
      upperBoundary[i] = Math.max(upperBoundary[i], layerBoundaries.upperBoundary[i]);
    }
  }

  return {
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'number[]' is not assignable to type 'Vector3... Remove this comment to see the full error message
    lowerBoundary,
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'number[]' is not assignable to type 'Vector3... Remove this comment to see the full error message
    upperBoundary,
  };
}
export function getDatasetCenter(dataset: APIDataset): Vector3 {
  const { lowerBoundary, upperBoundary } = getBoundaries(dataset);
  return [
    (lowerBoundary[0] + upperBoundary[0]) / 2,
    (lowerBoundary[1] + upperBoundary[1]) / 2,
    (lowerBoundary[2] + upperBoundary[2]) / 2,
  ];
}
export function getDatasetExtentInVoxel(dataset: APIDataset) {
  const datasetLayers = dataset.dataSource.dataLayers;
  const allBoundingBoxes = datasetLayers.map((layer) => layer.boundingBox);
  const unifiedBoundingBoxes = aggregateBoundingBox(allBoundingBoxes);
  const { min, max } = unifiedBoundingBoxes;
  const extent = {
    topLeft: min,
    width: max[0] - min[0],
    height: max[1] - min[1],
    depth: max[2] - min[2],
    min,
    max,
  };
  return extent;
}
export function getDatasetExtentInLength(dataset: APIDataset): BoundingBoxObject {
  const extentInVoxel = getDatasetExtentInVoxel(dataset);
  const { scale } = dataset.dataSource;
  const topLeft = extentInVoxel.topLeft.map((val, index) => val * scale[index]) as any as Vector3;
  const extent = {
    topLeft,
    width: extentInVoxel.width * scale[0],
    height: extentInVoxel.height * scale[1],
    depth: extentInVoxel.depth * scale[2],
  };
  return extent;
}
export function getDatasetExtentAsString(
  dataset: APIMaybeUnimportedDataset,
  inVoxel: boolean = true,
): string {
  if (!dataset.isActive) {
    return "";
  }

  if (inVoxel) {
    const extentInVoxel = getDatasetExtentInVoxel(dataset);
    return `${formatExtentWithLength(extentInVoxel, (x) => `${x}`)} voxel`;
  }

  const extent = getDatasetExtentInLength(dataset);
  return formatExtentWithLength(extent, formatNumberToLength);
}
export function determineAllowedModes(settings?: Settings): {
  preferredMode: APIAllowedMode | null | undefined;
  allowedModes: Array<APIAllowedMode>;
} {
  // The order of allowedModes should be independent from the server and instead be similar to ViewModeValues
  const allowedModes = settings
    ? _.intersection(ViewModeValues, settings.allowedModes)
    : ViewModeValues;
  let preferredMode = null;

  if (settings?.preferredMode != null) {
    const modeId = settings.preferredMode;

    if (allowedModes.includes(modeId)) {
      preferredMode = modeId;
    }
  }

  return {
    preferredMode,
    allowedModes,
  };
}
export function getBitDepth(layerInfo: DataLayer | DataLayerType): number {
  switch (layerInfo.elementClass) {
    case "uint8":
      return 8;

    case "uint16":
      return 16;

    case "uint24":
      return 24;

    case "uint32":
      return 32;

    case "uint64":
      return 64;

    case "float":
      return 32;

    case "double":
      return 64;

    case "int8":
      return 8;

    case "int16":
      return 16;

    case "int32":
      return 32;

    case "int64":
      return 64;

    default:
      throw new Error("Unknown element class");
  }
}
export function isElementClassSupported(layerInfo: DataLayerType): boolean {
  switch (layerInfo.elementClass) {
    case "uint8":
    case "uint16":
    case "uint24":
    case "uint32":
    case "int8":
    case "int16":
    case "int32":
    case "float":
    case "uint64":
      return true;

    case "double":
    case "int64":
    default:
      return false;
  }
}
export function isSegmentationLayer(dataset: APIDataset, layerName: string): boolean {
  return getLayerByName(dataset, layerName).category === "segmentation";
}
export function isColorLayer(dataset: APIDataset, layerName: string): boolean {
  return getLayerByName(dataset, layerName).category === "color";
}
export function getVisibleSegmentationLayer(
  state: OxalisState,
): APISegmentationLayer | null | undefined {
  const visibleSegmentationLayers = getVisibleSegmentationLayers(state);

  if (visibleSegmentationLayers.length > 0) {
    return visibleSegmentationLayers[0];
  }

  return null;
}
export function getVisibleOrLastSegmentationLayer(
  state: OxalisState,
): APISegmentationLayer | null | undefined {
  const visibleSegmentationLayer = getVisibleSegmentationLayer(state);
  if (visibleSegmentationLayer != null) return visibleSegmentationLayer;
  const lastVisibleSegmentationLayerName =
    state.temporaryConfiguration.lastVisibleSegmentationLayerName;

  if (lastVisibleSegmentationLayerName != null) {
    return getSegmentationLayerByName(state.dataset, lastVisibleSegmentationLayerName);
  }

  return null;
}

export function hasVisibleUint64Segmentation(state: OxalisState) {
  const segmentationLayer = getVisibleSegmentationLayer(state);
  return segmentationLayer ? segmentationLayer.elementClass === "uint64" : false;
}

export function getVisibleSegmentationLayers(state: OxalisState): Array<APISegmentationLayer> {
  const { datasetConfiguration } = state;
  const { viewMode } = state.temporaryConfiguration;
  const segmentationLayers = getSegmentationLayers(state.dataset);
  const visibleSegmentationLayers = segmentationLayers.filter((layer) =>
    isLayerVisible(state.dataset, layer.name, datasetConfiguration, viewMode),
  );
  return visibleSegmentationLayers;
}

export function getSegmentationLayerWithMappingSupport(
  state: OxalisState,
): APISegmentationLayer | null | undefined {
  // Currently, webKnossos only supports one active mapping at a given time. The UI should ensure
  // that not more than one mapping is enabled (currently, this is achieved by only allowing one
  // visible segmentation layer, anyway).
  const visibleSegmentationLayers = getVisibleSegmentationLayers(state);
  // Find the visible layer with an enabled or activating mapping
  const layersWithoutDisabledMapping = visibleSegmentationLayers.filter((layer) => {
    const mappingInfo = state.temporaryConfiguration.activeMappingByLayer[layer.name];
    return mappingInfo && mappingInfo.mappingStatus !== MappingStatusEnum.DISABLED;
  });

  if (layersWithoutDisabledMapping.length > 0) {
    return layersWithoutDisabledMapping[0];
  }

  return null;
}

export function getFirstSegmentationLayer(
  dataset: APIMaybeUnimportedDataset,
): APISegmentationLayer | null | undefined {
  if (!dataset.isActive) {
    return null;
  }

  const segmentationLayers = getSegmentationLayers(dataset);

  if (segmentationLayers.length > 0) {
    return segmentationLayers[0];
  }

  return null;
}
export function getSegmentationLayers(
  dataset: APIMaybeUnimportedDataset,
): Array<APISegmentationLayer> {
  if (!dataset.isActive) {
    return [];
  }

  const segmentationLayers = dataset.dataSource.dataLayers.filter((dataLayer) =>
    isSegmentationLayer(dataset, dataLayer.name),
  ) as APISegmentationLayer[];
  return segmentationLayers;
}
export function hasSegmentation(dataset: APIDataset): boolean {
  return getSegmentationLayers(dataset).length > 0;
}
export function doesSupportVolumeWithFallback(
  dataset: APIMaybeUnimportedDataset,
  segmentationLayer: APISegmentationLayer | null | undefined,
): boolean {
  if (!dataset.isActive) {
    return false;
  }

  if (!segmentationLayer) {
    return false;
  }

  return true;
}
export function getColorLayers(dataset: APIDataset): Array<DataLayerType> {
  return dataset.dataSource.dataLayers.filter((dataLayer) => isColorLayer(dataset, dataLayer.name));
}
export function getEnabledLayers(
  dataset: APIDataset,
  datasetConfiguration: DatasetConfiguration,
  options: {
    invert?: boolean;
  } = {},
): Array<DataLayerType> {
  const dataLayers = dataset.dataSource.dataLayers;
  const layerSettings = datasetConfiguration.layers;
  return dataLayers.filter((layer) => {
    const settings = layerSettings[layer.name];

    if (settings == null) {
      return false;
    }

    return settings.isDisabled === Boolean(options.invert);
  });
}

export function getEnabledColorLayers(
  dataset: APIDataset,
  datasetConfiguration: DatasetConfiguration,
) {
  const enabledLayers = getEnabledLayers(dataset, datasetConfiguration);
  return enabledLayers.filter((layer) => isColorLayer(dataset, layer.name));
}

export function getThumbnailURL(dataset: APIDataset): string {
  const datasetName = dataset.name;
  const organizationName = dataset.owningOrganization;
  const layers = dataset.dataSource.dataLayers;

  const colorLayer = _.find(layers, {
    category: "color",
  });

  if (colorLayer) {
    return `/api/datasets/${organizationName}/${datasetName}/layers/${colorLayer.name}/thumbnail`;
  }

  return "";
}
export function getSegmentationThumbnailURL(dataset: APIDataset): string {
  const datasetName = dataset.name;
  const organizationName = dataset.owningOrganization;
  const segmentationLayer = getFirstSegmentationLayer(dataset);

  if (segmentationLayer) {
    return `/api/datasets/${organizationName}/${datasetName}/layers/${segmentationLayer.name}/thumbnail`;
  }

  return "";
}

// Currently, only used for valid task range
function _keyResolutionsByMax(dataset: APIDataset, layerName: string): Record<number, Vector3> {
  const resolutions = getDenseResolutionsForLayerName(dataset, layerName);
  return _.keyBy(resolutions, (res) => Math.max(...res));
}

const keyResolutionsByMax = memoizeOne(_keyResolutionsByMax);
export function getResolutionByMax(
  dataset: APIDataset,
  layerName: string,
  maxDim: number,
): Vector3 {
  const keyedResolutionsByMax = keyResolutionsByMax(dataset, layerName);
  return keyedResolutionsByMax[maxDim];
}
export function isLayerVisible(
  dataset: APIDataset,
  layerName: string,
  datasetConfiguration: DatasetConfiguration,
  viewMode: ViewMode,
): boolean {
  const layerConfig = datasetConfiguration.layers[layerName];

  if (!layerConfig) {
    return false;
  }

  const isArbitraryMode = constants.MODES_ARBITRARY.includes(viewMode);
  const isHiddenBecauseOfArbitraryMode = isArbitraryMode && isSegmentationLayer(dataset, layerName);
  return !layerConfig.isDisabled && layerConfig.alpha > 0 && !isHiddenBecauseOfArbitraryMode;
}

function _getLayerNameToIsDisabled(datasetConfiguration: DatasetConfiguration) {
  const nameToIsDisabled: { [name: string]: boolean } = {};
  for (const layerName of Object.keys(datasetConfiguration.layers)) {
    nameToIsDisabled[layerName] = datasetConfiguration.layers[layerName].isDisabled;
  }
  return nameToIsDisabled;
}

export const getLayerNameToIsDisabled = memoizeOne(_getLayerNameToIsDisabled);

export function is2dDataset(dataset: APIDataset): boolean {
  // An empty dataset (e.g., depth == 0), should not be considered as 2D.
  // This avoids that the empty dummy dataset is rendered with a 2D layout
  // which is usually switched to the 3D layout after the proper dataset has
  // been loaded.
  return getDatasetExtentInVoxel(dataset).depth === 1;
}
const dummyMapping = {
  mappingName: null,
  mapping: null,
  mappingKeys: null,
  mappingColors: null,
  hideUnmappedIds: false,
  mappingStatus: MappingStatusEnum.DISABLED,
  mappingSize: 0,
  mappingType: "JSON",
};
export function getMappingInfo(
  activeMappingInfos: Record<string, ActiveMappingInfo>,
  layerName: string | null | undefined,
): ActiveMappingInfo {
  if (layerName != null && activeMappingInfos[layerName]) {
    return activeMappingInfos[layerName];
  }

  // Return a dummy object (this mirrors webKnossos' behavior before the support of
  // multiple segmentation layers)
  // @ts-expect-error ts-migrate(2322) FIXME: Type '{ mappingName: null; mapping: null; mappingK... Remove this comment to see the full error message
  return dummyMapping;
}
export function getMappingInfoForSupportedLayer(state: OxalisState): ActiveMappingInfo {
  const layer = getSegmentationLayerWithMappingSupport(state);
  return getMappingInfo(
    state.temporaryConfiguration.activeMappingByLayer,
    layer ? layer.name : null,
  );
}

function _getTransformsForLayerOrNull(layer: APIDataLayer): Matrix4x4 | null {
  if (!layer.coordinateTransformations) {
    return null;
  }
  if (layer.coordinateTransformations.length > 1) {
    console.error(
      "Data layer has defined multiple coordinate transforms. This is currently not supported and ignored",
    );
    return null;
  }
  if (layer.coordinateTransformations[0].type !== "affine") {
    console.error(
      "Data layer has defined a coordinate transform that is not affine. This is currently not supported and ignored",
    );
    return null;
  }
  const nestedMatrix = layer.coordinateTransformations[0].matrix;
  return nestedToFlatMatrix(nestedMatrix);
}

export const getTransformsForLayerOrNull = _.memoize(_getTransformsForLayerOrNull);
export function getTransformsForLayer(layer: APIDataLayer): Matrix4x4 {
  return getTransformsForLayerOrNull(layer) || Identity4x4;
}

export function nestedToFlatMatrix(matrix: [Vector4, Vector4, Vector4, Vector4]): Matrix4x4 {
  return [...matrix[0], ...matrix[1], ...matrix[2], ...matrix[3]];
}

export function flatToNestedMatrix(matrix: Matrix4x4): [Vector4, Vector4, Vector4, Vector4] {
  return [
    matrix.slice(0, 4) as Vector4,
    matrix.slice(4, 8) as Vector4,
    matrix.slice(8, 12) as Vector4,
    matrix.slice(12, 16) as Vector4,
  ];
}

// Transposition is often needed so that the matrix has the right format
// for matrix operations (e.g., on the GPU; but not for ThreeJS).
// Inversion is needed when the position of an "output voxel" (e.g., during
// rendering in the fragment shader) needs to be mapped to its original
// data position (i.e., how it's stored without the transformation).
// Without the inversion, the matrix maps from stored position to the position
// where it should be rendered.
export const invertAndTranspose = _.memoize((mat: Matrix4x4) => {
  return M4x4.transpose(M4x4.inverse(mat));
});
