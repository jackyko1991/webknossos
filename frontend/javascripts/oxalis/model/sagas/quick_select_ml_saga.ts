import _ from "lodash";
import ndarray, { NdArray } from "ndarray";
import { OrthoView, TypedArrayWithoutBigInt, Vector2, Vector3 } from "oxalis/constants";
import type { Saga } from "oxalis/model/sagas/effect-generators";
import { call, cancel, fork, put } from "typed-redux-saga";
import { select } from "oxalis/model/sagas/effect-generators";
import { V3 } from "libs/mjs";
import { ComputeQuickSelectForRectAction } from "oxalis/model/actions/volumetracing_actions";
import BoundingBox from "oxalis/model/bucket_data_handling/bounding_box";
import Toast from "libs/toast";
import { OxalisState } from "oxalis/store";
import { map3, sleep } from "libs/utils";
import { AdditionalCoordinate, APIDataset } from "types/api_flow_types";
import { getSamMask, sendAnalyticsEvent } from "admin/admin_rest_api";
import Dimensions from "../dimensions";
import { finalizeQuickSelectForSlice, prepareQuickSelect } from "./quick_select_heuristic_saga";
import { setGlobalProgressAction } from "../actions/ui_actions";
import { estimateBBoxInMask } from "libs/find_bounding_box_in_nd";

const MASK_SIZE = [1024, 1024, 0] as Vector3;

// This should tend to be smaller because the progress rendering at the end of the animation
// can cope very well with faster operations (the end of the progress bar will finish very slowly).
// Abruptly terminating progress bars on the other hand can feel weird.
const EXPECTED_DURATION_PER_SLICE_MS = 500;

// The 1024**2 binary mask typically only contains data in the middle (where the user
// drew a bounding box). Starting from there, we increase the bounding box in steps until
// the borders only contain zeros. The increment for that is defined in the following constant.
const MAXIMUM_PADDING_ERROR = 100;

function* getMask(
  dataset: APIDataset,
  layerName: string,
  userBoxMag1: BoundingBox,
  mag: Vector3,
  activeViewport: OrthoView,
  additionalCoordinates: AdditionalCoordinate[],
  intensityRange?: Vector2 | null,
): Saga<[BoundingBox, Array<NdArray<TypedArrayWithoutBigInt>>]> {
  if (userBoxMag1.getVolume() === 0) {
    throw new Error("User bounding box should not have empty volume.");
  }
  const trans = (vec: Vector3) => Dimensions.transDim(vec, activeViewport);
  const centerMag1 = V3.round(userBoxMag1.getCenter());

  const sizeInMag1 = V3.scale3(trans(MASK_SIZE), mag);
  const maskTopLeftMag1 = V3.alignWithMag(V3.sub(centerMag1, V3.scale(sizeInMag1, 0.5)), mag);
  // Effectively, zero the first and second dimension in the mag.

  const depth = yield* select(
    (state: OxalisState) => state.userConfiguration.quickSelect.predictionDepth || 1,
  );

  const depthSummand = V3.scale3(mag, trans([0, 0, depth]));
  const maskBottomRightMag1 = V3.add(maskTopLeftMag1, sizeInMag1);
  const maskBoxMag1 = new BoundingBox({
    min: maskTopLeftMag1,
    max: V3.add(maskBottomRightMag1, depthSummand),
  });

  if (!maskBoxMag1.containsBoundingBox(userBoxMag1)) {
    // This is unlikely as the mask size of 1024**2 is quite large.
    // The UX can certainly be optimized in case users run into this problem
    // more often.
    throw new Error("Selected bounding box is too large for AI selection.");
  }

  const userBoxInMag = userBoxMag1.fromMag1ToMag(mag);
  const maskBoxInMag = maskBoxMag1.fromMag1ToMag(mag);
  const userBoxRelativeToMaskInMag = userBoxInMag.offset(V3.negate(maskBoxInMag.min));

  const maskData = yield* call(
    getSamMask,
    dataset,
    layerName,
    mag,
    maskBoxMag1,
    userBoxRelativeToMaskInMag.getMinUV(activeViewport),
    userBoxRelativeToMaskInMag.getMaxUV(activeViewport),
    additionalCoordinates,
    intensityRange,
  );

  const size = maskBoxInMag.getSize();
  const sizeUVW = trans(size);
  const stride = [sizeUVW[2] * sizeUVW[1], sizeUVW[2], 1];

  const ndarr = ndarray(maskData, sizeUVW, stride);

  // a.hi(x,y) => a[:x, :y]
  // a.lo(x,y) => a[x:, y:]
  return [
    maskBoxInMag,
    _.range(0, depth).map((zOffset) =>
      ndarr.hi(ndarr.shape[0], ndarr.shape[1], zOffset + 1).lo(0, 0, zOffset),
    ),
  ];
}

function* showApproximatelyProgress(amount: number, expectedDurationPerItemMs: number) {
  // The progress bar is split into amount + 1 chunks. The first amount
  // chunks are filled after expectedDurationPerItemMs passed.
  // Afterwards, only one chunk is missing. With each additional iteration,
  // the remaining progress is split into half.
  let progress = 0;
  let i = 0;
  const increment = 1 / (amount + 1);
  while (true) {
    yield* call(sleep, expectedDurationPerItemMs);
    if (i < amount) {
      progress += increment;
    } else {
      progress += increment / 2 ** (i - amount + 1);
    }
    yield* put(setGlobalProgressAction(progress));
    i++;
  }
}

