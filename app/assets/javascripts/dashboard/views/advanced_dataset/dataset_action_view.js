// @flow
/* eslint-disable jsx-a11y/href-no-hash */

import * as React from "react";
import { Dropdown, Menu } from "antd";
import type { APIDatasetType } from "admin/api_flow_types";

type Props = {
  dataset: APIDatasetType,
};

type State = {};

export default class DatasetActionView extends React.PureComponent<Props, State> {
  render() {
    const dataset = this.props.dataset;

    const menu = (
      <Menu>
        <Menu.Item key="existing">
          <a
            href={`/datasets/${dataset.name}/trace?typ=volumeTracing&withFallback=true`}
            title="Create volume tracing"
          >
            Use Existing Segmentation Layer
          </a>
        </Menu.Item>
        <Menu.Item key="new">
          <a
            href={`/datasets/${dataset.name}/trace?typ=volumeTracing&withFallback=false`}
            title="Create volume tracing"
          >
            Use a New Segmentation Layer
          </a>
        </Menu.Item>
      </Menu>
    );

    const createVolumeTracingMenu = (
      <Dropdown overlay={menu} trigger={["click"]}>
        <a href="#" title="Create volume tracing">
          <img src="/assets/images/volume.svg" alt="volume icon" /> Start Volume Tracing
        </a>
      </Dropdown>
    );

    return (
      <div>
        {dataset.dataSource.dataLayers == null ? (
          <div>
            <a href={`/datasets/${dataset.name}/import`} className=" import-dataset">
              <i className="fa fa-plus-circle" />Import
            </a>

            <div className="text-danger">{dataset.dataSource.status}</div>
          </div>
        ) : null}
        {dataset.isActive ? (
          <div className="dataset-actions nowrap">
            {dataset.isEditable ? (
              <a href={`/datasets/${dataset.name}/edit`} title="Edit dataset">
                <i className="fa fa-pencil" /> Edit
              </a>
            ) : null}
            <a href={`/datasets/${dataset.name}/view`} title="View dataset">
              <img src="/assets/images/eye.svg" alt="eye icon" /> View
            </a>
            <a
              href={`/datasets/${dataset.name}/trace?typ=skeletonTracing`}
              title="Create skeleton tracing"
            >
              <img src="/assets/images/skeleton.svg" alt="skeleton iocn" /> Start Skeleton Tracing
            </a>
            {dataset.dataStore.typ !== "ndstore" ? createVolumeTracingMenu : null}
          </div>
        ) : null}
      </div>
    );
  }
}
