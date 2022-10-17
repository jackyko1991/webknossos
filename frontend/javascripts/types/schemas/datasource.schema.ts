import { baseDatasetViewConfiguration } from "types/schemas/dataset_view_configuration.schema";

export default {
  $schema: "http://json-schema.org/draft-06/schema#",
  ...baseDatasetViewConfiguration,
  definitions: {
    "types::Vector3": {
      type: "array",
      items: {
        type: "number",
      },
      minItems: 3,
      maxItems: 3,
    },
    "types::BoundingBox": {
      type: "object",
      properties: {
        topLeft: {
          $ref: "#/definitions/types::Vector3",
        },
        width: {
          type: "number",
        },
        height: {
          type: "number",
        },
        depth: {
          type: "number",
        },
      },
      required: ["topLeft", "width", "height", "depth"],
    },
    "types::DataLayerWKWPartial": {
      title: "DataLayerWKW",
      type: "object",
      properties: {
        dataFormat: {
          const: "wkw",
        },
        boundingBox: {
          $ref: "#/definitions/types::BoundingBox",
        },
        wkwResolutions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              resolution: {
                anyOf: [
                  {
                    type: "number",
                  },
                  {
                    $ref: "#/definitions/types::Vector3",
                  },
                ],
              },
              cubeLength: {
                type: "number",
              },
            },
            required: ["resolution", "cubeLength"],
          },
        },
      },
      required: ["dataFormat", "boundingBox", "wkwResolutions"],
    },
    "types::DataLayerZarrPartial": {
      title: "DataLayerZarr",
      type: "object",
      properties: {
        dataFormat: {
          const: "zarr",
        },
        boundingBox: {
          $ref: "#/definitions/types::BoundingBox",
        },
        numChannels: {
          type: "number",
        },
        mags: {
          type: "array",
          items: {
            type: "object",
            properties: {
              mag: {
                anyOf: [
                  {
                    type: "number",
                  },
                  {
                    $ref: "#/definitions/types::Vector3",
                  },
                ],
              },
              path: {
                type: "string",
              },
              credentials: {
                type: "object",
                properties: {
                  user: { type: "string" },
                  password: { type: "string" },
                },
                required: ["user", "password"],
              },
              axisOrder: {
                type: "object",
                additionalProperties: { type: "number" },
              },
            },
            required: ["mag"],
          },
        },
      },
      required: ["dataFormat", "mags"],
    },
    "types::DataLayer": {
      title: "DataLayer",
      allOf: [
        {
          title: "DataLayerBasic",
          type: "object",
          properties: {
            name: {
              type: "string",
            },
            category: {
              enum: ["color", "segmentation"],
            },
            elementClass: {
              enum: [
                "uint8",
                "uint16",
                "uint24",
                "uint32",
                "uint64",
                "float",
                "double",
                "int8",
                "int16",
                "int32",
                "int64",
              ],
            },
            defaultViewConfiguration: {
              $ref: "#/definitions/types::OptionalLayerViewConfiguration",
            },
          },
          required: ["name", "category", "elementClass"],
        },
        {
          title: "DataLayerCategories",
          anyOf: [
            {
              title: "DataLayerColor",
              type: "object",
              properties: {
                category: {
                  const: "color",
                },
              },
              required: ["category"],
            },
            {
              title: "DataLayerSegmentation",
              type: "object",
              properties: {
                category: {
                  const: "segmentation",
                },
                largestSegmentId: {
                  type: ["number", "null"],
                  minimum: 1,
                },
                mappings: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                },
              },
              required: ["category"],
            },
          ],
        },
        {
          title: "DataLayerFormats",
          anyOf: [
            {
              $ref: "#/definitions/types::DataLayerWKWPartial",
            },
            {
              $ref: "#/definitions/types::DataLayerZarrPartial",
            },
          ],
        },
      ],
    },
    "types::DatasourceConfiguration": {
      type: "object",
      properties: {
        id: {
          type: "object",
          properties: {
            name: {
              type: "string",
            },
            team: {
              type: "string",
            },
          },
          additionalProperties: false,
          required: ["name", "team"],
        },
        dataLayers: {
          type: "array",
          minItems: 1,
          items: {
            $ref: "#/definitions/types::DataLayer",
          },
        },
        scale: {
          type: "array",
          items: {
            type: "number",
            exclusiveMinimum: 0,
          },
          minItems: 3,
          maxItems: 3,
        },
        defaultViewConfiguration: {
          $ref: "#/definitions/types::OptionalDatasetViewConfiguration",
        },
      },
      required: ["id", "dataLayers", "scale"],
    },
  },
};
