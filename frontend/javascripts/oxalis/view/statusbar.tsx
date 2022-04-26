import { Tooltip } from "antd";
import { useDispatch, useSelector } from "react-redux";
import React from "react";
import { WarningOutlined, MoreOutlined } from "@ant-design/icons";
import type { Vector3 } from "oxalis/constants";
import { OrthoViews } from "oxalis/constants";
import { getVisibleSegmentationLayer } from "oxalis/model/accessors/dataset_accessor";
import { NumberInputPopoverSetting } from "oxalis/view/components/setting_input_views";
import { useKeyPress } from "libs/react_hooks";
import { getCurrentResolution } from "oxalis/model/accessors/flycam_accessor";
import { setActiveCellAction } from "oxalis/model/actions/volumetracing_actions";
import {
  setActiveNodeAction,
  setActiveTreeAction,
} from "oxalis/model/actions/skeletontracing_actions";
import message from "messages";
import {
  ActionDescriptor,
  getToolClassForAnnotationTool,
} from "oxalis/controller/combinations/tool_controls";
import {
  calculateGlobalPos,
  isPlaneMode as getIsPlaneMode,
} from "oxalis/model/accessors/view_mode_accessor";
import { adaptActiveToolToShortcuts } from "oxalis/model/accessors/tool_accessor";
import { V3 } from "libs/mjs";
import Model from "oxalis/model";
import { OxalisState } from "oxalis/store";
import { getActiveSegmentationTracing } from "oxalis/model/accessors/volumetracing_accessor";
const lineColor = "rgba(255, 255, 255, 0.67)";
const moreIconStyle = {
  height: 14,
  color: lineColor,
};
const moreLinkStyle = {
  marginLeft: 10,
  marginRight: "auto",
};

function getPosString(pos: Vector3) {
  return V3.floor(pos).join(",");
}

function ZoomShortcut() {
  return (
    <span key="zoom" className="shortcut-info-element">
      <span
        key="zoom-i"
        className="keyboard-key-icon-small"
        style={{
          borderColor: lineColor,
          marginTop: -1,
        }}
      >
        {/* Move text up to vertically center it in the border from keyboard-key-icon-small */}
        <span
          style={{
            position: "relative",
            top: -2,
          }}
        >
          Alt
        </span>
      </span>{" "}
      +
      <img
        className="keyboard-mouse-icon"
        src="/assets/images/icon-statusbar-mouse-wheel.svg"
        alt="Mouse Wheel"
      />
      Zoom in/out
    </span>
  );
}

function LeftClickShortcut({ actionDescriptor }: { actionDescriptor: ActionDescriptor }) {
  const leftClick =
    actionDescriptor.leftClick != null ? (
      <span className="shortcut-info-element">
        <img
          className="keyboard-mouse-icon"
          src="/assets/images/icon-statusbar-mouse-left.svg"
          alt="Mouse Left Click"
        />
        {actionDescriptor.leftClick}
      </span>
    ) : null;
  const leftDrag =
    actionDescriptor.leftDrag != null ? (
      <span className="shortcut-info-element">
        <img
          className="keyboard-mouse-icon"
          src="/assets/images/icon-statusbar-mouse-left-drag.svg"
          alt="Mouse Left Drag"
        />
        {actionDescriptor.leftDrag}
      </span>
    ) : null;
  return (
    <span>
      {leftClick}
      {leftDrag}
    </span>
  );
}

function RightClickShortcut({ actionDescriptor }: { actionDescriptor: ActionDescriptor }) {
  const rightClick =
    actionDescriptor.rightClick != null ? (
      <span className="shortcut-info-element">
        <img
          className="keyboard-mouse-icon"
          src="/assets/images/icon-statusbar-mouse-right.svg"
          alt="Mouse Right Click"
        />
        {actionDescriptor.rightClick}
      </span>
    ) : null;
  const rightDrag =
    actionDescriptor.rightClick != null ? (
      <span className="shortcut-info-element">
        <img
          className="keyboard-mouse-icon"
          src="/assets/images/icon-statusbar-mouse-right-drag.svg"
          alt="Mouse Right Drag"
        />
        {actionDescriptor.rightDrag}
      </span>
    ) : null;
  return (
    <React.Fragment>
      {rightClick}
      {rightDrag}
    </React.Fragment>
  );
}