export default function* performQuickSelect(action: ComputeQuickSelectForRectAction): Saga<void> {
  const additionalCoordinates = yield* select((state) => state.flycam.additionalCoordinates);
  if (additionalCoordinates && additionalCoordinates.length > 0) {
    Toast.warning(
      `Quick select with AI might produce unexpected results for ${
        3 + additionalCoordinates.length
      }D datasets.`,
    );
  }

  const preparation = yield* call(prepareQuickSelect, action);
  if (preparation == null) {
    return;
  }
  const depth = yield* select(
    (state: OxalisState) => state.userConfiguration.quickSelect.predictionDepth || 1,
  );
  const progressSaga = yield* fork(
    showApproximatelyProgress,
    depth,
    EXPECTED_DURATION_PER_SLICE_MS,
  );
  try {
    const {
      labeledZoomStep,
      labeledResolution,
      thirdDim,
      activeViewport,
      volumeTracing,
      colorLayer,
    } = preparation;
    const trans = (vec: Vector3) => Dimensions.transDim(vec, activeViewport);

    const { startPosition, endPosition, quickSelectGeometry } = action;

    // Effectively, zero the first and second dimension in the mag.
    const depthSummand = V3.scale3(labeledResolution, trans([0, 0, 1]));
    const unalignedUserBoxMag1 = new BoundingBox({
      min: V3.floor(V3.min(startPosition, endPosition)),
      max: V3.floor(V3.add(V3.max(startPosition, endPosition), depthSummand)),
    });
    // Ensure that the third dimension is inclusive (otherwise, the center of the passed
    // coordinates wouldn't be exactly on the W plane on which the user started this action).
    const inclusiveMaxW = map3(
      (el, idx) => (idx === thirdDim ? el - 1 : el),
      unalignedUserBoxMag1.max,
    );
    quickSelectGeometry.setCoordinates(unalignedUserBoxMag1.min, inclusiveMaxW);

    const alignedUserBoxMag1 = unalignedUserBoxMag1.alignWithMag(labeledResolution, "floor");
    const dataset = yield* select((state: OxalisState) => state.dataset);
    const layerConfiguration = yield* select(
      (state) => state.datasetConfiguration.layers[colorLayer.name],
    );
    const { intensityRange } = layerConfiguration;

    let masks: Array<NdArray<TypedArrayWithoutBigInt>> | undefined;
    let maskBoxInMag: BoundingBox | undefined;
    try {
      const retVal = yield* call(
        getMask,
        dataset,
        colorLayer.name,
        alignedUserBoxMag1,
        labeledResolution,
        activeViewport,
        additionalCoordinates || [],
        colorLayer.elementClass === "uint8" ? null : intensityRange,
      );
      [maskBoxInMag, masks] = retVal;
    } catch (exception) {
      console.error(exception);
      throw new Error("Could not infer mask. See console for details.");
    }

    const overwriteMode = yield* select(
      (state: OxalisState) => state.userConfiguration.overwriteMode,
    );

    sendAnalyticsEvent("used_quick_select_with_ai");

    const userBoxInMag = alignedUserBoxMag1.fromMag1ToMag(labeledResolution);
    const userBoxRelativeToMaskInMag = userBoxInMag.offset(V3.negate(maskBoxInMag.min));

    let wOffset = 0;
    for (const mask of masks) {
      const targetW = alignedUserBoxMag1.min[thirdDim] + labeledResolution[thirdDim] * wOffset;

      const { min: minUV, max: maxUV } = estimateBBoxInMask(
        mask,
        {
          min: userBoxRelativeToMaskInMag.getMinUV(activeViewport),
          max: userBoxRelativeToMaskInMag.getMaxUV(activeViewport),
        },
        MAXIMUM_PADDING_ERROR,
      );

      // Span a bbox from the estimated values (relative to the mask)
      // and move it by the mask's min position to achieve a global
      // bbox.
      const targetBox = new BoundingBox({
        min: trans([...minUV, 0]),
        max: trans([...maxUV, labeledResolution[thirdDim]]),
      }).offset(maskBoxInMag.min);

      // Let the UI (especially the progress bar) update
      yield* call(sleep, 10);
      yield* finalizeQuickSelectForSlice(
        quickSelectGeometry,
        volumeTracing,
        activeViewport,
        labeledResolution,
        targetBox.fromMagToMag1(labeledResolution),
        targetW,
        // a.hi(x,y) => a[:x, :y], // a.lo(x,y) => a[x:, y:]
        mask
          .hi(maxUV[0], maxUV[1], 1)
          .lo(minUV[0], minUV[1], 0),
        overwriteMode,
        labeledZoomStep,
        // Only finish annotation stroke in the last iteration.
        // This allows to undo the entire multi-slice operation in one go.
        wOffset < masks.length - 1,
      );
      wOffset++;
    }
  } finally {
    yield* cancel(progressSaga);
    yield* put(setGlobalProgressAction(1));
    yield* call(sleep, 1000);
    yield* put(setGlobalProgressAction(0));
  }
}
