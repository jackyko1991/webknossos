import type { Vector3 } from "oxalis/constants";
import { getLayerBoundaries, getResolutionInfo } from "oxalis/model/accessors/dataset_accessor";
import DataCube from "oxalis/model/bucket_data_handling/data_cube";
import ErrorHandling from "libs/error_handling";
import LayerRenderingManager from "oxalis/model/bucket_data_handling/layer_rendering_manager";
import Mappings from "oxalis/model/bucket_data_handling/mappings";
import PullQueue from "oxalis/model/bucket_data_handling/pullqueue";
import PushQueue from "oxalis/model/bucket_data_handling/pushqueue";
import type { DataLayerType } from "oxalis/store";
import Store from "oxalis/store"; // TODO: Non-reactive

class DataLayer {
  cube: DataCube;
  name: string;
  pullQueue: PullQueue;
  pushQueue: PushQueue;
  mappings: Mappings | null | undefined;
  layerRenderingManager: LayerRenderingManager;
  resolutions: Array<Vector3>;
  fallbackLayer: string | null | undefined;
  fallbackLayerInfo: DataLayerType | null | undefined;
  isSegmentation: boolean;

  constructor(layerInfo: DataLayerType, textureWidth: number, dataTextureCount: number) {
    this.name = layerInfo.name;
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'fallbackLayer' does not exist on type 'A... Remove this comment to see the full error message
    this.fallbackLayer = layerInfo.fallbackLayer != null ? layerInfo.fallbackLayer : null;
    this.fallbackLayerInfo =
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'fallbackLayerInfo' does not exist on typ... Remove this comment to see the full error message
      layerInfo.fallbackLayerInfo != null ? layerInfo.fallbackLayerInfo : null;
    this.isSegmentation = layerInfo.category === "segmentation";
    this.resolutions = layerInfo.resolutions;
    const { dataset } = Store.getState();
    ErrorHandling.assert(this.resolutions.length > 0, "Resolutions for layer cannot be empty");
    this.cube = new DataCube(
      getLayerBoundaries(dataset, this.name).upperBoundary,
      getResolutionInfo(this.resolutions),
      layerInfo.elementClass,
      this.isSegmentation,
      this.name,
    );
    this.pullQueue = new PullQueue(this.cube, layerInfo.name, dataset.dataStore);
    this.pushQueue = new PushQueue(this.cube);
    this.cube.initializeWithQueues(this.pullQueue, this.pushQueue);
    if (this.isSegmentation) this.mappings = new Mappings(layerInfo.name);
    this.layerRenderingManager = new LayerRenderingManager(
      this.name,
      this.pullQueue,
      this.cube,
      textureWidth,
      dataTextureCount,
    );
  }

  destroy() {
    this.pullQueue.clear();
    this.pushQueue.clear();
  }
}

export default DataLayer;