function ShortcutsInfo() {
  const activeTool = useSelector((state: OxalisState) => state.uiInformation.activeTool);
  const useLegacyBindings = useSelector(
    (state: OxalisState) => state.userConfiguration.useLegacyBindings,
  );
  const isPlaneMode = useSelector((state: OxalisState) => getIsPlaneMode(state));
  const isShiftPressed = useKeyPress("Shift");
  const isControlPressed = useKeyPress("Control");
  const isAltPressed = useKeyPress("Alt");
  const adaptedTool = adaptActiveToolToShortcuts(
    activeTool,
    isShiftPressed,
    isControlPressed,
    isAltPressed,
  );
  const actionDescriptor = getToolClassForAnnotationTool(adaptedTool).getActionDescriptors(
    adaptedTool,
    useLegacyBindings,
    isShiftPressed,
    isControlPressed,
    isAltPressed,
  );
  const moreShortcutsLink = (
    <a
      target="_blank"
      href="https://docs.webknossos.org/webknossos/keyboard_shortcuts.html"
      rel="noopener noreferrer"
      style={moreLinkStyle}
    >
      <Tooltip title="More Shortcuts">
        <MoreOutlined rotate={90} style={moreIconStyle} />
      </Tooltip>
    </a>
  );

  if (!isPlaneMode) {
    return (
      <React.Fragment>
        <span
          style={{
            marginRight: "auto",
            textTransform: "capitalize",
          }}
        >
          <img
            className="keyboard-mouse-icon"
            src="/assets/images/icon-statusbar-mouse-left-drag.svg"
            alt="Mouse Left Drag"
          />
          Move
        </span>
        <span key="zoom" className="shortcut-info-element">
          <span
            key="zoom-i"
            className="keyboard-key-icon-small"
            style={{
              borderColor: lineColor,
              marginTop: -1,
            }}
          >
            {/* Move text up to vertically center it in the border from keyboard-key-icon-small */}
            <span
              style={{
                position: "relative",
                top: -2,
              }}
            >
              Space
            </span>
          </span>{" "}
          Trace forward
        </span>
        {moreShortcutsLink}
      </React.Fragment>
    );
  }

  return (
    <React.Fragment>
      <LeftClickShortcut actionDescriptor={actionDescriptor} />
      <RightClickShortcut actionDescriptor={actionDescriptor} />
      <span className="shortcut-info-element">
        <img
          className="keyboard-mouse-icon"
          src="/assets/images/icon-statusbar-mouse-wheel.svg"
          alt="Mouse Wheel"
        />
        {isAltPressed || isControlPressed ? "Zoom in/out" : "Move along 3rd axis"}
      </span>
      <span className="shortcut-info-element">
        <img
          className="keyboard-mouse-icon"
          src="/assets/images/icon-statusbar-mouse-right-drag.svg"
          alt="Mouse Right"
        />
        Rotate 3D View
      </span>
      <ZoomShortcut />
      {moreShortcutsLink}
    </React.Fragment>
  );
}

function getCellInfo(globalMousePosition: Vector3 | null | undefined) {
  const getSegmentIdString = () => {
    const hoveredCellInfo = Model.getHoveredCellId(globalMousePosition);

    if (!hoveredCellInfo) {
      return "-";
    }

    return hoveredCellInfo.isMapped ? `${hoveredCellInfo.id} (mapped)` : hoveredCellInfo.id;
  };

  return <span className="info-element">Segment {getSegmentIdString()}</span>;
}

function maybeLabelWithSegmentationWarning(hasUint64Segmentation: boolean, label: string) {
  return hasUint64Segmentation ? (
    <React.Fragment>
      {label}{" "}
      <Tooltip title={message["tracing.uint64_segmentation_warning"]}>
        <WarningOutlined
          style={{
            color: "var(--ant-warning)",
          }}
        />
      </Tooltip>
    </React.Fragment>
  ) : (
    label
  );
}

