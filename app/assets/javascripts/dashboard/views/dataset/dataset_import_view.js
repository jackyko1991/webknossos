// @flow

import React from "react";
import { Button, Spin, Input, Checkbox, Alert } from "antd";
import Request from "libs/request";
import update from "immutability-helper";
import Toast from "libs/toast";
import type { APIDatasetType } from "admin/api_flow_types";

class DatasetImportView extends React.PureComponent {

  state: {
    dataset: ?APIDatasetType,
    datasetJson: string,
    isValidJSON: boolean,
    errors: ?Array<string>,
  } = {
    dataset: null,
    datasetJson: "",
    isValidJSON: true,
    errors: null,
  }

  componentDidMount() {
    this.fetchData();
  }

  props: {
    datasetName: string,
    isEditingMode: boolean,
  } = {
    datasetName: "",
    isEditingMode: false,
  }

  async fetchData(): Promise<void> {
    const datasetUrl = `/api/datasets/${this.props.datasetName}`;
    const dataset = await Request.receiveJSON(datasetUrl);

    const datasetJsonUrl = `${dataset.dataStore.url}/data/datasets/${this.props.datasetName}`;
    const datasetJson = await Request.receiveJSON(datasetJsonUrl);

    // eslint-disable-next-line react/no-did-mount-set-state
    this.setState({
      dataset,
      datasetJson: JSON.stringify(datasetJson.dataSource, null, "  "),
    });
  }

  importDataset = () => {
    if (this.props.isEditingMode) {
      const url = `/api/datasets/${this.props.datasetName}`;
      Request.sendJSONReceiveJSON(url, {
        data: this.state.dataset,
      });
    }

    if (this.state.isValidJSON && this.state.dataset) {
      const url = `${this.state.dataset.dataStore.url}/data/datasets/${this.props.datasetName}`;
      Request.sendJSONReceiveJSON(url, {
        data: JSON.parse(this.state.datasetJson),

      }).then(() => {
        Toast.success(`Successfully imported ${this.props.datasetName}`);
        window.history.back();
      },
      (error) => {
        this.setState({ errors: error.messages.map(message => message.error) });
      });
    } else {
      Toast.error("Invalid JSON. Please fix the errors.");
    }
  }

  handleChangeJson = (event: SyntheticInputEvent) => {
    try {
      JSON.parse(event.target.value);
      this.setState({
        datasetJson: event.target.value,
        isValidJSON: true,
      });
    } catch (e) {
      this.setState({
        datasetJson: event.target.value,
        isValidJSON: false,
      });
    }
  }

  handleChangeDescription = (event: SyntheticInputEvent) => {
    this.updateDataset("description", event.target.value);
  }

  handleChangeCheckbox = (event: SyntheticInputEvent) => {
    this.updateDataset("isPublic", event.target.checked);
  }

  updateDataset(propertyName: string, value: (string | boolean)) {
    const newState = update(this.state, {
      dataset: { [propertyName]: { $set: value } },
    });
    this.setState(newState);
  }

  getErrorComponents() {
    if (this.state.errors) {

      const errorElements = this.state.errors.map(
        (error, i) => <li key={i}>error</li>
      );
      const descriptionElement = <ul>{errorElements}</ul>;

      return <Alert
        message="Error(s) Detected"
        description={descriptionElement}
        type="error"
        showIcon
      />
    }

    return <span />;
  }

  getEditModeComponents() {
    // these components are only available in editing mode
    if (this.props.isEditingMode && this.state.dataset) {
      const dataset = this.state.dataset;

      return (
        <div>
          <Input.TextArea
            rows="3"
            value={dataset.description || ""}
            placeholder="Dataset Description"
            onChange={this.handleChangeDescription}
          />
          <Checkbox
            checked={dataset.isPublic}
            onChange={this.handleChangeCheckbox}
          >Make dataset publicly accessible
          </Checkbox>
        </div>
      );
    }

    return <span />;
  }

  render() {
    const datasetJson = this.state.datasetJson;
    const textAreaStyle = this.state.isValidJSON ? {
      fontFamily: "monospace",
    } : {
      fontFamily: "monospace",
      border: "1px solid red",
      boxShadow: "0 0 0 2px rgba(233, 16, 76, 0.28)",
    };

    const titleString = this.props.isEditingMode ? "Update" : "Import";
    const content = datasetJson ? (<Input.TextArea
      value={datasetJson}
      onChange={this.handleChangeJson}
      rows={20}
      style={textAreaStyle}
    />) :
    <Spin size="large" />;

    return (
      <div className="container" id="dataset-import-view">
        <h3>{titleString} Dataset {this.props.datasetName}</h3>
        <p>Please review your dataset&#39;s properties before importing it.</p>
        {this.getErrorComponents()}
        <div className="content">
          {content}
        </div>
        {this.getEditModeComponents()}
        <div>
          <Button onClick={this.importDataset} type="primary">{titleString}</Button>
          <Button onClick={() => window.history.back()}>Cancel</Button>
        </div>
      </div>
    );
  }
}

export default DatasetImportView;