function Infos() {
  const activeResolution = useSelector((state: OxalisState) => getCurrentResolution(state));
  const mousePosition = useSelector(
    (state: OxalisState) => state.temporaryConfiguration.mousePosition,
  );
  const isPlaneMode = useSelector((state: OxalisState) => getIsPlaneMode(state));
  const isSkeletonAnnotation = useSelector((state: OxalisState) => state.tracing.skeleton != null);
  const activeVolumeTracing = useSelector((state: OxalisState) =>
    getActiveSegmentationTracing(state),
  );
  const activeCellId = activeVolumeTracing?.activeCellId;
  const activeNodeId = useSelector((state: OxalisState) =>
    state.tracing.skeleton ? state.tracing.skeleton.activeNodeId : null,
  );
  const activeTreeId = useSelector((state: OxalisState) =>
    state.tracing.skeleton ? state.tracing.skeleton.activeTreeId : null,
  );
  const dispatch = useDispatch();

  const onChangeActiveCellId = (id: number) => dispatch(setActiveCellAction(id));
  const onChangeActiveNodeId = (id: number) => dispatch(setActiveNodeAction(id));
  const onChangeActiveTreeId = (id: number) => dispatch(setActiveTreeAction(id));

  const hasVisibleSegmentation = useSelector(
    (state: OxalisState) => getVisibleSegmentationLayer(state) != null,
  );
  const hasUint64Segmentation = useSelector((state: OxalisState) => {
    const segmentationLayer = getVisibleSegmentationLayer(state);
    return segmentationLayer ? segmentationLayer.originalElementClass === "uint64" : false;
  });
  const globalMousePosition = useSelector((state: OxalisState) => {
    const { activeViewport } = state.viewModeData.plane;

    if (mousePosition && activeViewport !== OrthoViews.TDView) {
      const [x, y] = mousePosition;
      return calculateGlobalPos(state, {
        x,
        y,
      });
    }

    return undefined;
  });
  return (
    <React.Fragment>
      <span className="info-element">
        <img
          src="/assets/images/icon-statusbar-downsampling.svg"
          className="resolution-status-bar-icon"
          alt="Resolution"
        />{" "}
        {activeResolution.join("-")}{" "}
      </span>
      {isPlaneMode ? (
        <span className="info-element">
          Pos [{globalMousePosition ? getPosString(globalMousePosition) : "-,-,-"}]
        </span>
      ) : null}
      {isPlaneMode && hasVisibleSegmentation ? getCellInfo(globalMousePosition) : null}

      {activeVolumeTracing != null ? (
        <span className="info-element">
          <NumberInputPopoverSetting
            value={activeCellId}
            label={maybeLabelWithSegmentationWarning(hasUint64Segmentation, "Active Segment")}
            detailedLabel={maybeLabelWithSegmentationWarning(
              hasUint64Segmentation,
              "Change Active Segment ID",
            )}
            onChange={onChangeActiveCellId}
          />
        </span>
      ) : null}
      {isSkeletonAnnotation ? (
        <span className="info-element">
          <NumberInputPopoverSetting
            value={activeNodeId}
            label="Active Node"
            detailedLabel="Change Active Node ID"
            onChange={onChangeActiveNodeId}
          />
        </span>
      ) : null}
      {isSkeletonAnnotation ? (
        <span className="info-element">
          <NumberInputPopoverSetting
            value={activeTreeId}
            label="Active Tree"
            detailedLabel="Change Active Tree ID"
            onChange={onChangeActiveTreeId}
          />
        </span>
      ) : null}
    </React.Fragment>
  );
}

class Statusbar extends React.PureComponent<{}, {}> {
  render() {
    return (
      <span className="statusbar">
        <ShortcutsInfo />
        <Infos />
      </span>
    );
  }
}

export default Statusbar;